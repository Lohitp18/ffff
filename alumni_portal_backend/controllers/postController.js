const multer = require('multer');
const Post = require('../models/Post');
const Connection = require('../models/Connection');
const Report = require('../models/Report');
const { saveBufferToUploads } = require('../utils/localStorage');
const { IMAGE_MIMES, VIDEO_MIMES, deletePreviousIfOwned } = require('../utils/mediaStorage');

const VALID_REPORT_REASONS = ['spam', 'inappropriate_content', 'harassment', 'false_information', 'copyright_violation', 'other'];

const postMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (IMAGE_MIMES.has(file.mimetype) || VIDEO_MIMES.has(file.mimetype)) return cb(null, true);
    return cb(new Error('Only jpg, jpeg, png, webp, mp4, or mov are allowed'));
  },
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 },
]);

const handlePostMediaUpload = (req, res, next) => {
  postMediaUpload(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large (max 50MB for video, 5MB for images).' });
      }
      return res.status(400).json({ message: err.message || 'Upload failed' });
    }
    next();
  });
};

exports.uploadPostMedia = postMediaUpload;
exports.handlePostMediaUpload = handlePostMediaUpload;
exports.uploadOptionalImage = handlePostMediaUpload;

exports.createPost = async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ message: 'title and content are required' });

    const files = req.files || {};
    const img = files.image && files.image[0];
    const vid = files.video && files.video[0];
    if (img && vid) return res.status(400).json({ message: 'Attach either an image or a video, not both' });

    const uid = req.user._id;
    const isUserAdmin = req.user?.role === 'admin' || req.user?.role === 'superadmin' || req.user?.isAdmin === true ||
      (req.user?.email && (req.user.email.toLowerCase() === 'patgarlohit818@gmail.com' || req.user.email.toLowerCase() === 'admin@alumniportal.com'));

    const data = {
      title,
      content,
      author: req.user?.email,
      authorId: uid,
      userId: uid,
      status: isUserAdmin ? 'approved' : 'pending',
      isAdminPost: Boolean(isUserAdmin),
    };

    const file = img || vid;
    if (file) {
      const url = await saveBufferToUploads(
        file.buffer,
        file.originalname || 'media',
        'post',
        file.mimetype,
        { userId: uid.toString(), kind: 'post' }
      );
      const isVideo = VIDEO_MIMES.has(file.mimetype);
      data.mediaUrl = url;
      data.mediaType = isVideo ? 'video' : 'image';
      if (isVideo) data.videoUrl = url;
      else data.imageUrl = url;
    }

    const post = await Post.create(data);
    return res.status(201).json(post);
  } catch (err) {
    console.error('createPost error', err);
    return res.status(500).json({ message: err.message || 'Failed to create post' });
  }
};

// Feed shows only approved posts by friends (accepted connections)
exports.getFriendsFeed = async (req, res) => {
  try {
    const me = req.user._id;
    const conns = await Connection.find({
      $or: [ { requester: me, status: 'accepted' }, { recipient: me, status: 'accepted' } ]
    }).select('requester recipient');

    const friendIds = new Set();
    conns.forEach(c => {
      if (c.requester.toString() !== me.toString()) friendIds.add(c.requester.toString());
      if (c.recipient.toString() !== me.toString()) friendIds.add(c.recipient.toString());
    });

    const posts = await Post.find({ status: 'approved', authorId: { $in: Array.from(friendIds) } })
      .sort({ createdAt: -1 })
      .limit(100);
    return res.json(posts);
  } catch (err) {
    console.error('getFriendsFeed error', err);
    return res.status(500).json({ message: 'Failed to fetch feed' });
  }
};

// Like/Unlike a post
exports.toggleLike = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const isLiked = post.likes.includes(userId);
    
    if (isLiked) {
      // Unlike
      post.likes.pull(userId);
    } else {
      // Like
      post.likes.push(userId);
    }

    await post.save();

    return res.json({
      liked: !isLiked,
      likeCount: post.likes.length
    });
  } catch (err) {
    console.error('toggleLike error', err);
    return res.status(500).json({ message: 'Failed to toggle like' });
  }
};

