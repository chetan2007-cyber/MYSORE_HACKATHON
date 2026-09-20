require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const app = require('./app');
const connectDB = require('./config/db');
const env = require('./config/env');

// Connect to MongoDB
connectDB();

const PORT = env.port || process.env.PORT || 5000;

const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(` CivicTrack Backend API Server running on port ${PORT}`);
  console.log(` Environment: ${env.nodeEnv}`);
  console.log(` Health Check: /api/health`);
  console.log(`====================================================`);
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`\n[CivicTrack Server] Received ${signal}. Starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(async () => {
    console.log('[CivicTrack Server] HTTP server closed.');
    
    try {
      await mongoose.connection.close(false);
      console.log('[CivicTrack Server] MongoDB connection closed.');
      process.exit(0);
    } catch (err) {
      console.error('[CivicTrack Server] Error closing MongoDB connection:', err.message);
      process.exit(1);
    }
  });

  // Force exit after 10 seconds if shutdown hangs
  setTimeout(() => {
    console.error('[CivicTrack Server] Could not close connections in time, forcefully shutting down.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle errors gracefully
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection Error: ${err.message}`, err.stack);
});

process.on('uncaughtException', (err) => {
  console.error(`Uncaught Exception: ${err.message}`, err.stack);
});
