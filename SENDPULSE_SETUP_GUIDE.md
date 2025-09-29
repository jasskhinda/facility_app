# SendPulse Email Setup for Facility App

SendPulse offers an excellent free tier (15,000 emails/month) and is very easy to set up. This guide shows you how to configure SendPulse for sending trip notifications to `app@compassionatecaretransportation.com`.

## Why SendPulse?

✅ **Generous Free Tier**: 15,000 emails/month (vs 100/day with others)
✅ **Easy Setup**: Just username/password, no complex API keys
✅ **Good Deliverability**: Established email service provider
✅ **Multiple Channels**: Email, SMS, web push (if needed later)

## Setup Steps

### 1. Create SendPulse Account

1. Go to https://sendpulse.com
2. Click **"Start for Free"**
3. Sign up with your email
4. Choose **"Email"** as your primary service
5. Complete account verification

### 2. Get SMTP Credentials

1. **Log in** to your SendPulse dashboard
2. Go to **"Settings"** → **"SMTP"**
3. You'll see your SMTP credentials:
   - **SMTP Server**: `smtp-pulse.com`
   - **Port**: `587`
   - **Username**: Your SendPulse email
   - **Password**: Your SendPulse password

### 3. Verify Domain (Optional but Recommended)

1. In SendPulse dashboard, go to **"Settings"** → **"Sender Addresses"**
2. Add `app@compassionatecaretransportation.com`
3. Follow verification steps (check email, add DNS records)
4. This improves deliverability and removes "via sendpulse.com" from emails

### 4. Configure Facility App

Create or update `.env.local` in the facility_app directory:

```env
# SendPulse Configuration
SENDPULSE_USER=your-sendpulse-email@example.com
SENDPULSE_PASSWORD=your-sendpulse-password
EMAIL_FROM=Compassionate Care Transportation <app@compassionatecaretransportation.com>

# Your existing configuration...
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### 5. Test the Configuration

Run the test script:

```bash
cd facility_app
npm install
node test-email-provider.js
```

You should see:
```
✅ SendPulse: Configured
🚀 Using SendPulse for email delivery
✅ Test email sent successfully!
```

### 6. Check Email Delivery

1. Check `app@compassionatecaretransportation.com` inbox
2. Look for test email from SendPulse
3. In SendPulse dashboard, go to **"Statistics"** to see delivery status

## SendPulse Dashboard Overview

### Key Sections:
- **Statistics**: View sent emails, delivery rates, opens, clicks
- **Templates**: Create reusable email templates (optional)
- **Settings → SMTP**: Your SMTP credentials
- **Settings → Sender Addresses**: Verify your domain
- **Blacklist**: Manage bounced/unsubscribed emails

### Monitoring:
- **Real-time stats** on email delivery
- **Bounce handling** for invalid addresses
- **Delivery reports** with detailed analytics

## Pricing Tiers

| Plan | Monthly Emails | Price | Best For |
|------|---------------|-------|-----------|
| **Free** | 15,000 | $0 | Small facilities |
| **Standard** | 100,000 | $8 | Medium facilities |
| **Pro** | 500,000 | $32 | Large operations |

The free tier should be more than enough for most facility operations.

## How It Works with Facility App

1. **Trip Booking**: User books a trip through facility app
2. **Database**: Trip saved to Supabase database
3. **Notification**: System calls `/api/trips/notify-dispatchers`
4. **SendPulse**: Email sent via SMTP to `app@compassionatecaretransportation.com`
5. **Tracking**: Delivery tracked in SendPulse dashboard

## Email Content

Each notification includes:
- **Trip Details**: ID, status, client info
- **Locations**: Pickup and destination addresses
- **Timing**: Scheduled pickup time
- **Requirements**: Wheelchair, round trip, special needs
- **Pricing**: Distance and estimated cost

## Troubleshooting

### Authentication Errors
- Double-check username (your SendPulse account email)
- Verify password (case-sensitive)
- Ensure account is verified

### Emails Not Delivered
- Check **Statistics** in SendPulse dashboard
- Look for bounces or blocks
- Verify sender address if using custom domain

### Rate Limits
- Free tier: 15,000/month, max 12,000/day
- Paid plans have higher limits
- Check usage in **Statistics** section

## Security Best Practices

1. **Use App Password**: Consider creating app-specific password in SendPulse
2. **Environment Variables**: Never commit credentials to code
3. **Monitor Usage**: Watch for unusual sending patterns
4. **Domain Verification**: Improves security and deliverability

## Advanced Features (Optional)

### Email Templates
Create reusable templates in SendPulse for consistent branding:
1. Go to **"Email"** → **"Templates"**
2. Create template with your branding
3. Use template ID in API calls (requires API integration)

### Automation
Set up automated follow-ups:
1. **"Automation 360"** in SendPulse
2. Trigger follow-ups based on email opens/clicks
3. Useful for trip confirmations or surveys

## Production Deployment

### Environment Variables
Set in your hosting platform:
```env
SENDPULSE_USER=your-account@example.com
SENDPULSE_PASSWORD=your-password
EMAIL_FROM=Compassionate Care Transportation <app@compassionatecaretransportation.com>
```

### Monitoring
- Check SendPulse **Statistics** regularly
- Set up alerts for high bounce rates
- Monitor monthly usage limits

## Comparison with Other Providers

| Feature | SendPulse | Resend | SendGrid |
|---------|-----------|---------|-----------|
| Free Emails | 15,000/month | 100/day | 100/day |
| Setup Difficulty | ⭐ Easy | ⭐ Easy | ⭐⭐ Medium |
| API Required | No | Yes | Yes |
| Domain Verification | Optional | Recommended | Required |
| Dashboard | ⭐⭐⭐ Rich | ⭐⭐ Simple | ⭐⭐⭐ Advanced |

## Support

- **SendPulse Help**: https://sendpulse.com/support
- **Documentation**: https://sendpulse.com/integrations
- **Live Chat**: Available in dashboard
- **Email Support**: support@sendpulse.com

## Next Steps

1. ✅ Sign up for SendPulse account
2. ✅ Get SMTP credentials from Settings → SMTP
3. ✅ Configure `.env.local` with credentials
4. ✅ Test with `node test-email-provider.js`
5. ✅ Deploy to production
6. ✅ Monitor delivery in SendPulse dashboard

SendPulse is an excellent choice for the facility app due to its generous free tier and simple setup!