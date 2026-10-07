const mongoose = require("mongoose");
const dns = require("dns");

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

const connectDB = async () => {
  let uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/alumni_portal";
  const isAtlas = uri.includes(".mongodb.net") || uri.startsWith("mongodb+srv://");

  const logSuccess = () => {
    const host = mongoose.connection.host;
    const port = mongoose.connection.port;
    const dbName = mongoose.connection.name;
    const dbType = isAtlas ? "MongoDB Atlas (Cloud)" : "Local MongoDB";
    console.log(`✅ [Database Connected] Type: ${dbType} | Host: ${host}${port ? ':' + port : ''} | Database: ${dbName}`);
  };

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    logSuccess();
  } catch (error) {
    if (uri.includes("@mongodb:")) {
      try {
        const fallbackUri = uri.replace("@mongodb:", "@127.0.0.1:");
        console.log("Host '@mongodb:' not directly reachable on host machine, connecting to Local MongoDB at 127.0.0.1:27017...");
        await mongoose.connect(fallbackUri);
        logSuccess();
        return;
      } catch (fallbackError) {
        console.error("❌ MongoDB Connection Failed:", fallbackError.message);
        process.exit(1);
      }
    }
    console.error("❌ MongoDB Connection Failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;

