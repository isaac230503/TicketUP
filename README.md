🎟️ TicketUP — Sistema Completo de Venda de Ingressos

Um sistema completo de venda de ingressos, com autenticação JWT, carrinho, finalização de compra, listagem de pedidos e integração com um backend em Node.js usando arquivo data.json como banco de dados.

Este projeto foi desenvolvido para fins acadêmicos, simulando uma plataforma real como Eventim, Ingresse ou Sympla.

🚀 Funcionalidades Principais
🟢 Frontend

Listagem de eventos

Exibição de ingressos por evento

Adicionar itens ao carrinho

Finalizar compra (Pix simulado)

Exibição de pedidos realizados ("Meus Pedidos")

Login / Cadastro

Persistência via LocalStorage

Totalmente responsivo

🔵 Backend (Node.js + Express)

Autenticação JWT (Login / Registro / Logout)

Middlewares de segurança:

Helmet

Rate Limit

CORS

Compression

Banco local usando data.json

Endpoints:

GET /api/events

GET /api/events/:id

POST /api/orders

GET /api/orders

POST /api/auth/login

POST /api/auth/register

GET /api/me

POST /api/help

📂 Estrutura do Projeto
 TicketUP/
 ├── backend/
 │   ├── server.js
 │   ├── data.json
 │   ├── middleware/
 │   │   └── auth.js
 │   └── package.json
 │
 └── frontend/
     ├── assets/
     ├── html e css/
     │   ├── index.html
     │   ├── compra.html
     │   ├── login.html
     │   ├── meus-pedidos.html
     │   ├── ajuda.html
     │   └── ...
     ├── add-to-cart.js
     ├── compra.js
     ├── auth.js
     ├── register.js
     ├── upcoming.js
     └── index.css

🛠️ Tecnologias Utilizadas
Frontend

HTML5

CSS3

JavaScript Vanilla

LocalStorage

Backend

Node.js

Express

JWT (jsonwebtoken)

bcrypt

Helmet + Rate Limit

File system (fs) para salvar dados

🔐 Autenticação

O login e registro geram um token JWT com duração de 8h.

Esse token é salvo no navegador:

localStorage.setItem("token", token)


Todas as rotas protegidas exigem:

Authorization: Bearer <token>

🛒 Fluxo do Carrinho / Compras

O usuário adiciona ingressos ao carrinho

O sistema salva em:

localStorage.ticketup_cart


Na compra, o sistema envia:

{
  "event_id": 4,
  "items": [
    {
      "ticket_id": 4,
      "qty": 1
    }
  ],
  "payment_method": "pix"
}


O backend baixa estoque, gera código do pedido e salva em data.json.

📦 Instalação e Uso
🔧 Backend
cd backend
npm install
node server.js


Servidor inicia em:

➡️ http://localhost:3000

🎨 Frontend

Os arquivos HTML ficam em:

frontend/html e css


O servidor Express já serve tudo automaticamente.

🧪 Testando Pedidos

Faça login

Adicione um evento ao carrinho

Finalize a compra

Vá em “Meus Pedidos”

O sistema consulta /api/orders e exibe todos os pedidos do usuário logado

📝 Observações

O sistema usa data.json como banco real — persistente.

Cada compra gera um código único:

PED123456


O stock dos tickets diminui automaticamente após cada compra.TicketUP
