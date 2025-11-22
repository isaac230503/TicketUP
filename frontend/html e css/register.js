document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("register-form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();

    // IDs corrigidos conforme o register.html
    const password = document.getElementById("senha").value.trim();
    const password2 = document.getElementById("senha2").value.trim();

    if (password !== password2) {
      alert("As senhas não conferem!");
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
        alert(data.error || "Erro ao registrar");
        return;
      }

      alert("Registrado com sucesso!");
      window.location.href = "login.html";

    } catch (err) {
      console.error(err);
      alert("Erro de conexão.");
    }
  });
});
