const mongoose = require("mongoose");

const otpChallengeSchema = new mongoose.Schema(
  {
    lookupKey: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    expiresAt: { type: Date, required: true },
    purpose: { type: String, default: "" },
    verifyFailCount: { type: Number, default: 0 },
    resendCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

otpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("OtpChallenge", otpChallengeSchema);
