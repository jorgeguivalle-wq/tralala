// ============================================================
// SISTEMA PRINCIPAL — Tralalá Festas
// ============================================================

const CONFIG = {
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
  frete: {
    consumoKmPorLitro: 9,
    percentualManutencao: 0.20
  }
};

const State = {
  db: null,
  estoqueArray: [],
  estoqueMap: {},
  reservas: [],
  orcamentos: [],
  kits: [],
  categorias: [],
  temaAtual: "",
  temaAtualObj: null,
  kitAtual: "",
  montarNoLocal: false,
  usuarioLogadoEmail: "",
  salvandoPeca: false,
  carregando: true,
  pecasSelecionadasKit: {},
  temasSelecionadosKit: {},
  pecasSelecionadasContrato: [],
  // Kits sendo criados
  kitCriando: {
    nome: "",
    quantidade: 1,
    pecas: [],
    temas: [],
    imagem: ""
  },
  // Soma e desconto
  somaAutomatica: 0,
  descontoAplicado: { tipo: "percent", valor: 0, totalOriginal: 0, totalFinal: 0 },
  frete: {
    kmIda: 0, kmTotal: 0, precoCombustivel: 0,
    litros: 0, custoCombustivel: 0, manutencao: 0,
    freteTotal: 0, segundaViagem: false
  }
};

const mesesAno = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

let db = null;
let chartInstance = null;

// ============================================================
// MODAL STATUS
// ============================================================
const ModalStatus = {
  exibir: (titulo, subtitulo) => {
    const modal = document.getElementById("modal-status-operacao");
    const spinner = document.getElementById("spinner-status");
    const t = document.getElementById("titulo-status-operacao");
    const sub = document.getElementById("subtitulo-status-operacao");
    if (!modal) return;
    if (spinner) { spinner.style.display = "block"; spinner.style.borderColor = "#f3f3f3"; spinner.style.borderTopColor = "var(--primary)"; }
    if (t) { t.style.color = "var(--primary)"; t.innerText = titulo || "PROCESSANDO..."; }
    if (sub) sub.innerText = subtitulo || "Aguarde a confirmação.";
    modal.classList.add("ativo");
  },
  sucesso: (mensagem, callback) => {
    const spinner = document.getElementById("spinner-status");
    const t = document.getElementById("titulo-status-operacao");
    const sub = document.getElementById("subtitulo-status-operacao");
    if (spinner) spinner.style.display = "none";
    if (t) { t.style.color = "var(--success)"; t.innerText = "✓ SUCESSO"; }
    if (sub) sub.innerText = mensagem || "Operação realizada com êxito.";
    setTimeout(() => { ModalStatus.fechar(); if (callback) callback(); }, 700);
  },
  erro: (mensagem) => {
    const spinner = document.getElementById("spinner-status");
    const t = document.getElementById("titulo-status-operacao");
    const sub = document.getElementById("subtitulo-status-operacao");
    if (spinner) spinner.style.display = "none";
    if (t) { t.style.color = "var(--error)"; t.innerText = "ERRO NA OPERAÇÃO"; }
    if (sub) sub.innerText = mensagem || "Não foi possível concluir.";
    setTimeout(() => { ModalStatus.fechar(); }, 2200);
  },
  fechar: () => {
    const modal = document.getElementById("modal-status-operacao");
    if (modal) modal.classList.remove("ativo");
  }
};

// ============================================================
// UTILS
// ============================================================
const Utils = {
  showToast: function(message, type) {
    if (!type) type = 'info';
    var icone = type === 'success' ? '✅' : (type === 'error' ? '🚨' : '⚠️');
    console.log(icone + " " + message);
    var container = document.getElementById('toast-container');
    if (container) {
      var toast = document.createElement('div');
      toast.className = "toast toast-" + type;
      toast.style.cssText = "background:" + (type==='success'?'#27ae60':type==='error'?'#e74c3c':'#f39c12') + ";color:#fff;padding:14px 24px;border-radius:8px;font-size:14px;box-shadow:0 5px 15px rgba(0,0,0,0.2);margin-bottom:10px;";
      toast.innerHTML = "<span>" + icone + "</span> <span>" + message + "</span>";
      container.appendChild(toast);
      setTimeout(function() { toast.remove(); }, 3500);
    } else if (type === 'error') {
      alert('❌ ' + message);
    }
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
// REDUZIR IMAGEM
// ============================================================
function reduzirImagem(file, maxWidth, quality) {
  return new Promise(function(resolve, reject) {
    if (!file) return reject("Sem arquivo");
    maxWidth = maxWidth || 900;
    quality = quality || 0.82;
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round(h * (maxWidth / w)); w = maxWidth; }
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = function() { reject("Erro ao carregar imagem"); };
      img.src = e.target.result;
    };
    reader.onerror = function() { reject("Erro ao ler arquivo"); };
    reader.readAsDataURL(file);
  });
}

// ============================================================
// CALCULADORA DE FRETE
// ============================================================
const FreteCalc = {
  ler: function() {
    var kmEl = document.getElementById('calc-km');
    var precoEl = document.getElementById('calc-valor-litro');
    var chkSegunda = document.getElementById('chk-segunda-viagem');
    var kmIda = kmEl ? parseFloat(kmEl.value) : 0;
    var preco = precoEl ? parseFloat(precoEl.value) : 0;
    if (isNaN(kmIda) || kmIda < 0 || !isFinite(kmIda)) kmIda = 0;
    if (isNaN(preco) || preco < 0 || !isFinite(preco)) preco = 0;
    var segundaViagem = !!(chkSegunda && chkSegunda.checked);
    return { kmIda: kmIda, preco: preco, segundaViagem: segundaViagem };
  },
  calcular: function() {
    var e = this.ler();
    var fator = e.segundaViagem ? 4 : 2;
    var kmTotal = e.kmIda * fator;
    var litros = kmTotal / CONFIG.frete.consumoKmPorLitro;
    var custoCombustivel = litros * e.preco;
    var manutencao = custoCombustivel * CONFIG.frete.percentualManutencao;
    var freteTotal = custoCombustivel + manutencao;
    if (!isFinite(litros)) litros = 0;
    if (!isFinite(custoCombustivel)) custoCombustivel = 0;
    if (!isFinite(manutencao)) manutencao = 0;
    if (!isFinite(freteTotal)) freteTotal = 0;
    State.frete = {
      kmIda: e.kmIda, kmTotal: kmTotal, precoCombustivel: e.preco,
      segundaViagem: e.segundaViagem,
      litros: litros, custoCombustivel: custoCombustivel,
      manutencao: manutencao, freteTotal: freteTotal
    };
    return State.frete;
  },
  renderizar: function() {
    var f = this.calcular();
    var txtKmTotal = document.getElementById('calc-km-total');
    var txtCombustivel = document.getElementById('calc-total-combustivel');
    var txtManutencao = document.getElementById('calc-manutencao');
    var txtTotal = document.getElementById('calc-cobrar-cliente');
    if (txtKmTotal) txtKmTotal.textContent = f.kmTotal;
    if (txtCombustivel) txtCombustivel.textContent = "R$ " + f.custoCombustivel.toFixed(2);
    if (txtManutencao) txtManutencao.textContent = "R$ " + f.manutencao.toFixed(2);
    if (txtTotal) txtTotal.textContent = "R$ " + f.freteTotal.toFixed(2);

    var inputFrete = document.getElementById('valor-frete');
    if (inputFrete) inputFrete.value = f.freteTotal.toFixed(2);

    recalcularTotais();
    return f;
  },
  limpar: function() {
    State.frete = { kmIda: 0, kmTotal: 0, precoCombustivel: 0, litros: 0, custoCombustivel: 0, manutencao: 0, freteTotal: 0, segundaViagem: false };
    var kmEl = document.getElementById('calc-km');
    var chkSegunda = document.getElementById('chk-segunda-viagem');
    var inputFrete = document.getElementById('valor-frete');
    if (kmEl) kmEl.value = "";
    if (chkSegunda) chkSegunda.checked = false;
    if (inputFrete) inputFrete.value = "0.00";
    this.renderizar();
  }
};

// ============================================================
// RECALCULAR TOTAIS (festa + frete - sinal)
// ============================================================
function recalcularTotais() {
  var inputValorFesta = document.getElementById('valor-festa');
  var valorFesta = inputValorFesta ? (parseFloat(inputValorFesta.value) || 0) : 0;
  if (isNaN(valorFesta)) valorFesta = 0;

  var frete = State.frete.freteTotal || 0;
  var total = valorFesta + frete;

  var inputTotal = document.getElementById('valor-total');
  if (inputTotal) inputTotal.value = total.toFixed(2);

  var inputSinal = document.getElementById('valor-sinal');
  var sinal = inputSinal ? (parseFloat(inputSinal.value) || 0) : 0;
  if (isNaN(sinal)) sinal = 0;

  var inputRestante = document.getElementById('valor-restante');
  if (inputRestante) {
    var restante = total - sinal;
    if (restante < 0) restante = 0;
    inputRestante.value = restante.toFixed(2);
  }
}

// ============================================================
// FIREBASE INIT
// ============================================================
try {
  if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) firebase.initializeApp(CONFIG.firebase);
    db = firebase.database();
    State.db = db;
  }
} catch (err) {
  console.error("Erro no Firebase:", err);
}

