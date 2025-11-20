const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const DATA_PATH = path.join(__dirname, '..', 'data.json');

function readData() {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}

function writeData(data) {
  return fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

// Lista usuários (sem retornar a senha)
router.get('/', (req, res) => {
  try {
    const data = readData();
    const users = (data.users || []).map(u => ({ id: u.id, name: u.name, email: u.email }));
    return res.json(users);
  } catch (e) {
    console.error('Erro ao ler usuários:', e);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// Consulta usuário por id (sem senha)
router.get('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = readData();
    const u = (data.users || []).find(x => Number(x.id) === id);
    if (!u) return res.status(404).json({ error: 'Usuário não encontrado' });
    const { password, ...safe } = u; // remove senha
    return res.json(safe);
  } catch (e) {
    console.error('Erro ao buscar usuário:', e);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
