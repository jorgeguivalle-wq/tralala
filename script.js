var CONFIG = {
  usuarios: {
    "jorgeguivalle@gmail.com": "Viperrt11",
    "leonardodovalle@gmail.com": "Viperrt11@",
    "tralaladecoracoes@gmail.com": "tralala123"
  },
  firebase: {
    databaseURL: "https://tralala-d8ce2-default-rtdb.firebaseio.com/"
  }
};

var State = {
  db: null,
  estoque: [],
  reservas: [],
  orcamentos: [],
  contratos: [],
  reunioes: [],
  usuarioLogadoEmail: "",
  kitSelecionado: "",
  editandoIdReserva: null
};

var Utils = {
  showToast: function(message, type) {
    alert((type === 'success' ? '✅ ' : '⚠️ ') + message);
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
    var mes = String(d.getMonth() + 1).padStart(2, '0');
    var dia = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + "-" + mes + "-" + dia;
  },
  getHoraString: function() { 
    return new Date().toTimeString().split(' ')[0].substring(0, 5); 
  }
};

var Database = {
  init: function() {
    if (typeof firebase !== 'undefined') {
      if (!firebase.apps.length) {
        firebase.initializeApp(CONFIG.firebase);
      }
      State.db = firebase.database();
      this.listen();
    } else {
      Utils.showToast("Biblioteca do Firebase não carregou.", "error");
    }
  },
  listen: function() {
    State.db.ref('estoque').on('value', function(snap) {
      var val = snap.val() || {};
      State.estoque = Object.keys(val).map(k => ({ idFirebase: k, ...val[k] }));
      UI.renderTemas();
      UI.alimentarSeletoresMontagemEstoque();
    });

    State.db.ref('reservas').on('value', function(snap) {
      var val = snap.val() || {};
      State.reservas = Object.keys(val).map(k => ({ idFirebase: k, ...val[k] }));
      UI.renderReservas();
      UI.sincronizarPlanilhaAutomatica();
    });

    State.db.ref('orcamentos').on('value', function(snap) {
      var val = snap.val() || {};
      State.orcamentos = Object.keys(val).map(k => ({ idFirebase: k, ...val[k] }));
      UI.renderOrcamentos();
    });

    State.db.ref('contratos').on('value', function(snap) {
      var val = snap.val() || {};
      State.contratos = Object.keys(val).map(k => ({ idFirebase: k, ...val[k] }));
      UI.renderHistoricoContratos();
    });

    State.db.ref('reunioes_agendadas').on('value', function(snap) {
      var val = snap.val() || {};
      State.reunioes = Object.keys(val).map(k => ({ idFirebase: k, ...val[k] }));
      UI.renderReunioes();
    });
  },
  registrarPonto: function(tipo) {
    if (!State.usuarioLogadoEmail) return Utils.showToast("Faça login primeiro.", "error");
    var hoje = Utils.getHojeDataString();
    var hora = Utils.getHoraString();
    
    State.db.ref("pontos").push({
      usuario: State.usuarioLogadoEmail,
      tipo: tipo,
      data: Utils.formatDateBR(hoje),
      hora: hora
    }).then(() => {
      Utils.showToast("Ponto de " + tipo + " registrado às " + hora, "success");
      UI.renderPontoStatus();
    });
  }
};

