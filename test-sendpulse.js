#!/usr/bin/env node

/**
 * Quick SendPulse Email Test
 * Usage: node test-sendpulse.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function testSendPulse() {
  console.log('🚀 Testing SendPulse Email Configuration\n');
  console.log('='.repeat(50));

  // Check for SendPulse credentials
  if (!process.env.SENDPULSE_USER || !process.env.SENDPULSE_PASSWORD) {
    console.error('❌ SendPulse credentials not found in .env.local');
    console.log('\nPlease add to .env.local:');
    console.log('SENDPULSE_USER=your-sendpulse-email@example.com');
    console.log('SENDPULSE_PASSWORD=your-sendpulse-password\n');
    console.log('Get these from: https://sendpulse.com → Settings → SMTP\n');
    process.exit(1);
  }

  console.log('✅ SendPulse credentials found');
  console.log('👤 User:', process.env.SENDPULSE_USER);
  console.log('🔑 Password: ********');
  console.log('📧 From:', process.env.EMAIL_FROM || 'app@compassionatecaretransportation.com');
  console.log('📬 To: app@compassionatecaretransportation.com\n');

  // Create SendPulse transporter
  const transporter = nodemailer.createTransporter({
    host: 'smtp-pulse.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SENDPULSE_USER,
      pass: process.env.SENDPULSE_PASSWORD,
    },
  });

  // Test SMTP connection
  console.log('🔌 Testing SMTP connection...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connection successful!\n');
  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Check your SendPulse username/password');
    console.log('2. Ensure your SendPulse account is verified');
    console.log('3. Visit https://sendpulse.com/settings/smtp for credentials\n');
    process.exit(1);
  }

  // Test trip data
  const tripId = 'SENDPULSE-TEST-' + Date.now();
  const pickupTime = new Date(Date.now() + 86400000); // Tomorrow

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #2563eb; margin: 0;">🚗 New Trip Request</h2>
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px; border-radius: 20px; display: inline-block; margin-top: 10px;">
          <strong>✨ Powered by SendPulse</strong>
        </div>
      </div>

      <div style="background: #f0f9ff; border: 2px solid #0ea5e9; padding: 20px; border-radius: 10px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #0369a1;">🎉 SendPulse is Working!</h3>
        <p style="margin-bottom: 0;">
          <strong>Free Tier:</strong> 15,000 emails/month<br>
          <strong>Easy Setup:</strong> Just username/password<br>
          <strong>Great Dashboard:</strong> Real-time delivery stats
        </p>
      </div>

      <h3 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
        📋 Sample Trip Details
      </h3>

      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Trip ID:</td>
            <td style="padding: 8px 0;">${tripId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Client:</td>
            <td style="padding: 8px 0;">Sarah Johnson</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Phone:</td>
            <td style="padding: 8px 0;">(555) 789-0123</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Pickup:</td>
            <td style="padding: 8px 0;">789 Oak St, San Francisco, CA</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Destination:</td>
            <td style="padding: 8px 0;">UCSF Medical Center, San Francisco, CA</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Pickup Time:</td>
            <td style="padding: 8px 0;">${pickupTime.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Distance:</td>
            <td style="padding: 8px 0;">4.8 miles</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Price:</td>
            <td style="padding: 8px 0;"><strong style="color: #059669;">$58.00</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Requirements:</td>
            <td style="padding: 8px 0;">Wheelchair accessible</td>
          </tr>
        </table>
      </div>

      <div style="background: #ecfdf5; border: 1px solid #10b981; padding: 15px; border-radius: 8px; margin: 30px 0;">
        <h4 style="margin-top: 0; color: #065f46;">
          ✅ Configuration Successful!
        </h4>
        <p style="margin-bottom: 0;">
          Your facility app is now configured to send trip notifications via SendPulse to
          <strong>app@compassionatecaretransportation.com</strong>
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://sendpulse.com/statistics" style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          📊 View SendPulse Dashboard
        </a>
      </div>

      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; color: #6b7280; font-size: 12px;">
        <p><strong>Test Details:</strong></p>
        <ul style="margin: 5px 0;">
          <li>Time: ${new Date().toLocaleString()}</li>
          <li>Provider: SendPulse</li>
          <li>SMTP Server: smtp-pulse.com:587</li>
          <li>User: ${process.env.SENDPULSE_USER}</li>
        </ul>
      </div>
    </div>
  `;

  const emailText = `
NEW TRIP REQUEST - SendPulse Test

✨ SendPulse is working! ✨

Trip Details:
- Trip ID: ${tripId}
- Client: Sarah Johnson
- Phone: (555) 789-0123
- Pickup: 789 Oak St, San Francisco, CA
- Destination: UCSF Medical Center, San Francisco, CA
- Pickup Time: ${pickupTime.toLocaleString()}
- Distance: 4.8 miles
- Price: $58.00
- Requirements: Wheelchair accessible

Configuration Successful!
Your facility app is now sending trip notifications via SendPulse
to app@compassionatecaretransportation.com

SendPulse Benefits:
- 15,000 emails/month FREE
- Easy setup with username/password
- Real-time delivery statistics
- Excellent deliverability rates

View your SendPulse dashboard: https://sendpulse.com/statistics

Test performed at: ${new Date().toLocaleString()}
Provider: SendPulse (smtp-pulse.com)
User: ${process.env.SENDPULSE_USER}
  `.trim();

  try {
    console.log('📮 Sending test email via SendPulse...\n');

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Compassionate Care Transportation <app@compassionatecaretransportation.com>',
      to: 'app@compassionatecaretransportation.com',
      subject: `🧪 TEST: New Trip Request via SendPulse - ${tripId}`,
      html: html,
      text: emailText,
    });

    console.log('✅ SUCCESS! Email sent via SendPulse');
    console.log('📧 Message ID:', info.messageId);
    if (info.response) {
      console.log('📨 SMTP Response:', info.response);
    }

    console.log('\n' + '='.repeat(50));
    console.log('\n🎉 SendPulse Configuration Complete!\n');

    console.log('What to check now:');
    console.log('1. 📬 Check app@compassionatecaretransportation.com inbox');
    console.log('2. 📊 Visit https://sendpulse.com/statistics for delivery stats');
    console.log('3. 🚀 Deploy with same credentials to production');
    console.log('4. 📱 Test a real booking to confirm notifications\n');

    console.log('SendPulse Advantages:');
    console.log('✨ 15,000 emails/month FREE (vs 100/day elsewhere)');
    console.log('⚡ Simple setup - just username/password');
    console.log('📊 Rich dashboard with real-time stats');
    console.log('🎯 Excellent deliverability rates\n');

  } catch (error) {
    console.error('❌ Failed to send test email:', error.message);
    console.log('\nTroubleshooting SendPulse issues:');
    console.log('1. Verify credentials at https://sendpulse.com/settings/smtp');
    console.log('2. Check if your SendPulse account is verified');
    console.log('3. Ensure you haven\'t exceeded daily/monthly limits');
    console.log('4. Try logging into SendPulse dashboard to check account status');
    process.exit(1);
  }
}

// Run test
testSendPulse().catch(console.error);