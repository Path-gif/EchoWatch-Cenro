const { Pool } = require('pg');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const databaseSources = [
  ['neondb_owner_POSTGRES_URL', process.env.neondb_owner_POSTGRES_URL],
  ['neondb_owner_POSTGRES_PRISMA_URL', process.env.neondb_owner_POSTGRES_PRISMA_URL],
  ['neondb_owner_POSTGRES_URL_NON_POOLING', process.env.neondb_owner_POSTGRES_URL_NON_POOLING],
  ['POSTGRES_URL_NON_POOLING', process.env.POSTGRES_URL_NON_POOLING],
  ['POSTGRES_URL', process.env.POSTGRES_URL],
  ['POSTGRES_PRISMA_URL', process.env.POSTGRES_PRISMA_URL],
  ['DATABASE_URL', process.env.DATABASE_URL],
];
const selectedDatabaseSource = databaseSources.find(([, value]) => Boolean(value));
const databaseUrl = selectedDatabaseSource?.[1];

const hasDatabaseUrl = Boolean(databaseUrl);
const hasDiscreteConfig = Boolean(
  process.env.DB_USER &&
  process.env.DB_PASSWORD &&
  process.env.DB_HOST &&
  process.env.DB_PORT &&
  process.env.DB_NAME
);
const rawConnectionString = hasDatabaseUrl
  ? databaseUrl
  : hasDiscreteConfig
    ? `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
    : null;
const connectionString =
  rawConnectionString &&
  /[?&]sslmode=require/i.test(rawConnectionString) &&
  !/[?&]uselibpqcompat=/i.test(rawConnectionString)
    ? `${rawConnectionString}${rawConnectionString.includes('?') ? '&' : '?'}uselibpqcompat=true`
    : rawConnectionString;
const usesLocalDatabase = /@(localhost|127\.0\.0\.1)(:|\/)/i.test(connectionString || '');

if (!connectionString) {
  console.error('Database configuration missing. Set DATABASE_URL or POSTGRES_URL in the deployment environment.');
}

const pool = new Pool({
  connectionString,
  ssl: connectionString && !usesLocalDatabase ? { rejectUnauthorized: false } : undefined,
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
  selectedDatabaseSource: selectedDatabaseSource?.[0] || null,
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
