const mongoose = require('mongoose');

const adminCredentialSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: "admin" },
    isAdmin: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('AdminCredential', adminCredentialSchema);
