// Endereço da sua API backend
const API_URL = 'http://localhost:3000';

// Elementos da DOM
const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('login-error');
const welcomeMessage = document.getElementById('welcome-message');
const logoutButton = document.getElementById('logoutButton');
const funcionarioArea = document.getElementById('funcionario-area');
const rhArea = document.getElementById('rh-area');
const btnEntrada = document.getElementById('btnEntrada');
const btnSaida = document.getElementById('btnSaida');
const pontoStatus = document.getElementById('ponto-status');
const listaRegistrosDiv = document.getElementById('lista-registros');
const solicitacaoForm = document.getElementById('solicitacaoForm');
const solicitacaoStatus = document.getElementById('solicitacao-status');
const entregaForm = document.getElementById('entregaForm');
const entregaStatus = document.getElementById('entrega-status');
const registroFuncionarioForm = document.getElementById('registroFuncionarioForm');
const rhStatus = document.getElementById('rh-status');
// Novos elementos do RH
const rhSelectFuncionario = document.getElementById('rh_select_funcionario');
const rhBtnGerarRelatorio = document.getElementById('rh_btn_gerar_relatorio');
const rhRelatorioStatus = document.getElementById('rh-relatorio-status');
const rhRelatorioResultado = document.getElementById('rh_relatorio_resultado');
const relatorioPontosContent = document.getElementById('relatorio_pontos_content');
const relatorioEntregasContent = document.getElementById('relatorio_entregas_content');


// --- Gerenciamento de Autenticação ---

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    // A LINHA DO 'tipo' FOI REMOVIDA DAQUI

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Enviamos apenas email e senha
            body: JSON.stringify({ email, senha }) 
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        // Agora, recebemos o 'tipo' do backend
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('userType', data.tipo); // Guardamos o tipo que o backend nos disse

        // Passamos o data.tipo para a função showAppView
        showAppView(data.tipo, data.user); 

    } catch (error) {
        loginError.textContent = `Erro: ${error.message}`;
    }
});

logoutButton.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
    showLoginView();
});

function showAppView(tipo, user) {
    loginView.style.display = 'none';
    appView.style.display = 'block';
    welcomeMessage.textContent = `Bem-vindo(a), ${user.nome}!`;

    if (tipo === 'funcionario') {
        funcionarioArea.style.display = 'block';
        rhArea.style.display = 'none';
        carregarMeusRegistros();
    } else if (tipo === 'rh') {
        funcionarioArea.style.display = 'none';
        rhArea.style.display = 'block';
        carregarListaFuncionariosParaRH(); // Carrega a lista de funcionários para o RH
    }
}

function showLoginView() {
    loginView.style.display = 'block';
    appView.style.display = 'none';
    pontoStatus.textContent = '';
    loginError.textContent = '';
    solicitacaoStatus.textContent = '';
    entregaStatus.textContent = '';
    rhStatus.textContent = '';
    rhRelatorioStatus.textContent = '';
    rhRelatorioResultado.style.display = 'none';
}

// --- Ações do Funcionário ---

btnEntrada.addEventListener('click', () => registrarPonto('Entrada'));
btnSaida.addEventListener('click', () => registrarPonto('Saida'));

async function registrarPonto(tipo) {
    pontoStatus.textContent = 'Registrando...';
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/ponto/registrar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ tipo_registro: tipo })
        });
        const data = await response.json();
        if (!response.ok) { throw new Error(data.message); }
        pontoStatus.textContent = data.message;
        carregarMeusRegistros();
    } catch (error) {
        pontoStatus.textContent = `Erro: ${error.message}`;
    }
}

