const axios = require('axios');

const check = async () => {
    try {
        const response = await axios.get('http://127.0.0.1:5000/api/institutions');
        console.log(`API Institutions Count: ${response.data.length}`);
        console.log('List:');
        response.data.forEach(inst => console.log(`- ${inst.name}`));

        process.exit(0);
    } catch (error) {
        console.error('API matching failed. Make sure server is running on 5000.');
        console.error(error.message);
        process.exit(1);
    }
};

check();
