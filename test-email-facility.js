#!/usr/bin/env node

/**
 * Test Email Configuration for Facility App
 * Usage: node test-email-facility.js
 *
 * This script tests the email configuration for the facility app
 * to ensure emails are sent to app@compassionatecaretransportation.com
 * when a new trip is booked.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function testEmailConfiguration() {
  console.log('🔧 Testing Facility App Email Configuration\n');
  console.log('='.repeat(50));

  // Check environment variables
  console.log('📋 Environment Variables Check:');
  const requiredVars = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASSWORD'
  ];

  let allVarsPresent = true;
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      if (varName === 'SMTP_PASSWORD') {
        console.log(`✅ ${varName}: ****** (hidden)`);
      } else {
        console.log(`✅ ${varName}: ${value}`);
      }
    } else {
      console.log(`❌ ${varName}: Not configured`);
      allVarsPresent = false;
    }
  }

  console.log('\n' + '='.repeat(50));

  if (!allVarsPresent) {
    console.error('\n⚠️  Missing required environment variables!');
    console.log('\nPlease create a .env.local file with the following variables:');
    console.log('- SMTP_HOST=smtp.gmail.com');
    console.log('- SMTP_PORT=587');
    console.log('- SMTP_USER=app@compassionatecaretransportation.com');
    console.log('- SMTP_PASSWORD=your_google_app_password');
    console.log('\nTo get a Google App Password:');
    console.log('1. Enable 2-Factor Authentication at https://myaccount.google.com/security');
    console.log('2. Generate App Password at https://myaccount.google.com/apppasswords');
    process.exit(1);
  }

  // Create transporter
  console.log('\n📧 Creating email transporter...');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // Verify connection
  console.log('🔌 Verifying SMTP connection...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connection successful!');
  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Ensure you\'re using an App Password, not your regular Google password');
    console.log('2. Check that 2-Factor Authentication is enabled on your Google account');
    console.log('3. Verify the email address is correct');
    console.log('4. Check your firewall settings for port 587');
    process.exit(1);
  }

  // Send test email
  console.log('\n📮 Sending test email to app@compassionatecaretransportation.com...');

  const testTripData = {
    id: 'TEST-' + Date.now(),
    pickup_address: '123 Main St, San Francisco, CA 94122',
    destination_address: '456 Market St, San Francisco, CA 94102',
    pickup_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    client_name: 'John Doe',
    client_phone: '(555) 123-4567',
    wheelchair_type: 'none',
    is_round_trip: false,
    distance: '5.2',
    price: '65.00',
    special_requirements: 'Test booking - please ignore'
  };

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #2563eb;">🧪 TEST: New Trip Request</h1>

      <p style="background: #fef3c7; border: 2px solid #f59e0b; padding: 10px; border-radius: 5px;">
        <strong>⚠️ This is a TEST email to verify the facility app email configuration.</strong>
      </p>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin-top: 0; color: #1f2937;">Trip Details</h2>

        <p><strong>Trip ID:</strong> ${testTripData.id}</p>
        <p><strong>Client:</strong> ${testTripData.client_name}</p>
        <p><strong>Phone:</strong> ${testTripData.client_phone}</p>
        <p><strong>Pickup:</strong> ${testTripData.pickup_address}</p>
        <p><strong>Destination:</strong> ${testTripData.destination_address}</p>
        <p><strong>Pickup Time:</strong> ${new Date(testTripData.pickup_time).toLocaleString()}</p>
        <p><strong>Distance:</strong> ${testTripData.distance} miles</p>
        <p><strong>Estimated Price:</strong> $${testTripData.price}</p>
        <p><strong>Special Requirements:</strong> ${testTripData.special_requirements}</p>
      </div>

      <p style="color: #6b7280; font-size: 12px;">
        This test email was sent from the facility app to verify that booking notifications
        are correctly sent to app@compassionatecaretransportation.com
      </p>
    </div>
  `;

  const emailText = `
TEST: New Trip Request

⚠️ This is a TEST email to verify the facility app email configuration.

Trip Details:
- Trip ID: ${testTripData.id}
- Client: ${testTripData.client_name}
- Phone: ${testTripData.client_phone}
- Pickup: ${testTripData.pickup_address}
- Destination: ${testTripData.destination_address}
- Pickup Time: ${new Date(testTripData.pickup_time).toLocaleString()}
- Distance: ${testTripData.distance} miles
- Estimated Price: $${testTripData.price}
- Special Requirements: ${testTripData.special_requirements}

This test email was sent from the facility app to verify that booking notifications
are correctly sent to app@compassionatecaretransportation.com
  `.trim();

  try {
    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Compassionate Care Transportation <app@compassionatecaretransportation.com>',
      to: 'app@compassionatecaretransportation.com',
      subject: `TEST: New Trip Request - ${testTripData.id}`,
      text: emailText,
      html: emailHtml,
    });

    console.log('✅ Test email sent successfully!');
    console.log('📬 Message ID:', result.messageId);
    console.log('📨 Check the inbox for app@compassionatecaretransportation.com');

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Email configuration is working correctly!');
    console.log('\nNext steps:');
    console.log('1. Verify the test email arrived at app@compassionatecaretransportation.com');
    console.log('2. Deploy these changes to your facility app');
    console.log('3. Test a real booking to confirm emails are sent');

  } catch (error) {
    console.error('❌ Failed to send test email:', error.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Check that the Google App Password is correct (no spaces)');
    console.log('2. Ensure the sender email has permission to send through Google SMTP');
    console.log('3. Try generating a new App Password if the current one isn\'t working');
    process.exit(1);
  }
}

// Run the test
testEmailConfiguration().catch(console.error);