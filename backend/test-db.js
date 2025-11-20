// Script de teste para listar usuários usando a conexão em ./db
const path = require('path');
const dbPath = path.join(__dirname, 'db');

async function main() {
  let db;
  try {
    db = require(dbPath);
  } catch (e) {
    console.error('Não foi possível carregar ./db. Verifique se backend/db.js existe e as dependências (pg):', e.message || e);
    process.exit(1);
  }

  try {
    const t = await db.query("SELECT to_regclass('public.usuario') AS usuario, to_regclass('public.users') AS users");
    console.log('Tabelas detectadas:', t.rows[0]);

    if (t.rows[0].usuario) {
      const r = await db.query('SELECT id_usuario, nome, email, data_cadastro FROM usuario ORDER BY id_usuario');
      console.log('\nUsuários (tabela usuario):');
      console.table(r.rows);
    } else if (t.rows[0].users) {
      const r = await db.query('SELECT id, name, email, created_at FROM users ORDER BY id');
      console.log('\nUsuários (tabela users):');
      console.table(r.rows);
    } else {
      console.log('Nenhuma tabela de usuários padrão encontrada no DB atual.');
      console.log('Verifique se executou o SQL no database correto (veja topo do Query Tool no pgAdmin).');
    }
    process.exit(0);
  } catch (err) {
    console.error('Erro ao executar queries no DB:', err.message || err);
    process.exit(1);
  }
}

main();
