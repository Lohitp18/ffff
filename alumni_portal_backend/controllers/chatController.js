const mongoose = require('mongoose');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Connection = require('../models/Connection');
const User = require('../models/User');

// Helper: Get list of accepted connected friend IDs for a user
const getAcceptedFriendIds = async (userId) => {
  const connections = await Connection.find({
    status: 'accepted',
    $or: [{ requester: userId }, { recipient: userId }],
  });

  const friendIds = [];
  connections.forEach((conn) => {
    if (conn.requester.toString() === userId.toString()) {
      friendIds.push(conn.recipient.toString());
    } else {
      friendIds.push(conn.requester.toString());
    }
  });

  return friendIds;
};

// GET /api/chat/connected-friends - Only return users who are accepted connections
exports.getConnectedFriends = async (req, res) => {
  try {
    const userId = req.user._id;
    const friendIds = await getAcceptedFriendIds(userId);

    if (friendIds.length === 0) {
      return res.json([]);
    }

    const friends = await User.find({
      _id: { $in: friendIds },
    }).select('name username profileImage headline institution course year location');

    return res.json(friends);
  } catch (error) {
    console.error('getConnectedFriends error:', error);
    return res.status(500).json({ message: 'Failed to fetch connected friends' });
  }
};

// GET /api/chat/conversations - List all chats (direct and group) for the current user
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const chats = await Chat.find({
      participants: userId,
    })
      .populate('participants', 'name username profileImage headline institution course year')
      .populate('admin', 'name username profileImage')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'name profileImage',
        },
      })
      .sort({ lastMessageAt: -1 });

    return res.json(chats);
  } catch (error) {
    console.error('getConversations error:', error);
    return res.status(500).json({ message: 'Failed to fetch conversations' });
  }
};

// POST /api/chat/direct - Start or retrieve direct 1-on-1 chat with a connected friend
exports.startDirectChat = async (req, res) => {
  try {
    const userId = req.user._id;
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({ message: 'friendId is required' });
    }

    if (friendId.toString() === userId.toString()) {
      return res.status(400).json({ message: 'Cannot start chat with yourself' });
    }

    // Verify they are connected friends!
    const isFriend = await Connection.findOne({
      status: 'accepted',
      $or: [
        { requester: userId, recipient: friendId },
        { requester: friendId, recipient: userId },
      ],
    });

    if (!isFriend) {
      return res.status(403).json({
        message: 'You can only chat with connected friends. Please connect first.',
      });
    }

    // Check if direct conversation already exists
    let chat = await Chat.findOne({
      type: 'direct',
      participants: { $all: [userId, friendId], $size: 2 },
    })
      .populate('participants', 'name username profileImage headline institution course year')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name profileImage' },
      });

    if (!chat) {
      chat = await Chat.create({
        type: 'direct',
        participants: [userId, friendId],
        lastMessageAt: new Date(),
      });

      chat = await Chat.findById(chat._id)
        .populate('participants', 'name username profileImage headline institution course year');
    }

    return res.status(200).json(chat);
  } catch (error) {
    console.error('startDirectChat error:', error);
    return res.status(500).json({ message: 'Failed to initiate direct chat' });
  }
};

// POST /api/chat/group - Create a group chat ONLY with connected friends
exports.createGroupChat = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, description, memberIds } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ message: 'Please select at least one connected friend to create a group' });
    }

    // Strict validation: Verify ALL selected members are accepted connected friends of the caller
    const acceptedFriendIds = await getAcceptedFriendIds(userId);
    const friendSet = new Set(acceptedFriendIds.map((id) => id.toString()));

    const invalidMembers = memberIds.filter(
      (mId) => !friendSet.has(mId.toString()) && mId.toString() !== userId.toString()
    );

    if (invalidMembers.length > 0) {
      return res.status(403).json({
        message: 'Groups can only be created with your connected friends',
      });
    }

    // Unique participants including creator
    const participantIds = Array.from(
      new Set([userId.toString(), ...memberIds.map((id) => id.toString())])
    );

    const groupChat = await Chat.create({
      type: 'group',
      name: name.trim(),
      description: description ? description.trim() : '',
      admin: userId,
      participants: participantIds,
      lastMessageAt: new Date(),
    });

    const populatedGroup = await Chat.findById(groupChat._id)
      .populate('participants', 'name username profileImage headline institution course year')
      .populate('admin', 'name username profileImage');

    return res.status(201).json(populatedGroup);
  } catch (error) {
    console.error('createGroupChat error:', error);
    return res.status(500).json({ message: 'Failed to create group chat' });
  }
};

// GET /api/chat/:chatId/messages - Fetch messages for a conversation
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { chatId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: 'Invalid chat ID' });
    }

    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId,
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found or access denied' });
    }

    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'name username profileImage headline')
      .sort({ createdAt: 1 })
      .limit(200);

    // Mark messages as read for this user
    await Message.updateMany(
      { chat: chatId, sender: { $ne: userId }, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );

    return res.json(messages);
  } catch (error) {
    console.error('getMessages error:', error);
    return res.status(500).json({ message: 'Failed to fetch messages' });
  }
};

// POST /api/chat/:chatId/messages - Send a message in a conversation
exports.sendMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { chatId } = req.params;
    const { text, attachments } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Message text cannot be empty' });
    }

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: 'Invalid chat ID' });
    }

    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId,
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found or access denied' });
    }

    const isEncrypted = typeof text === 'string' && text.startsWith('enc:');
    const message = await Message.create({
      chat: chatId,
      sender: userId,
      text: text.trim(),
      isEncrypted,
      encryptionVersion: isEncrypted ? 'v1' : 'none',
      attachments: Array.isArray(attachments) ? attachments : [],
      readBy: [userId],
    });

    // Update chat last message timestamp
    chat.lastMessage = message._id;
    chat.lastMessageAt = new Date();
    await chat.save();

    const populatedMessage = await Message.findById(message._id).populate(
      'sender',
      'name username profileImage headline'
    );

    return res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('sendMessage error:', error);
    return res.status(500).json({ message: 'Failed to send message' });
  }
};

// GET /api/chat/:chatId - Get single chat details
exports.getChatDetails = async (req, res) => {
  try {
    const userId = req.user._id;
    const { chatId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: 'Invalid chat ID' });
    }

    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId,
    })
      .populate('participants', 'name username profileImage headline institution course year email location')
      .populate('admin', 'name username profileImage');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    return res.json(chat);
  } catch (error) {
    console.error('getChatDetails error:', error);
    return res.status(500).json({ message: 'Failed to fetch chat details' });
  }
};
