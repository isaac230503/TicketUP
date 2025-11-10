const CART_KEY = 'ticketup_cart';

function loadCart(){ try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } }
function saveCart(cart){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); updateCartCount(); }
function updateCartCount(){
  const countEl = document.querySelector('.cart-count');
  if (!countEl) return;
  const total = loadCart().reduce((s,i)=>s + (i.qty||0), 0);
  countEl.textContent = total;
}

function addItemFromButton(btn){
  const item = {
    ticket_id: Number(btn.dataset.ticketId || btn.getAttribute('data-ticket-id') || 0),
    event_name: btn.dataset.eventName || btn.getAttribute('data-event-name') || btn.dataset.title || btn.getAttribute('data-title') || '',
    title: btn.dataset.title || btn.getAttribute('data-title') || 'Ingresso',
    description: btn.dataset.description || btn.getAttribute('data-description') || '',
    price_cents: Number(btn.dataset.priceCents || btn.getAttribute('data-price-cents') || 0),
    qty: 1,
    image: btn.dataset.image || btn.getAttribute('data-image') || '../assets/placeholder.png',
    venue: btn.dataset.venue || btn.getAttribute('data-venue') || ''
  };
  const cart = loadCart();
  const found = cart.find(i => i.ticket_id === item.ticket_id && i.title === item.title);
  if (found) found.qty += 1; else cart.push(item);
  saveCart(cart);
}

// transforma botões de texto "Adicionar" em botão ícone (preserva data-* e atributos)
function replaceAddTextButtons(){
  // busca botões dentro de cards com texto "Adicionar"
  const candidates = Array.from(document.querySelectorAll('.card button, .card input[type="button"], .card .button, button'))
    .filter(el => {
      const txt = (el.innerText || el.value || '').trim().toLowerCase();
      // seleciona apenas os que contenham exatamente "adicionar" ou que tenham esse texto e não sejam já o novo botão
      return txt === 'adicionar' || txt === 'adicionar ao carrinho';
    });

  candidates.forEach(orig => {
    // evita duplicar caso já tenha sido convertido
    if (orig.classList.contains('add-to-cart') && orig.classList.contains('icon')) return;

    // cria novo botão mantendo atributos data-*
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = (orig.className ? orig.className + ' ' : '') + 'add-to-cart icon';
    // copiar dataset
    Array.from(orig.attributes).forEach(attr => {
      if (/^data-/i.test(attr.name)) btn.setAttribute(attr.name, attr.value);
    });
    // opcional: copiar ticket/evento info se texto vizinho tiver
    // set innerHTML com svg + sr-only
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M6 6h15l-1.5 9h-11L6 6z" fill="currentColor"/>
        <circle cx="9" cy="19" r="1.2" fill="currentColor"/><circle cx="18" cy="19" r="1.2" fill="currentColor"/>
      </svg>
      <span class="sr-only">Adicionar ao carrinho</span>
    `;
    // substituir no DOM mantendo posição
    orig.parentNode.replaceChild(btn, orig);
  });
}

// Delegation: trata todos os botões .add-to-cart
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.add-to-cart');
  if (!btn) return;
  addItemFromButton(btn);

  // feedback visual curto
  btn.classList.add('added');
  const orig = btn.innerHTML;
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span style="font-weight:700">Adicionado</span>`;
  setTimeout(() => { btn.classList.remove('added'); btn.innerHTML = orig; }, 900);
});

// init: substitui botões de texto e atualiza contador
document.addEventListener('DOMContentLoaded', () => {
  replaceAddTextButtons();
  updateCartCount();
});