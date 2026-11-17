const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
  getConnectedFriends,
  getConversations,
  startDirectChat,
  createGroupChat,
  getMessages,
  sendMessage,
  getChatDetails,
} = require('../controllers/chatController');

// All chat routes require authentication
router.use(authMiddleware);

// Get list of connected friends (for starting chat / adding to group)
router.get('/connected-friends', getConnectedFriends);

// Conversations (direct & groups)
router.get('/conversations', getConversations);
router.post('/direct', startDirectChat);
router.post('/group', createGroupChat);

// Specific chat routes
router.get('/:chatId', getChatDetails);
router.get('/:chatId/messages', getMessages);
router.post('/:chatId/messages', sendMessage);

module.exports = router;
