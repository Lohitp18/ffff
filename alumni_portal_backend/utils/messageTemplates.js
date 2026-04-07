/**
 * Alvas Alumni Portal — canonical SMS / WhatsApp / Email copy (DLT templates must match in production).
 * Placeholder: {OTP} for one-time codes.
 */

module.exports = {
  portalUrl: () => process.env.ALVAS_PORTAL_URL || "https://alvas.org/",

  signupOtp: {
    sms: (otp) =>
      `Dear User, Your OTP for Alvas Alumni Portal is ${otp}. It is valid for 10 minutes. Do not share this OTP with anyone. - Alvas Education Foundation`,
    whatsapp: (otp) =>
      `🔐 Alvas Alumni Portal Verification\nYour OTP: ${otp}\nValid for 10 minutes\nDo not share this OTP\nAlvas Education Foundation\nhttps://alvas.org/`,
    emailSubject: "OTP Verification - Alvas Alumni Portal",
    emailText: (otp) =>
      `Dear User,\n\nYour OTP is ${otp}.\nThis OTP is valid for 10 minutes. Do not share it.\n\nAlvas Education Foundation\nhttps://alvas.org/`,
  },

  adminApproval: {
    sms: (name = "User", url) =>
      `Dear ${name}, Your account for Alvas Alumni Portal has been approved. You can now log in and access your dashboard. Visit: ${url || module.exports.portalUrl()} - Alvas Education Foundation`,
    whatsapp: () =>
      `✅ Account Approved\nYour account has been approved.\nYou can now login.\nAlvas Education Foundation\nhttps://alvas.org/`,
    emailSubject: "Account Approved",
    emailText: () =>
      `Dear User,\n\nYour account has been approved. You can now login and access the platform.\n\nAlvas Education Foundation`,
  },

  forgotPasswordOtp: {
    sms: (otp) =>
      `Dear User, Your OTP to reset your Alvas Alumni Portal password is ${otp}. It is valid for 10 minutes. Do not share this OTP with anyone. - Alvas Education Foundation`,
    whatsapp: (otp) =>
      `🔑 Password Reset OTP\nYour OTP: ${otp}\nValid for 10 minutes\nDo not share\nAlvas Education Foundation`,
    emailSubject: "Password Reset OTP",
    emailText: (otp) =>
      `Dear User,\n\nYour OTP to reset your password is ${otp}.\nThis OTP is valid for 10 minutes.\n\nAlvas Education Foundation`,
  },

  passwordResetSuccess: {
    sms: (name = "User") =>
      `Dear ${name}, Your Alvas Alumni Portal password has been successfully reset. If this was not you, please contact support immediately. - Alvas Education Foundation`,
    whatsapp: () =>
      `🔒 Password Updated Successfully\nYour password has been reset.\nIf this was not you, contact support immediately.\nAlvas Education Foundation`,
    emailSubject: "Password Reset Successful",
    emailText: () =>
      `Dear User,\n\nYour password has been successfully reset.\nIf this was not you, contact support immediately.\n\nAlvas Education Foundation`,
  },

  loginAlert: {
    sms: () =>
      `Dear User, your account was logged in successfully. If this was not you, contact support immediately. - Alvas Education Foundation`,
  },

  /** Registration submitted (pending admin approval). Match DLT / WhatsApp approved text via env when needed. */
  signupSuccess: {
    sms: (name = "User", url) =>
      `Dear ${name}, Your registration for Alvas Alumni Portal is successful. Please wait for admin approval. Visit ${url || module.exports.portalUrl()} - Alvas Education Foundatio`,
    whatsapp: () =>
      `✅ Registration received\nYour Alvas Alumni Portal registration was successful.\nPlease wait for admin approval.\nAlvas Education Foundation`,
  },
};
