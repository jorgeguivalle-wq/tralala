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
  temaAtual: "", 
  kitAtual: "", 
  carregando: true, 
  usuarioLogadoEmail: "",
  salvandoPeca: false,
  removendoPeca: false
};

// ============================================================
// TELINHA DE CARREGAMENTO (OVERLAY)
// ============================================================

var LoadingOverlay = {
  criar: function() {
    if (document.getElementById('loading-overlay')) return;
    
    var overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 99999;
      backdrop-filter: blur(4px);
    `;
    
    overlay.innerHTML = `
      <div style="
        background: white;
        padding: 40px 50px;
        border-radius: 16px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        max-width: 400px;
        animation: fadeInScale 0.3s ease;
      ">
        <div style="font-size: 48px; margin-bottom: 15px;">⏳</div>
        <div style="font-size: 20px; font-weight: 600; color: #2d3436; margin-bottom: 8px;" id="loading-message">
          Salvando...
        </div>
        <div style="font-size: 14px; color: #636e72;" id="loading-submessage">
          Aguarde um momento
        </div>
        <div style="margin-top: 20px;">
          <div style="
            width: 100%;
            height: 4px;
            background: #f0f0f0;
            border-radius: 2px;
            overflow: hidden;
          ">
            <div style="
              width: 0%;
              height: 100%;
              background: #a3536a;
              border-radius: 2px;
              animation: loadingBar 1.5s ease-in-out infinite;
            "></div>
          </div>
        </div>
      </div>
    `;
    
    var style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInScale {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes loadingBar {
        0% { width: 0%; }
        50% { width: 70%; }
        100% { width: 100%; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(overlay);
  },
  
  mostrar: function(mensagem, submensagem) {
    this.criar();
    var overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    
    var msgEl = document.getElementById('loading-message');
    var subMsgEl = document.getElementById('loading-submessage');
    
    if (msgEl) msgEl.textContent = mensagem || 'Salvando...';
    if (subMsgEl) subMsgEl.textContent = submensagem || 'Aguarde um momento';
    
    overlay.style.display = 'flex';
  },
  
  esconder: function() {
    var overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }
};

var Utils = {
  showToast: function(message, type) {
    if (!type) type = 'info';
    var container = document.getElementById('toast-container');
    if (!container) { 
      console.log(type + ": " + message); 
      if (type === 'error') {
        alert('❌ ' + message);
      }
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
      this.listen();
      this.listenCategorias();
    } else {
      Utils.showToast("🚨 Erro de conexão: Biblioteca do Firebase não carregou.", "error");
    }
  },
  listen: function() {
    var timeoutRender = null;
    
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
        
        var inputBuscaTemaFicha = document.getElementById("busca-tema-input") || document.getElementById("busca-tema");
        if (inputBuscaTemaFicha && inputBuscaTemaFicha.value.trim()) {
          UI.renderSuggestions(inputBuscaTemaFicha.value);
        }
      }, 200);
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
      
      clearTimeout(timeoutCategorias);
      timeoutCategorias = setTimeout(function() {
        console.log("🔄 Categorias atualizadas:", categorias.length);
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
        Utils.showToast("✅ Peça salva com sucesso!", "success");
        console.log("✅ Peça salva com sucesso!");
        return true;
      })
      .catch(function(error) {
        State.salvandoPeca = false;
        console.error("❌ Erro ao salvar peça:", error);
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
        Utils.showToast("✅ Peça removida com sucesso!", "success");
        console.log("✅ Peça removida com sucesso!");
        return true;
      })
      .catch(function(error) {
        State.removendoPeca = false;
        console.error("❌ Erro ao remover peça:", error);
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
          Utils.showToast("✅ Categoria \"" + nome + "\" adicionada!", "success");
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
              Utils.showToast("✅ Categoria \"" + nome + "\" removida!", "success");
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
    
    var updateData = {
      usuario: State.usuarioLogadoEmail, 
      data: hoje 
    };
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
      Utils.showToast("✅ Tema deletado do estoque.", "success");
      console.log("✅ Tema removido:", nomeTema);
      return true;
    })
    .catch(function(error) { 
      console.error("❌ Erro ao deletar tema:", error);
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
  }
};

// ============================================================
// FUNÇÕES GLOBAIS PARA CATEGORIAS
// ============================================================

window.adicionarCategoria = function(nome) {
  return Database.salvarCategoriaNuvem(nome);
};

window.removerCategoria = function(nome) {
  return Database.removerCategoriaNuvem(nome);
};

var UI = {
  init: function() {
    this.bindEvents();
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
    // BOTÃO "SALVAR PEÇA NO ACERVO" COM TELINHA DE CARREGAMENTO
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

        LoadingOverlay.mostrar(
          '🔄 Salvando Peça...',
          'Tema: ' + nome
        );
        
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
            LoadingOverlay.esconder();
            State.salvandoPeca = false;
            
            if (sucesso) {
              document.getElementById("catalogo-peca-nome").value = "";
              document.getElementById("catalogo-peca-qtd").value = "1";
              document.getElementById("catalogo-peca-modelo").value = "";
              document.getElementById("catalogo-peca-imagem").value = "";
            }
          }).catch(function() {
            LoadingOverlay.esconder();
            State.salvandoPeca = false;
          });
        };

        if (fileInput && fileInput.files && fileInput.files[0]) {
          var reader = new FileReader();
          reader.onload = function(e) {
            processarSalvar(e.target.result);
          };
          reader.onerror = function() {
            Utils.showToast("Erro ao ler imagem. Salvando sem foto.", "warning");
            processarSalvar("https://placehold.co/100x100?text=Sem+Foto");
          };
          reader.readAsDataURL(fileInput.files[0]);
        } else {
          processarSalvar("https://placehold.co/100x100?text=Sem+Foto");
        }
      };
      console.log("✅ Botão Salvar Peça configurado com telinha de carregamento!");
    }

    // ============================================================
    // BOTÃO ADICIONAR CATEGORIA COM TELINHA
    // ============================================================
    var btnAdicionarCategoria = document.getElementById("btn-adicionar-categoria");
    if (btnAdicionarCategoria) {
      btnAdicionarCategoria.onclick = function(e) {
        e.preventDefault();
        var input = document.getElementById("input-nova-categoria");
        var nome = input.value.trim();
        if (nome) {
          LoadingOverlay.mostrar(
            '🔄 Adicionando Categoria...',
            'Categoria: ' + nome
          );
          
          window.adicionarCategoria(nome).then(function() {
            LoadingOverlay.esconder();
            input.value = "";
            input.focus();
          }).catch(function() {
            LoadingOverlay.esconder();
          });
        } else {
          Utils.showToast("Digite um nome para a categoria!", "warning");
        }
      };
      
      var inputCategoria = document.getElementById("input-nova-categoria");
      if (inputCategoria) {
        inputCategoria.onkeypress = function(e) {
          if (e.key === "Enter") {
            document.getElementById("btn-adicionar-categoria").click();
          }
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
          LoadingOverlay.mostrar(
            '🔄 Removendo Categoria...',
            'Categoria: ' + categoria
          );
          
          window.removerCategoria(categoria).then(function() {
            LoadingOverlay.esconder();
          }).catch(function() {
            LoadingOverlay.esconder();
          });
        } else {
          Utils.showToast("Selecione uma categoria para remover!", "warning");
        }
      };
    }

    // ============================================================
    // BOTÃO REMOVER TEMA COM TELINHA
    // ============================================================
    var btnRemoverTema = document.getElementById("btn-remover-tema-admin");
    if (btnRemoverTema) {
      btnRemoverTema.onclick = function(e) {
        e.preventDefault();
        var select = document.getElementById("select-remover-tema");
        var index = parseInt(select.value);
        var infoDiv = document.getElementById("info-tema-remover");
        
        if (isNaN(index) || !State.estoque || !Object.keys(State.estoque)[index]) {
          Utils.showToast("Selecione um tema válido para remover!", "warning");
          return;
        }
        
        var temaNome = Object.keys(State.estoque)[index];
        if (confirm("Deseja realmente remover o tema \"" + temaNome + "\"?")) {
          LoadingOverlay.mostrar(
            '🔄 Removendo Tema...',
            'Tema: ' + temaNome
          );
          
          Database.excluirTemaNuvem(temaNome).then(function() {
            LoadingOverlay.esconder();
            if (infoDiv) {
              infoDiv.innerHTML = `<span style="color:var(--success);">✅ Tema removido com sucesso!</span>`;
              setTimeout(function() { infoDiv.innerHTML = ''; }, 3000);
            }
          }).catch(function() {
            LoadingOverlay.esconder();
          });
        }
      };
    }

    var botoesKit = document.querySelectorAll('.btn-kit-opcao');
    botoesKit.forEach(function(btn) {
      btn.onclick = function(e) {
        e.preventDefault();
        botoesKit.forEach(function(b) { b.classList.remove('ativo'); });
        btn.classList.add('ativo');
        
        var nomeKit = btn.getAttribute('data-kit');
        State.kitAtual = nomeKit;
        Utils.showToast("Kit \"" + nomeKit + "\" selecionado!", "success");

        var painelMontagem = document.getElementById("painel-perguntas-montar-local");
        if (painelMontagem) {
          painelMontagem.style.display = (nomeKit === "Montar no Local") ? "block" : "none";
        }
      };
    });

    var calcularFrete = function() {
      var km = parseFloat(document.getElementById('frete-km').value) || 0;
      var valorLitro = parseFloat(document.getElementById('frete-valor-litro').value) || 0;
      var boxResultado = document.getElementById('painel-frete-resultado');
      var txtLitros = document.getElementById('res-frete-litros');
      var txtTotal = document.getElementById('res-frete-total');
      
      if (km > 0) {
        var litros = km / 10; 
        var totalFrete = litros * valorLitro;
        
        if(txtLitros) txtLitros.innerText = litros.toFixed(2);
        if(txtTotal) txtTotal.innerText = totalFrete.toFixed(2);
        if(boxResultado) boxResultado.style.display = 'block';
      } else {
        if(boxResultado) boxResultado.style.display = 'none';
        if(txtTotal) txtTotal.innerText = "0.00";
      }
    };

    var inputKm = document.getElementById('frete-km');
    var inputLitro = document.getElementById('frete-valor-litro');
    if (inputKm) inputKm.oninput = calcularFrete;
    if (inputLitro) inputLitro.oninput = calcularFrete;

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

    var btnAbrirCatalogo = document.getElementById("btn-abrir-catalogo") || document.getElementById("btn-ver-catalogo");
    if(btnAbrirCatalogo) {
      btnAbrirCatalogo.onclick = function(e) {
        if(e) e.preventDefault();
        var setorCatalogo = document.getElementById("secao-catalogo") || document.getElementById("painel-catalogo");
        if(setorCatalogo) {
          setorCatalogo.style.display = (setorCatalogo.style.display === "none" || setorCatalogo.style.display === "") ? "block" : "none";
          self.renderCatalogo();
        }
      };
    }

    var inputBuscaCatalogo = document.getElementById("busca-catalogo");
    if (inputBuscaCatalogo) {
      inputBuscaCatalogo.oninput = function(e) { 
        self.renderCatalogo(e.target.value); 
      };
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

    var inputBuscaTemaFicha = document.getElementById("busca-tema-input") || document.getElementById("busca-tema");
    if(inputBuscaTemaFicha) {
      inputBuscaTemaFicha.oninput = function(e) {
        State.temaAtual = e.target.value.trim();
        self.renderSuggestions(e.target.value);
      };
    }
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
      if (categorias.includes(valorAtual)) {
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
      if (categorias.includes(valorAtual)) {
        selectRemover.value = valorAtual;
      }
    }
    
    var container = document.getElementById("lista-categorias-admin");
    if (container) {
      container.innerHTML = '';
      categorias.forEach(function(cat) {
        var div = document.createElement("div");
        div.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:4px 10px; background:#f8f0f2; border-radius:6px; border:1px solid #e1cbd4;";
        div.innerHTML = `
          <span style="font-size:13px;">📁 ${cat}</span>
          <button onclick="window.removerCategoria('${cat}')" class="btn btn-danger" style="padding:2px 8px; font-size:10px; width:auto; margin-left:6px;">✕</button>
        `;
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
    var elFrete = document.getElementById("res-frete-total");

    var cliente = elCliente ? elCliente.value.trim() : "";
    var data = elData ? elData.value : "";
    var total = elTotal ? elTotal.value || "0" : "0";
    var sinal = elSinal ? elSinal.value || "0" : "0";
    var obs = elObs ? elObs.value.trim() : "";
    
    var inputTema = document.getElementById("busca-tema-input") || document.getElementById("busca-tema");
    if (inputTema && inputTema.value.trim()) {
      State.temaAtual = inputTema.value.trim();
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
    var kitsCadastrados = infoTema ? (parseInt(infoTema.kits) || 0) : 0;

    var reservasAtivas = 0;
    State.reservas.forEach(function(res) {
      if (res && res.tema && res.tema.toLowerCase().trim() === temaBuscaNormalizado) {
        reservasAtivas++;
      }
    });

    var livres = kitsCadastrados - reservasAtivas;

    if (livres <= 0) {
      Utils.showToast("🚨 Indisponível! O tema \"" + State.temaAtual + "\" não possui kits livres em estoque no momento.", "error");
      return;
    }

    var frete = elFrete ? (parseFloat(elFrete.innerText) || 0) : 0;
    
    Database.salvarReservaNuvem({
      cliente: cliente,
      data: data,
      tema: nomeRealChave || State.temaAtual,
      kit: State.kitAtual,
      total: total,
      sinal: sinal,
      frete: frete,
      obs: obs,
      dataCriacao: Utils.getHojeDataString()
    }).then(function(sucesso) {
      if(sucesso) {
        if(elCliente) elCliente.value = "";
        if(elData) elData.value = "";
        if(elTotal) elTotal.value = "";
        if(elSinal) elSinal.value = "";
        if(elObs) elObs.value = "";
        if(document.getElementById('frete-km')) document.getElementById('frete-km').value = "";
        var boxResultado = document.getElementById('painel-frete-resultado');
        if(boxResultado) boxResultado.style.display = 'none';
        
        State.temaAtual = "";
        State.kitAtual = "";
        if(inputTema) inputTema.value = "";
        document.querySelectorAll('.btn-kit-opcao').forEach(function(b) { b.classList.remove('ativo'); });
        var painelMontagem = document.getElementById("painel-perguntas-montar-local");
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
  toggleOrcamentos: function() {
    var p = document.getElementById("painel-orcamentos-salvos");
    if(p) p.style.display = p.style.display === "none" ? "block" : "none";
  },

  handleEditorBusca: function(termo) {
    var self = this;
    var caixa = document.getElementById("editor-sugestoes") || document.getElementById("lista-sugestoes-editor");
    if(!caixa) return;
    termo = termo.toLowerCase().trim();
    if(!termo) { caixa.style.display = "none"; return; }

    var filtrados = Object.keys(State.estoque).filter(function(t) { return t.toLowerCase().includes(termo); });
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
        if(elKits) elKits.value = State.estoque[tema].kits || 0;
        if(elPng) elPng.value = State.estoque[tema].png || "";
        if(elBusca) elBusca.value = "";
        
        caixa.style.display = "none";

        var btnPreview = document.getElementById("btn-preview-png") || document.getElementById("btn-preview");
        if(btnPreview) btnPreview.click();
      };
      caixa.appendChild(item);
    });
    caixa.style.display = filtrados.length ? "block" : "none";
  },

  renderSuggestions: function(termo) {
    var caixa = document.getElementById("lista-sugestoes-temas") || document.getElementById("lista-sugestoes");
    if(!caixa) return;
    termo = termo.toLowerCase().trim();
    if(!termo) { caixa.style.display = "none"; return; }

    var filtrados = Object.keys(State.estoque).filter(function(t) { return t.toLowerCase().includes(termo); });
    caixa.innerHTML = "";

    filtrados.forEach(function(tema) {
      var objTema = State.estoque[tema];
      var item = document.createElement("div");
      item.className = "item-sugestao";

      var kitsCadastrados = objTema.kits ? (parseInt(objTema.kits) || 0) : 0;
      var reservasAtivas = 0;
      State.reservas.forEach(function(res) {
        if (res && res.tema && res.tema.toLowerCase().trim() === tema.toLowerCase().trim()) {
          reservasAtivas++;
        }
      });
      var livres = kitsCadastrados - reservasAtivas;

      if (livres <= 0) {
        item.innerHTML = "⚙️ " + tema + " <span style='color:var(--error); font-weight:bold;'>(INDISPONÍVEL)</span>";
      } else {
        item.innerHTML = "⚙️ " + tema + " (Livre: " + livres + "/" + kitsCadastrados + ")";
      }

      item.onclick = function() {
        if (livres <= 0) {
          Utils.showToast("O tema \"" + tema + "\" está completamente indisponível no estoque físico!", "error");
          return;
        }
        var inputTema = document.getElementById("busca-tema-input") || document.getElementById("busca-tema");
        if(inputTema) inputTema.value = tema;
        State.temaAtual = tema;
        caixa.style.display = "none";
        Utils.showToast("Tema " + tema + " selecionado.", "info");
      };
      caixa.appendChild(item);
    });
    caixa.style.display = filtrados.length ? "block" : "none";
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
      filtrados = temasCadastrados.filter(function(t) { return t.toLowerCase().includes(f); });
    }

    filtrados.forEach(function(nomeTema) {
      var objTema = State.estoque[nomeTema];
      var card = document.createElement("div");
      
      card.className = "card-catalogo card-tema"; 
      
      var kitsCadastrados = objTema.kits ? (parseInt(objTema.kits) || 0) : 0;
      var fotoUrl = objTema.png || "https://placehold.co/200x150?text=Sem+Foto";

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
        return (res.cliente && res.cliente.toLowerCase().includes(f)) || 
               (res.tema && res.tema.toLowerCase().includes(f));
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
      if (infoTema && infoTema.png) {
        imgTemaHTML = "<div style='text-align:center; margin:8px 0;'><img src='" + infoTema.png + "' style='max-height:60px; object-fit:contain;'></div>";
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

  renderOrcamentos: function() {
    var container = document.getElementById("lista-orcamentos-render") || document.getElementById("orcamentos-render");
    if (!container) return;
    container.innerHTML = "";

    if (State.orcamentos.length === 0) {
      container.innerHTML = "<div style='text-align:center; padding:20px; color:#777;'>Nenhum orçamento salvo.</div>";
      return;
    }

    State.orcamentos.forEach(function(orc) {
      var card = document.createElement("div");
      card.className = "card-reserva";
      card.innerHTML = '<div class="reserva-header">' +
        '<strong>👤 ' + orc.cliente + '</strong>' +
      '</div>' +
      '<div class="reserva-body">' +
        '<p>📅 Data da Festa: <b>' + Utils.formatDateBR(orc.dataFesta) + '</b></p>' +
        '<p>🎨 Tema: <b>' + orc.tema + '</b></p>' +
        '<p>💰 Total Estimado: <b>' + Utils.formatCurrency(orc.total) + '</b></p>' +
        (orc.obs ? '<p>📝 Obs: ' + orc.obs + '</p>' : '') +
      '</div>';
      container.appendChild(card);
    });
  },

  renderRelatorioGeralPontos: function(dadosPontos) {
    var container = document.getElementById("lista-relatorio-pontos-render") || document.getElementById("relatorio-pontos-render");
    if (!container) return;
    container.innerHTML = "";
    
    var html = "";
    for (var usuario in dadosPontos) {
      if (dadosPontos.hasOwnProperty(usuario)) {
        html += "<h4 style='margin-top:15px; color:var(--primary);'>" + usuario.replace(/_/g, ".") + "</h4><ul style='list-style:none; padding-left:0;'>";
        var dias = dadosPontos[usuario];
        for (var dia in dias) {
          if (dias.hasOwnProperty(dia)) {
            var p = dias[dia];
            html += "<li style='margin-bottom:5px; padding:8px; background:#f5f6fa; border-radius:4px; font-size:0.9em;'>" +
              "<b>" + Utils.formatDateBR(dia) + "</b> &nbsp;|&nbsp; " +
              "<span style='color:var(--success);'>Entrada: " + (p.entrada || "--:--") + "</span> &nbsp;|&nbsp; " +
              "<span style='color:var(--error);'>Saída: " + (p.saida || "--:--") + "</span>" +
            "</li>";
          }
        }
        html += "</ul><hr style='border:1px solid #ddd;'>";
      }
    }
    container.innerHTML = html || "<p style='text-align:center;'>Nenhum registro de ponto encontrado.</p>";
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

window.onload = function() {
  Database.init();
  UI.init();
};
