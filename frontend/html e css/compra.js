// fluxo de compra inteiro na mesma página (frontend simulado)
const CART_KEY = 'ticketup_cart';
const ORDERS_KEY = 'ticketup_orders';
const TAX_RATE = 0.10; // 10%

function loadCart(){ try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } }
function saveCart(cart){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
function loadOrders(){ try { return JSON.parse(localStorage.getItem(ORDERS_KEY)) || []; } catch { return []; } }
function saveOrders(list){ localStorage.setItem(ORDERS_KEY, JSON.stringify(list)); }

function formatMoneyCents(cents){ return 'R$ ' + (Number(cents||0)/100).toFixed(2).replace('.', ','); }
function centsFromReais(reais){ return Math.round(Number(reais||0) * 100); }
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function renderPage(){
  const cart = loadCart();
  const tbody = document.getElementById('tickets-body');
  const poster = document.getElementById('event-poster');
  const titleEl = document.getElementById('event-title');
  const infoEl = document.getElementById('event-info');
  tbody.innerHTML = '';

  if (!cart.length){
    tbody.innerHTML = `<tr><td colspan="5" style="padding:20px;text-align:center;color:#777">Carrinho vazio — adicione ingressos na página do evento.</td></tr>`;
    poster.src = '../assets/placeholder.png';
    titleEl.textContent = 'Nenhum evento';
    infoEl.textContent = '';
    updateTotals();
    return;
  }

  // preencher info básica com o primeiro item
  const first = cart[0];
  poster.src = first.image || '../assets/placeholder.png';
  titleEl.textContent = first.event_name || first.title || 'Evento';
  infoEl.textContent = first.venue || '';

  cart.forEach((item, idx) => {
    const priceCents = Number(item.price_cents || 0);
    const price = priceCents/100;
    const tax = Math.round(price * TAX_RATE * 100)/100;
    const subtotal = (price + tax) * (item.qty || 0);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="font-weight:600">${escapeHtml(item.title)}</div>
        <div class="small-muted">${escapeHtml(item.description || '')}</div>
      </td>
      <td>
        <div class="qty-controls" style="align-items:center">
          <button data-idx="${idx}" class="qty-decrease">−</button>
          <strong style="min-width:28px;text-align:center;display:inline-block" data-idx="${idx}" id="qty-${idx}">${item.qty}</strong>
          <button data-idx="${idx}" class="qty-increase">+</button>
        </div>
      </td>
      <td class="price">${formatMoneyCents(priceCents)}</td>
      <td class="price">${formatMoneyCents(Math.round(tax*100))}</td>
      <td class="price" id="subtotal-${idx}">${formatMoneyCents(Math.round(subtotal*100))}</td>
    `;
    tbody.appendChild(tr);
  });

  // attach handlers
  tbody.querySelectorAll('.qty-decrease').forEach(b => b.addEventListener('click', () => {
    const i = Number(b.dataset.idx);
    changeQtyAt(i, (cart[i].qty || 1) - 1);
  }));
  tbody.querySelectorAll('.qty-increase').forEach(b => b.addEventListener('click', () => {
    const i = Number(b.dataset.idx);
    changeQtyAt(i, (cart[i].qty || 0) + 1);
  }));

  updateTotals();
}

function changeQtyAt(index, qty){
  const cart = loadCart();
  if (!cart[index]) return;
  if (qty <= 0) cart.splice(index,1);
  else cart[index].qty = qty;
  saveCart(cart);
  renderPage();
}

function updateTotals(){
  const cart = loadCart();
  let subtotalCents = 0;
  let taxesCents = 0;
  cart.forEach(it => {
    const p = Number(it.price_cents || 0);
    const lineTax = Math.round(p * TAX_RATE);
    const lineSubtotal = (p + lineTax) * (it.qty || 0);
    subtotalCents += p * (it.qty || 0);
    taxesCents += lineTax * (it.qty || 0);
  });
  const totalCents = subtotalCents + taxesCents;
  document.getElementById('subtotal-txt').textContent = formatMoneyCents(subtotalCents);
  document.getElementById('taxes-txt').textContent = formatMoneyCents(taxesCents);
  document.getElementById('total-txt').textContent = formatMoneyCents(totalCents);
}

function validateBuyer(){
  const name = document.getElementById('buyer-name').value.trim();
  const email = document.getElementById('buyer-email').value.trim();
  if (!name) { alert('Preencha o nome do comprador.'); return false; }
  if (!email || !email.includes('@')) { alert('Preencha um e‑mail válido.'); return false; }
  return true;
}

function createOrder(buyer, paymentMethod){
  const cart = loadCart();
  if (!cart.length) return null;
  const id = Date.now();
  const code = 'PED' + (Math.floor(Math.random()*900000)+100000);
  // calcula tot
  let subtotalCents = 0, taxesCents = 0;
  const items = cart.map(it => {
    const p = Number(it.price_cents || 0);
    const tax = Math.round(p * TAX_RATE);
    subtotalCents += p * (it.qty || 0);
    taxesCents += tax * (it.qty || 0);
    return { ticket_id: it.ticket_id, title: it.title, qty: it.qty, price_cents: p, tax_cents: tax };
  });
  const totalCents = subtotalCents + taxesCents;
  const order = {
    id,
    code,
    created_at: new Date().toISOString(),
    buyer: { name: buyer.name, email: buyer.email, phone: buyer.phone || '' },
    payment_method: paymentMethod,
    status: 'Concluído',
    subtotal_cents: subtotalCents,
    taxes_cents: taxesCents,
    total_cents: totalCents,
    items
  };
  const orders = loadOrders();
  orders.push(order);
  saveOrders(orders);
  // limpar carrinho
  localStorage.removeItem(CART_KEY);
  return order;
}

document.addEventListener('DOMContentLoaded', () => {
  renderPage();

  document.getElementById('btn-buy').addEventListener('click', () => {
    if (!validateBuyer()) return;
    const buyer = {
      name: document.getElementById('buyer-name').value.trim(),
      email: document.getElementById('buyer-email').value.trim(),
      phone: document.getElementById('buyer-phone').value.trim()
    };
    const paymentMethod = document.getElementById('payment-method').value;
    const order = createOrder(buyer, paymentMethod);
    if (!order) { alert('Carrinho vazio.'); return; }

    // mostrar confirmação simples na mesma página
    const box = document.getElementById('success-box');
    box.style.display = 'block';
    box.innerHTML = `<strong>Compra realizada</strong><div>Código do pedido: <strong>${order.code}</strong></div>
      <div>Total: <strong>${formatMoneyCents(order.total_cents)}</strong></div>
      <div class="small-muted" style="margin-top:8px">Um e‑mail de confirmação foi enviado para ${escapeHtml(order.buyer.email)} (simulado).</div>
      <div style="margin-top:10px"><a href="carrinho.html">Ver Meus Pedidos</a> • <a href="index.html">Voltar à página inicial</a></div>`;

    // atualizar UI (carrinho vazio)
    renderPage();
  });
});