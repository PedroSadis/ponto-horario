// frontend/renderer.js

const API_BASE_URL = 'http://localhost:3000/api';
const clockButton = document.getElementById('clock-button');
const statusMessage = document.getElementById('status-message');
const pointsList = document.getElementById('points-list');
const alertContainer = document.getElementById('alert-container');

// Simples UUID para identificar o usuário no frontend (substituiria por login real)
const EMPLOYEE_ID = 1; // Vamos usar '1' por enquanto, pois o banco de dados só tem uma tabela

// --- Funções de UI ---

function displayAlert(message, type = 'success') {
    const color = type === 'success' ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700';
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `border px-4 py-3 rounded relative mb-2 ${color}`;
    alertDiv.innerHTML = `<span class="block sm:inline">${message}</span>`;
    
    alertContainer.prepend(alertDiv);
    
    // Remove o alerta após 5 segundos
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function renderPoints(points) {
    pointsList.innerHTML = '';
    
    if (points.length === 0) {
        pointsList.innerHTML = '<p class="text-gray-500 text-sm">Nenhum registro encontrado.</p>';
        return;
    }

    points.forEach(point => {
        const date = new Date(point.timestamp);
        const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const formattedDate = date.toLocaleDateString('pt-BR');
        
        const typeClass = point.type === 'entrada' ? 'text-blue-600 font-bold' : 'text-red-600 font-bold';

        const listItem = document.createElement('div');
        listItem.className = 'flex justify-between items-center p-2 bg-gray-50 rounded-lg';
        listItem.innerHTML = `
            <span class="${typeClass} capitalize">${point.type}</span>
            <span class="text-gray-700">${formattedDate} às ${formattedTime}</span>
        `;
        pointsList.appendChild(listItem);
    });
}

// --- Funções de API ---

async function fetchLatestPoint() {
    try {
        const response = await fetch(`${API_BASE_URL}/points/latest/${EMPLOYEE_ID}`);
        if (!response.ok) throw new Error('Falha ao buscar último ponto.');
        
        const data = await response.json();
        return data.latestPoint;
    } catch (error) {
        console.error('Erro ao buscar último ponto:', error);
        displayAlert('Erro ao conectar com o backend.', 'error');
        return null;
    }
}

async function fetchPoints() {
    try {
        const response = await fetch(`${API_BASE_URL}/points/${EMPLOYEE_ID}`);
        if (!response.ok) throw new Error('Falha ao buscar registros.');
        
        const data = await response.json();
        return data.points;
    } catch (error) {
        console.error('Erro ao buscar registros:', error);
        return [];
    }
}

async function registerPoint(type) {
    try {
        const response = await fetch(`${API_BASE_URL}/points`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employee_id: EMPLOYEE_ID, type })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Erro ao registrar ${type}.`);
        }

        const data = await response.json();
        return data.point;

    } catch (error) {
        console.error('Erro ao registrar ponto:', error);
        displayAlert(`Não foi possível registrar o ponto: ${error.message}`, 'error');
        return null;
    }
}

// --- Lógica Principal da Aplicação ---

async function updateAppState() {
    // 1. Desabilita o botão para evitar cliques duplos
    clockButton.disabled = true;
    
    // 2. Busca o último ponto registrado
    const latestPoint = await fetchLatestPoint();

    // 3. Define o próximo tipo de ação e a mensagem de status
    let nextAction = 'entrada'; // Default
    let status = 'Pronto para registrar a ENTRADA.';
    
    if (latestPoint && latestPoint.type === 'entrada') {
        nextAction = 'saida';
        status = `Você REGISTROU ENTRADA às ${new Date(latestPoint.timestamp).toLocaleTimeString('pt-BR')}.`;
        clockButton.classList.replace('bg-blue-600', 'bg-red-600');
        clockButton.classList.replace('shadow-blue-500/50', 'shadow-red-500/50');
    } else {
        clockButton.classList.replace('bg-red-600', 'bg-blue-600');
        clockButton.classList.replace('shadow-red-500/50', 'shadow-blue-500/50');
    }
    
    clockButton.textContent = `Registrar ${nextAction.toUpperCase()}`;
    statusMessage.textContent = status;

    // 4. Atualiza a lista de pontos
    const points = await fetchPoints();
    renderPoints(points);
    
    // 5. Reabilita o botão, indicando que está pronto
    clockButton.disabled = false;
    clockButton.onclick = async () => {
        const newPoint = await registerPoint(nextAction);
        if (newPoint) {
            displayAlert(`Ponto de ${newPoint.type.toUpperCase()} registrado com sucesso!`);
            // Recarrega o estado para atualizar o botão e a lista
            updateAppState(); 
        }
    };
}

// Inicializa o estado da aplicação
updateAppState();