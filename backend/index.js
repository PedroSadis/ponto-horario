const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./database');
const authMiddleware = require('./authMiddleware');

const app = express();
const port = 3000;
const JWT_SECRET = 'seu-segredo-super-secreto-aqui'; 

app.use(cors());
app.use(express.json());

// --- Rota de Login (Pública) - Inteligente ---
app.post('/login', (req, res) => {
    const { email, senha } = req.body; // 1. 'tipo' não é mais recebido

    if (!email || !senha) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    // --- PASSO 1: Tentar login como Funcionário ---
    // (O frontend envia 'email', que no DB do RH é 'login')
    const sqlFunc = `SELECT * FROM Funcionario WHERE email = ?`;
    
    db.get(sqlFunc, [email], (err, funcionario) => {
        if (err) {
            return res.status(500).json({ message: 'Erro no servidor ao buscar funcionário.' });
        }

        // SE ENCONTROU UM FUNCIONÁRIO com este email
        if (funcionario) {
            // 1. Verificar a senha dele
            const senhaValida = bcrypt.compareSync(senha, funcionario.senha_hash);
            
            if (!senhaValida) {
                // Senha errada para este funcionário
                return res.status(401).json({ message: 'Senha inválida.' });
            }

            // 2. Senha CORRETA! Gerar token de Funcionário
            const tokenPayload = {
                id: funcionario.id_funcionario,
                email: funcionario.email,
                tipo: 'funcionario' // Definimos o tipo
            };
            const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });
            
            return res.json({ 
                message: 'Login bem-sucedido!', 
                token: token,
                user: { nome: funcionario.nome_completo, email: funcionario.email },
                tipo: 'funcionario' // Enviamos o tipo para o frontend
            });
        }

        // --- PASSO 2: Se NÃO encontrou funcionário, tentar login como RH ---
        // (O campo de email do formulário corresponde ao 'login' do RH no DB)
        const sqlRH = `SELECT * FROM UsuarioRH WHERE login = ?`;
        
        db.get(sqlRH, [email], (err, rh) => {
            if (err) {
                return res.status(500).json({ message: 'Erro no servidor ao buscar RH.' });
            }

            // SE ENCONTROU UM RH com este login
            if (rh) {
                // 1. Verificar a senha dele
                const senhaValida = bcrypt.compareSync(senha, rh.senha_hash);
                
                if (!senhaValida) {
                    // Senha errada para este RH
                    return res.status(401).json({ message: 'Senha inválida.' });
                }

                // 2. Senha CORRETA! Gerar token de RH
                const tokenPayload = {
                    id: rh.id_usuario_rh,
                    email: rh.login,
                    tipo: 'rh' // Definimos o tipo
                };
                const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });
                
                return res.json({ 
                    message: 'Login bem-sucedido!', 
                    token: token,
                    user: { nome: rh.nome, email: rh.login },
                    tipo: 'rh' // Enviamos o tipo para o frontend
                });
            }

            // --- PASSO 3: Se não encontrou NENHUM ---
            if (!funcionario && !rh) {
                return res.status(404).json({ message: 'Usuário não encontrado.' });
            }
        });
    });
});

// --- Rota de Bater Ponto (Protegida) ---
app.post('/ponto/registrar', authMiddleware, (req, res) => {
    if (req.user.tipo !== 'funcionario') {
         return res.status(403).json({ message: 'Acesso negado. Apenas funcionários podem bater ponto.' });
    }
    
    const { tipo_registro } = req.body;
    const id_funcionario = req.user.id;
    const data_hora = new Date().toISOString();

    const sql = `INSERT INTO RegistroPonto (id_funcionario, data_hora, tipo_registro) VALUES (?, ?, ?)`;
    
    db.run(sql, [id_funcionario, data_hora, tipo_registro], function(err) {
        if (err) { return res.status(500).json({ message: 'Erro ao registrar ponto.' }); }
        res.status(201).json({ message: `Ponto (${tipo_registro}) registrado com sucesso!`, id: this.lastID });
    });
});

// --- Rota do Funcionário: Listar Meus Registros (Protegida) ---
app.get('/ponto/meus-registros', authMiddleware, (req, res) => {
    if (req.user.tipo !== 'funcionario') {
         return res.status(403).json({ message: 'Acesso negado.' });
    }
    const id_funcionario = req.user.id;
    const sql = `SELECT data_hora, tipo_registro 
                 FROM RegistroPonto 
                 WHERE id_funcionario = ? 
                 ORDER BY data_hora DESC`;
    
    db.all(sql, [id_funcionario], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ message: 'Erro ao buscar registros.' });
        }
        res.json({ registros: rows });
    });
});

