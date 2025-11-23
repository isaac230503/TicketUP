document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("help-form");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const subject = form.subject.value.trim();
    const message = form.message.value.trim();

    const res = await fetch("/api/help", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, subject, message })
    });

    const data = await res.json();

    if (!res.ok) {
      alert("Erro: " + data.error);
      return;
    }

    alert("Solicitação enviada! Retornaremos em breve.");
    form.reset();
  });
});
