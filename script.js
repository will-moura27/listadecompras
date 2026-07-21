// Configuração do Firebase
// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBrT5rwo37zNGpyjTxA6APfIpFZAjhMhfM",
  authDomain: "gestaorestaurante-31294.firebaseapp.com",
  projectId: "gestaorestaurante-31294",
  storageBucket: "gestaorestaurante-31294.firebasestorage.app",
  messagingSenderId: "368047144922",
  appId: "1:368047144922:web:5f15beed8ad29776c1cae3"
};

let db = null;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
} catch (e) {
    console.warn("Firebase rodando em modo local.");
}

let chaveAtual = localStorage.getItem('chaveRestaurante') || null;
let dadosRestaurante = {
    nomeRestaurante: "Meu Restaurante",
    logoUrl: "",
    corPrincipal: "#2c3e50",
    categorias: ["Grãos e Cereais", "Carnes e Frios", "Hortifrúti", "Limpeza", "Bebidas"],
    itens: []
};

document.addEventListener('DOMContentLoaded', () => {
    if (chaveAtual) {
        carregarDadosDaNuvem(chaveAtual, false);
    }
});

function mostrarTelaCadastro() {
    document.getElementById('login-card').style.display = 'none';
    document.getElementById('register-card').style.display = 'block';
}

function voltarParaLogin() {
    document.getElementById('register-card').style.display = 'none';
    document.getElementById('login-card').style.display = 'block';
}

async function entrarComChave() {
    const chave = document.getElementById('input-chave-login').value.trim();
    if (!chave) return alert("Digite a chave de acesso!");

    await carregarDadosDaNuvem(chave, true);
}

async function realizarCadastro(e) {
    e.preventDefault();
    const nomeRestaurante = document.getElementById('reg-nome-restaurante').value.trim();
    const chave = document.getElementById('reg-chave').value.trim();

    if (!chave || !nomeRestaurante) return alert("Preencha todos os campos!");

    let jaExiste = false;
    
    if (db) {
        try {
            const docRef = db.collection("restaurantes").doc(chave);
            const doc = await docRef.get();
            if (doc.exists) jaExiste = true;
        } catch (error) {
            console.warn("Aviso: Falha na conexão com a nuvem.");
            db = null;
        }
    }
    
    if (!jaExiste && localStorage.getItem('dados_' + chave)) {
        jaExiste = true;
    }

    if (jaExiste) {
        return alert("Erro: Esta chave já está em uso! Escolha outra.");
    }

    dadosRestaurante = {
        nomeRestaurante: nomeRestaurante,
        logoUrl: "",
        corPrincipal: "#2c3e50",
        categorias: ["Grãos e Cereais", "Carnes e Frios", "Hortifrúti", "Limpeza", "Bebidas"],
        itens: []
    };

    chaveAtual = chave;
    localStorage.setItem('chaveRestaurante', chave);
    salvarDados();

    liberarApp();
    alert("Cadastro realizado com sucesso!");
}

async function carregarDadosDaNuvem(chave, mostrarAlertaErro = false) {
    let encontrado = false;

    if (db) {
        try {
            const docRef = db.collection("restaurantes").doc(chave);
            const doc = await docRef.get();
            if (doc.exists) {
                dadosRestaurante = doc.data();
                encontrado = true;
            }
        } catch (e) {
            console.warn("Aviso: Falha na conexão com a nuvem.");
            db = null; 
        }
    }
    
    if (!encontrado) {
        let salvoLocal = localStorage.getItem('dados_' + chave);
        if (salvoLocal) {
            dadosRestaurante = JSON.parse(salvoLocal);
            encontrado = true;
        }
    }

    if (encontrado) {
        chaveAtual = chave;
        localStorage.setItem('chaveRestaurante', chave);
        liberarApp();
    } else {
        if (mostrarAlertaErro) {
            alert("Chave não encontrada! Verifique se digitou corretamente ou crie um novo cadastro.");
        }
    }
}

function esqueciChave() {
    const chaveInformada = prompt("Para recuperar seu usuário, digite a sua Chave de Acesso antiga:");
    if (chaveInformada) {
        carregarDadosDaNuvem(chaveInformada.trim(), true);
    }
}

function liberarApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'block';
    
    carregarLogo();
    aplicarCorPrincipal(dadosRestaurante.corPrincipal || "#2c3e50");
    atualizarSelectCategorias();
    renderizarEstoque();
    renderizarCompras();
}

function sairDaConta() {
    if (confirm("Deseja sair da sua conta atual?")) {
        localStorage.removeItem('chaveRestaurante');
        chaveAtual = null;
        document.getElementById('app-screen').style.display = 'none';
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('login-card').style.display = 'block';
        document.getElementById('register-card').style.display = 'none';
        document.getElementById('input-chave-login').value = '';
    }
}

function salvarDados() {
    if (db && chaveAtual) {
        db.collection("restaurantes").doc(chaveAtual).set(dadosRestaurante).catch(err => {
            console.warn("Aviso: Não foi possível sincronizar com a nuvem.");
            db = null;
        });
    }
    if (chaveAtual) {
        localStorage.setItem('dados_' + chaveAtual, JSON.stringify(dadosRestaurante));
    }
}

function toggleMenu() {
    const navMenu = document.getElementById('nav-menu');
    navMenu.classList.toggle('show');
}

document.addEventListener('click', (e) => {
    const header = document.querySelector('.app-header');
    const navMenu = document.getElementById('nav-menu');
    if (header && navMenu && !header.contains(e.target) && navMenu.classList.contains('show')) {
        navMenu.classList.remove('show');
    }
});

function switchTab(tabId) {
    document.querySelectorAll('.tab-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    const tabEl = document.getElementById(`tab-${tabId}`);
    if (tabEl) tabEl.classList.add('active');
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    const navMenu = document.getElementById('nav-menu');
    if (navMenu) navMenu.classList.remove('show');

    if(tabId === 'compras') {
        renderizarCompras();
    }
}

function trocarLogo(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imgUrl = e.target.result;
            document.getElementById('logo-img').src = imgUrl;
            dadosRestaurante.logoUrl = imgUrl;
            salvarDados();
        }
        reader.readAsDataURL(file);
    }
}

function carregarLogo() {
    if(dadosRestaurante.logoUrl) {
        document.getElementById('logo-img').src = dadosRestaurante.logoUrl;
    }
}

function mudarCorPrincipal(corHex) {
    dadosRestaurante.corPrincipal = corHex;
    salvarDados();
    aplicarCorPrincipal(corHex);
}

function aplicarCorPrincipal(corHex) {
    document.documentElement.style.setProperty('--primary-color', corHex);
    const colorInput = document.getElementById('cor-principal');
    const codigoCorText = document.getElementById('codigo-cor');
    if (colorInput) colorInput.value = corHex;
    if (codigoCorText) codigoCorText.textContent = corHex;
}

function resetarCor() {
    mudarCorPrincipal("#2c3e50");
}

function adicionarCategoria() {
    const input = document.getElementById('nova-categoria');
    const nomeCat = input.value.trim();

    if(!nomeCat) return alert("Digite o nome da categoria!");

    const categoriaExiste = dadosRestaurante.categorias.some(
        cat => cat.toLowerCase() === nomeCat.toLowerCase()
    );

    if (categoriaExiste) {
        return alert("Erro: Já existe uma categoria com este nome!");
    }

    dadosRestaurante.categorias.push(nomeCat);
    salvarDados();
    atualizarSelectCategorias();
    input.value = "";
    alert("Categoria adicionada com sucesso!");
}

function atualizarSelectCategorias() {
    const select = document.getElementById('categoria-item');
    if (!select) return;
    select.innerHTML = '<option value="">Selecione uma categoria</option>';
    
    dadosRestaurante.categorias.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
}

function salvarItem(e) {
    e.preventDefault();

    const nome = document.getElementById('nome-item').value.trim();
    const categoria = document.getElementById('categoria-item').value;

    if(!nome) return alert("Digite o nome do item!");

    const itemExiste = dadosRestaurante.itens.some(
        item => item.nome.toLowerCase() === nome.toLowerCase()
    );

    if (itemExiste) {
        return alert("Erro: Este item já está cadastrado no sistema!");
    }

    const novoItem = {
        id: Date.now().toString(),
        nome,
        categoria,
        emFalta: false
    };

    dadosRestaurante.itens.push(novoItem);
    salvarDados();

    document.getElementById('form-item').reset();
    renderizarEstoque();
    alert("Item cadastrado com sucesso!");
}

