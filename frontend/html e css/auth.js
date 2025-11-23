// ===============================
// 🔐 PEGAR TOKEN DO LOCALSTORAGE
// ===============================
function getToken() {
  return localStorage.getItem("token");
}

// ===============================
// 🔐 LOGOUT COMPLETO
// ===============================
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

// ===============================
// 🔐 VALIDAR TOKEN NO BACKEND
// ===============================
async function requireAuth() {
  const token = getToken();

  // Sem token → manda pro login
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    const res = await fetch("/api/me", {
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    if (!res.ok) {
      logout();
      return;
    }

    const user = await res.json();
    applyUserToNavbar(user);  
    return user;

  } catch (err) {
    console.error("Erro ao validar token:", err);
    logout();
  }
}

// ===============================
// 🔐 MOSTRAR NOME / LOGIN / SAIR
// ===============================
function applyUserToNavbar(user) {
  const nameSpan = document.querySelector(".user-name");
  const loginLink = document.querySelector(".login-link");
  const logoutBtn = document.querySelector(".logout-btn");

  if (!nameSpan || !loginLink || !logoutBtn) return;

  nameSpan.textContent = user.name;
  nameSpan.style.display = "inline-block";

  loginLink.style.display = "none";
  logoutBtn.style.display = "inline-block";
}

// ===============================
// ⏳ EXECUTAR SEMPRE QUE A PÁGINA CARREGAR
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
  const token = getToken();

  if (token) {
    try {
      const res = await fetch("/api/me", {
        headers: { "Authorization": "Bearer " + token }
      });

      if (res.ok) {
        const user = await res.json();
        applyUserToNavbar(user);
      }
    } catch (e) {
      console.warn("Usuário não autenticado.");
    }
  }

  // botão de logout
  const btn = document.querySelector(".logout-btn");
  if (btn) btn.addEventListener("click", logout);
});
