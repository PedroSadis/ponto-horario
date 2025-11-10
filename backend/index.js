const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./database');
const authMiddleware = require('./authMiddleware');

const app = express();
const port = 3000;
const JWT_SECRET = 'seu-segredo-super-secreto-aqui'; // Use o MESMO segredo

app.use(cors());
app.use(express.json());

// --- Rota de Login (Pública) ---
// Unifica login de Funcionário e RH
app.post('/login', (req, res) => {
    const { email, senha, tipo } = req.body;

    if (!email || !senha || !tipo) {
        return res.status(400).json({ message: 'Email, senha e tipo são obrigatórios.' });
    }

    let Tabela, CampoEmail, CampoID;
    if (tipo === 'funcionario') {
        Tabela = 'Funcionario';
        CampoEmail = 'email';
        CampoID = 'id_funcionario';
    } else if (tipo === 'rh') {
        Tabela = 'UsuarioRH';
        CampoEmail = 'login';
        CampoID = 'id_usuario_rh';
    } else {
        return res.status(400).json({ message: 'Tipo de usuário inválido.' });
    }

    const sql = `SELECT * FROM ${Tabela} WHERE ${CampoEmail} = ?`;
    
    db.get(sql, [email], (err, user) => {
        if (err) {
            return res.status(500).json({ message: 'Erro no servidor.' });
        }
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        // 2. Comparar a senha
        const senhaValida = bcrypt.compareSync(senha, user.senha_hash);
        if (!senhaValida) {
            return res.status(401).json({ message: 'Senha inválida.' });
        }

        // 3. Gerar o Token JWT
        const tokenPayload = {
            id: user[CampoID],
            email: user[CampoEmail],
            tipo: tipo
        };
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

        res.json({ 
            message: 'Login bem-sucedido!', 
            token: token,
            user: { nome: user.nome_completo || user.nome, email: user.email || user.login }
        });
    });
});

// --- Rota de Bater Ponto (Protegida) ---
app.post('/ponto/registrar', authMiddleware, (req, res) => {
    // Graças ao middleware, só chegamos aqui se o token for válido.
    // O req.user contém os dados do token.
    
    if (req.user.tipo !== 'funcionario') {
         return res.status(403).json({ message: 'Acesso negado. Apenas funcionários podem bater ponto.' });
    }
    
    const { tipo_registro } = req.body;
    const id_funcionario = req.user.id;
    const data_hora = new Date().toISOString();

    const sql = `INSERT INTO RegistroPonto (id_funcionario, data_hora, tipo_registro) VALUES (?, ?, ?)`;
    
    db.run(sql, [id_funcionario, data_hora, tipo_registro], function(err) {
        if (err) {
            return res.status(500).json({ message: 'Erro ao registrar ponto.' });
        }
        res.status(201).json({ message: `Ponto (${tipo_registro}) registrado com sucesso!`, id: this.lastID });
    });
});


app.listen(port, () => {
    console.log(`Backend rodando em http://localhost:${port}`);
});