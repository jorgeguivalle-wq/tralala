var CONFIG = {
  usuarios: {
    "jorgeguivalle@gmail.com": "Viperrt11",
    "leonardodovalle@gmail.com": "Viperrt11@",
    "tralaladecoracoes@gmail.com": "tralala123"
  },
  firebase: {
    apiKey: "AIzaSyCS6ofyis160STTrjhFJZDcsqAiyh_Gnmc",
    authDomain: "tralala-d8ce2.firebaseapp.com",
    databaseURL: "https://tralala-d8ce2-default-rtdb.firebaseio.com/",
    projectId: "tralala-d8ce2",
    storageBucket: "tralala-d8ce2.appspot.com",
    messagingSenderId: "704078064009",
    appId: "1:704078064009:web:4d6ffc34c21b14322f9958"
  },
  temasDefault: {
    "Astronauta": { kits: 1, png: "" },
    "Princesas": { kits: 1, png: "" }
  }
};

var State = { 
  db: null, 
  estoque: {}, 
  historico: {}, 
  reservas: [], 
  orcamentos: [], 
  categorias: [],
  temaAtual: "", 
  kitAtual: "", 
  carregando: true, 
  usuarioLogadoEmail: "",
  salvandoPeca: false,
  removendoPeca: false,
  catalogoCarregado: false
};

// ============================================================
// TELINHA DE CARREGAMENTO (OVERLAY)
// ============================================================
var LoadingOverlay = {
  criar: function() {
    if (document.getElementById('loading-overlay')) return;
    var overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:none;justify-content:center;align-items:center;z-index:99999;backdrop-filter:blur(4px);';
    overlay.innerHTML = '<div style="background:white;padding:40px 50px;border-radius:16px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-width:400px;">' +
      '<div style="font-size:48px;margin-bottom:15px;" id="loading-icon">⏳</div>' +
      '<div style="font-size:20px;font-weight:600;color:#2d3436;margin-bottom:8px;" id="loading-message">Salvando...</div>' +
      '<div style="font-size:14px;color:#636e72;" id="loading-submessage">Aguarde um momento</div>' +
      '<div style="margin-top:20px;"><div style="width:100%;height:4px;background:#f0f0f0;border-radius:2px;overflow:hidden;">' +
      '<div style="width:0%;height:100%;background:#a3536a;border-radius:2px;animation:loadingBar 1.5s ease-in-out infinite;"></div></div></div></div>';
    var style = document.createElement('style');
    style.textContent = '@keyframes fadeInScale{from{opacity:0;transform:scale(0.9);}to{opacity:1;transform:scale(1);}}' +
      '@keyframes loadingBar{0%{width:0%;}50%{width:70%;}100%{width:100%;}}' +
      '@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}';
    document.head.appendChild(style);
    document.body.appendChild(overlay);
  },
  mostrar: function(mensagem, submensagem) {
    this.criar();
    var overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    var msgEl = document.getElementById('loading-message');
    var subMsgEl = document.getElementById('loading-submessage');
    var iconEl = document.getElementById('loading-icon');
    if (msgEl) msgEl.textContent = mensagem || 'Salvando...';
    if (subMsgEl) subMsgEl.textContent = submensagem || 'Aguarde um momento';
    if (iconEl) iconEl.textContent = '⏳';
    overlay.style.display = 'flex';
  },
  esconder: function() {
    var overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
  },
  mostrarSucesso: function(mensagem, submensagem) {
    this.criar();
    var overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    var msgEl = document.getElementById('loading-message');
    var subMsgEl = document.getElementById('loading-submessage');
    var iconEl = document.getElementById('loading-icon');
    if (msgEl) msgEl.textContent = mensagem || '✓ Concluído!';
    if (subMsgEl) subMsgEl.textContent = submensagem || '';
    if (iconEl) iconEl.textContent = '✅';
    overlay.style.display = 'flex';
    setTimeout(function() { LoadingOverlay.esconder(); }, 2000);
  }
};

// ============================================================
// INDICADOR DE CARREGAMENTO DO CATÁLOGO
// ============================================================
var CatalogoLoader = {
  container: null,
  timeoutId: null,
  criar: function() {
    if (document.getElementById('catalogo-loader')) return;
    var catalogoContainer = document.getElementById('painel-catalogo-temas');
    if (!catalogoContainer) {
      var tabelaContainer = document.getElementById('lista-temas-gerenciados-corpo');
      if (tabelaContainer) {
        catalogoContainer = tabelaContainer.closest('.painel-relatorio-pontos') || tabelaContainer.parentElement;
      }
    }
    if (!catalogoContainer) return;
    var loader = document.createElement('div');
    loader.id = 'catalogo-loader';
    loader.style.cssText = 'display:none;text-align:center;padding:40px 20px;background:#ffffff;border-radius:12px;border:1px solid var(--border-color,#e1cbd4);margin:10px 0;';
    loader.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;gap:12px;">' +
      '<div style="width:40px;height:40px;border:4px solid #f0f0f0;border-top-color:#a3536a;border-radius:50%;animation:spin 0.8s linear infinite;"></div>' +
      '<div style="font-size:16px;font-weight:500;color:#2d3436;" id="catalogo-loader-mensagem">⏳ Carregando catálogo...</div>' +
      '<div style="font-size:13px;color:#636e72;" id="catalogo-loader-submensagem">Buscando dados do servidor</div></div>';
    var tabela = document.getElementById('lista-temas-gerenciados-corpo');
    if (tabela) {
      catalogoContainer.insertBefore(loader, tabela.parentElement);
    } else {
      catalogoContainer.appendChild(loader);
    }
    this.container = loader;
  },
  mostrar: function(mensagem, submensagem) {
    this.criar();
    if (!this.container) return;
    var msgEl = document.getElementById('catalogo-loader-mensagem');
    var subMsgEl = document.getElementById('catalogo-loader-submensagem');
    if (msgEl) msgEl.textContent = mensagem || '⏳ Carregando catálogo...';
    if (subMsgEl) subMsgEl.textContent = submensagem || 'Buscando dados do servidor';
    this.container.style.display = 'block';
    var tabela = document.getElementById('lista-temas-gerenciados-corpo');
    if (tabela) tabela.style.display = 'none';
  },
  mostrarSucesso: function(mensagem) {
    if (!this.container) return;
    var msgEl = document.getElementById('catalogo-loader-mensagem');
    if (msgEl) {
      msgEl.textContent = mensagem || '✅ Catálogo carregado com sucesso!';
      msgEl.style.color = '#27ae60';
    }
    var subMsgEl = document.getElementById('catalogo-loader-submensagem');
    if (subMsgEl) subMsgEl.textContent = '';
    var tabela = document.getElementById('lista-temas-gerenciados-corpo');
    if (tabela) tabela.style.display = '';
    var self = this;
    clearTimeout(self.timeoutId);
    self.timeoutId = setTimeout(function() {
      if (self.container) self.container.style.display = 'none';
      if (msgEl) msgEl.style.color = '#2d3436';
    }, 2500);
  },
  mostrarErro: function(mensagem) {
    if (!this.container) return;
    var msgEl = document.getElementById('catalogo-loader-mensagem');
    if (msgEl) {
      msgEl.textContent = mensagem || '⚠️ Não foi possível carregar o catálogo.';
      msgEl.style.color = '#e74c3c';
    }
    var subMsgEl = document.getElementById('catalogo-loader-submensagem');
    if (subMsgEl) subMsgEl.textContent = 'Clique em "Tentar Novamente" ou recarregue a página.';
    this.container.style.display = 'block';
  },
  esconder: function() {
    if (this.container) this.container.style.display = 'none';
    var tabela = document.getElementById('lista-temas-gerenciados-corpo');
    if (tabela) tabela.style.display = '';
  }
};

window.recarregarCatalogo = function() {
  CatalogoLoader.mostrar('⏳ Recarregando catálogo...', 'Buscando dados do servidor');
  if (State.db) {
    State.db.ref('estoque').once('value', function(snap) {
      var val = snap.val();
      if (val) {
        if (Array.isArray(val)) {
          var obj = {};
          val.forEach(function(item, index) {
            if (item) {
              var nome = item.nome || item.tema || ("Tema " + index);
              obj[nome] = typeof item === 'object' ? item : { kits: 1, png: "" };
            }
          });
          State.estoque = obj;
        } else {
          State.estoque = val;
        }
      }
      UI.renderCatalogo();
      CatalogoLoader.mostrarSucesso('✅ Catálogo recarregado com sucesso!');
    }).catch(function(error) {
      console.error('❌ Erro ao recarregar catálogo:', error);
      CatalogoLoader.mostrarErro('⚠️ Erro ao recarregar o catálogo.');
    });
  }
};

var Utils = {
  showToast: function(message, type) {
    if (!type) type = 'info';
    var container = document.getElementById('toast-container');
    if (!container) { 
      console.log(type + ": " + message); 
      if (type === 'error') alert('❌ ' + message);
      return; 
    }
    var toast = document.createElement('div');
    var icone = type === 'success' ? '✅' : (type === 'error' ? '🚨' : '⚠️');
    toast.className = "toast toast-" + type;
    toast.innerHTML = "<span>" + icone + "</span> <span>" + message + "</span>";
    container.appendChild(toast);
    requestAnimationFrame(function() {
      setTimeout(function() { toast.classList.add('show'); }, 10);
    });
    setTimeout(function() { 
      toast.classList.remove('show'); 
      setTimeout(function() { toast.remove(); }, 400); 
    }, 3500);
  },
  formatCurrency: function(value) { 
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(value) || 0); 
  },
  formatDateBR: function(dateString) { 
    if (!dateString) return "Não informada"; 
    var p = dateString.split("-"); 
    return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : dateString; 
  },
  getHojeDataString: function() {
    var d = new Date();
    var mes = String(d.getMonth() + 1);
    var dia = String(d.getDate());
    if (mes.length < 2) mes = '0' + mes;
    if (dia.length < 2) dia = '0' + dia;
    return d.getFullYear() + "-" + mes + "-" + dia;
  },
  getHoraString: function() { 
    return new Date().toTimeString().split(' ')[0]; 
  }
};

