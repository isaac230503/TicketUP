const express = require('express');

const router = express.Router();

let db;
try {
  db = require('../db');
} catch (e) {
  console.error('Erro ao carregar backend/db.js em routes/teste.js:', e && e.message ? e.message : e);
  db = {
    query: async () => { throw new Error('DB não disponível: ' + (e && e.message ? e.message : 'erro unknown')); }
  };
}

router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    return res.json({ conectado: true, hora: result.rows[0].now });
  } catch (err) {
    console.error('Erro na conexão:', err);
    return res.status(500).json({ conectado: false, erro: err.message });
  }
});

router.get('/info', async (req, res) => {
  try {
    const result = await db.query('SELECT current_database() AS database, current_user AS user');
    const r = result.rows[0] || {};
    return res.json({ conectado: true, database: r.database, user: r.user });
  } catch (err) {
    console.error('Erro ao obter info do DB:', err);
    return res.status(500).json({ conectado: false, erro: err.message });
  }
});

module.exports = router;