// ============================================================
// DATABASE
// ============================================================
const Database = {
  // ---------- ESTOQUE ----------
  salvarPecaNuvem: async function(peca) {
    if (State.salvandoPeca) return;
    State.salvandoPeca = true;
    const btnSalvar = document.getElementById("btn-adicionar-peca");
    if (btnSalvar) btnSalvar.disabled = true;
    ModalStatus.exibir("LANÇANDO PEÇA...", "Salvando no acervo, aguarde.");
    try {
      if (db) {
        const refEstoque = db.ref("estoque");
        const newRef = peca.idFirebase ? db.ref("estoque/" + peca.idFirebase) : refEstoque.push();
        const pecaId = peca.idFirebase || newRef.key;
        const payload = {
          idFirebase: pecaId,
          nome: peca.nome || "",
          quantidade: parseInt(peca.quantidade) || 1,
          categoria: peca.categoria || "Outros",
          modelo: peca.modelo || "",
          preco: parseFloat(peca.preco) || 0,
          precoReposicao: parseFloat(peca.precoReposicao) || 0,
          imagem: peca.imagem || "",
          atualizadoEm: Date.now()
        };
        await newRef.set(payload);
      }
      ModalStatus.sucesso("✓ PEÇA LANÇADA COM SUCESSO");
    } catch (error) {
      console.error("Erro ao salvar peça:", error);
      ModalStatus.erro("Não foi possível salvar a peça.");
    } finally {
      State.salvandoPeca = false;
      if (btnSalvar) btnSalvar.disabled = false;
    }
  },

  atualizarPecaNuvem: async function(idFirebase, dados) {
    if (!db) return false;
    try {
      await db.ref("estoque/" + idFirebase).update(dados);
      return true;
    } catch (e) { console.error(e); return false; }
  },

  removerPecaNuvem: async function(idFirebase) {
    if (!db) return false;
    try {
      await db.ref("estoque/" + idFirebase).remove();
      return true;
    } catch (e) { console.error(e); return false; }
  },

  // ---------- CATEGORIAS ----------
  salvarCategoriaNuvem: function(nome) {
    if (!db) return Promise.reject("Sem conexão");
    nome = (nome || "").trim();
    if (!nome) return Promise.reject("Nome vazio");
    return db.ref('categorias').once('value').then(function(snapshot) {
      var data = snapshot.val();
      var existe = false;
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(function(key) {
          var val = data[key];
          var n = (val && val.nome) ? val.nome : (typeof val === 'string' ? val : null);
          if (n && n.toLowerCase() === nome.toLowerCase()) existe = true;
        });
      }
      if (existe) return Promise.reject("Categoria já existe");
      return db.ref('categorias').push().set({ nome: nome, criadoEm: Date.now() });
    });
  },

  removerCategoriaNuvem: function(nome) {
    if (!db) return Promise.reject("Sem conexão");
    if (!nome) return Promise.reject("Nome vazio");
    return db.ref('categorias').once('value').then(function(snapshot) {
      var data = snapshot.val();
      var chaveRemover = null;
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(function(key) {
          var val = data[key];
          var n = (val && val.nome) ? val.nome : (typeof val === 'string' ? val : null);
          if (n === nome) chaveRemover = key;
        });
      }
      if (!chaveRemover) return Promise.reject("Categoria não encontrada");
      if (!confirm('Remover a categoria "' + nome + '"?')) return Promise.reject("Cancelado");
      return db.ref('categorias/' + chaveRemover).remove();
    });
  },

  // ---------- RESERVAS ----------
  salvarReservaNuvem: function(dados) {
    if (!db) return Promise.reject("Sem conexão");
    return db.ref('reservas').push().set(dados);
  },
  excluirReservaNuvem: function(id) {
    if (!db) return Promise.reject("Sem conexão");
    return db.ref("reservas/" + id).remove();
  },

  // ---------- ORÇAMENTOS ----------
  salvarOrcamentoNuvem: function(dados) {
    if (!db) return Promise.reject("Sem conexão");
    return db.ref('orcamentos').push().set(dados);
  },
  excluirOrcamentoNuvem: function(id) {
    if (!db) return Promise.reject("Sem conexão");
    return db.ref("orcamentos/" + id).remove();
  },

  // ---------- REUNIÕES ----------
  salvarReuniaoNuvem: function(dados) {
    if (!db) return Promise.reject("Sem conexão");
    return db.ref('reunioes').push().set(dados);
  },
  excluirReuniaoNuvem: function(id) {
    if (!db) return Promise.reject("Sem conexão");
    return db.ref("reunioes/" + id).remove();
  },

  // ---------- CONTRATOS ----------
  salvarContratoNuvem: function(dados) {
    if (!db) return Promise.reject("Sem conexão");
    return db.ref('contratos').push().set(dados);
  },

  // ---------- KITS ----------
  salvarKitNuvem: function(dados) {
    if (!db) return Promise.reject("Sem conexão");
    return db.ref('kits').push().set(dados);
  },
  excluirKitNuvem: function(id) {
    if (!db) return Promise.reject("Sem conexão");
    return db.ref("kits/" + id).remove();
  },

  // ---------- PONTO ----------
  registrarPonto: function(tipo) {
    if (!db || !State.usuarioLogadoEmail) return Utils.showToast("Erro de identificação.", "error");
    var chaveUsuario = State.usuarioLogadoEmail.replace(/[.#$[\]]/g, "_");
    var hoje = Utils.getHojeDataString();
    var hora = Utils.getHoraString();
    var updateData = { usuario: State.usuarioLogadoEmail, data: hoje };
    updateData[tipo] = hora;
    db.ref("pontos/" + chaveUsuario + "/" + hoje).update(updateData)
      .then(function() { Utils.showToast("Ponto de " + (tipo === 'entrada' ? 'Entrada' : 'Saída') + " marcado!", "success"); })
      .catch(function() { Utils.showToast("Erro ao salvar ponto.", "error"); });
  },

  listenPontoUsuario: function() {
    if (!db || !State.usuarioLogadoEmail) return;
    var chaveUsuario = State.usuarioLogadoEmail.replace(/[.#$[\]]/g, "_");
    var hoje = Utils.getHojeDataString();
    db.ref("pontos/" + chaveUsuario + "/" + hoje).on('value', function(snap) {
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
  },

  listenPontosGeral: function() {
    if (!db) return;
    db.ref('pontos').on('value', function(snap) {
      renderRelatorioGeralPontos(snap.val() || {});
    });
  }
};

window.adicionarCategoria = function(nome) { return Database.salvarCategoriaNuvem(nome); };
window.removerCategoria = function(nome) { return Database.removerCategoriaNuvem(nome); };

// ============================================================
// ESTOQUE — LISTEN
// ============================================================
function carregarEstoque() {
  if (!db) return;
  const refEstoque = db.ref("estoque");
  refEstoque.on("value", (snapshot) => {
    const val = snapshot.val();
    State.estoqueArray = [];
    State.estoqueMap = {};
    if (val && typeof val === 'object') {
      if (Array.isArray(val)) {
        val.forEach((item, idx) => {
          if (item) {
            State.estoqueArray.push({ idFirebase: String(idx), ...item });
          }
        });
      } else {
        Object.keys(val).forEach(k => {
          if (val[k]) {
            const it = { idFirebase: k, ...val[k] };
            State.estoqueArray.push(it);
            State.estoqueMap[it.nome || k] = it;
          }
        });
      }
    }
    renderizarTemas();
    carregarSugestoesTemaFicha();
    carregarTemasNoContrato();
    atualizarSeletoresCategoria();
  });
}

// ============================================================
// RESERVAS
// ============================================================
function listenReservas() {
  if (!db) return;
  db.ref('reservas').on('value', function(snap) {
    State.carregando = false;
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
    State.reservas = arr;
    renderReservas();
  });
}

// ============================================================
// ORÇAMENTOS
// ============================================================
function listenOrcamentos() {
  if (!db) return;
  db.ref('orcamentos').on('value', function(snap) {
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
    State.orcamentos = arr;
    renderOrcamentos();
  });
}

// ============================================================
// KITS
// ============================================================
function listenKits() {
  if (!db) return;
  db.ref('kits').on('value', function(snap) {
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
    State.kits = arr;
    renderKits();
  });
}

// ============================================================
// CATEGORIAS
// ============================================================
function listenCategorias() {
  if (!db) return;
  db.ref('categorias').on('value', function(snapshot) {
    var data = snapshot.val();
    var nomes = [];
    if (data && typeof data === 'object') {
      Object.keys(data).forEach(function(key) {
        var val = data[key];
        var n = (val && val.nome) ? val.nome : (typeof val === 'string' ? val : null);
        if (n) nomes.push(n);
      });
    }
    State.categorias = nomes;
    atualizarSeletoresCategoria();
  });
}

// ============================================================
// RENDER: TEMAS (CATÁLOGO) — com botão de preço
// ============================================================
function renderizarTemas() {
  const corpo = document.getElementById("lista-temas-gerenciados-corpo");
  const contador = document.getElementById("contador-catalogo-total");
  if (contador) contador.textContent = State.estoqueArray.length + " itens";
  if (!corpo) return;

  if (State.estoqueArray.length === 0) {
    corpo.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#999; padding:15px;">Nenhum tema ou peça cadastrada.</td></tr>';
    return;
  }

  const grupos = {};
  State.estoqueArray.forEach(function(item) {
    var cat = (item.categoria && String(item.categoria).trim()) || "Sem Categoria";
    if (!grupos[cat]) grupos[cat] = [];
    grupos[cat].push(item);
  });

  var ordemPreferida = ["Maquete", "Louças de porcelana"];
  var categoriasOrdenadas = Object.keys(grupos).sort(function(a, b) {
    var ia = ordemPreferida.indexOf(a);
    var ib = ordemPreferida.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b, 'pt-BR');
  });

  var html = "";
  categoriasOrdenadas.forEach(function(cat) {
    var itens = grupos[cat];
    html += '<tr class="categoria-header-linha" style="background:linear-gradient(90deg,var(--primary),var(--primary-dark));color:#fff;font-weight:700;">' +
      '<td colspan="3" style="padding:10px;">📁 ' + cat + ' <span style="float:right;background:rgba(255,255,255,0.25);padding:2px 10px;border-radius:12px;font-size:12px;">' + itens.length + '</span></td></tr>';

    itens.forEach(function(tema) {
      var idxOriginal = State.estoqueArray.indexOf(tema);
      var img = tema.imagem
        ? '<img src="' + tema.imagem + '" class="catalogo-foto">'
        : '<div style="width:50px;height:50px;background:#eee;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#888;">Sem Foto</div>';
      var precoFmt = Utils.formatCurrency(tema.preco || 0);
      var precoRepFmt = Utils.formatCurrency(tema.precoReposicao || 0);

      html += '<tr>' +
        '<td style="text-align:center;">' + img + '</td>' +
        '<td><strong>' + (tema.nome || "Sem Nome") + '</strong><br>' +
        '<span style="font-size:11px; color:var(--text-muted);">' +
        'Categoria: ' + (tema.categoria || "Geral") + ' | Modelo: ' + (tema.modelo || "Padrão") + '<br>' +
        'Qtd: <strong>' + (tema.quantidade || 1) + '</strong> | ' +
        '💰 Locação: <strong style="color:#27ae60;">' + precoFmt + '</strong> | ' +
        '🔧 Reposição: <strong style="color:#e74c3c;">' + precoRepFmt + '</strong>' +
        '</span></td>' +
        '<td style="text-align:center; white-space:nowrap;">' +
        '<button type="button" onclick="window.editarTema(' + idxOriginal + ')" class="btn-acao-tabela btn-editar-tema" title="Editar">✏️</button>' +
        '<button type="button" onclick="window.editarPrecoTema(' + idxOriginal + ')" class="btn-acao-tabela btn-preco-tema" title="Adicionar Preço">💰</button>' +
        '<button type="button" onclick="window.removerTema(' + idxOriginal + ')" class="btn-acao-tabela btn-remover-orc" title="Remover">🗑️</button>' +
        '</td></tr>';
    });
  });

  corpo.innerHTML = html;

  // Select remover tema
  const selectRemover = document.getElementById("select-remover-tema");
  if (selectRemover) {
    const va = selectRemover.value;
    selectRemover.innerHTML = '<option value="">Selecione um tema para remover...</option>';
    State.estoqueArray.forEach((item, idx) => {
      const opt = document.createElement("option");
      opt.value = idx;
      opt.textContent = (item.nome || 'Sem nome') + ' (' + (item.categoria || 'Geral') + ') - ' + (item.quantidade || 0) + ' disp.';
      selectRemover.appendChild(opt);
    });
    if (va !== "") selectRemover.value = va;
  }
}

// ============================================================
// EDITAR TEMA (com preços)
// ============================================================
window.editarTema = function(index) {
  const tema = State.estoqueArray[index];
  if (!tema) return Utils.showToast("Tema não encontrado.", "error");
  const modal = document.getElementById("modal-editar-tema");
  if (!modal) return;
  document.getElementById("editar-tema-id").value = tema.idFirebase || "";
  document.getElementById("editar-tema-nome").value = tema.nome || "";
  document.getElementById("editar-tema-qtd").value = tema.quantidade || 1;
  document.getElementById("editar-tema-categoria").value = tema.categoria || "Outros";
  document.getElementById("editar-tema-modelo").value = tema.modelo || "";
  document.getElementById("editar-tema-preco").value = tema.preco || 0;
  document.getElementById("editar-tema-preco-reposicao").value = tema.precoReposicao || 0;
  document.getElementById("editar-tema-imagem").value = "";
  document.getElementById("editar-tema-preview").src = tema.imagem || "https://placehold.co/200x200?text=Sem+Foto";
  modal.classList.add("ativo");
};

// Botão RÁPIDO de adicionar preço
window.editarPrecoTema = function(index) {
  const tema = State.estoqueArray[index];
  if (!tema) return;
  var precoAtual = tema.preco || 0;
  var precoRepAtual = tema.precoReposicao || 0;
  var novo = prompt("💰 Preço da Locação (R$) para \"" + tema.nome + "\":", precoAtual);
  if (novo === null) return;
  var novoRep = prompt("🔧 Preço de Reposição (R$) para \"" + tema.nome + "\":", precoRepAtual);
  if (novoRep === null) return;
  ModalStatus.exibir("SALVANDO PREÇOS...", tema.nome);
  Database.atualizarPecaNuvem(tema.idFirebase, {
    preco: parseFloat(novo) || 0,
    precoReposicao: parseFloat(novoRep) || 0,
    atualizadoEm: Date.now()
  }).then(ok => {
    if (ok) ModalStatus.sucesso("✓ PREÇOS ATUALIZADOS");
    else ModalStatus.erro("Falha ao salvar.");
  });
};

window.removerTema = function(index) {
  const tema = State.estoqueArray[index];
  if (!tema) return;
  if (confirm('Remover "' + tema.nome + '"?')) {
    ModalStatus.exibir("REMOVENDO...", tema.nome);
    Database.removerPecaNuvem(tema.idFirebase).then(ok => {
      if (ok) ModalStatus.sucesso("✓ TEMA REMOVIDO");
      else ModalStatus.erro("Falha ao remover.");
    });
  }
};

function fecharModalEditar() {
  const modal = document.getElementById("modal-editar-tema");
  if (modal) modal.classList.remove("ativo");
}

function initModalEditar() {
  const modal = document.getElementById("modal-editar-tema");
  if (!modal) return;
  const btnFechar = document.getElementById("btn-fechar-editar-tema");
  if (btnFechar) btnFechar.onclick = fecharModalEditar;
  const btnCancelar = document.getElementById("btn-cancelar-editar-tema");
  if (btnCancelar) btnCancelar.onclick = fecharModalEditar;
  modal.addEventListener('click', function(e) {
    if (e.target === modal) fecharModalEditar();
  });

  const inputImagem = document.getElementById("editar-tema-imagem");
  if (inputImagem) {
    inputImagem.onchange = function(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const preview = document.getElementById("editar-tema-preview");
      const reader = new FileReader();
      reader.onload = ev => { preview.src = ev.target.result; };
      reader.readAsDataURL(file);
    };
  }

  const btnSalvar = document.getElementById("btn-salvar-editar-tema");
  if (btnSalvar) {
    btnSalvar.onclick = async function() {
      const idFirebase = document.getElementById("editar-tema-id").value;
      const nome = document.getElementById("editar-tema-nome").value.trim();
      const qtd = parseInt(document.getElementById("editar-tema-qtd").value) || 0;
      const categoria = document.getElementById("editar-tema-categoria").value.trim() || "Outros";
      const modelo = document.getElementById("editar-tema-modelo").value.trim();
      const preco = parseFloat(document.getElementById("editar-tema-preco").value) || 0;
      const precoRep = parseFloat(document.getElementById("editar-tema-preco-reposicao").value) || 0;
      const fileInput = document.getElementById("editar-tema-imagem");

      if (!idFirebase) return Utils.showToast("Erro: ID não encontrado.", "error");
      if (!nome) return Utils.showToast("Preencha o nome.", "warning");

      btnSalvar.disabled = true;
      btnSalvar.innerText = "⏳ Salvando...";
      try {
        let imagemBase64 = null;
        if (fileInput && fileInput.files && fileInput.files[0]) {
          imagemBase64 = await reduzirImagem(fileInput.files[0], 900, 0.82);
        }
        const dados = { nome, quantidade: qtd, categoria, modelo, preco, precoReposicao: precoRep, atualizadoEm: Date.now() };
        if (imagemBase64) dados.imagem = imagemBase64;
        const ok = await Database.atualizarPecaNuvem(idFirebase, dados);
        if (ok) {
          Utils.showToast("✅ Atualizado com sucesso!", "success");
          fecharModalEditar();
        } else {
          Utils.showToast("❌ Erro ao atualizar.", "error");
        }
      } catch (err) {
        Utils.showToast("❌ Erro: " + (err.message || err), "error");
      } finally {
        btnSalvar.disabled = false;
        btnSalvar.innerText = "💾 Salvar Alterações";
      }
    };
  }
}

// ============================================================
// CATEGORIAS — SELETORES
// ============================================================
function atualizarSeletoresCategoria() {
  var cats = State.categorias || [];
  const contador = document.getElementById("contador-categorias");
  if (contador) contador.textContent = cats.length;

  const container = document.getElementById("lista-categorias-admin");
  if (container) {
    container.innerHTML = '';
    cats.forEach(cat => {
      const div = document.createElement("div");
      div.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:4px 10px; background:#f8f0f2; border-radius:6px; border:1px solid #e1cbd4;";
      div.innerHTML = '<span style="font-size:13px;">📁 ' + cat + '</span>' +
        '<button type="button" onclick="window.removerCategoria(\'' + String(cat).replace(/'/g, "\\'") + '\')" class="btn btn-danger" style="padding:2px 8px; font-size:10px; width:auto; margin-left:6px;">✕</button>';
      container.appendChild(div);
    });
  }

  const selectCat = document.getElementById("catalogo-peca-categoria");
  if (selectCat) {
    const va = selectCat.value;
    selectCat.innerHTML = '';
    cats.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat; opt.textContent = cat;
      selectCat.appendChild(opt);
    });
    if (cats.indexOf(va) !== -1) selectCat.value = va;
  }

  const selectRemover = document.getElementById("select-remover-categoria");
  if (selectRemover) {
    const va2 = selectRemover.value;
    selectRemover.innerHTML = '<option value="">Selecione...</option>';
    cats.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat; opt.textContent = cat;
      selectRemover.appendChild(opt);
    });
    if (cats.indexOf(va2) !== -1) selectRemover.value = va2;
  }
}

// ============================================================
// BUSCA DE TEMA NO FORMULÁRIO
// ============================================================
function carregarSugestoesTemaFicha() {
  var input = document.getElementById("filtro-tema-input");
  if (!input) return;
  if (input.__tralalaBound) return;
  input.__tralalaBound = true;
  input.oninput = function(e) {
    renderSugestoesTemaFicha(e.target.value);
  };
  input.onfocus = function(e) {
    if (e.target.value.trim()) renderSugestoesTemaFicha(e.target.value);
  };
}

function renderSugestoesTemaFicha(termo) {
  var caixa = document.getElementById("wrapper-lista-sugestoes");
  if (!caixa) return;
  termo = (termo || "").toString().trim();
  if (!termo) { caixa.style.display = "none"; caixa.innerHTML = ""; return; }
  var tNorm = Utils.normalizar(termo);
  var filtrados = State.estoqueArray.filter(function(item) {
    return Utils.normalizar(item.nome || "").indexOf(tNorm) !== -1;
  });
  caixa.innerHTML = "";
  if (filtrados.length === 0) { caixa.style.display = "none"; return; }
  filtrados.forEach(function(item) {
    var div = document.createElement("div");
    div.className = "sugestao-item";
    var qtd = parseInt(item.quantidade) || 0;
    div.innerHTML = "⚙️ " + item.nome + " <span style='font-size:11px;color:#888;'>(" + (item.categoria||'') + ") — " + Utils.formatCurrency(item.preco||0) + "</span>";
    div.onclick = function() {
      var input = document.getElementById("filtro-tema-input");
      var hidden = document.getElementById("busca-tema-input");
      if (input) input.value = item.nome;
      if (hidden) hidden.value = item.nome;
      State.temaAtual = item.nome;
      State.temaAtualObj = item;
      caixa.style.display = "none";
      Utils.showToast("Tema " + item.nome + " selecionado.", "info");
      atualizarResumoSelecao();
    };
    caixa.appendChild(div);
  });
  caixa.style.display = "block";
}

// ============================================================
// MODAL DE PEÇAS
// ============================================================
let modalPecasContexto = "kit";

function abrirModalPecas(contexto) {
  modalPecasContexto = contexto || "kit";
  var modal = document.getElementById("modal-pecas");
  if (!modal) return;
  modal.classList.add("ativo");
  renderizarListaPecasModal(contexto, "");
  setTimeout(function() {
    var f = document.getElementById("filtro-pecas");
    if (f) f.value = "";
  }, 50);
}

function renderizarListaPecasModal(contexto, filtro) {
  var container = document.getElementById("lista-pecas-checkbox");
  if (!container) return;
  if (!filtro) filtro = "";

  var selecionadasAtuais = [];
  if (contexto === "kit") {
    selecionadasAtuais = State.kitCriando.pecas || [];
  } else if (contexto === "contrato") {
    selecionadasAtuais = State.pecasSelecionadasContrato || [];
  } else if (contexto === "kit-festa" && State.kitAtual) {
    selecionadasAtuais = State.pecasSelecionadasKit[State.kitAtual] || [];
  }

  var fNorm = Utils.normalizar(filtro);
  var pecas = State.estoqueArray.filter(function(item) {
    if (!filtro.trim()) return true;
    return Utils.normalizar(item.nome || "").indexOf(fNorm) !== -1;
  });

  if (pecas.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:20px; color:#999; font-size:13px;">Nenhuma peça encontrada.</div>';
    return;
  }

  var html = "";
  pecas.forEach(function(item) {
    var nome = item.nome || "Sem nome";
    var checked = selecionadasAtuais.indexOf(nome) !== -1 ? "checked" : "";
    var preco = Utils.formatCurrency(item.preco || 0);
    html += '<label class="peca-check-item">' +
      '<input type="checkbox" value="' + nome.replace(/"/g, '&quot;') + '" ' + checked + '>' +
      '<span class="nome-peca">' + nome + '</span>' +
      '<span class="info-peca">' + preco + ' | Qtd: ' + (item.quantidade || 1) + '</span>' +
      '</label>';
  });
  container.innerHTML = html;

  var checkboxes = container.querySelectorAll('input[type="checkbox"]');
  var contador = document.getElementById("contador-pecas-selecionadas");
  if (contador) contador.textContent = selecionadasAtuais.length + " selecionadas";

  checkboxes.forEach(function(cb) {
    cb.onchange = function() {
      var count = container.querySelectorAll('input[type="checkbox"]:checked').length;
      if (contador) contador.textContent = count + " selecionadas";
    };
  });
}

function confirmarModalPecas() {
  var container = document.getElementById("lista-pecas-checkbox");
  var selecionadas = [];
  if (container) {
    container.querySelectorAll('input[type="checkbox"]:checked').forEach(function(cb) {
      selecionadas.push(cb.value);
    });
  }

  if (modalPecasContexto === "kit") {
    State.kitCriando.pecas = selecionadas;
    atualizarInfoKitCriando();
    Utils.showToast("✅ " + selecionadas.length + " peça(s) selecionada(s)", "success");
  } else if (modalPecasContexto === "contrato") {
    State.pecasSelecionadasContrato = selecionadas;
    var selectPecas = document.getElementById("c-pecas");
    if (selectPecas) {
      for (var i = 0; i < selectPecas.options.length; i++) {
        selectPecas.options[i].selected = selecionadas.indexOf(selectPecas.options[i].value) !== -1;
      }
    }
    var info = document.getElementById("c-pecas-info");
    if (info) info.textContent = selecionadas.length + " peça(s) selecionada(s).";
    Utils.showToast("✅ " + selecionadas.length + " peça(s) no contrato", "success");
  } else if (modalPecasContexto === "kit-festa" && State.kitAtual) {
    State.pecasSelecionadasKit[State.kitAtual] = selecionadas;
    atualizarInfoKitFesta();
    atualizarResumoSelecao();
    Utils.showToast("✅ " + selecionadas.length + " peça(s) salva(s) no " + State.kitAtual, "success");
  }

  document.getElementById("modal-pecas").classList.remove("ativo");
}

// ============================================================
// MODAL DE TEMA
// ============================================================
function abrirModalTema(contexto) {
  modalTemaContexto = contexto || "kit-festa";
  var modal = document.getElementById("modal-tema-reserva");
  if (!modal) return;
  modal.classList.add("ativo");
  renderizarListaTemasModal("");
}

let modalTemaContexto = "kit-festa";

function renderizarListaTemasModal(filtro) {
  var container = document.getElementById("lista-temas-modal");
  if (!container) return;
  if (!filtro) filtro = "";

  var selecionadoAtual = "";
  if (modalTemaContexto === "kit-festa" && State.kitAtual) {
    selecionadoAtual = State.temasSelecionadosKit[State.kitAtual] || "";
  } else if (modalTemaContexto === "kit") {
    selecionadoAtual = (State.kitCriando.temas && State.kitCriando.temas[0]) || "";
  }

  var fNorm = Utils.normalizar(filtro);
  var filtrados = State.estoqueArray.filter(function(item) {
    if (!filtro.trim()) return true;
    return Utils.normalizar(item.nome || "").indexOf(fNorm) !== -1;
  });

  if (filtrados.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:20px; color:#999; font-size:13px;">Nenhum tema encontrado.</div>';
    return;
  }

  var html = "";
  filtrados.forEach(function(item) {
    var nome = item.nome || "Sem nome";
    var selClass = (selecionadoAtual === nome) ? " selecionado" : "";
    html += '<div class="item-tema-selecionavel' + selClass + '" data-tema="' + nome.replace(/"/g, '&quot;') + '">' +
      '⚙️ ' + nome + ' <span style="font-size:11px;color:var(--text-muted);">(' + (item.categoria || 'Geral') + ') ' + Utils.formatCurrency(item.preco||0) + '</span>' +
      '</div>';
  });
  container.innerHTML = html;

  container.querySelectorAll('.item-tema-selecionavel').forEach(function(el) {
    el.onclick = function() {
      container.querySelectorAll('.item-tema-selecionavel').forEach(function(x) { x.classList.remove('selecionado'); });
      el.classList.add('selecionado');
    };
  });
}

function confirmarModalTema() {
  var container = document.getElementById("lista-temas-modal");
  if (!container) return;
  var selecionado = container.querySelector('.item-tema-selecionavel.selecionado');
  if (!selecionado) return Utils.showToast("Clique em um tema antes de confirmar.", "warning");
  var tema = selecionado.getAttribute("data-tema");

  if (modalTemaContexto === "kit-festa" && State.kitAtual) {
    State.temasSelecionadosKit[State.kitAtual] = tema;
    var filtro = document.getElementById("filtro-tema-input");
    var hidden = document.getElementById("busca-tema-input");
    if (filtro) filtro.value = tema;
    if (hidden) hidden.value = tema;
    State.temaAtual = tema;
    State.temaAtualObj = State.estoqueMap[tema] || null;
    atualizarInfoKitFesta();
    atualizarResumoSelecao();
    Utils.showToast("✅ Tema \"" + tema + "\" selecionado", "success");
  } else if (modalTemaContexto === "kit") {
    State.kitCriando.temas = [tema];
    atualizarInfoKitCriando();
    Utils.showToast("✅ Tema \"" + tema + "\"", "success");
  }

  document.getElementById("modal-tema-reserva").classList.remove("ativo");
}

function atualizarInfoKitFesta() {
  var info = document.getElementById("kit-acoes-info");
  if (!info) return;
  if (!State.kitAtual) { info.textContent = "Nenhuma peça selecionada ainda"; return; }
  var pecas = State.pecasSelecionadasKit[State.kitAtual] || [];
  var tema = State.temasSelecionadosKit[State.kitAtual] || "";
  var partes = [];
  if (pecas.length > 0) partes.push(pecas.length + " peça(s)");
  if (tema) partes.push("Tema: " + tema);
  info.textContent = partes.length > 0 ? partes.join(" | ") : "Nenhuma peça selecionada ainda";
}

function atualizarInfoKitCriando() {
  var info = document.getElementById("kit-info-selecao");
  if (!info) return;
  var pecas = State.kitCriando.pecas || [];
  var temas = State.kitCriando.temas || [];
  var partes = [];
  if (pecas.length > 0) partes.push("📦 Peças: " + pecas.length);
  if (temas.length > 0) partes.push("🎨 Tema: " + temas.join(", "));
  info.innerHTML = partes.length > 0 ? partes.join(" | ") : "Nenhuma peça ou tema selecionado ainda.";
}

// ============================================================
// RESUMO DE SELEÇÃO (festa)
// ============================================================
function atualizarResumoSelecao() {
  var box = document.getElementById("resumo-selecao");
  var content = document.getElementById("resumo-temas-pecas");
  if (!box || !content) return;

  var html = "";
  var temAlgo = false;

  // Tema
  if (State.temaAtual) {
    temAlgo = true;
    var itemT = State.estoqueMap[State.temaAtual];
    var precoT = itemT ? (itemT.preco || 0) : 0;
    html += '<div style="margin-bottom:6px;">🎨 <b>Tema:</b> ' + State.temaAtual + ' — ' + Utils.formatCurrency(precoT) + '</div>';
  }

  // Peças por kit
  if (State.kitAtual && State.pecasSelecionadasKit[State.kitAtual]) {
    var pecas = State.pecasSelecionadasKit[State.kitAtual];
    if (pecas.length > 0) {
      temAlgo = true;
      html += '<div style="margin-bottom:6px;">📦 <b>Peças (' + State.kitAtual + '):</b><br>';
      pecas.forEach(function(nome) {
        var item = State.estoqueMap[nome];
        var preco = item ? (item.preco || 0) : 0;
        html += '&nbsp;&nbsp;• ' + nome + ' — ' + Utils.formatCurrency(preco) + '<br>';
      });
      html += '</div>';
    }
  }

  if (!temAlgo) {
    box.style.display = "none";
    return;
  }

  content.innerHTML = html;
  box.style.display = "block";
}

// ============================================================
// SOMA AUTOMÁTICA
// ============================================================
function calcularSomaAutomatica() {
  var total = 0;
  var detalhes = "";

  // Tema (se selecionado e for item avulso)
  if (State.temaAtual) {
    var itemT = State.estoqueMap[State.temaAtual];
    if (itemT) {
      var precoT = parseFloat(itemT.preco) || 0;
      total += precoT;
      detalhes += "🎨 Tema " + itemT.nome + ": " + Utils.formatCurrency(precoT) + "<br>";
    }
  }

  // Peças selecionadas por kit
  if (State.kitAtual && State.pecasSelecionadasKit[State.kitAtual]) {
    var pecas = State.pecasSelecionadasKit[State.kitAtual];
    pecas.forEach(function(nome) {
      var item = State.estoqueMap[nome];
      if (item) {
        var p = parseFloat(item.preco) || 0;
        total += p;
        detalhes += "📦 " + nome + ": " + Utils.formatCurrency(p) + "<br>";
      }
    });
  }

  State.somaAutomatica = total;

  var div = document.getElementById("detalhes-soma");
  if (div) {
    div.innerHTML = detalhes + '<div style="margin-top:8px; padding-top:8px; border-top:1px solid #ccc;"><b>Subtotal: ' + Utils.formatCurrency(total) + '</b></div>';
  }

  var inputValorFesta = document.getElementById("valor-festa");
  if (inputValorFesta) {
    inputValorFesta.value = total.toFixed(2);
    recalcularTotais();
  }

  Utils.showToast("Soma calculada: " + Utils.formatCurrency(total), "success");
}

// ============================================================
// DESCONTO
// ============================================================
function aplicarDesconto() {
  var tipoEl = document.getElementById("desconto-tipo");
  var valorEl = document.getElementById("desconto-valor");
  if (!tipoEl || !valorEl) return;

  var tipo = tipoEl.value;
  var valor = parseFloat(valorEl.value) || 0;
  var inputValorFesta = document.getElementById("valor-festa");
  var original = inputValorFesta ? (parseFloat(inputValorFesta.value) || 0) : 0;

  var desconto = 0;
  if (tipo === "percent") {
    desconto = original * (valor / 100);
  } else {
    desconto = valor;
  }
  if (desconto > original) desconto = original;
  if (desconto < 0) desconto = 0;

  var final = original - desconto;
  State.descontoAplicado = { tipo: tipo, valor: valor, totalOriginal: original, totalFinal: final };

  var resultado = document.getElementById("resultado-desconto");
  if (resultado) {
    resultado.innerHTML =
      '<div>💵 Valor original: <b>' + Utils.formatCurrency(original) + '</b></div>' +
      '<div>🏷️ Desconto: <b style="color:#e74c3c;">- ' + Utils.formatCurrency(desconto) + '</b></div>' +
      '<div style="margin-top:5px;">✅ Valor com desconto: <b style="color:#27ae60; font-size:15px;">' + Utils.formatCurrency(final) + '</b></div>';
  }

  if (inputValorFesta) {
    inputValorFesta.value = final.toFixed(2);
    recalcularTotais();
  }

  Utils.showToast("Desconto aplicado!", "success");
}

// ============================================================
// RENDER: RESERVAS
// ============================================================
function renderReservas(filtro) {
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
    card.innerHTML = '<div class="reserva-header"><strong>👶 ' + (res.cliente || '') + '</strong>' +
      '<span class="reserva-badge" style="background:' + (quitado ? '#27ae60' : '#e67e22') + ';">' +
      (quitado ? 'PAGO 100%' : 'PENDENTE') + '</span></div>' +
      '<div class="reserva-body">' +
      '<p>📅 Data: <b>' + Utils.formatDateBR(res.data) + '</b></p>' +
      '<p>🆔 CPF: <b>' + (res.cpf || '—') + '</b></p>' +
      '<p>🎨 Tema: <b style="color:var(--primary);">' + (res.tema || '') + '</b></p>' +
      '<p>🛍️ Kit: <b>' + (res.kit || 'Não informado') + '</b></p>' +
      (res.montarNoLocal ? '<p>🛠️ Montagem: <b style="color:#27ae60;">SIM</b></p>' : '') +
      '<p>🚚 Frete: <b>' + Utils.formatCurrency(frete) + '</b></p>' +
      '<p>💰 Total: <b>' + Utils.formatCurrency(totGeral) + '</b></p>' +
      '<p>💵 Sinal: <b>' + Utils.formatCurrency(sinal) + '</b></p>' +
      '<p style="color:' + (quitado ? 'green' : 'red') + '">⚠️ Falta: <b>' + Utils.formatCurrency(devedor) + '</b></p>' +
      '</div>' +
      '<button type="button" style="width:100%; padding:8px; margin-top:10px; background:var(--error); color:#fff; border:none; border-radius:4px; cursor:pointer;" onclick="window.DeletarReserva(\'' + res.id + '\')">🗑️ Excluir</button>';
    container.appendChild(card);
  });
}

window.DeletarReserva = function(idReserva) {
  if (confirm("Excluir este agendamento?")) {
    Database.excluirReservaNuvem(idReserva).then(function() {
      Utils.showToast("Agendamento removido!", "success");
    }).catch(function() { Utils.showToast("Falha ao remover.", "error"); });
  }
};

// ============================================================
// RENDER: ORÇAMENTOS
// ============================================================
function renderOrcamentos() {
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
          '<button type="button" onclick="window.PromoverOrcamento(\'' + orc.id + '\')" class="btn-acao-tabela btn-promover" title="Promover">✅</button>' +
          '<button type="button" onclick="window.ExcluirOrcamento(\'' + orc.id + '\')" class="btn-acao-tabela btn-remover-orc" title="Excluir">🗑️</button>' +
          '</td></tr>';
      } else {
        html += '<div class="card-reserva"><div class="reserva-header"><strong>👤 ' + (orc.cliente || '') + '</strong></div>' +
          '<div class="reserva-body">' +
          '<p>📅 Data: <b>' + Utils.formatDateBR(orc.dataFesta) + '</b></p>' +
          '<p>🎨 Tema: <b>' + (orc.tema || '') + '</b></p>' +
          (orc.kit ? '<p>🛍️ Kit: <b>' + orc.kit + '</b></p>' : '') +
          '<p>💰 Total: <b>' + totalFmt + '</b></p>' +
          '</div></div>';
      }
    });
    container.innerHTML = html;
  });
}

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
  var elCpf = document.getElementById("cliente-cpf");
  var elData = document.getElementById("data");
  var elTotal = document.getElementById("valor-total");
  var elValorFesta = document.getElementById("valor-festa");
  var elObs = document.getElementById("adicionais-festa");
  var hidden = document.getElementById("busca-tema-input");
  var filtro = document.getElementById("filtro-tema-input");
  if (elCliente) elCliente.value = orc.cliente || "";
  if (elCpf) elCpf.value = orc.cpf || "";
  if (elData && orc.dataFesta) elData.value = orc.dataFesta;
  if (elTotal) elTotal.value = orc.total || "";
  if (elValorFesta) elValorFesta.value = orc.valorFesta || "";
  if (elObs) elObs.value = orc.obs || "";
  if (orc.tema) {
    if (hidden) hidden.value = orc.tema;
    if (filtro) filtro.value = orc.tema;
    State.temaAtual = orc.tema;
    State.temaAtualObj = State.estoqueMap[orc.tema] || null;
  }
  if (orc.kit) {
    State.kitAtual = orc.kit;
    document.querySelectorAll('.btn-kit-opcao').forEach(function(b) {
      b.classList.toggle('ativo', b.getAttribute('data-kit') === orc.kit);
    });
    var box = document.getElementById("kit-acoes-box");
    var nome = document.getElementById("kit-acoes-nome");
    if (box) box.classList.add("ativo");
    if (nome) nome.textContent = orc.kit;
  }
  if (orc.freteKmIda) {
    var kmEl = document.getElementById("calc-km");
    var precoEl = document.getElementById("calc-valor-litro");
    var chkSegunda = document.getElementById("chk-segunda-viagem");
    if (kmEl) kmEl.value = orc.freteKmIda;
    if (precoEl && orc.fretePrecoCombustivel) precoEl.value = orc.fretePrecoCombustivel;
    if (chkSegunda) chkSegunda.checked = !!orc.freteSegundaViagem;
    FreteCalc.renderizar();
  }
  Utils.showToast("Orçamento carregado. Revise e confirme.", "success");
  var painelOrc = document.getElementById("painel-orcamentos-salvos");
  if (painelOrc) painelOrc.style.display = "none";
  window.scrollTo({ top: 0, behavior: 'smooth' });
  atualizarResumoSelecao();
};

