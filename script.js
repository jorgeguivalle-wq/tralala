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
  },
  frete: {
    consumoKmPorLitro: 9,
    percentualManutencao: 0.20
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
  montarNoLocal: false,
  frete: {
    km: 0,
    precoCombustivel: 0,
    custoCombustivel: 0,
    manutencao: 0,
    freteTotal: 0
  },
  carregando: true, 
  usuarioLogadoEmail: "",
  salvandoPeca: false,
  removendoPeca: false,
  catalogoCarregado: false
};

// ============================================================
// OVERLAY DE CARREGAMENTO
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
    if (!catalogoContainer) return;
    var loader = document.createElement('div');
    loader.id = 'catalogo-loader';
    loader.style.cssText = 'display:none;text-align:center;padding:40px 20px;background:#ffffff;border-radius:12px;border:1px solid var(--border-color,#e1cbd4);margin:10px 0;';
    loader.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;gap:12px;">' +
      '<div style="width:40px;height:40px;border:4px solid #f0f0f0;border-top-color:#a3536a;border-radius:50%;animation:spin 0.8s linear infinite;"></div>' +
      '<div style="font-size:16px;font-weight:500;color:#2d3436;" id="catalogo-loader-mensagem">⏳ Carregando catálogo...</div>' +
      '<div style="font-size:13px;color:#636e72;" id="catalogo-loader-submensagem">Buscando dados do servidor</div></div>';
    var tabela = document.getElementById('lista-temas-gerenciados-corpo');
    if (tabela && tabela.parentElement) {
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
    if (subMsgEl) subMsgEl.textContent = 'Recarregue a página para tentar novamente.';
    this.container.style.display = 'block';
  },
  esconder: function() {
    if (this.container) this.container.style.display = 'none';
    var tabela = document.getElementById('lista-temas-gerenciados-corpo');
    if (tabela) tabela.style.display = '';
  }
};

// ============================================================
// UTILS
// ============================================================
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
    var v = parseFloat(value);
    if (isNaN(v) || !isFinite(v)) v = 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); 
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

// ============================================================
// MÓDULO DEDICADO DA CALCULADORA DE FRETE
// Fórmula oficial:
//   litros          = km / 9
//   custoCombustivel = litros * precoCombustivel
//   manutencao      = custoCombustivel * 0.20
//   freteTotal      = custoCombustivel + manutencao
// ============================================================
var FreteCalc = {
  ler: function() {
    var kmEl = document.getElementById('calc-km') || document.getElementById('frete-km');
    var precoEl = document.getElementById('calc-valor-litro') || document.getElementById('frete-valor-litro');
    var km = kmEl ? parseFloat(kmEl.value) : 0;
    var preco = precoEl ? parseFloat(precoEl.value) : 0;
    if (isNaN(km) || km < 0 || !isFinite(km)) km = 0;
    if (isNaN(preco) || preco < 0 || !isFinite(preco)) preco = 0;
    return { km: km, preco: preco };
  },
  
  calcular: function() {
    var entrada = this.ler();
    var km = entrada.km;
    var preco = entrada.preco;
    
    var litros = km / CONFIG.frete.consumoKmPorLitro;
    var custoCombustivel = litros * preco;
    var manutencao = custoCombustivel * CONFIG.frete.percentualManutencao;
    var freteTotal = custoCombustivel + manutencao;
    
    if (!isFinite(litros)) litros = 0;
    if (!isFinite(custoCombustivel)) custoCombustivel = 0;
    if (!isFinite(manutencao)) manutencao = 0;
    if (!isFinite(freteTotal)) freteTotal = 0;
    
    // Salva no State para uso posterior no agendamento/orçamento
    State.frete = {
      km: km,
      precoCombustivel: preco,
      litros: litros,
      custoCombustivel: custoCombustivel,
      manutencao: manutencao,
      freteTotal: freteTotal
    };
    
    return State.frete;
  },
  
  renderizar: function() {
    var f = this.calcular();
    
    var txtCombustivel = document.getElementById('calc-total-combustivel');
    var txtManutencao = document.getElementById('calc-manutencao');
    var txtTotal = document.getElementById('calc-cobrar-cliente');
    var txtLitros = document.getElementById('res-frete-litros');
    
    if (txtCombustivel) txtCombustivel.textContent = "R$ " + f.custoCombustivel.toFixed(2);
    if (txtManutencao) txtManutencao.textContent = "R$ " + f.manutencao.toFixed(2);
    if (txtTotal) txtTotal.textContent = f.freteTotal.toFixed(2);
    if (txtLitros) txtLitros.textContent = f.litros.toFixed(2);
    
    // Atualiza campos readonly de frete e total
    var inputFrete = document.getElementById('valor-frete');
    if (inputFrete) inputFrete.value = f.freteTotal.toFixed(2);
    
    var inputValorFesta = document.getElementById('valor-festa');
    var valorFesta = inputValorFesta ? (parseFloat(inputValorFesta.value) || 0) : 0;
    if (isNaN(valorFesta)) valorFesta = 0;
    
    var inputTotal = document.getElementById('valor-total');
    if (inputTotal) inputTotal.value = (valorFesta + f.freteTotal).toFixed(2);
    
    // Recalcula resta pagar
    var inputSinal = document.getElementById('valor-sinal');
    var sinal = inputSinal ? (parseFloat(inputSinal.value) || 0) : 0;
    if (isNaN(sinal)) sinal = 0;
    var inputRestante = document.getElementById('valor-restante');
    if (inputRestante) {
      var restante = (valorFesta + f.freteTotal) - sinal;
      if (restante < 0) restante = 0;
      inputRestante.value = restante.toFixed(2);
    }
    
    return f;
  },
  
  limpar: function() {
    State.frete = { km: 0, precoCombustivel: 0, litros: 0, custoCombustivel: 0, manutencao: 0, freteTotal: 0 };
    var kmEl = document.getElementById('calc-km') || document.getElementById('frete-km');
    var inputFrete = document.getElementById('valor-frete');
    if (kmEl) kmEl.value = "";
    if (inputFrete) inputFrete.value = "0.00";
    this.renderizar();
  }
};

