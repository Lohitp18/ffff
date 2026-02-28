const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const Institution = require('../models/Institution');
const User = require('../models/User');
const hierarchy = require('../data/enrollmentHierarchy.json');

dotenv.config({ path: './.env' });

const seedInstitutions = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/alumni_portal');
        console.log('Connected to MongoDB...');

        // Clear existing institutions as requested "remove all old schools and colleges"
        await Institution.deleteMany({});
        console.log('Cleared existing institutions.');

        // Clear existing users with role 'institution' to avoid stale accounts
        await User.deleteMany({ role: 'institution' });
        console.log('Cleared existing institution admin accounts.');

        // Get list of allowed institution names
        const allowedInstitutions = hierarchy.institutions.map(inst => inst.name);

        // Delete alumni/users who are NOT in the allowed list of institutions
        // This ensures only the 25 specific institutions' alumni remain
        const deleteResult = await User.deleteMany({
            role: { $ne: 'admin' }, // Don't delete super admin
            institution: { $nin: allowedInstitutions }
        });
        console.log(`Cleared ${deleteResult.deletedCount} users/alumni from old/unsupported institutions.`);

        for (const instData of hierarchy.institutions) {
            // Hash the password for User collection
            const hashedPassword = await bcrypt.hash(instData.password, 10);

            // 1. Update/Create Institution metadata
            const instUpdateData = {
                name: instData.name,
                email: instData.email,
                password: instData.password, // Plain text in Institution model per current schema
                establishedYear: instData.establishedYear.toString(),
                courses: instData.programs.flatMap(p => p.courses.map(c => c.name)),
                isActive: true
            };

            await Institution.create(instUpdateData);
            console.log(`Created institution metadata: ${instData.name}`);

            // 2. Update/Create User account for login
            const userUpdateData = {
                name: instData.name,
                email: instData.email.toLowerCase().trim(),
                password: hashedPassword,
                institution: instData.name,
                status: 'approved',
                isAdmin: true,
                role: 'institution' // Custom field if exists, but we'll use isAdmin for now
            };

            const existingUser = await User.findOne({ email: userUpdateData.email });
            if (existingUser) {
                await User.findByIdAndUpdate(existingUser._id, userUpdateData);
                console.log(`Updated user account: ${instData.email}`);
            } else {
                await User.create(userUpdateData);
                console.log(`Created user account: ${instData.email}`);
            }
        }

        console.log('Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding institutions:', error);
        process.exit(1);
    }
};

seedInstitutions();