// ============================================================
// RENDER: REUNIÕES
// ============================================================
function iniciarPainelReunioes() {
  if (!db) return;
  db.ref('reunioes').on('value', function(snap) {
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
    arr.sort(function(a, b) { return new Date(a.dataHora || 0) - new Date(b.dataHora || 0); });
    var container = document.getElementById("lista-reunioes-container");
    if (!container) return;
    if (arr.length === 0) {
      container.innerHTML = '<p style="color:#999; text-align:center;">Nenhuma reunião agendada.</p>';
      return;
    }
    var html = "";
    arr.forEach(function(r) {
      var dataFmt = r.dataHora ? r.dataHora.replace('T', ' às ') : 'Não informada';
      html += '<div class="card-reuniao" style="border-left-color:#27ae60;">' +
        '<div class="reserva-header"><strong>👤 ' + (r.cliente || 'Sem nome') + '</strong>' +
        '<span class="reserva-badge" style="background:#27ae60;">AGENDADA</span></div>' +
        '<div class="reserva-body">' +
        '<p>📅 ' + dataFmt + '</p>' +
        (r.pauta ? '<p>📝 ' + r.pauta + '</p>' : '') +
        '</div>' +
        '<button type="button" style="width:100%; padding:6px; margin-top:8px; background:#e74c3c; color:#fff; border:none; border-radius:4px; cursor:pointer;" onclick="window.ExcluirReuniao(\'' + r.id + '\')">🗑️ Excluir</button>' +
        '</div>';
    });
    container.innerHTML = html;
  });
}

