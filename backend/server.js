'use strict';

const express = require('express');
const auth = require("./middleware/auth");
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require("dotenv").config();

const compression = require("compression");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const { check, validationResult } = require("express-validator");
const cookieParser = require("cookie-parser");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;

// ======================================================
// 🔐 SEGURANÇA GLOBAL
// ======================================================
app.use(express.json());
app.use(cookieParser());
app.use(compression());

app.use(cors({
  origin: "http://localhost:3000",
  methods: "GET,POST,PUT,DELETE",
  credentials: true
}));

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:"]
      }
    }
  })
);

// RATE LIMIT
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6,
  message: "Muitas tentativas de login. Tente novamente em alguns minutos."
});

const registerLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 10,
  message: "Muitas tentativas de registro."
});

const JWT_SECRET = process.env.JWT_SECRET || "changeme_jwt_secret";

// ======================================================
// 📁 BANCO EM data.json
// ======================================================
const DATA_PATH = path.join(__dirname, "data.json");

function ensureDataFile() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify({
      events: [],
      tickets: [],
      orders: [],
      users: [],
      help_requests: []
    }, null, 2));
  }
}

ensureDataFile();
// ======================================================
// 🔄 SERVIR data.json PARA O FRONT
// ======================================================
app.get("/data.json", (req, res) => {
  res.sendFile(path.join(__dirname, "data.json"));
});

const readData = () => JSON.parse(fs.readFileSync(DATA_PATH));
const writeData = (data) => fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

// ======================================================
// 🌐 SERVE FRONTEND
// ======================================================
const assetsDir = path.join(__dirname, "..", "frontend", "assets");
if (fs.existsSync(assetsDir)) app.use("/assets", express.static(assetsDir));

const frontendDir = path.join(__dirname, "..", "frontend", "html e css");
if (fs.existsSync(frontendDir)) {
  app.use(express.static(frontendDir));

  app.get("/", (req, res) => {
    res.sendFile(path.join(frontendDir, "index.html"));
  });
}
// ======================================================
// 📄 SERVIR data.json PARA O FRONTEND
// ======================================================
app.get("/data.json", (req, res) => {
  res.sendFile(DATA_PATH);
});

// ======================================================
// 🎟 EVENTOS
// ======================================================
app.get("/api/events", (req, res) => {
  const data = readData();
  res.json(data.events);
});

app.get("/api/events/:id", (req, res) => {
  const data = readData();
  const id = Number(req.params.id);

  const event = data.events.find(e => e.id === id);
  if (!event) return res.status(404).json({ error: "Evento não encontrado" });

  const tickets = data.tickets.filter(t => t.event_id === id);
  res.json({ ...event, tickets });
});

// ======================================================
// 🛒 CRIAR PEDIDO
// ======================================================
app.post("/api/orders", auth, (req, res) => {
  try {
    const { event_id, items, payment_method } = req.body;

    if (!event_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Payload inválido" });
    }

    const data = readData();
    let total = 0;

    // calcula total + baixa estoque
    for (const it of items) {
      const t = data.tickets.find(x => x.id === it.ticket_id && x.event_id === event_id);
      if (!t) return res.status(400).json({ error: `Ingresso inválido: ${it.ticket_id}` });
      if (t.stock < it.qty) return res.status(400).json({ error: `Sem estoque para ${t.name}` });

      total += (t.price_cents + (t.fee_cents || 0)) * it.qty;
      t.stock -= it.qty;
    }

    const id = (data.orders.reduce((m, o) => Math.max(m, o.id), 0) || 0) + 1;

    const order = {
      id,
      user_id: req.user.id,
      event_id,
      event_title: data.events.find(e => e.id === event_id)?.title || "Evento",
      code: "PED" + Math.floor(100000 + Math.random() * 900000),
      items,
      total_cents: total,
      status: "Concluído",
      payment_method: payment_method || "pix",
      created_at: new Date().toISOString()
    };

    data.orders.push(order);
    writeData(data);

    res.status(201).json(order);

  } catch (err) {
    console.error("Erro:", err);
    res.status(500).json({ error: "Erro ao criar pedido" });
  }
});

