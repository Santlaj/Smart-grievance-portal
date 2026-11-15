const mongoose = require("mongoose");

let isMongoConnected = false;
let connectionPromise = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    isMongoConnected = true;
    return;
  }
  try {
    if (mongoose.connection.readyState === 2) {
      await (connectionPromise || mongoose.connection.asPromise());
      isMongoConnected = mongoose.connection.readyState === 1;
      connectionPromise = null;
      return;
    }

    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI must be configured.");
    }

    connectionPromise = connectionPromise || mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS) || 10000,
    });
    const conn = await connectionPromise;

    isMongoConnected = true;
    connectionPromise = null;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    isMongoConnected = false;
    connectionPromise = null;
    if (process.env.NODE_ENV === "production") {
      console.error("MongoDB connection failed:", error.message);
      throw new Error(`MongoDB connection failed: ${error.message}`, { cause: error });
    }

    console.warn(`⚠️ MongoDB is unavailable (${error.message}); development fallback is active.`);
  }
};

const getIsConnected = () => isMongoConnected && mongoose.connection.readyState === 1;

module.exports = connectDB;
module.exports.getIsConnected = getIsConnected;