window.ExcluirReuniao = function(idReuniao) {
  if (confirm("Excluir esta reunião?")) {
    Database.excluirReuniaoNuvem(idReuniao).then(function() {
      Utils.showToast("Reunião removida!", "success");
    }).catch(function() { Utils.showToast("Falha ao remover.", "error"); });
  }
};

// ============================================================
// PLANILHA E GRÁFICO
// ============================================================
function renderPlanilhaVendas() {
  var tbody = document.querySelector("#tabela-planilha-corpo tbody");
  if (!tbody) return;
  var mesSelecionado = (document.getElementById("seletor-mes-planilha") || {}).value || "";
  var reservasDoMes = State.reservas.filter(function(r) {
    if (!r.data) return false;
    var p = r.data.split("-");
    if (p.length !== 3) return false;
    var idx = parseInt(p[1]) - 1;
    return mesesAno[idx] === mesSelecionado;
  });
  if (reservasDoMes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#999; padding:15px;">Nenhuma venda neste mês.</td></tr>';
    return;
  }
  var html = "";
  reservasDoMes.forEach(function(r) {
    var total = parseFloat(r.total) || 0;
    var frete = parseFloat(r.frete) || 0;
    html += '<tr><td>' + (r.cliente || '') + '</td><td>' + (r.kit || 'Não informado') + '</td>' +
      '<td>R$ ' + (total + frete).toFixed(2) + '</td><td style="text-align:center;">—</td></tr>';
  });
  tbody.innerHTML = html;
}

