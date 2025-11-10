'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
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

app.use(cors());
app.use(express.json());

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
app.get('/api/events', (req, res) => {
  const data = readData();
  res.json(data.events);
});

app.get('/api/events/:id', (req, res) => {
  const id = Number(req.params.id);
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

// ===== Adição: auth simples e help requests =====
function findUserByToken(token){
  const data = readData();
  return data.users.find(u => u.token === token);
}

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Dados insuficientes' });

  const data = readData();
  if (data.users.find(u => u.email === email)) return res.status(400).json({ error: 'Email já cadastrado' });

  const id = (data.users.reduce((m,u)=>Math.max(m,u.id||0),0) || 0) + 1;
  const token = crypto.randomBytes(24).toString('hex');
  const user = { id, name, email, password, token }; // PARA APRENDIZADO: em produção, sempre hashear a senha
  data.users.push(user);
  writeData(data);
  return res.status(201).json({ id, name, email, token });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' });

  const data = readData();
  const user = data.users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

  // renova token
  user.token = crypto.randomBytes(24).toString('hex');
  writeData(data);
  return res.json({ id: user.id, name: user.name, email: user.email, token: user.token });
});

app.get('/api/me', (req, res) => {
  const auth = (req.headers.authorization || '').replace('Bearer ', '');
  if (!auth) return res.status(401).json({ error: 'Sem autorização' });
  const user = findUserByToken(auth);
  if (!user) return res.status(401).json({ error: 'Token inválido' });
  return res.json({ id: user.id, name: user.name, email: user.email });
});

// rota para enviar solicitação de ajuda (autenticada)
app.post('/api/help/requests', (req, res) => {
  const auth = (req.headers.authorization || '').replace('Bearer ', '');
  if (!auth) return res.status(401).json({ error: 'Sem autorização' });
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