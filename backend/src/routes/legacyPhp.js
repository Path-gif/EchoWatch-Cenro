const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

// POST /register
router.post('/register', async (req, res) => {
  const username = String((req.body.username || '').trim());
  const email = String((req.body.email || '').trim()).toLowerCase();
  const password = req.body.password || '';

  if (!username || !email || !password) {
    return res.json({ success: false, message: 'All fields are required.' });
  }

  // basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.json({ success: false, message: 'Invalid email format.' });
  }

  try {
    const existing = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existing.rows.length > 0) {
      return res.json({ success: false, message: 'Email is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const insert = await db.query(
      `INSERT INTO users (full_name, email, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id`,
      [username, email, passwordHash]
    );

    if (insert.rows.length === 0) {
      return res.json({ success: false, message: 'Registration failed. Try again.' });
    }

    return res.status(201).json({ success: true, message: 'User registered successfully.' });
  } catch (err) {
    console.error('Legacy register error:', err);
    return res.status(500).json({ success: false, message: 'Registration failed. Try again.' });
  }
});

// POST /login
router.post('/login', async (req, res) => {
  const email = String((req.body.email || '').trim()).toLowerCase();
  const password = req.body.password || '';

  if (!email || !password) {
    return res.json({ success: false, message: 'Email and password are required.' });
  }

  try {
    const q = await db.query('SELECT id, full_name, email, password_hash FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
    if (q.rows.length === 0) {
      return res.json({ success: false, message: 'User not registered.' });
    }

    const user = q.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash || '');
    if (!ok) {
      return res.json({ success: false, message: 'Incorrect password.' });
    }

    return res.json({
      success: true,
      message: 'Login successful.',
      user: { id: user.id, username: user.full_name, email: user.email },
    });
  } catch (err) {
    console.error('Legacy login error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