// Report a post
exports.reportPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { reason, description } = req.body;
    const userId = req.user._id;

    if (!reason) {
      return res.status(400).json({ message: 'Reason is required' });
    }
    const reasonValue = String(reason).trim().toLowerCase();
    if (!VALID_REPORT_REASONS.includes(reasonValue)) {
      return res.status(400).json({
        message: 'Invalid reason. Allowed: spam, inappropriate_content, harassment, false_information, copyright_violation, other'
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user already reported this post
    const existingReport = await Report.findOne({
      reporterId: userId,
      reportedItemId: postId,
      reportedItemType: 'Post'
    });

    if (existingReport) {
      return res.status(400).json({ message: 'You have already reported this post' });
    }

    const report = await Report.create({
      reporterId: userId,
      reportedItemId: postId,
      reportedItemType: 'Post',
      reason: reasonValue,
      description: description || ''
    });

    return res.status(201).json({ message: 'Post reported successfully', report });
  } catch (err) {
    console.error('reportPost error', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message || 'Report validation failed' });
    }
    return res.status(500).json({ message: 'Failed to report post' });
  }
};

// Get posts created by the authenticated user
exports.getMyPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const posts = await Post.find({ authorId: userId })
      .sort({ createdAt: -1 });
    return res.json(posts);
  } catch (err) {
    console.error('getMyPosts error', err);
    return res.status(500).json({ message: 'Failed to fetch posts' });
  }
};

// Get posts by a specific user ID (public endpoint)
exports.getPostsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const posts = await Post.find({ authorId: userId, status: 'approved' })
      .sort({ createdAt: -1 });
    return res.json(posts);
  } catch (err) {
    console.error('getPostsByUserId error', err);
    return res.status(500).json({ message: 'Failed to fetch posts' });
  }
};

// Update a post (only by owner). Allows title/content and optional image/video replacement
exports.updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;
    const { title, content } = req.body;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.authorId?.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (typeof title === 'string') post.title = title.trim();
    if (typeof content === 'string') post.content = content.trim();

    const files = req.files || {};
    const img = files.image && files.image[0];
    const vid = files.video && files.video[0];
    if (img && vid) return res.status(400).json({ message: 'Attach either an image or a video, not both' });

    const file = img || vid;
    if (file) {
      const prevUrl = post.mediaUrl || post.imageUrl || post.videoUrl;
      const url = await saveBufferToUploads(
        file.buffer,
        file.originalname || 'media',
        'post',
        file.mimetype,
        { userId: userId.toString(), kind: 'post', previousUrl: prevUrl }
      );
      const isVideo = VIDEO_MIMES.has(file.mimetype);
      post.mediaUrl = url;
      post.mediaType = isVideo ? 'video' : 'image';
      if (isVideo) {
        post.videoUrl = url;
        post.imageUrl = undefined;
      } else {
        post.imageUrl = url;
        post.videoUrl = undefined;
      }
    }

    post.status = 'pending';

    await post.save();
    return res.json(post);
  } catch (err) {
    console.error('updatePost error', err);
    return res.status(500).json({ message: err.message || 'Failed to update post' });
  }
};

// Delete a post (only by owner)
exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const isOwner = post.authorId?.toString() === userId.toString();
    const isAdmin = req.user.isAdmin === true || req.user.role === 'admin' || req.user.role === 'instituteadmin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const urls = [...new Set([post.mediaUrl, post.imageUrl, post.videoUrl].filter(Boolean))];
    for (const u of urls) {
      try {
        await deletePreviousIfOwned(u, userId.toString());
      } catch (e) {
        // Non-fatal cleanup failure; do not log unless it impacts request
      }
    }

    await Post.findByIdAndDelete(postId);
    return res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error('deletePost error', err);
    return res.status(500).json({ message: 'Failed to delete post' });
  }
};

// Share a post (creates a new pending post)
exports.sharePost = async (req, res) => {
  try {
    const { title, content, originalPostId, originalPostType } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: 'title and content are required' });
    }

    const data = {
      title,
      content,
      author: req.user?.email,
      authorId: req.user?._id,
      userId: req.user?._id,
      status: 'pending', // Shared posts need admin approval
      sharedFrom: {
        postId: originalPostId,
        postType: originalPostType
      }
    };

    const post = await Post.create(data);
    return res.status(201).json(post);
  } catch (err) {
    console.error('sharePost error', err);
    return res.status(500).json({ message: 'Failed to share post' });
  }
};




