async function run() {
  try {
    const res = await fetch('http://localhost:3000/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin@gmail.com', password: 'Admin_DENR' }),
    });
    const data = await res.json();
    console.log('Status', res.status);
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fetch error', err);
  }
}

run();
async function run() {
  try {
    const res = await fetch('http://localhost:3000/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin@gmail.com', password: 'Admin_DENR' }),
    });
    const data = await res.json();
    console.log('Status', res.status);
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fetch error', err);
  }
}

run();
