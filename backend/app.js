// backend/app.js

const express = require('express');
const cors = require('cors');
const sqlite = require('sqlite');
const { open } = require('sqlite');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'time_clock.db');

app.use(cors());
app.use(express.json()); // Middleware para processar JSON no corpo das requisições

let db;

// Função para conectar e inicializar o banco de dados
async function initializeDB() {
    try {
        db = await open({
            filename: DB_PATH,
            driver: sqlite.Database
        });

        // Cria a tabela 'points' se ela não existir
        await db.exec(`
            CREATE TABLE IF NOT EXISTS points (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id INTEGER NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                type TEXT NOT NULL CHECK(type IN ('entrada', 'saida'))
            );
        `);

        console.log('Conectado ao banco de dados SQLite.');

        // Garante que o employee 1 exista (para fins de teste)
        await db.run(
            'INSERT OR IGNORE INTO points (id, employee_id, timestamp, type) VALUES (?, ?, ?, ?)', 
            [1, 1, new Date().toISOString(), 'entrada']
        );
        
    } catch (error) {
        console.error('Erro ao inicializar o banco de dados:', error);
        process.exit(1);
    }
}

// --- Rotas da API ---

// 1. Registrar Ponto (POST /api/points)
app.post('/api/points', async (req, res) => {
    const { employee_id, type } = req.body;

    if (!employee_id || !type || (type !== 'entrada' && type !== 'saida')) {
        return res.status(400).json({ message: 'Dados inválidos: employee_id e type (entrada/saida) são obrigatórios.' });
    }

    try {
        const result = await db.run(
            'INSERT INTO points (employee_id, type) VALUES (?, ?)',
            [employee_id, type]
        );

        const newPoint = await db.get('SELECT * FROM points WHERE id = ?', result.lastID);

        res.status(201).json({ 
            message: `${type} registrado com sucesso!`, 
            point: newPoint 
        });
    } catch (error) {
        console.error('Erro ao registrar ponto:', error);
        res.status(500).json({ message: 'Erro interno ao registrar ponto.' });
    }
});

// 2. Buscar último ponto de um funcionário (GET /api/points/latest/:employee_id)
app.get('/api/points/latest/:employee_id', async (req, res) => {
    const { employee_id } = req.params;

    try {
        const latestPoint = await db.get(
            'SELECT * FROM points WHERE employee_id = ? ORDER BY timestamp DESC LIMIT 1',
            [employee_id]
        );

        res.json({ latestPoint });
    } catch (error) {
        console.error('Erro ao buscar último ponto:', error);
        res.status(500).json({ message: 'Erro interno ao buscar último ponto.' });
    }
});

// 3. Buscar todos os pontos de um funcionário (GET /api/points/:employee_id)
app.get('/api/points/:employee_id', async (req, res) => {
    const { employee_id } = req.params;

    try {
        const points = await db.all(
            'SELECT * FROM points WHERE employee_id = ? ORDER BY timestamp DESC',
            [employee_id]
        );

        res.json({ points });
    } catch (error) {
        console.error('Erro ao buscar registros:', error);
        res.status(500).json({ message: 'Erro interno ao buscar registros.' });
    }
});

// Inicia o servidor Express após conectar ao DB
initializeDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor backend rodando em http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Falha crítica ao iniciar a aplicação:', err);
});