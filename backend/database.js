const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database('./ponto.db');

db.serialize(() => {
    console.log("Iniciando banco de dados...");

    // 1. Tabela Funcionario
    db.run(`CREATE TABLE IF NOT EXISTS Funcionario (
        id_funcionario INTEGER PRIMARY KEY AUTOINCREMENT,
        nome_completo TEXT NOT NULL,
        cpf TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        senha_hash TEXT NOT NULL,
        data_admissao TEXT NOT NULL,
        status TEXT NOT NULL,
        id_cargo INTEGER,
        id_departamento INTEGER,
        FOREIGN KEY (id_cargo) REFERENCES Cargo(id_cargo),
        FOREIGN KEY (id_departamento) REFERENCES Departamento(id_departamento)
    )`);

    // 2. Tabela Cargo
    db.run(`CREATE TABLE IF NOT EXISTS Cargo (
        id_cargo INTEGER PRIMARY KEY AUTOINCREMENT,
        nome_cargo TEXT NOT NULL,
        descricao TEXT
    )`);

    // 3. Tabela Departamento
    db.run(`CREATE TABLE IF NOT EXISTS Departamento (
        id_departamento INTEGER PRIMARY KEY AUTOINCREMENT,
        nome_departamento TEXT NOT NULL
    )`);

    // 4. Tabela RegistroPonto
    db.run(`CREATE TABLE IF NOT EXISTS RegistroPonto (
        id_registro_ponto INTEGER PRIMARY KEY AUTOINCREMENT,
        id_funcionario INTEGER NOT NULL,
        data_hora TEXT NOT NULL,
        tipo_registro TEXT NOT NULL,
        justificativa TEXT,
        FOREIGN KEY (id_funcionario) REFERENCES Funcionario(id_funcionario)
    )`);

    // 5. Tabela Entrega
    db.run(`CREATE TABLE IF NOT EXISTS Entrega (
        id_entrega INTEGER PRIMARY KEY AUTOINCREMENT,
        id_funcionario INTEGER NOT NULL,
        descricao_mercadoria TEXT NOT NULL,
        numero_nota_fiscal TEXT,
        data_hora_entrega TEXT NOT NULL,
        status_entrega TEXT NOT NULL,
        FOREIGN KEY (id_funcionario) REFERENCES Funcionario(id_funcionario)
    )`);

    // 6. Tabela UsuarioRH
    db.run(`CREATE TABLE IF NOT EXISTS UsuarioRH (
        id_usuario_rh INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        login TEXT NOT NULL UNIQUE,
        senha_hash TEXT NOT NULL,
        nivel_permissao TEXT NOT NULL
    )`);

    // 7. Tabela SolicitacaoAjuste
    db.run(`CREATE TABLE IF NOT EXISTS SolicitacaoAjuste (
        id_solicitacao INTEGER PRIMARY KEY AUTOINCREMENT,
        id_funcionario INTEGER NOT NULL,
        id_usuario_rh_aprovador INTEGER,
        tipo_solicitacao TEXT NOT NULL,
        data_solicitacao TEXT NOT NULL,
        justificativa TEXT NOT NULL,
        anexo_atestado TEXT,
        status_aprovacao TEXT NOT NULL,
        FOREIGN KEY (id_funcionario) REFERENCES Funcionario(id_funcionario),
        FOREIGN KEY (id_usuario_rh_aprovador) REFERENCES UsuarioRH(id_usuario_rh)
    )`);

    // --- Inserir um usuário de RH e um Funcionário para testes ---
    // Senha para ambos: "123456"
    const hashFunc = bcrypt.hashSync('123456', 10);
    const hashRH = bcrypt.hashSync('123456', 10);

    db.run(`INSERT OR IGNORE INTO Funcionario (nome_completo, cpf, email, senha_hash, data_admissao, status) VALUES 
        ('Funcionario Teste', '11122233344', 'func@empresa.com', ?, '2023-01-01', 'Ativo')`, [hashFunc]);
    
    db.run(`INSERT OR IGNORE INTO UsuarioRH (nome, login, senha_hash, nivel_permissao) VALUES 
        ('Admin RH', 'rh@empresa.com', ?, 'Admin')`, [hashRH]);

    console.log("Banco de dados pronto.");
});

module.exports = db;