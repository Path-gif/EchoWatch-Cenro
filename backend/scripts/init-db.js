#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { pool } = require('../src/db');

const schemaPath = path.join(__dirname, '../db/ecowatch_postgresql.sql');

async function initializeDatabase() {
  const client = await pool.connect();

  try {
    console.log('Initializing PostgreSQL database...\n');

    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log('Loading schema file...');

    await client.query(schema);

    console.log('Schema created successfully.');

    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('Created Tables:');
    tables.rows.forEach((row) => {
      console.log(`  - ${row.table_name}`);
    });

    console.log('\nDatabase initialization complete.');
    console.log('Next steps:');
    console.log('  1. Create admin user: npm run create:admin');
    console.log('  2. Start backend: npm run dev');
    console.log('  3. Start frontend: npm run dev');
  } catch (error) {
    console.error('Error initializing database:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initializeDatabase();
