const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Institution = require('./models/Institution');
const User = require('./models/User');

dotenv.config({ path: './.env' });

const verify = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/alumni_portal');

        const instCount = await Institution.countDocuments();
        const instUserCount = await User.countDocuments({ role: 'institution' });
        const adminCount = await User.countDocuments({ role: 'admin' });
        const totalUserCount = await User.countDocuments();

        console.log(`Institutions: ${instCount}`);
        console.log(`Institution Users: ${instUserCount}`);
        console.log(`Super Admins: ${adminCount}`);
        console.log(`Total Users: ${totalUserCount}`);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

verify();