function renderGraficoAnual() {
  if (typeof Chart === 'undefined') return;
  var painel = document.getElementById('painel-grafico-faturamento');
  if (painel) painel.style.display = 'block';
  var ctx = document.getElementById('graficoAnual');
  if (!ctx) return;
  if (chartInstance) chartInstance.destroy();
  var valores = new Array(12).fill(0);
  State.reservas.forEach(function(r) {
    if (!r.data) return;
    var p = r.data.split("-");
    if (p.length !== 3) return;
    var idx = parseInt(p[1]) - 1;
    if (idx >= 0 && idx < 12) valores[idx] += (parseFloat(r.total) || 0) + (parseFloat(r.frete) || 0);
  });
  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels: mesesAno, datasets: [{ label: 'Faturamento (R$)', data: valores, backgroundColor: '#a3536a' }] },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

// ============================================================
// PONTOS — RELATÓRIO
// ============================================================
function renderRelatorioGeralPontos(dadosPontos) {
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
}

// ============================================================
// CONTRATO — TEMPLATES
// ============================================================
function gerarContratoPegueMonte(dados) {
  var dataFmt = dados.data ? dados.data.split("-").reverse().join("/") : "____/____/______";
  var valorFmt = dados.valor ? dados.valor.toFixed(2).replace('.', ',') : "______,____";
  var dataAtual = new Date().toLocaleDateString('pt-BR');
  var pecasTexto = dados.pecas && dados.pecas.length > 0 ? dados.pecas.join(", ") : "__________________________________";

  return '<div class="pagina-contrato">' +
    '<div class="logo-container"><img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT2qBAlvPlxMFaok_zho9se2IT9smgKtY9Dvg&s" class="logo-contrato"></div>' +
    '<div class="titulo-contrato">CONTRATO DE LOCAÇÃO PEGUE & MONTE</div>' +
    '<div class="dados-contratada"><span class="negrito">CONTRATADA:</span> TRALALÁ DECORAÇÕES DE FESTAS CNPJ: 21.918.863/0001-12 E-MAIL: tralaladecoracoes@gmail.com</div>' +
    '<div class="dados-contratante"><span class="negrito">CONTRATANTE:</span> ' + (dados.nome || "_________________________") + '</div>' +
    '<div class="dados-contratante"><span class="negrito">CPF:</span> ' + (dados.cpf || "_________________________") + '</div>' +
    '<div class="dados-contratante"><span class="negrito">ENDEREÇO:</span> ' + (dados.endereco || "_________________________") + '</div>' +
    '<div class="dados-contratante"><span class="negrito">TELEFONE:</span> ' + (dados.telefone || "(61) ________________") + '</div>' +
    '<div class="dados-contratante"><span class="negrito">DATA DA FESTA:</span> ' + dataFmt + '</div>' +
    '<p style="margin-top:4px;">As partes acima identificadas têm, entre si, justo e acertado o presente contrato de prestação de serviços.</p>' +

    '<div class="clausula-titulo">DO OBJETO DO CONTRATO</div>' +
    '<div class="clausula-texto"><span class="negrito">Cláusula 1ª.</span> É objeto do presente contrato a prestação de serviço de Locação de:</div>' +
    '<table class="tabela-itens"><thead><tr><th>DESCRIÇÃO</th><th>VALOR</th></tr></thead><tbody>' +
    '<tr><td>' + pecasTexto + '</td><td>R$ ' + valorFmt + '</td></tr>' +
    '</tbody></table>' +

    '<div class="clausula-titulo">DO PAGAMENTO</div>' +
    '<div class="clausula-texto"><span class="negrito">Cláusula 2ª.</span> O serviço deverá ser pago no ato da reserva.</div>' +
    '<div class="clausula-texto">Em dinheiro ou PIX: CNPJ 21.918.863/0001-12</div>' +

    '<div class="clausula-titulo">DA DEVOLUÇÃO</div>' +
    '<div class="clausula-texto">A CONTRATANTE deverá retirar e entregar os itens no endereço: QN 508 CONJUNTO 03 LOJA 06, Samambaia Sul.</div>' +
    '<div class="clausula-texto">Caso haja perda, danos ou quebra, a CONTRATANTE arcará com 50% do valor de reposição.</div>' +

    '<div style="text-align:center; margin-top:8px;">Brasília-DF, ' + dataAtual + '.</div>' +
    '<div class="assinatura"><div class="linha-assinatura"></div><div class="assinatura-nome">TRALALÁ DECORAÇÕES — CNPJ: 21.918.863/0001-12</div></div>' +
    '<div class="assinatura"><div class="linha-assinatura"></div><div class="assinatura-nome">' + (dados.nome || "CONTRATANTE") + '</div></div>' +
    '<div class="rodape-loja">TRALALÁ DECORAÇÕES DE FESTAS — QN 508 CONJUNTO 03 LOJA 06, SAMAMBAIA SUL. (61) 9.8191-9559</div>' +
  '</div>';
}

