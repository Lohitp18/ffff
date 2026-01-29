const express = require('express');
const {
  getAllInstitutions,
  getInstitutionByName,
  createInstitution,
  updateInstitution,
  updateCoverImage,
  deleteInstitution,
  handleImageUpload
} = require('../controllers/institutionController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

const router = express.Router();

// Public routes
router.get('/', getAllInstitutions);
router.get('/:name', getInstitutionByName);

// Admin routes (require authentication and admin role)
router.post('/', authMiddleware, adminMiddleware, handleImageUpload, createInstitution);
router.put('/:id', authMiddleware, adminMiddleware, handleImageUpload, updateInstitution);
router.put('/:id/cover-image', authMiddleware, adminMiddleware, handleImageUpload, updateCoverImage);
router.delete('/:id', authMiddleware, adminMiddleware, deleteInstitution);

module.exports = router;