// ============================================================
// DATABASE
// ============================================================
var Database = {
  init: function() {
    State.estoque = {};
    for (var key in CONFIG.temasDefault) {
      if (CONFIG.temasDefault.hasOwnProperty(key)) {
        State.estoque[key] = CONFIG.temasDefault[key];
      }
    }
    if (typeof firebase !== 'undefined') {
      if (!firebase.apps.length) firebase.initializeApp(CONFIG.firebase);
      State.db = firebase.database();
      CatalogoLoader.mostrar('⏳ Carregando catálogo...', 'Buscando dados do servidor');
      this.listen();
      this.listenCategorias();
    } else {
      Utils.showToast("🚨 Erro de conexão: Biblioteca do Firebase não carregou.", "error");
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
        UI.renderReservas();
        UI.renderCatalogo();
        UI.renderTabelaTemasGerenciados();
        
        if (primeiraVez) {
          primeiraVez = false;
          State.catalogoCarregado = true;
          CatalogoLoader.mostrarSucesso('✅ Catálogo carregado com sucesso!');
        }
        
        var inputBuscaTemaFicha = document.getElementById("filtro-tema-input") || document.getElementById("busca-tema-input");
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
        for (var id in val) {
          if (val.hasOwnProperty(id) && val[id]) {
            var copy = { id: id };
            for (var k in val[id]) { if (val[id].hasOwnProperty(k)) copy[k] = val[id][k]; }
            arr.push(copy);
          }
        }
      }
      State.reservas = arr;
      UI.renderReservas();
      UI.renderCatalogo();
      UI.renderTabelaTemasGerenciados();
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
    State.db.ref('categorias').on('value', function(snapshot) {
      var data = snapshot.val();
      var categorias = [];
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(function(key) {
          if (data[key] && data[key].nome) categorias.push(data[key].nome);
        });
      }
      State.categorias = categorias;
      UI.atualizarSeletoresCategoria(categorias);
    }, function(error) {
      console.error("❌ Erro no listener de categorias:", error);
    });
  },
  
  salvarPecaNuvem: function(dadosPeca) {
    if (!State.db) return Promise.reject("Sem conexão");
    if (State.salvandoPeca) return Promise.reject("Já está salvando");
    State.salvandoPeca = true;
    var novoRef = State.db.ref('estoque').push();
    return novoRef.set(dadosPeca)
      .then(function() {
        State.salvandoPeca = false;
        LoadingOverlay.mostrarSucesso('✅ Peça salva com sucesso!', '');
        return true;
      })
      .catch(function(error) {
        State.salvandoPeca = false;
        LoadingOverlay.esconder();
        Utils.showToast("❌ Erro ao salvar peça: " + error.message, "error");
        return false;
      });
  },
  
  excluirPecaNuvem: function(idPeca) {
    if (!State.db) return Promise.reject("Sem conexão");
    return State.db.ref("estoque/" + idPeca).remove();
  },
  
  salvarCategoriaNuvem: function(nome) {
    if (!State.db) return Promise.reject("Sem conexão");
    nome = nome.trim();
    if (!nome) return Promise.reject("Nome vazio");
    return State.db.ref('categorias').once('value').then(function(snapshot) {
      var data = snapshot.val();
      var existe = false;
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(function(key) {
          if (data[key] && data[key].nome && data[key].nome.toLowerCase() === nome.toLowerCase()) existe = true;
        });
      }
      if (existe) {
        Utils.showToast("A categoria \"" + nome + "\" já existe!", "warning");
        return Promise.reject("Categoria já existe");
      }
      var novaRef = State.db.ref('categorias').push();
      return novaRef.set({ nome: nome, criadoEm: Date.now() }).then(function() {
        LoadingOverlay.mostrarSucesso('✅ Categoria adicionada!', '');
        return true;
      });
    });
  },
  
  removerCategoriaNuvem: function(nome) {
    if (!State.db) return Promise.reject("Sem conexão");
    if (!nome) return Promise.reject("Nome vazio");
    return State.db.ref('categorias').once('value').then(function(snapshot) {
      var data = snapshot.val();
      var chaveRemover = null;
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(function(key) {
          if (data[key] && data[key].nome === nome) chaveRemover = key;
        });
      }
      if (!chaveRemover) return Promise.reject("Categoria não encontrada");
      if (!confirm("Deseja realmente remover a categoria \"" + nome + "\"?")) return Promise.reject("Cancelado");
      return State.db.ref('categorias/' + chaveRemover).remove().then(function() {
        LoadingOverlay.mostrarSucesso('✅ Categoria removida!', '');
        return true;
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
    if (!State.db || !State.usuarioLogadoEmail) return Utils.showToast("🚨 Erro de identificação.", "error");
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
      Utils.showToast("🚨 Erro ao salvar ponto.", "error"); 
    });
  },
  
  salvarTemaNuvem: function(nomeTema, dadosTema) {
    if(!State.db) return Utils.showToast("🚨 Sem conexão com Firebase", "error");
    return State.db.ref("estoque/" + nomeTema).set(dadosTema)
    .then(function() {
      Utils.showToast("Tema atualizado!", "success");
      return true;
    })
    .catch(function() {
      Utils.showToast("Erro ao sincronizar tema.", "error");
      return false;
    });
  },
  
  excluirTemaNuvem: function(chave) {
    if(!State.db) return Promise.reject("Sem conexão");
    return State.db.ref("estoque/" + chave).remove()
    .then(function() { 
      LoadingOverlay.mostrarSucesso('✅ Tema removido!', '');
      return true;
    })
    .catch(function(error) { 
      LoadingOverlay.esconder();
      Utils.showToast("❌ Erro ao deletar tema.", "error");
      return false;
    });
  },
  
  salvarOrcamentoNuvem: function(dadosOrcamento) {
    if(!State.db) return Promise.reject("Sem conexão");
    var novoRef = State.db.ref('orcamentos').push();
    return novoRef.set(dadosOrcamento)
    .then(function() { 
      Utils.showToast("Orçamento gravado com sucesso!", "success"); 
      return true;
    })
    .catch(function() { 
      Utils.showToast("Erro ao salvar orçamento.", "error"); 
      return false;
    });
  },
  
  salvarReservaNuvem: function(dadosReserva) {
    if(!State.db) return Promise.reject("Sem conexão");
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
  },

  salvarContratoNuvem: function(dadosContrato) {
    if(!State.db) return Promise.reject("Sem conexão");
    var novoRef = State.db.ref('contratos').push();
    return novoRef.set(dadosContrato);
  }
};

window.adicionarCategoria = function(nome) { return Database.salvarCategoriaNuvem(nome); };
window.removerCategoria = function(nome) { return Database.removerCategoriaNuvem(nome); };

