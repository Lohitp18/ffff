const Event = require("../models/Event");
const Opportunity = require("../models/Opportunity");
const Post = require("../models/Post");
const InstitutionPost = require("../models/InstitutionPost");
const { createNotification } = require("./notificationController");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Optional image upload middleware
const uploadOptional = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
}).single("image");

// Upload middleware for institution posts (accepts both images and videos)
const uploadInstitutionPostMiddleware = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for videos
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image and video files are allowed"), false);
    }
  },
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]);

const listApproved = async (Model, res, userId = null) => {
  let items;
  
  // For posts, get all posts (approved and pending) for home page
  if (Model.modelName === 'Post') {
    items = await Model.find({})
      .populate('authorId', 'name profileImage headline')
      .sort({ createdAt: -1 })
      .limit(50);
  } else if (Model.modelName === 'InstitutionPost') {
    // InstitutionPost doesn't have postedBy field
    items = await Model.find({ status: "approved" })
      .sort({ createdAt: -1 })
      .limit(50);
  } else {
    // For other content types (Event, Opportunity), only show approved
    items = await Model.find({ status: "approved" })
      .populate('postedBy', 'name profileImage headline')
      .sort({ createdAt: -1 })
      .limit(50);
  }
  
  // For posts, add like information
  if (Model.modelName === 'Post') {
    items = items.map(post => {
      const postObj = post.toObject();
      postObj.isLiked = userId ? post.likes.includes(userId) : false;
      postObj.likeCount = post.likes.length;
      postObj.category = 'Post';
      return postObj;
    });
  } else if (Model.modelName === 'Event') {
    items = items.map(e => {
      const eventObj = e.toObject();
      eventObj.category = 'Event';
      eventObj.isLiked = userId ? e.likes.includes(userId) : false;
      eventObj.likeCount = e.likes.length;
      return eventObj;
    });
  } else if (Model.modelName === 'Opportunity') {
    items = items.map(o => {
      const oppObj = o.toObject();
      oppObj.category = 'Opportunity';
      oppObj.isLiked = userId ? o.likes.includes(userId) : false;
      oppObj.likeCount = o.likes.length;
      return oppObj;
    });
  } else if (Model.modelName === 'InstitutionPost') {
    items = items.map(ip => ({ ...ip.toObject(), category: 'InstitutionPost' }));
  }
  
  return res.json(items);
};

