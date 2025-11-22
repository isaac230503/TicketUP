document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");

  if (!form) {
    console.error("Erro: Formulário de login não encontrado!");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
      alert("Preencha email e senha!");
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Credenciais inválidas");
        return;
      }

      // Guardar o usuário no navegador (com token)
      localStorage.setItem("user", JSON.stringify(data));

      alert("Login realizado com sucesso!");

      // Redireciona para página inicial
      window.location.href = "index.html";

    } catch (err) {
      console.error("Erro no login:", err);
      alert("Erro ao conectar ao servidor.");
    }
  });
});
