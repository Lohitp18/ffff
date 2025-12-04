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
  deleteInstitutionUser 
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
const authMiddleware = require('../middlewares/authMiddleware');

// User management routes - accessible to all authenticated users
router.get('/users', authMiddleware, getPendingUsers);        // Get all pending users
router.get('/approved-users', authMiddleware, getApprovedUsers); // Get all approved users
router.get('/blocked-users', authMiddleware, getBlockedUsers); // Get all blocked users
router.patch('/approve/:id', authMiddleware, approveUser);    // Approve user
router.patch('/reject/:id', authMiddleware, rejectUser);      // Reject user
router.patch('/block/:id', authMiddleware, blockUser);        // Block user
router.patch('/unblock/:id', authMiddleware, unblockUser);    // Unblock user

// Institution user management routes
router.get('/institution-users', authMiddleware, getInstitutionUsers); // Get all institution users
router.post('/institution-users', authMiddleware, createInstitutionUser); // Create institution user
router.delete('/institution-users/:id', authMiddleware, deleteInstitutionUser); // Delete institution user

// Content management routes
router.get('/pending-events', authMiddleware, getPendingEvents);
router.get('/pending-opportunities', authMiddleware, getPendingOpportunities);
router.get('/pending-posts', authMiddleware, getPendingPosts);
router.get('/pending-institution-posts', authMiddleware, getPendingInstitutionPosts);
router.get('/approved-events', authMiddleware, getApprovedEvents);
router.get('/approved-opportunities', authMiddleware, getApprovedOpportunities);
router.get('/approved-posts', authMiddleware, getApprovedPosts);
router.get('/approved-institution-posts', authMiddleware, getApprovedInstitutionPostsForAdmin);
router.put('/events/:id/status', authMiddleware, updateEventStatus);
router.put('/opportunities/:id/status', authMiddleware, updateOpportunityStatus);
router.put('/posts/:id/status', authMiddleware, updatePostStatus);
router.put('/institution-posts/:id/status', authMiddleware, updateInstitutionPostStatus);
router.delete('/events/:id', authMiddleware, deleteEvent);
router.delete('/opportunities/:id', authMiddleware, deleteOpportunity);
router.delete('/posts/:id', authMiddleware, deletePost);
router.delete('/institution-posts/:id', authMiddleware, deleteInstitutionPost);

module.exports = router;