function gerarContratoComFrete(dados) {
  var dataFmt = dados.data ? dados.data.split("-").reverse().join("/") : "____/____/______";
  var valorFmt = dados.valor ? dados.valor.toFixed(2).replace('.', ',') : "______,____";
  var valorMetade = dados.valor ? (dados.valor/2).toFixed(2).replace('.', ',') : "______,____";
  var dataAtual = new Date().toLocaleDateString('pt-BR');
  var pecasTexto = dados.pecas && dados.pecas.length > 0 ? dados.pecas.join(", ") : "__________________________________";

  return '<div class="pagina-contrato">' +
    '<div class="logo-container"><img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT2qBAlvPlxMFaok_zho9se2IT9smgKtY9Dvg&s" class="logo-contrato"></div>' +
    '<div class="titulo-contrato">CONTRATO DE PRESTAÇÃO DE SERVIÇOS PARA LOCAÇÃO</div>' +
    '<div class="dados-contratada"><span class="negrito">CONTRATADA:</span> TRALALÁ DECORAÇÕES DE FESTAS — CNPJ: 21.918.863/0001-12</div>' +
    '<div class="dados-contratante"><span class="negrito">CONTRATANTE:</span> ' + (dados.nome || "_________________________") + '</div>' +
    '<div class="dados-contratante"><span class="negrito">CPF:</span> ' + (dados.cpf || "_________________________") + '</div>' +
    '<div class="dados-contratante"><span class="negrito">ENDEREÇO:</span> ' + (dados.endereco || "_________________________") + '</div>' +
    '<div class="dados-contratante"><span class="negrito">TELEFONE:</span> ' + (dados.telefone || "(61) ________________") + '</div>' +
    '<div class="dados-contratante"><span class="negrito">LOCAL DO EVENTO:</span> ' + (dados.local || "_________________________") + '</div>' +
    '<div class="dados-contratante"><span class="negrito">DATA DA FESTA:</span> ' + dataFmt + (dados.horario ? ' às ' + dados.horario : '') + '</div>' +
    '<br>' +

    '<div class="clausula-titulo">DO OBJETO DO CONTRATO</div>' +
    '<div class="clausula-texto"><span class="negrito">Cláusula 1ª.</span> É objeto do presente contrato a prestação de serviço de Locação de:</div>' +
    '<table class="tabela-itens"><thead><tr><th>DESCRIÇÃO</th><th>VALOR</th></tr></thead><tbody>' +
    '<tr><td>' + pecasTexto + '</td><td>R$ ' + valorFmt + '</td></tr>' +
    '</tbody></table>' +

    '<div class="clausula-titulo">DOS VALORES E PAGAMENTO</div>' +
    '<div class="clausula-texto">Valor total: R$ ' + valorFmt + ', pago da seguinte forma:</div>' +
    '<div class="paragrafo">• R$ ' + valorMetade + ' (no ato da reserva);</div>' +
    '<div class="paragrafo">• R$ ' + valorMetade + ' (na montagem da festa).</div>' +
    '<div class="clausula-texto">PIX CNPJ: 21.918.863/0001-12</div>' +

    '<div class="clausula-titulo">DA DEVOLUÇÃO</div>' +
    '<div class="clausula-texto">Caso haja perda, danos ou quebra, a CONTRATANTE arcará com 50% do valor de reposição.</div>' +

    '<div style="text-align:center; margin-top:8px;">Brasília-DF, ' + dataAtual + '.</div>' +
    '<div class="assinatura"><div class="linha-assinatura"></div><div class="assinatura-nome">TRALALÁ DECORAÇÕES — CNPJ: 21.918.863/0001-12</div></div>' +
    '<div class="assinatura"><div class="linha-assinatura"></div><div class="assinatura-nome">' + (dados.nome || "CONTRATANTE") + '</div></div>' +
    '<div class="rodape-loja">TRALALÁ DECORAÇÕES DE FESTAS — QN 508 CONJUNTO 03 LOJA 06, SAMAMBAIA SUL. (61) 9.8191-9551</div>' +
  '</div>';
}

// ============================================================
// CONTRATO — POPULAR PEÇAS
// ============================================================
function carregarTemasNoContrato() {
  var select = document.getElementById("c-pecas");
  if (!select) return;
  select.innerHTML = "";
  State.estoqueArray.forEach(function(item) {
    var opt = document.createElement("option");
    opt.value = item.nome || "";
    opt.textContent = (item.nome || 'Sem nome') + ' (' + Utils.formatCurrency(item.preco||0) + ')';
    select.appendChild(opt);
  });
}

function popularSelectPecasContrato(tema) {
  var select = document.getElementById("c-pecas");
  if (!select) return;
  select.innerHTML = "";
  if (!tema) { carregarTemasNoContrato(); return; }
  var infoTema = State.estoqueMap[tema];
  var categoriaTema = infoTema && infoTema.categoria ? infoTema.categoria : "";
  var doTema = State.estoqueArray.filter(function(i) {
    return (i.nome === tema) || (categoriaTema && i.categoria === categoriaTema);
  });
  var lista = doTema.length ? doTema : State.estoqueArray;
  lista.forEach(function(item) {
    var opt = document.createElement("option");
    opt.value = item.nome || "";
    opt.textContent = (item.nome || 'Sem nome') + ' (' + Utils.formatCurrency(item.preco||0) + ')';
    select.appendChild(opt);
  });
}

function initContratoBusca() {
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
    var filtrados = State.estoqueArray.filter(function(i) {
      return Utils.normalizar(i.nome || "").indexOf(tNorm) !== -1;
    });
    caixa.innerHTML = "";
    filtrados.forEach(function(item) {
      var div = document.createElement("div");
      div.className = "sugestao-item";
      div.innerText = item.nome;
      div.onclick = function() {
        input.value = item.nome;
        if (hidden) hidden.value = item.nome;
        caixa.style.display = "none";
        popularSelectPecasContrato(item.nome);
      };
      caixa.appendChild(div);
    });
    caixa.style.display = filtrados.length ? "block" : "none";
  };
}

// ============================================================
// GERAR CONTRATO AVULSO
// ============================================================
function gerarContratoAvulso(gerarPdf) {
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

  if (!nome.trim()) { Utils.showToast("Preencha o nome do contratante!", "warning"); return; }

  var dados = {
    nome, cpf, data, horario, valor, endereco, telefone, local,
    dataRetirada: data, dataDevolucao: data, tema, pecas, obs
  };

  var html = modelo === "com-frete" ? gerarContratoComFrete(dados) : gerarContratoPegueMonte(dados);

  // Salvar sem travar o fluxo
  Database.salvarContratoNuvem({
    nome, cpf, data, horario, valor, endereco, telefone, local, modelo,
    tema, pecas, obs, criadoEm: Date.now()
  }).then(function() {
    Utils.showToast("✅ Contrato salvo!", "success");
  }).catch(function(err) {
    console.warn("Erro ao salvar contrato (não bloqueia):", err);
    Utils.showToast("⚠️ Contrato gerado, mas não foi salvo na nuvem.", "warning");
  });

  var preview = document.getElementById("contrato-preview-content");
  if (preview) preview.innerHTML = html;
  var modalVis = document.getElementById("modal-visualizar-contrato");
  if (modalVis) modalVis.classList.add("ativo");

  if (gerarPdf) setTimeout(function() { gerarContratoPDF(); }, 300);
}

function gerarContratoPDF() {
  var elemento = document.getElementById("contrato-preview-content");
  if (!elemento) return;
  if (typeof html2pdf === 'undefined') { alert("Biblioteca PDF não carregada."); return; }
  var nome = (document.getElementById("c-nome") || {}).value || (document.getElementById("nome-cliente") || {}).value || "contrato";
  html2pdf().from(elemento).set({
    margin: 0,
    filename: 'contrato-' + nome.replace(/\s+/g, '-').toLowerCase() + '.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).save().then(function() {
    Utils.showToast("PDF baixado!", "success");
  }).catch(function(err) {
    console.error(err);
    Utils.showToast("Erro ao gerar PDF.", "error");
  });
}

// ============================================================
// GERADOR DE KITS
// ============================================================
function renderKits() {
  var container = document.getElementById("lista-kits-render");
  if (!container) return;
  if (State.kits.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:#999;">Nenhum kit cadastrado ainda.</p>';
    return;
  }
  var html = "";
  State.kits.forEach(function(kit) {
    var pecas = kit.pecas || [];
    var temas = kit.temas || [];
    var total = 0;
    pecas.forEach(function(nome) {
      var it = State.estoqueMap[nome];
      if (it) total += (parseFloat(it.preco) || 0);
    });
    temas.forEach(function(nome) {
      var it = State.estoqueMap[nome];
      if (it) total += (parseFloat(it.preco) || 0);
    });
    var img = kit.imagem ? '<img src="' + kit.imagem + '" style="width:70px;height:70px;object-fit:cover;border-radius:8px;margin-right:10px;">' : '';
    html += '<div class="card-kit">' +
      '<div class="kit-header">' +
        '<strong>🎁 ' + (kit.nome || 'Sem Nome') + '</strong>' +
        '<span class="badge-contador">Qtd: ' + (kit.quantidade || 1) + '</span>' +
      '</div>' +
      '<div class="kit-body" style="display:flex;">' +
        img +
        '<div style="flex:1;">' +
          '<div>🎨 <b>Temas:</b> ' + (temas.length ? temas.join(", ") : "—") + '</div>' +
          '<div>📦 <b>Peças (' + pecas.length + '):</b> ' + (pecas.length ? pecas.slice(0,5).join(", ") + (pecas.length > 5 ? '...' : '') : "—") + '</div>' +
          '<div>💰 <b>Valor sugerido:</b> ' + Utils.formatCurrency(total) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="kit-actions">' +
        '<button class="btn-promover-kit" onclick="window.promoverKitParaFesta(\'' + kit.id + '\')">✅ Promover p/ Festa</button>' +
        '<button class="btn-remover-kit" onclick="window.removerKit(\'' + kit.id + '\')">🗑️ Remover</button>' +
      '</div>' +
    '</div>';
  });
  container.innerHTML = html;
}

window.promoverKitParaFesta = function(idKit) {
  var kit = State.kits.filter(function(k) { return k.id === idKit; })[0];
  if (!kit) return;

  // Preencher o nome do kit personalizado? Aqui coloca como "Kit Custom"
  // Mas o usuário pode querer que vá como "Kit Personalizado"
  var nomeKitFesta = "Kit Customizado";

  // Marcar botão de kit (visual) — desmarca todos e não marca nenhum padrão
  document.querySelectorAll('.btn-kit-opcao').forEach(function(b) { b.classList.remove('ativo'); });
  State.kitAtual = nomeKitFesta;

  // Colocar peças
  State.pecasSelecionadasKit[nomeKitFesta] = kit.pecas || [];
  // Colocar tema (primeiro)
  if (kit.temas && kit.temas.length > 0) {
    State.temasSelecionadosKit[nomeKitFesta] = kit.temas[0];
    State.temaAtual = kit.temas[0];
    State.temaAtualObj = State.estoqueMap[kit.temas[0]] || null;
    var filtro = document.getElementById("filtro-tema-input");
    var hidden = document.getElementById("busca-tema-input");
    if (filtro) filtro.value = kit.temas[0];
    if (hidden) hidden.value = kit.temas[0];
  }

  // Mostrar caixa de ações do kit
  var box = document.getElementById("kit-acoes-box");
  var nome = document.getElementById("kit-acoes-nome");
  if (box) box.classList.add("ativo");
  if (nome) nome.textContent = nomeKitFesta;

  atualizarInfoKitFesta();
  atualizarResumoSelecao();

  // Calcular soma automática
  calcularSomaAutomatica();

  // Fechar painel kits e voltar pra festa
  var painelKits = document.getElementById("painel-gerador-kits");
  if (painelKits) painelKits.style.display = "none";
  window.scrollTo({ top: 0, behavior: 'smooth' });
  Utils.showToast("✅ Kit promovido! Preencha os dados do cliente.", "success");
};

window.removerKit = function(idKit) {
  if (confirm("Remover este kit?")) {
    Database.excluirKitNuvem(idKit).then(function() {
      Utils.showToast("Kit removido!", "success");
    }).catch(function() { Utils.showToast("Falha ao remover.", "error"); });
  }
};

function salvarKit() {
  var nomeEl = document.getElementById("kit-nome");
  var qtdEl = document.getElementById("kit-quantidade");
  var imgInput = document.getElementById("kit-imagem");
  var nome = nomeEl ? nomeEl.value.trim() : "";
  var qtd = qtdEl ? (parseInt(qtdEl.value) || 1) : 1;

  if (!nome) return Utils.showToast("Preencha o nome do kit.", "warning");
  if (!State.kitCriando.pecas || State.kitCriando.pecas.length === 0) {
    if (!State.kitCriando.temas || State.kitCriando.temas.length === 0) {
      return Utils.showToast("Selecione pelo menos uma peça ou tema.", "warning");
    }
  }

  var processar = function(img) {
    ModalStatus.exibir("SALVANDO KIT...", nome);
    Database.salvarKitNuvem({
      nome: nome,
      quantidade: qtd,
      pecas: State.kitCriando.pecas || [],
      temas: State.kitCriando.temas || [],
      imagem: img || "",
      criadoEm: Date.now()
    }).then(function() {
      ModalStatus.sucesso("✓ KIT SALVO");
      // Reset
      if (nomeEl) nomeEl.value = "";
      if (qtdEl) qtdEl.value = "1";
      if (imgInput) imgInput.value = "";
      State.kitCriando = { nome: "", quantidade: 1, pecas: [], temas: [], imagem: "" };
      atualizarInfoKitCriando();
    }).catch(function() {
      ModalStatus.erro("Erro ao salvar kit.");
    });
  };

  if (imgInput && imgInput.files && imgInput.files[0]) {
    reduzirImagem(imgInput.files[0], 600, 0.85).then(processar).catch(function() { processar(""); });
  } else {
    processar("");
  }
}

