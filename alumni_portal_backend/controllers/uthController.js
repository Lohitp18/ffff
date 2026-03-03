const User = require("../models/User");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");
const fs = require("fs");
const path = require("path");

// ✅ User Registration (Sign Up) - Requires admin approval
const registerUser = async (req, res) => {
  try {
    const {
      name, email, phone, dob, institution, program, course, specialization, year, password,
      favTeacher, socialMedia,
      // Required professional fields at signup
      currentCompany, previousCompany, totalExperience, location
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
      program,
      course,
      specialization,
      year,
      password: hashedPassword,
      favouriteTeacher: favTeacher || '',
      socialMedia: socialMedia || '',
      status: "pending", // Require admin approval
      location: location || '',
      privateInfo: {
        currentCompany: currentCompany || '',
        totalExperience: Number(totalExperience) || 0,
        // Keep schema compatibility
        currentPosition: '',
        previousCompanies: [
          {
            company: previousCompany || '',
            position: '',
          }
        ],
      },
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
    const trimmedEmail = email.trim().toLowerCase();
    let user = await User.findOne({ email: trimmedEmail });

    // --- STATIC INSTITUTION AUTHENTICATION START ---
    // If user is not in DB or we want to allow override from JSON for institution admins
    const hierarchyPath = path.join(__dirname, '..', 'data', 'enrollmentHierarchy.json');
    if (fs.existsSync(hierarchyPath)) {
      const hierarchyData = JSON.parse(fs.readFileSync(hierarchyPath, 'utf8'));
      const staticInst = hierarchyData.institutions.find(inst => inst.email?.toLowerCase() === trimmedEmail);

      if (staticInst) {
        // Institutional admin detected in JSON
        if (password === staticInst.password) {
          // Password matches static JSON - Sync with Database
          if (!user) {
            const hashedPassword = await bcrypt.hash(staticInst.password, 10);
            user = await User.create({
              name: staticInst.name,
              email: trimmedEmail,
              password: hashedPassword,
              status: 'approved',
              isAdmin: true,
              role: 'admin',
              institution: staticInst.name
            });
            console.log(`Auto-created institution admin from JSON: ${trimmedEmail}`);
          } else {
            // User exists, ensure they are approved and have admin role
            let updated = false;
            if (user.status !== 'approved') { user.status = 'approved'; updated = true; }
            if (user.role !== 'admin') { user.role = 'admin'; updated = true; }
            if (updated) await user.save();
          }
          // Proceed with login using the newly synced/verified user
        } else {
          // Email matches an institution, but password doesn't
          return res.status(400).json({ message: "Invalid email or password" });
        }
      }
    }
    // --- STATIC INSTITUTION AUTHENTICATION END ---

    if (!user) {
      console.log(`Login attempt failed: User not found for email: ${trimmedEmail}`);
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare password
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    console.log(`Debug Login: Password match for ${trimmedEmail}? ${isPasswordMatch}`);
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
