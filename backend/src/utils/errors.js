function getDatabaseErrorMessage(error) {
  if (error?.code === 'DATABASE_NOT_CONFIGURED') {
    return 'Database is not configured. Add DATABASE_URL or connect Neon/Postgres so POSTGRES_URL is available in Vercel Environment Variables.';
  }

  if (error?.code === '42P01') {
    return 'Database tables are missing. Import backend/db/ecowatch_postgresql.sql into your hosted PostgreSQL database.';
  }

  if (error?.code === '28P01') {
    return 'Database login failed. Check the username and password in DATABASE_URL.';
  }

  if (error?.code === '3D000') {
    return 'Database name was not found. Check the database name in DATABASE_URL.';
  }

  if (['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'].includes(error?.code)) {
    return 'Cannot connect to the database. Use a hosted PostgreSQL DATABASE_URL, not localhost.';
  }

  if (/ssl/i.test(error?.message || '')) {
    return 'Database SSL connection failed. Add ?sslmode=require to DATABASE_URL or enable SSL for the hosted database.';
  }

  return null;
}

function sendServerError(res, fallback, error) {
  const message = getDatabaseErrorMessage(error) || fallback;
  return res.status(500).json({
    error: message,
    code: error?.code || 'SERVER_ERROR',
  });
}

module.exports = {
  getDatabaseErrorMessage,
  sendServerError,
};
