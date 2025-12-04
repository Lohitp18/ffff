const nodemailer = require('nodemailer');

/**
 * Creates and returns a configured Nodemailer transporter for Brevo SMTP
 * @returns {Object} Nodemailer transporter instance
 */
const createTransporter = () => {
  // Validate required environment variables
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP credentials are not configured. Please set SMTP_USER and SMTP_PASS environment variables.');
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false, // true for 465, false for other ports
    requireTLS: true, // Force TLS for secure connection
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      // Do not fail on invalid certs (useful for development)
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });
};

/**
 * Sends an approval email to a user after their account is approved
 * @param {string} userEmail - The recipient's email address
 * @param {string} userName - The recipient's name
 * @returns {Promise<Object>} Result object with success status and messageId or error
 */
const sendApprovalEmail = async (userEmail, userName) => {
  try {
    // Validate inputs
    if (!userEmail || !userEmail.includes('@')) {
      throw new Error('Invalid email address provided');
    }

    // Validate SMTP configuration
    if (!process.env.SMTP_FROM && !process.env.SMTP_USER) {
      throw new Error('SMTP_FROM or SMTP_USER environment variable is required');
    }

    const transporter = createTransporter();

    // Use SMTP_FROM if provided, otherwise fall back to SMTP_USER
    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const mailOptions = {
      from: `"Alumni Portal" <${fromEmail}>`,
      to: userEmail,
      subject: 'Welcome! Your Account Has Been Approved',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Approved</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #0a66c2; margin: 0; font-size: 28px;">🎉 Account Approved!</h1>
            </div>
            
            <div style="margin-bottom: 25px;">
              <p style="font-size: 16px; margin-bottom: 15px;">Dear ${userName || 'Alumni'},</p>
              
              <p style="font-size: 16px; margin-bottom: 15px;">
                We are pleased to inform you that your account registration has been <strong style="color: #0a66c2;">approved</strong> by our administration team.
              </p>
              
              <p style="font-size: 16px; margin-bottom: 15px;">
                You can now access all features of the Alumni Portal, including:
              </p>
              
              <ul style="font-size: 16px; margin-bottom: 20px; padding-left: 25px;">
                <li style="margin-bottom: 10px;">Connect with fellow alumni</li>
                <li style="margin-bottom: 10px;">Browse and apply for job opportunities</li>
                <li style="margin-bottom: 10px;">Discover and attend alumni events</li>
                <li style="margin-bottom: 10px;">Share posts and updates</li>
                <li style="margin-bottom: 10px;">Explore institution updates</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${frontendUrl}/signin" 
                   style="display: inline-block; background-color: #0a66c2; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 24px; font-weight: 600; font-size: 16px;">
                  Sign In to Your Account
                </a>
              </div>
              
              <p style="font-size: 16px; margin-bottom: 15px;">
                If you have any questions or need assistance, please don't hesitate to contact our support team.
              </p>
              
              <p style="font-size: 16px; margin-top: 25px;">
                Best regards,<br>
                <strong>The Alumni Portal Team</strong>
              </p>
            </div>
            
            <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
              <p style="margin: 0;">This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Account Approved - Alumni Portal
        
        Dear ${userName || 'Alumni'},
        
        We are pleased to inform you that your account registration has been approved by our administration team.
        
        You can now access all features of the Alumni Portal, including:
        - Connect with fellow alumni
        - Browse and apply for job opportunities
        - Discover and attend alumni events
        - Share posts and updates
        - Explore institution updates
        
        Sign in to your account: ${frontendUrl}/signin
        
        If you have any questions or need assistance, please don't hesitate to contact our support team.
        
        Best regards,
        The Alumni Portal Team
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error) {
    console.error('Error sending approval email:', error);
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
};

/**
 * Sends a rejection email to a user after their account is rejected
 * @param {string} userEmail - The recipient's email address
 * @param {string} userName - The recipient's name
 * @returns {Promise<Object>} Result object with success status and messageId or error
 */
const sendRejectionEmail = async (userEmail, userName) => {
  try {
    // Validate inputs
    if (!userEmail || !userEmail.includes('@')) {
      throw new Error('Invalid email address provided');
    }

    // Validate SMTP configuration
    if (!process.env.SMTP_FROM && !process.env.SMTP_USER) {
      throw new Error('SMTP_FROM or SMTP_USER environment variable is required');
    }

    const transporter = createTransporter();

    // Use SMTP_FROM if provided, otherwise fall back to SMTP_USER
    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;

    const mailOptions = {
      from: `"Alumni Portal" <${fromEmail}>`,
      to: userEmail,
      subject: 'Account Registration Status Update',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Registration Update</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #d32f2f; margin: 0; font-size: 28px;">Account Registration Update</h1>
            </div>
            
            <div style="margin-bottom: 25px;">
              <p style="font-size: 16px; margin-bottom: 15px;">Dear ${userName || 'User'},</p>
              
              <p style="font-size: 16px; margin-bottom: 15px;">
                We regret to inform you that your account registration for the Alumni Portal has been <strong style="color: #d32f2f;">rejected</strong> by our administration team.
              </p>
              
              <p style="font-size: 16px; margin-bottom: 15px;">
                This decision may have been made due to incomplete information, verification issues, or other administrative reasons.
              </p>
              
              <p style="font-size: 16px; margin-bottom: 15px;">
                If you believe this is an error or would like to appeal this decision, please contact our support team for further assistance.
              </p>
              
              <p style="font-size: 16px; margin-bottom: 15px;">
                We appreciate your interest in joining the Alumni Portal and encourage you to reach out if you have any questions.
              </p>
              
              <p style="font-size: 16px; margin-top: 25px;">
                Best regards,<br>
                <strong>The Alumni Portal Team</strong>
              </p>
            </div>
            
            <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
              <p style="margin: 0;">This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Account Registration Update - Alumni Portal
        
        Dear ${userName || 'User'},
        
        We regret to inform you that your account registration for the Alumni Portal has been rejected by our administration team.
        
        This decision may have been made due to incomplete information, verification issues, or other administrative reasons.
        
        If you believe this is an error or would like to appeal this decision, please contact our support team for further assistance.
        
        We appreciate your interest in joining the Alumni Portal and encourage you to reach out if you have any questions.
        
        Best regards,
        The Alumni Portal Team
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error) {
    console.error('Error sending rejection email:', error);
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
};

module.exports = {
  sendApprovalEmail,
  sendRejectionEmail,
};
