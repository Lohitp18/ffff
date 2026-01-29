const express = require("express");
const {
  getApprovedEvents,
  createEvent,
  getApprovedOpportunities,
  createOpportunity,
  getApprovedPosts,
  getApprovedInstitutionPosts,
  createInstitutionPost,
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
  uploadOptionalImage,
  uploadInstitutionPost,
  toggleEventLike,
  reportEvent,
  toggleOpportunityLike,
  reportOpportunity,
  toggleInstitutionPostLike,
  reportInstitutionPost,
} = require("../controllers/contentController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// Public routes - get approved content (with optional auth for like info)
// Using a wrapper that makes auth optional
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (token) {
      const jwt = require("jsonwebtoken");
      const User = require("../models/User");
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
      const user = await User.findById(decoded.id).select("-password");
      if (user) {
        req.user = user;
      } else {
        req.user = null;
      }
    } else {
      req.user = null;
    }
    next();
  } catch (error) {
    // If auth fails, just continue without user
    req.user = null;
    next();
  }
};

router.get("/events", optionalAuth, getApprovedEvents);
router.get("/opportunities", optionalAuth, getApprovedOpportunities);
router.get("/posts", optionalAuth, getApprovedPosts);
router.get("/institution-posts", getApprovedInstitutionPosts);

// Protected routes - create content (requires auth)
router.post("/events", authMiddleware, uploadOptionalImage, createEvent);
router.post("/opportunities", authMiddleware, uploadOptionalImage, createOpportunity);
// Institution posts can only be created by admins
const requireAdmin = require("../middlewares/adminMiddleware");
router.post("/institution-posts", requireAdmin, uploadInstitutionPost, createInstitutionPost);

// Like and report routes for events
router.patch("/events/:id/like", authMiddleware, toggleEventLike);
router.post("/events/:id/report", authMiddleware, reportEvent);

// Like and report routes for opportunities
router.patch("/opportunities/:id/like", authMiddleware, toggleOpportunityLike);
router.post("/opportunities/:id/report", authMiddleware, reportOpportunity);

// Like and report routes for institution posts
router.patch("/institution-posts/:id/like", authMiddleware, toggleInstitutionPostLike);
router.post("/institution-posts/:id/report", authMiddleware, reportInstitutionPost);

// Admin routes - manage pending content (accessible to all authenticated users)
router.get("/admin/pending-events", authMiddleware, getPendingEvents);
router.get("/admin/pending-opportunities", authMiddleware, getPendingOpportunities);
router.get("/admin/pending-posts", authMiddleware, getPendingPosts);
router.put("/admin/events/:id/status", authMiddleware, updateEventStatus);
router.put("/admin/posts/:id/status", authMiddleware, updatePostStatus);
router.put("/admin/opportunities/:id/status", authMiddleware, updateOpportunityStatus);

module.exports = router;



