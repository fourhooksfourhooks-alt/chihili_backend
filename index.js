// Import modules (environment loading happens in env.js)
import { config } from './src/config/env.js';
import app from './src/app.js';
import { connectDB, disconnectDB } from './src/config/db.js';

const PORT = config.port || 8000;
const ENV = config.env || 'production';

// Start server first - don't wait for database
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} in ${ENV} mode`);
});

// Connect to MongoDB asynchronously (non-blocking)
connectDB().catch(err => {
  console.error('Database connection error:', err.message);
});

// Graceful shutdown for Cloud Run (SIGTERM) and local signals
const shutdown = async (signal) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);

  // Stop accepting new connections
  server.close(async (err) => {
    if (err) {
      console.error('Error closing HTTP server:', err);
      process.exit(1);
    }

    // Close DB connection if present
    try {
      await disconnectDB();
    } catch (dbErr) {
      console.error('Error during DB disconnect:', dbErr);
    }

    console.log('Shutdown complete.');
    process.exit(0);
  });

  // Force exit if shutdown takes too long
  setTimeout(() => {
    console.error('Forcing exit after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  shutdown('unhandledRejection');
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  shutdown('uncaughtException');
});
