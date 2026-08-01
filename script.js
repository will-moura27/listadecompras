// Configuração real do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBrT5rwo37zNGpyjTxA6APfIpFZAjhMhfM",
    authDomain: "gestaorestaurante-31294.firebaseapp.com",
    projectId: "gestaorestaurante-31294",
    storageBucket: "gestaorestaurante-31294.firebasestorage.app",
    messagingSenderId: "368047144922",
    appId: "1:368047144922:web:5f15beed8ad29776c1cae3"
};

// Inicialização Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let usuarioAtualUID = null;
let dadosRestaurante = {
    nomeRestaurante: "Meu Restaurante",
    logoUrl: "",
    corPrincipal: "#2c3e50",
    categorias: ["Grãos e Cereais", "Carnes e Frios", "Hortifrúti", "Limpeza", "Bebidas"],
    itens: []
};

// ==========================================
// MONITOR DE SESSÃO
// ==========================================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        if (user.emailVerified) {
            usuarioAtualUID = user.uid;
            await carregarDadosDaNuvem(usuarioAtualUID);
            liberarApp();
        } else {
            alert("⚠️ Seu e-mail ainda não foi verificado!\nAcesse sua caixa de entrada, clique no link que enviamos e tente entrar novamente.");
            auth.signOut();
        }
    } else {
        usuarioAtualUID = null;
        document.getElementById('app-screen').style.display = 'none';
        document.getElementById('auth-screen').style.display = 'flex';
        voltarParaLogin();
    }
});

// ==========================================
// FUNÇÕES DE NAVEGAÇÃO DE AUTENTICAÇÃO
// ==========================================
function mostrarTelaCadastro() {
    document.getElementById('login-card').style.display = 'none';
    document.getElementById('migrate-card').style.display = 'none';
    document.getElementById('register-card').style.display = 'block';
}

function mostrarTelaMigracao() {
    document.getElementById('login-card').style.display = 'none';
    document.getElementById('register-card').style.display = 'none';
    document.getElementById('migrate-card').style.display = 'block';
}

function voltarParaLogin() {
    document.getElementById('register-card').style.display = 'none';
    document.getElementById('migrate-card').style.display = 'none';
    document.getElementById('login-card').style.display = 'block';
}

// ==========================================
// FUNÇÕES DE AÇÃO DE AUTENTICAÇÃO
// ==========================================
async function realizarCadastro(e) {
    e.preventDefault();
    const nomeRestaurante = document.getElementById('reg-nome-restaurante').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const senha = document.getElementById('reg-senha').value.trim();

    try {
        const credencial = await auth.createUserWithEmailAndPassword(email, senha);
        await credencial.user.sendEmailVerification();
        
        dadosRestaurante.nomeRestaurante = nomeRestaurante;
        await db.collection("restaurantes").doc(credencial.user.uid).set(dadosRestaurante);

        alert("✅ Cadastro realizado!\n\nEnviamos um link de confirmação para o seu e-mail. Você precisa clicar nele antes de entrar.");
        auth.signOut();
        voltarParaLogin();
        
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') alert("Este e-mail já está cadastrado.");
        else alert("Erro ao cadastrar: " + error.message);
    }
}

async function fazerLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value.trim();

    try {
        await auth.signInWithEmailAndPassword(email, senha);
    } catch (error) {
        alert("E-mail ou senha incorretos.");
    }
}

async function migrarContaAntiga(e) {
    e.preventDefault();
    const chaveAntiga = document.getElementById('mig-chave').value.trim();
    const email = document.getElementById('mig-email').value.trim();
    const senha = document.getElementById('mig-senha').value.trim();

    try {
        const docRefAntigo = db.collection("restaurantes").doc(chaveAntiga);
        const doc = await docRefAntigo.get();

        if (!doc.exists) {
            return alert("❌ Chave antiga não encontrada! Verifique se digitou exatamente como usava antes.");
        }

        const credencial = await auth.createUserWithEmailAndPassword(email, senha);
        await credencial.user.sendEmailVerification();

        const dadosAntigos = doc.data();
        await db.collection("restaurantes").doc(credencial.user.uid).set(dadosAntigos);

        await docRefAntigo.delete();
        localStorage.removeItem('chaveRestaurante');

        alert("🎉 Conta atualizada com sucesso!\nSeus dados foram salvos.\n\nEnviamos um link de confirmação para o seu e-mail. Clique nele para poder acessar seu estoque.");
        
        auth.signOut();
        voltarParaLogin();

    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            alert("Este e-mail já está em uso. Tente outro ou faça login.");
        } else {
            alert("Erro na migração: " + error.message);
        }
    }
}

function sairDaConta() {
    if (confirm("Deseja realmente sair da sua conta?")) {
        auth.signOut();
    }
}

