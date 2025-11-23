// ============================================================
// 🟩 compra.js — VERSÃO INTEGRADA AO BACKEND
// ============================================================

const CART_KEY = 'ticketup_cart';
const TAX_RATE = 0.10; // 10%

function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function formatMoneyCents(cents) {
  return 'R$ ' + (Number(cents || 0) / 100).toFixed(2).replace('.', ',');
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  }[c]));
}

function getToken() {
  return localStorage.getItem("token");
}

// ---------------------------------------
// 🔹 Render do carrinho (igual o seu)
// ---------------------------------------
function renderPage() {
  const cart = loadCart();
  const tbody = document.getElementById('tickets-body');
  const poster = document.getElementById('event-poster');
  const titleEl = document.getElementById('event-title');
  const infoEl = document.getElementById('event-info');

  tbody.innerHTML = '';

  if (!cart.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="padding:25px;text-align:center;color:#777;">
          Carrinho vazio — adicione ingressos no evento.
        </td>
      </tr>`;
    poster.src = '../assets/placeholder.png';
    titleEl.textContent = 'Nenhum evento';
    infoEl.textContent = '';
    updateTotals();
    return;
  }

  const first = cart[0];
  poster.src = first.image || '../assets/placeholder.png';
  titleEl.textContent = first.event_name || first.title || 'Evento';
  infoEl.textContent = first.venue || '';

  cart.forEach((item, idx) => {
    const p = Number(item.price_cents || 0);
    const tax = Math.round(p * TAX_RATE);
    const subtotal = (p + tax) * (item.qty || 0);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="font-weight:600">${escapeHtml(item.title)}</div>
      </td>

      <td>
        <div class="qty-controls" style="align-items:center">
          <button class="qty-dec" data-i="${idx}">−</button>
          <strong style="min-width:28px;text-align:center;display:inline-block">${item.qty}</strong>
          <button class="qty-inc" data-i="${idx}">+</button>
        </div>
      </td>

      <td class="price">${formatMoneyCents(p)}</td>
      <td class="price">${formatMoneyCents(tax)}</td>
      <td class="price">${formatMoneyCents(subtotal)}</td>
    `;

    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.qty-dec').forEach(btn => btn.onclick = () => changeQty(btn.dataset.i, -1));
  tbody.querySelectorAll('.qty-inc').forEach(btn => btn.onclick = () => changeQty(btn.dataset.i, +1));

  updateTotals();
}

function changeQty(index, delta) {
  const cart = loadCart();
  if (!cart[index]) return;

  const newQty = (cart[index].qty || 1) + delta;

  if (newQty <= 0) cart.splice(index, 1);
  else cart[index].qty = newQty;

  saveCart(cart);
  renderPage();
}

function updateTotals() {
  const cart = loadCart();
  let subtotal = 0, taxes = 0;

  cart.forEach(item => {
    const p = Number(item.price_cents || 0);
    const tax = Math.round(p * TAX_RATE);

    subtotal += p * item.qty;
    taxes += tax * item.qty;
  });

  document.getElementById('subtotal-txt').textContent = formatMoneyCents(subtotal);
  document.getElementById('taxes-txt').textContent = formatMoneyCents(taxes);
  document.getElementById('total-txt').textContent = formatMoneyCents(subtotal + taxes);
}

// ---------------------------------------
// 🔥 🔥 🔥 CRIAR PEDIDO NO BACKEND
// ---------------------------------------
async function finalizeOrder() {
  const cart = loadCart();
  if (!cart.length) return alert("Carrinho vazio.");

  const token = getToken();
  if (!token) return alert("Você precisa estar logado.");

  const buyer = {
    name: document.getElementById("buyer-name").value.trim(),
    email: document.getElementById("buyer-email").value.trim(),
    phone: document.getElementById("buyer-phone").value.trim(),
  };

  if (!buyer.name || !buyer.email.includes("@")) {
    return alert("Preencha corretamente os dados.");
  }

  const payment_method = document.getElementById("payment-method").value;

  // ---------------------------------------
  // 🔥 Montar payload no formato do backend
  // ---------------------------------------
  const payload = {
    event_id: cart[0].event_id,
    payment_method,
    items: cart.map(i => ({
      ticket_id: i.ticket_id,
      qty: i.qty
    }))
  };

  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      return alert("Erro ao finalizar pedido: " + (err.error || "desconhecido"));
    }

    const order = await res.json();

    // limpar carrinho
    localStorage.removeItem(CART_KEY);

    // mostrar sucesso
    const box = document.getElementById("success-box");
    box.style.display = "block";
    box.innerHTML = `
      <strong>Compra concluída!</strong><br>
      Código: <strong>${order.code}</strong><br>
      Total: <strong>${formatMoneyCents(order.total_cents)}</strong><br>
      <div class="small-muted" style="margin-top:8px">
        O comprovante foi enviado para ${escapeHtml(buyer.email)} (simulado).
      </div>
      <div style="margin-top:10px">
        <a href="carrinho.html">Ver meus pedidos</a> •
        <a href="index.html">Página inicial</a>
      </div>
    `;

    renderPage();

  } catch (e) {
    console.error(e);
    alert("Erro ao conectar ao servidor.");
  }
}

// ---------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  renderPage();

  document.getElementById("btn-buy").addEventListener("click", finalizeOrder);
});
