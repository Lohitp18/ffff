const User = require('../models/User');
const Post = require('../models/Post');
const Event = require('../models/Event');
const Opportunity = require('../models/Opportunity');
const InstitutionPost = require('../models/InstitutionPost');
const Report = require('../models/Report');
const Institution = require('../models/Institution');
const bcrypt = require('bcryptjs');
const { sendApprovalEmail, sendRejectionEmail } = require('../utils/emailService');
const { sendAccountApprovedSms } = require('../services/dosnetSms');
const { sendAccountApprovedWhatsApp } = require('../services/whatsappService');

/**
 * Get all pending users
 */
exports.getPendingUsers = async (req, res) => {
  try {
    const users = await User.find({ status: 'pending' }).select('-password').lean();
    return res.json(users);
  } catch (err) {
    console.error('Error fetching pending users:', err);
    return res.status(500).json({
      message: 'Failed to fetch pending users',
      error: err.message
    });
  }
};

/**
 * Get all approved users
 */
exports.getApprovedUsers = async (req, res) => {
  try {
    const users = await User.find({ status: 'approved' }).select('-password').lean();
    return res.json(users);
  } catch (err) {
    console.error('Error fetching approved users:', err);
    return res.status(500).json({
      message: 'Failed to fetch approved users',
      error: err.message
    });
  }
};

/**
 * Approve a user account
 * - Finds user by ID
 * - Updates status to "approved"
 * - Sends approval email to user
 * - Returns success response
 */
exports.approveUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Validate user ID
    if (!userId) {
      return res.status(400).json({
        message: 'User ID is required'
      });
    }

    // Find and update user status
    const user = await User.findByIdAndUpdate(
      userId,
      { status: 'approved' },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Send approval email (non-blocking)
    try {
      const emailResult = await sendApprovalEmail(user.email, user.name);

      if (!emailResult.success) {
        console.error(`❌ Failed to send approval email to ${user.email}:`, emailResult.error);
        // Log error but don't fail the approval process
      }
    } catch (emailError) {
      console.error('Error sending approval email (non-blocking):', emailError);
      // Don't fail the approval if email fails
    }

    // Send approval SMS + WhatsApp to registered mobile (non-blocking; channels log [SMS:*] / [WhatsApp:*])
    if (user.phone && String(user.phone).replace(/\D/g, '').length >= 10) {
      try {
        await sendAccountApprovedSms(user.phone, user.name);
      } catch (error) {
        console.error(`[admin:approveUser] approval SMS threw for user ${userId}:`, error.message || error);
      }
      try {
        await sendAccountApprovedWhatsApp(user.phone, user.name);
      } catch (error) {
        console.error(`[admin:approveUser] approval WhatsApp threw for user ${userId}:`, error.message || error);
      }
    }

    return res.json({
      success: true,
      message: 'User approved successfully',
      user: user
    });
  } catch (err) {
    console.error('Error approving user:', err);
    return res.status(500).json({
      message: 'Failed to approve user',
      error: err.message
    });
  }
};

/**
 * Reject a user account
 * - Finds user by ID
 * - Updates status to "rejected"
 * - Sends rejection email to user
 * - Returns success response
 */
exports.rejectUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Validate user ID
    if (!userId) {
      return res.status(400).json({
        message: 'User ID is required'
      });
    }

    // Find and update user status
    const user = await User.findByIdAndUpdate(
      userId,
      { status: 'rejected' },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Send rejection email (non-blocking)
    try {
      const emailResult = await sendRejectionEmail(user.email, user.name);

      if (!emailResult.success) {
        console.error(`❌ Failed to send rejection email to ${user.email}:`, emailResult.error);
        // Log error but don't fail the rejection process
      }
    } catch (emailError) {
      console.error('Error sending rejection email (non-blocking):', emailError);
      // Don't fail the rejection if email fails
    }

    return res.json({
      success: true,
      message: 'User rejected successfully',
      user: user
    });
  } catch (err) {
    console.error('Error rejecting user:', err);
    return res.status(500).json({
      message: 'Failed to reject user',
      error: err.message
    });
  }
};

/**
 * Block a user
 */
exports.blockUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findByIdAndUpdate(
      userId,
      { status: 'blocked' },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      message: 'User blocked successfully',
      user
    });
  } catch (err) {
    console.error('Error blocking user:', err);
    return res.status(500).json({
      message: 'Failed to block user',
      error: err.message
    });
  }
};

/**
 * Unblock a user
 */
exports.unblockUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findByIdAndUpdate(
      userId,
      { status: 'approved' },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      message: 'User unblocked successfully',
      user
    });
  } catch (err) {
    console.error('Error unblocking user:', err);
    return res.status(500).json({
      message: 'Failed to unblock user',
      error: err.message
    });
  }
};

/**
 * Get all blocked users
 */
