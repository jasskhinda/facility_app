require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

console.log('Testing SendPulse SMTP with port 465...');

const transporter = nodemailer.createTransport({
  host: 'smtp-pulse.com',
  port: 465,
  secure: true, // use SSL
  auth: {
    user: process.env.SENDPULSE_USER,
    pass: process.env.SENDPULSE_PASSWORD,
  }
});

transporter.sendMail({
  from: 'Compassionate Care Transportation <app@compassionatecaretransportation.com>',
  to: 'app@compassionatecaretransportation.com',
  subject: 'Test Email - Port 465',
  text: 'Testing port 465 with SSL'
}, (error, info) => {
  if (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  } else {
    console.log('✅ Success!', info.messageId);
    process.exit(0);
  }
});

setTimeout(() => {
  console.error('❌ Timeout');
  process.exit(1);
}, 15000);
