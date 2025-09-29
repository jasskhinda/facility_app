#!/usr/bin/env node

/**
 * Test Email Provider Configuration
 * This script tests whichever email provider is configured
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

// Import the email providers
import { createTransporter } from './lib/email-providers.js';

async function testEmailProvider() {
  console.log('📧 Testing Email Provider Configuration\n');
  console.log('='.repeat(50));

  // Check which provider is configured
  console.log('🔍 Checking configured providers:\n');

  const providers = [
    { name: 'Resend', check: !!process.env.RESEND_API_KEY },
    { name: 'SendGrid', check: !!process.env.SENDGRID_API_KEY },
    { name: 'Brevo', check: !!(process.env.BREVO_API_KEY && process.env.BREVO_LOGIN) },
    {
      name: 'Google OAuth2',
      check: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN)
    },
    {
      name: 'Standard SMTP',
      check: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)
    }
  ];

  const configuredProvider = providers.find(p => p.check);

  providers.forEach(provider => {
    if (provider.check) {
      console.log(`✅ ${provider.name}: Configured`);
    } else {
      console.log(`⚪ ${provider.name}: Not configured`);
    }
  });

  console.log('\n' + '='.repeat(50));

  if (!configuredProvider) {
    console.error('\n❌ No email provider configured!');
    console.log('\nPlease configure one of the following providers in .env.local:');
    console.log('\n1. Resend (Easiest):');
    console.log('   RESEND_API_KEY=your_api_key');
    console.log('\n2. SendGrid:');
    console.log('   SENDGRID_API_KEY=your_api_key');
    console.log('\n3. Brevo:');
    console.log('   BREVO_LOGIN=your_email');
    console.log('   BREVO_API_KEY=your_api_key');
    console.log('\nSee EMAIL_PROVIDER_SETUP.md for detailed instructions.');
    process.exit(1);
  }

  console.log(`\n🚀 Using ${configuredProvider.name} for email delivery\n`);

  try {
    // Create the transporter
    console.log('📬 Creating email transporter...');
    const transporter = await createTransporter();

    // Verify connection (if supported by provider)
    if (transporter.verify) {
      console.log('🔌 Verifying connection...');
      await transporter.verify();
      console.log('✅ Connection verified!');
    } else {
      console.log('ℹ️  Provider does not support connection verification');
    }

    // Prepare test email
    const testTripData = {
      id: 'TEST-' + Date.now(),
      pickup_address: '123 Main St, San Francisco, CA 94122',
      destination_address: '456 Market St, San Francisco, CA 94102',
      pickup_time: new Date(Date.now() + 86400000), // Tomorrow
      client_name: 'Test Client',
      client_phone: '(555) 123-4567',
      distance: '5.2',
      price: '65.00',
    };

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
          🧪 Test Email - Facility App
        </h1>

        <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <strong>⚠️ TEST EMAIL</strong><br>
          This is a test email from the facility app email configuration.<br>
          Provider: <strong>${configuredProvider.name}</strong>
        </div>

        <h2 style="color: #1f2937; margin-top: 30px;">Sample Trip Notification</h2>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0;"><strong>Trip ID:</strong></td>
              <td>${testTripData.id}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Client:</strong></td>
              <td>${testTripData.client_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Phone:</strong></td>
              <td>${testTripData.client_phone}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Pickup:</strong></td>
              <td>${testTripData.pickup_address}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Destination:</strong></td>
              <td>${testTripData.destination_address}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Time:</strong></td>
              <td>${testTripData.pickup_time.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Distance:</strong></td>
              <td>${testTripData.distance} miles</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Price:</strong></td>
              <td>$${testTripData.price}</td>
            </tr>
          </table>
        </div>

        <div style="margin-top: 30px; padding: 20px; background: #e0f2fe; border-radius: 8px;">
          <h3 style="margin-top: 0; color: #0369a1;">✅ Configuration Successful!</h3>
          <p>Your email provider (${configuredProvider.name}) is properly configured.</p>
          <p>All trip notifications will be sent to: <strong>app@compassionatecaretransportation.com</strong></p>
        </div>

        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p>Test performed at: ${new Date().toLocaleString()}</p>
          <p>Provider: ${configuredProvider.name}</p>
          <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
        </div>
      </div>
    `;

    const emailText = `
TEST EMAIL - Facility App

This is a test email from the facility app email configuration.
Provider: ${configuredProvider.name}

Sample Trip Notification:
- Trip ID: ${testTripData.id}
- Client: ${testTripData.client_name}
- Phone: ${testTripData.client_phone}
- Pickup: ${testTripData.pickup_address}
- Destination: ${testTripData.destination_address}
- Time: ${testTripData.pickup_time.toLocaleString()}
- Distance: ${testTripData.distance} miles
- Price: $${testTripData.price}

Configuration Successful!
Your email provider (${configuredProvider.name}) is properly configured.
All trip notifications will be sent to: app@compassionatecaretransportation.com

Test performed at: ${new Date().toLocaleString()}
    `.trim();

    // Send test email
    console.log('\n📮 Sending test email to app@compassionatecaretransportation.com...\n');

    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Compassionate Care Transportation <noreply@example.com>',
      to: 'app@compassionatecaretransportation.com',
      subject: `TEST: Facility App Email Configuration - ${configuredProvider.name}`,
      text: emailText,
      html: emailHtml,
    });

    console.log('✅ Test email sent successfully!');
    console.log('📬 Message ID:', result.messageId || 'N/A');
    if (result.response) {
      console.log('📨 Response:', result.response);
    }

    console.log('\n' + '='.repeat(50));
    console.log('\n🎉 SUCCESS! Email configuration is working!\n');
    console.log('Next steps:');
    console.log('1. Check app@compassionatecaretransportation.com inbox');
    console.log('2. Verify the test email arrived');
    console.log('3. Deploy these changes to production');
    console.log('4. Set the same environment variables in production\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\nTroubleshooting tips for', configuredProvider.name + ':');

    if (configuredProvider.name === 'Resend') {
      console.log('1. Verify your API key is correct');
      console.log('2. Check if your domain is verified (if using custom domain)');
      console.log('3. Visit https://resend.com/emails to see email logs');
    } else if (configuredProvider.name === 'SendGrid') {
      console.log('1. Verify your API key has full access permissions');
      console.log('2. Check sender authentication in SendGrid dashboard');
      console.log('3. Visit SendGrid Activity Feed for detailed logs');
    } else if (configuredProvider.name === 'Brevo') {
      console.log('1. Verify your SMTP key is correct');
      console.log('2. Check that your sender is verified');
      console.log('3. Visit Brevo dashboard for email logs');
    }

    process.exit(1);
  }
}

// Run the test
testEmailProvider().catch(console.error);