var UI = {
  init: function() {
    this.bindEvents();
    this.renderPontoStatus();
  },
  bindEvents: function() {
    var self = this;

    document.getElementById("btn-login-direto").onclick = function() {
      var email = document.getElementById("email").value.trim();
      var senha = document.getElementById("senha").value;
      if (CONFIG.usuarios[email] === senha) {
        State.usuarioLogadoEmail = email;
        document.getElementById("secao-login").style.display = "none";
        document.getElementById("secao-verificador").style.display = "block";
        document.getElementById("nome-usuario").innerHTML = "👤 <b>" + email.split('@')[0] + "</b>";
        Utils.showToast("Login realizado com sucesso!", "success");
        self.renderPontoStatus();
      } else {
        Utils.showToast("E-mail ou senha incorretos.", "error");
      }
    };

    document.getElementById("btn-logout-direto").onclick = function() { window.location.reload(); };
    document.getElementById("btn-ponto-entrada").onclick = function() { Database.registrarPonto("Entrada"); };
    document.getElementById("btn-ponto-saida").onclick = function() { Database.registrarPonto("Saída"); };

    document.getElementById("btn-abrir-relatorio-pontos").onclick = function() {
      var el = document.getElementById("painel-relatorio-pontos-geral");
      el.style.display = el.style.display === "none" ? "block" : "none";
    };

    document.getElementById("btn-abrir-central-relatorios").onclick = function() {
      document.getElementById("secao-central-relatorios").style.display = "block";
    };
    document.getElementById("btn-fechar-central-relatorios").onclick = function() {
      document.getElementById("secao-central-relatorios").style.display = "none";
    };

    document.getElementById("btn-abrir-reunioes-painel").onclick = function() {
      document.getElementById("painel-reunioes-exclusivo").style.display = "block";
    };
    document.getElementById("btn-fechar-reunioes").onclick = function() {
      document.getElementById("painel-reunioes-exclusivo").style.display = "none";
    };

    document.getElementById("btn-abrir-catalogo-temas").onclick = function() {
      var el = document.getElementById("painel-catalogo-temas");
      el.style.display = el.style.display === "none" ? "block" : "none";
    };

    // Controle do Modal de Contratos
    document.getElementById("btn-abrir-gerador-contrato").onclick = function() {
      document.getElementById("modal-gerador-contrato").classList.add("ativo");
      self.atualizarListaPecasContrato();
    };
    document.getElementById("btn-fechar-modal-contrato").onclick = function() {
      document.getElementById("modal-gerador-contrato").classList.remove("ativo");
    };

    // Seleção de Kits
    var botoesKit = document.querySelectorAll('.btn-kit-opcao');
    botoesKit.forEach(function(btn) {
      btn.onclick = function(e) {
        botoesKit.forEach(function(b) { b.classList.remove('ativo'); });
        btn.classList.add('ativo');
        State.kitSelecionado = btn.getAttribute('data-kit');
      };
    });

    // Toggle Montagem no local
    document.getElementById("chk-montar-local").onchange = function(e) {
      document.getElementById("painel-montagem-local").style.display = e.target.checked ? "block" : "none";
    };

    // Lógicas Financeiras e Frete
    var calcularFinanceiro = function() {
      var festa = parseFloat(document.getElementById("valor-festa").value) || 0;
      var km = parseFloat(document.getElementById("calc-km").value) || 0;
      var precoL = parseFloat(document.getElementById("calc-valor-litro").value) || 0;
      
      var custoCombustivel = km > 0 ? (km / 9) * precoL : 0;
      var taxaManutencao = custoCombustivel * 0.20;
      var totalFrete = custoCombustivel + taxaManutencao;

      document.getElementById("calc-total-combustivel").innerText = Utils.formatCurrency(custoCombustivel);
      document.getElementById("calc-manutencao").innerText = Utils.formatCurrency(taxaManutencao);
      document.getElementById("calc-cobrar-cliente").innerText = Utils.formatCurrency(totalFrete);
      
      document.getElementById("valor-frete").value = totalFrete.toFixed(2);
      var totalGeral = festa + totalFrete;
      document.getElementById("valor-total").value = totalGeral.toFixed(2);

      var sinal = parseFloat(document.getElementById("valor-sinal").value) || 0;
      document.getElementById("valor-restante").value = (totalGeral - sinal).toFixed(2);
    };

    document.getElementById("valor-festa").oninput = calcularFinanceiro;
    document.getElementById("valor-sinal").oninput = calcularFinanceiro;
    document.getElementById("calc-km").oninput = calcularFinanceiro;
    document.getElementById("calc-valor-litro").oninput = calcularFinanceiro;

    // Autocomplete Tema
    var filtroTemaInput = document.getElementById("filtro-tema-input");
    var wrapperListaSugestoes = document.getElementById("wrapper-lista-sugestoes");
    filtroTemaInput.oninput = function(e) {
      var t = e.target.value.toLowerCase().trim();
      wrapperListaSugestoes.innerHTML = "";
      if(!t) { wrapperListaSugestoes.style.display = "none"; return; }
      var matches = State.estoque.filter(item => item.nome.toLowerCase().includes(t));
      matches.forEach(function(item) {
        var div = document.createElement("div");
        div.className = "sugestao-item";
        div.innerHTML = "<span><strong>" + item.nome + "</strong> <small>(" + item.categoria + ")</small></span>";
        div.onclick = function() {
          filtroTemaInput.value = item.nome;
          document.getElementById("busca-tema-input").value = item.nome;
          wrapperListaSugestoes.style.display = "none";
        };
        wrapperListaSugestoes.appendChild(div);
      });
      wrapperListaSugestoes.style.display = "block";
    };

    // Ações de Salvar / Criar
    document.getElementById("btn-criar-categoria").onclick = function() {
      var nome = document.getElementById("nova-categoria-nome").value.trim();
      if(!nome) return;
      var sel = document.getElementById("catalogo-peca-categoria");
      var opt = document.createElement("option");
      opt.value = nome; opt.innerText = nome;
      sel.appendChild(opt);
      document.getElementById("nova-categoria-nome").value = "";
      Utils.showToast("Categoria adicionada com sucesso!", "success");
    };

    document.getElementById("btn-adicionar-peca").onclick = function() {
      var nome = document.getElementById("catalogo-peca-nome").value.trim();
      var qtd = parseInt(document.getElementById("catalogo-peca-qtd").value) || 0;
      var cat = document.getElementById("catalogo-peca-categoria").value;
      var mod = document.getElementById("catalogo-peca-modelo").value.trim();
      var img = document.getElementById("catalogo-peca-imagem").value.trim() || "https://placehold.co/100x100?text=Sem+Foto";

      if(!nome) return alert("Insira o nome da peça!");
      State.db.ref("estoque").push({ nome: nome, quantidade: qtd, categoria: cat, modelo: mod, imagem: img }).then(() => {
        Utils.showToast("Peça salva com sucesso!", "success");
        document.getElementById("catalogo-peca-nome").value = "";
      });
    };

    document.getElementById("btn-confirmar-agendamento").onclick = function() {
      var cliente = document.getElementById("nome-cliente").value.trim();
      var data = document.getElementById("data").value;
      var tema = document.getElementById("busca-tema-input").value;
      var valor = parseFloat(document.getElementById("valor-total").value) || 0;
      var sinal = parseFloat(document.getElementById("valor-sinal").value) || 0;
      var obs = document.getElementById("adicionais-festa").value.trim();

      if(!cliente || !data || !tema || !State.kitSelecionado) return alert("Preencha cliente, data, tema e selecione o kit!");

      var dados = { cliente: cliente, data: data, tema: tema, kit: State.kitSelecionado, total: valor, sinal: sinal, obs: obs };
      
      var ref = State.editandoIdReserva ? State.db.ref("reservas/" + State.editandoIdReserva) : State.db.ref("reservas").push();
      ref.set(dados).then(() => {
        Utils.showToast("Agendamento salvo!", "success");
        self.resetFormReserva();
      });
    };

    document.getElementById("btn-salvar-como-orcamento").onclick = function() {
      var cliente = document.getElementById("nome-cliente").value.trim();
      var tema = document.getElementById("busca-tema-input").value || "Não selecionado";
      var valor = document.getElementById("valor-festa").value;
      if(!cliente) return alert("Nome do cliente obrigatório!");
      
      State.db.ref("orcamentos").push({ cliente: cliente, tema: tema, total: valor, dataCriacao: Utils.getHojeDataString() });
    };

    document.getElementById("btn-salvar-reuniao-avulsa").onclick = function() {
      var cli = document.getElementById("reuniao-cliente").value.trim();
      var dt = document.getElementById("reuniao-data-hora").value;
      var pt = document.getElementById("reuniao-pauta").value.trim();
      if(!cli || !dt) return alert("Preencha o cliente e data da reunião.");
      State.db.ref("reunioes_agendadas").push({ cliente: cli, dataHora: dt, pauta: pt });
    };

    document.getElementById("btn-gerar-salvar-contrato").onclick = function() {
      var nome = document.getElementById("c-nome").value.trim();
      var cpf = document.getElementById("c-cpf").value.trim();
      var dt = document.getElementById("c-data").value;
      var local = document.getElementById("c-local").value.trim();
      if(!nome || !cpf || !dt) return alert("Preencha os dados do contrato.");
      
      var texto = "CONTRATO DE LOCAÇÃO\nCONTRATANTE: " + nome + "\nCPF: " + cpf + "\nDATA: " + dt + "\nLOCAL: " + local;
      State.db.ref("contratos").push({ nome: nome, cpf: cpf, dataFesta: dt, local: local, textoContrato: texto, criadoEm: new Date().toLocaleString() });
      document.getElementById("form-contrato-avulso").reset();
    };
  },

  resetFormReserva: function() {
    document.getElementById("nome-cliente").value = "";
    document.getElementById("data").value = "";
    document.getElementById("filtro-tema-input").value = "";
    document.getElementById("busca-tema-input").value = "";
    document.getElementById("valor-festa").value = "0.00";
    document.getElementById("valor-sinal").value = "0.00";
    document.getElementById("calc-km").value = "";
    document.getElementById("adicionais-festa").value = "";
    State.editandoIdReserva = null;
    document.getElementById("titulo-form-reserva").innerText = "Agendar Nova Festa";
  },

  renderPontoStatus: function() {
    if(!State.db) return;
    State.db.ref("pontos").limitToLast(1).once("value", function(snap) {
      var val = snap.val();
      var el = document.getElementById("ponto-status-hoje");
      if(val && el) {
        var k = Object.keys(val)[0];
        el.innerText = "Último registro: " + val[k].tipo + " às " + val[k].hora + " (" + val[k].data + ")";
      }
    });
  },

  renderTemas: function() {
    var corpo = document.getElementById("lista-temas-gerenciados-corpo");
    if(!corpo) return;
    corpo.innerHTML = "";
    document.getElementById("contador-catalogo-total").innerText = State.estoque.length + " itens";
    
    State.estoque.forEach(item => {
      var tr = document.createElement("tr");
      tr.innerHTML = "<td><img src='" + item.imagem + "' class='catalogo-foto'></td>" +
                     "<td><strong>" + item.nome + "</strong> <small>(" + item.quantidade + " un)</small><br><span style='font-size:11px; color:var(--primary);'>" + item.modelo + "</span></td>" +
                     "<td style='text-align:center;'><button class='btn btn-danger' style='padding:4px 8px; width:auto;' onclick='window.ExcluirPeca(\"" + item.idFirebase + "\")'>🗑️</button></td>";
      corpo.appendChild(tr);
    });
  },

  renderReservas: function() {
    var container = document.getElementById("lista-reservas-render");
    if(!container) return;
    container.innerHTML = "";
    
    State.reservas.forEach(res => {
      var card = document.createElement("div");
      card.className = "card-reserva";
      card.innerHTML = "<strong>👶 " + res.cliente + "</strong> - 🎨 " + res.tema + " (" + res.kit + ")<br>" +
                       "<small>📅 Data: " + Utils.formatDateBR(res.data) + " | 💰 Total: " + Utils.formatCurrency(res.total) + "</small><br>" +
                       "<button class='btn btn-outline' style='margin-top:5px; padding:2px 6px; font-size:12px;' onclick='window.EditarReserva(\"" + res.idFirebase + "\")'>✏️ Editar</button>" +
                       "<button class='btn btn-danger' style='margin-top:5px; margin-left:5px; padding:2px 6px; font-size:12px; width:auto;' onclick='window.DeletarReserva(\"" + res.idFirebase + "\")'>🗑️ Excluir</button>";
      container.appendChild(card);
    });
  },

  renderOrcamentos: function() {
    var corpo = document.getElementById("lista-orcamentos-interno-corpo");
    if(!corpo) return;
    corpo.innerHTML = "";
    State.orcamentos.forEach(orc => {
      var tr = document.createElement("tr");
      tr.innerHTML = "<td>" + orc.cliente + "</td><td>" + orc.tema + "</td><td>" + Utils.formatCurrency(orc.total) + "</td>" +
                     "<td><button class='btn btn-danger' style='padding:2px 6px; font-size:11px;' onclick='window.DeletarOrcamento(\"" + orc.idFirebase + "\")'>🗑️</button></td>";
      corpo.appendChild(tr);
    });
  },

  renderReunioes: function() {
    var c = document.getElementById("lista-reunioes-container");
    if(!c) return; c.innerHTML = "";
    State.reunioes.forEach(re => {
      var div = document.createElement("div");
      div.className = "card-reuniao";
      div.innerHTML = "<strong>👤 " + re.cliente + "</strong> - 📅 " + re.dataHora + "<br><small>🎯 Pauta: " + re.pauta + "</small>";
      c.appendChild(div);
    });
  },

  renderHistoricoContratos: function() {
    var c = document.getElementById("historico-contratos-lista");
    if(!c) return; c.innerHTML = "";
    State.contratos.forEach(con => {
      var div = document.createElement("div");
      div.className = "card-contrato";
      div.innerHTML = "<strong>📄 " + con.nome + "</strong><br><small>Criado em: " + con.criadoEm + "</small>";
      c.appendChild(div);
    });
  },

  sincronizarPlanilhaAutomatica: function() {
    var corpo = document.getElementById("tabela-planilha-corpo").getElementsByTagName('tbody')[0];
    if(!corpo) return;
    corpo.innerHTML = "";
    State.reservas.forEach(res => {
      var tr = corpo.insertRow();
      tr.innerHTML = "<td>" + res.cliente + "</td><td>" + res.kit + "</td><td>" + Utils.formatCurrency(res.total) + "</td><td>Active</td>";
    });
  },

  alimentarSeletoresMontagemEstoque: function() {
    var pecasBox = document.getElementById("ml-pecas-estoque");
    var mesasBox = document.getElementById("ml-mesas-estoque");
    if(!pecasBox || !mesasBox) return;
    
    pecasBox.innerHTML = ""; mesasBox.innerHTML = "";
    State.estoque.forEach(item => {
      var label = "<label><input type='checkbox' value='" + item.nome + "'> " + item.nome + "</label><br>";
      pecasBox.innerHTML += label;
      if(item.nome.toLowerCase().includes("mesa") || item.nome.toLowerCase().includes("cilindro")) {
        mesasBox.innerHTML += label;
      }
    });
  },

  atualizarListaPecasContrato: function() {
    var sel = document.getElementById("c-pecas");
    if(!sel) return; sel.innerHTML = "";
    State.estoque.forEach(item => {
      var opt = document.createElement("option");
      opt.value = item.nome; opt.innerText = item.nome;
      sel.appendChild(opt);
    });
  }
};

// Global Windows Functions para botões dinâmicos
window.DeletarReserva = function(id) { if(confirm("Excluir agendamento?")) State.db.ref("reservas/" + id).remove(); };
window.DeletarOrcamento = function(id) { State.db.ref("orcamentos/" + id).remove(); };
window.ExcluirPeca = function(id) { if(confirm("Excluir do estoque?")) State.db.ref("estoque/" + id).remove(); };
window.EditarReserva = function(id) {
  var res = State.reservas.find(r => r.idFirebase === id);
  if(!res) return;
  State.editandoIdReserva = id;
  document.getElementById("nome-cliente").value = res.cliente;
  document.getElementById("data").value = res.data;
  document.getElementById("filtro-tema-input").value = res.tema;
  document.getElementById("busca-tema-input").value = res.tema;
  document.getElementById("valor-festa").value = res.total;
  document.getElementById("titulo-form-reserva").innerText = "Editando Festa de " + res.cliente;
  window.scrollTo({top: 0, behavior: 'smooth'});
};

window.onload = function() {
  Database.init();
  UI.init();
};
