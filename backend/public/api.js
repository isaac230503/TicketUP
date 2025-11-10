// public/api.js - helpers para o frontend chamar a API
async function fetchTickets() {
  const res = await fetch('/api/tickets');
  if (!res.ok) throw new Error('Erro ao buscar tickets');
  return res.json();
}

async function createTicket(title, description) {
  const res = await fetch('/api/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Erro ao criar ticket');
  }
  return res.json();
}

// Disponibiliza no objeto global para facilitar o uso do front (window.TicketAPI)
window.TicketAPI = { fetchTickets, createTicket };
