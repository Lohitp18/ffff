const User = require("../models/User");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

// GET /api/users/approved?year=&institution=&course=&q=
exports.getApprovedAlumni = async (req, res) => {
  try {
    const { year, institution, course, q } = req.query;
    const filter = { status: "approved" };

    if (year) filter.year = year;
    if (institution) filter.institution = { $regex: institution, $options: "i" };
    if (course) filter.course = { $regex: course, $options: "i" };

    // Text search on name or email if q provided
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .select("name email phone institution course year createdAt")
      .sort({ createdAt: -1 })
      .limit(200);

    return res.json(users);
  } catch (err) {
    console.error("getApprovedAlumni error", err);
    return res.status(500).json({ message: "Failed to fetch alumni" });
  }
};

// GET /api/users/profile - Get current user's profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/users/profile - Update current user's profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.password;
    delete updateData._id;
    delete updateData.email; // Email shouldn't be changed via profile update
    delete updateData.status;
    delete updateData.isAdmin;

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/users/privacy-settings - Update privacy settings
exports.updatePrivacySettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const privacySettings = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { privacySettings },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Privacy settings updated successfully",
      privacySettings: user.privacySettings,
    });
  } catch (error) {
    console.error("Error updating privacy settings:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/users/:id - Get user profile by ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent CastError for non-ObjectId values like "profile"
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check privacy settings
    if (user.privacySettings?.profileVisibility === "private") {
      return res.status(403).json({ message: "Profile is private" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/users/change-password - Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current password and new password are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/auth/reset-password - Reset password by email (no auth)
exports.resetPasswordByEmail = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res
        .status(400)
        .json({ message: "Email and new password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email not found" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    await user.save();

    return res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
