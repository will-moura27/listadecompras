const firebaseConfig = {
    apiKey: "AIzaSyBrT5rwo37zNGpyjTxA6APfIpFZAjhMhfM",
    authDomain: "gestaorestaurante-31294.firebaseapp.com",
    projectId: "gestaorestaurante-31294",
    storageBucket: "gestaorestaurante-31294.firebasestorage.app",
    messagingSenderId: "368047144922",
    appId: "1:368047144922:web:5f15beed8ad29776c1cae3"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let usuarioAtualUID = null;
let dadosUsuario = null;
let dadosRestaurante = null;

// ==========================================
// CONFIGURAÇÕES DE PAGAMENTO (MVP MANUAL)
// ==========================================
// 1. Cole aqui o link de pagamento gerado lá no painel do Stripe
const LINK_PAGAMENTO_STRIPE = "https://buy.stripe.com/test_14A3cx3SxcmV8Up8bBeQM00"; 

// 2. Coloque seu celular com DDI (55) + DDD + Número. Tudo junto, sem espaços.
const NUMERO_WHATSAPP_ADMIN = "5511949545661"; 


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
// NAVEGAÇÃO DE AUTENTICAÇÃO
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
// AÇÕES DE CADASTRO E MIGRAÇÃO
// ==========================================
async function realizarCadastro(e) {
    e.preventDefault();
    const nomeRestaurante = document.getElementById('reg-nome-restaurante').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const senha = document.getElementById('reg-senha').value.trim();

    try {
        const credencial = await auth.createUserWithEmailAndPassword(email, senha);
        await credencial.user.sendEmailVerification();
        
        const lojaId = 'loja_' + Date.now();
        const novoUsuario = {
            plano: 'gratis',
            lojaAtiva: lojaId,
            lojas: {
                [lojaId]: {
                    nomeRestaurante: nomeRestaurante,
                    logoUrl: "",
                    corPrincipal: "#2c3e50",
                    categorias: ["Grãos e Cereais", "Carnes e Frios", "Hortifrúti", "Limpeza", "Bebidas"],
                    itens: []
                }
            }
        };
        await db.collection("restaurantes").doc(credencial.user.uid).set(novoUsuario);

        alert("✅ Cadastro realizado!\n\nEnviamos um link de confirmação para o seu e-mail.");
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
    try { await auth.signInWithEmailAndPassword(email, senha); } 
    catch (error) { alert("E-mail ou senha incorretos."); }
}

async function migrarContaAntiga(e) {
    e.preventDefault();
    const chaveAntiga = document.getElementById('mig-chave').value.trim();
    const email = document.getElementById('mig-email').value.trim();
    const senha = document.getElementById('mig-senha').value.trim();

    try {
        const docRefAntigo = db.collection("restaurantes").doc(chaveAntiga);
        const doc = await docRefAntigo.get();

        if (!doc.exists) return alert("❌ Chave antiga não encontrada!");

        const credencial = await auth.createUserWithEmailAndPassword(email, senha);
        await credencial.user.sendEmailVerification();

        const dadosAntigos = doc.data();
        const lojaId = 'loja_' + Date.now();
        
        const novoUsuario = {
            plano: 'gratis',
            lojaAtiva: lojaId,
            lojas: { [lojaId]: dadosAntigos }
        };

        await db.collection("restaurantes").doc(credencial.user.uid).set(novoUsuario);
        await docRefAntigo.delete();
        localStorage.removeItem('chaveRestaurante');

        alert("🎉 Conta atualizada com sucesso!\nEnviamos um link de confirmação para o seu e-mail.");
        auth.signOut();
        voltarParaLogin();

    } catch (error) {
        if (error.code === 'auth/email-already-in-use') alert("Este e-mail já está em uso.");
        else alert("Erro na migração: " + error.message);
    }
}

function sairDaConta() {
    if (confirm("Deseja realmente sair da sua conta?")) {
        auth.signOut();
    }
}

function esqueciSenha() {
    const email = prompt("Digite o e-mail cadastrado:");
    if (email) {
        auth.sendPasswordResetEmail(email.trim())
            .then(() => alert("E-mail de recuperação enviado!"))
            .catch(err => alert("Erro ao enviar e-mail."));
    }
}

// ==========================================
// DADOS DA NUVEM & MULTI-LOJAS
// ==========================================
async function carregarDadosDaNuvem(uid) {
    try {
        const docRef = db.collection("restaurantes").doc(uid);
        const doc = await docRef.get();
        
        if (doc.exists) {
            const data = doc.data();
            
            if (!data.plano) data.plano = 'gratis'; 

            if (!data.lojas) {
                const lojaId = 'loja_' + Date.now();
                dadosUsuario = {
                    plano: 'gratis',
                    lojaAtiva: lojaId,
                    lojas: { [lojaId]: data }
                };
                await docRef.set(dadosUsuario);
            } else {
                dadosUsuario = data;
            }

            if (!dadosUsuario.lojas[dadosUsuario.lojaAtiva]) {
                dadosUsuario.lojaAtiva = Object.keys(dadosUsuario.lojas)[0];
            }
            dadosRestaurante = dadosUsuario.lojas[dadosUsuario.lojaAtiva];
        }
    } catch (e) {
        console.warn("Falha na leitura do banco.", e);
    }
}

function salvarDados() {
    if (usuarioAtualUID && dadosUsuario) {
        db.collection("restaurantes").doc(usuarioAtualUID).set(dadosUsuario).catch(err => {
            console.error("Erro ao salvar:", err);
        });
    }
}

// ==========================================
// MÓDULO PAYWALL MVP (NOVO)
// ==========================================
function abrirModalPagamento() {
    document.getElementById('modal-checkout-manual').style.display = 'flex';
}

function fecharModalPagamento() {
    document.getElementById('modal-checkout-manual').style.display = 'none';
}

function abrirLinkStripe() {
    window.open(LINK_PAGAMENTO_STRIPE, '_blank');
}

function enviarComprovanteWhats() {
    const emailCliente = auth.currentUser ? auth.currentUser.email : "Não identificado";
    const mensagem = `Olá! Acabei de realizar o pagamento da assinatura do *Stoka Pro*.\n\nMeu e-mail de acesso é: *${emailCliente}*\n\nSegue o comprovante para ativação:`;
    const url = `https://wa.me/${NUMERO_WHATSAPP_ADMIN}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
}

function renderizarTravaPremium() {
    const lockedView = document.getElementById('premium-locked');
    const unlockedView = document.getElementById('premium-unlocked');
    const headerSelector = document.getElementById('container-seletor-loja');

    if (dadosUsuario.plano === 'premium') {
        if (lockedView) lockedView.style.display = 'none';
        if (unlockedView) unlockedView.style.display = 'block';
        if (headerSelector) {
            headerSelector.style.display = Object.keys(dadosUsuario.lojas).length > 1 ? 'block' : 'none';
        }
    } else {
        if (lockedView) lockedView.style.display = 'block';
        if (unlockedView) unlockedView.style.display = 'none';
        if (headerSelector) headerSelector.style.display = 'none';
    }
}

// ==========================================
// FUNÇÕES DE MÚLTIPLAS LOJAS
// ==========================================
function trocarLojaAtiva(lojaId) {
    if (dadosUsuario.lojas[lojaId]) {
        dadosUsuario.lojaAtiva = lojaId;
        dadosRestaurante = dadosUsuario.lojas[lojaId];
        salvarDados();
        liberarApp();
    }
}

function criarNovaLoja() {
    if (dadosUsuario.plano !== 'premium') return;

    const nome = document.getElementById('nova-loja-nome').value.trim();
    if (!nome) return alert("Digite o nome da nova loja!");

    const novaLojaId = 'loja_' + Date.now();
    dadosUsuario.lojas[novaLojaId] = {
        nomeRestaurante: nome,
        logoUrl: "",
        corPrincipal: "#2c3e50",
        categorias: ["Grãos e Cereais", "Carnes e Frios", "Hortifrúti", "Limpeza", "Bebidas"],
        itens: []
    };
    
    dadosUsuario.lojaAtiva = novaLojaId;
    dadosRestaurante = dadosUsuario.lojas[novaLojaId];
    
    salvarDados();
    liberarApp();
    
    document.getElementById('nova-loja-nome').value = '';
    alert("Loja criada com sucesso!");
}

function deletarLoja(id) {
    if (dadosUsuario.plano !== 'premium') return;

    const qtdeLojas = Object.keys(dadosUsuario.lojas).length;
    if (qtdeLojas <= 1) return alert("Você não pode deletar a sua única loja.");
    
    const nomeDaLoja = dadosUsuario.lojas[id].nomeRestaurante;
    if (confirm(`⚠️ ATENÇÃO: Deseja excluir permanentemente a loja "${nomeDaLoja}"?`)) {
        delete dadosUsuario.lojas[id];
        if (dadosUsuario.lojaAtiva === id) {
            dadosUsuario.lojaAtiva = Object.keys(dadosUsuario.lojas)[0];
        }
        dadosRestaurante = dadosUsuario.lojas[dadosUsuario.lojaAtiva];
        
        salvarDados();
        liberarApp();
    }
}

function salvarNomeLojaAtual() {
    const novoNome = document.getElementById('nome-loja-atual').value.trim();
    if(novoNome) {
        dadosRestaurante.nomeRestaurante = novoNome;
        salvarDados();
        liberarApp();
        alert("Nome atualizado com sucesso!");
    }
}

// ==========================================
// RENDERIZAÇÃO DA INTERFACE (APP SCREEN)
// ==========================================
function liberarApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'block';
    
    renderizarTravaPremium();
    
    carregarLogo();
    aplicarCorPrincipal(dadosRestaurante.corPrincipal || "#2c3e50");
    atualizarSelectCategorias();
    renderizarEstoque();
    renderizarCompras();
    
    renderizarSeletorLojasHeader();
    renderizarListaLojasConfig();
    document.getElementById('nome-loja-atual').value = dadosRestaurante.nomeRestaurante || "";
}

function renderizarSeletorLojasHeader() {
    const selectHeader = document.getElementById('header-seletor-loja');
    if (!selectHeader) return;
    selectHeader.innerHTML = '';
    
    Object.keys(dadosUsuario.lojas).forEach(id => {
        const loja = dadosUsuario.lojas[id];
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = loja.nomeRestaurante || 'Sem nome';
        if (id === dadosUsuario.lojaAtiva) opt.selected = true;
        selectHeader.appendChild(opt);
    });
}

function renderizarListaLojasConfig() {
    const ul = document.getElementById('lista-lojas-config');
    if(!ul) return;
    ul.innerHTML = '';
    
    Object.keys(dadosUsuario.lojas).forEach(id => {
        const loja = dadosUsuario.lojas[id];
        const isAtual = (id === dadosUsuario.lojaAtiva);
        const li = document.createElement('li');
        
        const nomeHtml = `<span><strong>${loja.nomeRestaurante}</strong> ${isAtual ? '<span class="badge-atual">Estoque Atual</span>' : ''}</span>`;
        const btnHtml = Object.keys(dadosUsuario.lojas).length > 1 
            ? `<button class="btn btn-danger btn-sm" onclick="deletarLoja('${id}')" title="Excluir Loja"><i class="fa-solid fa-trash"></i></button>` 
            : '';
            
        li.innerHTML = nomeHtml + btnHtml;
        ul.appendChild(li);
    });
}

// NAVEGAÇÃO DE ABAS
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
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
    const navMenu = document.getElementById('nav-menu');
    if (navMenu) navMenu.classList.remove('show');
    if(tabId === 'compras') renderizarCompras();
}

// ==========================================
// ESTOQUE, ITENS E COMPRAS
// ==========================================
function trocarLogoImagem(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('logo-img').src = e.target.result;
            dadosRestaurante.logoUrl = e.target.result;
            salvarDados();
        }
        reader.readAsDataURL(file);
    }
}

function carregarLogo() {
    if(dadosRestaurante.logoUrl) document.getElementById('logo-img').src = dadosRestaurante.logoUrl;
    else document.getElementById('logo-img').src = "https://placehold.co/150x150?text=Sua+Logo";
}

function mudarCorPrincipal(corHex) {
    dadosRestaurante.corPrincipal = corHex;
    salvarDados();
    aplicarCorPrincipal(corHex);
}

function aplicarCorPrincipal(corHex) {
    document.documentElement.style.setProperty('--primary-color', corHex);
    document.getElementById('cor-principal').value = corHex;
    document.getElementById('codigo-cor').textContent = corHex;
}

function resetarCor() { mudarCorPrincipal("#2c3e50"); }

function adicionarCategoria() {
    const input = document.getElementById('nova-categoria');
    const nomeCat = input.value.trim();
    if(!nomeCat) return alert("Digite o nome da categoria!");
    if (dadosRestaurante.categorias.some(cat => cat.toLowerCase() === nomeCat.toLowerCase())) return alert("Erro: Categoria já existe!");
    
    dadosRestaurante.categorias.push(nomeCat);
    salvarDados();
    atualizarSelectCategorias();
    input.value = "";
    alert("Categoria adicionada!");
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
    if (dadosRestaurante.itens.some(item => item.nome.toLowerCase() === nome.toLowerCase())) return alert("Erro: Item já cadastrado!");

    dadosRestaurante.itens.push({ id: Date.now().toString(), nome, categoria, emFalta: false });
    salvarDados();
    document.getElementById('form-item').reset();
    renderizarEstoque();
    alert("Item cadastrado!");
}

function renderizarEstoque(filtro = '') {
    const tbody = document.getElementById('tabela-estoque-corpo');
    if (!tbody) return;
    tbody.innerHTML = '';
    const itensFiltrados = dadosRestaurante.itens.filter(item => item.nome.toLowerCase().includes(filtro.toLowerCase()) || item.categoria.toLowerCase().includes(filtro.toLowerCase()));

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

function filtrarEstoque() { renderizarEstoque(document.getElementById('pesquisa-estoque').value); }

function toggleFalta(id) {
    const item = dadosRestaurante.itens.find(i => i.id === id);
    if(item) {
        item.emFalta = !item.emFalta;
        salvarDados();
        renderizarEstoque(document.getElementById('pesquisa-estoque').value);
    }
}

function deletarItem(id) {
    if(confirm("Deseja deletar este item permanentemente?")) {
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
        tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: #7f8c8d;">Nenhum item na lista da loja <strong>${dadosRestaurante.nomeRestaurante}</strong>. 🎉</td></tr>`;
        return;
    }

    itensFalta.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>${item.nome}</strong></td><td><input type="text" class="obs-input" placeholder="Ex: 2kg..." oninput="this.setAttribute('value', this.value);"></td>`;
        tbody.appendChild(tr);
    });
    document.getElementById('pdf-data').textContent = new Date().toLocaleDateString('pt-BR');
    document.getElementById('pdf-titulo-empresa').textContent = `Lista de Compras - Stoka (${dadosRestaurante.nomeRestaurante})`;
}

function limparListaCompras() {
    if (!dadosRestaurante.itens.some(item => item.emFalta)) return alert("A lista já está vazia!");
    if(confirm("Deseja limpar toda a lista de compras desta loja?")) {
        dadosRestaurante.itens.forEach(item => item.emFalta = false);
        salvarDados();
        renderizarCompras();
        renderizarEstoque(document.getElementById('pesquisa-estoque').value);
    }
}

function gerarPDF() {
    const pdfHeader = document.querySelector('.pdf-header-info');
    if(pdfHeader) pdfHeader.style.display = 'block';
    const opt = { margin: 10, filename: `compras_${dadosRestaurante.nomeRestaurante}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    html2pdf().from(document.getElementById('pdf-content')).set(opt).save().then(() => { if(pdfHeader) pdfHeader.style.display = 'none'; });
}

async function compartilharLista() {
    const itensFalta = dadosRestaurante.itens.filter(item => item.emFalta);
    if (itensFalta.length === 0) return alert("A lista está vazia!");
    let texto = `🛒 *Lista de Compras - Stoka (${dadosRestaurante.nomeRestaurante})*\n📅 *Data:* ${new Date().toLocaleDateString('pt-BR')}\n\n`;
    document.querySelectorAll('#tabela-compras-corpo tr').forEach(linha => {
        const obsInput = linha.querySelector('.obs-input');
        const obs = (obsInput && obsInput.value.trim() !== '') ? ` - ${obsInput.value.trim()}` : '';
        texto += `▫️ ${linha.querySelector('strong').innerText}${obs}\n`;
    });
    if (navigator.share) { try { await navigator.share({ title: `Compras - Stoka`, text: texto }); } catch (e) {} } 
    else { navigator.clipboard.writeText(texto).then(() => alert("Lista copiada!")).catch(() => alert("Erro ao copiar.")); }
}