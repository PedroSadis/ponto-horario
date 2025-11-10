const jwt = require('jsonwebtoken');
const JWT_SECRET = 'seu-segredo-super-secreto-aqui'; // Mude isso!

function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato "Bearer TOKEN"

    if (token == null) {
        return res.status(401).json({ message: 'Token não fornecido.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido.' });
        }
        req.user = user; // Salva os dados do usuário (do token) na requisição
        next(); // Passa para a próxima rota
    });
}

module.exports = authMiddleware;