const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

dotenv.config({ path: './.env' });

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/alumni_portal');

        const email = process.env.ADMIN_EMAIL;
        const password = process.env.ADMIN_PASSWORD;
        if (!email || !password) {
            throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in environment before running createAdmin.js');
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name: 'Super Admin',
            email: email,
            password: hashedPassword,
            role: 'admin',
            isAdmin: true,
            status: 'approved'
        });

        console.log(`✅ Super Admin created: ${email}`);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

createAdmin();
