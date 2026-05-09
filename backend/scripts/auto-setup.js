#!/usr/bin/env node

/**
 * Auto Setup EcoWatch Database
 * Tries common PostgreSQL passwords and creates the database
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const commonPasswords = ['Admin', 'ADMIN', '', 'postgres', 'password', '123456', 'admin', 'root'];

async function testConnectionWithPassword(password) {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password,
    database: 'postgres',
    connectionTimeoutMillis: 2000,
  });

  try {
    await client.connect();
    await client.end();
    return password;
  } catch (e) {
    return null;
  }
}

async function setupEcoWatch() {
  console.log('\nEcoWatch Database Auto-Setup\n');

  console.log('Finding PostgreSQL password...');
  let workingPassword = null;

  for (const pwd of commonPasswords) {
    console.log(`   Trying password: "${pwd || '(empty)'}"...`);
    workingPassword = await testConnectionWithPassword(pwd);
    if (workingPassword !== null) {
      console.log('Found working password.\n');
      break;
    }
  }

  if (workingPassword === null) {
    console.error('Could not connect to PostgreSQL with common passwords.');
    console.error('Please check if PostgreSQL is running and set DB_PASSWORD in .env manually.\n');
    process.exit(1);
  }

  console.log('Saving configuration to .env...');
  const envContent = `# EcoWatch Database Configuration
DATABASE_URL=postgresql://postgres:${workingPassword}@localhost:5432/ecowatch
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecowatch
DB_USER=postgres
DB_PASSWORD=${workingPassword}

# JWT Configuration
JWT_SECRET=ecowatch_super_secret_jwt_key_2024
JWT_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development
`;

  fs.writeFileSync(path.join(__dirname, '../.env'), envContent);
  console.log('Configuration saved.\n');

  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: workingPassword,
    database: 'postgres',
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL.\n');

    console.log('Removing old ecowatch database (if exists)...');
    try {
      await client.query('DROP DATABASE IF EXISTS ecowatch;');
      console.log('Removed.\n');
    } catch (e) {
      console.log('(none existed)\n');
    }

    console.log('Creating ecowatch database...');
    await client.query('CREATE DATABASE ecowatch;');
    console.log('Database created.\n');

    await client.end();

    console.log('Loading database schema...');
    require('dotenv').config({ path: path.join(__dirname, '../.env') });

    const schemaPath = path.join(__dirname, '../src/models/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    const ecodbClient = new Client({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: workingPassword,
      database: 'ecowatch',
    });

    await ecodbClient.connect();
    await ecodbClient.query(schema);
    console.log('Schema loaded completely.\n');
    await ecodbClient.end();

    console.log('=======================================');
    console.log('EcoWatch Database is READY.\n');
    console.log('Database Details:');
    console.log('   Host: localhost');
    console.log('   Port: 5432');
    console.log('   Database: ecowatch');
    console.log('   User: postgres');
    console.log(`   Password: ${workingPassword || '(empty)'}\n`);

    console.log("What's Inside:");
    console.log('   - users - Citizen accounts');
    console.log('   - admin_users - Staff accounts');
    console.log('   - reports - Environmental reports');
    console.log('   - report_media - Photos/videos');
    console.log('   - categories - Violation types');
    console.log('   - otps - SMS verification');
    console.log('   - report_activities - Audit log');
    console.log('   - system_settings - Configuration\n');

    console.log('Next Steps:');
    console.log('   1. npm install (if not done)');
    console.log('   2. npm run create:admin');
    console.log('   3. npm run dev\n');

    process.exit(0);
  } catch (error) {
    console.error('\nError setting up database:', error.message);
    try {
      await client.end();
    } catch (e) {}
    process.exit(1);
  }
}

setupEcoWatch();
