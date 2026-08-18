import dns from 'node:dns';
import mongoose from 'mongoose';
import { config } from './env.js';
import logger from './logger.js';

// Configure DNS resolution for MongoDB Atlas SRV lookup compatibility
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (dnsErr) {
  logger.warn('Could not set custom DNS servers:', dnsErr.message);
}

export const connectDB = async () => {
  try {
    console.log("Connecting to MongoDB with URI:", config.mongoUri);

    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    const conn = await mongoose.connect(config.mongoUri, options);
    
    logger.info(`✅ MongoDB connected: ${conn.connection.host}`);
    
    // Log database events
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
    
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });
    
  } catch (err) {
    console.error('❌ MongoDB connection failed:');
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    logger.error('❌ MongoDB connection failed:', err.message);
    
    // Don't exit process - let the server start anyway
    // This allows the container to start even if DB is temporarily unavailable
    logger.warn('Server will continue without database connection. Retrying connection...');
    
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB disconnected successfully');
  } catch (err) {
    logger.error('Error disconnecting from MongoDB:', err.message);
  }
};
