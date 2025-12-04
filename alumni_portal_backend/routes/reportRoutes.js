const express = require('express');
const router = express.Router();
const {
  getAllReports,
  updateReportStatus,
  getReportStats
} = require('../controllers/reportController');
const authMiddleware = require('../middlewares/authMiddleware');

// All report routes require authentication only (accessible to all authenticated users)
router.use(authMiddleware);

// Get all reports
router.get('/', getAllReports);

// Get report statistics
router.get('/stats', getReportStats);

// Update report status
router.patch('/:reportId/status', updateReportStatus);

module.exports = router;
