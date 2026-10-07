const User = require('../models/User');
const Post = require('../models/Post');
const Event = require('../models/Event');
const Opportunity = require('../models/Opportunity');
const InstitutionPost = require('../models/InstitutionPost');
const Report = require('../models/Report');
const Institution = require('../models/Institution');
const InstituteCredential = require('../models/InstituteCredential');
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
    const users = await User.find({ role: { $in: ['institution', 'instituteadmin'] } }).select('-password').lean();
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

    // Create institution user with role: instituteadmin
    const user = await User.create({
      name: institution,
      email,
      password: hashedPassword,
      role: 'instituteadmin',
      isAdmin: false,
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

/**
 * Get all institution credentials
 */
exports.getInstituteCredentials = async (req, res) => {
  try {
    const credentials = await InstituteCredential.find({}).select('-password').lean();
    const formatted = credentials.map((cred) => ({
      ...cred,
      role: 'instituteadmin',
    }));
    return res.json(formatted);
  } catch (err) {
    console.error('Error fetching institution credentials:', err);
    return res.status(500).json({
      message: 'Failed to fetch institution credentials',
      error: err.message
    });
  }
};

/**
 * Create or update institution credentials
 */
exports.createInstituteCredential = async (req, res) => {
  try {
    const { institution, username, password, phone } = req.body;

    if (!institution || !username || !password) {
      return res.status(400).json({
        message: 'Institution, username, and password are required'
      });
    }

    const normalizedUser = username.toLowerCase().trim();
    const hashedPassword = await bcrypt.hash(password, 10);
    const updateCred = { username: normalizedUser, password: hashedPassword };
    if (phone !== undefined) {
      updateCred.phone = phone ? phone.trim() : "";
    }

    // Update if exists, otherwise create in institutecredentials collection
    const credential = await InstituteCredential.findOneAndUpdate(
      { institution },
      updateCred,
      { new: true, upsert: true }
    );

    // Ensure corresponding User account is configured with role: 'instituteadmin' (NOT 'admin')
    let dbUser = await User.findOne({
      $or: [{ email: normalizedUser }, { username: normalizedUser }]
    });

    if (!dbUser) {
      await User.create({
        name: institution,
        email: normalizedUser,
        username: normalizedUser,
        password: hashedPassword,
        phone: phone ? phone.trim() : "",
        phoneVerified: true,
        status: "approved",
        role: "instituteadmin",
        isAdmin: false,
        institution: institution
      });
    } else {
      dbUser.password = hashedPassword;
      dbUser.role = "instituteadmin";
      dbUser.isAdmin = false;
      dbUser.status = "approved";
      dbUser.name = institution;
      dbUser.institution = institution;
      if (phone !== undefined) {
        dbUser.phone = phone ? phone.trim() : "";
      }
      await dbUser.save();
    }

    return res.status(201).json({
      success: true,
      message: 'Institution credentials configured successfully with role instituteadmin',
      data: {
        _id: credential._id,
        institution: credential.institution,
        username: credential.username,
        phone: credential.phone || "",
        role: 'instituteadmin'
      }
    });
  } catch (err) {
    console.error('Error creating institution credential:', err);
    return res.status(500).json({
      message: 'Failed to configure credentials',
      error: err.message
    });
  }
};

/**
 * Delete institution credentials
 */
exports.deleteInstituteCredential = async (req, res) => {
  try {
    const { id } = req.params;
    const cred = await InstituteCredential.findById(id);
    if (cred) {
      if (cred.username) {
        await User.deleteMany({
          email: cred.username.toLowerCase(),
          role: 'instituteadmin'
        });
      }
      await InstituteCredential.findByIdAndDelete(id);
    }
    return res.json({
      success: true,
      message: 'Credentials deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting institution credentials:', err);
    return res.status(500).json({
      message: 'Failed to delete credentials',
      error: err.message
    });
  }
};

/**
 * Get all super admins
 */
exports.getSuperAdmins = async (req, res) => {
  try {
    const admins = await User.find({
      $or: [{ role: 'admin' }, { isAdmin: true, role: { $nin: ['institution', 'instituteadmin'] } }],
      role: { $nin: ['institution', 'instituteadmin'] }
    })
      .select('name email phone role isAdmin status allowedModules createdAt')
      .sort({ createdAt: -1 })
      .lean();
    return res.json(admins);
  } catch (err) {
    console.error('Error fetching super admins:', err);
    return res.status(500).json({
      message: 'Failed to fetch super admins',
      error: err.message
    });
  }
};

/**
 * Create or update a super admin with assigned module permissions
 */
exports.createSuperAdmin = async (req, res) => {
  try {
    const { name, email, password, allowedModules, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email, and password are required'
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: trimmedEmail });
    const hashedPassword = await bcrypt.hash(password, 10);
    const modules = Array.isArray(allowedModules) ? allowedModules : [];

    if (existingUser) {
      existingUser.name = name.trim();
      existingUser.password = hashedPassword;
      existingUser.role = 'admin';
      existingUser.isAdmin = true;
      existingUser.status = 'approved';
      existingUser.phoneVerified = true;
      existingUser.allowedModules = modules;
      if (phone !== undefined) {
        existingUser.phone = phone ? phone.trim() : "";
      }
      await existingUser.save();

      return res.status(200).json({
        success: true,
        message: 'Super Admin updated successfully',
        data: {
          _id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          phone: existingUser.phone || "",
          allowedModules: existingUser.allowedModules
        }
      });
    }

    const newAdmin = await User.create({
      name: name.trim(),
      email: trimmedEmail,
      password: hashedPassword,
      role: 'admin',
      isAdmin: true,
      status: 'approved',
      phoneVerified: true,
      allowedModules: modules,
      phone: phone ? phone.trim() : ""
    });

    return res.status(201).json({
      success: true,
      message: 'Super Admin created successfully',
      data: {
        _id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        phone: newAdmin.phone || "",
        allowedModules: newAdmin.allowedModules
      }
    });
  } catch (err) {
    console.error('Error creating super admin:', err);
    return res.status(500).json({
      message: 'Failed to create super admin',
      error: err.message
    });
  }
};

/**
 * Delete a super admin
 */
exports.deleteSuperAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user && (req.user._id?.toString() === id || req.user.id === id)) {
      return res.status(400).json({
        message: 'Cannot delete your own super admin account'
      });
    }

    await User.findByIdAndDelete(id);
    return res.json({
      success: true,
      message: 'Super Admin deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting super admin:', err);
    return res.status(500).json({
      message: 'Failed to delete super admin',
      error: err.message
    });
  }
};

