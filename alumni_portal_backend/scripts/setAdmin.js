const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Failed', error.message);
    process.exit(1);
  }
};

const setAdmin = async (email) => {
  try {
    await connectDB();
    
    if (!email) {
      console.error('❌ Please provide an email address');
      console.log('Usage: node scripts/setAdmin.js <email>');
      process.exit(1);
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      console.error(`❌ User with email "${email}" not found`);
      process.exit(1);
    }

    if (user.isAdmin) {
      console.log(`ℹ️  User "${user.name}" (${user.email}) is already an admin`);
      process.exit(0);
    }

    user.isAdmin = true;
    await user.save();

    console.log(`✅ Successfully set "${user.name}" (${user.email}) as admin`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting admin:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

// Get email from command line arguments
const email = process.argv[2];
setAdmin(email);







