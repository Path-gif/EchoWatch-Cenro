require('dotenv').config();

async function sendSms(phone, message) {
  if ((process.env.SMS_PROVIDER || 'log') === 'log') {
    console.log('[SMS STUB] To:', phone, 'Message:', message);
    return { ok: true };
  }
  throw new Error('SMS provider not implemented');
}

module.exports = { sendSms };
