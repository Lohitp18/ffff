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
    console.log('✅ MongoDB Connected\n');
  } catch (error) {
    console.error('❌ MongoDB Connection Failed', error.message);
    process.exit(1);
  }
};

const listUsers = async () => {
  try {
    await connectDB();
    
    const users = await User.find({}).select('name email isAdmin status').sort({ createdAt: -1 });
    
    if (users.length === 0) {
      console.log('No users found in database');
      process.exit(0);
    }

    console.log('Users in database:');
    console.log('='.repeat(80));
    users.forEach((user, index) => {
      const adminStatus = user.isAdmin ? '✅ Admin' : '❌ Not Admin';
      const statusBadge = user.status || 'pending';
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Status: ${statusBadge} | ${adminStatus}`);
      console.log('');
    });
    console.log('='.repeat(80));
    console.log(`\nTotal users: ${users.length}`);
    console.log('\nTo set a user as admin, run:');
    console.log('node scripts/setAdmin.js <email>');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error listing users:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

listUsers();