// --- Rota do Funcionário: Enviar Solicitação de Ajuste/Atestado (Protegida) ---
app.post('/ponto/solicitar-ajuste', authMiddleware, (req, res) => {
    if (req.user.tipo !== 'funcionario') {
         return res.status(403).json({ message: 'Acesso negado.' });
    }
    const id_funcionario = req.user.id;
    const { tipo_solicitacao, justificativa, anexo_atestado } = req.body;
    if (!tipo_solicitacao || !justificativa) {
        return res.status(400).json({ message: 'Tipo da solicitação e justificativa são obrigatórios.' });
    }
    const data_solicitacao = new Date().toISOString();
    const status_aprovacao = 'Pendente';
    const sql = `INSERT INTO SolicitacaoAjuste 
        (id_funcionario, tipo_solicitacao, data_solicitacao, justificativa, anexo_atestado, status_aprovacao) 
        VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [id_funcionario, tipo_solicitacao, data_solicitacao, justificativa, anexo_atestado, status_aprovacao], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ message: 'Erro ao enviar solicitação.' });
        }
        res.status(201).json({ 
            message: 'Solicitação enviada com sucesso! Aguarde aprovação do RH.', 
            id_solicitacao: this.lastID 
        });
    });
});

// --- Rota do Funcionário: Registrar Entrega (Protegida) ---
app.post('/ponto/registrar-entrega', authMiddleware, (req, res) => {
    if (req.user.tipo !== 'funcionario') {
         return res.status(403).json({ message: 'Acesso negado.' });
    }
    const id_funcionario = req.user.id;
    const { descricao_mercadoria, numero_nota_fiscal } = req.body;
    if (!descricao_mercadoria) {
        return res.status(400).json({ message: 'A descrição da mercadoria é obrigatória.' });
    }
    const data_hora_entrega = new Date().toISOString();
    const status_entrega = 'Concluída';
    const sql = `INSERT INTO Entrega 
        (id_funcionario, descricao_mercadoria, numero_nota_fiscal, data_hora_entrega, status_entrega) 
        VALUES (?, ?, ?, ?, ?)`;
    
    db.run(sql, [id_funcionario, descricao_mercadoria, numero_nota_fiscal, data_hora_entrega, status_entrega], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ message: 'Erro ao registrar entrega.' });
        }
        res.status(201).json({ 
            message: 'Entrega registrada com sucesso!', 
            id_entrega: this.lastID 
        });
    });
});

// --- Rota de RH: Registrar Novo Funcionário (Protegida) ---
app.post('/rh/registrar-funcionario', authMiddleware, (req, res) => {
    if (req.user.tipo !== 'rh') {
         return res.status(403).json({ message: 'Acesso negado. Apenas o RH pode registrar funcionários.' });
    }
    const { nome_completo, cpf, email, senha, data_admissao } = req.body;
    if (!nome_completo || !cpf || !email || !senha || !data_admissao) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }
    const senha_hash = bcrypt.hashSync(senha, 10);
    const status = 'Ativo'; 
    const sql = `INSERT INTO Funcionario 
        (nome_completo, cpf, email, senha_hash, data_admissao, status) 
        VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [nome_completo, cpf, email, senha_hash, data_admissao, status], function(err) {
        if (err) {
            console.error(err.message);
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ message: 'Erro: Email ou CPF já cadastrado.' });
            }
            return res.status(500).json({ message: 'Erro ao registrar funcionário no banco de dados.' });
        }
        res.status(201).json({ 
            message: 'Funcionário registrado com sucesso!', 
            id: this.lastID 
        });
    });
});

// --- Rota de RH: Listar todos os funcionários (para o <select>) ---
app.get('/rh/funcionarios', authMiddleware, (req, res) => {
    if (req.user.tipo !== 'rh') {
         return res.status(403).json({ message: 'Acesso negado.' });
    }
    const sql = `SELECT id_funcionario, nome_completo FROM Funcionario ORDER BY nome_completo`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ message: 'Erro ao buscar funcionários.' });
        }
        res.json({ funcionarios: rows });
    });
});

// --- Rota de RH: Gerar Relatório de um Funcionário ---
app.get('/rh/relatorio/:id_funcionario', authMiddleware, (req, res) => {
    if (req.user.tipo !== 'rh') {
         return res.status(403).json({ message: 'Acesso negado.' });
    }

    const id_funcionario = req.params.id_funcionario;
    const relatorio = {
        pontos: [],
        entregas: []
    };

    const sql_pontos = `SELECT data_hora, tipo_registro 
                        FROM RegistroPonto 
                        WHERE id_funcionario = ? 
                        ORDER BY data_hora DESC`;
    
    db.all(sql_pontos, [id_funcionario], (err, rowsPontos) => {
        if (err) {
            return res.status(500).json({ message: 'Erro ao buscar registros de ponto.' });
        }
        relatorio.pontos = rowsPontos;

        const sql_entregas = `SELECT data_hora_entrega, descricao_mercadoria, numero_nota_fiscal 
                              FROM Entrega 
                              WHERE id_funcionario = ? 
                              ORDER BY data_hora_entrega DESC`;
        
        db.all(sql_entregas, [id_funcionario], (err, rowsEntregas) => {
            if (err) {
                return res.status(500).json({ message: 'Erro ao buscar entregas.' });
            }
            relatorio.entregas = rowsEntregas;
            res.json(relatorio);
        });
    });
});

// --- Início do Servidor ---
app.listen(port, () => {
    console.log(`Backend rodando em http://localhost:${port}`);
});