const mongoose = require('mongoose');

const instituteCredentialSchema = new mongoose.Schema({
    institution: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('InstituteCredential', instituteCredentialSchema, 'institutecredentials');
