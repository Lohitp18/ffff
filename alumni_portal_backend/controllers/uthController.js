const User = require("../models/User");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");

// ✅ User Registration (Sign Up) - Auto-approved, no verification required
const registerUser = async (req, res) => {
  try {
    const { 
      name, email, phone, dob, institution, course, year, password, 
      favTeacher, socialMedia
    } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !institution || !course || !year || !password) {
      return res.status(400).json({ message: "All basic fields are required" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Parse date - handle both DD-MM-YYYY (from app) and YYYY-MM-DD (from web) formats
    let parsedDob = null;
    if (dob) {
      // Try parsing as ISO format (YYYY-MM-DD)
      parsedDob = new Date(dob);
      // If invalid, try DD-MM-YYYY format
      if (isNaN(parsedDob.getTime())) {
        const parts = dob.split('-');
        if (parts.length === 3) {
          // Assume DD-MM-YYYY format
          parsedDob = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      }
      // If still invalid, set to null
      if (isNaN(parsedDob.getTime())) {
        parsedDob = null;
      }
    }

    const user = await User.create({
      name, 
      email, 
      phone, 
      dob: parsedDob, 
      institution, 
      course, 
      year,
      password: hashedPassword, 
      favouriteTeacher: favTeacher || '', 
      socialMedia: socialMedia || '',
      status: "pending", // Require admin approval
    });

    res.status(201).json({
      _id: user._id,
      email: user.email,
      status: user.status,
      message: "Account created successfully. Please wait for admin approval."
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ User Login (Sign In)
const loginUser = async (req, res) => {
  try {
    // Validate request body
    if (!req.body) {
      return res.status(400).json({ message: "Request body is required" });
    }

    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Trim and validate email format
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || trimmedEmail.length === 0) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!password || password.length === 0) {
      return res.status(400).json({ message: "Password is required" });
    }

    // Find user by email (case-insensitive)
    const user = await User.findOne({ email: trimmedEmail });
    if (!user) {
      console.log(`Login attempt failed: User not found for email: ${trimmedEmail}`);
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare password
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      console.log(`Login attempt failed: Invalid password for email: ${trimmedEmail}`);
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Check if admin approved
    if (user.status !== "approved") {
      return res.status(403).json({ 
        message: `Account is ${user.status}. Please wait for admin approval.` 
      });
    }

    // Generate token
    let token;
    try {
      token = generateToken(user._id);
    } catch (tokenError) {
      console.error("Token generation error:", tokenError);
      return res.status(500).json({ message: "Failed to generate authentication token" });
    }

    console.log(`Login successful for user: ${trimmedEmail}`);
    res.json({
      _id: user._id,
      email: user.email,
      status: user.status,
      token: token
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ 
      message: "Server error during login", 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

module.exports = { registerUser, loginUser };
