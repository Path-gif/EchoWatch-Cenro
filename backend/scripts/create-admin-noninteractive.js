#!/usr/bin/env node

/**
 * Non-interactive admin creator
 * Usage (PowerShell):
 *   $env:ADMIN_EMAIL='admin@example.com'; $env:ADMIN_NAME='Admin Name'; $env:ADMIN_PASSWORD='secret'; node scripts/create-admin-noninteractive.js
 */

const bcryptjs = require('bcryptjs');
require('dotenv').config();
const db = require('../src/db');

async function run() {
  try {
    const email = process.env.ADMIN_EMAIL || process.argv[2];
    const name = process.env.ADMIN_NAME || process.argv[3];
    const password = process.env.ADMIN_PASSWORD || process.argv[4];

    if (!email || !email.includes('@')) {
      console.error('Invalid or missing ADMIN_EMAIL');
      process.exit(1);
    }
    if (!name || name.length < 2) {
      console.error('Invalid or missing ADMIN_NAME');
      process.exit(1);
    }
    if (!password || password.length < 6) {
      console.error('Invalid or missing ADMIN_PASSWORD (min 6 chars)');
      process.exit(1);
    }

    const hash = await bcryptjs.hash(password, 10);

    const result = await db.query(
      `INSERT INTO admin_users (email, password_hash, name, role, is_active)
       VALUES ($1, $2, $3, 'admin', true)
       RETURNING id, email, name, role;`,
      [email.toLowerCase(), hash, name]
    );

    const admin = result.rows[0];
    console.log('Admin user created successfully.');
    console.log(`ID: ${admin.id}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Name: ${admin.name}`);
    process.exit(0);
  } catch (err) {
    if (err && err.code === '23505') {
      console.error('Email already exists');
      process.exit(2);
    }
    console.error('Error creating admin:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

run();
