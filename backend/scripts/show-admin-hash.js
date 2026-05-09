const db = require('../src/db');

async function run() {
  try {
    const r = await db.query("SELECT id, email, name, password_hash, is_active FROM admin_users WHERE email = $1", ['admin@gmail.com']);
    console.log(JSON.stringify(r.rows, null, 2));
    if (r.rows.length) {
      console.log('hash length:', r.rows[0].password_hash.length);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
