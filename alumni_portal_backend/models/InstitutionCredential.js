const mongoose = require('mongoose');

const institutionCredentialSchema = new mongoose.Schema({
    institutionName: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: "institution" },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('InstitutionCredential', institutionCredentialSchema);
