/**
 * Test SMTP connection directly
 * Run with: node test-smtp.js
 */

require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

console.log('Testing SendPulse SMTP connection...');
console.log('User:', process.env.SENDPULSE_USER);
console.log('Password:', process.env.SENDPULSE_PASSWORD ? '***' : 'NOT SET');
console.log('');

const transporter = nodemailer.createTransport({
  host: 'smtp-pulse.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SENDPULSE_USER,
    pass: process.env.SENDPULSE_PASSWORD,
  },
  debug: true, // Enable debug output
  logger: true // Log to console
});

console.log('Verifying transporter...');
transporter.verify(function (error, success) {
  if (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } else {
    console.log('✅ Server is ready to take our messages');

    // Try sending a test email
    console.log('\nSending test email...');
    transporter.sendMail({
      from: 'Compassionate Care Transportation <app@compassionatecaretransportation.com>',
      to: 'app@compassionatecaretransportation.com',
      subject: 'Test Email from facility_app',
      text: 'This is a test email to verify SendPulse SMTP is working correctly.',
      html: '<h1>Test Email</h1><p>This is a test email to verify SendPulse SMTP is working correctly.</p>'
    }, (error, info) => {
      if (error) {
        console.error('❌ Send failed:', error);
        process.exit(1);
      } else {
        console.log('✅ Email sent successfully!');
        console.log('Message ID:', info.messageId);
        console.log('Response:', info.response);
        process.exit(0);
      }
    });
  }
});

// Timeout after 20 seconds
setTimeout(() => {
  console.error('\n❌ Timeout - SMTP connection took too long');
  process.exit(1);
}, 20000);