// ============================================================
// LOGIN / LOGOUT
// ============================================================
function handleLogin() {
  var emailEl = document.getElementById("email");
  var senhaEl = document.getElementById("senha");
  var email = emailEl ? emailEl.value.trim() : "";
  var senha = senhaEl ? senhaEl.value : "";
  if (!email || !senha) return Utils.showToast("Preencha e-mail e senha.", "warning");
  if (CONFIG.usuarios[email] === senha) {
    State.usuarioLogadoEmail = email;
    var sLogin = document.getElementById("secao-login");
    var sVerif = document.getElementById("secao-verificador");
    if (sLogin) sLogin.style.display = "none";
    if (sVerif) sVerif.style.display = "block";
    var nome = document.getElementById("nome-usuario");
    if (nome) nome.innerHTML = "👤 <b>" + email.split('@')[0] + "</b>";
    Utils.showToast("Login realizado!", "success");
    try { Database.listenPontoUsuario(); } catch (e) {}

    if (email === "leonardodovalle@gmail.com" || email === "tralaladecoracoes@gmail.com" || email === "jorgeguivalle@gmail.com") {
      Database.listenPontosGeral();
    }
  } else {
    Utils.showToast("E-mail ou senha incorretos.", "error");
  }
}

function handleLogout() { window.location.reload(); }

// ============================================================
// SALVAR FESTA (RESERVA)
// ============================================================
function handleSalvarFesta() {
  var elCliente = document.getElementById("nome-cliente");
  var elCpf = document.getElementById("cliente-cpf");
  var elTelefone = document.getElementById("cliente-telefone");
  var elEndereco = document.getElementById("cliente-endereco");
  var elLocal = document.getElementById("local-evento");
  var elData = document.getElementById("data");
  var elTotal = document.getElementById("valor-total");
  var elSinal = document.getElementById("valor-sinal");
  var elObs = document.getElementById("adicionais-festa");
  var elValorFesta = document.getElementById("valor-festa");
  var hidden = document.getElementById("busca-tema-input");
  var filtro = document.getElementById("filtro-tema-input");

  var cliente = elCliente ? elCliente.value.trim() : "";
  var cpf = elCpf ? elCpf.value.trim() : "";
  var telefone = elTelefone ? elTelefone.value.trim() : "";
  var endereco = elEndereco ? elEndereco.value.trim() : "";
  var local = elLocal ? elLocal.value.trim() : "";
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

  var f = FreteCalc.calcular();

  var pecasDoKit = State.pecasSelecionadasKit[State.kitAtual] || [];
  var temaDoKit = State.temasSelecionadosKit[State.kitAtual] || State.temaAtual;
  var modeloContrato = (document.getElementById("modelo-contrato") || {}).value || "pegue-monte";

  var dadosReserva = {
    cliente, cpf, telefone, endereco, local, data,
    tema: temaDoKit, kit: State.kitAtual,
    pecas: pecasDoKit,
    montarNoLocal: !!State.montarNoLocal,
    total, sinal, valorFesta,
    frete: f.freteTotal,
    freteKmIda: f.kmIda,
    freteKmTotal: f.kmTotal,
    freteSegundaViagem: f.segundaViagem,
    fretePrecoCombustivel: f.precoCombustivel,
    freteLitros: f.litros,
    freteCustoCombustivel: f.custoCombustivel,
    freteManutencao: f.manutencao,
    freteTotal: f.freteTotal,
    modeloContrato, obs,
    desconto: State.descontoAplicado,
    dataCriacao: Utils.getHojeDataString()
  };

  ModalStatus.exibir("SALVANDO RESERVA...", cliente);
  Database.salvarReservaNuvem(dadosReserva).then(function() {
    ModalStatus.sucesso("✓ RESERVA SALVA");

    // Gerar contrato automaticamente
    var dadosContrato = {
      nome: cliente, cpf, telefone, endereco, local, data,
      horario: "", dataRetirada: data, dataDevolucao: data,
      valor: total, pecas: pecasDoKit, tema: temaDoKit, obs
    };

    var htmlContrato = modeloContrato === "com-frete"
      ? gerarContratoComFrete(dadosContrato)
      : gerarContratoPegueMonte(dadosContrato);

    Database.salvarContratoNuvem({
      nome: cliente, cpf, data, valor: total, modelo: modeloContrato,
      tema: temaDoKit, pecas: pecasDoKit, obs, criadoEm: Date.now()
    }).catch(function(err) { console.warn("Contrato não salvo:", err); });

    var preview = document.getElementById("contrato-preview-content");
    if (preview) preview.innerHTML = htmlContrato;
    var modalVis = document.getElementById("modal-visualizar-contrato");
    if (modalVis) modalVis.classList.add("ativo");

    // Limpar
    if (elCliente) elCliente.value = "";
    if (elCpf) elCpf.value = "";
    if (elTelefone) elTelefone.value = "";
    if (elEndereco) elEndereco.value = "";
    if (elLocal) elLocal.value = "";
    if (elData) elData.value = "";
    if (elTotal) elTotal.value = "";
    if (elSinal) elSinal.value = "";
    if (elObs) elObs.value = "";
    if (elValorFesta) elValorFesta.value = "0.00";
    State.temaAtual = ""; State.temaAtualObj = null; State.kitAtual = ""; State.montarNoLocal = false;
    State.pecasSelecionadasKit = {};
    State.temasSelecionadosKit = {};
    State.descontoAplicado = { tipo: "percent", valor: 0, totalOriginal: 0, totalFinal: 0 };
    if (hidden) hidden.value = "";
    if (filtro) filtro.value = "";
    document.querySelectorAll('.btn-kit-opcao').forEach(function(b) { b.classList.remove('ativo'); });
    var kitBox = document.getElementById("kit-acoes-box");
    if (kitBox) kitBox.classList.remove("ativo");
    var painelMontagem = document.getElementById("painel-montagem-local");
    if (painelMontagem) painelMontagem.style.display = "none";
    var chk = document.getElementById("chk-montar-local");
    if (chk) chk.checked = false;
    var resumo = document.getElementById("resumo-selecao");
    if (resumo) resumo.style.display = "none";
    var detalhes = document.getElementById("detalhes-soma");
    if (detalhes) detalhes.innerHTML = "";
    var resultadoDesc = document.getElementById("resultado-desconto");
    if (resultadoDesc) resultadoDesc.innerHTML = "";
    var descValor = document.getElementById("desconto-valor");
    if (descValor) descValor.value = "";
    FreteCalc.limpar();
  }).catch(function(err) {
    console.error(err);
    ModalStatus.erro("Erro ao salvar reserva.");
  });
}

// ============================================================
// SALVAR ORÇAMENTO
// ============================================================
function handleSalvarOrcamento() {
  var clienteEl = document.getElementById("nome-cliente");
  var cpfEl = document.getElementById("cliente-cpf");
  var totalEl = document.getElementById("valor-total");
  var dataEl = document.getElementById("data");
  var obsEl = document.getElementById("adicionais-festa");
  var vfEl = document.getElementById("valor-festa");
  var nomeCliente = clienteEl ? clienteEl.value.trim() : "";
  if (!nomeCliente) return Utils.showToast("Preencha o nome do cliente.", "warning");
  var f = FreteCalc.calcular();
  Database.salvarOrcamentoNuvem({
    cliente: nomeCliente,
    cpf: cpfEl ? cpfEl.value.trim() : "",
    tema: State.temaAtual || "Não selecionado",
    kit: State.kitAtual || "",
    pecas: State.pecasSelecionadasKit[State.kitAtual] || [],
    montarNoLocal: !!State.montarNoLocal,
    total: totalEl ? totalEl.value : "0",
    valorFesta: vfEl ? (parseFloat(vfEl.value) || 0) : 0,
    frete: f.freteTotal,
    freteKmIda: f.kmIda, freteKmTotal: f.kmTotal, freteSegundaViagem: f.segundaViagem,
    fretePrecoCombustivel: f.precoCombustivel, freteLitros: f.litros,
    freteCustoCombustivel: f.custoCombustivel, freteManutencao: f.manutencao,
    freteTotal: f.freteTotal,
    dataFesta: dataEl ? dataEl.value : "",
    obs: obsEl ? obsEl.value.trim() : "",
    desconto: State.descontoAplicado,
    dataCriacao: Utils.getHojeDataString(), horaCriacao: Utils.getHoraString()
  }).then(function() {
    Utils.showToast("Orçamento salvo!", "success");
  }).catch(function() {
    Utils.showToast("Erro ao salvar orçamento.", "error");
  });
}

