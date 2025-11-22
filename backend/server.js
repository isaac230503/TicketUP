'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
require("dotenv").config();

const PORT = process.env.PORT || 3000;

// === Segurança ===
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const { check, validationResult } = require("express-validator");
const cookieParser = require("cookie-parser");

const app = express();      
app.use(cookieParser());    
        // 2º usa o cookieParser


// JWT secret (defina em .env como JWT_SECRET)
const JWT_SECRET = process.env.JWT_SECRET || 'changeme_jwt_secret';

// === Middlewares globais ===
// 🚨 NÃO REPETIR ESTES TRÊS NUNCA MAIS!
app.use(express.json());
app.use(cors());
app.use(helmet());

// Rate limit para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Muitas tentativas de login. Tente novamente mais tarde."
});

// Carregar rotas de usuário
let usuarioRoutes;
try {
  usuarioRoutes = require('./routes/usuario');
  app.use("/usuarios", usuarioRoutes);
} catch (e) {
  console.error('Erro ao carregar rota /usuarios:', e?.message || e);
}

// Caminho dos dados locais (fallback)
const DATA_PATH = path.join(__dirname, 'data.json');

function ensureDataFile() {
  const defaultData = {
    events: [
      {
        id: 1,
        title: "QUINTA NO GALO - NONO GERMANO E CONVIDADOS",
        date: "2025-11-06T19:00:00",
        venue: "SEDE DO GALO DA MADRUGADA - RECIFE-PE",
        image: "/assets/image-20.png",
        description: "Descrição do evento"
      }
    ],
    tickets: [
      { id: 1, event_id: 1, name: "INDIVIDUAL", price_cents: 5000, fee_cents: 500, stock: 100 },
      { id: 2, event_id: 1, name: "INDIVIDUAL - MEIA", price_cents: 2500, fee_cents: 250, stock: 50 },
      { id: 3, event_id: 1, name: "MESA (4 PESSOAS)", price_cents: 25000, fee_cents: 2500, stock: 10 }
    ],
    orders: [],
    users: [],
    help_requests: []
  };

  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(defaultData, null, 2));
    return;
  }

  try {
    JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch (err) {
    const bak = DATA_PATH + '.bak.' + Date.now();
    fs.copyFileSync(DATA_PATH, bak);
    console.warn(`data.json inválido. Backup criado em ${bak}. Recriando data.json com valores padrão.`);
    fs.writeFileSync(DATA_PATH, JSON.stringify(defaultData, null, 2));
  }
}

ensureDataFile();

const readData = () => JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const writeData = (data) => fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

// if testeRoute exists, register it (preserve existing behavior)
try {
  const testeRoute = require('./routes/teste');
  app.use('/teste', testeRoute);
} catch (e) {
  // não obrigatório
}

// servir assets do frontend (se existir)
const assetsDir = path.join(__dirname, '..', 'frontend', 'assets');
if (fs.existsSync(assetsDir)) app.use('/assets', express.static(assetsDir));

// ===== Novo: servir frontend e rota raiz =====
const frontendDir = path.join(__dirname, '..', 'frontend', 'html e css'); // path com espaços OK
if (fs.existsSync(frontendDir)) {
  app.use(express.static(frontendDir)); // serve arquivos estáticos (html, css, js)

  // ===== Novo: também responder em /html para compatibilidade com links que usam /html/xxx =====
  app.use('/html', express.static(frontendDir));
  app.get('/', (req, res) => {
    const indexFile = path.join(frontendDir, 'index.html');
    if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
    return res.send('API funcionando — visite /api/events para testar');
  });
}
// ===== fim do trecho novo =====

// rotas
app.get('/api/events', async (req, res) => {
  // Se existir configuração de DB (arquivo backend/db.js), usa PostgreSQL.
  if (typeof require === 'function') {
    try {
      const db = require('./db');
      // mapeia EVENTO -> formato esperado pelo frontend
      const q = `SELECT id_evento, data_horario_inicio, endereco, nome, descricao
                 FROM evento
                 ORDER BY data_horario_inicio`;
      const result = await db.query(q);
      const events = result.rows.map(r => ({
        id: r.id_evento,
        title: r.nome,
        date: r.data_horario_inicio,
        venue: r.endereco,
        image: null,
        description: r.descricao
      }));
      return res.json(events);
    } catch (err) {
      // não conseguiu usar DB — cairá para o fallback em data.json
      console.log('Postgres não disponível ou erro ao consultar eventos:', err.message || err);
    }
  }
  const data = readData();
  res.json(data.events);
});

app.get('/api/events/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (typeof require === 'function') {
    try {
      const db = require('./db');
      // Buscar evento
      const evQ = 'SELECT id_evento, data_horario_inicio, endereco, nome, descricao FROM evento WHERE id_evento = $1';
      const evRes = await db.query(evQ, [id]);
      if (evRes.rowCount === 0) return res.status(404).json({ error: 'Evento não encontrado' });
      const r = evRes.rows[0];
      // Buscar ingressos relacionados (join via setor)
      const tkQ = `SELECT t.id_tipo_ingresso AS id, t.nome AS name, (t.preco_final * 100)::bigint AS price_cents,
                          (t.taxa_servico * 100)::bigint AS fee_cents,
                          COALESCE(ei.quantidade_total - ei.quantidade_vendida, 0) AS stock
                   FROM tipo_ingresso t
                   JOIN setor s ON t.id_setor = s.id_setor
                   LEFT JOIN estoque_ingresso ei ON ei.id_tipo_ingresso = t.id_tipo_ingresso
                   WHERE s.id_evento = $1`;
      const tkRes = await db.query(tkQ, [id]);
      const event = {
        id: r.id_evento,
        title: r.nome,
        date: r.data_horario_inicio,
        venue: r.endereco,
        image: null,
        description: r.descricao
      };
      const tickets = tkRes.rows.map(t => ({ id: t.id, event_id: id, name: t.name, price_cents: Number(t.price_cents || 0), fee_cents: Number(t.fee_cents || 0), stock: Number(t.stock || 0) }));
      return res.json({ ...event, tickets });
    } catch (err) {
      console.log('Postgres não disponível ou erro em /api/events/:id:', err.message || err);
    }
  }
  const data = readData();
  const event = data.events.find(e => e.id === id);
  if (!event) return res.status(404).json({ error: 'Evento não encontrado' });
  const tickets = data.tickets.filter(t => t.event_id === id);
  res.json({ ...event, tickets });
});