function renderizarEstoque(filtro = '') {
    const tbody = document.getElementById('tabela-estoque-corpo');
    if (!tbody) return;
    tbody.innerHTML = '';

    const itensFiltrados = dadosRestaurante.itens.filter(item => 
        item.nome.toLowerCase().includes(filtro.toLowerCase()) || 
        item.categoria.toLowerCase().includes(filtro.toLowerCase())
    );

    if(itensFiltrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #7f8c8d;">Nenhum item encontrado.</td></tr>`;
        return;
    }

    itensFiltrados.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${item.nome}</strong></td>
            <td>${item.categoria}</td>
            <td>
                <button class="btn ${item.emFalta ? 'btn-success' : 'btn-danger'}" style="padding: 4px 8px; font-size: 0.8rem;" onclick="toggleFalta('${item.id}')">
                    <i class="fa-solid ${item.emFalta ? 'fa-check' : 'fa-cart-plus'}"></i> ${item.emFalta ? 'Marcar OK' : 'Comprar'}
                </button>
                <button class="btn btn-danger" style="padding: 4px 8px; font-size: 0.8rem;" onclick="deletarItem('${item.id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filtrarEstoque() {
    const termo = document.getElementById('pesquisa-estoque').value;
    renderizarEstoque(termo);
}

function toggleFalta(id) {
    const item = dadosRestaurante.itens.find(i => i.id === id);
    if(item) {
        item.emFalta = !item.emFalta;
        salvarDados();
        renderizarEstoque(document.getElementById('pesquisa-estoque').value);
    }
}

function deletarItem(id) {
    if(confirm("Tem certeza que deseja deletar este item permanentemente?")) {
        dadosRestaurante.itens = dadosRestaurante.itens.filter(i => i.id !== id);
        salvarDados();
        renderizarEstoque(document.getElementById('pesquisa-estoque').value);
        renderizarCompras();
    }
}

// Removi o filtro de busca da renderização das compras
function renderizarCompras() {
    const tbody = document.getElementById('tabela-compras-corpo');
    if (!tbody) return;
    tbody.innerHTML = '';

    const itensFalta = dadosRestaurante.itens.filter(item => item.emFalta);

    if(itensFalta.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: #7f8c8d;">Nenhum item na lista de compras. 🎉</td></tr>`;
        return;
    }

    itensFalta.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${item.nome}</strong></td>
            <td><input type="text" class="obs-input" placeholder="Ex: 2kg, marca X..." oninput="this.setAttribute('value', this.value);"></td>
        `;
        tbody.appendChild(tr);
    });

    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    document.getElementById('pdf-data').textContent = new Date().toLocaleDateString('pt-BR', options);
    document.getElementById('pdf-titulo-empresa').textContent = `Lista de Compras - ${dadosRestaurante.nomeRestaurante || 'Restaurante'}`;
}

// Nova função para limpar a lista de compras inteira
function limparListaCompras() {
    const temItensNaLista = dadosRestaurante.itens.some(item => item.emFalta);
    
    if (!temItensNaLista) {
        return alert("A lista de compras já está vazia!");
    }

    if(confirm("Deseja limpar toda a lista de compras? Todos os itens voltarão ao status de Disponível no estoque.")) {
        dadosRestaurante.itens.forEach(item => {
            item.emFalta = false;
        });
        
        salvarDados();
        
        // Atualiza a tela de compras e o estoque
        renderizarCompras();
        const inputEstoque = document.getElementById('pesquisa-estoque');
        renderizarEstoque(inputEstoque ? inputEstoque.value : '');
    }
}

function gerarPDF() {
    const element = document.getElementById('pdf-content');
    const opt = {
      margin:       10,
      filename:     `lista_compras_restaurante.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(element).set(opt).save();
}