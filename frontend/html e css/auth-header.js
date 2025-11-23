document.addEventListener("DOMContentLoaded", () => {
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;

  const nameSpan = document.querySelector(".user-name");
  const logoutBtn = document.querySelector(".logout-btn");
  const loginLink = document.querySelector(".login-link"); // Entrar/Cadastrar

  if (!nameSpan || !logoutBtn || !loginLink) return;

  if (user) {
    // Usuário logado
    nameSpan.textContent = user.name || "Usuário";
    nameSpan.style.display = "inline";

    logoutBtn.style.display = "inline";

    loginLink.style.display = "none";

    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      window.location.href = "login.html";
    });
  } else {
    // Usuário NÃO logado
    nameSpan.style.display = "none";
    logoutBtn.style.display = "none";

    loginLink.style.display = "inline";
  }
});
