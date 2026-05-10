const { Pool } = require('pg');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

const hasDatabaseUrl = Boolean(databaseUrl);
const hasDiscreteConfig = Boolean(
  process.env.DB_USER &&
  process.env.DB_PASSWORD &&
  process.env.DB_HOST &&
  process.env.DB_PORT &&
  process.env.DB_NAME
);
const connectionString = hasDatabaseUrl
  ? databaseUrl
  : hasDiscreteConfig
    ? `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
    : null;

if (!connectionString) {
  console.error('Database configuration missing. Set DATABASE_URL or POSTGRES_URL in the deployment environment.');
}

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

if (connectionString) {
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Database connection failed:', err.message);
      console.error('   Check DATABASE_URL in your .env file');
      console.error('   Make sure PostgreSQL is running on port 5432');
    } else {
      console.log('Database connection established');
      console.log(`   Server time: ${res.rows[0].now}`);
    }
  });
}

module.exports = {
  query: (text, params) => {
    if (!connectionString) {
      const error = new Error('Database is not configured. Set DATABASE_URL or connect Vercel Postgres/Neon so POSTGRES_URL is available.');
      error.code = 'DATABASE_NOT_CONFIGURED';
      return Promise.reject(error);
    }

    return pool.query(text, params);
  },
  pool,
};
