// ============================================
// 🟩 PEGAR TOKEN DO LOGIN
// ============================================
function getToken() {
  return localStorage.getItem("token");
}

// ============================================
// 🟦 CARREGAR PEDIDOS DO USUÁRIO LOGADO
// ============================================
async function loadMyOrders() {
  const token = getToken();
  const container = document.querySelector(".orders-list");

  if (!container) return;

  // Se não estiver logado
  if (!token) {
    container.innerHTML = `
      <p class="order-empty">Você precisa estar logado para ver seus pedidos.</p>
    `;
    return;
  }

  try {
    const res = await fetch("/api/orders", {
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    if (!res.ok) {
      container.innerHTML = `
        <p class="order-empty">❌ Erro ao carregar pedidos.</p>
      `;
      return;
    }

    const orders = await res.json();

    if (!orders.length) {
      container.innerHTML = `
        <p class="order-empty">Você ainda não fez nenhum pedido.</p>
      `;
      return;
    }

    // Renderiza lista de pedidos reais
    container.innerHTML = orders
      .map(
        (o) => `
      <div class="order-row">
        <div class="col"><strong>${o.code}</strong></div>
        <div class="col">${new Date(o.created_at).toLocaleDateString("pt-BR")}</div>
        <div class="col">${o.event_title}</div>
        <div class="col">R$ ${(o.total_cents / 100).toFixed(2)}</div>
        <div class="col">${o.status}</div>
      </div>
    `
      )
      .join("");

  } catch (err) {
    console.error("Erro ao buscar pedidos:", err);
    container.innerHTML = `
      <p class="order-empty">Erro ao conectar ao servidor.</p>
    `;
  }
}

// ============================================
// 🟧 AO CARREGAR A PÁGINA
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  loadMyOrders();

  // Função de logout da navbar
  const logout = document.querySelector(".logout-btn");
  if (logout) {
    logout.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "login.html";
    });
  }
});
