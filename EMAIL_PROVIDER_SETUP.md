# Email Provider Setup for Facility App

Since Google App Passwords are not available for your account, this guide provides multiple email provider options to send notifications to `app@compassionatecaretransportation.com`.

## Quick Start - Recommended Options

### Option 1: Resend (Easiest Setup)

1. **Sign up for Resend** at https://resend.com (free tier available)
2. **Get your API key** from the dashboard
3. **Add domain verification** (optional but recommended)
4. **Update `.env.local`:**
   ```env
   RESEND_API_KEY=re_123456789_abcdefghijklmnop
   EMAIL_FROM=Compassionate Care Transportation <onboarding@resend.dev>
   ```

### Option 2: SendGrid (Enterprise-Grade)

1. **Sign up for SendGrid** at https://sendgrid.com
2. **Create an API key** in Settings → API Keys
3. **Verify your sender** in Settings → Sender Authentication
4. **Update `.env.local`:**
   ```env
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
   EMAIL_FROM=Compassionate Care Transportation <app@compassionatecaretransportation.com>
   ```

### Option 3: Brevo (Free Tier)

1. **Sign up for Brevo** at https://www.brevo.com (formerly Sendinblue)
2. **Get SMTP credentials** from SMTP & API section
3. **Update `.env.local`:**
   ```env
   BREVO_LOGIN=your-email@example.com
   BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxx
   EMAIL_FROM=Compassionate Care Transportation <app@compassionatecaretransportation.com>
   ```

## Advanced Options

### Option 4: Google OAuth2 (For Google Workspace)

This is more complex but works with Google accounts that don't support App Passwords:

1. **Go to Google Cloud Console**: https://console.cloud.google.com
2. **Create a new project** or select existing
3. **Enable Gmail API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Gmail API"
   - Click "Enable"
4. **Create OAuth2 credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Add redirect URI: `https://developers.google.com/oauthplayground`
5. **Get refresh token**:
   - Go to https://developers.google.com/oauthplayground
   - Click settings (gear icon) → Use your own OAuth credentials
   - Enter your Client ID and Client Secret
   - Select Gmail API v1 scope: `https://mail.google.com/`
   - Authorize and get refresh token
6. **Update `.env.local`:**
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REFRESH_TOKEN=your-refresh-token
   SMTP_USER=app@compassionatecaretransportation.com
   EMAIL_FROM=Compassionate Care Transportation <app@compassionatecaretransportation.com>
   ```

### Option 5: Alternative SMTP Server

If you have access to another email server:

```env
SMTP_HOST=mail.your-server.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@your-domain.com
SMTP_PASSWORD=your-password
EMAIL_FROM=Compassionate Care Transportation <app@compassionatecaretransportation.com>
```

## Testing Your Configuration

After setting up any provider, test it:

```bash
cd facility_app
npm install
node test-email-provider.js
```

## How It Works

The email system automatically detects which provider is configured based on environment variables:

1. **Priority Order**:
   - Resend (if `RESEND_API_KEY` is set)
   - SendGrid (if `SENDGRID_API_KEY` is set)
   - Brevo (if `BREVO_API_KEY` is set)
   - Google OAuth2 (if Google credentials are set)
   - Standard SMTP (if SMTP credentials are set)

2. **Automatic Fallback**:
   - In development without any provider, emails are logged to console
   - In production, an error is thrown if no provider is configured

## Provider Comparison

| Provider | Setup Difficulty | Free Tier | Reliability | Best For |
|----------|-----------------|-----------|-------------|----------|
| Resend | ⭐ Easy | 100/day | High | Developers, startups |
| SendGrid | ⭐⭐ Moderate | 100/day | Very High | Enterprise |
| Brevo | ⭐⭐ Moderate | 300/day | High | Small business |
| Google OAuth2 | ⭐⭐⭐ Complex | Unlimited* | High | Google Workspace users |
| SMTP | ⭐ Easy | Varies | Varies | Existing email servers |

*Within Google Workspace limits

## Troubleshooting

### Emails not sending?
1. Check environment variables are set correctly
2. Run the test script to diagnose issues
3. Check provider-specific logs/dashboard

### Getting authentication errors?
1. Verify API keys are correct
2. Check sender verification (SendGrid/Brevo)
3. Ensure OAuth tokens are valid (Google)

### Emails going to spam?
1. Verify sender domain (SPF, DKIM records)
2. Use a verified sender address
3. Consider using a dedicated IP (SendGrid)

## Next Steps

1. Choose a provider based on your needs
2. Set up the provider and get credentials
3. Update `.env.local` with the credentials
4. Test with the provided script
5. Deploy to production with same environment variables