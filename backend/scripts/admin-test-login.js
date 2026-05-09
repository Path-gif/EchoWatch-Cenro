const axios = require('axios');

async function run() {
  try {
    const login = await axios.post('http://localhost:3000/admin/login', {
      username: process.env.ADMIN_EMAIL || 'admin@gmail.com',
      password: process.env.ADMIN_PASSWORD || 'Admin_DENR',
    });
    console.log('Login response:', login.data);
    const token = login.data.token;
    const overview = await axios.get('http://localhost:3000/admin/reports/overview', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('Overview:', JSON.stringify(overview.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error('Error response:', err.response.status, err.response.data);
    } else {
      console.error('Error:', err.message);
    }
    process.exit(1);
  }
}

run();
