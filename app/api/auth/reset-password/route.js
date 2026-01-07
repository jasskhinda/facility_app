import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Import the email provider library that supports SendPulse, Resend, etc.
const { createTransporter } = require('@/lib/email-providers');

// Create Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();

    if (userError) {
      console.error('Error listing users:', userError);
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        message: 'If an account exists with this email, a password reset link will be sent.'
      });
    }

    const user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      // Don't reveal if user exists or not
      return NextResponse.json({
        message: 'If an account exists with this email, a password reset link will be sent.'
      });
    }

    // Generate a secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now

    // Store the reset token in user metadata
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          reset_token: resetToken,
          reset_token_expiry: resetTokenExpiry,
        },
      }
    );

    if (updateError) {
      console.error('Error storing reset token:', updateError);
      return NextResponse.json(
        { error: 'Failed to generate reset link' },
        { status: 500 }
      );
    }

    // Generate reset link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://facility.compassionatecaretransportation.com';
    const resetLink = `${appUrl}/update-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Send email via configured provider (SendPulse, Resend, etc.)
    const transporter = await createTransporter();
    const fromEmail = process.env.EMAIL_FROM || 'Compassionate Care Transportation <noreply@compassionatecaretransportation.com>';

    const mailOptions = {
      from: fromEmail,
      to: email,
      subject: 'Reset Your Password - Compassionate Care Transportation',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #7CCFD0 0%, #5bbcbe 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">Password Reset Request</h1>
            </div>
            <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>

              <p style="font-size: 16px; margin-bottom: 20px;">
                We received a request to reset the password for your Compassionate Care Transportation facility account.
              </p>

              <p style="font-size: 16px; margin-bottom: 25px;">
                Click the button below to reset your password. This link will expire in <strong>1 hour</strong>.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}"
                   style="display: inline-block; background: linear-gradient(135deg, #7CCFD0 0%, #5bbcbe 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Reset Password
                </a>
              </div>

              <p style="font-size: 14px; color: #666; margin-top: 25px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="font-size: 12px; word-break: break-all; color: #7CCFD0; background: #f5f5f5; padding: 10px; border-radius: 4px;">
                ${resetLink}
              </p>

              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">

              <p style="font-size: 14px; color: #666;">
                If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>

              <p style="font-size: 14px; color: #666; margin-top: 20px;">
                Best regards,<br>
                Compassionate Care Transportation Team
              </p>
            </div>
            <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
              <p>&copy; ${new Date().getFullYear()} Compassionate Care Transportation. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Password Reset Request

Hello,

We received a request to reset the password for your Compassionate Care Transportation facility account.

Click the link below to reset your password (expires in 1 hour):
${resetLink}

If you didn't request this password reset, you can safely ignore this email.

Best regards,
Compassionate Care Transportation Team
      `,
    };

    await transporter.sendMail(mailOptions);

    console.log('Password reset email sent to:', email);

    return NextResponse.json({
      message: 'If an account exists with this email, a password reset link will be sent.'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}
