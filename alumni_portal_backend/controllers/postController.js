const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Post = require('../models/Post');
const Connection = require('../models/Connection');
const Report = require('../models/Report');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'post-' + unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

exports.uploadOptionalImage = upload.single('image');

exports.createPost = async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ message: 'title and content are required' });

    const data = {
      title,
      content,
      author: req.user?.email,
      authorId: req.user?._id,
      status: 'pending',
    };
    if (req.file) data.imageUrl = `/uploads/${req.file.filename}`;

    const post = await Post.create(data);
    return res.status(201).json(post);
  } catch (err) {
    console.error('createPost error', err);
    return res.status(500).json({ message: 'Failed to create post' });
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

    // Create report
    const report = await Report.create({
      reporterId: userId,
      reportedItemId: postId,
      reportedItemType: 'Post',
      reason,
      description: description || ''
    });

    return res.status(201).json({ message: 'Post reported successfully', report });
  } catch (err) {
    console.error('reportPost error', err);
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

// Update a post (only by owner). Allows title/content and optional image replacement
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
    if (req.file) post.imageUrl = `/uploads/${req.file.filename}`;

    // Changing content moves it back to pending for re-approval
    post.status = 'pending';

    await post.save();
    return res.json(post);
  } catch (err) {
    console.error('updatePost error', err);
    return res.status(500).json({ message: 'Failed to update post' });
  }
};

// Delete a post (only by owner)
exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.authorId?.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
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




