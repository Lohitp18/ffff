const mongoose = require('mongoose');

const adminCredentialSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: "admin" },
    isAdmin: { type: Boolean, default: true },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('AdminCredential', adminCredentialSchema);
