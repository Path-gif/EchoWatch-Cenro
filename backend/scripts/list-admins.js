const db = require('../src/db');

async function run() {
  try {
    const res = await db.query('SELECT id, email, name, is_active FROM admin_users ORDER BY id DESC');
    console.log('Admins:', res.rows);
  } catch (err) {
    console.error('Error listing admins:', err.message || err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

run();
