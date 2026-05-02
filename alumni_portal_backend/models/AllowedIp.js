const mongoose = require('mongoose');

const allowedIpSchema = new mongoose.Schema({
    ip: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('AllowedIp', allowedIpSchema, 'allowedip');
