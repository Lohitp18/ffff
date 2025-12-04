const express = require('express');
const { createPost, getFriendsFeed, uploadOptionalImage, toggleLike, reportPost, getMyPosts, updatePost, deletePost, sharePost, getPostsByUserId } = require('../controllers/postController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', authMiddleware, uploadOptionalImage, createPost);
router.post('/share', authMiddleware, sharePost);
router.get('/feed', authMiddleware, getFriendsFeed);
router.get('/user/:userId', getPostsByUserId); // Public endpoint to get posts by user ID
router.patch('/:postId/like', authMiddleware, toggleLike);
router.post('/:postId/report', authMiddleware, reportPost);
router.get('/mine', authMiddleware, getMyPosts);
router.put('/:postId', authMiddleware, uploadOptionalImage, updatePost);
router.delete('/:postId', authMiddleware, deletePost);

module.exports = router;