module.exports = {
  getApprovedEvents: async (req, res) => {
    try {
      const userId = req.user?._id?.toString() || null;
      const events = await Event.find({ status: "approved" })
        .populate('postedBy', 'name profileImage headline email')
        .sort({ createdAt: -1 })
        .limit(100);
      
      const eventsWithLikes = events.map(e => {
        const eventObj = e.toObject();
        eventObj.category = 'Event';
        eventObj.isLiked = userId ? e.likes.includes(userId) : false;
        eventObj.likeCount = e.likes.length;
        return eventObj;
      });
      
      return res.json(eventsWithLikes);
    } catch (err) {
      console.error("getApprovedEvents error", err);
      return res.status(500).json({ message: "Failed to fetch approved events" });
    }
  },

  createEvent: async (req, res) => {
    try {
      const { title, description, date, location, status } = req.body;
      if (!title || !description || !date) {
        return res.status(400).json({ message: "title, description, date are required" });
      }
      
      const eventData = {
        title,
        description,
        date,
        location: location || null,
        status: status || "pending",
        postedBy: req.user?.id,
      };

      if (req.file) {
        eventData.imageUrl = `/uploads/${req.file.filename}`;
      }

      const event = await Event.create(eventData);
      return res.status(201).json(event);
    } catch (err) {
      console.error("createEvent error", err);
      return res.status(500).json({ message: "Failed to create event" });
    }
  },

  createOpportunity: async (req, res) => {
    try {
      const { title, description, company, applyLink, type, status } = req.body;
      if (!title || !description) {
        return res.status(400).json({ message: "title and description are required" });
      }

      const opportunityData = {
        title,
        description,
        company: company || null,
        applyLink: applyLink || null,
        type: type || null,
        status: status || "pending",
        postedBy: req.user?.id,
      };

      if (req.file) {
        opportunityData.imageUrl = `/uploads/${req.file.filename}`;
      }

      const opportunity = await Opportunity.create(opportunityData);
      return res.status(201).json(opportunity);
    } catch (err) {
      console.error("createOpportunity error", err);
      return res.status(500).json({ message: "Failed to create opportunity" });
    }
  },

  getApprovedOpportunities: async (req, res) => {
    try {
      const userId = req.user?._id?.toString() || null;
      const opportunities = await Opportunity.find({ status: "approved" })
        .populate('postedBy', 'name profileImage headline email')
        .sort({ createdAt: -1 })
        .limit(100);
      
      const oppsWithLikes = opportunities.map(o => {
        const oppObj = o.toObject();
        oppObj.category = 'Opportunity';
        oppObj.isLiked = userId ? o.likes.includes(userId) : false;
        oppObj.likeCount = o.likes.length;
        return oppObj;
      });
      
      return res.json(oppsWithLikes);
    } catch (err) {
      console.error("getApprovedOpportunities error", err);
      return res.status(500).json({ message: "Failed to fetch approved opportunities" });
    }
  },
  getApprovedPosts: async (req, res) => {
    try {
      const userId = req.user?._id?.toString() || null;
      // For admin, only return approved posts
      const posts = await Post.find({ status: "approved" })
        .populate('authorId', 'name profileImage headline email')
        .sort({ createdAt: -1 })
        .limit(100);
      
      const postsWithLikes = posts.map(post => {
        const postObj = post.toObject();
        postObj.isLiked = userId ? post.likes.includes(userId) : false;
        postObj.likeCount = post.likes.length;
        postObj.category = 'Post';
        return postObj;
      });
      
      return res.json(postsWithLikes);
    } catch (err) {
      console.error("getApprovedPosts error", err);
      return res.status(500).json({ message: "Failed to fetch approved posts" });
    }
  },
  getApprovedInstitutionPosts: async (_req, res) => listApproved(InstitutionPost, res),
  createInstitutionPost: async (req, res) => {
    try {
      const { institution, title, content, status } = req.body;
      if (!institution || !title || !content) {
        return res.status(400).json({ message: "institution, title, content are required" });
      }
      const data = {
        institution,
        title,
        content,
        status: status || "approved", // admin-created posts can be approved immediately
      };
      
      // Handle image upload (from req.files.image or req.file for backward compatibility)
      if (req.files && req.files.image && req.files.image[0]) {
        data.imageUrl = `/uploads/${req.files.image[0].filename}`;
      } else if (req.file) {
        data.imageUrl = `/uploads/${req.file.filename}`;
      }
      
      // Handle video upload
      if (req.files && req.files.video && req.files.video[0]) {
        data.videoUrl = `/uploads/${req.files.video[0].filename}`;
      }
      
      const post = await InstitutionPost.create(data);
      
      // Create notification for institution post (since it's approved immediately)
      await createNotification(
        'institution_post',
        'New Institution Post',
        `A new post from ${institution}: "${title}"`,
        post._id,
        'InstitutionPost',
        { institution: institution }
      );
      
      return res.status(201).json(post);
    } catch (err) {
      console.error("createInstitutionPost error", err);
      return res.status(500).json({ message: "Failed to create institution post" });
    }
  },

  getPendingEvents: async (_req, res) => {
    try {
      const events = await Event.find({ status: "pending" })
        .populate("postedBy", "name email profileImage headline")
        .sort({ createdAt: -1 });
      return res.json(events);
    } catch (err) {
      console.error("getPendingEvents error", err);
      return res.status(500).json({ message: "Failed to fetch pending events" });
    }
  },

  getPendingOpportunities: async (_req, res) => {
    try {
      const opportunities = await Opportunity.find({ status: "pending" })
        .populate("postedBy", "name email profileImage headline")
        .sort({ createdAt: -1 });
      return res.json(opportunities);
    } catch (err) {
      console.error("getPendingOpportunities error", err);
      return res.status(500).json({ message: "Failed to fetch pending opportunities" });
    }
  },

  getPendingPosts: async (_req, res) => {
    try {
      const posts = await Post.find({ status: "pending" })
        .populate('authorId', 'name profileImage headline email')
        .sort({ createdAt: -1 });
      return res.json(posts);
    } catch (err) {
      console.error("getPendingPosts error", err);
      return res.status(500).json({ message: "Failed to fetch pending posts" });
    }
  },

  getPendingInstitutionPosts: async (_req, res) => {
    try {
      const posts = await InstitutionPost.find({ status: "pending" })
        .sort({ createdAt: -1 });
      return res.json(posts);
    } catch (err) {
      console.error("getPendingInstitutionPosts error", err);
      return res.status(500).json({ message: "Failed to fetch pending institution posts" });
    }
  },

  getApprovedInstitutionPostsForAdmin: async (_req, res) => {
    try {
      const posts = await InstitutionPost.find({ status: "approved" })
        .sort({ createdAt: -1 });
      return res.json(posts);
    } catch (err) {
      console.error("getApprovedInstitutionPostsForAdmin error", err);
      return res.status(500).json({ message: "Failed to fetch approved institution posts" });
    }
  },

  updateInstitutionPostStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
      }

      const post = await InstitutionPost.findByIdAndUpdate(id, { status }, { new: true });

      if (!post) return res.status(404).json({ message: "Institution post not found" });

      return res.json(post);
    } catch (err) {
      console.error("updateInstitutionPostStatus error", err);
      return res.status(500).json({ message: "Failed to update institution post status" });
    }
  },

  deleteInstitutionPost: async (req, res) => {
    try {
      const { id } = req.params;
      const post = await InstitutionPost.findByIdAndDelete(id);
      if (!post) return res.status(404).json({ message: "Institution post not found" });
      return res.json({ message: "Institution post deleted successfully" });
    } catch (err) {
      console.error("deleteInstitutionPost error", err);
      return res.status(500).json({ message: "Failed to delete institution post" });
    }
  },

  updateEventStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
      }

      const event = await Event.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      ).populate("postedBy", "name email");

      if (!event) return res.status(404).json({ message: "Event not found" });

      // Create notification when event is approved
      if (status === "approved") {
        await createNotification(
          'event',
          'New Event Available',
          `A new event "${event.title}" has been posted`,
          event._id,
          'Event',
          { postedBy: event.postedBy }
        );
      }

      return res.json(event);
    } catch (err) {
      console.error("updateEventStatus error", err);
      return res.status(500).json({ message: "Failed to update event status" });
    }
  },

  updateOpportunityStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
      }

      const opportunity = await Opportunity.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      ).populate("postedBy", "name email");

      if (!opportunity) return res.status(404).json({ message: "Opportunity not found" });

      // Create notification when opportunity is approved
      if (status === "approved") {
        await createNotification(
          'opportunity',
          'New Opportunity Available',
          `A new opportunity "${opportunity.title}" has been posted`,
          opportunity._id,
          'Opportunity',
          { postedBy: opportunity.postedBy }
        );
      }

      return res.json(opportunity);
    } catch (err) {
      console.error("updateOpportunityStatus error", err);
      return res.status(500).json({ message: "Failed to update opportunity status" });
    }
  },

  updatePostStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
      }

      const post = await Post.findByIdAndUpdate(id, { status }, { new: true });

      if (!post) return res.status(404).json({ message: "Post not found" });

      // Create notification when post is approved
      if (status === "approved") {
        await createNotification(
          'post',
          'New Post Available',
          `A new post "${post.title}" has been posted`,
          post._id,
          'Post',
          { postedBy: post.authorId }
        );
      }

      return res.json(post);
    } catch (err) {
      console.error("updatePostStatus error", err);
      return res.status(500).json({ message: "Failed to update post status" });
    }
  },

  deleteEvent: async (req, res) => {
    try {
      const { id } = req.params;
      const event = await Event.findByIdAndDelete(id);
      if (!event) return res.status(404).json({ message: "Event not found" });
      return res.json({ message: "Event deleted successfully" });
    } catch (err) {
      console.error("deleteEvent error", err);
      return res.status(500).json({ message: "Failed to delete event" });
    }
  },

  deleteOpportunity: async (req, res) => {
    try {
      const { id } = req.params;
      const opportunity = await Opportunity.findByIdAndDelete(id);
      if (!opportunity) return res.status(404).json({ message: "Opportunity not found" });
      return res.json({ message: "Opportunity deleted successfully" });
    } catch (err) {
      console.error("deleteOpportunity error", err);
      return res.status(500).json({ message: "Failed to delete opportunity" });
    }
  },

  deletePost: async (req, res) => {
    try {
      const { id } = req.params;
      const post = await Post.findByIdAndDelete(id);
      if (!post) return res.status(404).json({ message: "Post not found" });
      return res.json({ message: "Post deleted successfully" });
    } catch (err) {
      console.error("deletePost error", err);
      return res.status(500).json({ message: "Failed to delete post" });
    }
  },

  // Middleware for optional image upload
  uploadOptionalImage: (req, res, next) => {
    uploadOptional(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "File too large. Maximum size is 5MB." });
        }
        return res.status(400).json({ message: err.message });
      } else if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  
  // Middleware for institution post uploads (images and videos)
  uploadInstitutionPost: (req, res, next) => {
    uploadInstitutionPostMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "File too large. Maximum size is 100MB." });
        }
        return res.status(400).json({ message: err.message });
      } else if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },

  upload, // Export multer middleware

  // Like/Unlike an event
  toggleEventLike: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const event = await Event.findById(id);
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      const isLiked = event.likes.includes(userId);
      
      if (isLiked) {
        event.likes.pull(userId);
      } else {
        event.likes.push(userId);
      }

      await event.save();

      return res.json({
        liked: !isLiked,
        likeCount: event.likes.length
      });
    } catch (err) {
      console.error('toggleEventLike error', err);
      return res.status(500).json({ message: 'Failed to toggle like' });
    }
  },

  // Report an event
  reportEvent: async (req, res) => {
    try {
      const { id } = req.params;
      const { reason, description } = req.body;
      const userId = req.user._id;

      if (!reason) {
        return res.status(400).json({ message: 'Reason is required' });
      }

      const event = await Event.findById(id);
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      const Report = require('../models/Report');
      const existingReport = await Report.findOne({
        reporterId: userId,
        reportedItemId: id,
        reportedItemType: 'Event'
      });

      if (existingReport) {
        return res.status(400).json({ message: 'You have already reported this event' });
      }

      const report = await Report.create({
        reporterId: userId,
        reportedItemId: id,
        reportedItemType: 'Event',
        reason,
        description: description || ''
      });

      return res.status(201).json({ message: 'Event reported successfully', report });
    } catch (err) {
      console.error('reportEvent error', err);
      return res.status(500).json({ message: 'Failed to report event' });
    }
  },

  // Like/Unlike an opportunity
  toggleOpportunityLike: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({ message: 'Opportunity not found' });
      }

      const isLiked = opportunity.likes.includes(userId);
      
      if (isLiked) {
        opportunity.likes.pull(userId);
      } else {
        opportunity.likes.push(userId);
      }

      await opportunity.save();

      return res.json({
        liked: !isLiked,
        likeCount: opportunity.likes.length
      });
    } catch (err) {
      console.error('toggleOpportunityLike error', err);
      return res.status(500).json({ message: 'Failed to toggle like' });
    }
  },

  // Report an opportunity
  reportOpportunity: async (req, res) => {
    try {
      const { id } = req.params;
      const { reason, description } = req.body;
      const userId = req.user._id;

      if (!reason) {
        return res.status(400).json({ message: 'Reason is required' });
      }

      const opportunity = await Opportunity.findById(id);
      if (!opportunity) {
        return res.status(404).json({ message: 'Opportunity not found' });
      }

      const Report = require('../models/Report');
      const existingReport = await Report.findOne({
        reporterId: userId,
        reportedItemId: id,
        reportedItemType: 'Opportunity'
      });

      if (existingReport) {
        return res.status(400).json({ message: 'You have already reported this opportunity' });
      }

      const report = await Report.create({
        reporterId: userId,
        reportedItemId: id,
        reportedItemType: 'Opportunity',
        reason,
        description: description || ''
      });

      return res.status(201).json({ message: 'Opportunity reported successfully', report });
    } catch (err) {
      console.error('reportOpportunity error', err);
      return res.status(500).json({ message: 'Failed to report opportunity' });
    }
  },
};
