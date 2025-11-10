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

// --- Gerenciamento de Autenticação ---

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const tipo = document.getElementById('tipo').value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha, tipo })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        // Salva o token (localStorage é simples, mas para Electron seguro,
        // o ideal seria salvar no main process via IPC)
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('userType', tipo);

        // Atualiza a UI
        showAppView(tipo, data.user);

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
    } else if (tipo === 'rh') {
        funcionarioArea.style.display = 'none';
        rhArea.style.display = 'block';
    }
}

function showLoginView() {
    loginView.style.display = 'block';
    appView.style.display = 'none';
    pontoStatus.textContent = '';
    loginError.textContent = '';
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
                'Authorization': `Bearer ${token}` // Envia o Token!
            },
            body: JSON.stringify({ tipo_registro: tipo })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        pontoStatus.textContent = data.message;

    } catch (error) {
        pontoStatus.textContent = `Erro: ${error.message}`;
    }
}

// --- Verificação Inicial ---
// Tenta carregar o usuário se o token já existir
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    const tipo = localStorage.getItem('userType');

    if (token && user && tipo) {
        showAppView(tipo, user);
    }
});