// --- Ações do Funcionário (Carregar Registros) ---
async function carregarMeusRegistros() {
    listaRegistrosDiv.innerHTML = '<p>Carregando registros...</p>';
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/ponto/meus-registros`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) { throw new Error(data.message); }

        listaRegistrosDiv.innerHTML = '';
        if (data.registros && data.registros.length > 0) {
            const ul = document.createElement('ul');
            ul.style.listStyle = 'none';
            ul.style.paddingLeft = '0';
            data.registros.forEach(registro => {
                const li = document.createElement('li');
                const dataHora = new Date(registro.data_hora);
                const formatado = `${dataHora.toLocaleDateString('pt-BR')} ${dataHora.toLocaleTimeString('pt-BR')}`;
                li.style.color = registro.tipo_registro === 'Entrada' ? 'blue' : 'red';
                li.style.borderBottom = '1px solid #eee';
                li.style.padding = '5px 0';
                li.textContent = `[${registro.tipo_registro}] - ${formatado}`;
                ul.appendChild(li);
            });
            listaRegistrosDiv.appendChild(ul);
        } else {
            listaRegistrosDiv.innerHTML = '<p>Nenhum registro encontrado.</p>';
        }
    } catch (error) {
        listaRegistrosDiv.innerHTML = `<p style="color: red;">Erro ao carregar registros: ${error.message}</p>`;
    }
}

// --- Ações do Funcionário (Enviar Solicitação) ---
solicitacaoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    solicitacaoStatus.textContent = 'Enviando...';
    solicitacaoStatus.style.color = 'blue';

    const tipo_solicitacao = document.getElementById('tipo_solicitacao').value;
    const justificativa = document.getElementById('justificativa').value;
    const anexo_atestado = document.getElementById('anexo_atestado').value;
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/ponto/solicitar-ajuste`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                tipo_solicitacao,
                justificativa,
                anexo_atestado: anexo_atestado || null
            })
        });
        const data = await response.json();
        if (!response.ok) { throw new Error(data.message); }
        solicitacaoStatus.style.color = 'green';
        solicitacaoStatus.textContent = data.message;
        solicitacaoForm.reset();
    } catch (error) {
        solicitacaoStatus.style.color = 'red';
        solicitacaoStatus.textContent = `Erro: ${error.message}`;
    }
});

// --- Ações do Funcionário (Registrar Entrega) ---
entregaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    entregaStatus.textContent = 'Registrando...';
    entregaStatus.style.color = 'blue';

    const descricao_mercadoria = document.getElementById('descricao_mercadoria').value;
    const numero_nota_fiscal = document.getElementById('numero_nota_fiscal').value;
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/ponto/registrar-entrega`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                descricao_mercadoria,
                numero_nota_fiscal: numero_nota_fiscal || null
            })
        });
        const data = await response.json();
        if (!response.ok) { throw new Error(data.message); }
        entregaStatus.style.color = 'green';
        entregaStatus.textContent = data.message;
        entregaForm.reset();
    } catch (error) {
        entregaStatus.style.color = 'red';
        entregaStatus.textContent = `Erro: ${error.message}`;
    }
});

// --- Ações do RH ---
registroFuncionarioForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    rhStatus.textContent = 'Registrando...';
    rhStatus.style.color = 'blue';

    const nome_completo = document.getElementById('reg_nome').value;
    const cpf = document.getElementById('reg_cpf').value;
    const email = document.getElementById('reg_email').value;
    const senha = document.getElementById('reg_senha').value;
    const data_admissao = document.getElementById('reg_data_admissao').value;
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/rh/registrar-funcionario`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                nome_completo, cpf, email, senha, data_admissao
            })
        });
        const data = await response.json();
        if (!response.ok) { throw new Error(data.message); }
        rhStatus.style.color = 'green';
        rhStatus.textContent = data.message;
        registroFuncionarioForm.reset();
    } catch (error) {
        rhStatus.style.color = 'red';
        rhStatus.textContent = `Erro: ${error.message}`;
    }
});

