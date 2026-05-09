// Simple SMS sender stub. Replace with Twilio or other provider in production.
require('dotenv').config();

async function sendSms(phone, message) {
  if ((process.env.SMS_PROVIDER || 'log') === 'log') {
    console.log('[SMS STUB] To:', phone, 'Message:', message);
    return { ok: true };
  }
  // TODO: implement Twilio/nexmo provider based on SMS_PROVIDER env
  throw new Error('SMS provider not implemented');
}

module.exports = { sendSms };
