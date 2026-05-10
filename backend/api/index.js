const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const compression = require('compression');

const authRouter = require('../src/routes/auth');
const adminRouter = require('../src/routes/admin');
const reportsRouter = require('../src/routes/reports');
const aiRouter = require('../src/routes/ai');
const legacyPhpRouter = require('../src/routes/legacyPhp');
const db = require('../src/db');
const { ensureDatabaseSchema } = require('../src/utils/schema');
const { getDatabaseErrorMessage } = require('../src/utils/errors');

const app = express();

// Enable gzip compression for all responses
app.use(compression());

// log incoming requests for debugging (temporary)
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigin = process.env.CORS_ORIGIN || origin || '*';

  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
});

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'backend_uploads')));

app.use(async (req, res, next) => {
  try {
    await ensureDatabaseSchema(db);
    return next();
  } catch (error) {
    console.error('Schema setup error:', error);
    return res.status(500).json({
      error: getDatabaseErrorMessage(error) || 'Database setup failed.',
      code: error?.code || 'DATABASE_SETUP_FAILED',
    });
  }
});

app.use('/auth', authRouter);
app.use('/admin', adminRouter);
app.use('/reports', reportsRouter);
app.use('/ai', aiRouter);
// legacy PHP-compatible endpoints: /register and /login
app.use('/', legacyPhpRouter);

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'denr-citizen-backend' });
});

app.get('/health', async (req, res) => {
  try {
    await ensureDatabaseSchema(db);
    await db.query('SELECT 1');
    return res.json({ ok: true, service: 'denr-citizen-backend', database: 'connected' });
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({
      ok: false,
      service: 'denr-citizen-backend',
      database: 'error',
      error: error?.message || 'Database health check failed',
      code: error?.code || 'SERVER_ERROR',
    });
  }
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server listening on ${port}`));
} else {
  module.exports = app;
}
