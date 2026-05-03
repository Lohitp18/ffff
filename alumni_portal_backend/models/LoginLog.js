const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
  },
  ip: {
    type: String,
    required: true,
  },
  success: {
    type: Boolean,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: false });

module.exports = mongoose.model('LoginLog', loginLogSchema, 'loginlogs');
