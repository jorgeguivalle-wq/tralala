// ============================================================
// SISTEMA PRINCIPAL — Tralalá Festas
// Autoridade única do comportamento do site.
// ============================================================

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
  frete: { km: 0, precoCombustivel: 0, litros: 0, custoCombustivel: 0, manutencao: 0, freteTotal: 0 },
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
  },
  mostrarSucesso: function(mensagem) {
    if (!this.container) return;
    var msgEl = document.getElementById('catalogo-loader-mensagem');
    if (msgEl) { msgEl.textContent = mensagem || '✅ Catálogo carregado!'; msgEl.style.color = '#27ae60'; }
    var subMsgEl = document.getElementById('catalogo-loader-submensagem');
    if (subMsgEl) subMsgEl.textContent = '';
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
    if (msgEl) { msgEl.textContent = mensagem || '⚠️ Não foi possível carregar.'; msgEl.style.color = '#e74c3c'; }
    this.container.style.display = 'block';
  },
  esconder: function() { if (this.container) this.container.style.display = 'none'; }
};

// ============================================================
// UTILS
// ============================================================
var Utils = {
  showToast: function(message, type) {
    if (!type) type = 'info';
    var icone = type === 'success' ? '✅' : (type === 'error' ? '🚨' : '⚠️');
    console.log(icone + " " + message);
    var container = document.getElementById('toast-container');
    if (!container) { if (type === 'error') alert('❌ ' + message); return; }
    var toast = document.createElement('div');
    toast.className = "toast toast-" + type;
    toast.innerHTML = "<span>" + icone + "</span> <span>" + message + "</span>";
    container.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 3500);
  },
  formatCurrency: function(value) {
    var v = parseFloat(value);
    if (isNaN(v) || !isFinite(v)) v = 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  },
  formatDateBR: function(dateString) {
    if (!dateString) return "Não informada";
    var p = String(dateString).split("-");
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
  getHoraString: function() { return new Date().toTimeString().split(' ')[0]; },
  normalizar: function(s) {
    return (s || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
};

// ============================================================
// CALCULADORA DE FRETE
// Fórmula: litros = km/9 ; custo = litros*preco ; manut = custo*0.20 ; total = custo+manut
// ============================================================
var FreteCalc = {
  ler: function() {
    var kmEl = document.getElementById('calc-km');
    var precoEl = document.getElementById('calc-valor-litro');
    var km = kmEl ? parseFloat(kmEl.value) : 0;
    var preco = precoEl ? parseFloat(precoEl.value) : 0;
    if (isNaN(km) || km < 0 || !isFinite(km)) km = 0;
    if (isNaN(preco) || preco < 0 || !isFinite(preco)) preco = 0;
    return { km: km, preco: preco };
  },
  calcular: function() {
    var e = this.ler();
    var litros = e.km / CONFIG.frete.consumoKmPorLitro;
    var custoCombustivel = litros * e.preco;
    var manutencao = custoCombustivel * CONFIG.frete.percentualManutencao;
    var freteTotal = custoCombustivel + manutencao;
    if (!isFinite(litros)) litros = 0;
    if (!isFinite(custoCombustivel)) custoCombustivel = 0;
    if (!isFinite(manutencao)) manutencao = 0;
    if (!isFinite(freteTotal)) freteTotal = 0;
    State.frete = {
      km: e.km, precoCombustivel: e.preco, litros: litros,
      custoCombustivel: custoCombustivel, manutencao: manutencao, freteTotal: freteTotal
    };
    return State.frete;
  },
  renderizar: function() {
    var f = this.calcular();
    var txtCombustivel = document.getElementById('calc-total-combustivel');
    var txtManutencao = document.getElementById('calc-manutencao');
    var txtTotal = document.getElementById('calc-cobrar-cliente');
    if (txtCombustivel) txtCombustivel.textContent = "R$ " + f.custoCombustivel.toFixed(2);
    if (txtManutencao) txtManutencao.textContent = "R$ " + f.manutencao.toFixed(2);
    if (txtTotal) txtTotal.textContent = f.freteTotal.toFixed(2);
    var inputFrete = document.getElementById('valor-frete');
    if (inputFrete) inputFrete.value = f.freteTotal.toFixed(2);
    var inputValorFesta = document.getElementById('valor-festa');
    var valorFesta = inputValorFesta ? (parseFloat(inputValorFesta.value) || 0) : 0;
    if (isNaN(valorFesta)) valorFesta = 0;
    var inputTotal = document.getElementById('valor-total');
    if (inputTotal) inputTotal.value = (valorFesta + f.freteTotal).toFixed(2);
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
    var kmEl = document.getElementById('calc-km');
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
      if (CONFIG.temasDefault.hasOwnProperty(key)) State.estoque[key] = CONFIG.temasDefault[key];
    }
    if (typeof firebase !== 'undefined') {
      if (!firebase.apps.length) firebase.initializeApp(CONFIG.firebase);
      State.db = firebase.database();
      CatalogoLoader.mostrar('⏳ Carregando catálogo...', 'Buscando dados do servidor');
      this.listen();
      this.listenCategorias();
    } else {
      Utils.showToast("🚨 Firebase não carregou.", "error");
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
          if (CONFIG.temasDefault.hasOwnProperty(key)) State.estoque[key] = CONFIG.temasDefault[key];
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
      }, 200);
    }, function(error) {
      console.error("❌ Erro ao carregar estoque:", error);
      CatalogoLoader.mostrarErro('⚠️ Não foi possível carregar o catálogo.');
    });

    State.db.ref('historico').on('value', function(snap) { State.historico = snap.val() || {}; });
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
          var val = data[key];
          if (val && typeof val === 'object' && val.nome) categorias.push(val.nome);
          else if (typeof val === 'string') categorias.push(val);
        });
      }
      State.categorias = categorias;
      UI.atualizarSeletoresCategoria(categorias);
    }, function(error) { console.error("❌ Erro categorias:", error); });
  },
  salvarPecaNuvem: function(dadosPeca) {
    if (!State.db) return Promise.reject("Sem conexão");
    if (State.salvandoPeca) return Promise.reject("Já está salvando");
    State.salvandoPeca = true;
    var novoRef = State.db.ref('estoque').push();
    return novoRef.set(dadosPeca).then(function() {
      State.salvandoPeca = false;
      LoadingOverlay.mostrarSucesso('✅ Peça salva com sucesso!', '');
      return true;
    }).catch(function(error) {
      State.salvandoPeca = false;
      LoadingOverlay.esconder();
      Utils.showToast("❌ Erro ao salvar peça.", "error");
      return false;
    });
  },
  salvarCategoriaNuvem: function(nome) {
    if (!State.db) return Promise.reject("Sem conexão");
    nome = (nome || "").trim();
    if (!nome) return Promise.reject("Nome vazio");
    return State.db.ref('categorias').once('value').then(function(snapshot) {
      var data = snapshot.val();
      var existe = false;
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(function(key) {
          var val = data[key];
          var n = (val && val.nome) ? val.nome : (typeof val === 'string' ? val : null);
          if (n && n.toLowerCase() === nome.toLowerCase()) existe = true;
        });
      }
      if (existe) return Promise.reject("Já existe");
      return State.db.ref('categorias').push().set({ nome: nome, criadoEm: Date.now() })
        .then(function() { LoadingOverlay.mostrarSucesso('✅ Categoria adicionada!', ''); return true; });
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
          var val = data[key];
          var n = (val && val.nome) ? val.nome : (typeof val === 'string' ? val : null);
          if (n === nome) chaveRemover = key;
        });
      }
      if (!chaveRemover) return Promise.reject("Não encontrada");
      if (!confirm("Deseja remover a categoria \"" + nome + "\"?")) return Promise.reject("Cancelado");
      return State.db.ref('categorias/' + chaveRemover).remove()
        .then(function() { LoadingOverlay.mostrarSucesso('✅ Categoria removida!', ''); return true; });
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
      if (statusEl) {
        statusEl.innerHTML = "📅 <b>Hoje (" + Utils.formatDateBR(hoje) + "):</b>" +
          "<span style='color:var(--success); margin-left:10px;'>🟢 Entrada: <b>" + entrada + "</b></span>" +
          "<span style='color:var(--error); margin-left:15px;'>🔴 Saída: <b>" + saida + "</b></span>";
      }
    });
    if (State.usuarioLogadoEmail === "leonardodovalle@gmail.com" || State.usuarioLogadoEmail === "tralaladecoracoes@gmail.com") {
      var btnRelatorio = document.getElementById("btn-abrir-relatorio-pontos");
      if (btnRelatorio) btnRelatorio.style.display = "block";
      State.db.ref('pontos').on('value', function(snap) {
        UI.renderRelatorioGeralPontos(snap.val() || {});
      });
    }
  },
  registrarPonto: function(tipo) {
    if (!State.db || !State.usuarioLogadoEmail) return Utils.showToast("Erro de identificação.", "error");
    var chaveUsuario = State.usuarioLogadoEmail.replace(/[.#$[\]]/g, "_");
    var hoje = Utils.getHojeDataString();
    var hora = Utils.getHoraString();
    var updateData = { usuario: State.usuarioLogadoEmail, data: hoje };
    updateData[tipo] = hora;
    State.db.ref("pontos/" + chaveUsuario + "/" + hoje).update(updateData)
      .then(function() { Utils.showToast("Ponto marcado às " + hora + "!", "success"); })
      .catch(function() { Utils.showToast("Erro ao salvar ponto.", "error"); });
  },
  excluirTemaNuvem: function(chave) {
    if (!State.db) return Promise.reject("Sem conexão");
    return State.db.ref("estoque/" + chave).remove().then(function() {
      LoadingOverlay.mostrarSucesso('✅ Tema removido!', '');
      return true;
    }).catch(function() {
      LoadingOverlay.esconder();
      Utils.showToast("❌ Erro ao remover.", "error");
      return false;
    });
  },
  salvarOrcamentoNuvem: function(dadosOrcamento) {
    if (!State.db) return Promise.reject("Sem conexão");
    return State.db.ref('orcamentos').push().set(dadosOrcamento)
      .then(function() { Utils.showToast("Orçamento gravado!", "success"); return true; })
      .catch(function() { Utils.showToast("Erro ao salvar orçamento.", "error"); return false; });
  },
  salvarReservaNuvem: function(dadosReserva) {
    if (!State.db) return Promise.reject("Sem conexão");
    return State.db.ref('reservas').push().set(dadosReserva)
      .then(function() { Utils.showToast("Agendamento salvo!", "success"); return true; })
      .catch(function() { Utils.showToast("Erro ao salvar agendamento.", "error"); return false; });
  },
  excluirReservaNuvem: function(idReserva) {
    if (!State.db) return Promise.reject("Sem conexão");
    return State.db.ref("reservas/" + idReserva).remove();
  },
  excluirOrcamentoNuvem: function(idOrcamento) {
    if (!State.db) return Promise.reject("Sem conexão");
    return State.db.ref("orcamentos/" + idOrcamento).remove();
  },
  salvarReuniaoNuvem: function(dadosReuniao) {
    if (!State.db) return Promise.reject("Sem conexão");
    return State.db.ref('reunioes').push().set(dadosReuniao);
  },
  excluirReuniaoNuvem: function(idReuniao) {
    if (!State.db) return Promise.reject("Sem conexão");
    return State.db.ref("reunioes/" + idReuniao).remove();
  },
  listenReunioes: function(callback) {
    if (!State.db) return;
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
    if (!State.db) return Promise.reject("Sem conexão");
    return State.db.ref('contratos').push().set(dadosContrato);
  }
};

window.adicionarCategoria = function(nome) { return Database.salvarCategoriaNuvem(nome); };
window.removerCategoria = function(nome) { return Database.removerCategoriaNuvem(nome); };

// ============================================================
// UI
// ============================================================
var UI = {
  init: function() { this.bindEvents(); },

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

    // ---------- LOGIN / LOGOUT ----------
    var btnLogin = document.getElementById("btn-login-direto");
    if (btnLogin) btnLogin.onclick = function(e) { if (e) e.preventDefault(); self.handleLogin(); };
    var btnLogout = document.getElementById("btn-logout-direto");
    if (btnLogout) btnLogout.onclick = function(e) { if (e) e.preventDefault(); self.handleLogout(); };
    var senhaEl = document.getElementById("senha");
    if (senhaEl) senhaEl.onkeypress = function(e) {
      if (e.key === "Enter") { var l = document.getElementById("btn-login-direto"); if (l) l.click(); }
    };

    // ---------- PONTO ----------
    var b = document.getElementById("btn-ponto-entrada");
    if (b) b.onclick = function(e) { if (e) e.preventDefault(); Database.registrarPonto('entrada'); };
    b = document.getElementById("btn-ponto-saida");
    if (b) b.onclick = function(e) { if (e) e.preventDefault(); Database.registrarPonto('saida'); };
    b = document.getElementById("btn-abrir-relatorio-pontos");
    if (b) b.onclick = function(e) {
      if (e) e.preventDefault();
      var p = document.getElementById("painel-relatorio-pontos-geral");
      if (p) p.style.display = (p.style.display === "none" || p.style.display === "") ? "block" : "none";
    };

    // ---------- VENDA MENSAL & ANUAL ----------
    b = document.getElementById("btn-abrir-central-relatorios");
    if (b) b.onclick = function(e) {
      if (e) e.preventDefault();
      var p = document.getElementById("secao-central-relatorios");
      if (!p) return;
      var abrindo = (p.style.display === "none" || p.style.display === "");
      p.style.display = abrindo ? "block" : "none";
      if (abrindo) self.renderPlanilhaVendas();
    };
    b = document.getElementById("btn-fechar-central-relatorios");
    if (b) b.onclick = function(e) {
      if (e) e.preventDefault();
      var p = document.getElementById("secao-central-relatorios");
      if (p) p.style.display = "none";
    };
    b = document.getElementById("seletor-mes-planilha");
    if (b) b.onchange = function() { self.renderPlanilhaVendas(); };
    b = document.getElementById("btn-transformar-grafico");
    if (b) b.onclick = function(e) { if (e) e.preventDefault(); self.renderGraficoAnual(); };
    b = document.getElementById("btn-toggle-grafico");
    if (b) b.onclick = function(e) {
      if (e) e.preventDefault();
      var pg = document.getElementById("painel-grafico-faturamento");
      if (pg) pg.style.display = pg.style.display === 'none' ? 'block' : 'none';
    };
    b = document.getElementById("btn-gerar-resumo-mensal");
    if (b) b.onclick = function(e) {
      if (e) e.preventDefault();
      self.renderPlanilhaVendas();
      Utils.showToast("Relatório atualizado.", "success");
    };

    // ---------- VER ORÇAMENTOS ----------
    b = document.getElementById("btn-abrir-orcamentos");
    if (b) b.onclick = function(e) {
      if (e) e.preventDefault();
      var p = document.getElementById("painel-orcamentos-salvos");
      if (!p) return;
      var abrindo = (p.style.display === "none" || p.style.display === "");
      p.style.display = abrindo ? "block" : "none";
      if (abrindo) self.renderOrcamentos();
    };
    b = document.getElementById("btn-fechar-orcamentos-painel");
    if (b) b.onclick = function(e) {
      if (e) e.preventDefault();
      var p = document.getElementById("painel-orcamentos-salvos");
      if (p) p.style.display = "none";
    };

    // ---------- AGENDAR REUNIÕES ----------
    b = document.getElementById("btn-abrir-reunioes-painel");
    if (b) b.onclick = function(e) {
      if (e) e.preventDefault();
      var p = document.getElementById("painel-reunioes-exclusivo");
      if (!p) return;
      var abrindo = (p.style.display === "none" || p.style.display === "");
      p.style.display = abrindo ? "block" : "none";
      if (abrindo) self.iniciarPainelReunioes();
    };
    b = document.getElementById("btn-fechar-reunioes");
    if (b) b.onclick = function(e) {
      if (e) e.preventDefault();
      var p = document.getElementById("painel-reunioes-exclusivo");
      if (p) p.style.display = "none";
    };
    b = document.getElementById("btn-salvar-reuniao-avulsa");
    if (b) b.onclick = function(e) {
      if (e) e.preventDefault();
      var c = document.getElementById("reuniao-cliente");
      var d = document.getElementById("reuniao-data-hora");
      var pa = document.getElementById("reuniao-pauta");
      var cliente = c ? c.value.trim() : "";
      var dataHora = d ? d.value : "";
      var pauta = pa ? pa.value.trim() : "";
      if (!cliente || !dataHora) { Utils.showToast("Preencha cliente e data/hora.", "warning"); return; }
      LoadingOverlay.mostrar('⏳ Agendando...', 'Cliente: ' + cliente);
      Database.salvarReuniaoNuvem({ cliente: cliente, dataHora: dataHora, pauta: pauta, criadoEm: Date.now() })
        .then(function() {
          LoadingOverlay.mostrarSucesso('✅ Reunião agendada!', '');
          if (c) c.value = ""; if (d) d.value = ""; if (pa) pa.value = "";
        })
        .catch(function() { LoadingOverlay.esconder(); Utils.showToast("Erro.", "error"); });
    };

    // ---------- VER CATÁLOGO ----------
    b = document.getElementById("btn-abrir-catalogo-temas");
    if (b) b.onclick = function(e) {
      if (e) e.preventDefault();
      var p = document.getElementById("painel-catalogo-temas");
      if (!p) return;
      var abrindo = (p.style.display === "none" || p.style.display === "");
      p.style.display = abrindo ? "block" : "none";
      if (abrindo) self.renderTabelaTemasGerenciados();
    };

    // ---------- GERAR CONTRATO ----------
    b = document.getElementById("btn-abrir-gerador-contrato");
    if (b) b.onclick = function(e) {
      if (e) e.preventDefault();
      var m = document.getElementById("modal-gerador-contrato");
      if (m) m.classList.add("ativo");
      self.popularSelectPecasContrato();
      self.bindBuscaTemaContrato();
    };
    b = document.getElementById("btn-fechar-modal-contrato");
    if (b) b.onclick = function(e) {
      if (e) e.preventDefault();
      var m = document.getElementById("modal-gerador-contrato");
      if (m) m.classList.remove("ativo");
    };
    var modalContrato = document.getElementById("modal-gerador-contrato");
    if (modalContrato) {
      modalContrato.addEventListener('click', function(e) {
        if (e.target === modalContrato) modalContrato.classList.remove("ativo");
      });
    }
    b = document.getElementById("btn-gerar-salvar-contrato");
    if (b) b.onclick = function(e) { if (e) e.preventDefault(); self.gerarContrato(false); };
    b = document.getElementById("btn-gerar-pdf-contrato");
    if (b) b.onclick = function(e) { if (e) e.preventDefault(); self.gerarContrato(true); };

    // Modal de visualização
    var modalVis = document.getElementById("modal-visualizar-contrato");
    if (modalVis) {
      var fv = document.getElementById("btn-fechar-visualizacao");
      if (fv) fv.onclick = function() { modalVis.classList.remove("ativo"); };
      modalVis.addEventListener('click', function(e) {
        if (e.target === modalVis) modalVis.classList.remove("ativo");
      });
    }
    b = document.getElementById("btn-baixar-pdf-contrato");
    if (b) b.onclick = function() { self.gerarContratoPDF(); };
    b = document.getElementById("btn-imprimir-contrato");
    if (b) b.onclick = function() { window.print(); };

    // ---------- KITS ----------
    var botoesKit = document.querySelectorAll('.btn-kit-opcao');
    botoesKit.forEach(function(btn) {
      btn.onclick = function(e) {
        e.preventDefault();
        botoesKit.forEach(function(x) { x.classList.remove('ativo'); });
        btn.classList.add('ativo');
        var nomeKit = btn.getAttribute('data-kit');
        State.kitAtual = nomeKit;
        Utils.showToast('Kit "' + nomeKit + '" selecionado!', "success");
      };
    });

    // ---------- MONTAR NO LOCAL ----------
    var chkMontar = document.getElementById("chk-montar-local");
    if (chkMontar) {
      chkMontar.onchange = function() {
        State.montarNoLocal = !!chkMontar.checked;
        var painel = document.getElementById("painel-montagem-local");
        if (painel) painel.style.display = chkMontar.checked ? "block" : "none";
      };
    }

    // ---------- FRETE ----------
    var kmEl = document.getElementById("calc-km");
    var precoEl = document.getElementById("calc-valor-litro");
    if (kmEl) { kmEl.oninput = function() { FreteCalc.renderizar(); }; kmEl.onchange = function() { FreteCalc.renderizar(); }; }
    if (precoEl) { precoEl.oninput = function() { FreteCalc.renderizar(); }; precoEl.onchange = function() { FreteCalc.renderizar(); }; }
    var vfEl = document.getElementById("valor-festa");
    if (vfEl) vfEl.oninput = function() { FreteCalc.renderizar(); };
    var sinalEl = document.getElementById("valor-sinal");
    if (sinalEl) sinalEl.oninput = function() { FreteCalc.renderizar(); };

    // ---------- BUSCA DE RESERVAS ----------
    b = document.getElementById("busca-reserva");
    if (b) b.oninput = function(e) { self.renderReservas(e.target.value); };

    // ---------- BUSCA DE TEMA (ficha) ----------
    var inputBuscaTemaFicha = document.getElementById("filtro-tema-input");
    if (inputBuscaTemaFicha) {
      inputBuscaTemaFicha.oninput = function(e) {
        State.temaAtual = e.target.value.trim();
        self.renderSuggestions(e.target.value);
      };
      inputBuscaTemaFicha.onfocus = function(e) {
        if (e.target.value.trim()) self.renderSuggestions(e.target.value);
      };
    }

    // ---------- SALVAR RESERVA / ORÇAMENTO ----------
    b = document.getElementById("btn-confirmar-agendamento");
    if (b) b.onclick = function(e) { if (e) e.preventDefault(); self.handleSalvarFesta(); };
    b = document.getElementById("btn-salvar-como-orcamento");
    if (b) b.onclick = function(e) { if (e) e.preventDefault(); self.handleSalvarOrcamento(); };

    // ---------- ADICIONAR PEÇA ----------
    b = document.getElementById("btn-adicionar-peca");
    if (b) b.onclick = function(e) {
      if (e) e.preventDefault();
      if (State.salvandoPeca) { Utils.showToast("Aguarde...", "info"); return; }
      var nomeEl = document.getElementById("catalogo-peca-nome");
      var qtdEl = document.getElementById("catalogo-peca-qtd");
      var catEl = document.getElementById("catalogo-peca-categoria");
      var modEl = document.getElementById("catalogo-peca-modelo");
      var fileInput = document.getElementById("catalogo-peca-imagem");
      var nome = nomeEl ? nomeEl.value.trim() : "";
      var qtd = qtdEl ? (parseInt(qtdEl.value) || 0) : 0;
      var categoria = catEl ? catEl.value : "Outros";
      var modelo = modEl ? modEl.value.trim() : "";
      if (!nome) { Utils.showToast("Preencha o nome!", "warning"); return; }
      LoadingOverlay.mostrar('⏳ Salvando Peça...', 'Tema: ' + nome);
      State.salvandoPeca = true;
      var processar = function(imgUrl) {
        Database.salvarPecaNuvem({
          nome: nome, quantidade: qtd, categoria: categoria || "Outros",
          modelo: modelo || "Tema Geral",
          imagem: imgUrl || "https://placehold.co/100x100?text=Sem+Foto",
          criadoEm: Date.now()
        }).then(function(sucesso) {
          State.salvandoPeca = false;
          if (!sucesso) LoadingOverlay.esconder();
          if (sucesso) {
            if (nomeEl) nomeEl.value = "";
            if (qtdEl) qtdEl.value = "1";
            if (modEl) modEl.value = "";
            if (fileInput) fileInput.value = "";
          }
        }).catch(function() { State.salvandoPeca = false; LoadingOverlay.esconder(); });
      };
      if (fileInput && fileInput.files && fileInput.files[0]) {
        var reader = new FileReader();
        reader.onload = function(ev) { processar(ev.target.result); };
        reader.onerror = function() { processar(""); };
        reader.readAsDataURL(fileInput.files[0]);
      } else {
        processar("");
      }
    };

    // ---------- CATEGORIAS ----------
    b = document.getElementById("btn-adicionar-categoria");
    if (b) b.onclick = function(e) {
      if (e) e.preventDefault();
      var input = document.getElementById("input-nova-categoria");
      var nome = input ? input.value.trim() : "";
      if (!nome) { Utils.showToast("Digite um nome.", "warning"); return; }
      LoadingOverlay.mostrar('⏳ Adicionando...', 'Categoria: ' + nome);
      window.adicionarCategoria(nome).then(function() {
        if (input) { input.value = ""; input.focus(); }
      }).catch(function(err) { LoadingOverlay.esconder(); Utils.showToast(String(err), "warning"); });
    };
    var inputCat = document.getElementById("input-nova-categoria");
    if (inputCat) inputCat.onkeypress = function(e) {
      if (e.key === "Enter") { var bt = document.getElementById("btn-adicionar-categoria"); if (bt) bt.click(); }
    };
    b = document.getElementById("btn-remover-categoria");
    if (b) b.onclick = function(e) {
      if (e) e.preventDefault();
      var s = document.getElementById("select-remover-categoria");
      var cat = s ? s.value : "";
      if (!cat) { Utils.showToast("Selecione uma categoria.", "warning"); return; }
      LoadingOverlay.mostrar('⏳ Removendo...', 'Categoria: ' + cat);
      window.removerCategoria(cat).then(function() {}).catch(function(err) {
        LoadingOverlay.esconder();
        Utils.showToast(String(err), "warning");
      });
    };

    // ---------- REMOVER TEMA ----------
    b = document.getElementById("btn-remover-tema-admin");
    if (b) b.onclick = function(e) {
      if (e) e.preventDefault();
      var s = document.getElementById("select-remover-tema");
      if (!s) return;
      var valor = s.value;
      if (!valor) { Utils.showToast("Selecione um tema.", "warning"); return; }
      var temaNome = null;
      var chave = null;
      for (var k in State.estoque) {
        if (!State.estoque.hasOwnProperty(k)) continue;
        if (k === valor) { chave = k; temaNome = (State.estoque[k] && State.estoque[k].nome) || k; break; }
      }
      if (!temaNome && !isNaN(parseInt(valor))) {
        var idx = parseInt(valor);
        var chaves = Object.keys(State.estoque);
        if (chaves[idx]) { chave = chaves[idx]; temaNome = (State.estoque[chave] && State.estoque[chave].nome) || chave; }
      }
      if (!temaNome) { Utils.showToast("Tema não localizado.", "error"); return; }
      if (confirm("Remover \"" + temaNome + "\"?")) {
        LoadingOverlay.mostrar('⏳ Removendo...', 'Tema: ' + temaNome);
        Database.excluirTemaNuvem(chave).then(function() {}).catch(function() { LoadingOverlay.esconder(); });
      }
    };
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
      var p = r.data.split("-");
      if (p.length !== 3) return false;
      var idx = parseInt(p[1]) - 1;
      return nomesMeses[idx] === mesSelecionado;
    });
    if (reservasDoMes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#999; padding:15px;">Nenhuma venda neste mês.</td></tr>';
      return;
    }
    var html = "";
    reservasDoMes.forEach(function(r) {
      var total = parseFloat(r.total) || 0;
      var frete = parseFloat(r.frete) || 0;
      html += '<tr><td>' + (r.cliente || '') + '</td><td>' + (r.kit || 'Não informado') +
        '</td><td>R$ ' + (total + frete).toFixed(2) + '</td><td style="text-align:center;">—</td></tr>';
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
      if (idx >= 0 && idx < 12) valores[idx] += (parseFloat(r.total) || 0) + (parseFloat(r.frete) || 0);
    });
    window.chartInstance = new Chart(ctx, {
      type: 'bar',
      data: { labels: meses, datasets: [{ label: 'Faturamento (R$)', data: valores, backgroundColor: '#a3536a' }] },
      options: { responsive: true, maintainAspectRatio: false }
    });
  },

  // ============================================================
  // BUSCA DE TEMA NO CONTRATO
  // ============================================================
  bindBuscaTemaContrato: function() {
    var self = this;
    var input = document.getElementById("contrato-tema-busca");
    var caixa = document.getElementById("contrato-tema-sugestoes");
    var hidden = document.getElementById("contrato-tema-selecionado");
    if (!input || !caixa) return;
    if (input.__tralalaBound) return;
    input.__tralalaBound = true;
    input.oninput = function(e) {
      var termo = e.target.value.trim();
      if (!termo) { caixa.style.display = "none"; return; }
      var tNorm = Utils.normalizar(termo);
      var filtrados = Object.keys(State.estoque).filter(function(t) {
        return Utils.normalizar(t).indexOf(tNorm) !== -1;
      });
      caixa.innerHTML = "";
      filtrados.forEach(function(t) {
        var div = document.createElement("div");
        div.className = "sugestao-item";
        div.innerText = t;
        div.onclick = function() {
          input.value = t;
          if (hidden) hidden.value = t;
          caixa.style.display = "none";
          self.popularSelectPecasContrato(t);
        };
        caixa.appendChild(div);
      });
      caixa.style.display = filtrados.length ? "block" : "none";
    };
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
    var pecas = [];
    Object.keys(State.estoque).forEach(function(chave) {
      var item = State.estoque[chave];
      if (!item) return;
      var nome = item.nome || chave;
      if (nome === tema || chave === tema) pecas.push({ nome: nome, item: item });
      else if (categoriaTema && item.categoria === categoriaTema) pecas.push({ nome: nome, item: item });
    });
    if (pecas.length === 0) {
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
    pecas.forEach(function(p) {
      var opt = document.createElement("option");
      opt.value = p.nome;
      opt.textContent = p.nome + (p.item.quantidade !== undefined ? " (Qtd: " + p.item.quantidade + ")" : "");
      selectPecas.appendChild(opt);
    });
  },

  // ============================================================
  // CATEGORIAS
  // ============================================================
  atualizarSeletoresCategoria: function(categorias) {
    if (!categorias) categorias = [];
    var selectCat = document.getElementById("catalogo-peca-categoria");
    if (selectCat) {
      var va = selectCat.value;
      selectCat.innerHTML = '';
      categorias.forEach(function(cat) {
        var opt = document.createElement("option");
        opt.value = cat; opt.textContent = cat;
        selectCat.appendChild(opt);
      });
      if (categorias.indexOf(va) !== -1) selectCat.value = va;
    }
    var selectRemover = document.getElementById("select-remover-categoria");
    if (selectRemover) {
      var va2 = selectRemover.value;
      selectRemover.innerHTML = '<option value="">Selecione...</option>';
      categorias.forEach(function(cat) {
        var opt = document.createElement("option");
        opt.value = cat; opt.textContent = cat;
        selectRemover.appendChild(opt);
      });
      if (categorias.indexOf(va2) !== -1) selectRemover.value = va2;
    }
    var container = document.getElementById("lista-categorias-admin");
    if (container) {
      container.innerHTML = '';
      categorias.forEach(function(cat) {
        var div = document.createElement("div");
        div.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:4px 10px; background:#f8f0f2; border-radius:6px; border:1px solid #e1cbd4;";
        div.innerHTML = '<span style="font-size:13px;">📁 ' + cat + '</span>' +
          '<button type="button" onclick="window.removerCategoria(\'' + String(cat).replace(/'/g, "\\'") + '\')" class="btn btn-danger" style="padding:2px 8px; font-size:10px; width:auto; margin-left:6px;">✕</button>';
        container.appendChild(div);
      });
    }
    var contador = document.getElementById("contador-categorias");
    if (contador) contador.textContent = categorias.length;
  },

  // ============================================================
  // SALVAR FESTA
  // ============================================================
  handleSalvarFesta: function() {
    var elCliente = document.getElementById("nome-cliente");
    var elData = document.getElementById("data");
    var elTotal = document.getElementById("valor-total");
    var elSinal = document.getElementById("valor-sinal");
    var elObs = document.getElementById("adicionais-festa");
    var elValorFesta = document.getElementById("valor-festa");
    var hidden = document.getElementById("busca-tema-input");
    var filtro = document.getElementById("filtro-tema-input");

    var cliente = elCliente ? elCliente.value.trim() : "";
    var data = elData ? elData.value : "";
    var total = elTotal ? elTotal.value || "0" : "0";
    var sinal = elSinal ? elSinal.value || "0" : "0";
    var obs = elObs ? elObs.value.trim() : "";
    var valorFesta = elValorFesta ? (parseFloat(elValorFesta.value) || 0) : 0;

    if (hidden && hidden.value.trim()) State.temaAtual = hidden.value.trim();
    else if (filtro && filtro.value.trim()) State.temaAtual = filtro.value.trim();

    if (!cliente || !data || !State.temaAtual || !State.kitAtual) {
      return Utils.showToast("Preencha cliente, data, tema e selecione o kit!", "warning");
    }

    var temaNorm = State.temaAtual.toLowerCase().trim();
    var nomeReal = null;
    for (var t in State.estoque) {
      if (State.estoque.hasOwnProperty(t) && t.toLowerCase().trim() === temaNorm) { nomeReal = t; break; }
    }
    var infoTema = nomeReal ? State.estoque[nomeReal] : null;
    var kits = infoTema ? (parseInt(infoTema.kits) || parseInt(infoTema.quantidade) || 0) : 0;
    var reservas = 0;
    State.reservas.forEach(function(r) {
      if (r && r.tema && r.tema.toLowerCase().trim() === temaNorm) reservas++;
    });
    if (kits - reservas <= 0 && kits > 0) {
      return Utils.showToast("Sem kits livres para este tema.", "error");
    }

    var f = FreteCalc.calcular();

    Database.salvarReservaNuvem({
      cliente: cliente, data: data, tema: nomeReal || State.temaAtual,
      kit: State.kitAtual, montarNoLocal: !!State.montarNoLocal,
      total: total, sinal: sinal, valorFesta: valorFesta,
      frete: f.freteTotal, freteKm: f.km, fretePrecoCombustivel: f.precoCombustivel,
      freteLitros: f.litros, freteCustoCombustivel: f.custoCombustivel,
      freteManutencao: f.manutencao, freteTotal: f.freteTotal,
      obs: obs, dataCriacao: Utils.getHojeDataString()
    }).then(function() {
      if (elCliente) elCliente.value = "";
      if (elData) elData.value = "";
      if (elTotal) elTotal.value = "";
      if (elSinal) elSinal.value = "";
      if (elObs) elObs.value = "";
      if (elValorFesta) elValorFesta.value = "0.00";
      State.temaAtual = ""; State.kitAtual = ""; State.montarNoLocal = false;
      if (hidden) hidden.value = "";
      if (filtro) filtro.value = "";
      document.querySelectorAll('.btn-kit-opcao').forEach(function(b) { b.classList.remove('ativo'); });
      var pm = document.getElementById("painel-montagem-local");
      if (pm) pm.style.display = "none";
      var ck = document.getElementById("chk-montar-local");
      if (ck) ck.checked = false;
      FreteCalc.limpar();
    });
  },

  handleSalvarOrcamento: function() {
    var clienteEl = document.getElementById("nome-cliente");
    var totalEl = document.getElementById("valor-total");
    var dataEl = document.getElementById("data");
    var obsEl = document.getElementById("adicionais-festa");
    var vfEl = document.getElementById("valor-festa");
    var nomeCliente = clienteEl ? clienteEl.value.trim() : "";
    if (!nomeCliente) { Utils.showToast("Preencha o nome do cliente.", "warning"); return; }
    var f = FreteCalc.calcular();
    Database.salvarOrcamentoNuvem({
      cliente: nomeCliente, tema: State.temaAtual || "Não selecionado",
      kit: State.kitAtual || "", montarNoLocal: !!State.montarNoLocal,
      total: totalEl ? totalEl.value : "0",
      valorFesta: vfEl ? (parseFloat(vfEl.value) || 0) : 0,
      frete: f.freteTotal, freteKm: f.km, fretePrecoCombustivel: f.precoCombustivel,
      freteLitros: f.litros, freteCustoCombustivel: f.custoCombustivel,
      freteManutencao: f.manutencao, freteTotal: f.freteTotal,
      dataFesta: dataEl ? dataEl.value : "",
      obs: obsEl ? obsEl.value.trim() : "",
      dataCriacao: Utils.getHojeDataString(), horaCriacao: Utils.getHoraString()
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
      var sl = document.getElementById("secao-login");
      var sv = document.getElementById("secao-verificador");
      if (sl) sl.style.display = "none";
      if (sv) sv.style.display = "block";
      var nu = document.getElementById("nome-usuario");
      if (nu) nu.innerHTML = "👤 <b>" + email.split('@')[0] + "</b>";
      Utils.showToast("Login realizado!", "success");
      try { Database.listenPontoUsuario(); } catch (e) {}
    } else {
      Utils.showToast("E-mail ou senha incorretos.", "error");
    }
  },
  handleLogout: function() { window.location.reload(); },

  // ============================================================
  // SUGESTÕES DE TEMA
  // ============================================================
  renderSuggestions: function(termo) {
    var caixa = document.getElementById("wrapper-lista-sugestoes");
    if (!caixa) return;
    termo = (termo || "").toString();
    if (!termo.trim()) { caixa.style.display = "none"; caixa.innerHTML = ""; return; }
    var tNorm = Utils.normalizar(termo.trim());
    var filtrados = Object.keys(State.estoque).filter(function(t) {
      return Utils.normalizar(t).indexOf(tNorm) !== -1;
    });
    caixa.innerHTML = "";
    if (filtrados.length === 0) { caixa.style.display = "none"; return; }
    filtrados.forEach(function(tema) {
      var objTema = State.estoque[tema] || {};
      var item = document.createElement("div");
      item.className = "sugestao-item";
      var kits = objTema.kits ? (parseInt(objTema.kits) || 0) : (parseInt(objTema.quantidade) || 0);
      var reservas = 0;
      State.reservas.forEach(function(r) {
        if (r && r.tema && r.tema.toLowerCase().trim() === tema.toLowerCase().trim()) reservas++;
      });
      var livres = kits - reservas;
      item.innerHTML = "⚙️ " + tema + (kits > 0 ? " (Livre: " + Math.max(0, livres) + "/" + kits + ")" : "");
      item.onclick = function() {
        var h = document.getElementById("busca-tema-input");
        var f = document.getElementById("filtro-tema-input");
        if (h) h.value = tema;
        if (f) f.value = tema;
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
    var temas = Object.keys(State.estoque);
    if (temas.length === 0) { container.innerHTML = "<div style='text-align:center; padding:20px; color:#777;'>Nenhum tema.</div>"; return; }
    var filtrados = temas;
    if (filtro.trim() !== "") {
      var f = filtro.toLowerCase().trim();
      filtrados = temas.filter(function(t) { return t.toLowerCase().indexOf(f) !== -1; });
    }
    filtrados.forEach(function(nomeTema) {
      var objTema = State.estoque[nomeTema];
      var card = document.createElement("div");
      card.className = "card-catalogo card-tema";
      var kits = objTema.kits ? (parseInt(objTema.kits) || 0) : (parseInt(objTema.quantidade) || 0);
      var fotoUrl = objTema.png || objTema.imagem || "https://placehold.co/200x150?text=Sem+Foto";
      var reservas = 0;
      State.reservas.forEach(function(r) {
        if (r && r.tema && r.tema.toLowerCase().trim() === nomeTema.toLowerCase().trim()) reservas++;
      });
      var livres = kits - reservas;
      var status = livres > 0 ? "<span style='color:var(--success);'>🟢 " + livres + " livres</span>" : "<span style='color:var(--error);'>🔴 Indisponível</span>";
      card.innerHTML = '<img src="' + fotoUrl + '" style="width:100%;height:140px;object-fit:cover;border-radius:6px 6px 0 0;">' +
        '<div style="padding:10px;"><h4 style="margin:0 0 5px 0; color:var(--primary);">' + nomeTema + '</h4>' +
        '<p style="margin:0; font-size:0.9em;">Kits totais: <b>' + kits + '</b></p>' +
        '<div style="margin-top:5px;">' + status + '</div></div>';
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
        var imgHtml = img ? '<img src="' + img + '" class="catalogo-foto">' :
          '<div style="width:50px;height:50px;background:#eee;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#888;">Sem Foto</div>';
        html += '<tr><td style="text-align:center;">' + imgHtml + '</td>' +
          '<td><strong>' + nome + '</strong><br><span style="font-size:11px; color:var(--text-muted);">' +
          'Categoria: ' + (item.categoria || "Geral") + ' | Modelo: ' + (item.modelo || "Padrão") + '<br>' +
          'Qtd: <strong>' + (item.quantidade || item.kits || 1) + '</strong></span></td>' +
          '<td style="text-align:center;">' +
          '<button type="button" onclick="window.removerTemaPorChave(\'' + chave.replace(/'/g, "\\'") + '\')" class="btn-acao-tabela btn-remover-orc">🗑️</button>' +
          '</td></tr>';
      });
      corpo.innerHTML = html;
    }
    var selectRemover = document.getElementById("select-remover-tema");
    if (selectRemover) {
      var va = selectRemover.value;
      selectRemover.innerHTML = '<option value="">Selecione um tema...</option>';
      Object.keys(State.estoque).forEach(function(chave) {
        var item = State.estoque[chave] || {};
        var nome = item.nome || chave;
        var opt = document.createElement("option");
        opt.value = chave;
        opt.textContent = nome + " (" + (item.categoria || 'Geral') + ") - " + (item.quantidade || item.kits || 0) + " disp.";
        selectRemover.appendChild(opt);
      });
      if (va && State.estoque[va]) selectRemover.value = va;
    }
    var contador = document.getElementById("contador-catalogo-total");
    if (contador) contador.textContent = chaves.length + " itens";
  },

  renderReservas: function(filtro) {
    if (!filtro) filtro = "";
    var container = document.getElementById("lista-reservas-render");
    if (!container) return;
    container.innerHTML = "";
    if (State.carregando) { container.innerHTML = "<div style='text-align:center; padding:20px;'>⌛ Carregando...</div>"; return; }
    if (State.reservas.length === 0) {
      container.innerHTML = "<div style='text-align:center; padding:20px; color:#777;'>Nenhum agendamento.</div>";
      return;
    }
    var arr = State.reservas.slice().sort(function(a, b) { return new Date(a.data || 0) - new Date(b.data || 0); });
    if (filtro.trim() !== "") {
      var f = Utils.normalizar(filtro);
      arr = arr.filter(function(r) {
        return Utils.normalizar(r.cliente).indexOf(f) !== -1 || Utils.normalizar(r.tema).indexOf(f) !== -1;
      });
    }
    arr.forEach(function(res) {
      var card = document.createElement("div");
      card.className = "card-reserva";
      var total = parseFloat(res.total) || 0;
      var sinal = parseFloat(res.sinal) || 0;
      var frete = parseFloat(res.frete) || 0;
      var totGeral = total + frete;
      var devedor = totGeral - sinal;
      var quitado = devedor <= 0;
      var freteDetalhes = "";
      if (res.freteKm) {
        freteDetalhes = '<p style="font-size:11px;color:#666;">🚗 ' + res.freteKm + 'km × R$' +
          (parseFloat(res.fretePrecoCombustivel) || 0).toFixed(2) + ' → ' +
          (parseFloat(res.freteLitros) || 0).toFixed(2) + 'L → R$ ' +
          (parseFloat(res.freteCustoCombustivel) || 0).toFixed(2) + ' + manut. R$ ' +
          (parseFloat(res.freteManutencao) || 0).toFixed(2) + '</p>';
      }
      card.innerHTML = '<div class="reserva-header"><strong>👶 ' + (res.cliente || '') + '</strong>' +
        '<span class="reserva-badge" style="background:' + (quitado ? '#27ae60' : '#e67e22') + ';">' +
        (quitado ? 'PAGO 100%' : 'PENDENTE') + '</span></div>' +
        '<div class="reserva-body">' +
        '<p>📅 Data: <b>' + Utils.formatDateBR(res.data) + '</b></p>' +
        '<p>🎨 Tema: <b style="color:var(--primary);">' + (res.tema || '') + '</b></p>' +
        '<p>🛍️ Modelo: <b>' + (res.kit || 'Não informado') + '</b></p>' +
        (res.montarNoLocal ? '<p>🛠️ Montagem no local: <b style="color:#27ae60;">SIM</b></p>' : '') +
        '<p>🚚 Frete: <b>' + Utils.formatCurrency(frete) + '</b></p>' + freteDetalhes +
        '<p>💰 Total Geral: <b>' + Utils.formatCurrency(totGeral) + '</b></p>' +
        '<p>💵 Sinal Pago: <b>' + Utils.formatCurrency(sinal) + '</b></p>' +
        '<p style="color:' + (quitado ? 'green' : 'red') + '">⚠️ Falta Receber: <b>' + Utils.formatCurrency(devedor) + '</b></p>' +
        (res.obs ? '<p>📝 Obs: ' + res.obs + '</p>' : '') +
        '</div>' +
        '<button type="button" style="width:100%; padding:8px; margin-top:10px; background:var(--error); color:#fff; border:none; border-radius:4px; cursor:pointer;" onclick="window.DeletarReserva(\'' + res.id + '\')">🗑️ Excluir Agendamento</button>';
      container.appendChild(card);
    });
  },

  renderOrcamentos: function() {
    var containers = [
      document.getElementById("lista-orcamentos-render"),
      document.getElementById("lista-orcamentos-interno-corpo")
    ].filter(Boolean);
    if (containers.length === 0) return;
    containers.forEach(function(container) {
      container.innerHTML = "";
      if (State.orcamentos.length === 0) {
        if (container.tagName === "TBODY") {
          container.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#777;">Nenhum orçamento.</td></tr>';
        } else {
          container.innerHTML = "<div style='text-align:center; padding:20px; color:#777;'>Nenhum orçamento.</div>";
        }
        return;
      }
      var isTbody = container.tagName === "TBODY";
      var html = "";
      State.orcamentos.forEach(function(orc) {
        var totalFmt = Utils.formatCurrency(orc.total);
        if (isTbody) {
          html += '<tr><td>' + (orc.cliente || '') + '</td>' +
            '<td>' + (orc.tema || '') + (orc.kit ? ' / ' + orc.kit : '') + '</td>' +
            '<td>' + totalFmt + '</td>' +
            '<td style="text-align:center;">' +
            '<button type="button" onclick="window.PromoverOrcamento(\'' + orc.id + '\')" class="btn-acao-tabela btn-promover">✅</button>' +
            '<button type="button" onclick="window.ExcluirOrcamento(\'' + orc.id + '\')" class="btn-acao-tabela btn-remover-orc">🗑️</button>' +
            '</td></tr>';
        } else {
          html += '<div class="card-reserva"><div class="reserva-header"><strong>👤 ' + (orc.cliente || '') + '</strong></div>' +
            '<div class="reserva-body">' +
            '<p>📅 Data: <b>' + Utils.formatDateBR(orc.dataFesta) + '</b></p>' +
            '<p>🎨 Tema: <b>' + (orc.tema || '') + '</b></p>' +
            (orc.kit ? '<p>🛍️ Kit: <b>' + orc.kit + '</b></p>' : '') +
            '<p>💰 Total: <b>' + totalFmt + '</b></p>' +
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
    var html = "";
    var tem = false;
    for (var usuario in dadosPontos) {
      if (dadosPontos.hasOwnProperty(usuario)) {
        var dias = dadosPontos[usuario];
        for (var dia in dias) {
          if (dias.hasOwnProperty(dia)) {
            tem = true;
            var p = dias[dia];
            html += '<tr><td>' + usuario.replace(/_/g, ".") + '</td>' +
              '<td>' + Utils.formatDateBR(dia) + '</td>' +
              '<td style="color:var(--success);">' + (p.entrada || "--:--") + '</td>' +
              '<td style="color:var(--error);">' + (p.saida || "--:--") + '</td></tr>';
          }
        }
      }
    }
    container.innerHTML = tem ? html : '<tr><td colspan="4" style="text-align:center; color:#999;">Nenhum ponto registrado.</td></tr>';
  },

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
    var tema = (document.getElementById("contrato-tema-selecionado") || {}).value || "";
    var selectPecas = document.getElementById("c-pecas");
    var pecas = [];
    if (selectPecas) {
      for (var i = 0; i < selectPecas.options.length; i++) {
        if (selectPecas.options[i].selected) pecas.push(selectPecas.options[i].value);
      }
    }
    var extras = [];
    ['c-porcelanas','c-bolos','c-decoracao','c-outros'].forEach(function(id) {
      var sel = document.getElementById(id);
      if (!sel) return;
      for (var j = 0; j < sel.options.length; j++) {
        if (sel.options[j].selected) extras.push(sel.options[j].value);
      }
    });
    if (!nome.trim()) { Utils.showToast("Preencha o nome do contratante!", "warning"); return; }

    var dataFmt = data ? data.split("-").reverse().join("/") : "____/____/______";
    var valorFmt = valor ? valor.toFixed(2).replace('.', ',') : "______,____";
    var pecasTexto = pecas.length > 0 ? pecas.join(", ") : "__________________________________";
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
      '<div class="assinatura"><div class="linha-assinatura"></div><div class="assinatura-nome">' + (nome || "CONTRATANTE") + '</div></div>' +
      '<div class="assinatura"><div class="linha-assinatura"></div><div class="assinatura-nome">TRALALÁ DECORAÇÕES DE FESTAS</div></div>' +
    '</div>';

    Database.salvarContratoNuvem({
      nome: nome, cpf: cpf, data: data, horario: horario, valor: valor,
      endereco: endereco, telefone: telefone, local: local, modelo: modelo,
      tema: tema, pecas: pecas, extras: extras, obs: obs, criadoEm: Date.now()
    }).catch(function(err) { console.warn("Contrato não salvo:", err); });

    var preview = document.getElementById("contrato-preview-content");
    if (preview) preview.innerHTML = html;
    var modalVis = document.getElementById("modal-visualizar-contrato");
    if (modalVis) modalVis.classList.add("ativo");

    if (gerarPdf) setTimeout(function() { UI.gerarContratoPDF(); }, 300);
    else Utils.showToast("Contrato gerado!", "success");
  },

  gerarContratoPDF: function() {
    var elemento = document.getElementById("contrato-preview-content");
    if (!elemento) return;
    if (typeof html2pdf === 'undefined') { alert("Biblioteca PDF não carregada."); return; }
    var nome = (document.getElementById("c-nome") || {}).value || "contrato";
    html2pdf().from(elemento).set({
      margin: 0,
      filename: 'contrato-' + nome.replace(/\s+/g, '-').toLowerCase() + '.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).save().then(function() { Utils.showToast("PDF baixado!", "success"); })
      .catch(function(err) { console.error(err); Utils.showToast("Erro ao gerar PDF.", "error"); });
  }
};

// ============================================================
// FUNÇÕES GLOBAIS (chamadas via onclick no HTML)
// ============================================================
window.DeletarReserva = function(idReserva) {
  if (confirm("Excluir este agendamento?")) {
    Database.excluirReservaNuvem(idReserva).then(function() {
      Utils.showToast("Agendamento removido!", "success");
    }).catch(function() { Utils.showToast("Falha ao remover.", "error"); });
  }
};

window.ExcluirReuniao = function(idReuniao) {
  if (confirm("Excluir esta reunião?")) {
    Database.excluirReuniaoNuvem(idReuniao).then(function() {
      Utils.showToast("Reunião removida!", "success");
    }).catch(function() { Utils.showToast("Falha ao remover.", "error"); });
  }
};

window.ExcluirOrcamento = function(idOrcamento) {
  if (confirm("Excluir este orçamento?")) {
    Database.excluirOrcamentoNuvem(idOrcamento).then(function() {
      Utils.showToast("Orçamento removido!", "success");
    }).catch(function() { Utils.showToast("Falha ao remover.", "error"); });
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
  var hidden = document.getElementById("busca-tema-input");
  var filtro = document.getElementById("filtro-tema-input");
  if (elCliente) elCliente.value = orc.cliente || "";
  if (elData && orc.dataFesta) elData.value = orc.dataFesta;
  if (elTotal) elTotal.value = orc.total || "";
  if (elValorFesta) elValorFesta.value = orc.valorFesta || "";
  if (elObs) elObs.value = orc.obs || "";
  if (orc.tema) {
    if (hidden) hidden.value = orc.tema;
    if (filtro) filtro.value = orc.tema;
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
  if (orc.freteKm) {
    var kmEl = document.getElementById("calc-km");
    var precoEl = document.getElementById("calc-valor-litro");
    if (kmEl) kmEl.value = orc.freteKm;
    if (precoEl && orc.fretePrecoCombustivel) precoEl.value = orc.fretePrecoCombustivel;
    FreteCalc.renderizar();
  }
  Utils.showToast("Orçamento carregado. Revise e confirme.", "success");
  var painelOrc = document.getElementById("painel-orcamentos-salvos");
  if (painelOrc) painelOrc.style.display = "none";
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.removerTemaPorChave = function(chave) {
  var item = State.estoque[chave];
  if (!item) return;
  var nome = item.nome || chave;
  if (confirm("Remover \"" + nome + "\"?")) {
    LoadingOverlay.mostrar('⏳ Removendo...', 'Tema: ' + nome);
    Database.excluirTemaNuvem(chave).then(function() {}).catch(function() { LoadingOverlay.esconder(); });
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
    } catch (e) { console.error("Erro init Database:", e); }
  }

  try {
    UI.init();
    console.log("✅ Sistema Tralalá inicializado.");
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
