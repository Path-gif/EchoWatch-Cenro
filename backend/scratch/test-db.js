const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: 'postgresql://postgres:Admin_DENR@127.0.0.1:5432/postgres',
});

async function test() {
  try {
    const res = await pool.query('SELECT current_database(), current_user, version()');
    console.log('Connection successful!');
    console.log('Database:', res.rows[0].current_database);
    console.log('User:', res.rows[0].current_user);
    console.log('Version:', res.rows[0].version);
  } catch (err) {
    console.error('Connection failed:');
    console.error(err.message);
  } finally {
    await pool.end();
  }
}

test();