// ======================================================
// 📄 LISTAR PEDIDOS DO USUÁRIO
// ======================================================
app.get("/api/orders", auth, (req, res) => {
  try {
    const data = readData();
    const orders = data.orders.filter(o => o.user_id === req.user.id);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Erro ao carregar pedidos" });
  }
});

// ======================================================
// 🔐 REGISTRO
// ======================================================
app.post(
  "/api/auth/register",
  registerLimiter,
  [
    check("name").trim().isLength({ min: 2 }).withMessage("Nome inválido"),
    check("email").isEmail().withMessage("Email inválido"),
    check("password").isLength({ min: 6 }).withMessage("Senha deve ter no mínimo 6 caracteres")
  ],
  async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { name, email, password } = req.body;
    const data = readData();

    if (data.users.some(u => u.email === email)) {
      return res.status(400).json({ error: "Email já cadastrado" });
    }

    const id = (data.users.reduce((m, u) => Math.max(m, u.id), 0) || 0) + 1;
    const hashed = await bcrypt.hash(password, 10);

    const token = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: "8h" });

    data.users.push({ id, name, email, password: hashed, token });
    writeData(data);

    res.status(201).json({ id, name, email, token });
  }
);

// ======================================================
// 🔐 LOGIN
// ======================================================
app.post(
  "/api/auth/login",
  loginLimiter,
  [
    check("email").isEmail().withMessage("Email inválido"),
    check("password").exists().withMessage("Senha obrigatória")
  ],
  async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { email, password } = req.body;
    const data = readData();

    const user = data.users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: "Credenciais inválidas" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Credenciais inválidas" });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "8h" });
    user.token = token;

    writeData(data);

    res.json({ id: user.id, name: user.name, email: user.email, token });
  }
);

// ======================================================
// 👤 /api/me
// ======================================================
app.get('/api/me', auth, (req, res) => {
  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email
  });
});
// ======================================
// 🔒 LOGOUT SEGURO — INVALIDA TOKEN
// ======================================
app.post("/api/auth/logout", auth, (req, res) => {
  const data = readData();

  // remove token do usuário no banco
  const user = data.users.find(u => u.id === req.user.id);
  if (user) {
    user.token = null; // invalida
    writeData(data);
  }

  res.json({ success: true, message: "Logout realizado com segurança." });
});

// ======================================
// 🆘 CENTRAL DE AJUDA — SEGURO
// ======================================
app.post(
  "/api/help",
  [
    check("name").trim().isLength({ min: 2 }).withMessage("Nome inválido"),
    check("email").isEmail().withMessage("Email inválido"),
    check("subject").trim().isLength({ min: 3 }).withMessage("Assunto inválido"),
    check("message").trim().isLength({ min: 10 }).withMessage("Mensagem muito curta")
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { name, email, subject, message } = req.body;

    // sanitize manual contra XSS
    function sanitize(text) {
      return text
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    const safeData = {
      id: crypto.randomUUID(),
      name: sanitize(name),
      email: sanitize(email),
      subject: sanitize(subject),
      message: sanitize(message),
      created_at: new Date().toISOString()
    };

    const data = readData();
    data.help_requests.push(safeData);
    writeData(data);

    res.json({ success: true, message: "Solicitação enviada com segurança." });
  }
);

// ======================================================
// 🚨 ERRO GLOBAL
// ======================================================
app.use((err, req, res, next) => {
  console.error("Erro interno:", err);
  res.status(500).json({ error: "Erro interno do servidor" });
});

// ======================================================
// ▶️ INICIAR SERVIDOR
// ======================================================
app.listen(PORT, () => {
  console.log(`🚀 API rodando em http://localhost:${PORT}`);
});
