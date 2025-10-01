/**
 * Test email notification locally
 * Run with: node test-email.js
 */

require('dotenv').config({ path: '.env.local' });

const { notifyDispatchersOfNewTrip } = require('./lib/notifications');

// Sample trip data
const sampleTrip = {
  id: 'test-' + Date.now(),
  status: 'pending',
  pickup_address: '123 Main St, Los Angeles, CA',
  destination_address: '456 Oak Ave, Los Angeles, CA',
  pickup_time: new Date().toISOString(),
  wheelchair_type: 'wheelchair',
  is_round_trip: false,
  distance: 5.2,
  price: 45.00,
  special_requirements: 'Test booking'
};

const sampleUser = {
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User'
  }
};

console.log('Testing email notification...');
console.log('Environment variables:');
console.log('SENDPULSE_USER:', process.env.SENDPULSE_USER ? '✓ Set' : '✗ Missing');
console.log('SENDPULSE_PASSWORD:', process.env.SENDPULSE_PASSWORD ? '✓ Set' : '✗ Missing');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM || 'Using default');
console.log('');

notifyDispatchersOfNewTrip(sampleTrip, sampleUser)
  .then(result => {
    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log('Result:', result.info);
    } else {
      console.error('❌ Email failed to send');
      console.error('Error:', result.error);
    }
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