exports.getBlockedUsers = async (req, res) => {
  try {
    const users = await User.find({ status: 'blocked' }).select('-password').lean();
    return res.json(users);
  } catch (err) {
    console.error('Error fetching blocked users:', err);
    return res.status(500).json({
      message: 'Failed to fetch blocked users',
      error: err.message
    });
  }
};

/**
 * Get all institution users
 */
exports.getInstitutionUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'institution' }).select('-password').lean();
    return res.json(users);
  } catch (err) {
    console.error('Error fetching institution users:', err);
    return res.status(500).json({
      message: 'Failed to fetch institution users',
      error: err.message
    });
  }
};

/**
 * Create institution user
 */
exports.createInstitutionUser = async (req, res) => {
  try {
    const { institution, email, password } = req.body;

    if (!institution || !email || !password) {
      return res.status(400).json({
        error: 'Institution, email, and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        error: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create institution user
    const user = await User.create({
      name: institution,
      email,
      password: hashedPassword,
      role: 'institution',
      status: 'approved', // Institution users are auto-approved
      institution: institution,
    });

    // Return user without password
    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json(userObj);
  } catch (err) {
    console.error('Error creating institution user:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete institution user
 */
exports.deleteInstitutionUser = async (req, res) => {
  try {
    const userId = req.params.id;
    await User.findByIdAndDelete(userId);
    res.json({ message: 'Institution user deleted successfully' });
  } catch (err) {
    console.error('Error deleting institution user:', err);
    res.status(500).json({ error: err.message });
  }
};
/**
 * Get all users with full profile data
 */
exports.getAllUsersFullData = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').lean();
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.json(users);
  } catch (err) {
    console.error('Error fetching all users full data:', err);
    return res.status(500).json({
      message: 'Failed to fetch all users data',
      error: err.message
    });
  }
};

/**
 * Get detailed statistics for the dashboard
 */
exports.getDetailedStatistics = async (req, res) => {
  try {
    const [
      totalUsers,
      totalPosts,
      totalEvents,
      totalOpportunities,
      totalInstPosts,
      totalReports,
      totalInstitutions
    ] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Event.countDocuments(),
      Opportunity.countDocuments(),
      InstitutionPost.countDocuments(),
      Report.countDocuments(),
      Institution.countDocuments()
    ]);

    // Aggregate users by status
    const usersByStatus = await User.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Aggregate users by institution
    const usersByInstitution = await User.aggregate([
      { $group: { _id: '$institution', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Aggregate users by year
    const usersByYear = await User.aggregate([
      { $group: { _id: '$year', count: { $sum: 1 } } },
      { $sort: { _id: -1 } }
    ]);

    // Aggregate users by course
    const usersByCourse = await User.aggregate([
      { $group: { _id: '$course', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Career statistics
    const entrepreneurs = await User.countDocuments({
      $or: [
        { 'privateInfo.currentCompany': { $regex: /entrepreneur/i } },
        { 'privateInfo.currentPosition': { $regex: /founder|entrepreneur|ceo/i } }
      ]
    });

    const higherEducation = await User.countDocuments({
      $or: [
        { 'privateInfo.hasMasters': true },
        { 'privateInfo.mastersUniversity': { $exists: true, $ne: '' } }
      ]
    });

    // Content stats (pending vs approved)
    const pendingPosts = await Post.countDocuments({ status: 'pending' });
    const pendingEvents = await Event.countDocuments({ status: 'pending' });
    const pendingOpps = await Opportunity.countDocuments({ status: 'pending' });
    const pendingReports = await Report.countDocuments({ status: 'pending' });

    // Registrations over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const registrationsOverTime = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.json({
      counts: {
        users: totalUsers,
        posts: totalPosts,
        events: totalEvents,
        opportunities: totalOpportunities,
        institutionPosts: totalInstPosts,
        reports: totalReports,
        institutions: totalInstitutions
      },
      pending: {
        posts: pendingPosts,
        events: pendingEvents,
        opportunities: pendingOpps,
        reports: pendingReports
      },
      distribution: {
        status: usersByStatus.reduce((acc, curr) => ({ ...acc, [curr._id || 'unknown']: curr.count }), {}),
        institution: usersByInstitution.reduce((acc, curr) => ({ ...acc, [curr._id || 'N/A']: curr.count }), {}),
        year: usersByYear.reduce((acc, curr) => ({ ...acc, [curr._id || 'N/A']: curr.count }), {}),
        course: usersByCourse.reduce((acc, curr) => ({ ...acc, [curr._id || 'N/A']: curr.count }), {})
      },
      career: {
        entrepreneurs,
        higherEducation
      },
      registrationsTrend: registrationsOverTime
    });
  } catch (err) {
    console.error('Error fetching detailed statistics:', err);
    return res.status(500).json({
      message: 'Failed to fetch detailed statistics',
      error: err.message
    });
  }
};
