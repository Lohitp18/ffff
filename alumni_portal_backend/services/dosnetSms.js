const axios = require("axios");
const { normalizePhone, maskPhoneForLog } = require("../utils/phone");
const messageTemplates = require("../utils/messageTemplates");

/** Mask digit runs that look like OTPs / codes in logged payloads. */
function redactNumericCodes(s) {
  return String(s).replace(/\b\d{4,12}\b/g, (d) => "*".repeat(d.length));
}

/** Safe copy of query params for logs (no password, apikey, or raw OTP in message). */
function smsQueryParamsForLog(searchParams) {
  const o = {};
  for (const [k, v] of searchParams.entries()) {
    const lk = k.toLowerCase();
    if (lk === "password" || lk === "apikey") {
      o[k] = "[redacted]";
    } else if (lk === "message") {
      // Mask OTP/codes in logs only (unless explicitly enabled for dev debugging).
      if (process.env.LOG_SMS_EXACT_MESSAGE === "true") {
        o[k] = v;
      } else {
        o[k] = redactNumericCodes(v);
      }
    } else {
      o[k] = v;
    }
  }
  return o;
}

/** First non-empty trimmed env value (supports alternate spellings). */
function firstEnvTrim(...keys) {
  for (const k of keys) {
    const v = process.env[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function logSmsOutcome(label, result, meta = {}) {
  const prefix = `[SMS:${label}]`;
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
    providerError: result.providerError,
    httpStatus: result.status,
    providerBodyPreview:
      result.body != null ? String(result.body).slice(0, 400) : undefined,
  });
}

/** DOSNET returns HTTP 200 with JSON { status, message }; body may contain two JSON objects back-to-back. */
function tryParseDosnetJson(text) {
  const s = String(text || "").trim();
  if (!s || s[0] !== "{") return null;
  const parse = (chunk) => {
    try {
      return JSON.parse(chunk);
    } catch {
      return null;
    }
  };
  let o = parse(s);
  if (o) return o;
  const end = s.indexOf("}{");
  if (end !== -1) {
    o = parse(s.slice(0, end + 1));
    if (o) return o;
  }
  return null;
}

/**
 * Treat provider JSON errors as failure even when HTTP status is 200.
 */
function interpretDosnetResponse(httpOk, httpStatus, text) {
  const parsed = tryParseDosnetJson(text);
  if (parsed && typeof parsed === "object" && parsed.status != null) {
    const st = String(parsed.status).toLowerCase();
    const msg = parsed.message || parsed.msg || parsed.error || "";
    if (st === "error" || st === "failure" || st === "failed") {
      return {
        ok: false,
        status: httpStatus,
        body: text,
        providerError: String(msg || "provider_error"),
      };
    }
    if (st === "success" || st === "ok") {
      return { ok: true, body: text };
    }
  }
  if (!httpOk) {
    return { ok: false, status: httpStatus, body: text };
  }
  if (text && /"status"\s*:\s*"error"/i.test(text)) {
    return {
      ok: false,
      status: httpStatus,
      body: text,
      providerError: "JSON status error (see providerBodyPreview)",
    };
  }
  return { ok: true, body: text };
}

/**
 * Send SMS via DOSNET HTTP API. Credentials must come from environment only.
 * @param {{ templateId?: string | null, logLabel?: string }} [options]
 */
async function sendDosnetSms(rawPhone, messageText, options = {}) {
  const logLabel = options.logLabel || "dosnet_sms";
  const phoneMask = maskPhoneForLog(rawPhone);

  const baseUrl = process.env.DOSNET_API_URL;
  if (!baseUrl) {
    const result = { ok: false, skipped: true, reason: "missing_config" };
    logSmsOutcome(logLabel, result, { phoneMask });
    return result;
  }

  const mobile = normalizePhone(rawPhone);
  if (!mobile || mobile.length < 10) {
    const result = { ok: false, error: "invalid_phone" };
    logSmsOutcome(logLabel, result, { phoneMask });
    return result;
  }

  // Use ONLY the exact parameter set requested (same keys/casing).
  const username = (process.env.DOSNET_USERNAME || "").trim();
  const apiKey = (process.env.DOSNET_API_KEY || "").trim();
  const sender = (process.env.DOSNET_SENDERID || "").trim();
  const route = (process.env.DOSNET_ROUTE || "TRANS").trim();
  const templateId =
    options.templateId !== undefined && options.templateId !== ""
      ? options.templateId
      : process.env.DOSNET_TEMPLATE_ID;
  const TemplateID = (templateId || "").trim();

  const paramsObj = {
    username: username,
    apikey: apiKey,
    apirequest: "Text",
    sender: sender,
    mobile: mobile,
    message: messageText,
    route: route,
    TemplateID: TemplateID,
    format: "JSON",
  };

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(paramsObj)) {
    if (v == null) continue;
    const s = String(v).trim();
    if (!s) continue;
    params.set(k, s);
  }

  const url = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${params.toString()}`;

  const endpointBase = baseUrl.split("?")[0];
  let result;
  try {
    const res = await axios.get(url, {
      timeout: 60000,
      validateStatus: () => true,
      transformResponse: [(data) => data],
    });
    const text =
      typeof res.data === "string" ? res.data : JSON.stringify(res.data ?? "");
    result = interpretDosnetResponse(
      res.status >= 200 && res.status < 300,
      res.status,
      text
    );
  } catch (error) {
    result = { ok: false, error: error.message };
  }

  logSmsOutcome(logLabel, result, {
    phoneMask: maskPhoneForLog(mobile),
    templateId: TemplateID || undefined,
  });
  return result;
}

function sendOpts(templateId, logLabel) {
  return {
    ...(templateId ? { templateId } : {}),
    logLabel,
  };
}

async function sendOtpSms(rawPhone, code) {
  const msg =
    process.env.DOSNET_OTP_MESSAGE_TEMPLATE?.replace("{OTP}", code).replace("{code}", code) ||
    messageTemplates.signupOtp.sms(code);
  const templateId = firstEnvTrim(
    "DOSNET_SIGNUP_OTP_SMS_TEMPLATE_ID",
    "DOSNET_TEMPLATE_ID"
  );
  return sendDosnetSms(rawPhone, msg, sendOpts(templateId, "signup_otp"));
}

async function sendForgotPasswordOtpSms(rawPhone, code) {
  const msg =
    process.env.DOSNET_FORGOT_PASSWORD_OTP_TEMPLATE?.replace("{OTP}", code).replace("{code}", code) ||
    messageTemplates.forgotPasswordOtp.sms(code);
  const templateId = firstEnvTrim(
    "DOSNET_RESET_OTP_SMS_TEMPLATE_ID",
    "DOSNET_TEMPLATE_ID"
  );
  return sendDosnetSms(rawPhone, msg, sendOpts(templateId, "password_reset_otp"));
}

async function sendAccountApprovedSms(rawPhone, displayName) {
  const url = messageTemplates.portalUrl();
  const msg =
    (process.env.DOSNET_APPROVAL_MESSAGE || "")
      .replace("{name}", displayName || "User")
      .replace("{url}", url) ||
    messageTemplates.adminApproval.sms(displayName || "User", url);

  const approvalTid = firstEnvTrim(
    "DOSNET_APPROVED_SMS_TEMPLATE_ID",
    "DOSNET_APPROVAL_TEMPLATE_ID",
    "DOSNET_TEMPLATE_ID"
  );
  return sendDosnetSms(rawPhone, msg, sendOpts(approvalTid, "account_approved"));
}

async function sendPasswordResetConfirmationSms(rawPhone, displayName) {
  const msg =
    (process.env.DOSNET_PASSWORD_RESET_CONFIRM_MESSAGE || "")
      .replace("{name}", displayName || "User") ||
    messageTemplates.passwordResetSuccess.sms(displayName || "User");
  const templateId = firstEnvTrim(
    "DOSNET_RESET_SUCESSFULL_SMS_TEMPLATE_ID",
    "DOSNET_RESET_SUCCESSFUL_SMS_TEMPLATE_ID",
    "DOSNET_TEMPLATE_ID"
  );
  return sendDosnetSms(rawPhone, msg, sendOpts(templateId, "password_reset_success"));
}

async function sendSignupSuccessSms(rawPhone, displayName) {
  const url = messageTemplates.portalUrl();
  const msg =
    (process.env.DOSNET_SIGNUP_SUCCESS_SMS_MESSAGE || "")
      .replace("{name}", displayName || "User")
      .replace("{url}", url) ||
    messageTemplates.signupSuccess.sms(displayName || "User", url);
  const templateId = firstEnvTrim(
    "DOSNET_SIGNUP_SUCESSFULL_SMS_TEMPLATE_ID",
    "DOSNET_SIGNUP_SUCCESSFUL_SMS_TEMPLATE_ID",
    "DOSNET_TEMPLATE_ID"
  );
  return sendDosnetSms(rawPhone, msg, sendOpts(templateId, "signup_success"));
}

async function sendLoginAlertSms(rawPhone) {
  const msg =
    process.env.DOSNET_LOGIN_ALERT_MESSAGE || messageTemplates.loginAlert.sms();
  const templateId = firstEnvTrim("DOSNET_LOGIN_ALERT_TEMPLATE_ID", "DOSNET_TEMPLATE_ID");
  return sendDosnetSms(rawPhone, msg, sendOpts(templateId, "login_alert"));
}

module.exports = {
  sendDosnetSms,
  sendOtpSms,
  sendForgotPasswordOtpSms,
  sendAccountApprovedSms,
  sendPasswordResetConfirmationSms,
  sendSignupSuccessSms,
  sendLoginAlertSms,
};
