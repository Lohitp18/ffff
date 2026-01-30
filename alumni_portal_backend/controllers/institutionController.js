const Institution = require('../models/Institution');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { saveBufferToUploads } = require("../utils/localStorage");

// Configure multer for image uploads (in-memory)
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      return cb(null, true);
    }
    return cb(new Error('Only image files are allowed'));
  }
}).single('image');

/** Upload image: always use local /uploads (Azure disabled). Returns URL path. */
async function uploadInstitutionImage(buffer, originalname, purpose = 'logo') {
  const ext = path.extname(originalname) || '.jpg';
  const safeName = (originalname || 'image').replace(/\s+/g, '-').toLowerCase();
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const filename = `institution-${purpose}-${unique}-${path.basename(safeName, path.extname(safeName))}${ext}`;
  // Store under /uploads/institutions
  return saveBufferToUploads(buffer, filename, 'institutions', 'image/jpeg');
}

// Middleware wrapper to handle Multer errors cleanly
const handleImageUpload = (req, res, next) => {
  imageUpload(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Max 5MB.' });
      }
      return res.status(400).json({ message: err.message || 'Upload failed' });
    }
    next();
  });
};

module.exports.handleImageUpload = handleImageUpload;

// GET /api/institutions - Get all institutions
exports.getAllInstitutions = async (req, res) => {
  try {
    const institutions = await Institution.find({ isActive: true })
      .sort({ name: 1 })
      .select('-createdBy -updatedBy');
    return res.json(institutions);
  } catch (err) {
    console.error('Error fetching institutions:', err);
    return res.status(500).json({ message: 'Failed to fetch institutions' });
  }
};

// GET /api/institutions/:name - Get institution by name
exports.getInstitutionByName = async (req, res) => {
  try {
    const { name } = req.params;
    const institution = await Institution.findOne({ name, isActive: true })
      .select('-createdBy -updatedBy');
    
    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }
    
    return res.json(institution);
  } catch (err) {
    console.error('Error fetching institution:', err);
    return res.status(500).json({ message: 'Failed to fetch institution' });
  }
};

// POST /api/institutions - Create new institution (admin only)
exports.createInstitution = async (req, res) => {
  try {
    const userId = req.user._id;
    const institutionData = {
      ...req.body,
      createdBy: userId,
      updatedBy: userId
    };
    
    // Handle image upload (logo)
    if (req.file) {
      institutionData.image = await uploadInstitutionImage(
        req.file.buffer,
        req.file.originalname || 'institution-logo.jpg',
        'logo'
      );
    }
    
    const institution = await Institution.create(institutionData);
    return res.status(201).json(institution);
  } catch (err) {
    console.error('Error creating institution:', err);
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Institution with this name already exists' });
    }
    return res.status(500).json({ message: 'Failed to create institution' });
  }
};

// PUT /api/institutions/:id - Update institution (admin only)
exports.updateInstitution = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    const updateData = {
      ...req.body,
      updatedBy: userId
    };
    
    // Handle image upload (logo)
    if (req.file) {
      updateData.image = await uploadInstitutionImage(
        req.file.buffer,
        req.file.originalname || 'institution-logo.jpg',
        'logo'
      );
    }
    
    const institution = await Institution.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-createdBy -updatedBy');
    
    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }
    
    return res.json(institution);
  } catch (err) {
    console.error('Error updating institution:', err);
    return res.status(500).json({ message: 'Failed to update institution' });
  }
};

// PUT /api/institutions/:id/cover-image - Update cover image
exports.updateCoverImage = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }
    
    const coverImageUrl = await uploadInstitutionImage(
      req.file.buffer,
      req.file.originalname || 'institution-cover.jpg',
      'cover'
    );
    const institution = await Institution.findByIdAndUpdate(
      id,
      { coverImage: coverImageUrl },
      { new: true }
    ).select('-createdBy -updatedBy');
    
    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }
    
    return res.json({ message: 'Cover image updated', institution });
  } catch (err) {
    console.error('Error updating cover image:', err);
    return res.status(500).json({ message: 'Failed to update cover image' });
  }
};

// DELETE /api/institutions/:id - Delete institution (admin only)
exports.deleteInstitution = async (req, res) => {
  try {
    const { id } = req.params;
    
    const institution = await Institution.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    
    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }
    
    return res.json({ message: 'Institution deleted successfully' });
  } catch (err) {
    console.error('Error deleting institution:', err);
    return res.status(500).json({ message: 'Failed to delete institution' });
  }
};
