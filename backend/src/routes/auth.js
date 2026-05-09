const express = require('express');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const db = require('../db');
const { sendSms } = require('../utils/sms');

const router = express.Router();

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

async function ensureUserMunicipalityColumn() {
  await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS municipality TEXT');
}

function requireUser(req, res, next) {
  const auth = req.headers.authorization || '';
  const [scheme, token] = auth.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'change_me');
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid_token' });
  }
}

router.post('/register', async (req, res) => {
  const { fullName, phone, email, password } = req.body;
  const normalizedName = String(fullName || '').trim();
  const normalizedPhone = String(phone || '').trim();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const municipality = String(req.body?.municipality || '').trim();

  if (!normalizedName || !normalizedPhone || !normalizedEmail || !password) {
    return res.status(400).json({ error: 'full name, phone number, email, and password are required' });
  }
  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (normalizedPhone.length < 10) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    await ensureUserMunicipalityColumn();

    const existing = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email address already registered' });
    }
    const existingPhone = await db.query('SELECT id FROM users WHERE phone = $1', [normalizedPhone]);
    if (existingPhone.rows.length > 0) {
      return res.status(409).json({ error: 'Phone number already registered' });
    }

    const passwordHash = await bcryptjs.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (phone, email, password_hash, full_name, municipality, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, phone, email, full_name, municipality`,
      [normalizedPhone, normalizedEmail, passwordHash, normalizedName, municipality || null]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { sub: user.id, email: user.email, phone: user.phone, name: user.full_name, municipality: user.municipality },
      process.env.JWT_SECRET || 'change_me',
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      ok: true,
      message: 'Registration successful',
      user: { id: user.id, phone: user.phone, email: user.email, name: user.full_name, municipality: user.municipality },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Failed to register user' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const rawIdentifier = String(email || '').trim();
  const normalizedIdentifier = rawIdentifier.toLowerCase();

  if (!rawIdentifier || !password) {
    return res.status(400).json({ error: 'Email or phone and password are required' });
  }

  const loginByEmail = isValidEmail(rawIdentifier);

  try {
    await ensureUserMunicipalityColumn();

    const query = loginByEmail
      ? 'SELECT id, phone, email, full_name, municipality, password_hash FROM users WHERE LOWER(email) = LOWER($1)'
      : 'SELECT id, phone, email, full_name, municipality, password_hash FROM users WHERE phone = $1';

    const result = await db.query(query, [loginByEmail ? normalizedIdentifier : rawIdentifier]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email/phone or password' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcryptjs.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email/phone or password' });
    }

    await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign(
      { sub: user.id, phone: user.phone, email: user.email, name: user.full_name, municipality: user.municipality },
      process.env.JWT_SECRET || 'change_me',
      { expiresIn: '7d' }
    );

    return res.json({
      ok: true,
      message: 'Login successful',
      user: { id: user.id, phone: user.phone, email: user.email, name: user.full_name, municipality: user.municipality },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Failed to login' });
  }
});

router.patch('/me', requireUser, async (req, res) => {
  const normalizedName = String(req.body?.name || req.body?.fullName || '').trim();
  const normalizedPhone = String(req.body?.phone || '').trim();
  const normalizedEmail = String(req.body?.email || '').trim().toLowerCase();
  const municipality = String(req.body?.municipality || '').trim();
  const userId = Number(req.user?.sub);

  if (!Number.isFinite(userId)) {
    return res.status(401).json({ error: 'invalid_token' });
  }
  if (!normalizedName || !normalizedPhone || !normalizedEmail) {
    return res.status(400).json({ error: 'full name, phone number, and email are required' });
  }
  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (normalizedPhone.length < 10) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  try {
    await ensureUserMunicipalityColumn();

    const existingEmail = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2', [normalizedEmail, userId]);
    if (existingEmail.rows.length > 0) {
      return res.status(409).json({ error: 'Email address already registered' });
    }

    const existingPhone = await db.query('SELECT id FROM users WHERE phone = $1 AND id <> $2', [normalizedPhone, userId]);
    if (existingPhone.rows.length > 0) {
      return res.status(409).json({ error: 'Phone number already registered' });
    }

    const result = await db.query(
      `UPDATE users
       SET full_name = $1, phone = $2, email = $3, municipality = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING id, phone, email, full_name, municipality`,
      [normalizedName, normalizedPhone, normalizedEmail, municipality || null, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const token = jwt.sign(
      { sub: user.id, phone: user.phone, email: user.email, name: user.full_name, municipality: user.municipality },
      process.env.JWT_SECRET || 'change_me',
      { expiresIn: '7d' }
    );

    return res.json({
      ok: true,
      message: 'Profile updated successfully',
      user: { id: user.id, phone: user.phone, email: user.email, name: user.full_name, municipality: user.municipality },
      token,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.post('/request-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone is required' });

  const code = generateOtp();
  const ttlMin = parseInt(process.env.OTP_TTL_MIN || '10', 10);
  const expiresAt = new Date(Date.now() + ttlMin * 60 * 1000);

  try {
    await db.query(
      'INSERT INTO otps(phone, code, expires_at, used) VALUES($1,$2,$3,false)',
      [phone, code, expiresAt]
    );

    await sendSms(phone, `Your DENR verification code is ${code}`);
    return res.json({ ok: true, message: 'OTP sent (check console in dev mode)' });
  } catch (err) {
    console.error('OTP request error:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

router.post('/verify-otp', async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ error: 'phone and code required' });

  try {
    const q = await db.query(
      'SELECT id, code, expires_at, used FROM otps WHERE phone=$1 AND code=$2 ORDER BY id DESC LIMIT 1',
      [phone, code]
    );
    const row = q.rows[0];
    if (!row) return res.status(400).json({ error: 'invalid_code' });
    if (row.used) return res.status(400).json({ error: 'code_used' });
    if (new Date(row.expires_at) < new Date()) return res.status(400).json({ error: 'code_expired' });

    await db.query('UPDATE otps SET used=true WHERE id=$1', [row.id]);

    const u = await db.query('SELECT id FROM users WHERE phone=$1 LIMIT 1', [phone]);
    let userId;
    if (u.rows.length === 0) {
      const placeholderHash = await bcryptjs.hash(`otp:${phone}`, 10);
      const r = await db.query(
        'INSERT INTO users(phone, password_hash, created_at, updated_at) VALUES($1, $2, NOW(), NOW()) RETURNING id',
        [phone, placeholderHash]
      );
      userId = r.rows[0].id;
    } else {
      userId = u.rows[0].id;
    }

    const token = jwt.sign({ sub: userId, phone }, process.env.JWT_SECRET || 'change_me', { expiresIn: '7d' });
    return res.json({ ok: true, token });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

module.exports = router;
