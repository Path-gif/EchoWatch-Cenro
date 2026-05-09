const bcrypt = require('bcryptjs');

const hash = "$2a$10$/VA9rsNX02a/TPp/PfcvQeDw7ORmuWMScSjyNgs84mKOkq9udlbg.";
const pw = 'Admin_DENR';

bcrypt.compare(pw, hash, (err, res) => {
  if (err) return console.error('compare err', err);
  console.log('bcrypt compare result:', res);
});
