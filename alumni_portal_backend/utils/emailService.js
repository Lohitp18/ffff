const nodemailer = require('nodemailer');
const messageTemplates = require('./messageTemplates');

/**
 * Checks if email service is configured (Google OAuth2 or SMTP)
 */
const hasEmailConfig = () => {
  if (process.env.GOOGLE_EMAIL && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN) {
    return true;
  }
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
};

const getFromEmail = () => {
  return process.env.GOOGLE_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER || "renewal@aiet.org.in";
};

/**
 * Creates and returns a configured Nodemailer transporter
 * Supports Gmail OAuth2 (priority) and Brevo / standard SMTP (fallback)
 * @returns {Object} Nodemailer transporter instance
 */
const createTransporter = () => {
  if (process.env.GOOGLE_EMAIL && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GOOGLE_EMAIL,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      },
    });
  }

  // Validate required environment variables for SMTP fallback
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('Email credentials are not configured. Please set GOOGLE_EMAIL/GOOGLE_REFRESH_TOKEN or SMTP_USER/SMTP_PASS.');
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
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });
};

/**
 * Sends an approval email to a user after their account is approved
 */
const sendApprovalEmail = async (userEmail, userName) => {
  try {
    if (!userEmail || !userEmail.includes('@')) {
      throw new Error('Invalid email address provided');
    }
    if (!hasEmailConfig()) {
      throw new Error('Email configuration is missing');
    }

    const transporter = createTransporter();
    const fromEmail = getFromEmail();
    const bodyText = messageTemplates.adminApproval.emailText();
    const subject = messageTemplates.adminApproval.emailSubject;
    const safeBodyHtml = bodyText.replace(/\n/g, '<br/>');

    const mailOptions = {
      from: `"Alumni Portal" <${fromEmail}>`,
      to: userEmail,
      subject,
      html: `<div style="font-family: sans-serif; line-height: 1.6;">${safeBodyHtml}</div>`,
      text: bodyText,
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
 */
const sendRejectionEmail = async (userEmail, userName) => {
  try {
    if (!userEmail || !userEmail.includes('@')) {
      throw new Error('Invalid email address provided');
    }
    if (!hasEmailConfig()) {
      throw new Error('Email configuration is missing');
    }

    const transporter = createTransporter();
    const fromEmail = getFromEmail();

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

/**
 * Send 6-digit OTP for Admin / Institute Admin Login (email channel).
 */
const sendAdminLoginOtpEmail = async (userEmail, userName, code) => {
  try {
    if (!userEmail || !userEmail.includes('@')) {
      return { success: false, error: 'Invalid email' };
    }
    if (!hasEmailConfig()) {
      return { success: false, error: 'Email service not configured' };
    }

    const transporter = createTransporter();
    const fromEmail = getFromEmail();
    const subject = 'Admin Login Verification Code - Alvas Alumni Portal';
    const bodyHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #1e3a8a; margin: 0; font-size: 24px;">Alvas Alumni Portal</h2>
          <p style="color: #64748b; margin: 6px 0 0 0; font-size: 14px;">Administrator Security Verification</p>
        </div>
        <div style="padding: 24px; background: linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%); border-radius: 10px; border: 1px solid #dbeafe; margin-bottom: 24px;">
          <p style="margin: 0 0 12px 0; font-size: 15px; color: #1e293b;">Hello <strong>${userName || 'Admin'}</strong>,</p>
          <p style="margin: 0 0 18px 0; font-size: 15px; color: #334155;">Use the verification code below to complete your administrator sign in:</p>
          <div style="text-align: center; margin: 24px 0;">
            <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1e40af; background: #ffffff; padding: 14px 32px; border-radius: 8px; border: 2px dashed #93c5fd; display: inline-block;">${code}</span>
          </div>
          <p style="margin: 0; font-size: 13px; color: #64748b; text-align: center;">This code is valid for <strong>10 minutes</strong>. Never share this code with anyone.</p>
        </div>
        <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">If you did not initiate this login request, please contact security immediately.</p>
      </div>
    `;
    const bodyText = `Hello ${userName || 'Admin'},\n\nYour Alvas Alumni Portal login OTP is: ${code}\n\nThis OTP is valid for 10 minutes. Do not share this code.\n\nAlvas Alumni Portal`;

    const info = await transporter.sendMail({
      from: `"Alvas Alumni Portal" <${fromEmail}>`,
      to: userEmail,
      subject,
      text: bodyText,
      html: bodyHtml,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending admin login OTP email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send 6-digit OTP for password reset (email channel).
 */
const sendPasswordResetOtpEmail = async (userEmail, _userName, code) => {
  try {
    if (!userEmail || !userEmail.includes('@')) {
      return { success: false, error: 'Invalid email' };
    }
    if (!hasEmailConfig()) {
      return { success: false, error: 'Email service not configured' };
    }
    const transporter = createTransporter();
    const fromEmail = getFromEmail();
    const bodyText = messageTemplates.forgotPasswordOtp.emailText(code);
    const subject = messageTemplates.forgotPasswordOtp.emailSubject;
    const htmlBody = bodyText.replace(/\n/g, '<br/>');
    const mailOptions = {
      from: `"Alumni Portal" <${fromEmail}>`,
      to: userEmail,
      subject,
      text: bodyText,
      html: `<div style="font-family: sans-serif; line-height: 1.6;">${htmlBody}</div>`,
    };
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset OTP email:', error);
    return { success: false, error: error.message };
  }
};

const sendPasswordResetSuccessEmail = async (userEmail) => {
  try {
    if (!userEmail || !userEmail.includes('@')) {
      return { success: false, error: 'Invalid email' };
    }
    if (!hasEmailConfig()) {
      return { success: false, error: 'Email service not configured' };
    }
    const transporter = createTransporter();
    const fromEmail = getFromEmail();
    const bodyText = messageTemplates.passwordResetSuccess.emailText();
    const subject = messageTemplates.passwordResetSuccess.emailSubject;
    const htmlBody = bodyText.replace(/\n/g, '<br/>');
    const mailOptions = {
      from: `"Alumni Portal" <${fromEmail}>`,
      to: userEmail,
      subject,
      text: bodyText,
      html: `<div style="font-family: sans-serif; line-height: 1.6;">${htmlBody}</div>`,
    };
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset success email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendApprovalEmail,
  sendRejectionEmail,
  sendAdminLoginOtpEmail,
  sendPasswordResetOtpEmail,
  sendPasswordResetSuccessEmail,
};

