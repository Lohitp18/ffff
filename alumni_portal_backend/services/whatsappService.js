const axios = require("axios");
const { normalizePhone, maskPhoneForLog } = require("../utils/phone");
const messageTemplates = require("../utils/messageTemplates");

function redactNumericCodes(s) {
  return String(s).replace(/\b\d{4,12}\b/g, (d) => "*".repeat(d.length));
}

function whatsAppResponseForLog(data) {
  if (data == null) return data;
  if (typeof data === "string") return redactNumericCodes(data).slice(0, 2000);
  try {
    return JSON.parse(JSON.stringify(data));
  } catch {
    return "[unserializable_response]";
  }
}

/** Deep-clone WhatsApp JSON body for logs: mask token-like digit strings in text fields. */
function whatsAppBodyForLog(body) {
  const b = JSON.parse(JSON.stringify(body));
  if (b.to != null) {
    b.to = maskPhoneForLog(normalizePhone(b.to));
  }
  if (b.text?.body != null) {
    const raw = String(b.text.body);
    b.text.body = redactNumericCodes(raw);
  }
  if (b.template?.components && Array.isArray(b.template.components)) {
    for (const comp of b.template.components) {
      if (!comp.parameters) continue;
      for (const p of comp.parameters) {
        if (p.type === "text" && p.text != null) {
          const raw = String(p.text);
          p.text = redactNumericCodes(raw);
        }
      }
    }
  }
  return b;
}

function envTrim(key) {
  const v = process.env[key];
  return v != null ? String(v).trim() : "";
}

function logWaOutcome(label, result, meta = {}) {
  const prefix = `[WhatsApp:${label}]`;
  if (result.skipped) {
    return;
  }
  if (result.error === "invalid_phone") {
    console.error(`${prefix} failed`, { error: "invalid_phone", ...meta });
    return;
  }
  if (result.ok) return;
  console.error(`${prefix} failed`, {
    ...meta,
    error: result.error,
    httpStatus: result.status,
    providerBodyPreview:
      result.body != null ? String(result.body).slice(0, 400) : undefined,
  });
}

function waTemplateLanguageCode() {
  const code = envTrim("DOSNET_WA_LANGUAGE_CODE");
  if (code) return code;
  const lang = (process.env.DOSNET_WA_LANGUAGE || "en").trim().toLowerCase();
  if (lang === "english" || lang === "en") return "en";
  return lang.length >= 2 ? lang.slice(0, 5) : "en";
}

function waHttpConfig() {
  const base = process.env.DOSNET_WA_API_URL || process.env.WHATSAPP_API_URL;
  const token = process.env.DOSNET_WA_TOKEN || process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.DOSNET_WA_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = (process.env.DOSNET_WA_API_VERSION || "v23.0").trim() || "v23.0";
  return { base, token, phoneId, apiVersion };
}

/**
 * @param {object} body JSON body for the messages API
 * @param {{ logLabel: string, rawPhone: string, extra?: object }} ctx
 */
async function postWhatsAppMessage(body, ctx) {
  const logLabel = ctx.logLabel || "whatsapp";
  const phoneMask = maskPhoneForLog(ctx.rawPhone);
  const extra = ctx.extra || {};

  const { base, token, phoneId, apiVersion } = waHttpConfig();
  if (!base || !token) {
    const result = { ok: false, skipped: true, reason: "whatsapp_not_configured" };
    logWaOutcome(logLabel, result, { phoneMask, ...extra });
    return result;
  }

  // DOSNET path format: `${DOSNET_WA_API_URL}/v23.0/${PHONE_NUMBER_ID}/messages`
  const baseClean = base.replace(/\/$/, "");
  const versionClean = String(apiVersion || "v23.0").replace(/^\/+|\/+$/g, "");
  const url = phoneId
    ? `${baseClean}/${versionClean}/${phoneId}/messages`
    : `${baseClean}/${versionClean}/messages`;

  let result;
  try {
    const res = await axios.post(url, body, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });
    const text =
      typeof res.data === "string" ? res.data : JSON.stringify(res.data ?? "");
    result = { ok: true, body: text };
  } catch (error) {
    const ax = error.response;
    const text =
      ax?.data != null
        ? typeof ax.data === "string"
          ? ax.data
          : JSON.stringify(ax.data)
        : "";
    result = {
      ok: false,
      status: ax?.status,
      body: text,
      error: error.message,
    };
  }

  logWaOutcome(logLabel, result, { phoneMask, ...extra });
  return result;
}

async function sendWhatsAppTemplate(rawPhone, templateName, bodyParameters, logLabel) {
  const to = normalizePhone(rawPhone);
  const phoneMask = maskPhoneForLog(rawPhone);

  if (!to || to.length < 12) {
    const result = { ok: false, error: "invalid_phone" };
    logWaOutcome(logLabel, result, { phoneMask, mode: "template" });
    return result;
  }

  const name = String(templateName || "").trim();
  if (!name) {
    const result = { ok: false, skipped: true, reason: "missing_template_name" };
    logWaOutcome(logLabel, result, { phoneMask, mode: "template" });
    return result;
  }

  // Payload shape exactly like provided (template name + language + body parameters).
  const languageCode = waTemplateLanguageCode();
  const formattedMobile = to.replace(/^91/, "");
  const parameters = Array.isArray(bodyParameters)
    ? bodyParameters.map((text) => ({
      type: "text",
      text: String(text ?? "").slice(0, 1024),
    }))
    : [];

  const body = {
    messaging_product: "whatsapp",
    to: formattedMobile,
    type: "template",
    template: {
      name,
      language: { code: languageCode },
      components: [
        {
          type: "body",
          parameters,
        },
      ],
    },
  };

  return postWhatsAppMessage(body, {
    logLabel,
    rawPhone,
    extra: {
      mode: "template",
      templateName: name,
      languageCode,
    },
  });
}