function esqueciSenha() {
    const emailInformado = prompt("Digite o e-mail cadastrado para receber o link de redefinição:");
    if (emailInformado) {
        auth.sendPasswordResetEmail(emailInformado.trim())
            .then(() => alert("E-mail de recuperação enviado! Verifique sua caixa de entrada."))
            .catch(err => alert("Erro ao enviar e-mail."));
    }
}

// ==========================================
// FUNÇÕES DE DADOS E INTERFACE (CLOUD FIREBASE)
// ==========================================
async function carregarDadosDaNuvem(uid) {
    try {
        const docRef = db.collection("restaurantes").doc(uid);
        const doc = await docRef.get();
        if (doc.exists) {
            dadosRestaurante = doc.data();
        } else {
            await salvarDados();
        }
    } catch (e) {
        console.warn("Falha na leitura do banco.", e);
    }
}

function salvarDados() {
    if (usuarioAtualUID) {
        db.collection("restaurantes").doc(usuarioAtualUID).set(dadosRestaurante).catch(err => {
            console.error("Erro ao salvar:", err);
        });
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

    if(tabId === 'compras') renderizarCompras();
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

function resetarCor() { mudarCorPrincipal("#2c3e50"); }

function adicionarCategoria() {
    const input = document.getElementById('nova-categoria');
    const nomeCat = input.value.trim();

    if(!nomeCat) return alert("Digite o nome da categoria!");

    const categoriaExiste = dadosRestaurante.categorias.some(cat => cat.toLowerCase() === nomeCat.toLowerCase());
    if (categoriaExiste) return alert("Erro: Já existe uma categoria com este nome!");

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

    const itemExiste = dadosRestaurante.itens.some(item => item.nome.toLowerCase() === nome.toLowerCase());
    if (itemExiste) return alert("Erro: Este item já está cadastrado no sistema!");

    dadosRestaurante.itens.push({ id: Date.now().toString(), nome, categoria, emFalta: false });
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
    renderizarEstoque(document.getElementById('pesquisa-estoque').value);
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
    
    // Atualiza o título do PDF com a nova marca
    document.getElementById('pdf-titulo-empresa').textContent = `Lista de Compras - Stoka (${dadosRestaurante.nomeRestaurante || 'Restaurante'})`;
}

function limparListaCompras() {
    const temItensNaLista = dadosRestaurante.itens.some(item => item.emFalta);
    if (!temItensNaLista) return alert("A lista de compras já está vazia!");

    if(confirm("Deseja limpar toda a lista de compras? Todos os itens voltarão ao status de Disponível.")) {
        dadosRestaurante.itens.forEach(item => item.emFalta = false);
        salvarDados();
        renderizarCompras();
        const inputEstoque = document.getElementById('pesquisa-estoque');
        renderizarEstoque(inputEstoque ? inputEstoque.value : '');
    }
}

function gerarPDF() {
    // Exibe o cabeçalho do PDF antes de gerar
    const pdfHeader = document.querySelector('.pdf-header-info');
    if(pdfHeader) pdfHeader.style.display = 'block';

    const element = document.getElementById('pdf-content');
    const opt = {
      margin: 10,
      filename: `lista_compras_stoka.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().from(element).set(opt).save().then(() => {
        // Esconde o cabeçalho novamente após gerar o arquivo
        if(pdfHeader) pdfHeader.style.display = 'none';
    });
}

async function compartilharLista() {
    const itensFalta = dadosRestaurante.itens.filter(item => item.emFalta);
    if (itensFalta.length === 0) return alert("A lista de compras está vazia!");

    const dataAtual = new Date().toLocaleDateString('pt-BR');
    let texto = `🛒 *Lista de Compras - Stoka (${dadosRestaurante.nomeRestaurante || 'Restaurante'})*\n📅 *Data:* ${dataAtual}\n\n`;
    
    document.querySelectorAll('#tabela-compras-corpo tr').forEach(linha => {
        const nomeItem = linha.querySelector('strong').innerText;
        const obsInput = linha.querySelector('.obs-input');
        const obs = (obsInput && obsInput.value.trim() !== '') ? ` - ${obsInput.value.trim()}` : '';
        texto += `▫️ ${nomeItem}${obs}\n`;
    });

    if (navigator.share) {
        try { await navigator.share({ title: `Compras - Stoka`, text: texto }); } 
        catch (error) { console.log('Compartilhamento cancelado.'); }
    } else {
        navigator.clipboard.writeText(texto)
            .then(() => alert("Lista copiada! Cole no WhatsApp."))
            .catch(() => alert("Erro ao tentar copiar a lista."));
    }
}

// ==========================================
// FUNÇÃO DO BOTÃO DE INSTALAR (PWA)
// ==========================================
let deferredPrompt;
const btnInstalar = document.getElementById('btn-instalar');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (btnInstalar) btnInstalar.style.display = 'inline-flex';
});

if (btnInstalar) {
    btnInstalar.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') console.log('Stoka instalado!');
            deferredPrompt = null;
            btnInstalar.style.display = 'none';
        }
    });
}