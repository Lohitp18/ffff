/** Normalize to digits-only country format (default India 91). */
function normalizePhone(input) {
  if (input == null) return "";
  let d = String(input).replace(/\D/g, "");
  if (d.length === 10) d = `91${d}`;
  return d;
}

/** Last 4 digits only — for server logs without exposing full numbers. */
function maskPhoneForLog(input) {
  const d = normalizePhone(input);
  if (!d || d.length < 4) return "****";
  return `…${d.slice(-4)}`;
}

module.exports = { normalizePhone, maskPhoneForLog };
