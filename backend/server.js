const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, 'data.json');
if (!fs.existsSync(DATA_PATH)) {
  fs.writeFileSync(DATA_PATH, JSON.stringify({ events: [], tickets: [], orders: [] }, null, 2));
}

function readData() {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}
function writeData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

const app = express();
app.use(cors());
app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, '..', 'frontend', 'assets')));

// Listar eventos
app.get('/api/events', (req, res) => {
  const data = readData();
  res.json(data.events);
});

// Detalhe de evento + ingressos
app.get('/api/events/:id', (req, res) => {
  const id = Number(req.params.id);
  const data = readData();
  const event = data.events.find(e => e.id === id);
  if (!event) return res.status(404).json({ error: 'Evento não encontrado' });
  const tickets = data.tickets.filter(t => t.event_id === id);
  res.json({ ...event, tickets });
});

// Criar pedido
app.post('/api/orders', (req, res) => {
  try {
    const { event_id, items, total_cents } = req.body;
    if (!event_id || !Array.isArray(items)) return res.status(400).json({ error: 'Payload inválido' });

    const data = readData();

    // checar estoque e calcular total
    let computed = 0;
    for (const it of items) {
      const ticket = data.tickets.find(t => t.id === it.ticket_id && t.event_id === event_id);
      if (!ticket) return res.status(400).json({ error: `Ingresso ${it.ticket_id} inválido` });
      if (ticket.stock < it.qty) return res.status(400).json({ error: `Sem estoque para ${ticket.name}` });
      computed += (ticket.price_cents + (ticket.fee_cents||0)) * it.qty;
    }

    if (typeof total_cents === 'number' && total_cents !== computed) {
      return res.status(400).json({ error: 'Total informado não confere com itens', computed });
    }

    // decrementar estoque
    for (const it of items) {
      const ticket = data.tickets.find(t => t.id === it.ticket_id);
      ticket.stock -= it.qty;
    }

    const nextId = (data.orders.reduce((m,o)=>Math.max(m,o.id||0),0) || 0) + 1;
    const order = {
      id: nextId,
      event_id,
      items,
      total_cents: computed,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    data.orders.push(order);
    writeData(data);
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar pedido
app.get('/api/orders/:id', (req, res) => {
  const id = Number(req.params.id);
  const data = readData();
  const order = data.orders.find(o => o.id === id);
  if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });
  res.json(order);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server (JS only) rodando em http://localhost:${PORT}`));