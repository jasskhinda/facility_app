# Facility App Email Setup Guide

## Overview
The facility app has been configured to send email notifications to `app@compassionatecaretransportation.com` whenever a new trip is booked. This ensures all booking notifications are centralized to a single email address.

## Changes Made

### 1. Updated Email Recipients
- **File**: `lib/notifications.js`
- **Change**: Modified to send emails directly to `app@compassionatecaretransportation.com` instead of fetching dispatcher emails from the database
- **Line 30**: Hard-coded the notification email address

### 2. Configured Google SMTP
- **File**: `lib/email.js`
- **Changes**:
  - Set default SMTP host to `smtp.gmail.com`
  - Set default SMTP user to `app@compassionatecaretransportation.com`
  - Updated from address to use Compassionate Care Transportation branding

## Setup Instructions

### Step 1: Create Google App Password

1. Sign in to the Google account for `app@compassionatecaretransportation.com`
2. Go to [Google Account Security](https://myaccount.google.com/security)
3. Enable 2-Factor Authentication if not already enabled
4. Go to [App Passwords](https://myaccount.google.com/apppasswords)
5. Select "Mail" as the app type
6. Generate a 16-character app password (e.g., `abcd efgh ijkl mnop`)
7. Copy this password (you'll need it for the next step)

### Step 2: Configure Environment Variables

Create or update the `.env.local` file in the facility_app directory with:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=app@compassionatecaretransportation.com
SMTP_PASSWORD=your_google_app_password_here  # Remove spaces from the app password
EMAIL_FROM=Compassionate Care Transportation <app@compassionatecaretransportation.com>

# Other existing variables...
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
STRIPE_SECRET_KEY=your_stripe_secret_key
# etc...
```

**Important**: Remove spaces from the Google App Password. For example:
- Google shows: `abcd efgh ijkl mnop`
- You should enter: `abcdefghijklmnop`

### Step 3: Test the Configuration

Run the test script to verify email sending works:

```bash
cd facility_app
npm install nodemailer dotenv  # If not already installed
node test-email-facility.js
```

This will:
1. Check your environment variables
2. Test the SMTP connection
3. Send a test email to `app@compassionatecaretransportation.com`

### Step 4: Deploy the Changes

1. Commit the changes to your repository:
```bash
git add -A
git commit -m "Configure email notifications to app@compassionatecaretransportation.com"
git push origin main
```

2. Update environment variables on your hosting platform (Vercel, etc.) with the same values from `.env.local`

## How It Works

When a trip is booked through the facility app:

1. The booking form creates a new trip in the database
2. The system calls `/api/trips/notify-dispatchers` endpoint
3. Instead of querying dispatchers, the system sends email directly to `app@compassionatecaretransportation.com`
4. The email includes all trip details:
   - Trip ID
   - Client information
   - Pickup/dropoff locations
   - Scheduled time
   - Special requirements
   - Pricing information

## Email Content Example

Subject: `New Trip Request: TRIP-123456`

The email includes:
- Trip ID and status
- Client name and contact
- Pickup and destination addresses
- Scheduled pickup time
- Trip requirements (wheelchair, round trip, etc.)
- Distance and estimated price
- Special requirements/notes
- Link to dispatcher portal

## Troubleshooting

### SMTP Connection Failed
- Ensure 2-Factor Authentication is enabled on the Google account
- Use the App Password, not the regular account password
- Check that the password has no spaces

### Emails Not Sending
- Verify all environment variables are set correctly
- Check the facility app logs for error messages
- Run the test script to diagnose issues

### Test Email Not Received
- Check spam/junk folder
- Verify `app@compassionatecaretransportation.com` exists and is accessible
- Check Google account for any security alerts

## Security Notes

- Never commit `.env.local` to version control
- App Passwords are more secure than regular passwords for SMTP
- Consider rotating the App Password periodically
- The App Password only allows sending emails, not reading them

## Support

For issues or questions:
1. Check the test script output for detailed error messages
2. Review the facility app logs
3. Verify all environment variables are correctly set
4. Ensure the Google account has proper permissions