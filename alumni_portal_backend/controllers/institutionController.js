const Institution = require('../models/Institution');
const multer = require('multer');
const fs = require('fs');
const { saveBufferToUploads } = require("../utils/localStorage");
const { IMAGE_MIMES } = require("../utils/mediaStorage");

// Configure multer for image uploads (in-memory)
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype && IMAGE_MIMES.has(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error('Only jpg, jpeg, png, or webp images are allowed'));
  }
}).single('image');

/** Upload image to Azure Blob (institution-posts container). */
async function uploadInstitutionImage(buffer, originalname, purpose, userId, mimetype) {
  return saveBufferToUploads(buffer, originalname || 'institution.jpg', 'institution-posts', mimetype || 'image/jpeg', {
    userId: String(userId),
    kind: 'institution-post',
  });
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
    const filePath = path.join(__dirname, '..', 'data', 'enrollmentHierarchy.json');
    const data = fs.readFileSync(filePath, 'utf8');
    const hierarchy = JSON.parse(data);

    // Map hierarchy to simpler institution objects
    const institutions = hierarchy.institutions.map(inst => ({
      name: inst.name,
      email: inst.email,
      establishedYear: inst.establishedYear,
      isActive: true
    })).sort((a, b) => a.name.localeCompare(b.name));

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.json(institutions);
  } catch (err) {
    console.error('Error fetching institutions from JSON:', err);
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
        'logo',
        userId,
        req.file.mimetype
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
        'logo',
        userId,
        req.file.mimetype
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
      'cover',
      req.user._id,
      req.file.mimetype
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
