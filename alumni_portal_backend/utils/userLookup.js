const User = require("../models/User");
const { normalizePhone } = require("./phone");

/**
 * Find user by email, username, or phone (flexible matching).
 */
async function findUserByIdentifier(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;

  if (s.includes("@")) {
    return User.findOne({ email: s.toLowerCase() });
  }

  const byUsername = await User.findOne({ username: s.toLowerCase() });
  if (byUsername) return byUsername;

  const digits = s.replace(/\D/g, "");
  if (digits.length >= 10) {
    const tail = digits.slice(-10);
    const norm = normalizePhone(s);
    const byExact = await User.findOne({ phone: s });
    if (byExact) return byExact;
    const byTail = await User.findOne({ phone: { $regex: tail + "$" } });
    if (byTail) return byTail;
    if (norm.length >= 12) {
      const all = await User.find({ phone: { $exists: true, $ne: "" } }).limit(200);
      return all.find((u) => normalizePhone(u.phone || "") === norm) || null;
    }
  }

  return null;
}

module.exports = { findUserByIdentifier };
