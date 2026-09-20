const mongoose = require('mongoose');
const dns = require('dns');
const env = require('./env');

// Set reliable DNS servers for Atlas SRV lookup on Windows
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // ignore if restricted
}

const connectDB = async () => {
  console.log('Connecting to MongoDB...');
  const primaryUri = env.mongoUri;
  const fallbackUri = 'mongodb://127.0.0.1:27017/civictrack';

  try {
    const conn = await mongoose.connect(primaryUri, { autoIndex: true });
    console.log(`[CivicTrack MongoDB] MongoDB connected: ${conn.connection.host} (${conn.connection.name})`);
    return conn;
  } catch (error) {
    console.error(`[CivicTrack MongoDB] Connection error: ${error.message}`);
    
    // In production, do NOT attempt fallback to local database - fail fast and safe
    if (env.isProd) {
      console.error('[CivicTrack MongoDB] Production database connection failed. Halting application startup.');
      process.exit(1);
    }

    // In local development, try local mongodb fallback if primary was remote/different
    if (primaryUri !== fallbackUri) {
      console.log(`[CivicTrack MongoDB] Development mode: Retrying with local fallback (${fallbackUri})...`);
      try {
        const fallbackConn = await mongoose.connect(fallbackUri, { autoIndex: true });
        console.log(`[CivicTrack MongoDB] MongoDB connected to local fallback: ${fallbackConn.connection.host} (${fallbackConn.connection.name})`);
        return fallbackConn;
      } catch (fallbackErr) {
        console.error(`[CivicTrack MongoDB] Local fallback also failed: ${fallbackErr.message}`);
      }
    }
    process.exit(1);
  }
};

module.exports = connectDB;