async function sendWhatsAppText(rawPhone, messageText, logLabel) {
  const { base, token } = waHttpConfig();
  const phoneMask = maskPhoneForLog(rawPhone);

  if (!base || !token) {
    const result = { ok: false, skipped: true, reason: "whatsapp_not_configured" };
    logWaOutcome(logLabel, result, { phoneMask, mode: "text" });
    return result;
  }

  const to = normalizePhone(rawPhone);
  if (!to || to.length < 12) {
    const result = { ok: false, error: "invalid_phone" };
    logWaOutcome(logLabel, result, { phoneMask, mode: "text" });
    return result;
  }

  return postWhatsAppMessage(
    {
      messaging_product: "whatsapp",
      to: to.replace(/^91/, ""),
      type: "text",
      text: { body: messageText.slice(0, 4096) },
    },
    { logLabel, rawPhone, extra: { mode: "text" } }
  );
}

async function sendWhatsAppOtp(rawPhone, code, displayName = "User") {
  const logLabel = "signup_otp";
  const tpl =
    envTrim("DOSNET_WA_SIGNUP_OTP_TEMPLATE_NAME") ||
    envTrim("WHATSAPP_SIGNUP_OTP_TEMPLATE_NAME");
  if (tpl) {
    // Template `otp_for_alvas_alumni_2026`: {{1}}=name, {{2}}=otp
    return sendWhatsAppTemplate(rawPhone, tpl, [displayName, code], logLabel);
  }
  const msg =
    process.env.DOSNET_WA_OTP_MESSAGE_TEMPLATE?.replace("{OTP}", code).replace("{code}", code) ||
    messageTemplates.signupOtp.whatsapp(code);
  return sendWhatsAppText(rawPhone, msg, logLabel);
}

async function sendForgotPasswordOtpWhatsApp(rawPhone, code, displayName = "User") {
  const logLabel = "password_reset_otp";
  const tpl =
    envTrim("DOSNET_WA_RESET_OTP_TEMPLATE_NAME") ||
    envTrim("WHATSAPP_RESET_OTP_TEMPLATE_NAME");
  if (tpl) {
    // Template `reset_your_password_for_alvas_alumni_portal`: {{1}}=name, {{2}}=otp
    return sendWhatsAppTemplate(rawPhone, tpl, [displayName, code], logLabel);
  }
  const msg =
    process.env.DOSNET_WA_FORGOT_PASSWORD_OTP_TEMPLATE?.replace("{OTP}", code).replace("{code}", code) ||
    messageTemplates.forgotPasswordOtp.whatsapp(code);
  return sendWhatsAppText(rawPhone, msg, logLabel);
}

async function sendAccountApprovedWhatsApp(rawPhone, displayName = "User") {
  const logLabel = "account_approved";
  const tpl =
    envTrim("DOSNET_WA_APPROVED_TEMPLATE_NAME") ||
    envTrim("WHATSAPP_APPROVED_TEMPLATE_NAME");
  if (tpl) {
    // Template `_alvas_alumni_portal_has_been_approved`: {{1}}=name
    return sendWhatsAppTemplate(rawPhone, tpl, [displayName], logLabel);
  }
  const msg =
    process.env.DOSNET_APPROVAL_WA_MESSAGE || messageTemplates.adminApproval.whatsapp();
  return sendWhatsAppText(rawPhone, msg, logLabel);
}

async function sendPasswordResetSuccessWhatsApp(rawPhone, displayName = "User") {
  const logLabel = "password_reset_success";
  const tpl =
    envTrim("DOSNET_WA_RESET_SUCESSFULL_TEMPLATE_NAME") ||
    envTrim("DOSNET_WA_RESET_SUCCESSFUL_TEMPLATE_NAME") ||
    envTrim("WHATSAPP_RESET_SUCCESS_TEMPLATE_NAME");
  if (tpl) {
    // Template `alumn_has_been_resetsuccess`: {{1}}=name
    return sendWhatsAppTemplate(rawPhone, tpl, [displayName], logLabel);
  }
  const msg =
    process.env.DOSNET_WA_PASSWORD_RESET_SUCCESS_TEMPLATE ||
    messageTemplates.passwordResetSuccess.whatsapp();
  return sendWhatsAppText(rawPhone, msg, logLabel);
}

async function sendSignupSuccessWhatsApp(rawPhone, displayName = "User") {
  const logLabel = "signup_success";
  const tpl =
    envTrim("DOSNET_WA_SIGNUP_SUCESSFULL_TEMPLATE_NAME") ||
    envTrim("DOSNET_WA_SIGNUP_SUCCESSFUL_TEMPLATE_NAME") ||
    envTrim("WHATSAPP_SIGNUP_SUCCESS_TEMPLATE_NAME");
  if (tpl) {
    // Template `registration_for_alvas_alumni_portal_is_successful`: {{1}}=name
    return sendWhatsAppTemplate(rawPhone, tpl, [displayName], logLabel);
  }
  const msg =
    process.env.DOSNET_WA_SIGNUP_SUCCESS_MESSAGE || messageTemplates.signupSuccess.whatsapp();
  return sendWhatsAppText(rawPhone, msg, logLabel);
}

module.exports = {
  sendWhatsAppText,
  sendWhatsAppTemplate,
  sendWhatsAppOtp,
  sendForgotPasswordOtpWhatsApp,
  sendAccountApprovedWhatsApp,
  sendPasswordResetSuccessWhatsApp,
  sendSignupSuccessWhatsApp,
};
