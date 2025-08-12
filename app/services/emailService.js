// Email service for sending facility user invitations
// This is a placeholder implementation - integrate with your preferred email service

export class EmailService {
  static async sendFacilityInvitation({
    recipientEmail,
    recipientName,
    facilityName,
    inviterName,
    role,
    invitationLink
  }) {
    try {
      // In a real implementation, you would use services like:
      // - SendGrid
      // - AWS SES
      // - Resend
      // - Nodemailer with SMTP
      
      const emailData = {
        to: recipientEmail,
        subject: `Invitation to join ${facilityName} transportation system`,
        html: this.generateInvitationHTML({
          recipientName,
          facilityName,
          inviterName,
          role,
          invitationLink
        })
      };

      // Placeholder - replace with actual email service
      console.log('Would send email:', emailData);
      
      // For development, you might want to log the invitation link
      console.log('Invitation link:', invitationLink);
      
      return { success: true, messageId: 'placeholder-id' };
    } catch (error) {
      console.error('Error sending invitation email:', error);
      return { success: false, error: error.message };
    }
  }

  static generateInvitationHTML({
    recipientName,
    facilityName,
    inviterName,
    role,
    invitationLink
  }) {
    const roleDisplayName = role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Facility Invitation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #7CCFD0; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #7CCFD0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          .role-badge { background: #e3f2fd; color: #1976d2; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚐 Transportation System Invitation</h1>
          </div>
          <div class="content">
            <h2>Hello ${recipientName}!</h2>
            
            <p>You've been invited by <strong>${inviterName}</strong> to join the transportation management system for <strong>${facilityName}</strong>.</p>
            
            <p>Your assigned role: <span class="role-badge">${roleDisplayName}</span></p>
            
            <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <h3>What you can do as a ${roleDisplayName}:</h3>
              ${this.getRoleDescription(role)}
            </div>
            
            <p>Click the button below to accept your invitation and set up your account:</p>
            
            <a href="${invitationLink}" class="button">Accept Invitation & Sign Up</a>
            
            <p><small>If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${invitationLink}">${invitationLink}</a></small></p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <p><strong>Need help?</strong> Contact your facility administrator or our support team.</p>
          </div>
          <div class="footer">
            <p>This invitation was sent to ${recipientEmail}. If you weren't expecting this invitation, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  static getRoleDescription(role) {
    switch (role) {
      case 'super_admin':
        return `
          <ul>
            <li>✅ Manage all facility users and permissions</li>
            <li>✅ Book and manage transportation requests</li>
            <li>✅ Add and manage clients</li>
            <li>✅ View and upload contracts</li>
            <li>✅ Access billing and payment information</li>
            <li>✅ Full administrative access</li>
          </ul>
        `;
      case 'admin':
        return `
          <ul>
            <li>✅ Add and manage scheduler users</li>
            <li>✅ Book and manage transportation requests</li>
            <li>✅ Add and manage clients</li>
            <li>✅ View and upload contracts</li>
            <li>✅ Access billing and payment information</li>
            <li>❌ Cannot manage other admin users</li>
          </ul>
        `;
      case 'scheduler':
        return `
          <ul>
            <li>✅ Book transportation requests for clients</li>
            <li>✅ Add and manage client information</li>
            <li>✅ View facility contracts and pricing</li>
            <li>✅ Track trip status and updates</li>
            <li>❌ Cannot manage other users</li>
            <li>❌ Limited access to billing information</li>
          </ul>
        `;
      default:
        return '<p>Contact your administrator for role details.</p>';
    }
  }

  static async sendPasswordResetEmail({ recipientEmail, resetLink }) {
    try {
      const emailData = {
        to: recipientEmail,
        subject: 'Reset your transportation system password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>You requested a password reset for your transportation system account.</p>
            <p>Click the link below to reset your password:</p>
            <a href="${resetLink}" style="background: #7CCFD0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Reset Password</a>
            <p><small>If you didn't request this reset, you can safely ignore this email.</small></p>
          </div>
        `
      };

      console.log('Would send password reset email:', emailData);
      return { success: true, messageId: 'placeholder-reset-id' };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return { success: false, error: error.message };
    }
  }
}