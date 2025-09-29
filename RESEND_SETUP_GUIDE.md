# Resend Email Setup for Facility App

This guide will help you configure Resend to send trip booking notifications to `app@compassionatecaretransportation.com`.

## Prerequisites

✅ compassionatecaretransportation.com domain is already verified in Resend

## Setup Steps

### 1. Get Your Resend API Key

1. Log in to your Resend account at https://resend.com
2. Go to **API Keys** in the sidebar
3. Click **"Create API Key"**
4. Give it a name like "Facility App Production" or "Facility App Development"
5. Select permissions:
   - **Sending Access**: Full Access
   - **Domain Access**: compassionatecaretransportation.com (or All Domains)
6. Click **Create**
7. Copy the API key (starts with `re_`)

⚠️ **Important**: Save this API key securely. You won't be able to see it again!

### 2. Configure the Facility App

Create or update `.env.local` in the facility_app directory:

```env
# Resend Configuration
RESEND_API_KEY=re_YOUR_API_KEY_HERE
EMAIL_FROM=Compassionate Care Transportation <app@compassionatecaretransportation.com>

# Your existing configuration...
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### 3. Test the Configuration

Run the test script to verify everything works:

```bash
cd facility_app
npm install
node test-email-provider.js
```

You should see:
```
✅ Resend: Configured
🚀 Using Resend for email delivery
✅ Test email sent successfully!
```

### 4. Verify Email Delivery

1. Check the inbox for `app@compassionatecaretransportation.com`
2. Look for an email with subject: "TEST: Facility App Email Configuration - Resend"
3. If not in inbox, check spam/junk folder

### 5. Check Resend Dashboard

1. Go to https://resend.com/emails
2. You should see the test email in the logs
3. Check the status (delivered, bounced, etc.)

## How It Works

When a trip is booked in the facility app:

1. **User books a trip** through the facility booking form
2. **System creates trip** in the database
3. **Notification triggered** to `/api/trips/notify-dispatchers`
4. **Email sent via Resend** to `app@compassionatecaretransportation.com`
5. **Email includes**:
   - Trip ID and status
   - Client information
   - Pickup/destination addresses
   - Scheduled time
   - Distance and pricing
   - Special requirements

## Production Deployment

### For Vercel

1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add:
   - `RESEND_API_KEY` = your Resend API key
   - `EMAIL_FROM` = `Compassionate Care Transportation <app@compassionatecaretransportation.com>`

### For Other Platforms

Set the same environment variables in your hosting platform's configuration.

## Monitoring & Logs

### Resend Dashboard
- **Activity**: https://resend.com/emails - See all sent emails
- **Analytics**: https://resend.com/analytics - View delivery rates
- **Domains**: https://resend.com/domains - Check domain status

### Application Logs
The facility app logs email activity:
- Success: "✅ Email sent successfully"
- Failure: "❌ Error sending email: [error message]"

## Troubleshooting

### Email not sending?

1. **Check API Key**:
   - Ensure it starts with `re_`
   - No extra spaces or characters
   - Has sending permissions

2. **Check Resend Dashboard**:
   - Look for the email in https://resend.com/emails
   - Check for bounce or error messages

3. **Verify Domain**:
   - Ensure compassionatecaretransportation.com is verified
   - Check DNS records are properly configured

### Email going to spam?

1. **SPF Records**: Should be configured for compassionatecaretransportation.com
2. **DKIM**: Should be enabled in Resend domain settings
3. **From Address**: Use a legitimate address from the verified domain

### Rate Limits

- **Free Plan**: 100 emails/day, 3,000 emails/month
- **Pro Plan**: 50,000 emails/month
- Check current usage at https://resend.com/settings/usage

## Email Templates

The notification email includes:

```
Subject: New Trip Request: [TRIP-ID]

Content:
- Trip Details (ID, status)
- Client Information (name, email, phone)
- Location Details (pickup, destination)
- Timing (scheduled pickup time)
- Trip Requirements (wheelchair, round trip)
- Pricing (distance, estimated cost)
- Special Instructions
```

## Security Best Practices

1. **Never commit** `.env.local` to version control
2. **Use different API keys** for development and production
3. **Restrict API key permissions** to only what's needed
4. **Rotate keys periodically** for security
5. **Monitor usage** for unusual activity

## Support

- **Resend Documentation**: https://resend.com/docs
- **Resend Support**: support@resend.com
- **API Status**: https://status.resend.com

## Next Steps

1. ✅ Configure Resend API key in `.env.local`
2. ✅ Test with `node test-email-provider.js`
3. ✅ Deploy to production with environment variables
4. ✅ Test a real booking to confirm emails are sent
5. ✅ Monitor email delivery in Resend dashboard