// ============================================================
// BIND EVENTOS
// ============================================================
function bindTudo() {
  var b;

  // LOGIN
  b = document.getElementById("btn-login-direto");
  if (b) b.onclick = function(e) { if (e) e.preventDefault(); handleLogin(); };
  b = document.getElementById("btn-logout-direto");
  if (b) b.onclick = function(e) { if (e) e.preventDefault(); handleLogout(); };
  var senhaEl = document.getElementById("senha");
  if (senhaEl) senhaEl.onkeypress = function(e) {
    if (e.key === "Enter") { var l = document.getElementById("btn-login-direto"); if (l) l.click(); }
  };

  // PONTO
  b = document.getElementById("btn-ponto-entrada");
  if (b) b.onclick = function(e) { if (e) e.preventDefault(); Database.registrarPonto('entrada'); };
  b = document.getElementById("btn-ponto-saida");
  if (b) b.onclick = function(e) { if (e) e.preventDefault(); Database.registrarPonto('saida'); };
  b = document.getElementById("btn-abrir-relatorio-pontos");
  if (b) b.onclick = function(e) {
    if (e) e.preventDefault();
    var p = document.getElementById("painel-relatorio-pontos-geral");
    if (p) p.style.display = (p.style.display === "none" || p.style.display === "") ? "block" : "none";
  };

  // RELATÓRIOS
  b = document.getElementById("btn-abrir-central-relatorios");
  if (b) b.onclick = function(e) {
    if (e) e.preventDefault();
    var p = document.getElementById("secao-central-relatorios");
    if (!p) return;
    var abrindo = (p.style.display === "none" || p.style.display === "");
    p.style.display = abrindo ? "block" : "none";
    if (abrindo) renderPlanilhaVendas();
  };
  b = document.getElementById("btn-fechar-central-relatorios");
  if (b) b.onclick = function(e) {
    if (e) e.preventDefault();
    var p = document.getElementById("secao-central-relatorios");
    if (p) p.style.display = "none";
  };
  b = document.getElementById("seletor-mes-planilha");
  if (b) b.onchange = function() { renderPlanilhaVendas(); };
  b = document.getElementById("btn-transformar-grafico");
  if (b) b.onclick = function(e) { if (e) e.preventDefault(); renderGraficoAnual(); };
  b = document.getElementById("btn-toggle-grafico");
  if (b) b.onclick = function(e) {
    if (e) e.preventDefault();
    var pg = document.getElementById("painel-grafico-faturamento");
    if (pg) pg.style.display = pg.style.display === 'none' ? 'block' : 'none';
  };

  // ORÇAMENTOS
  b = document.getElementById("btn-abrir-orcamentos");
  if (b) b.onclick = function(e) {
    if (e) e.preventDefault();
    var p = document.getElementById("card-orcamentos-integrado");
    if (!p) return;
    var abrindo = (p.style.display === "none" || p.style.display === "");
    p.style.display = abrindo ? "block" : "none";
    if (abrindo) renderOrcamentos();
  };

  // REUNIÕES
  b = document.getElementById("btn-abrir-reunioes-painel");
  if (b) b.onclick = function(e) {
    if (e) e.preventDefault();
    var p = document.getElementById("painel-reunioes-exclusivo");
    if (!p) return;
    var abrindo = (p.style.display === "none" || p.style.display === "");
    p.style.display = abrindo ? "block" : "none";
    if (abrindo) iniciarPainelReunioes();
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
    if (!cliente || !dataHora) return Utils.showToast("Preencha cliente e data/hora.", "warning");
    ModalStatus.exibir("AGENDANDO...", cliente);
    Database.salvarReuniaoNuvem({ cliente, dataHora, pauta, criadoEm: Date.now() })
      .then(function() {
        ModalStatus.sucesso("✓ REUNIÃO AGENDADA");
        if (c) c.value = ""; if (d) d.value = ""; if (pa) pa.value = "";
      })
      .catch(function() { ModalStatus.erro("Erro ao agendar."); });
  };

  // CATÁLOGO
  b = document.getElementById("btn-abrir-catalogo-temas");
  if (b) b.onclick = function(e) {
    if (e) e.preventDefault();
    var p = document.getElementById("painel-catalogo-temas");
    if (!p) return;
    var abrindo = (p.style.display === "none" || p.style.display === "");
    p.style.display = abrindo ? "block" : "none";
    if (abrindo) renderizarTemas();
  };

  // GERADOR DE KITS
  b = document.getElementById("btn-abrir-gerador-kits");
  if (b) b.onclick = function(e) {
    if (e) e.preventDefault();
    var p = document.getElementById("painel-gerador-kits");
    if (!p) return;
    var abrindo = (p.style.display === "none" || p.style.display === "");
    p.style.display = abrindo ? "block" : "none";
    if (abrindo) renderKits();
  };
  b = document.getElementById("btn-fechar-gerador-kits");
  if (b) b.onclick = function(e) {
    if (e) e.preventDefault();
    var p = document.getElementById("painel-gerador-kits");
    if (p) p.style.display = "none";
  };
  b = document.getElementById("btn-kit-selecionar-pecas");
  if (b) b.onclick = function(e) { if (e) e.preventDefault(); abrirModalPecas("kit"); };
  b = document.getElementById("btn-kit-selecionar-temas");
  if (b) b.onclick = function(e) { if (e) e.preventDefault(); abrirModalTema("kit"); };
  b = document.getElementById("btn-salvar-kit");
  if (b) b.onclick = function(e) { if (e) e.preventDefault(); salvarKit(); };

  // GERADOR DE CONTRATO
  b = document.getElementById("btn-abrir-gerador-contrato");
  if (b) b.onclick = function(e) {
    if (e) e.preventDefault();
    var m = document.getElementById("modal-gerador-contrato");
    if (m) m.classList.add("ativo");
    carregarTemasNoContrato();
    initContratoBusca();
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
  if (b) b.onclick = function(e) { if (e) e.preventDefault(); gerarContratoAvulso(false); };
  b = document.getElementById("btn-gerar-pdf-contrato");
  if (b) b.onclick = function(e) { if (e) e.preventDefault(); gerarContratoAvulso(true); };
  b = document.getElementById("btn-abrir-pecas-contrato");
  if (b) b.onclick = function(e) { if (e) e.preventDefault(); abrirModalPecas("contrato"); };

  var modalVis = document.getElementById("modal-visualizar-contrato");
  if (modalVis) {
    var fv = document.getElementById("btn-fechar-visualizacao");
    if (fv) fv.onclick = function() { modalVis.classList.remove("ativo"); };
    modalVis.addEventListener('click', function(e) {
      if (e.target === modalVis) modalVis.classList.remove("ativo");
    });
  }
  b = document.getElementById("btn-baixar-pdf-contrato");
  if (b) b.onclick = function() { gerarContratoPDF(); };
  b = document.getElementById("btn-imprimir-contrato");
  if (b) b.onclick = function() { window.print(); };

  // KITS DE FESTA
  var botoesKit = document.querySelectorAll('.btn-kit-opcao');
  botoesKit.forEach(function(btn) {
    btn.onclick = function(e) {
      e.preventDefault();
      botoesKit.forEach(function(x) { x.classList.remove('ativo'); });
      btn.classList.add('ativo');
      var nomeKit = btn.getAttribute('data-kit');
      State.kitAtual = nomeKit;
      var box = document.getElementById("kit-acoes-box");
      var nome = document.getElementById("kit-acoes-nome");
      if (box) box.classList.add("ativo");
      if (nome) nome.textContent = nomeKit;
      atualizarInfoKitFesta();
      atualizarResumoSelecao();
      Utils.showToast('Kit "' + nomeKit + '" selecionado!', "success");
    };
  });

  b = document.getElementById("btn-esc-pecas");
  if (b) b.onclick = function(e) { if (e) e.preventDefault(); if (!State.kitAtual) return Utils.showToast("Selecione um kit.", "warning"); abrirModalPecas("kit-festa"); };
  b = document.getElementById("btn-esc-tema");
  if (b) b.onclick = function(e) { if (e) e.preventDefault(); if (!State.kitAtual) return Utils.showToast("Selecione um kit.", "warning"); abrirModalTema("kit-festa"); };

  // MODAL PEÇAS
  b = document.getElementById("btn-fechar-modal-pecas");
  if (b) b.onclick = function() { document.getElementById("modal-pecas").classList.remove("ativo"); };
  b = document.getElementById("btn-cancelar-pecas");
  if (b) b.onclick = function() { document.getElementById("modal-pecas").classList.remove("ativo"); };
  b = document.getElementById("btn-confirmar-pecas");
  if (b) b.onclick = function() { confirmarModalPecas(); };
  var filtroPecas = document.getElementById("filtro-pecas");
  if (filtroPecas) filtroPecas.oninput = function(e) {
    renderizarListaPecasModal(modalPecasContexto, e.target.value);
  };

  // MODAL TEMA
  b = document.getElementById("btn-fechar-modal-tema");
  if (b) b.onclick = function() { document.getElementById("modal-tema-reserva").classList.remove("ativo"); };
  b = document.getElementById("btn-cancelar-tema");
  if (b) b.onclick = function() { document.getElementById("modal-tema-reserva").classList.remove("ativo"); };
  b = document.getElementById("btn-confirmar-tema");
  if (b) b.onclick = function() { confirmarModalTema(); };
  var filtroTemaModal = document.getElementById("filtro-tema-modal");
  if (filtroTemaModal) filtroTemaModal.oninput = function(e) {
    renderizarListaTemasModal(e.target.value);
  };

  // MONTAR NO LOCAL
  var chkMontar = document.getElementById("chk-montar-local");
  if (chkMontar) {
    chkMontar.onchange = function() {
      State.montarNoLocal = !!chkMontar.checked;
      var painel = document.getElementById("painel-montagem-local");
      if (painel) painel.style.display = chkMontar.checked ? "block" : "none";
      var modelo = document.getElementById("modelo-contrato");
      if (modelo) modelo.value = chkMontar.checked ? "com-frete" : "pegue-monte";
    };
  }

  // FRETE
  var kmEl = document.getElementById("calc-km");
  var precoEl = document.getElementById("calc-valor-litro");
  var chkSegunda = document.getElementById("chk-segunda-viagem");
  if (kmEl) { kmEl.oninput = function() { FreteCalc.renderizar(); }; kmEl.onchange = function() { FreteCalc.renderizar(); }; }
  if (precoEl) { precoEl.oninput = function() { FreteCalc.renderizar(); }; precoEl.onchange = function() { FreteCalc.renderizar(); }; }
  if (chkSegunda) { chkSegunda.onchange = function() { FreteCalc.renderizar(); }; }
  var vfEl = document.getElementById("valor-festa");
  if (vfEl) vfEl.oninput = function() { recalcularTotais(); };
  var sinalEl = document.getElementById("valor-sinal");
  if (sinalEl) sinalEl.oninput = function() { recalcularTotais(); };

  // SOMA AUTOMÁTICA
  b = document.getElementById("btn-soma-automatica");
  if (b) b.onclick = function(e) { if (e) e.preventDefault(); calcularSomaAutomatica(); };

  // DESCONTO
  b = document.getElementById("btn-aplicar-desconto");
  if (b) b.onclick = function(e) { if (e) e.preventDefault(); aplicarDesconto(); };

  // SALVAR RESERVA / ORÇAMENTO
  b = document.getElementById("btn-confirmar-agendamento");
  if (b) b.onclick = function(e) { if (e) e.preventDefault(); handleSalvarFesta(); };
  b = document.getElementById("btn-salvar-como-orcamento");
  if (b) b.onclick = function(e) { if (e) e.preventDefault(); handleSalvarOrcamento(); };

  // ADICIONAR PEÇA
  b = document.getElementById("btn-adicionar-peca");
  if (b) b.onclick = function(e) {
    if (e) e.preventDefault();
    var nome = (document.getElementById("catalogo-peca-nome") || {}).value || "";
    var qtd = parseInt((document.getElementById("catalogo-peca-qtd") || {}).value) || 1;
    var categoria = (document.getElementById("catalogo-peca-categoria") || {}).value || "Outros";
    var modelo = (document.getElementById("catalogo-peca-modelo") || {}).value || "";
    var preco = parseFloat((document.getElementById("catalogo-peca-preco") || {}).value) || 0;
    var precoRep = parseFloat((document.getElementById("catalogo-peca-preco-reposicao") || {}).value) || 0;
    var fileInput = document.getElementById("catalogo-peca-imagem");
    nome = nome.trim();
    if (!nome) return Utils.showToast("Preencha o nome do tema/peça!", "warning");
    var executar = function(img) {
      Database.salvarPecaNuvem({ nome, quantidade: qtd, categoria, modelo, preco, precoReposicao: precoRep, imagem: img || "" }).then(function() {
        var nEl = document.getElementById("catalogo-peca-nome"); if (nEl) nEl.value = "";
        var qEl = document.getElementById("catalogo-peca-qtd"); if (qEl) qEl.value = "1";
        var mEl = document.getElementById("catalogo-peca-modelo"); if (mEl) mEl.value = "";
        var pEl = document.getElementById("catalogo-peca-preco"); if (pEl) pEl.value = "0";
        var prEl = document.getElementById("catalogo-peca-preco-reposicao"); if (prEl) prEl.value = "0";
        var iEl = document.getElementById("catalogo-peca-imagem"); if (iEl) iEl.value = "";
      });
    };
    if (fileInput && fileInput.files && fileInput.files[0]) {
      reduzirImagem(fileInput.files[0], 900, 0.82).then(executar).catch(function() { executar(""); });
    } else {
      executar("");
    }
  };

  // CATEGORIAS
  b = document.getElementById("btn-adicionar-categoria");
  if (b) b.onclick = function(e) {
    if (e) e.preventDefault();
    var input = document.getElementById("input-nova-categoria");
    var nome = input ? input.value.trim() : "";
    if (!nome) return Utils.showToast("Digite um nome.", "warning");
    window.adicionarCategoria(nome).then(function() {
      Utils.showToast("Categoria adicionada!", "success");
      if (input) { input.value = ""; input.focus(); }
    }).catch(function(err) { Utils.showToast(String(err), "warning"); });
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
    if (!cat) return Utils.showToast("Selecione uma categoria.", "warning");
    window.removerCategoria(cat).then(function() {
      Utils.showToast("Categoria removida!", "success");
    }).catch(function(err) { Utils.showToast(String(err), "warning"); });
  };

  // REMOVER TEMA
  b = document.getElementById("btn-remover-tema-admin");
  if (b) b.onclick = function(e) {
    if (e) e.preventDefault();
    var s = document.getElementById("select-remover-tema");
    var idx = s ? parseInt(s.value) : NaN;
    if (isNaN(idx)) return Utils.showToast("Selecione um tema válido!", "warning");
    window.removerTema(idx);
  };

  initModalEditar();
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  carregarEstoque();
  listenCategorias();
  listenReservas();
  listenOrcamentos();
  listenKits();
  bindTudo();
  console.log("✅ Sistema Tralalá inicializado!");
});
