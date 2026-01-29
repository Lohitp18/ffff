const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    image: String, // Logo/profile image
    coverImage: String, // Cover image
    
    // Contact Information
    phone: String,
    email: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' },
    
    // Additional Details
    website: String,
    establishedYear: String,
    type: String, // e.g., "Engineering", "Medical", "Arts", etc.
    affiliation: String, // University affiliation
    description: String, // About the institution
    facilities: [String], // List of facilities
    courses: [String], // List of courses offered
    
    // Social Media
    facebook: String,
    twitter: String,
    linkedin: String,
    instagram: String,
    
    // Admin/Contact Person
    contactPerson: String,
    contactPersonEmail: String,
    contactPersonPhone: String,
    
    // Status
    isActive: { type: Boolean, default: true },
    
    // Created/Updated by
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Institution', institutionSchema);
