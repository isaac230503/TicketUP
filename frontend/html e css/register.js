document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("register-form");

  if (!form) {
    console.error("Erro: Formulário de registro não encontrado!");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
const password2 = document.getElementById("password2").value.trim();


    if (!name || !email || !password || !password2) {
      alert("Preencha todos os campos!");
      return;
    }

    if (password !== password2) {
      alert("As senhas não coincidem!");
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Erro ao registrar.");
        return;
      }

      // Salvar token e usuário
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data));

      alert("Conta criada com sucesso!");
      window.location.href = "index.html";

    } catch (err) {
      console.error("Erro no registro:", err);
      alert("Erro ao conectar ao servidor.");
    }
  });
});
