const express = require('express');
const router = express.Router();
const {
  getPendingUsers,
  getApprovedUsers,
  approveUser,
  rejectUser,
  blockUser,
  unblockUser,
  getBlockedUsers,
  getInstitutionUsers,
  createInstitutionUser,
  deleteInstitutionUser,
  getAllUsersFullData,
  getDetailedStatistics
} = require('../controllers/adminController');
const {
  getPendingEvents,
  getPendingOpportunities,
  getPendingPosts,
  getPendingInstitutionPosts,
  getApprovedInstitutionPostsForAdmin,
  updateEventStatus,
  updateOpportunityStatus,
  updatePostStatus,
  updateInstitutionPostStatus,
  deleteInstitutionPost,
  getApprovedEvents,
  getApprovedOpportunities,
  getApprovedPosts,
  deleteEvent,
  deleteOpportunity,
  deletePost
} = require('../controllers/contentController');
const requireAdmin = require('../middlewares/adminMiddleware');
const { exportRSVPs, listRSVPs } = require('../controllers/rsvpController');
const {
  exportStudentsCSV,
  exportStudentCSV,
  exportStudentsPDF,
  exportStudentPDF,
} = require('../controllers/studentExportController');

// User management routes - accessible to all authenticated users
router.get('/users', requireAdmin, getPendingUsers);        // Get all pending users
router.get('/approved-users', requireAdmin, getApprovedUsers); // Get all approved users
router.get('/blocked-users', requireAdmin, getBlockedUsers); // Get all blocked users
router.patch('/approve/:id', requireAdmin, approveUser);    // Approve user
router.patch('/approve-user/:id', requireAdmin, approveUser); // Alias (spec)
router.patch('/reject/:id', requireAdmin, rejectUser);      // Reject user
router.patch('/block/:id', requireAdmin, blockUser);        // Block user
router.patch('/unblock/:id', requireAdmin, unblockUser);    // Unblock user

// Institution user management routes
router.get('/institution-users', requireAdmin, getInstitutionUsers); // Get all institution users
router.post('/institution-users', requireAdmin, createInstitutionUser); // Create institution user
router.delete('/institution-users/:id', requireAdmin, deleteInstitutionUser); // Delete institution user

// Super Admin extra routes
router.get('/all-users-data', requireAdmin, getAllUsersFullData);
router.get('/detailed-stats', requireAdmin, getDetailedStatistics);

// Content management routes
router.get('/pending-events', requireAdmin, getPendingEvents);
router.get('/pending-opportunities', requireAdmin, getPendingOpportunities);
router.get('/pending-posts', requireAdmin, getPendingPosts);
router.get('/pending-institution-posts', requireAdmin, getPendingInstitutionPosts);
router.get('/approved-events', requireAdmin, getApprovedEvents);
router.get('/approved-opportunities', requireAdmin, getApprovedOpportunities);
router.get('/approved-posts', requireAdmin, getApprovedPosts);
router.get('/approved-institution-posts', requireAdmin, getApprovedInstitutionPostsForAdmin);
router.put('/events/:id/status', requireAdmin, updateEventStatus);
router.put('/opportunities/:id/status', requireAdmin, updateOpportunityStatus);
router.put('/posts/:id/status', requireAdmin, updatePostStatus);
router.put('/institution-posts/:id/status', requireAdmin, updateInstitutionPostStatus);
router.delete('/events/:id', requireAdmin, deleteEvent);
router.delete('/opportunities/:id', requireAdmin, deleteOpportunity);
router.delete('/posts/:id', requireAdmin, deletePost);
router.delete('/institution-posts/:id', requireAdmin, deleteInstitutionPost);

// RSVP list & export
router.get('/rsvps', requireAdmin, listRSVPs);
router.get('/rsvps/export', requireAdmin, exportRSVPs);

// Registered student profile exports (CSV for Excel + PDF)
router.get('/students/export/csv', requireAdmin, exportStudentsCSV);
router.get('/students/export/pdf', requireAdmin, exportStudentsPDF);
router.get('/students/:id/export/csv', requireAdmin, exportStudentCSV);
router.get('/students/:id/export/pdf', requireAdmin, exportStudentPDF);

module.exports = router;
