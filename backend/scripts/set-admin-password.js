const bcrypt = require('bcryptjs');
const db = require('../src/db');

async function run() {
  try {
    const hash = bcrypt.hashSync('Admin_DENR', 10);
    await db.query('UPDATE admin_users SET password_hash = $1 WHERE email = $2', [hash, 'admin@gmail.com']);
    console.log('Updated admin password hash for admin@gmail.com');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
