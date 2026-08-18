import { config } from './env.js';

// Logging configuration
export const loggingConfig = {
  // Toggle HTTP request logging
  enableHttpLogging: config.enableHttpLogging,
  
  // Log level for different environments
  logLevels: {
    development: config.devLogLevel,
    production: config.prodLogLevel,
    test: 'error'
  },
  
  // Skip logging for these patterns
  skipPatterns: [
    /\/health$/,
    /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i,
    /\/favicon\.ico$/,
  ],
  
  // Skip HTTP status codes in development
  skipStatusCodes: [304, 200], // Not Modified, OK
  
  // Morgan formats
  formats: {
    development: 'dev', // :method :url :status :response-time ms
    production: 'combined', // Apache combined log format
    minimal: ':method :url :status :res[content-length] - :response-time ms'
  }
};
