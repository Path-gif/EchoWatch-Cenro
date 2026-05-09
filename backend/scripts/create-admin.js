#!/usr/bin/env node

/**
 * Create Admin User Script
 * Creates initial admin account for system administration
 * Usage: npm run create:admin
 */

const readline = require('readline');
const bcryptjs = require('bcryptjs');
require('dotenv').config();

const db = require('../src/db');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdmin() {
  try {
    console.log('\nCreate Admin User\n');

    const email = await question('Admin Email: ');
    const name = await question('Admin Name: ');
    const password = await question('Password (min 8 chars): ');

    if (!email || !email.includes('@')) {
      console.error('Invalid email address');
      process.exit(1);
    }
    if (!name || name.length < 2) {
      console.error('Invalid name');
      process.exit(1);
    }
    if (password.length < 8) {
      console.error('Invalid password');
      process.exit(1);
    }

    console.log('\nHashing password...');
    const hash = await bcryptjs.hash(password, 10);

    console.log('Creating admin user in database...');
    const result = await db.query(
      `INSERT INTO admin_users (email, password_hash, name, role, is_active)
       VALUES ($1, $2, $3, 'admin', true)
       RETURNING id, email, name, role;`,
      [email, hash, name]
    );

    const admin = result.rows[0];
    console.log('\nAdmin user created successfully.\n');
    console.log('Admin Details:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Role: ${admin.role}\n`);

    process.exit(0);
  } catch (error) {
    if (error.code === '23505') {
      console.error('Email already exists');
    } else {
      console.error('Error creating admin:', error.message);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

createAdmin();
