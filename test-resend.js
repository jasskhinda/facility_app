#!/usr/bin/env node

/**
 * Quick Resend Email Test
 * Usage: node test-resend.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function testResend() {
  console.log('🚀 Testing Resend Email Configuration\n');
  console.log('='.repeat(50));

  // Check for Resend API key
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY not found in .env.local');
    console.log('\nPlease add to .env.local:');
    console.log('RESEND_API_KEY=re_your_api_key_here\n');
    process.exit(1);
  }

  console.log('✅ Resend API Key found');
  console.log('📧 From:', process.env.EMAIL_FROM || 'app@compassionatecaretransportation.com');
  console.log('📬 To: app@compassionatecaretransportation.com\n');

  // Create Resend transporter
  const transporter = nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
    auth: {
      user: 'resend',
      pass: process.env.RESEND_API_KEY,
    },
  });

  // Test trip data
  const tripId = 'TEST-' + Date.now();
  const pickupTime = new Date(Date.now() + 86400000); // Tomorrow

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">🚗 New Trip Request</h2>

      <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #059669;"><strong>✅ Resend is working!</strong></p>
        <p style="margin: 5px 0 0 0; color: #6b7280;">This test confirms emails are being sent to app@compassionatecaretransportation.com</p>
      </div>

      <h3>Sample Trip Details:</h3>
      <ul style="line-height: 1.8;">
        <li><strong>Trip ID:</strong> ${tripId}</li>
        <li><strong>Client:</strong> John Doe</li>
        <li><strong>Phone:</strong> (555) 123-4567</li>
        <li><strong>Pickup:</strong> 123 Main St, San Francisco, CA</li>
        <li><strong>Destination:</strong> 456 Market St, San Francisco, CA</li>
        <li><strong>Time:</strong> ${pickupTime.toLocaleString()}</li>
        <li><strong>Distance:</strong> 5.2 miles</li>
        <li><strong>Price:</strong> $65.00</li>
      </ul>

      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

      <p style="color: #6b7280; font-size: 12px;">
        Sent via Resend at ${new Date().toLocaleString()}<br>
        From: ${process.env.EMAIL_FROM || 'app@compassionatecaretransportation.com'}
      </p>
    </div>
  `;

  try {
    console.log('📮 Sending test email...\n');

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Compassionate Care Transportation <app@compassionatecaretransportation.com>',
      to: 'app@compassionatecaretransportation.com',
      subject: `TEST: New Trip Request - ${tripId}`,
      html: html,
      text: `New Trip Request (TEST)

Trip ID: ${tripId}
Client: John Doe
Pickup: 123 Main St, San Francisco, CA
Destination: 456 Market St, San Francisco, CA
Time: ${pickupTime.toLocaleString()}

This is a test email from the facility app using Resend.`,
    });

    console.log('✅ SUCCESS! Email sent via Resend');
    console.log('📧 Message ID:', info.messageId);
    console.log('\n' + '='.repeat(50));
    console.log('\n✨ Resend is properly configured!\n');
    console.log('Next steps:');
    console.log('1. Check app@compassionatecaretransportation.com inbox');
    console.log('2. View email logs at https://resend.com/emails');
    console.log('3. Deploy with the same RESEND_API_KEY to production\n');

  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Verify your Resend API key is correct');
    console.log('2. Check that the key has sending permissions');
    console.log('3. Visit https://resend.com/emails to see error details');
    console.log('4. Ensure compassionatecaretransportation.com is verified\n');
    process.exit(1);
  }
}

// Run test
testResend().catch(console.error);