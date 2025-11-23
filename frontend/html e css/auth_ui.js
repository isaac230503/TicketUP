document.addEventListener("DOMContentLoaded", () => {
  const userData = localStorage.getItem("user");
  const user = userData ? JSON.parse(userData) : null;

  const loginLink = document.querySelector(".toplinks .toplink[href='login.html']");
  const usernameSpan = document.querySelector(".user-name");
  const logoutBtn = document.querySelector(".logout-btn");

  if (!loginLink && !usernameSpan) return;

  if (user) {
    // Oculta "Entrar/Cadastrar"
    if (loginLink) loginLink.style.display = "none";

    // Mostra nome
    if (usernameSpan) {
      usernameSpan.textContent = `Olá, ${user.name}`;
      usernameSpan.style.display = "inline-block";
    }

    // Se existir botão de logout, mostra
    if (logoutBtn) logoutBtn.style.display = "inline-block";
  } else {
    // usuário deslogado → mostrar login
    if (loginLink) loginLink.style.display = "inline-block";

    if (usernameSpan) usernameSpan.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "none";
  }
});
