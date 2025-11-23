// auth_guard.js

async function protegerPagina() {
    const token = localStorage.getItem("token");

    // Se não tiver token → volta pro login
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

        // Se o token for inválido ou expirado → redireciona
        if (!res.ok) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "login.html";
            return;
        }

        // Se estiver tudo OK, prossegue
        const user = await res.json();
        console.log("Usuário autenticado:", user);

    } catch (err) {
        console.error("Erro na verificação de autenticação:", err);
        window.location.href = "login.html";
    }
}

// Executa automaticamente ao carregar a página
document.addEventListener("DOMContentLoaded", protegerPagina);
