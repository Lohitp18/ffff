// Test script to verify email functionality
require('dotenv').config();
const { sendApprovalEmail } = require('../utils/emailService');

async function testEmail() {
  console.log('Testing email functionality...\n');
  
  // Test with a sample email (replace with your email for testing)
  const testEmail = 'test@example.com'; // Replace with your actual email
  const testName = 'Test User';
  
  try {
    console.log('Sending test approval email...');
    const result = await sendApprovalEmail(testEmail, testName);
    
    if (result.success) {
      console.log('\n✅ Email sent successfully!');
      console.log('Message ID:', result.messageId);
    } else {
      console.log('\n❌ Email failed to send');
      console.log('Error:', result.error);
      console.log('Details:', result.details);
    }
  } catch (error) {
    console.error('\n❌ Exception occurred:', error);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

testEmail();





