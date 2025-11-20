// Executa o arquivo SQL-Ticketup.sql no database configurado em backend/.env
const path = require('path');
const fs = require('fs');

async function main() {
  const dbPath = path.join(__dirname, 'db');
  let db;
  try {
    db = require(dbPath);
  } catch (e) {
    console.error('Não foi possível carregar ./db. Verifique se backend/db.js existe e se as dependências estão instaladas:', e.message || e);
    process.exit(1);
  }

  const sqlFile = path.join(__dirname, '..', 'SQL-Ticketup.sql');
  if (!fs.existsSync(sqlFile)) {
    console.error('Arquivo SQL não encontrado em', sqlFile);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlFile, 'utf8');
  try {
    console.log('Executando SQL em', process.env.PGDATABASE || 'database configurado');
    // usar pool.query para enviar o SQL inteiro
    await db.pool.query(sql);
    console.log('SQL executado com sucesso. Verifique as tabelas no pgAdmin (Schemas > public > Tables).');
    process.exit(0);
  } catch (err) {
    console.error('Erro ao executar SQL:', err.message || err);
    process.exit(1);
  }
}

main();
