// ...new file...
const ORDERS_KEY = 'ticketup_orders';
const CART_KEY = 'ticketup_cart';

function loadOrders() {
  try { return JSON.parse(localStorage.getItem(ORDERS_KEY)) || []; }
  catch { return []; }
}
function saveOrders(list) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(list));
}
function formatCurrency(cents) {
  return 'R$ ' + (Number(cents || 0) / 100).toFixed(2).replace('.', ',');
}
function formatDate(iso) {
  const d = new Date(iso || Date.now());
  return d.toLocaleDateString('pt-BR');
}

function renderOrders() {
  const container = document.querySelector('.orders-list');
  if (!container) return;
  const orders = loadOrders();
  if (!orders.length) {
    container.innerHTML = '<div class="order-empty">Nenhum pedido encontrado.</div>';
    return;
  }
  container.innerHTML = '';
  orders.slice().reverse().forEach(order => {
    const totalCents = order.items?.reduce((s,i)=>s + (i.price_cents||0) * (i.qty||1), 0) || order.total_cents || 0;
    const statusClass = order.status === 'Concluído' ? 'ok' : (order.status === 'Cancelado' ? 'cancel' : 'pending');
    const row = document.createElement('div');
    row.className = 'order-row';
    row.innerHTML = `
      <span class="col cod">${escape(order.code)}</span>
      <span class="col date">${formatDate(order.created_at)}</span>
      <span class="col event">${escape(order.event_name || (order.items?.[0]?.title || '—'))}</span>
      <span class="col trans">${escape(order.payment_method || '—')}</span>
      <span class="col status ${statusClass}">${escape(order.status || 'Pendente')}</span>
      <span class="col total">${formatCurrency(totalCents)}</span>
      <span class="col actions"><button class="btn small view-order" data-order-id="${order.id}">Ver</button></span>
    `;
    container.appendChild(row);
  });
}

function escape(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// cria um pedido a partir do carrinho atual e salva em ORDERS_KEY
function createOrderFromCart(opts = {}) {
  const cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  if (!cart.length) return null;
  const id = Date.now();
  const code = 'A' + (Math.floor(Math.random()*90000)+10000);
  const total_cents = cart.reduce((s,i)=>s + (i.price_cents||0) * (i.qty||1), 0);
  const order = {
    id,
    code: '#' + code,
    created_at: new Date().toISOString(),
    event_name: opts.event_name || (cart[0]?.title || 'Vários eventos'),
    payment_method: opts.payment_method || 'Pix',
    status: opts.status || 'Pendente',
    total_cents,
    items: cart.map(i=>({ ticket_id: i.ticket_id, title: i.title, qty: i.qty, price_cents: i.price_cents, image: i.image }))
  };
  const orders = loadOrders();
  orders.push(order);
  saveOrders(orders);
  // limpa carrinho
  localStorage.removeItem(CART_KEY);
  // atualiza tela
  renderOrders();
  return order;
}

// view details
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.view-order');
  if (btn) {
    const id = Number(btn.dataset.orderId);
    const orders = loadOrders();
    const order = orders.find(o => Number(o.id) === id);
    if (!order) { alert('Pedido não encontrado.'); return; }
    let html = `Pedido ${escape(order.code)}\nData: ${formatDate(order.created_at)}\nStatus: ${escape(order.status)}\nPagamento: ${escape(order.payment_method)}\n\nItens:\n`;
    order.items.forEach(it => {
      html += `• ${escape(it.title)} — ${it.qty} x ${formatCurrency(it.price_cents)}\n`;
    });
    html += `\nTotal: ${formatCurrency(order.total_cents)}\n\n(Clique em OK para fechar)`;
    alert(html); // simples modal; pode substituir por modal HTML
  }
});

// expõe função global para ser usada no checkout
window.createOrderFromCart = createOrderFromCart;
window.renderOrders = renderOrders;

// inicializa ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  renderOrders();
});