var Database = {
  init: function() {
    State.estoque = {};
    for (var key in CONFIG.temasDefault) {
      if (CONFIG.temasDefault.hasOwnProperty(key)) {
        State.estoque[key] = CONFIG.temasDefault[key];
      }
    }
    if (typeof firebase !== 'undefined') {
      if (!firebase.apps.length) {
        firebase.initializeApp(CONFIG.firebase);
      }
      State.db = firebase.database();
      CatalogoLoader.mostrar('⏳ Carregando catálogo...', 'Buscando dados do servidor');
      this.listen();
      this.listenCategorias();
    } else {
      Utils.showToast("🚨 Erro de conexão: Biblioteca do Firebase não carregou.", "error");
      CatalogoLoader.mostrarErro('⚠️ Biblioteca do Firebase não carregou.');
    }
  },
  listen: function() {
    var timeoutRender = null;
    var primeiraVez = true;
    
    State.db.ref('estoque').on('value', function(snap) {
      var val = snap.val();
      if (val) {
        if (Array.isArray(val)) {
          var obj = {};
          val.forEach(function(item, index) {
            if (item) {
              var nome = item.nome || item.tema || ("Tema " + index);
              obj[nome] = typeof item === 'object' ? item : { kits: 1, png: "" };
            }
          });
          State.estoque = obj;
        } else {
          State.estoque = val;
        }
      } else {
        State.estoque = {};
        for (var key in CONFIG.temasDefault) {
          if (CONFIG.temasDefault.hasOwnProperty(key)) {
            State.estoque[key] = CONFIG.temasDefault[key];
          }
        }
      }
      
      clearTimeout(timeoutRender);
      timeoutRender = setTimeout(function() {
        console.log("🔄 Renderizando catálogo com " + Object.keys(State.estoque).length + " temas");
        UI.renderReservas();
        UI.renderCatalogo();
        UI.renderTabelaTemasGerenciados();
        
        if (primeiraVez) {
          primeiraVez = false;
          State.catalogoCarregado = true;
          CatalogoLoader.mostrarSucesso('✅ Catálogo carregado com sucesso!');
        }
        
        var inputBuscaTemaFicha = document.getElementById("busca-tema-input") || document.getElementById("busca-tema");
        if (inputBuscaTemaFicha && inputBuscaTemaFicha.value.trim()) {
          UI.renderSuggestions(inputBuscaTemaFicha.value);
        }
      }, 200);
    }, function(error) {
      console.error("❌ Erro ao carregar estoque:", error);
      CatalogoLoader.mostrarErro('⚠️ Não foi possível carregar o catálogo.');
    });

    State.db.ref('historico').on('value', function(snap) { 
      State.historico = snap.val() || {}; 
    });
    
    State.db.ref('reservas').on('value', function(snap) {
      State.carregando = false;
      var val = snap.val();
      var arr = [];
      if (val) {
        if (Array.isArray(val)) {
          val.forEach(function(data, id) {
            if (data) {
              var copy = { id: String(id) };
              for (var k in data) { if (data.hasOwnProperty(k)) copy[k] = data[k]; }
              arr.push(copy);
            }
          });
        } else {
          for (var id in val) {
            if (val.hasOwnProperty(id) && val[id]) {
              var copy = { id: id };
              for (var k in val[id]) { if (val[id].hasOwnProperty(k)) copy[k] = val[id][k]; }
              arr.push(copy);
            }
          }
        }
      }
      State.reservas = arr;
      UI.renderReservas();
      UI.renderCatalogo();

      var inputBuscaTemaFicha = document.getElementById("busca-tema-input") || document.getElementById("busca-tema");
      if (inputBuscaTemaFicha && inputBuscaTemaFicha.value.trim()) {
        UI.renderSuggestions(inputBuscaTemaFicha.value);
      }
    });

    State.db.ref('orcamentos').on('value', function(snap) {
      var val = snap.val();
      var arr = [];
      if (val) {
        for (var id in val) {
          if (val.hasOwnProperty(id) && val[id]) {
            var copy = { id: id };
            for (var k in val[id]) { if (val[id].hasOwnProperty(k)) copy[k] = val[id][k]; }
            arr.push(copy);
          }
        }
      }
      State.orcamentos = arr;
      UI.renderOrcamentos();
    });
  },
  
  listenCategorias: function() {
    if (!State.db) return;
    console.log("🔌 Listener de categorias iniciado...");
    var timeoutCategorias = null;
    
    State.db.ref('categorias').on('value', function(snapshot) {
      var data = snapshot.val();
      var categorias = [];
      
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(function(key) {
          if (data[key] && data[key].nome) {
            categorias.push(data[key].nome);
          }
        });
      }
      
      State.categorias = categorias;
      
      clearTimeout(timeoutCategorias);
      timeoutCategorias = setTimeout(function() {
        console.log("🔄 Categorias atualizadas:", categorias);
        UI.atualizarSeletoresCategoria(categorias);
      }, 50);
    }, function(error) {
      console.error("❌ Erro no listener de categorias:", error);
    });
  },
  
  salvarPecaNuvem: function(dadosPeca) {
    if (!State.db) {
      Utils.showToast("🚨 Sem conexão com Firebase", "error");
      return Promise.reject("Sem conexão");
    }
    if (State.salvandoPeca) {
      Utils.showToast("⏳ Salvando, aguarde...", "info");
      return Promise.reject("Já está salvando");
    }
    State.salvandoPeca = true;
    console.log("📤 Salvando peça no Firebase:", dadosPeca.nome);
    var novoRef = State.db.ref('estoque').push();
    return novoRef.set(dadosPeca)
      .then(function() {
        State.salvandoPeca = false;
        LoadingOverlay.mostrarSucesso('✅ Peça salva com sucesso!', '');
        console.log("✅ Peça salva com sucesso!");
        return true;
      })
      .catch(function(error) {
        State.salvandoPeca = false;
        console.error("❌ Erro ao salvar peça:", error);
        LoadingOverlay.esconder();
        Utils.showToast("❌ Erro ao salvar peça: " + error.message, "error");
        return false;
      });
  },
  
  excluirPecaNuvem: function(idPeca) {
    if (!State.db) {
      Utils.showToast("🚨 Sem conexão com Firebase", "error");
      return Promise.reject("Sem conexão");
    }
    if (State.removendoPeca) {
      Utils.showToast("⏳ Removendo, aguarde...", "info");
      return Promise.reject("Já está removendo");
    }
    State.removendoPeca = true;
    return State.db.ref("estoque/" + idPeca).remove()
      .then(function() {
        State.removendoPeca = false;
        LoadingOverlay.mostrarSucesso('✅ Peça removida com sucesso!', '');
        console.log("✅ Peça removida com sucesso!");
        return true;
      })
      .catch(function(error) {
        State.removendoPeca = false;
        console.error("❌ Erro ao remover peça:", error);
        LoadingOverlay.esconder();
        Utils.showToast("❌ Erro ao remover peça: " + error.message, "error");
        return false;
      });
  },
  
  salvarCategoriaNuvem: function(nome) {
    if (!State.db) {
      Utils.showToast("🚨 Sem conexão com Firebase", "error");
      return Promise.reject("Sem conexão");
    }
    nome = nome.trim();
    if (!nome) {
      Utils.showToast("Digite um nome para a categoria!", "warning");
      return Promise.reject("Nome vazio");
    }
    return State.db.ref('categorias').once('value').then(function(snapshot) {
      var data = snapshot.val();
      var existe = false;
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(function(key) {
          if (data[key] && data[key].nome && data[key].nome.toLowerCase() === nome.toLowerCase()) {
            existe = true;
          }
        });
      }
      if (existe) {
        Utils.showToast("A categoria \"" + nome + "\" já existe!", "warning");
        return Promise.reject("Categoria já existe");
      }
      var novaRef = State.db.ref('categorias').push();
      return novaRef.set({ nome: nome, criadoEm: Date.now() })
        .then(function() {
          LoadingOverlay.mostrarSucesso('✅ Categoria adicionada com sucesso!', '');
          console.log("✅ Categoria adicionada:", nome);
          return true;
        });
    });
  },
  
  removerCategoriaNuvem: function(nome) {
    if (!State.db) {
      Utils.showToast("🚨 Sem conexão com Firebase", "error");
      return Promise.reject("Sem conexão");
    }
    if (!nome) {
      Utils.showToast("Selecione uma categoria para remover!", "warning");
      return Promise.reject("Nome vazio");
    }
    return State.db.ref('estoque').once('value').then(function(snapshot) {
      var data = snapshot.val();
      var temasVinculados = [];
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(function(key) {
          var item = data[key];
          if (item && item.categoria === nome) {
            temasVinculados.push(item.nome || "Sem Nome");
          }
        });
      }
      if (temasVinculados.length > 0) {
        var msg = "⚠️ Não é possível remover a categoria \"" + nome + "\" pois ela possui " + temasVinculados.length + " tema(s) vinculado(s):\n\n" + temasVinculados.join('\n') + "\n\nRemova ou reassocie os temas primeiro.";
        Utils.showToast(msg, "error");
        return Promise.reject("Categoria possui temas vinculados");
      }
      if (!confirm("Deseja realmente remover a categoria \"" + nome + "\"?")) {
        return Promise.reject("Cancelado pelo usuário");
      }
      return State.db.ref('categorias').once('value').then(function(snapshot) {
        var data = snapshot.val();
        var chaveRemover = null;
        if (data && typeof data === 'object') {
          Object.keys(data).forEach(function(key) {
            if (data[key] && data[key].nome === nome) {
              chaveRemover = key;
            }
          });
        }
        if (chaveRemover) {
          return State.db.ref('categorias/' + chaveRemover).remove()
            .then(function() {
              LoadingOverlay.mostrarSucesso('✅ Categoria removida com sucesso!', '');
              console.log("✅ Categoria removida:", nome);
              return true;
            });
        } else {
          Utils.showToast("Categoria não encontrada.", "error");
          return Promise.reject("Categoria não encontrada");
        }
      });
    });
  },
  
  listenPontoUsuario: function() {
    if (!State.db || !State.usuarioLogadoEmail) return;
    var chaveUsuario = State.usuarioLogadoEmail.replace(/[.#$[\]]/g, "_");
    var hoje = Utils.getHojeDataString();

    State.db.ref("pontos/" + chaveUsuario + "/" + hoje).on('value', function(snap) {
      var dadosPonto = snap.val() || {};
      var entrada = dadosPonto.entrada || "--:--:--";
      var saida = dadosPonto.saida || "--:--:--";

      var statusEl = document.getElementById("ponto-status-hoje");
      if(statusEl) {
        statusEl.innerHTML = "📅 <b>Hoje (" + Utils.formatDateBR(hoje) + "):</b>" +
        "<span style='color:var(--success); margin-left:10px;'>🟢 Entrada: <b>" + entrada + "</b></span>" +
        "<span style='color:var(--error); margin-left:15px;'>🔴 Saída: <b>" + saida + "</b></span>";
      }
    });

    if (State.usuarioLogadoEmail === "leonardodovalle@gmail.com" || State.usuarioLogadoEmail === "tralaladecoracoes@gmail.com") {
      var btnRelatorio = document.getElementById("btn-abrir-relatorio-pontos");
      if(btnRelatorio) btnRelatorio.style.display = "block";
      State.db.ref('pontos').on('value', function(snap) {
        UI.renderRelatorioGeralPontos(snap.val() || {});
      });
    }
  },
  registrarPonto: function(tipo) {
    if (!State.db || !State.usuarioLogadoEmail) return Utils.showToast("🚨 Erro de identificação do usuário.", "error");
    var chaveUsuario = State.usuarioLogadoEmail.replace(/[.#$[\]]/g, "_");
    var hoje = Utils.getHojeDataString();
    var hora = Utils.getHoraString();
    
    var updateData = { usuario: State.usuarioLogadoEmail, data: hoje };
    updateData[tipo] = hora;

    State.db.ref("pontos/" + chaveUsuario + "/" + hoje).update(updateData)
    .then(function() { 
      Utils.showToast("Ponto de " + (tipo === 'entrada' ? 'Entrada' : 'Saída') + " marcado às " + hora + "!", "success"); 
    })
    .catch(function() { 
      Utils.showToast("🚨 Erro ao salvar ponto na nuvem.", "error"); 
    });
  },
  salvarTemaNuvem: function(nomeTema, dadosTema) {
    if(!State.db) return Utils.showToast("🚨 Sem conexão com Firebase", "error");
    return State.db.ref("estoque/" + nomeTema).set(dadosTema)
    .then(function() {
      Utils.showToast("Tema e configurações atualizados na nuvem!", "success");
      return true;
    })
    .catch(function() {
      Utils.showToast("Erro ao sincronizar tema.", "error");
      return false;
    });
  },
  excluirTemaNuvem: function(nomeTema) {
    if(!State.db) return;
    return State.db.ref("estoque/" + nomeTema).remove()
    .then(function() { 
      LoadingOverlay.mostrarSucesso('✅ Tema removido com sucesso!', '');
      console.log("✅ Tema removido:", nomeTema);
      return true;
    })
    .catch(function(error) { 
      console.error("❌ Erro ao deletar tema:", error);
      LoadingOverlay.esconder();
      Utils.showToast("❌ Erro ao deletar tema.", "error");
      return false;
    });
  },
  salvarOrcamentoNuvem: function(dadosOrcamento) {
    if(!State.db) return Utils.showToast("🚨 Sem conexão com Firebase", "error");
    var novoRef = State.db.ref('orcamentos').push();
    novoRef.set(dadosOrcamento)
    .then(function() { Utils.showToast("Orçamento gravado com sucesso!", "success"); })
    .catch(function() { Utils.showToast("Erro ao salvar orçamento.", "error"); });
  },
  salvarReservaNuvem: function(dadosReserva) {
    if(!State.db) return Utils.showToast("🚨 Sem conexão com Firebase", "error");
    var novoRef = State.db.ref('reservas').push();
    return novoRef.set(dadosReserva)
    .then(function() {
      Utils.showToast("Agendamento salvo com sucesso!", "success");
      return true;
    })
    .catch(function() {
      Utils.showToast("Erro ao salvar agendamento.", "error");
      return false;
    });
  },
  excluirReservaNuvem: function(idReserva) {
    if(!State.db) return Promise.reject("Sem conexão");
    return State.db.ref("reservas/" + idReserva).remove();
  },
  
  // ============================================================
  // REUNIÕES — NOVO (usa estrutura Firebase existente 'reunioes')
  // ============================================================
  salvarReuniaoNuvem: function(dadosReuniao) {
    if(!State.db) return Promise.reject("Sem conexão");
    var novoRef = State.db.ref('reunioes').push();
    return novoRef.set(dadosReuniao);
  },
  excluirReuniaoNuvem: function(idReuniao) {
    if(!State.db) return Promise.reject("Sem conexão");
    return State.db.ref("reunioes/" + idReuniao).remove();
  },
  listenReunioes: function(callback) {
    if(!State.db) return;
    State.db.ref('reunioes').on('value', function(snap) {
      var val = snap.val();
      var arr = [];
      if (val && typeof val === 'object') {
        Object.keys(val).forEach(function(id) {
          if (val[id]) {
            var copy = { id: id };
            for (var k in val[id]) { if (val[id].hasOwnProperty(k)) copy[k] = val[id][k]; }
            arr.push(copy);
          }
        });
      }
      arr.sort(function(a, b) { return new Date(a.dataHora) - new Date(b.dataHora); });
      if (callback) callback(arr);
    });
  }
};

window.adicionarCategoria = function(nome) {
  return Database.salvarCategoriaNuvem(nome);
};

window.removerCategoria = function(nome) {
  return Database.removerCategoriaNuvem(nome);
};

var UI = {
  init: function() {
    this.bindEvents();
    this.carregarOrcamentos();
  },
  
  // ============================================================
  // MÉTODO AUXILIAR PARA ENCONTRAR ELEMENTO (compatível com aliases)
  // ============================================================
  el: function(ids) {
    if (typeof ids === 'string') ids = [ids];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el) return el;
    }
    return null;
  },
  
  bindEvents: function() {
    var self = this;
    var mapeamentoBotoes = {
      "btn-login-direto": function() { self.handleLogin(); },
      "btn-logout-direto": function() { self.handleLogout(); },
      "btn-ponto-entrada": function() { Database.registrarPonto('entrada'); },
      "btn-ponto-saida": function() { Database.registrarPonto('saida'); },
      "btn-abrir-relatorio-pontos": function() { self.toggleRelatorioPontos(); },
      "btn-abrir-orcamentos": function() { self.toggleOrcamentos(); },
      "btn-salvar-tema": function() { self.acaoSalvarTemaCorrente(); },
      "btn-salvar-orcamento": function() { self.acaoSalvarOrcamentoCorrente(); },
      "btn-confirmar-agendamento": function() { self.handleSalvarFesta(); }
    };

    for (var id in mapeamentoBotoes) {
      if (mapeamentoBotoes.hasOwnProperty(id)) {
        (function(idAtual) {
          var elemento = document.getElementById(idAtual);
          if (elemento) {
            elemento.onclick = function(e) { e.preventDefault(); mapeamentoBotoes[idAtual](); };
          }
        })(id);
      }
    }

    // ============================================================
    // BOTÃO "SALVAR PEÇA NO ACERVO"
    // ============================================================
    var btnAdicionarPeca = document.getElementById("btn-adicionar-peca");
    if (btnAdicionarPeca) {
      btnAdicionarPeca.onclick = function(e) {
        e.preventDefault();
        if (State.salvandoPeca) {
          Utils.showToast("⏳ Salvando, aguarde...", "info");
          return;
        }
        var nome = document.getElementById("catalogo-peca-nome").value.trim();
        var qtd = parseInt(document.getElementById("catalogo-peca-qtd").value) || 0;
        var categoria = document.getElementById("catalogo-peca-categoria").value;
        var modelo = document.getElementById("catalogo-peca-modelo").value.trim();
        var fileInput = document.getElementById("catalogo-peca-imagem");
        
        if(!nome) {
          Utils.showToast("Preencha o nome do Item/Tema!", "warning");
          return;
        }

        LoadingOverlay.mostrar('⏳ Salvando Peça...', 'Tema: ' + nome);
        State.salvandoPeca = true;

        var processarSalvar = function(imgUrl) {
          var dadosPeca = {
            nome: nome,
            quantidade: qtd,
            categoria: categoria || "Outros",
            modelo: modelo || "Tema Geral",
            imagem: imgUrl || "https://placehold.co/100x100?text=Sem+Foto",
            criadoEm: Date.now()
          };
          Database.salvarPecaNuvem(dadosPeca).then(function(sucesso) {
            State.salvandoPeca = false;
            if (!sucesso) LoadingOverlay.esconder();
            if (sucesso) {
              document.getElementById("catalogo-peca-nome").value = "";
              document.getElementById("catalogo-peca-qtd").value = "1";
              document.getElementById("catalogo-peca-modelo").value = "";
              document.getElementById("catalogo-peca-imagem").value = "";
            }
          }).catch(function() {
            State.salvandoPeca = false;
            LoadingOverlay.esconder();
          });
        };

        if (fileInput && fileInput.files && fileInput.files[0]) {
          var reader = new FileReader();
          reader.onload = function(e) { processarSalvar(e.target.result); };
          reader.onerror = function() {
            Utils.showToast("Erro ao ler imagem. Salvando sem foto.", "warning");
            processarSalvar("https://placehold.co/100x100?text=Sem+Foto");
          };
          reader.readAsDataURL(fileInput.files[0]);
        } else {
          processarSalvar("https://placehold.co/100x100?text=Sem+Foto");
        }
      };
    }

    // ============================================================
    // BOTÃO ADICIONAR CATEGORIA
    // ============================================================
    var btnAdicionarCategoria = document.getElementById("btn-adicionar-categoria");
    if (btnAdicionarCategoria) {
      btnAdicionarCategoria.onclick = function(e) {
        e.preventDefault();
        var input = document.getElementById("input-nova-categoria");
        var nome = input.value.trim();
        if (nome) {
          LoadingOverlay.mostrar('⏳ Adicionando Categoria...', 'Categoria: ' + nome);
          window.adicionarCategoria(nome).then(function() {
            input.value = "";
            input.focus();
          }).catch(function() { LoadingOverlay.esconder(); });
        } else {
          Utils.showToast("Digite um nome para a categoria!", "warning");
        }
      };
      
      var inputCategoria = document.getElementById("input-nova-categoria");
      if (inputCategoria) {
        inputCategoria.onkeypress = function(e) {
          if (e.key === "Enter") document.getElementById("btn-adicionar-categoria").click();
        };
      }
    }

    // ============================================================
    // BOTÃO REMOVER CATEGORIA
    // ============================================================
    var btnRemoverCategoria = document.getElementById("btn-remover-categoria");
    if (btnRemoverCategoria) {
      btnRemoverCategoria.onclick = function(e) {
        e.preventDefault();
        var select = document.getElementById("select-remover-categoria");
        var categoria = select.value;
        if (categoria) {
          LoadingOverlay.mostrar('⏳ Removendo Categoria...', 'Categoria: ' + categoria);
          window.removerCategoria(categoria).then(function() {}).catch(function() { LoadingOverlay.esconder(); });
        } else {
          Utils.showToast("Selecione uma categoria para remover!", "warning");
        }
      };
    }

    // ============================================================
    // BOTÃO REMOVER TEMA (por select)
    // ============================================================
    var btnRemoverTema = document.getElementById("btn-remover-tema-admin");
    if (btnRemoverTema) {
      btnRemoverTema.onclick = function(e) {
        e.preventDefault();
        var select = document.getElementById("select-remover-tema");
        if (!select) return;
        var valorSelecionado = select.value;
        var infoDiv = document.getElementById("info-tema-remover");
        
        // O select pode conter: (a) índice numérico (formato antigo) ou (b) chave Firebase
        if (!valorSelecionado) {
          Utils.showToast("Selecione um tema válido para remover!", "warning");
          return;
        }
        
        // Tentar primeiro como chave Firebase (chave do objeto State.estoque ou idFirebase)
        var temaNome = null;
        var chaveParaRemover = null;
        
        // Procurar por idFirebase ou pela chave do objeto
        for (var k in State.estoque) {
          if (!State.estoque.hasOwnProperty(k)) continue;
          var item = State.estoque[k];
          if (k === valorSelecionado || (item && item.idFirebase === valorSelecionado)) {
            temaNome = (item && item.nome) ? item.nome : k;
            chaveParaRemover = k;
            break;
          }
        }
        
        // Fallback: tentar como índice numérico
        if (!temaNome && !isNaN(parseInt(valorSelecionado))) {
          var idx = parseInt(valorSelecionado);
          var chaves = Object.keys(State.estoque);
          if (chaves[idx]) {
            chaveParaRemover = chaves[idx];
            var it = State.estoque[chaveParaRemover];
            temaNome = (it && it.nome) ? it.nome : chaveParaRemover;
          }
        }
        
        if (!temaNome) {
          Utils.showToast("Tema não localizado. Recarregue a página.", "error");
          return;
        }
        
        if (confirm("Deseja realmente remover o tema \"" + temaNome + "\"?")) {
          LoadingOverlay.mostrar('⏳ Removendo Tema...', 'Tema: ' + temaNome);
          Database.excluirTemaNuvem(chaveParaRemover).then(function() {
            if (infoDiv) {
              infoDiv.innerHTML = '<span style="color:var(--success);">✅ Tema removido com sucesso!</span>';
              setTimeout(function() { infoDiv.innerHTML = ''; }, 3000);
            }
          }).catch(function() { LoadingOverlay.esconder(); });
        }
      };
    }

    // ============================================================
    // BOTÕES DE KIT (corrigido)
    // ============================================================
    var botoesKit = document.querySelectorAll('.btn-kit-opcao');
    botoesKit.forEach(function(btn) {
      btn.onclick = function(e) {
        e.preventDefault();
        botoesKit.forEach(function(b) { b.classList.remove('ativo'); });
        btn.classList.add('ativo');
        
        var nomeKit = btn.getAttribute('data-kit');
        State.kitAtual = nomeKit;
        Utils.showToast("Kit \"" + nomeKit + "\" selecionado!", "success");

        var painelMontagem = document.getElementById("painel-perguntas-montar-local") || document.getElementById("painel-montagem-local");
        if (painelMontagem) {
          painelMontagem.style.display = (nomeKit === "Montar no Local") ? "block" : (document.getElementById("chk-montar-local") && document.getElementById("chk-montar-local").checked ? "block" : "none");
        }
      };
    });

    // ============================================================
    // CHECKBOX "MONTAR NO LOCAL"
    // ============================================================
    var chkMontar = document.getElementById("chk-montar-local");
    if (chkMontar) {
      chkMontar.onchange = function() {
        var painel = document.getElementById("painel-montagem-local") || document.getElementById("painel-perguntas-montar-local");
        if (painel) painel.style.display = chkMontar.checked ? "block" : "none";
      };
    }

    // ============================================================
    // CALCULADORA DE FRETE (IDs unificados: aceita ambas as nomenclaturas)
    // Fórmula: litros = KM / 9 ; total = litros * valorLitro
    // ============================================================
    var calcularFrete = function() {
      var inputKm = self.el(['calc-km', 'frete-km']);
      var inputLitro = self.el(['calc-valor-litro', 'frete-valor-litro']);
      
      var km = inputKm ? (parseFloat(inputKm.value) || 0) : 0;
      var valorLitro = inputLitro ? (parseFloat(inputLitro.value) || 0) : 0;
      
      var txtLitros = self.el(['res-frete-litros', 'calc-litros']);
      var txtTotal = self.el(['res-frete-total', 'calc-total', 'calc-cobrar-cliente']);
      var txtCombustivel = self.el(['calc-total-combustivel']);
      var txtManutencao = self.el(['calc-manutencao']);
      var inputFrete = document.getElementById('valor-frete');
      var inputTotal = document.getElementById('valor-total');
      var boxResultado = self.el(['painel-frete-resultado']);
      
      if (km > 0 && valorLitro > 0) {
        var litros = km / 9;
        var totalFrete = litros * valorLitro;
        var manutencao = totalFrete * 0.20;
        var totalComManutencao = totalFrete + manutencao;
        
        if (txtLitros) txtLitros.innerText = litros.toFixed(2);
        if (txtTotal) txtTotal.innerText = totalFrete.toFixed(2);
        if (txtCombustivel) txtCombustivel.innerText = "R$ " + totalFrete.toFixed(2);
        if (txtManutencao) txtManutencao.innerText = "R$ " + manutencao.toFixed(2);
        if (boxResultado) boxResultado.style.display = 'block';
        
        // Atualizar campos do formulário de reserva (frete + total)
        if (inputFrete) {
          inputFrete.value = totalComManutencao.toFixed(2);
        }
        if (inputTotal) {
          var valorFesta = parseFloat((document.getElementById('valor-festa') || {}).value) || 0;
          inputTotal.value = (valorFesta + totalComManutencao).toFixed(2);
        }
      } else {
        if (txtLitros) txtLitros.innerText = "0.00";
        if (txtTotal) txtTotal.innerText = "0.00";
        if (txtCombustivel) txtCombustivel.innerText = "R$ 0.00";
        if (txtManutencao) txtManutencao.innerText = "R$ 0.00";
        if (boxResultado) boxResultado.style.display = 'none';
        if (inputFrete) inputFrete.value = "0.00";
      }
    };

    var inputKm = self.el(['calc-km', 'frete-km']);
    var inputLitro = self.el(['calc-valor-litro', 'frete-valor-litro']);
    if (inputKm) {
      inputKm.oninput = calcularFrete;
      inputKm.onchange = calcularFrete;
    }
    if (inputLitro) {
      inputLitro.oninput = calcularFrete;
      inputLitro.onchange = calcularFrete;
    }

    // Recalcular total quando valor da festa mudar
    var inputValorFesta = document.getElementById('valor-festa');
    if (inputValorFesta) {
      inputValorFesta.oninput = function() {
        var frete = parseFloat((document.getElementById('valor-frete') || {}).value) || 0;
        var total = parseFloat(inputValorFesta.value) || 0;
        var inputTotal = document.getElementById('valor-total');
        if (inputTotal) inputTotal.value = (total + frete).toFixed(2);
      };
    }
    // Recalcular restante quando sinal mudar
    var inputSinal = document.getElementById('valor-sinal');
    if (inputSinal) {
      inputSinal.oninput = function() {
        var total = parseFloat((document.getElementById('valor-total') || {}).value) || 0;
        var sinal = parseFloat(inputSinal.value) || 0;
        var inputRestante = document.getElementById('valor-restante');
        if (inputRestante) inputRestante.value = Math.max(0, total - sinal).toFixed(2);
      };
    }

    // ============================================================
    // BUSCAS E SUGESTÕES
    // ============================================================
    var inputBuscaReserva = document.getElementById("busca-reserva");
    if (inputBuscaReserva) {
      inputBuscaReserva.oninput = function(e) { self.renderReservas(e.target.value); };
    }

    var btnPreview = document.getElementById("btn-preview-png") || document.getElementById("btn-preview");
    if(btnPreview) {
      btnPreview.onclick = function(e) {
        if(e) e.preventDefault();
        var elPng = document.getElementById("editor-png-tema") || document.getElementById("png-tema") || document.getElementById("tema-png");
        var url = elPng ? elPng.value : "";
        var container = document.getElementById("container-preview-tema") || document.getElementById("preview-tema-box");
        var img = document.getElementById("img-tema-preview") || document.getElementById("preview-imagem");
        if(url.trim() && container && img) { img.src = url.trim(); container.style.display = "block"; }
        else if(container) { container.style.display = "none"; }
      };
    }

    var btnAbrirCatalogo = document.getElementById("btn-abrir-catalogo") || document.getElementById("btn-ver-catalogo") || document.getElementById("btn-abrir-catalogo-temas");
    if(btnAbrirCatalogo) {
      btnAbrirCatalogo.onclick = function(e) {
        if(e) e.preventDefault();
        var setorCatalogo = document.getElementById("painel-catalogo-temas") || document.getElementById("secao-catalogo") || document.getElementById("painel-catalogo");
        if(setorCatalogo) {
          setorCatalogo.style.display = (setorCatalogo.style.display === "none" || setorCatalogo.style.display === "") ? "block" : "none";
          self.renderCatalogo();
        }
      };
    }

    var inputBuscaCatalogo = document.getElementById("busca-catalogo");
    if (inputBuscaCatalogo) {
      inputBuscaCatalogo.oninput = function(e) { self.renderCatalogo(e.target.value); };
    }

    var inputBuscaTemaEditor = document.getElementById("editor-busca-tema") || document.getElementById("busca-tema-editor");
    if(inputBuscaTemaEditor) {
      inputBuscaTemaEditor.oninput = function(e) { self.handleEditorBusca(e.target.value); };
    }

    var btnDeletarTema = document.getElementById("btn-deletar-tema") || document.getElementById("btn-excluir-tema");
    if(btnDeletarTema) {
      btnDeletarTema.onclick = function(e) {
        if(e) e.preventDefault();
        var elNome = document.getElementById("editor-nome-tema") || document.getElementById("nome-tema") || document.getElementById("tema-nome");
        var nome = elNome ? elNome.value : "";
        if(!nome.trim() || !State.estoque[nome.trim()]) return Utils.showToast("Selecione um tema válido para excluir.", "warning");
        if(confirm("Tem certeza que deseja apagar o tema \"" + nome + "\"?")) {
          Database.excluirTemaNuvem(nome.trim());
          self.resetEditor();
        }
      };
    }

    // ============================================================
    // BUSCA DE TEMA NA FICHA DE RESERVA — usa 'filtro-tema-input' (visível) do HTML
    // ============================================================
    var inputBuscaTemaFicha = document.getElementById("filtro-tema-input") || document.getElementById("busca-tema-input") || document.getElementById("busca-tema");
    if(inputBuscaTemaFicha) {
      inputBuscaTemaFicha.oninput = function(e) {
        State.temaAtual = e.target.value.trim();
        self.renderSuggestions(e.target.value);
      };
      inputBuscaTemaFicha.onfocus = function(e) {
        if (e.target.value.trim()) self.renderSuggestions(e.target.value);
      };
    }

    // ============================================================
    // BOTÃO "VER ORÇAMENTOS" — garante que abre o painel certo
    // ============================================================
    var btnVerOrc = document.getElementById("btn-abrir-orcamentos");
    if (btnVerOrc) {
      // Já mapeado em mapeamentoBotoes, mas garantimos que o painel exista
      btnVerOrc.onclick = function(e) {
        e.preventDefault();
        self.toggleOrcamentos();
      };
    }

    // ============================================================
    // BOTÃO "VENDA MENSAL" — btn-abrir-central-relatorios
    // ============================================================
    var btnCentral = document.getElementById("btn-abrir-central-relatorios");
    if (btnCentral) {
      btnCentral.onclick = function(e) {
        e.preventDefault();
        var p = document.getElementById("secao-central-relatorios");
        if (p) {
          p.style.display = (p.style.display === "none" || p.style.display === "") ? "block" : "none";
          if (p.style.display === "block") self.renderPlanilhaVendas();
        }
      };
    }
    var btnFecharCentral = document.getElementById("btn-fechar-central-relatorios");
    if (btnFecharCentral) {
      btnFecharCentral.onclick = function(e) {
        e.preventDefault();
        var p = document.getElementById("secao-central-relatorios");
        if (p) p.style.display = "none";
      };
    }

    // ============================================================
    // BOTÃO "AGENDAR REUNIÕES" — btn-abrir-reunioes-painel
    // ============================================================
    var btnReunioes = document.getElementById("btn-abrir-reunioes-painel");
    if (btnReunioes) {
      btnReunioes.onclick = function(e) {
        e.preventDefault();
        var p = document.getElementById("painel-reunioes-exclusivo");
        if (p) {
          p.style.display = (p.style.display === "none" || p.style.display === "") ? "block" : "none";
          if (p.style.display === "block") self.iniciarPainelReunioes();
        }
      };
    }
    var btnFecharReunioes = document.getElementById("btn-fechar-reunioes");
    if (btnFecharReunioes) {
      btnFecharReunioes.onclick = function(e) {
        e.preventDefault();
        var p = document.getElementById("painel-reunioes-exclusivo");
        if (p) p.style.display = "none";
      };
    }
    var btnSalvarReuniao = document.getElementById("btn-salvar-reuniao-avulsa");
    if (btnSalvarReuniao) {
      btnSalvarReuniao.onclick = function(e) {
        e.preventDefault();
        var cliente = (document.getElementById("reuniao-cliente") || {}).value || "";
        var dataHora = (document.getElementById("reuniao-data-hora") || {}).value || "";
        var pauta = (document.getElementById("reuniao-pauta") || {}).value || "";
        cliente = cliente.trim();
        pauta = pauta.trim();
        if (!cliente || !dataHora) {
          Utils.showToast("Preencha o cliente e a data/hora da reunião.", "warning");
          return;
        }
        LoadingOverlay.mostrar('⏳ Agendando Reunião...', 'Cliente: ' + cliente);
        Database.salvarReuniaoNuvem({
          cliente: cliente,
          dataHora: dataHora,
          pauta: pauta,
          criadoEm: Date.now()
        }).then(function() {
          LoadingOverlay.mostrarSucesso('✅ Reunião agendada!', '');
          var elC = document.getElementById("reuniao-cliente");
          var elD = document.getElementById("reuniao-data-hora");
          var elP = document.getElementById("reuniao-pauta");
          if (elC) elC.value = "";
          if (elD) elD.value = "";
          if (elP) elP.value = "";
        }).catch(function(err) {
          LoadingOverlay.esconder();
          Utils.showToast("Erro ao agendar reunião: " + err, "error");
        });
      };
    }

    // ============================================================
    // GERADOR DE CONTRATO — abrir/fechar modal
    // ============================================================
    var btnAbrirGerador = document.getElementById("btn-abrir-gerador-contrato");
    var btnFecharGerador = document.getElementById("btn-fechar-modal-contrato");
    var modalContrato = document.getElementById("modal-gerador-contrato");
    if (btnAbrirGerador && modalContrato) {
      btnAbrirGerador.onclick = function(e) {
        e.preventDefault();
        modalContrato.classList.add("ativo");
        self.popularSelectPecasContrato();
        self.bindBuscaTemaContrato();
      };
    }
    if (btnFecharGerador && modalContrato) {
      btnFecharGerador.onclick = function(e) {
        e.preventDefault();
        modalContrato.classList.remove("ativo");
      };
    }

    // Fechar modais ao clicar fora
    if (modalContrato) {
      modalContrato.addEventListener('click', function(e) {
        if (e.target === modalContrato) modalContrato.classList.remove("ativo");
      });
    }
    var modalVis = document.getElementById("modal-visualizar-contrato");
    if (modalVis) {
      modalVis.addEventListener('click', function(e) {
        if (e.target === modalVis) modalVis.classList.remove("ativo");
      });
      var btnFecharVis = document.getElementById("btn-fechar-visualizacao");
      if (btnFecharVis) btnFecharVis.onclick = function() { modalVis.classList.remove("ativo"); };
    }
  },
  
  // ============================================================
  // PAINEL DE REUNIÕES
  // ============================================================
  iniciarPainelReunioes: function() {
    var self = this;
    Database.listenReunioes(function(lista) {
      var container = document.getElementById("lista-reunioes-container");
      if (!container) return;
      if (!lista || lista.length === 0) {
        container.innerHTML = '<p style="color:#999; text-align:center;">Nenhuma reunião agendada.</p>';
        return;
      }
      var html = "";
      lista.forEach(function(r) {
        var dataFmt = r.dataHora ? r.dataHora.replace('T', ' às ') : 'Não informada';
        html += '<div class="card-reuniao" style="border-left-color:#27ae60;">' +
          '<div class="reserva-header"><strong>👤 ' + (r.cliente || 'Sem nome') + '</strong>' +
          '<span class="reserva-badge" style="background:#27ae60;">AGENDADA</span></div>' +
          '<div class="reserva-body">' +
          '<p>📅 Data/Hora: <b>' + dataFmt + '</b></p>' +
          (r.pauta ? '<p>📝 Pauta: ' + r.pauta + '</p>' : '') +
          '</div>' +
          '<button type="button" style="width:100%; padding:6px; margin-top:8px; background:#e74c3c; color:#fff; border:none; border-radius:4px; cursor:pointer;" onclick="window.ExcluirReuniao(\'' + r.id + '\')">🗑️ Excluir Reunião</button>' +
          '</div>';
      });
      container.innerHTML = html;
    });
  },
  
  // ============================================================
  // PLANILHA DE VENDAS (Venda Mensal)
  // ============================================================
  renderPlanilhaVendas: function() {
    var tbody = document.querySelector("#tabela-planilha-corpo tbody");
    if (!tbody) return;
    var mesSelecionado = (document.getElementById("seletor-mes-planilha") || {}).value || "";
    
    var reservasDoMes = State.reservas.filter(function(r) {
      if (!r.data) return false;
      var partes = r.data.split("-");
      if (partes.length !== 3) return false;
      var mesIdx = parseInt(partes[1]) - 1;
      var nomeMes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][mesIdx];
      return nomeMes === mesSelecionado;
    });
    
    if (reservasDoMes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#999; padding:15px;">Nenhuma venda registrada neste mês.</td></tr>';
      return;
    }
    
    var html = "";
    reservasDoMes.forEach(function(r) {
      var total = parseFloat(r.total) || 0;
      var frete = parseFloat(r.frete) || 0;
      html += '<tr>' +
        '<td>' + (r.cliente || '') + '</td>' +
        '<td>' + (r.kit || 'Não informado') + '</td>' +
        '<td>R$ ' + (total + frete).toFixed(2) + '</td>' +
        '<td style="text-align:center;">—</td>' +
        '</tr>';
    });
    tbody.innerHTML = html;
  },
  
  // ============================================================
  // ORÇAMENTOS
  // ============================================================
  carregarOrcamentos: function() {
    var self = this;
    // Renderiza a partir do listener de State.orcamentos (já iniciado em Database.listen)
    // Aqui só garante a renderização inicial quando o painel abrir
  },
  
  // ============================================================
  // GERADOR DE CONTRATO — busca de tema com sugestões
  // ============================================================
  bindBuscaTemaContrato: function() {
    var self = this;
    // Cria (se não existir) um input de busca ao lado do select
    var campoLocal = document.getElementById("c-local");
    if (!campoLocal) return;
    
    // Se já criamos o wrapper, não duplica
    if (document.getElementById("contrato-tema-busca-wrapper")) return;
    
    var wrapper = document.createElement("div");
    wrapper.id = "contrato-tema-busca-wrapper";
    wrapper.className = "input-group";
    wrapper.innerHTML = 
      '<label>🔍 Buscar Tema do Contrato:</label>' +
      '<div class="sugestoes-wrapper">' +
        '<div class="busca-container">' +
          '<input type="text" id="contrato-tema-busca" placeholder="Digite o nome do tema..." autocomplete="off">' +
        '</div>' +
        '<div id="contrato-tema-sugestoes" class="lista-sugestoes"></div>' +
      '</div>' +
      '<input type="hidden" id="contrato-tema-selecionado" value="">';
    
    // Inserir depois do campo "Local do Evento"
    if (campoLocal.parentNode) {
      campoLocal.parentNode.parentNode.insertBefore(wrapper, campoLocal.parentNode.nextSibling);
    }
    
    var inputBusca = document.getElementById("contrato-tema-busca");
    var caixaSug = document.getElementById("contrato-tema-sugestoes");
    var inputHidden = document.getElementById("contrato-tema-selecionado");
    
    if (inputBusca) {
      inputBusca.oninput = function(e) {
        var termo = e.target.value.toLowerCase().trim();
        if (!termo) {
          if (caixaSug) caixaSug.style.display = "none";
          return;
        }
        // Busca tolerante: normaliza acentos
        var normalizar = function(s) {
          return (s || "").toString().toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        };
        var termoNorm = normalizar(termo);
        var temas = Object.keys(State.estoque).filter(function(t) {
          return normalizar(t).indexOf(termoNorm) !== -1;
        });
        if (caixaSug) {
          caixaSug.innerHTML = "";
          temas.forEach(function(t) {
            var item = document.createElement("div");
            item.className = "sugestao-item";
            item.innerText = t;
            item.onclick = function() {
              inputBusca.value = t;
              if (inputHidden) inputHidden.value = t;
              caixaSug.style.display = "none";
              self.popularSelectPecasContrato(t);
            };
            caixaSug.appendChild(item);
          });
          caixaSug.style.display = temas.length ? "block" : "none";
        }
      };
    }
  },
  
  // ============================================================
  // GERADOR DE CONTRATO — popular select de peças por tema
  // ============================================================
  popularSelectPecasContrato: function(temaSelecionado) {
    var selectPecas = document.getElementById("c-pecas");
    if (!selectPecas) return;
    
    var tema = temaSelecionado || (document.getElementById("contrato-tema-selecionado") || {}).value || "";
    selectPecas.innerHTML = "";
    
    if (!tema) {
      // Sem tema: listar todas as peças do estoque
      Object.keys(State.estoque).forEach(function(chave) {
        var item = State.estoque[chave];
        var nome = (item && item.nome) ? item.nome : chave;
        var opt = document.createElement("option");
        opt.value = nome;
        opt.textContent = nome + (item && item.quantidade !== undefined ? " (Qtd: " + item.quantidade + ")" : "");
        selectPecas.appendChild(opt);
      });
      return;
    }
    
    // Com tema: listar peças vinculadas ao tema (por categoria ou por nome)
    var infoTema = State.estoque[tema];
    var categoriaTema = infoTema && infoTema.categoria ? infoTema.categoria : "";
    
    var pecasDoTema = [];
    Object.keys(State.estoque).forEach(function(chave) {
      var item = State.estoque[chave];
      if (!item) return;
      var nome = item.nome || chave;
      // Se o item é o próprio tema
      if (nome === tema || chave === tema) {
        pecasDoTema.push({ nome: nome, item: item });
      }
      // Ou se compartilha a mesma categoria
      else if (categoriaTema && item.categoria === categoriaTema) {
        pecasDoTema.push({ nome: nome, item: item });
      }
    });
    
    // Se não achou nada vinculado, mostra todas
    if (pecasDoTema.length === 0) {
      Object.keys(State.estoque).forEach(function(chave) {
        var item = State.estoque[chave];
        var nome = (item && item.nome) ? item.nome : chave;
        var opt = document.createElement("option");
        opt.value = nome;
        opt.textContent = nome;
        selectPecas.appendChild(opt);
      });
      return;
    }
    
    pecasDoTema.forEach(function(p) {
      var opt = document.createElement("option");
      opt.value = p.nome;
      opt.textContent = p.nome + (p.item.quantidade !== undefined ? " (Qtd: " + p.item.quantidade + ")" : "");
      selectPecas.appendChild(opt);
    });
  },

  atualizarSeletoresCategoria: function(categorias) {
    if (!categorias) categorias = [];
    
    var selectCat = document.getElementById("catalogo-peca-categoria");
    if (selectCat) {
      var valorAtual = selectCat.value;
      selectCat.innerHTML = '';
      categorias.forEach(function(cat) {
        var opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        selectCat.appendChild(opt);
      });
      if (categorias.indexOf(valorAtual) !== -1) {
        selectCat.value = valorAtual;
      }
    }
    
    var selectRemover = document.getElementById("select-remover-categoria");
    if (selectRemover) {
      var valorAtual = selectRemover.value;
      selectRemover.innerHTML = '<option value="">Selecione...</option>';
      categorias.forEach(function(cat) {
        var opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        selectRemover.appendChild(opt);
      });
      if (categorias.indexOf(valorAtual) !== -1) {
        selectRemover.value = valorAtual;
      }
    }
    
    // ============================================================
    // RENDERIZAR LISTA DE CATEGORIAS — CORRIGIDO: usa NOME REAL, não índice
    // ============================================================
    var container = document.getElementById("lista-categorias-admin");
    if (container) {
      container.innerHTML = '';
      categorias.forEach(function(cat) {
        var div = document.createElement("div");
        div.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:4px 10px; background:#f8f0f2; border-radius:6px; border:1px solid #e1cbd4;";
        div.innerHTML = '<span style="font-size:13px;">📁 ' + cat + '</span>' +
          '<button type="button" onclick="window.removerCategoria(\'' + cat + '\')" class="btn btn-danger" style="padding:2px 8px; font-size:10px; width:auto; margin-left:6px;">✕</button>';
        container.appendChild(div);
      });
    }
    
    var contador = document.getElementById("contador-categorias");
    if (contador) {
      contador.textContent = categorias.length;
    }
  },

  handleSalvarFesta: function() {
    var elCliente = document.getElementById("nome-cliente");
    var elData = document.getElementById("data");
    var elTotal = document.getElementById("valor-total");
    var elSinal = document.getElementById("valor-sinal");
    var elObs = document.getElementById("adicionais-festa");
    var elFrete = document.getElementById("valor-frete");
    var elValorFesta = document.getElementById("valor-festa");

    var cliente = elCliente ? elCliente.value.trim() : "";
    var data = elData ? elData.value : "";
    var total = elTotal ? elTotal.value || "0" : "0";
    var sinal = elSinal ? elSinal.value || "0" : "0";
    var obs = elObs ? elObs.value.trim() : "";
    var frete = elFrete ? (parseFloat(elFrete.value) || 0) : 0;
    var valorFesta = elValorFesta ? (parseFloat(elValorFesta.value) || 0) : 0;
    
    // Pega o tema: primeiro do input hidden, depois do filtro visível
    var inputTemaHidden = document.getElementById("busca-tema-input");
    var inputTemaFiltro = document.getElementById("filtro-tema-input");
    if (inputTemaHidden && inputTemaHidden.value.trim()) {
      State.temaAtual = inputTemaHidden.value.trim();
    } else if (inputTemaFiltro && inputTemaFiltro.value.trim()) {
      State.temaAtual = inputTemaFiltro.value.trim();
    }

    if(!cliente || !data || !State.temaAtual || !State.kitAtual) {
      return Utils.showToast("Preencha cliente, data, tema e selecione o modelo do kit!", "warning");
    }

    var temaBuscaNormalizado = State.temaAtual.toLowerCase().trim();
    var nomeRealChave = null;
    for (var t in State.estoque) {
      if (State.estoque.hasOwnProperty(t) && t.toLowerCase().trim() === temaBuscaNormalizado) {
        nomeRealChave = t;
        break;
      }
    }
    var infoTema = nomeRealChave ? State.estoque[nomeRealChave] : null;
    var kitsCadastrados = infoTema ? (parseInt(infoTema.kits) || parseInt(infoTema.quantidade) || 0) : 0;

    var reservasAtivas = 0;
    State.reservas.forEach(function(res) {
      if (res && res.tema && res.tema.toLowerCase().trim() === temaBuscaNormalizado) {
        reservasAtivas++;
      }
    });

    var livres = kitsCadastrados - reservasAtivas;

    if (livres <= 0 && kitsCadastrados > 0) {
      Utils.showToast("🚨 Indisponível! O tema \"" + State.temaAtual + "\" não possui kits livres em estoque no momento.", "error");
      return;
    }
    
    Database.salvarReservaNuvem({
      cliente: cliente,
      data: data,
      tema: nomeRealChave || State.temaAtual,
      kit: State.kitAtual,
      total: total,
      sinal: sinal,
      frete: frete,
      valorFesta: valorFesta,
      obs: obs,
      dataCriacao: Utils.getHojeDataString()
    }).then(function(sucesso) {
      if(sucesso) {
        if(elCliente) elCliente.value = "";
        if(elData) elData.value = "";
        if(elTotal) elTotal.value = "";
        if(elSinal) elSinal.value = "";
        if(elObs) elObs.value = "";
        var inputKm = document.getElementById('calc-km') || document.getElementById('frete-km');
        if(inputKm) inputKm.value = "";
        var boxResultado = document.getElementById('painel-frete-resultado');
        if(boxResultado) boxResultado.style.display = 'none';
        if(elFrete) elFrete.value = "0.00";
        if(elValorFesta) elValorFesta.value = "";
        
        State.temaAtual = "";
        State.kitAtual = "";
        if(inputTemaHidden) inputTemaHidden.value = "";
        if(inputTemaFiltro) inputTemaFiltro.value = "";
        document.querySelectorAll('.btn-kit-opcao').forEach(function(b) { b.classList.remove('ativo'); });
        var painelMontagem = document.getElementById("painel-perguntas-montar-local") || document.getElementById("painel-montagem-local");
        if (painelMontagem) painelMontagem.style.display = "none";
      }
    });
  },

  acaoSalvarTemaCorrente: function() {
    var elNome = document.getElementById("editor-nome-tema") || document.getElementById("nome-tema") || document.getElementById("tema-nome");
    var elKits = document.getElementById("editor-qtd-kits") || document.getElementById("qtd-kits");
    var elPng = document.getElementById("editor-png-tema") || document.getElementById("png-tema") || document.getElementById("tema-png");
    
    var nome = elNome ? elNome.value.trim() : "";
    var kits = elKits ? parseInt(elKits.value) || 0 : 0;
    var png = elPng ? elPng.value.trim() : "";

    if(!nome) return Utils.showToast("Insira o nome do tema no gerenciador.", "warning");

    Database.salvarTemaNuvem(nome, { kits: kits, png: png });
    this.resetEditor();
  },

  acaoSalvarOrcamentoCorrente: function() {
    var clienteEl = document.getElementById("nome-cliente");
    var totalEl = document.getElementById("valor-total");
    var dataEl = document.getElementById("data");
    var obsEl = document.getElementById("adicionais-festa");

    var nomeCliente = clienteEl ? clienteEl.value.trim() : "";
    var valorTotal = totalEl ? totalEl.value.trim() : "0";
    var dataReserva = dataEl ? dataEl.value : "";
    var obs = obsEl ? obsEl.value.trim() : "";
    
    if(!nomeCliente) return Utils.showToast("Preencha o campo do nome do cliente para salvar o orçamento.", "warning");
    
    var dadosOrcamento = {
      cliente: nomeCliente,
      tema: State.temaAtual || "Não selecionado",
      kit: State.kitAtual || "",
      total: valorTotal,
      dataFesta: dataReserva,
      obs: obs,
      dataCriacao: Utils.getHojeDataString(),
      horaCriacao: Utils.getHoraString()
    };
    Database.salvarOrcamentoNuvem(dadosOrcamento);
  },

  handleLogin: function() {
    var email = document.getElementById("email").value.trim();
    var senha = document.getElementById("senha").value;
    if (CONFIG.usuarios[email] === senha) {
      State.usuarioLogadoEmail = email;
      document.getElementById("secao-login").style.display = "none";
      document.getElementById("secao-verificador").style.display = "block";
      document.getElementById("nome-usuario").innerHTML = "👤 <b>" + email.split('@')[0] + "</b>";
      var abaEditar = document.getElementById("aba-editar");
      if (abaEditar) abaEditar.style.display = "block";
      Utils.showToast("Login realizado!", "success");
      Database.listenPontoUsuario();
    } else Utils.showToast("E-mail ou senha incorretos.", "error");
  },
  handleLogout: function() { window.location.reload(); },

  toggleRelatorioPontos: function() {
    var p = document.getElementById("painel-relatorio-pontos-geral");
    if(p) p.style.display = p.style.display === "none" ? "block" : "none";
  },
  
  // ============================================================
  // "VER ORÇAMENTOS" — alterna painel e garante renderização
  // ============================================================
  toggleOrcamentos: function() {
    var p = document.getElementById("painel-orcamentos-salvos") || document.getElementById("card-orcamentos-integrado");
    if (p) {
      var displayAtual = window.getComputedStyle(p).display;
      p.style.display = (displayAtual === "none") ? "block" : "none";
      if (p.style.display === "block") {
        this.renderOrcamentos();
      }
    }
  },

  handleEditorBusca: function(termo) {
    var self = this;
    var caixa = document.getElementById("editor-sugestoes") || document.getElementById("lista-sugestoes-editor");
    if(!caixa) return;
    termo = termo.toLowerCase().trim();
    if(!termo) { caixa.style.display = "none"; return; }

    var filtrados = Object.keys(State.estoque).filter(function(t) { return t.toLowerCase().indexOf(termo) !== -1; });
    caixa.innerHTML = "";
    filtrados.forEach(function(tema) {
      var item = document.createElement("div");
      item.className = "item-sugestao";
      item.innerText = tema;
      item.onclick = function() {
        var elNome = document.getElementById("editor-nome-tema") || document.getElementById("nome-tema") || document.getElementById("tema-nome");
        var elKits = document.getElementById("editor-qtd-kits") || document.getElementById("qtd-kits");
        var elPng = document.getElementById("editor-png-tema") || document.getElementById("png-tema") || document.getElementById("tema-png");
        var elBusca = document.getElementById("editor-busca-tema") || document.getElementById("busca-tema-editor");
        
        if(elNome) elNome.value = tema;
        if(elKits) elKits.value = State.estoque[tema].kits || State.estoque[tema].quantidade || 0;
        if(elPng) elPng.value = State.estoque[tema].png || State.estoque[tema].imagem || "";
        if(elBusca) elBusca.value = "";
        
        caixa.style.display = "none";

        var btnPreview = document.getElementById("btn-preview-png") || document.getElementById("btn-preview");
        if(btnPreview) btnPreview.click();
      };
      caixa.appendChild(item);
    });
    caixa.style.display = filtrados.length ? "block" : "none";
  },

  // ============================================================
  // SUGESTÕES DE TEMA — busca tolerante a maiúsculas/acentos/parciais
  // ============================================================
  renderSuggestions: function(termo) {
    var caixa = document.getElementById("wrapper-lista-sugestoes") || document.getElementById("lista-sugestoes-temas") || document.getElementById("lista-sugestoes");
    if(!caixa) return;
    termo = (termo || "").toString();
    if(!termo.trim()) { caixa.style.display = "none"; caixa.innerHTML = ""; return; }

    // Normalização: minúsculas + remoção de acentos
    var normalizar = function(s) {
      return (s || "").toString().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };
    var termoNorm = normalizar(termo.trim());

    var filtrados = Object.keys(State.estoque).filter(function(t) {
      return normalizar(t).indexOf(termoNorm) !== -1;
    });
    caixa.innerHTML = "";

    if (filtrados.length === 0) {
      caixa.style.display = "none";
      return;
    }

    filtrados.forEach(function(tema) {
      var objTema = State.estoque[tema] || {};
      var item = document.createElement("div");
      item.className = "sugestao-item";
      // classe alternativa usada em CSS
      item.classList.add("item-sugestao");

      var kitsCadastrados = objTema.kits ? (parseInt(objTema.kits) || 0) : (parseInt(objTema.quantidade) || 0);
      var reservasAtivas = 0;
      State.reservas.forEach(function(res) {
        if (res && res.tema && res.tema.toLowerCase().trim() === tema.toLowerCase().trim()) {
          reservasAtivas++;
        }
      });
      var livres = kitsCadastrados - reservasAtivas;

      if (livres <= 0 && kitsCadastrados > 0) {
        item.innerHTML = "⚙️ " + tema + " <span style='color:var(--error); font-weight:bold;'>(INDISPONÍVEL)</span>";
      } else {
        item.innerHTML = "⚙️ " + tema + (kitsCadastrados > 0 ? " (Livre: " + livres + "/" + kitsCadastrados + ")" : "");
      }

      item.onclick = function() {
        if (livres <= 0 && kitsCadastrados > 0) {
          Utils.showToast("O tema \"" + tema + "\" está completamente indisponível no estoque físico!", "error");
          return;
        }
        var inputTemaHidden = document.getElementById("busca-tema-input");
        var inputTemaFiltro = document.getElementById("filtro-tema-input");
        if(inputTemaHidden) inputTemaHidden.value = tema;
        if(inputTemaFiltro) inputTemaFiltro.value = tema;
        State.temaAtual = tema;
        caixa.style.display = "none";
        Utils.showToast("Tema " + tema + " selecionado.", "info");
      };
      caixa.appendChild(item);
    });
    caixa.style.display = "block";
  },

  renderCatalogo: function(filtro) {
    if (!filtro) filtro = "";
    var container = document.getElementById("lista-catalogo-render") || document.getElementById("catalogo-render");
    if (!container) return;
    container.innerHTML = "";

    var temasCadastrados = Object.keys(State.estoque);
    if (temasCadastrados.length === 0) {
      container.innerHTML = "<div style='text-align:center; padding:20px; color:#777;'>Nenhum tema disponível no catálogo no momento.</div>";
      return;
    }

    var filtrados = temasCadastrados;
    if (filtro.trim() !== "") {
      var f = filtro.toLowerCase().trim();
      filtrados = temasCadastrados.filter(function(t) { return t.toLowerCase().indexOf(f) !== -1; });
    }

    filtrados.forEach(function(nomeTema) {
      var objTema = State.estoque[nomeTema];
      var card = document.createElement("div");
      card.className = "card-catalogo card-tema";
      
      var kitsCadastrados = objTema.kits ? (parseInt(objTema.kits) || 0) : (parseInt(objTema.quantidade) || 0);
      var fotoUrl = objTema.png || objTema.imagem || "https://placehold.co/200x150?text=Sem+Foto";

      var reservasAtivas = 0;
      State.reservas.forEach(function(res) {
        if (res && res.tema && res.tema.toLowerCase().trim() === nomeTema.toLowerCase().trim()) {
          reservasAtivas++;
        }
      });
      var livres = kitsCadastrados - reservasAtivas;
      var statusEstoque = livres > 0 
        ? "<span style='color:var(--success); font-size:0.85em;'>🟢 " + livres + " livres</span>" 
        : "<span style='color:var(--error); font-size:0.85em;'>🔴 Indisponível</span>";

      card.innerHTML = '<img src="' + fotoUrl + '" style="width:100%; height:140px; object-fit:cover; border-radius:6px 6px 0 0;" onerror="this.src=\'https://placehold.co/200x150?text=Erro+Foto\'">' +
      '<div style="padding: 10px;">' +
        '<h4 style="margin:0 0 5px 0; color:var(--primary); font-size:1.1em;">' + nomeTema + '</h4>' +
        '<p style="margin:0; font-size:0.9em; color:#555;">Kits totais: <b>' + kitsCadastrados + '</b></p>' +
        '<div style="margin-top:5px;">' + statusEstoque + '</div>' +
      '</div>';
      
      container.appendChild(card);
    });
  },
  
  // ============================================================
  // RENDERIZAR TABELA DE TEMAS GERENCIADOS (dentro do painel catálogo)
  // ============================================================
  renderTabelaTemasGerenciados: function() {
    var corpo = document.getElementById("lista-temas-gerenciados-corpo");
    if (!corpo) return;
    
    var chaves = Object.keys(State.estoque);
    if (chaves.length === 0) {
      corpo.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#999; padding:15px;">Nenhum tema ou peça cadastrada.</td></tr>';
    } else {
      var html = "";
      chaves.forEach(function(chave) {
        var item = State.estoque[chave] || {};
        var nome = item.nome || chave;
        var img = item.imagem || item.png;
        var imgHtml = img 
          ? '<img src="' + img + '" class="catalogo-foto" alt="Foto">' 
          : '<div style="width:50px;height:50px;background:#eee;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#888;">Sem Foto</div>';
        html += '<tr>' +
          '<td style="text-align:center;">' + imgHtml + '</td>' +
          '<td><strong>' + nome + '</strong><br>' +
          '<span style="font-size:11px; color:var(--text-muted);">' +
          'Categoria: ' + (item.categoria || "Geral") + ' | Modelo: ' + (item.modelo || "Padrão") + '<br>' +
          'Qtd: <strong>' + (item.quantidade || item.kits || 1) + '</strong>' +
          '</span></td>' +
          '<td style="text-align:center;">' +
          '<button type="button" onclick="window.removerTemaPorChave(\'' + chave.replace(/'/g, "\\'") + '\')" class="btn-acao-tabela btn-remover-orc" title="Remover">🗑️</button>' +
          '</td></tr>';
      });
      corpo.innerHTML = html;
    }
    
    // Atualizar select de remoção
    var selectRemover = document.getElementById("select-remover-tema");
    if (selectRemover) {
      var valorAtual = selectRemover.value;
      selectRemover.innerHTML = '<option value="">Selecione um tema para remover...</option>';
      Object.keys(State.estoque).forEach(function(chave, idx) {
        var item = State.estoque[chave] || {};
        var nome = item.nome || chave;
        var opt = document.createElement("option");
        opt.value = chave;
        opt.textContent = nome + " (" + (item.categoria || 'Geral') + ") - " + (item.quantidade || item.kits || 0) + " disp.";
        selectRemover.appendChild(opt);
      });
      if (valorAtual && State.estoque[valorAtual]) selectRemover.value = valorAtual;
    }
    
    var contador = document.getElementById("contador-catalogo-total");
    if (contador) contador.textContent = chaves.length + " itens";
  },

  resetEditor: function() {
    var elNome = document.getElementById("editor-nome-tema") || document.getElementById("nome-tema") || document.getElementById("tema-nome");
    var elKits = document.getElementById("editor-qtd-kits") || document.getElementById("qtd-kits");
    var elPng = document.getElementById("editor-png-tema") || document.getElementById("png-tema") || document.getElementById("tema-png");
    var elCont = document.getElementById("container-preview-tema") || document.getElementById("preview-tema-box");

    if(elNome) elNome.value = "";
    if(elKits) elKits.value = "1";
    if(elPng) elPng.value = "";
    if(elCont) elCont.style.display = "none";
  },

  renderReservas: function(filtro) {
    if (!filtro) filtro = "";
    var container = document.getElementById("lista-reservas-render");
    if (!container) return;
    container.innerHTML = "";

    if (State.carregando) {
      container.innerHTML = "<div style='text-align:center; padding:20px;'>⌛ Carregando agendamentos...</div>";
      return;
    }

    if (State.reservas.length === 0) {
      container.innerHTML = "<div style='text-align:center; padding:20px; color:#777;'>Nenhum agendamento encontrado.</div>";
      return;
    }

    var reservasFiltradas = State.reservas.slice().sort(function(a, b) { return new Date(a.data) - new Date(b.data); });
        
    if (filtro.trim() !== "") {
      var f = filtro.toLowerCase().trim();
      reservasFiltradas = reservasFiltradas.filter(function(res) {
        return (res.cliente && res.cliente.toLowerCase().indexOf(f) !== -1) || 
               (res.tema && res.tema.toLowerCase().indexOf(f) !== -1);
      });
    }

    reservasFiltradas.forEach(function(res) {
      var card = document.createElement("div");
      card.className = "card-reserva";

      var total = parseFloat(res.total) || 0;
      var sinal = parseFloat(res.sinal) || 0;
      var frete = parseFloat(res.frete) || 0;
      var totGeral = total + frete;
      var devedor = totGeral - sinal;
      var quitado = devedor <= 0;

      var infoTema = State.estoque[res.tema];
      var imgTemaHTML = "";
      if (infoTema && (infoTema.png || infoTema.imagem)) {
        imgTemaHTML = "<div style='text-align:center; margin:8px 0;'><img src='" + (infoTema.png || infoTema.imagem) + "' style='max-height:60px; object-fit:contain;'></div>";
      }

      card.innerHTML = '<div class="reserva-header">' +
        '<strong>👶 ' + res.cliente + '</strong>' +
        '<span class="reserva-badge" style="background:' + (quitado ? '#27ae60' : '#e67e22') + ';">' + (quitado ? 'PAGO 100%' : 'PENDENTE') + '</span>' +
      '</div>' +
      '<div class="reserva-body">' +
        '<p>📅 Data: <b>' + Utils.formatDateBR(res.data) + '</b></p>' +
        '<p>🎨 Tema: <b style="color:var(--primary);">' + res.tema + '</b></p>' +
        '<p>🛍️ Modelo: <b>' + (res.kit || 'Não informado') + '</b></p>' + 
        imgTemaHTML +
        '<p>🚚 Frete: <b>' + Utils.formatCurrency(frete) + '</b></p>' +
        '<p>💰 Total Geral: <b>' + Utils.formatCurrency(totGeral) + '</b></p>' +
        '<p>💵 Sinal Pago: <b>' + Utils.formatCurrency(sinal) + '</b></p>' +
        '<p style="color:' + (quitado ? 'green' : 'red') + '">⚠️ Falta Receber: <b>' + Utils.formatCurrency(devedor) + '</b></p>' +
        (res.obs ? '<p>📝 Obs: ' + res.obs + '</p>' : '') +
      '</div>' +
      '<button type="button" style="width:100%; padding:8px; margin-top:10px; background:var(--error, #e74c3c); color:#fff; border:none; border-radius:4px; cursor:pointer;" onclick="window.DeletarReserva(\'' + res.id + '\')">🗑️ Excluir Agendamento</button>';

      container.appendChild(card);
    });
  },

  // ============================================================
  // ORÇAMENTOS — renderiza lista no painel "card-orcamentos-integrado"
  // ============================================================
  renderOrcamentos: function() {
    var container = document.getElementById("lista-orcamentos-render") 
                  || document.getElementById("orcamentos-render")
                  || document.getElementById("lista-orcamentos-interno-corpo");
    if (!container) return;
    container.innerHTML = "";

    if (State.orcamentos.length === 0) {
      // Se for tbody, usa <tr>
      if (container.tagName === "TBODY") {
        container.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#777;">Nenhum orçamento salvo.</td></tr>';
      } else {
        container.innerHTML = "<div style='text-align:center; padding:20px; color:#777;'>Nenhum orçamento salvo.</div>";
      }
      return;
    }

    var isTbody = container.tagName === "TBODY";
    var html = "";
    State.orcamentos.forEach(function(orc) {
      var totalFmt = Utils.formatCurrency(orc.total);
      if (isTbody) {
        html += '<tr>' +
          '<td>' + (orc.cliente || '') + '</td>' +
          '<td>' + (orc.tema || '') + (orc.kit ? ' / ' + orc.kit : '') + '</td>' +
          '<td>' + totalFmt + '</td>' +
          '<td style="text-align:center;">' +
            '<button type="button" onclick="window.PromoverOrcamento(\'' + orc.id + '\')" class="btn-acao-tabela btn-promover" title="Promover para Reserva">✅</button>' +
            '<button type="button" onclick="window.ExcluirOrcamento(\'' + orc.id + '\')" class="btn-acao-tabela btn-remover-orc" title="Excluir">🗑️</button>' +
          '</td>' +
        '</tr>';
      } else {
        html += '<div class="card-reserva"><div class="reserva-header"><strong>👤 ' + (orc.cliente || '') + '</strong></div>' +
          '<div class="reserva-body">' +
          '<p>📅 Data da Festa: <b>' + Utils.formatDateBR(orc.dataFesta) + '</b></p>' +
          '<p>🎨 Tema: <b>' + (orc.tema || '') + '</b></p>' +
          '<p>💰 Total Estimado: <b>' + totalFmt + '</b></p>' +
          (orc.obs ? '<p>📝 Obs: ' + orc.obs + '</p>' : '') +
          '</div></div>';
      }
    });
    container.innerHTML = html;
  },

  renderRelatorioGeralPontos: function(dadosPontos) {
    var container = document.getElementById("lista-relatorio-pontos-render") || document.getElementById("relatorio-pontos-render") || document.querySelector("#lista-pontos-geral-corpo");
    if (!container) return;
    container.innerHTML = "";
    
    var isTbody = container.tagName === "TBODY";
    var html = "";
    var temAlgo = false;
    
    for (var usuario in dadosPontos) {
      if (dadosPontos.hasOwnProperty(usuario)) {
        var dias = dadosPontos[usuario];
        for (var dia in dias) {
          if (dias.hasOwnProperty(dia)) {
            temAlgo = true;
            var p = dias[dia];
            if (isTbody) {
              html += '<tr><td>' + usuario.replace(/_/g, ".") + '</td>' +
                '<td>' + Utils.formatDateBR(dia) + '</td>' +
                '<td style="color:var(--success);">' + (p.entrada || "--:--") + '</td>' +
                '<td style="color:var(--error);">' + (p.saida || "--:--") + '</td></tr>';
            } else {
              html += '<li style="margin-bottom:5px; padding:8px; background:#f5f6fa; border-radius:4px; font-size:0.9em;">' +
                '<b>' + usuario.replace(/_/g, ".") + '</b> — <b>' + Utils.formatDateBR(dia) + '</b> | ' +
                '<span style="color:var(--success);">Entrada: ' + (p.entrada || "--:--") + '</span> | ' +
                '<span style="color:var(--error);">Saída: ' + (p.saida || "--:--") + '</span></li>';
            }
          }
        }
      }
    }
    
    if (!temAlgo) {
      if (isTbody) {
        container.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#999;">Nenhum ponto registrado.</td></tr>';
      } else {
        container.innerHTML = "<p style='text-align:center;'>Nenhum registro de ponto encontrado.</p>";
      }
    } else {
      if (isTbody) {
        container.innerHTML = html;
      } else {
        container.innerHTML = "<ul style='list-style:none; padding-left:0;'>" + html + "</ul>";
      }
    }
  }
};

window.DeletarReserva = function(idReserva) {
  if (confirm("Tem certeza que deseja excluir este agendamento definitivamente?")) {
    Database.excluirReservaNuvem(idReserva).then(function() {
      Utils.showToast("Agendamento removido!", "success");
    }).catch(function() {
      Utils.showToast("Falha ao remover o agendamento.", "error");
    });
  }
};

window.ExcluirReuniao = function(idReuniao) {
  if (confirm("Excluir esta reunião?")) {
    Database.excluirReuniaoNuvem(idReuniao).then(function() {
      Utils.showToast("Reunião removida!", "success");
    }).catch(function() {
      Utils.showToast("Falha ao remover reunião.", "error");
    });
  }
};

window.ExcluirOrcamento = function(idOrcamento) {
  if (confirm("Excluir este orçamento?")) {
    if (!State.db) return;
    State.db.ref("orcamentos/" + idOrcamento).remove().then(function() {
      Utils.showToast("Orçamento removido!", "success");
    }).catch(function() {
      Utils.showToast("Falha ao remover orçamento.", "error");
    });
  }
};

window.PromoverOrcamento = function(idOrcamento) {
  var orc = State.orcamentos.filter(function(o) { return o.id === idOrcamento; })[0];
  if (!orc) return;
  // Pré-preenche o formulário com os dados do orçamento
  var elCliente = document.getElementById("nome-cliente");
  var elData = document.getElementById("data");
  var elTotal = document.getElementById("valor-total");
  var elObs = document.getElementById("adicionais-festa");
  var inputTemaHidden = document.getElementById("busca-tema-input");
  var inputTemaFiltro = document.getElementById("filtro-tema-input");
  
  if (elCliente) elCliente.value = orc.cliente || "";
  if (elData && orc.dataFesta) elData.value = orc.dataFesta;
  if (elTotal) elTotal.value = orc.total || "";
  if (elObs) elObs.value = orc.obs || "";
  if (orc.tema) {
    if (inputTemaHidden) inputTemaHidden.value = orc.tema;
    if (inputTemaFiltro) inputTemaFiltro.value = orc.tema;
    State.temaAtual = orc.tema;
  }
  if (orc.kit) {
    State.kitAtual = orc.kit;
    document.querySelectorAll('.btn-kit-opcao').forEach(function(b) {
      b.classList.toggle('ativo', b.getAttribute('data-kit') === orc.kit);
    });
  }
  Utils.showToast("Orçamento carregado no formulário. Revise e confirme a reserva.", "success");
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.removerTemaPorChave = function(chave) {
  var item = State.estoque[chave];
  if (!item) return;
  var nome = item.nome || chave;
  if (confirm("Deseja realmente remover \"" + nome + "\"?")) {
    LoadingOverlay.mostrar('⏳ Removendo Tema...', 'Tema: ' + nome);
    Database.excluirTemaNuvem(chave).then(function() {
      // sucesso já é mostrado pelo overlay
    }).catch(function() {
      LoadingOverlay.esconder();
    });
  }
};

// ============================================================
// INICIALIZAÇÃO — só roda se o HTML ainda não tiver inicializado
// (evita duplicação caso o HTML inline também tente rodar)
// ============================================================
window.addEventListener('load', function() {
  // Se o HTML inline já inicializou o Firebase, State.db já está pronto.
  // Aqui só garantimos que o UI.init() rode depois que o DOM está pronto.
  if (!window.__tralala_ui_iniciada) {
    window.__tralala_ui_iniciada = true;
    // Se ninguém inicializou o Database ainda, inicializa agora
    if (!State.db) {
      try {
        if (typeof firebase !== 'undefined') {
          Database.init();
        }
      } catch (e) { console.error("Erro init Database:", e); }
    }
    try {
      UI.init();
    } catch (e) { console.error("Erro init UI:", e); }
  }
});
