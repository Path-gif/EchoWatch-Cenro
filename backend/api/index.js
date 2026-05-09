const express = require('express');
const serverless = require('serverless-http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const compression = require('compression');

const authRouter = require('../src/routes/auth');
const adminRouter = require('../src/routes/admin');
const reportsRouter = require('../src/routes/reports');
const aiRouter = require('../src/routes/ai');
const legacyPhpRouter = require('../src/routes/legacyPhp');

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

app.use('/auth', authRouter);
app.use('/admin', adminRouter);
app.use('/reports', reportsRouter);
app.use('/ai', aiRouter);
// legacy PHP-compatible endpoints: /register and /login
app.use('/', legacyPhpRouter);

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'denr-citizen-backend' });
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server listening on ${port}`));
} else {
  module.exports.handler = serverless(app);
}