app.post('/api/orders', (req, res) => {
  try {
    const { event_id, items } = req.body;
    if (!event_id || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: 'Payload inválido' });

    const data = readData();
    let total = 0;
    for (const it of items) {
      const t = data.tickets.find(x => x.id === it.ticket_id && x.event_id === event_id);
      if (!t) return res.status(400).json({ error: `Ingresso inválido: ${it.ticket_id}` });
      if (t.stock < it.qty) return res.status(400).json({ error: `Sem estoque para ${t.name}` });
      total += (t.price_cents + (t.fee_cents || 0)) * it.qty;
    }

    // decrementar estoque
    for (const it of items) {
      const idx = data.tickets.findIndex(x => x.id === it.ticket_id);
      data.tickets[idx].stock -= it.qty;
    }

    const nextId = (data.orders.reduce((m, o) => Math.max(m, o.id || 0), 0) || 0) + 1;
    const order = { id: nextId, event_id, items, total_cents: total, status: 'pending', created_at: new Date().toISOString() };
    data.orders.push(order);
    writeData(data);
    res.status(201).json(order);
  } catch (err) {
    console.error('Erro em /api/orders:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.get('/api/orders/:id', (req, res) => {
  const id = Number(req.params.id);
  const data = readData();
  const order = data.orders.find(o => o.id === id);
  if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });
  res.json(order);
});

// ===== Adição: auth simples and help requests =====
function findUserByToken(token){
  const data = readData();
  return data.users.find(u => u.token === token);
}

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  console.log('POST /api/auth/register payload:', { name, email: (email||'').slice(0,40), hasPassword: !!password });
  if (!name || !email || !password) return res.status(400).json({ error: 'Dados insuficientes' });

  const data = readData();
  if (data.users.find(u => u.email === email)) return res.status(400).json({ error: 'Email já cadastrado' });

  const id = (data.users.reduce((m,u)=>Math.max(m,u.id||0),0) || 0) + 1;

  // HASH da senha (segurança)
  const hashedPassword = await bcrypt.hash(password, 10);

  // gerar token JWT
  const token = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '8h' });

  const user = { id, name, email, password: hashedPassword, token };
  data.users.push(user);
  try {
    writeData(data);
  } catch (e) {
    console.error('Falha ao escrever data.json:', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Erro ao salvar usuário' });
  }
  console.log('Usuário registrado:', { id, name, email });
  // não retornar a senha
  return res.status(201).json({ id, name, email, token });
});

app.post("/api/auth/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' });

  const data = readData();
  const user = data.users.find(u => u.email === email);

  // registrar tentativa de login no Postgres (se disponível) — não bloquear por falha
  try {
    if (typeof require === 'function') {
      try {
        const db = require('./db');
        await db.query(
          'INSERT INTO login_attempt (email, success, ip_address, user_agent) VALUES ($1,$2,$3,$4)',
          [email, !!user, req.ip || null, req.get('User-Agent') || null]
        );
      } catch (e) {
        // erro ao gravar no DB — apenas logamos no console
        console.error('Falha ao gravar login_attempt no DB:', e && e.message ? e.message : e);
      }
    }
  } catch (e) {
    console.error('Erro inesperado ao tentar logar tentativa:', e && e.message ? e.message : e);
  }

  // verificar user e senha (com bcrypt)
  if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Credenciais inválidas' });

  // renova token JWT
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '8h' });
  user.token = token;
  writeData(data);
  return res.json({ id: user.id, name: user.name, email: user.email, token: user.token });
});

app.get('/api/me', (req, res) => {
  const auth = (req.headers.authorization || '').replace('Bearer ', '');
  if (!auth) return res.status(401).json({ error: 'Sem autorização' });
  // tentar verificar JWT (se for válido)
  try {
    jwt.verify(auth, JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' });
  }
  const user = findUserByToken(auth);
  if (!user) return res.status(401).json({ error: 'Token inválido' });
  return res.json({ id: user.id, name: user.name, email: user.email });
});

// rota para enviar solicitação de ajuda (autenticada)
app.post('/api/help/requests', (req, res) => {
  const auth = (req.headers.authorization || '').replace('Bearer ', '');
  if (!auth) return res.status(401).json({ error: 'Sem autorização' });
  try {
    jwt.verify(auth, JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' });
  }
  const user = findUserByToken(auth);
  if (!user) return res.status(401).json({ error: 'Token inválido' });
  const { subject, message } = req.body || {};
  if (!subject || !message) return res.status(400).json({ error: 'Campos obrigatórios' });
  
  const data = readData();
  const id = (data.help_requests.reduce((m,r)=>Math.max(m,r.id||0),0) || 0) + 1;
  const reqObj = {
    id, user_id: user.id, subject, message, status: 'open', created_at: new Date().toISOString()
  };
  data.help_requests.push(reqObj);
  writeData(data);
  return res.status(201).json(reqObj);
});
// ===== fim das rotas novas =====

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});