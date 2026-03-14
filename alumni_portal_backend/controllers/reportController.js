const Report = require('../models/Report');
const Post = require('../models/Post');
const Event = require('../models/Event');
const Opportunity = require('../models/Opportunity');
const InstitutionPost = require('../models/InstitutionPost');
const User = require('../models/User');

// Get all reports for admin
const getAllReports = async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (status !== 'all') {
      query.status = status;
    }

    const reports = await Report.find(query)
      .populate('reporterId', 'name username email')
      .populate('reviewedBy', 'name username email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Report.countDocuments(query);

    // Get the reported item details
    const reportsWithDetails = await Promise.all(
      reports.map(async (report) => {
        let reportedItem = null;
        switch (report.reportedItemType) {
          case 'Post':
            reportedItem = await Post.findById(report.reportedItemId)
              .populate('authorId', 'name username email');
            break;
          case 'Event':
            reportedItem = await Event.findById(report.reportedItemId)
              .populate('postedBy', 'name username email');
            break;
          case 'Opportunity':
            reportedItem = await Opportunity.findById(report.reportedItemId)
              .populate('postedBy', 'name username email');
            break;
          case 'InstitutionPost':
            reportedItem = await InstitutionPost.findById(report.reportedItemId);
            break;
        }

        return {
          ...report.toObject(),
          reportedItem
        };
      })
    );

    res.json({
      reports: reportsWithDetails,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update report status
const updateReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, adminNotes } = req.body;
    const adminId = req.user.id;

    if (!['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const updateData = { 
      status,
      reviewedBy: adminId,
      reviewedAt: new Date()
    };

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    const report = await Report.findByIdAndUpdate(
      reportId,
      updateData,
      { new: true }
    ).populate('reporterId', 'name username email')
     .populate('reviewedBy', 'name username email');

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get report statistics
const getReportStats = async (req, res) => {
  try {
    const stats = await Report.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalReports = await Report.countDocuments();
    const pendingReports = await Report.countDocuments({ status: 'pending' });

    res.json({
      total: totalReports,
      pending: pendingReports,
      byStatus: stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Error fetching report stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllReports,
  updateReportStatus,
  getReportStats
};
