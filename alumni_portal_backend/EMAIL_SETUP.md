# Email Notification Setup Guide - Brevo SMTP

This guide explains how to configure email notifications for user approval in the Alumni Portal using Brevo (formerly Sendinblue) SMTP.

## Overview

When an admin approves or rejects a new user registration, the system automatically sends an email notification to the user's registered email address.

## Configuration

### Step 1: Environment Variables

Create a `.env` file in the `alumni_portal_backend` directory and add the following email configuration:

```env
# Brevo SMTP Configuration
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_smtp_username@smtp-brevo.com
SMTP_PASS=your_smtp_password
SMTP_FROM=your_sender_email@example.com

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:5173

# Node Environment
NODE_ENV=development
```

### Step 2: Brevo SMTP Setup

1. **Sign up for Brevo** (if you don't have an account)
   - Visit: https://www.brevo.com/
   - Create a free account (300 emails/day on free tier)

2. **Get SMTP Credentials**
   - Log in to your Brevo account
   - Go to **Settings** → **SMTP & API**
   - Under **SMTP**, you'll find:
     - **Server**: `smtp-relay.brevo.com`
     - **Port**: `587`
     - **Login**: Your SMTP username (format: `xxxxx@smtp-brevo.com`)
     - **Password**: Your SMTP password

3. **Verify Sender Email**
   - Go to **Settings** → **Senders**
   - Add and verify your sender email address
   - Use this verified email as `SMTP_FROM` in your `.env` file

4. **Update .env file**
   ```env
   SMTP_HOST=smtp-relay.brevo.com
   SMTP_PORT=587
   SMTP_USER=9bdc1f001@smtp-brevo.com
   SMTP_PASS=your_smtp_password_here
   SMTP_FROM=patgarlohit818@gmail.com
   FRONTEND_URL=http://localhost:5173
   ```

### Step 3: Environment Variables Explained

- **SMTP_HOST**: Brevo SMTP server address (`smtp-relay.brevo.com`)
- **SMTP_PORT**: SMTP port (587 for TLS)
- **SMTP_USER**: Your Brevo SMTP username
- **SMTP_PASS**: Your Brevo SMTP password
- **SMTP_FROM**: The verified sender email address (will appear as "From" in emails)
- **FRONTEND_URL**: Your frontend application URL (used in email links)

## Testing

1. **Start the backend server:**
   ```bash
   cd alumni_portal_backend
   npm start
   ```

2. **Register a new user** through the signup page

3. **As an admin, approve the user** from the Admin Dashboard

4. **Check the user's email inbox** for the approval notification

5. **Check server logs** for email sending status:
   - Success: `✅ Approval email sent successfully to user@example.com`
   - Failure: `❌ Failed to send approval email: [error details]`

## Email Templates

### Approval Email
- Welcome message
- Account approval confirmation
- List of available features
- Sign-in link
- Professional HTML formatting

### Rejection Email
- Professional rejection notification
- Contact information for appeals
- Clear messaging

## Troubleshooting

### Email not sending

1. **Check environment variables**: 
   - Ensure all SMTP variables are set correctly in `.env`
   - Verify `.env` file is in the `alumni_portal_backend` directory
   - Restart the server after changing `.env` file

2. **Check server logs**: 
   - Look for `[EMAIL]` prefixed log messages
   - Check for error messages with details

3. **Verify Brevo credentials**: 
   - Double-check SMTP_USER and SMTP_PASS
   - Ensure credentials are correct in Brevo dashboard

4. **Check Brevo account status**: 
   - Verify your Brevo account is active
   - Check if you've exceeded daily email limits
   - Ensure sender email is verified

5. **Network/Firewall**: 
   - Ensure port 587 is not blocked
   - Check if your server can reach `smtp-relay.brevo.com`

### Common Errors

- **"SMTP credentials are not configured"**: 
  - Set `SMTP_USER` and `SMTP_PASS` in `.env` file
  
- **"Invalid email address provided"**: 
  - Check user email format in database
  
- **"Authentication failed"**: 
  - Verify SMTP_USER and SMTP_PASS are correct
  - Check Brevo account status
  
- **"Connection timeout"**: 
  - Check SMTP_HOST and SMTP_PORT
  - Verify network connectivity

## Production Considerations

For production environments:

1. **Use environment variables**: Never hardcode credentials
2. **Set NODE_ENV=production**: Enables stricter TLS certificate validation
3. **Monitor email delivery**: Set up logging/monitoring for email sends
4. **Rate limiting**: Be aware of Brevo's sending limits
5. **Email queue**: Consider implementing a queue system for better reliability
6. **SPF/DKIM/DMARC**: Configure proper email authentication for better deliverability

## Security Notes

- ✅ **Never commit `.env` file to version control**
- ✅ **Use environment variables for all sensitive data**
- ✅ **Rotate SMTP passwords regularly**
- ✅ **Use different credentials for development and production**
- ✅ **Keep Brevo account secure with 2FA if available**

## Code Structure

- **emailService.js**: Handles all email sending logic
- **adminController.js**: Contains `approveUser()` and `rejectUser()` functions
- **adminRoutes.js**: Defines API routes for admin actions

## API Endpoints

- `PATCH /api/admin/approve/:id` - Approve user and send email
- `PATCH /api/admin/reject/:id` - Reject user and send email

Both endpoints:
- Update user status in database
- Send email notification (non-blocking)
- Return JSON response with user data
