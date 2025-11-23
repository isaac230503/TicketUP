const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "..", "data.json");
const JWT_SECRET = process.env.JWT_SECRET || "changeme_jwt_secret";

function readData() {
  return JSON.parse(fs.readFileSync(DATA_PATH));
}

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token ausente" });
  }

  const token = header.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Puxa informações completas do usuário do data.json
    const data = readData();
    const user = data.users.find(u => u.id === decoded.id);

    if (!user) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    req.user = user;
    next();

  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
  }
};
