const mongoose = require('mongoose');
const User = require('./models/User');
const Institution = require('./models/Institution');
const dotenv = require('dotenv');

dotenv.config();

const checkDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/alumni_portal');

        const inst = await Institution.findOne({ name: "ALVA'S ICSE SCHOOL" }).lean();
        const user = await User.findOne({ email: "admin.icse@alvas.edu.in" }).lean();

        console.log('---JSON_START---');
        console.log(JSON.stringify({ inst, user }, null, 2));
        console.log('---JSON_END---');

        process.exit(0);
    } catch (error) {
        process.exit(1);
    }
};

checkDB();