// --- Ações do RH (Carregar Lista de Funcionários) ---
async function carregarListaFuncionariosParaRH() {
    rhSelectFuncionario.innerHTML = '<option value="">-- Carregando... --</option>';
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/rh/funcionarios`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) { throw new Error(data.message); }

        rhSelectFuncionario.innerHTML = '<option value="">-- Selecione um funcionário --</option>';
        if (data.funcionarios && data.funcionarios.length > 0) {
            data.funcionarios.forEach(func => {
                const option = document.createElement('option');
                option.value = func.id_funcionario;
                option.textContent = func.nome_completo;
                rhSelectFuncionario.appendChild(option);
            });
        } else {
            rhSelectFuncionario.innerHTML = '<option value="">-- Nenhum funcionário cadastrado --</option>';
        }
    } catch (error) {
        rhSelectFuncionario.innerHTML = `<option value="">-- Erro ao carregar --</option>`;
    }
}

// --- Ações do RH (Gerar Relatório) ---
rhBtnGerarRelatorio.addEventListener('click', async () => {
    const id_funcionario = rhSelectFuncionario.value;
    const token = localStorage.getItem('token');

    if (!id_funcionario) {
        rhRelatorioStatus.textContent = 'Por favor, selecione um funcionário.';
        rhRelatorioStatus.style.color = 'red';
        return;
    }

    rhRelatorioStatus.textContent = 'Gerando relatório...';
    rhRelatorioStatus.style.color = 'blue';
    rhRelatorioResultado.style.display = 'none';

    try {
        const response = await fetch(`${API_URL}/rh/relatorio/${id_funcionario}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json(); // Espera { pontos: [], entregas: [] }
        if (!response.ok) { throw new Error(data.message); }

        // 1. Renderizar Registros de Ponto
        relatorioPontosContent.innerHTML = '';
        if (data.pontos && data.pontos.length > 0) {
            data.pontos.forEach(ponto => {
                const dataHora = new Date(ponto.data_hora);
                const formatado = `${dataHora.toLocaleDateString('pt-BR')} ${dataHora.toLocaleTimeString('pt-BR')}`;
                const p = document.createElement('p');
                p.style.color = ponto.tipo_registro === 'Entrada' ? 'blue' : 'red';
                p.style.margin = '2px 0';
                p.style.borderBottom = '1px solid #eee';
                p.style.padding = '2px';
                p.textContent = `[${ponto.tipo_registro}] - ${formatado}`;
                relatorioPontosContent.appendChild(p);
            });
        } else {
            relatorioPontosContent.innerHTML = '<p>Nenhum registro de ponto encontrado.</p>';
        }

        // 2. Renderizar Entregas
        relatorioEntregasContent.innerHTML = '';
        if (data.entregas && data.entregas.length > 0) {
            data.entregas.forEach(entrega => {
                const dataHora = new Date(entrega.data_hora_entrega);
                const formatado = `${dataHora.toLocaleDateString('pt-BR')} ${dataHora.toLocaleTimeString('pt-BR')}`;
                const p = document.createElement('p');
                p.style.margin = '2px 0';
                p.style.borderBottom = '1px solid #eee';
                p.style.padding = '2px';
                p.textContent = `[${formatado}] - ${entrega.descricao_mercadoria} (NF: ${entrega.numero_nota_fiscal || 'N/A'})`;
                relatorioEntregasContent.appendChild(p);
            });
        } else {
            relatorioEntregasContent.innerHTML = '<p>Nenhum registro de entrega encontrado.</p>';
        }

        // 3. Mostrar resultados
        rhRelatorioStatus.textContent = `Relatório de: ${rhSelectFuncionario.options[rhSelectFuncionario.selectedIndex].text}`;
        rhRelatorioStatus.style.color = 'black';
        rhRelatorioResultado.style.display = 'block';

    } catch (error) {
        rhRelatorioStatus.textContent = `Erro: ${error.message}`;
        rhRelatorioStatus.style.color = 'red';
    }
});


// --- Verificação Inicial ---
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    const tipo = localStorage.getItem('userType');
    if (token && user && tipo) {
        showAppView(tipo, user);
    }
});