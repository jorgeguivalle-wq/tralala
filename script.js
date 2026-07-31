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
  usuarioLogadoEmail: "" 
};

var Utils = {
  showToast: function(message, type) {
    if (!type) type = 'info';
    var container = document.getElementById('toast-container');
    if (!container) { console.log(type + ": " + message); return; }
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
    } else {
      Utils.showToast("🚨 Erro de conexão: Biblioteca do Firebase não carregou.", "error");
    }
  },
  listen: function() {
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
      UI.renderReservas();
      UI.renderCatalogo();
      
      var inputBuscaTemaFicha = document.getElementById("busca-tema-input") || document.getElementById("busca-tema");
      if (inputBuscaTemaFicha && inputBuscaTemaFicha.value.trim()) {
        UI.renderSuggestions(inputBuscaTemaFicha.value);
      }
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
      UI.renderCatalogo(); // Atualiza o catálogo pois a disponibilidade de kits pode ter mudado

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
    State.db.ref("estoque/" + nomeTema).remove()
    .then(function() { Utils.showToast("Tema deletado do estoque.", "success"); })
    .catch(function() { Utils.showToast("Erro ao deletar tema.", "error"); });
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

    // --- Lógica do Catálogo ---
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
