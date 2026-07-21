// Estrutura de Dados Principal (Carregada do LocalStorage ou vazias)
let dadosRestaurante = JSON.parse(localStorage.getItem('dadosRestaurante')) || {
    logoUrl: "",
    categorias: ["Grãos e Cereais", "Carnes e Frios", "Hortifrúti", "Limpeza", "Bebidas"],
    itens: []
};

// Inicialização ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    carregarLogo();
    atualizarSelectCategorias();
    renderizarEstoque();
    renderizarCompras();
});

// Salvar no LocalStorage
function salvarDados() {
    localStorage.setItem('dadosRestaurante', JSON.stringify(dadosRestaurante));
}

// Controle do Menu Hambúrguer (Fecha se clicar fora)
function toggleMenu() {
    const navMenu = document.getElementById('nav-menu');
    navMenu.classList.toggle('show');
}

document.addEventListener('click', (e) => {
    const header = document.querySelector('.app-header');
    const navMenu = document.getElementById('nav-menu');
    if (!header.contains(e.target) && navMenu.classList.contains('show')) {
        navMenu.classList.remove('show');
    }
});

// Trocar de Abas
function switchTab(tabId) {
    document.querySelectorAll('.tab-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(`tab-${tabId}`).classList.add('active');
    event.currentTarget.classList.add('active');

    // Fecha o menu ao selecionar
    document.getElementById('nav-menu').classList.remove('show');

    if(tabId === 'compras') {
        renderizarCompras();
    }
}

// Gerenciar Logo por Upload
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

// Gerenciar Categorias (Com validação para evitar repetidas, ignorando maiúsculas/minúsculas)
function adicionarCategoria() {
    const input = document.getElementById('nova-categoria');
    const nomeCat = input.value.trim();

    if(!nomeCat) return alert("Digite o nome da categoria!");

    // Validação: Verifica se já existe alguma categoria com o mesmo nome (comparando em minúsculas)
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
    select.innerHTML = '<option value="">Selecione uma categoria</option>';
    
    dadosRestaurante.categorias.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
}

// Gerenciar Itens (Com validação para evitar itens repetidos)
function salvarItem(e) {
    e.preventDefault();

    const nome = document.getElementById('nome-item').value.trim();
    const categoria = document.getElementById('categoria-item').value;
    const quantidade = document.getElementById('quantidade-item').value.trim();
    const emFalta = document.getElementById('falta-item').checked;

    if(!nome) return alert("Digite o nome do item!");

    // Validação: Verifica se já existe um item com exatamente o mesmo nome cadastrado
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
        quantidade,
        emFalta
    };

    dadosRestaurante.itens.push(novoItem);
    salvarDados();

    document.getElementById('form-item').reset();
    renderizarEstoque();
    alert("Item cadastrado com sucesso!");
}

function renderizarEstoque(filtro = '') {
    const tbody = document.getElementById('tabela-estoque-corpo');
    tbody.innerHTML = '';

    const itensFiltrados = dadosRestaurante.itens.filter(item => 
        item.nome.toLowerCase().includes(filtro.toLowerCase()) || 
        item.categoria.toLowerCase().includes(filtro.toLowerCase())
    );

    if(itensFiltrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #7f8c8d;">Nenhum item encontrado.</td></tr>`;
        return;
    }

    itensFiltrados.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${item.nome}</strong></td>
            <td>${item.categoria}</td>
            <td>${item.quantidade}</td>
            <td>
                <span class="badge ${item.emFalta ? 'missing' : 'ok'}">
                    ${item.emFalta ? 'Em Falta' : 'Disponível'}
                </span>
            </td>
            <td>
                <button class="btn ${item.emFalta ? 'btn-success' : 'btn-danger'}" style="padding: 4px 8px; font-size: 0.8rem;" onclick="toggleFalta('${item.id}')">
                    <i class="fa-solid ${item.emFalta ? 'fa-check' : 'fa-triangle-exclamation'}"></i> ${item.emFalta ? 'Marcar OK' : 'Faltando'}
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

// Aba de Compras
function renderizarCompras(filtro = '') {
    const tbody = document.getElementById('tabela-compras-corpo');
    tbody.innerHTML = '';

    const itensFalta = dadosRestaurante.itens.filter(item => item.emFalta);
    
    const itensFiltrados = itensFalta.filter(item => 
        item.nome.toLowerCase().includes(filtro.toLowerCase()) || 
        item.categoria.toLowerCase().includes(filtro.toLowerCase())
    );

    if(itensFiltrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #7f8c8d;">Nenhum item faltando no momento. Parabéns! 🎉</td></tr>`;
        return;
    }

    itensFiltrados.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" class="check-compra" checked></td>
            <td><strong>${item.nome}</strong></td>
            <td>${item.categoria}</td>
            <td>${item.quantidade}</td>
        `;
        tbody.appendChild(tr);
    });

    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    document.getElementById('pdf-data').textContent = new Date().toLocaleDateString('pt-BR', options);
    document.getElementById('pdf-titulo-empresa').textContent = `Lista de Compras - Restaurante`;
}

function filtrarCompras() {
    const termo = document.getElementById('pesquisa-compras').value;
    renderizarCompras(termo);
}

// Gerar PDF
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