// ============================================================
// UI
// ============================================================
var UI = {
  init: function() {
    this.bindEvents();
  },
  
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
    
    // LOGIN/LOGOUT — registrados primeiro
    var btnLogin = document.getElementById("btn-login-direto");
    if (btnLogin) {
      btnLogin.onclick = function(e) { if (e) e.preventDefault(); self.handleLogin(); };
    }
    var btnLogout = document.getElementById("btn-logout-direto");
    if (btnLogout) {
      btnLogout.onclick = function(e) { if (e) e.preventDefault(); self.handleLogout(); };
    }
    
    var senhaEl = document.getElementById("senha");
    if (senhaEl) {
      senhaEl.onkeypress = function(e) {
        if (e.key === "Enter" && btnLogin) btnLogin.click();
      };
    }

    // Botões diretos
    var mapeamentoBotoes = {
      "btn-ponto-entrada": function() { Database.registrarPonto('entrada'); },
      "btn-ponto-saida": function() { Database.registrarPonto('saida'); },
      "btn-abrir-relatorio-pontos": function() { self.toggleRelatorioPontos(); },
      "btn-abrir-orcamentos": function() { self.toggleOrcamentos(); },
      "btn-confirmar-agendamento": function() { self.handleSalvarFesta(); }
    };
    for (var id in mapeamentoBotoes) {
      if (mapeamentoBotoes.hasOwnProperty(id)) {
        (function(idAtual) {
          var elemento = document.getElementById(idAtual);
          if (elemento) elemento.onclick = function(e) { e.preventDefault(); mapeamentoBotoes[idAtual](); };
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
        if (State.salvandoPeca) { Utils.showToast("⏳ Salvando, aguarde...", "info"); return; }
        var nomeEl = document.getElementById("catalogo-peca-nome");
        var qtdEl = document.getElementById("catalogo-peca-qtd");
        var catEl = document.getElementById("catalogo-peca-categoria");
        var modEl = document.getElementById("catalogo-peca-modelo");
        var fileInput = document.getElementById("catalogo-peca-imagem");
        
        var nome = nomeEl ? nomeEl.value.trim() : "";
        var qtd = qtdEl ? (parseInt(qtdEl.value) || 0) : 0;
        var categoria = catEl ? catEl.value : "Outros";
        var modelo = modEl ? modEl.value.trim() : "";
        
        if(!nome) { Utils.showToast("Preencha o nome do Item/Tema!", "warning"); return; }

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
              if (nomeEl) nomeEl.value = "";
              if (qtdEl) qtdEl.value = "1";
              if (modEl) modEl.value = "";
              if (fileInput) fileInput.value = "";
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
            Utils.showToast("Erro ao ler imagem.", "warning");
            processarSalvar("");
          };
          reader.readAsDataURL(fileInput.files[0]);
        } else {
          processarSalvar("");
        }
      };
    }

    // ============================================================
    // CATEGORIAS
    // ============================================================
    var btnAdicionarCategoria = document.getElementById("btn-adicionar-categoria");
    if (btnAdicionarCategoria) {
      btnAdicionarCategoria.onclick = function(e) {
        e.preventDefault();
        var input = document.getElementById("input-nova-categoria");
        var nome = input ? input.value.trim() : "";
        if (nome) {
          LoadingOverlay.mostrar('⏳ Adicionando Categoria...', 'Categoria: ' + nome);
          window.adicionarCategoria(nome).then(function() {
            if (input) { input.value = ""; input.focus(); }
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

    var btnRemoverCategoria = document.getElementById("btn-remover-categoria");
    if (btnRemoverCategoria) {
      btnRemoverCategoria.onclick = function(e) {
        e.preventDefault();
        var select = document.getElementById("select-remover-categoria");
        var categoria = select ? select.value : "";
        if (categoria) {
          LoadingOverlay.mostrar('⏳ Removendo Categoria...', 'Categoria: ' + categoria);
          window.removerCategoria(categoria).then(function() {}).catch(function() { LoadingOverlay.esconder(); });
        } else {
          Utils.showToast("Selecione uma categoria para remover!", "warning");
        }
      };
    }

    // ============================================================
    // REMOVER TEMA
    // ============================================================
    var btnRemoverTema = document.getElementById("btn-remover-tema-admin");
    if (btnRemoverTema) {
      btnRemoverTema.onclick = function(e) {
        e.preventDefault();
        var select = document.getElementById("select-remover-tema");
        if (!select) return;
        var valorSelecionado = select.value;
        var infoDiv = document.getElementById("info-tema-remover");
        
        if (!valorSelecionado) { Utils.showToast("Selecione um tema válido!", "warning"); return; }
        
        var temaNome = null;
        var chaveParaRemover = null;
        
        for (var k in State.estoque) {
          if (!State.estoque.hasOwnProperty(k)) continue;
          var item = State.estoque[k];
          if (k === valorSelecionado || (item && item.idFirebase === valorSelecionado)) {
            temaNome = (item && item.nome) ? item.nome : k;
            chaveParaRemover = k;
            break;
          }
        }
        
        if (!temaNome && !isNaN(parseInt(valorSelecionado))) {
          var idx = parseInt(valorSelecionado);
          var chaves = Object.keys(State.estoque);
          if (chaves[idx]) {
            chaveParaRemover = chaves[idx];
            var it = State.estoque[chaveParaRemover];
            temaNome = (it && it.nome) ? it.nome : chaveParaRemover;
          }
        }
        
        if (!temaNome) { Utils.showToast("Tema não localizado.", "error"); return; }
        
        if (confirm("Deseja realmente remover \"" + temaNome + "\"?")) {
          LoadingOverlay.mostrar('⏳ Removendo Tema...', 'Tema: ' + temaNome);
          Database.excluirTemaNuvem(chaveParaRemover).then(function() {
            if (infoDiv) {
              infoDiv.innerHTML = '<span style="color:var(--success);">✅ Tema removido!</span>';
              setTimeout(function() { infoDiv.innerHTML = ''; }, 3000);
            }
          }).catch(function() { LoadingOverlay.esconder(); });
        }
      };
    }

    // ============================================================
    // BOTÕES DE KIT — seleção real e persistida
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
      };
    });

    // ============================================================
    // CHECKBOX "MONTAR NO LOCAL"
    // ============================================================
    var chkMontar = document.getElementById("chk-montar-local");
    if (chkMontar) {
      chkMontar.onchange = function() {
        State.montarNoLocal = !!chkMontar.checked;
        var painel = document.getElementById("painel-montagem-local") || document.getElementById("painel-perguntas-montar-local");
        if (painel) painel.style.display = chkMontar.checked ? "block" : "none";
        Utils.showToast(chkMontar.checked ? "Montagem no local ativada." : "Montagem no local desativada.", "info");
      };
    }

    // ============================================================
    // CALCULADORA DE FRETE — liga aos inputs
    // ============================================================
    var kmEl = document.getElementById('calc-km') || document.getElementById('frete-km');
    var precoEl = document.getElementById('calc-valor-litro') || document.getElementById('frete-valor-litro');
    if (kmEl) { kmEl.oninput = function() { FreteCalc.renderizar(); }; kmEl.onchange = function() { FreteCalc.renderizar(); }; }
    if (precoEl) { precoEl.oninput = function() { FreteCalc.renderizar(); }; precoEl.onchange = function() { FreteCalc.renderizar(); }; }
    
    // Recalcula o total quando alterar valor da festa ou sinal
    var inputValorFesta = document.getElementById('valor-festa');
    if (inputValorFesta) {
      inputValorFesta.oninput = function() { FreteCalc.renderizar(); };
    }
    var inputSinal = document.getElementById('valor-sinal');
    if (inputSinal) {
      inputSinal.oninput = function() { FreteCalc.renderizar(); };
    }

    // ============================================================
    // BUSCAS
    // ============================================================
    var inputBuscaReserva = document.getElementById("busca-reserva");
    if (inputBuscaReserva) inputBuscaReserva.oninput = function(e) { self.renderReservas(e.target.value); };

    var btnAbrirCatalogo = document.getElementById("btn-abrir-catalogo-temas") || document.getElementById("btn-abrir-catalogo") || document.getElementById("btn-ver-catalogo");
    if(btnAbrirCatalogo) {
      btnAbrirCatalogo.onclick = function(e) {
        if(e) e.preventDefault();
        var setor = document.getElementById("painel-catalogo-temas");
        if(setor) {
          setor.style.display = (setor.style.display === "none" || setor.style.display === "") ? "block" : "none";
          self.renderCatalogo();
          self.renderTabelaTemasGerenciados();
        }
      };
    }

    var inputBuscaCatalogo = document.getElementById("busca-catalogo");
    if (inputBuscaCatalogo) inputBuscaCatalogo.oninput = function(e) { self.renderCatalogo(e.target.value); };

    var inputBuscaTemaFicha = document.getElementById("filtro-tema-input") || document.getElementById("busca-tema-input");
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
    // VENDA MENSAL & ANUAL
    // ============================================================
    var btnCentral = document.getElementById("btn-abrir-central-relatorios");
    if (btnCentral) {
      btnCentral.onclick = function(e) {
        e.preventDefault();
        var p = document.getElementById("secao-central-relatorios");
        if (p) {
          var abrindo = (p.style.display === "none" || p.style.display === "");
          p.style.display = abrindo ? "block" : "none";
          if (abrindo) {
            self.renderPlanilhaVendas();
            self.renderGraficoAnual();
          }
        }
      };
    }
    var btnFecharCentral = document.getElementById("btn-fechar-central-relatorios");
    if (btnFecharCentral) btnFecharCentral.onclick = function(e) { e.preventDefault(); var p = document.getElementById("secao-central-relatorios"); if (p) p.style.display = "none"; };

    // ============================================================
    // REUNIÕES
    // ============================================================
    var btnReunioes = document.getElementById("btn-abrir-reunioes-painel");
    if (btnReunioes) {
      btnReunioes.onclick = function(e) {
        e.preventDefault();
        var p = document.getElementById("painel-reunioes-exclusivo");
        if (p) {
          var abrindo = (p.style.display === "none" || p.style.display === "");
          p.style.display = abrindo ? "block" : "none";
          if (abrindo) self.iniciarPainelReunioes();
        }
      };
    }
    var btnFecharReunioes = document.getElementById("btn-fechar-reunioes");
    if (btnFecharReunioes) btnFecharReunioes.onclick = function(e) { e.preventDefault(); var p = document.getElementById("painel-reunioes-exclusivo"); if (p) p.style.display = "none"; };
    
    var btnSalvarReuniao = document.getElementById("btn-salvar-reuniao-avulsa");
    if (btnSalvarReuniao) {
      btnSalvarReuniao.onclick = function(e) {
        e.preventDefault();
        var clienteEl = document.getElementById("reuniao-cliente");
        var dataHoraEl = document.getElementById("reuniao-data-hora");
        var pautaEl = document.getElementById("reuniao-pauta");
        var cliente = clienteEl ? clienteEl.value.trim() : "";
        var dataHora = dataHoraEl ? dataHoraEl.value : "";
        var pauta = pautaEl ? pautaEl.value.trim() : "";
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
          if (clienteEl) clienteEl.value = "";
          if (dataHoraEl) dataHoraEl.value = "";
          if (pautaEl) pautaEl.value = "";
        }).catch(function(err) {
          LoadingOverlay.esconder();
          Utils.showToast("Erro ao agendar reunião.", "error");
        });
      };
    }

    // ============================================================
    // GERADOR DE CONTRATO
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
      btnFecharGerador.onclick = function(e) { e.preventDefault(); modalContrato.classList.remove("ativo"); };
    }
    if (modalContrato) {
      modalContrato.addEventListener('click', function(e) {
        if (e.target === modalContrato) modalContrato.classList.remove("ativo");
      });
    }
    
    // Botões de gerar contrato
    var btnSalvarContrato = document.getElementById("btn-gerar-salvar-contrato");
    if (btnSalvarContrato) btnSalvarContrato.onclick = function(e) { e.preventDefault(); self.gerarContrato(false); };
    var btnPdfContrato = document.getElementById("btn-gerar-pdf-contrato");
    if (btnPdfContrato) btnPdfContrato.onclick = function(e) { e.preventDefault(); self.gerarContrato(true); };

    // Modais de visualização
    var modalVis = document.getElementById("modal-visualizar-contrato");
    if (modalVis) {
      var btnFecharVis = document.getElementById("btn-fechar-visualizacao");
      if (btnFecharVis) btnFecharVis.onclick = function() { modalVis.classList.remove("ativo"); };
      modalVis.addEventListener('click', function(e) {
        if (e.target === modalVis) modalVis.classList.remove("ativo");
      });
      var btnBaixarPdf = document.getElementById("btn-baixar-pdf-contrato");
      if (btnBaixarPdf) btnBaixarPdf.onclick = function() { self.gerarContratoPDF(); };
      var btnImprimir = document.getElementById("btn-imprimir-contrato");
      if (btnImprimir) btnImprimir.onclick = function() { window.print(); };
    }
  },
  
  // ============================================================
  // PAINEL DE REUNIÕES
  // ============================================================
  iniciarPainelReunioes: function() {
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
  // PLANILHA DE VENDAS
  // ============================================================
  renderPlanilhaVendas: function() {
    var tbody = document.querySelector("#tabela-planilha-corpo tbody");
    if (!tbody) return;
    var mesSelecionado = (document.getElementById("seletor-mes-planilha") || {}).value || "";
    var nomesMeses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    
    var reservasDoMes = State.reservas.filter(function(r) {
      if (!r.data) return false;
      var partes = r.data.split("-");
      if (partes.length !== 3) return false;
      var mesIdx = parseInt(partes[1]) - 1;
      return nomesMeses[mesIdx] === mesSelecionado;
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
  // GRÁFICO ANUAL
  // ============================================================
  renderGraficoAnual: function() {
    if (typeof Chart === 'undefined') return;
    var painel = document.getElementById('painel-grafico-faturamento');
    if (painel) painel.style.display = 'block';
    var ctx = document.getElementById('graficoAnual');
    if (!ctx) return;
    if (window.chartInstance) window.chartInstance.destroy();
    
    var meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    var valores = new Array(12).fill(0);
    State.reservas.forEach(function(r) {
      if (!r.data) return;
      var p = r.data.split("-");
      if (p.length !== 3) return;
      var idx = parseInt(p[1]) - 1;
      if (idx >= 0 && idx < 12) {
        valores[idx] += (parseFloat(r.total) || 0) + (parseFloat(r.frete) || 0);
      }
    });
    
    window.chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: meses,
        datasets: [{ label: 'Faturamento (R$)', data: valores, backgroundColor: '#a3536a' }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  },
  
  // ============================================================
  // CONTRATO — busca de tema
  // ============================================================
  bindBuscaTemaContrato: function() {
    var self = this;
    var campoLocal = document.getElementById("c-local");
    if (!campoLocal) return;
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
    
    if (campoLocal.parentNode && campoLocal.parentNode.parentNode) {
      campoLocal.parentNode.parentNode.insertBefore(wrapper, campoLocal.parentNode.nextSibling);
    }
    
    var inputBusca = document.getElementById("contrato-tema-busca");
    var caixaSug = document.getElementById("contrato-tema-sugestoes");
    var inputHidden = document.getElementById("contrato-tema-selecionado");
    
    if (inputBusca) {
      inputBusca.oninput = function(e) {
        var termo = e.target.value.trim();
        if (!termo) { if (caixaSug) caixaSug.style.display = "none"; return; }
        var normalizar = function(s) {
          return (s || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
  
  popularSelectPecasContrato: function(temaSelecionado) {
    var selectPecas = document.getElementById("c-pecas");
    if (!selectPecas) return;
    var tema = temaSelecionado || (document.getElementById("contrato-tema-selecionado") || {}).value || "";
    selectPecas.innerHTML = "";
    
    if (!tema) {
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
    
    var infoTema = State.estoque[tema];
    var categoriaTema = infoTema && infoTema.categoria ? infoTema.categoria : "";
    var pecasDoTema = [];
    
    Object.keys(State.estoque).forEach(function(chave) {
      var item = State.estoque[chave];
      if (!item) return;
      var nome = item.nome || chave;
      if (nome === tema || chave === tema) {
        pecasDoTema.push({ nome: nome, item: item });
      } else if (categoriaTema && item.categoria === categoriaTema) {
        pecasDoTema.push({ nome: nome, item: item });
      }
    });
    
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

  // ============================================================
  // CATEGORIAS — renderização correta
  // ============================================================
  atualizarSeletoresCategoria: function(categorias) {
    if (!categorias) categorias = [];
    
    var selectCat = document.getElementById("catalogo-peca-categoria");
    if (selectCat) {
      var valorAtual = selectCat.value;
      selectCat.innerHTML = '';
      categorias.forEach(function(cat) {
        var opt = document.createElement("option");
        opt.value = cat; opt.textContent = cat;
        selectCat.appendChild(opt);
      });
      if (categorias.indexOf(valorAtual) !== -1) selectCat.value = valorAtual;
    }
    
    var selectRemover = document.getElementById("select-remover-categoria");
    if (selectRemover) {
      var valorAtual2 = selectRemover.value;
      selectRemover.innerHTML = '<option value="">Selecione...</option>';
      categorias.forEach(function(cat) {
        var opt = document.createElement("option");
        opt.value = cat; opt.textContent = cat;
        selectRemover.appendChild(opt);
      });
      if (categorias.indexOf(valorAtual2) !== -1) selectRemover.value = valorAtual2;
    }
    
    var container = document.getElementById("lista-categorias-admin");
    if (container) {
      container.innerHTML = '';
      categorias.forEach(function(cat) {
        var div = document.createElement("div");
        div.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:4px 10px; background:#f8f0f2; border-radius:6px; border:1px solid #e1cbd4;";
        div.innerHTML = '<span style="font-size:13px;">📁 ' + cat + '</span>' +
          '<button type="button" onclick="window.removerCategoria(\'' + cat.replace(/'/g, "\\'") + '\')" class="btn btn-danger" style="padding:2px 8px; font-size:10px; width:auto; margin-left:6px;">✕</button>';
        container.appendChild(div);
      });
    }
    
    var contador = document.getElementById("contador-categorias");
    if (contador) contador.textContent = categorias.length;
  },

  // ============================================================
  // SALVAR FESTA — inclui kit, montagem e frete
  // ============================================================
  handleSalvarFesta: function() {
    var elCliente = document.getElementById("nome-cliente");
    var elData = document.getElementById("data");
    var elTotal = document.getElementById("valor-total");
    var elSinal = document.getElementById("valor-sinal");
    var elObs = document.getElementById("adicionais-festa");
    var elValorFesta = document.getElementById("valor-festa");

    var cliente = elCliente ? elCliente.value.trim() : "";
    var data = elData ? elData.value : "";
    var total = elTotal ? elTotal.value || "0" : "0";
    var sinal = elSinal ? elSinal.value || "0" : "0";
    var obs = elObs ? elObs.value.trim() : "";
    var valorFesta = elValorFesta ? (parseFloat(elValorFesta.value) || 0) : 0;
    
    var inputTemaHidden = document.getElementById("busca-tema-input");
    var inputTemaFiltro = document.getElementById("filtro-tema-input");
    if (inputTemaHidden && inputTemaHidden.value.trim()) State.temaAtual = inputTemaHidden.value.trim();
    else if (inputTemaFiltro && inputTemaFiltro.value.trim()) State.temaAtual = inputTemaFiltro.value.trim();

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
      if (res && res.tema && res.tema.toLowerCase().trim() === temaBuscaNormalizado) reservasAtivas++;
    });

    var livres = kitsCadastrados - reservasAtivas;
    if (livres <= 0 && kitsCadastrados > 0) {
      Utils.showToast("🚨 Indisponível! \"" + State.temaAtual + "\" sem kits livres.", "error");
      return;
    }
    
    // Coleta dados do frete atual
    var f = FreteCalc.calcular();
    
    Database.salvarReservaNuvem({
      cliente: cliente,
      data: data,
      tema: nomeRealChave || State.temaAtual,
      kit: State.kitAtual,
      montarNoLocal: !!State.montarNoLocal,
      total: total,
      sinal: sinal,
      valorFesta: valorFesta,
      // Campos de frete completos
      frete: f.freteTotal,
      freteKm: f.km,
      fretePrecoCombustivel: f.precoCombustivel,
      freteLitros: f.litros,
      freteCustoCombustivel: f.custoCombustivel,
      freteManutencao: f.manutencao,
      freteTotal: f.freteTotal,
      obs: obs,
      dataCriacao: Utils.getHojeDataString()
    }).then(function(sucesso) {
      if(sucesso) {
        if(elCliente) elCliente.value = "";
        if(elData) elData.value = "";
        if(elTotal) elTotal.value = "";
        if(elSinal) elSinal.value = "";
        if(elObs) elObs.value = "";
        if(elValorFesta) elValorFesta.value = "0.00";
        
        State.temaAtual = "";
        State.kitAtual = "";
        State.montarNoLocal = false;
        
        if(inputTemaHidden) inputTemaHidden.value = "";
        if(inputTemaFiltro) inputTemaFiltro.value = "";
        document.querySelectorAll('.btn-kit-opcao').forEach(function(b) { b.classList.remove('ativo'); });
        var painelMontagem = document.getElementById("painel-montagem-local") || document.getElementById("painel-perguntas-montar-local");
        if (painelMontagem) painelMontagem.style.display = "none";
        var chk = document.getElementById("chk-montar-local");
        if (chk) chk.checked = false;
        
        FreteCalc.limpar();
      }
    });
  },

  acaoSalvarOrcamentoCorrente: function() {
    var clienteEl = document.getElementById("nome-cliente");
    var totalEl = document.getElementById("valor-total");
    var dataEl = document.getElementById("data");
    var obsEl = document.getElementById("adicionais-festa");
    var valorFestaEl = document.getElementById("valor-festa");

    var nomeCliente = clienteEl ? clienteEl.value.trim() : "";
    var valorTotal = totalEl ? totalEl.value.trim() : "0";
    var dataReserva = dataEl ? dataEl.value : "";
    var obs = obsEl ? obsEl.value.trim() : "";
    var valorFesta = valorFestaEl ? (parseFloat(valorFestaEl.value) || 0) : 0;
    
    if(!nomeCliente) return Utils.showToast("Preencha o nome do cliente para salvar o orçamento.", "warning");
    
    var f = FreteCalc.calcular();
    
    Database.salvarOrcamentoNuvem({
      cliente: nomeCliente,
      tema: State.temaAtual || "Não selecionado",
      kit: State.kitAtual || "",
      montarNoLocal: !!State.montarNoLocal,
      total: valorTotal,
      valorFesta: valorFesta,
      frete: f.freteTotal,
      freteKm: f.km,
      fretePrecoCombustivel: f.precoCombustivel,
      freteLitros: f.litros,
      freteCustoCombustivel: f.custoCombustivel,
      freteManutencao: f.manutencao,
      freteTotal: f.freteTotal,
      dataFesta: dataReserva,
      obs: obs,
      dataCriacao: Utils.getHojeDataString(),
      horaCriacao: Utils.getHoraString()
    });
  },

  handleLogin: function() {
    var emailEl = document.getElementById("email");
    var senhaEl = document.getElementById("senha");
    var email = emailEl ? emailEl.value.trim() : "";
    var senha = senhaEl ? senhaEl.value : "";
    if (!email || !senha) { Utils.showToast("Preencha e-mail e senha.", "warning"); return; }
    if (CONFIG.usuarios[email] === senha) {
      State.usuarioLogadoEmail = email;
      var secLogin = document.getElementById("secao-login");
      var secVerif = document.getElementById("secao-verificador");
      if (secLogin) secLogin.style.display = "none";
      if (secVerif) secVerif.style.display = "block";
      var nomeUsuario = document.getElementById("nome-usuario");
      if (nomeUsuario) nomeUsuario.innerHTML = "👤 <b>" + email.split('@')[0] + "</b>";
      Utils.showToast("Login realizado!", "success");
      try { Database.listenPontoUsuario(); } catch (e) { console.warn(e); }
    } else {
      Utils.showToast("E-mail ou senha incorretos.", "error");
    }
  },
  
  handleLogout: function() { window.location.reload(); },

  toggleRelatorioPontos: function() {
    var p = document.getElementById("painel-relatorio-pontos-geral");
    if(p) p.style.display = p.style.display === "none" ? "block" : "none";
  },
  
  toggleOrcamentos: function() {
    var p = document.getElementById("painel-orcamentos-salvos") || document.getElementById("card-orcamentos-integrado");
    if (p) {
      var displayAtual = window.getComputedStyle(p).display;
      var abrindo = (displayAtual === "none");
      p.style.display = abrindo ? "block" : "none";
      if (abrindo) this.renderOrcamentos();
    }
  },

  handleEditorBusca: function(termo) {
    // reservado para editor (não usado atualmente no HTML)
  },

  // ============================================================
  // SUGESTÕES DE TEMA (busca tolerante)
  // ============================================================
  renderSuggestions: function(termo) {
    var caixa = document.getElementById("wrapper-lista-sugestoes");
    if(!caixa) return;
    termo = (termo || "").toString();
    if(!termo.trim()) { caixa.style.display = "none"; caixa.innerHTML = ""; return; }

    var normalizar = function(s) {
      return (s || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };
    var termoNorm = normalizar(termo.trim());
    var filtrados = Object.keys(State.estoque).filter(function(t) {
      return normalizar(t).indexOf(termoNorm) !== -1;
    });
    caixa.innerHTML = "";
    if (filtrados.length === 0) { caixa.style.display = "none"; return; }

    filtrados.forEach(function(tema) {
      var objTema = State.estoque[tema] || {};
      var item = document.createElement("div");
      item.className = "sugestao-item";
      var kitsCadastrados = objTema.kits ? (parseInt(objTema.kits) || 0) : (parseInt(objTema.quantidade) || 0);
      var reservasAtivas = 0;
      State.reservas.forEach(function(res) {
        if (res && res.tema && res.tema.toLowerCase().trim() === tema.toLowerCase().trim()) reservasAtivas++;
      });
      var livres = kitsCadastrados - reservasAtivas;
      if (livres <= 0 && kitsCadastrados > 0) {
        item.innerHTML = "⚙️ " + tema + " <span style='color:var(--error);font-weight:bold;'>(INDISPONÍVEL)</span>";
      } else {
        item.innerHTML = "⚙️ " + tema + (kitsCadastrados > 0 ? " (Livre: " + livres + "/" + kitsCadastrados + ")" : "");
      }
      item.onclick = function() {
        if (livres <= 0 && kitsCadastrados > 0) {
          Utils.showToast("Tema indisponível no estoque!", "error");
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
      container.innerHTML = "<div style='text-align:center; padding:20px; color:#777;'>Nenhum tema disponível.</div>";
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
        if (res && res.tema && res.tema.toLowerCase().trim() === nomeTema.toLowerCase().trim()) reservasAtivas++;
      });
      var livres = kitsCadastrados - reservasAtivas;
      var statusEstoque = livres > 0 
        ? "<span style='color:var(--success); font-size:0.85em;'>🟢 " + livres + " livres</span>" 
        : "<span style='color:var(--error); font-size:0.85em;'>🔴 Indisponível</span>";
      card.innerHTML = '<img src="' + fotoUrl + '" style="width:100%;height:140px;object-fit:cover;border-radius:6px 6px 0 0;" onerror="this.src=\'https://placehold.co/200x150?text=Erro+Foto\'">' +
      '<div style="padding: 10px;">' +
        '<h4 style="margin:0 0 5px 0; color:var(--primary); font-size:1.1em;">' + nomeTema + '</h4>' +
        '<p style="margin:0; font-size:0.9em; color:#555;">Kits totais: <b>' + kitsCadastrados + '</b></p>' +
        '<div style="margin-top:5px;">' + statusEstoque + '</div>' +
      '</div>';
      container.appendChild(card);
    });
  },
  
  renderTabelaTemasGerenciados: function() {
    var corpo = document.getElementById("lista-temas-gerenciados-corpo");
    if (!corpo) return;
    var chaves = Object.keys(State.estoque);
    if (chaves.length === 0) {
      corpo.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#999; padding:15px;">Nenhum tema cadastrado.</td></tr>';
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
    var selectRemover = document.getElementById("select-remover-tema");
    if (selectRemover) {
      var valorAtual = selectRemover.value;
      selectRemover.innerHTML = '<option value="">Selecione um tema para remover...</option>';
      Object.keys(State.estoque).forEach(function(chave) {
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

  resetEditor: function() {},

  // ============================================================
  // RENDER RESERVAS
  // ============================================================
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

      // Detalhes do frete (se existirem)
      var freteDetalhes = "";
      if (res.freteKm) {
        freteDetalhes = '<p style="font-size:11px;color:#666;">🚗 ' + res.freteKm + 'km × R$' + 
          (parseFloat(res.fretePrecoCombustivel) || 0).toFixed(2) + 
          ' → ' + (parseFloat(res.freteLitros) || 0).toFixed(2) + 'L → R$ ' + 
          (parseFloat(res.freteCustoCombustivel) || 0).toFixed(2) + 
          ' + manut. R$ ' + (parseFloat(res.freteManutencao) || 0).toFixed(2) + '</p>';
      }

      card.innerHTML = '<div class="reserva-header">' +
        '<strong>👶 ' + res.cliente + '</strong>' +
        '<span class="reserva-badge" style="background:' + (quitado ? '#27ae60' : '#e67e22') + ';">' + (quitado ? 'PAGO 100%' : 'PENDENTE') + '</span>' +
      '</div>' +
      '<div class="reserva-body">' +
        '<p>📅 Data: <b>' + Utils.formatDateBR(res.data) + '</b></p>' +
        '<p>🎨 Tema: <b style="color:var(--primary);">' + res.tema + '</b></p>' +
        '<p>🛍️ Modelo: <b>' + (res.kit || 'Não informado') + '</b></p>' + 
        (res.montarNoLocal ? '<p>🛠️ Montagem no local: <b style="color:#27ae60;">SIM</b></p>' : '') +
        imgTemaHTML +
        '<p>🚚 Frete: <b>' + Utils.formatCurrency(frete) + '</b></p>' +
        freteDetalhes +
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
  // RENDER ORÇAMENTOS — sempre que listener atualiza
  // ============================================================
  renderOrcamentos: function() {
    var containers = [
      document.getElementById("lista-orcamentos-render"),
      document.getElementById("orcamentos-render"),
      document.getElementById("lista-orcamentos-interno-corpo")
    ].filter(Boolean);
    
    if (containers.length === 0) return;

    containers.forEach(function(container) {
      container.innerHTML = "";
      if (State.orcamentos.length === 0) {
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
            '</td></tr>';
        } else {
          html += '<div class="card-reserva"><div class="reserva-header"><strong>👤 ' + (orc.cliente || '') + '</strong></div>' +
            '<div class="reserva-body">' +
            '<p>📅 Data da Festa: <b>' + Utils.formatDateBR(orc.dataFesta) + '</b></p>' +
            '<p>🎨 Tema: <b>' + (orc.tema || '') + '</b></p>' +
            (orc.kit ? '<p>🛍️ Kit: <b>' + orc.kit + '</b></p>' : '') +
            (orc.montarNoLocal ? '<p>🛠️ Montagem no local: <b>SIM</b></p>' : '') +
            '<p>💰 Total Estimado: <b>' + totalFmt + '</b></p>' +
            (orc.freteTotal ? '<p>🚚 Frete: <b>' + Utils.formatCurrency(orc.freteTotal) + '</b></p>' : '') +
            (orc.obs ? '<p>📝 Obs: ' + orc.obs + '</p>' : '') +
            '</div></div>';
        }
      });
      container.innerHTML = html;
    });
  },

  renderRelatorioGeralPontos: function(dadosPontos) {
    var container = document.querySelector("#lista-pontos-geral-corpo");
    if (!container) return;
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
            html += '<tr><td>' + usuario.replace(/_/g, ".") + '</td>' +
              '<td>' + Utils.formatDateBR(dia) + '</td>' +
              '<td style="color:var(--success);">' + (p.entrada || "--:--") + '</td>' +
              '<td style="color:var(--error);">' + (p.saida || "--:--") + '</td></tr>';
          }
        }
      }
    }
    if (!temAlgo) {
      container.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#999;">Nenhum ponto registrado.</td></tr>';
    } else {
      container.innerHTML = html;
    }
  },
  
  // ============================================================
  // GERADOR DE CONTRATO — gera HTML e envia para o modal
  // ============================================================
  gerarContrato: function(gerarPdf) {
    var nome = (document.getElementById("c-nome") || {}).value || "";
    var cpf = (document.getElementById("c-cpf") || {}).value || "";
    var data = (document.getElementById("c-data") || {}).value || "";
    var horario = (document.getElementById("c-horario") || {}).value || "";
    var valor = parseFloat((document.getElementById("c-valor") || {}).value) || 0;
    var endereco = (document.getElementById("c-endereco") || {}).value || "";
    var telefone = (document.getElementById("c-telefone") || {}).value || "";
    var local = (document.getElementById("c-local") || {}).value || "";
    var modelo = (document.getElementById("c-modelo") || {}).value || "com-frete";
    var obs = (document.getElementById("c-obs") || {}).value || "";
    
    // Tema selecionado (se houver)
    var tema = (document.getElementById("contrato-tema-selecionado") || {}).value || "";
    
    // Peças selecionadas
    var selectPecas = document.getElementById("c-pecas");
    var pecasSelecionadas = [];
    if (selectPecas) {
      for (var i = 0; i < selectPecas.options.length; i++) {
        if (selectPecas.options[i].selected) pecasSelecionadas.push(selectPecas.options[i].value);
      }
    }
    
    // Itens adicionais
    var extras = [];
    ['c-porcelanas','c-bolos','c-decoracao','c-outros'].forEach(function(id) {
      var sel = document.getElementById(id);
      if (!sel) return;
      for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].selected) extras.push(sel.options[i].value);
      }
    });
    
    var dadosContrato = {
      nome: nome,
      cpf: cpf,
      data: data,
      horario: horario,
      valor: valor,
      endereco: endereco,
      telefone: telefone,
      local: local,
      modelo: modelo,
      tema: tema,
      pecas: pecasSelecionadas,
      extras: extras,
      obs: obs,
      criadoEm: Date.now()
    };
    
    // Validação mínima
    if (!nome.trim()) {
      Utils.showToast("Preencha o nome do contratante!", "warning");
      return;
    }
    
    // Gera o HTML do contrato
    var dataFmt = data ? data.split("-").reverse().join("/") : "____/____/______";
    var valorFmt = valor ? valor.toFixed(2).replace('.', ',') : "______,____";
    var pecasTexto = pecasSelecionadas.length > 0 ? pecasSelecionadas.join(", ") : "__________________________________";
    var extrasTexto = extras.length > 0 ? extras.join(", ") : "";
    var dataAtual = new Date().toLocaleDateString('pt-BR');
    
    var html = '<div class="pagina-contrato">' +
      '<div class="logo-container"><img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT2qBAlvPlxMFaok_zho9se2IT9smgKtY9Dvg&s" class="logo-contrato"></div>' +
      '<div class="titulo-contrato">CONTRATO DE PRESTAÇÃO DE SERVIÇOS PARA LOCAÇÃO</div>' +
      '<div class="dados-contratada"><span class="negrito">CONTRATADA:</span> TRALALÁ DECORAÇÕES DE FESTAS</div>' +
      '<div class="dados-contratante"><span class="negrito">CONTRATANTE:</span> ' + (nome || "_________________________") + '</div>' +
      '<div class="dados-contratante"><span class="negrito">CPF:</span> ' + (cpf || "_________________________") + '</div>' +
      '<div class="dados-contratante"><span class="negrito">TELEFONE:</span> ' + (telefone || "_________________________") + '</div>' +
      '<div class="dados-contratante"><span class="negrito">ENDEREÇO:</span> ' + (endereco || "_________________________") + '</div>' +
      '<div class="dados-contratante"><span class="negrito">LOCAL DO EVENTO:</span> ' + (local || "_________________________") + '</div>' +
      '<div class="dados-contratante"><span class="negrito">DATA DO EVENTO:</span> ' + dataFmt + (horario ? ' às ' + horario : '') + '</div>' +
      '<br>' +
      '<div class="clausula-titulo">DO OBJETO DO CONTRATO</div>' +
      '<div class="clausula-texto"><span class="negrito">Cláusula 1ª.</span> A CONTRATADA locará para o CONTRATANTE os seguintes itens' +
      (tema ? ' do tema <b>' + tema + '</b>' : '') + ': ' + pecasTexto + '.</div>' +
      (extrasTexto ? '<div class="clausula-texto"><span class="negrito">Itens adicionais:</span> ' + extrasTexto + '</div>' : '') +
      '<div class="clausula-titulo">VALORES E PAGAMENTO</div>' +
      '<div class="clausula-texto">O valor total da locação é de R$ ' + valorFmt + '.</div>' +
      (obs ? '<div class="clausula-texto"><span class="negrito">Observações:</span> ' + obs + '</div>' : '') +
      '<br>' +
      '<div style="text-align: center;">Brasília-DF, ' + dataAtual + '.</div>' +
      '<div class="assinatura">' +
        '<div class="linha-assinatura"></div>' +
        '<div class="assinatura-nome">' + (nome || "CONTRATANTE") + '</div>' +
      '</div>' +
      '<div class="assinatura">' +
        '<div class="linha-assinatura"></div>' +
        '<div class="assinatura-nome">TRALALÁ DECORAÇÕES DE FESTAS</div>' +
      '</div>' +
    '</div>';
    
    // Salva no Firebase
    Database.salvarContratoNuvem(dadosContrato).catch(function(err) {
      console.warn("Contrato não salvo:", err);
    });
    
    // Joga no modal de visualização
    var preview = document.getElementById("contrato-preview-content");
    if (preview) preview.innerHTML = html;
    var modalVis = document.getElementById("modal-visualizar-contrato");
    if (modalVis) modalVis.classList.add("ativo");
    
    if (gerarPdf) {
      setTimeout(function() { UI.gerarContratoPDF(); }, 300);
    } else {
      Utils.showToast("Contrato gerado com sucesso!", "success");
    }
  },
  
  gerarContratoPDF: function() {
    var elemento = document.getElementById("contrato-preview-content");
    if (!elemento) return;
    if (typeof html2pdf === 'undefined') {
      alert("Biblioteca de PDF não carregada. Use o botão Imprimir.");
      return;
    }
    var nome = (document.getElementById("c-nome") || {}).value || "contrato";
    html2pdf().from(elemento).set({
      margin: 0,
      filename: 'contrato-' + nome.replace(/\s+/g, '-').toLowerCase() + '.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).save().then(function() {
      Utils.showToast("PDF baixado!", "success");
    }).catch(function(err) {
      console.error("Erro PDF:", err);
      Utils.showToast("Erro ao gerar PDF. Use Imprimir.", "error");
    });
  }
};

// ============================================================
// FUNÇÕES GLOBAIS DE EXCLUSÃO
// ============================================================
window.DeletarReserva = function(idReserva) {
  if (confirm("Tem certeza que deseja excluir este agendamento?")) {
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
  var elCliente = document.getElementById("nome-cliente");
  var elData = document.getElementById("data");
  var elTotal = document.getElementById("valor-total");
  var elValorFesta = document.getElementById("valor-festa");
  var elObs = document.getElementById("adicionais-festa");
  var inputTemaHidden = document.getElementById("busca-tema-input");
  var inputTemaFiltro = document.getElementById("filtro-tema-input");
  
  if (elCliente) elCliente.value = orc.cliente || "";
  if (elData && orc.dataFesta) elData.value = orc.dataFesta;
  if (elTotal) elTotal.value = orc.total || "";
  if (elValorFesta) elValorFesta.value = orc.valorFesta || "";
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
  if (orc.montarNoLocal !== undefined) {
    State.montarNoLocal = !!orc.montarNoLocal;
    var chk = document.getElementById("chk-montar-local");
    if (chk) {
      chk.checked = State.montarNoLocal;
      var painel = document.getElementById("painel-montagem-local");
      if (painel) painel.style.display = State.montarNoLocal ? "block" : "none";
    }
  }
  
  // Preenche frete se tiver
  if (orc.freteKm) {
    var kmEl = document.getElementById("calc-km");
    var precoEl = document.getElementById("calc-valor-litro");
    if (kmEl) kmEl.value = orc.freteKm;
    if (precoEl && orc.fretePrecoCombustivel) precoEl.value = orc.fretePrecoCombustivel;
    FreteCalc.renderizar();
  }
  
  Utils.showToast("Orçamento carregado no formulário.", "success");
  var painelOrc = document.getElementById("painel-orcamentos-salvos");
  if (painelOrc) painelOrc.style.display = "none";
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.removerTemaPorChave = function(chave) {
  var item = State.estoque[chave];
  if (!item) return;
  var nome = item.nome || chave;
  if (confirm("Deseja realmente remover \"" + nome + "\"?")) {
    LoadingOverlay.mostrar('⏳ Removendo Tema...', 'Tema: ' + nome);
    Database.excluirTemaNuvem(chave).then(function() {}).catch(function() {
      LoadingOverlay.esconder();
    });
  }
};

// ============================================================
// INICIALIZAÇÃO
// ============================================================
function __tralala_inicializar() {
  if (window.__tralala_ui_iniciada) return;
  window.__tralala_ui_iniciada = true;

  if (!State.db && typeof firebase !== 'undefined') {
    try {
      if (!firebase.apps.length) firebase.initializeApp(CONFIG.firebase);
      State.db = firebase.database();
      CatalogoLoader.mostrar('⏳ Carregando catálogo...', 'Buscando dados do servidor');
      Database.listen();
      Database.listenCategorias();
    } catch (e) {
      console.error("Erro init Database:", e);
    }
  }

  try {
    UI.init();
    console.log("✅ UI inicializada com sucesso");
  } catch (e) {
    console.error("❌ Erro ao inicializar UI:", e);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', __tralala_inicializar);
} else {
  __tralala_inicializar();
}

window.addEventListener('load', function() {
  if (!window.__tralala_ui_iniciada) __tralala_inicializar();
});
