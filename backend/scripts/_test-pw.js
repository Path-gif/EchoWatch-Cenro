const { Client } = require('pg');
const pwd = 'Admin_DENR';
const c = new Client({ 
  host:'localhost', port:5432, user:'postgres', 
  password:pwd, database:'postgres', 
  connectionTimeoutMillis:5000 
});
c.connect()
  .then(() => { console.log('Connected OK'); return c.end(); })
  .catch(e => { console.log('Error code:', e.code); console.log('Error message:', e.message); });
