import winston from 'winston';
import { config } from './env.js';
import { loggingConfig } from './logging.config.js';

const { combine, timestamp, errors, json, colorize, simple, printf } = winston.format;

// Custom format for console logging
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

// Create logger
const logger = winston.createLogger({
  level: loggingConfig.logLevels[config.env] || loggingConfig.logLevels.development,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  defaultMeta: { service: 'chihili-backend' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
  ],
});

// If we're not in production then log to the `console`
if (config.env !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'HH:mm:ss' }),
      consoleFormat
    )
  }));
}

// Create a stream object for Morgan - only log important HTTP events
logger.stream = {
  write: (message) => {
    // Skip if HTTP logging is disabled
    if (!loggingConfig.enableHttpLogging) {
      return;
    }

    const logMessage = message.trim();
    
    // Skip logging based on configured skip patterns and status codes
    if (config.env === 'development') {
      // Check if message contains any of the skip status codes
      const hasSkipStatusCode = loggingConfig.skipStatusCodes.some(code => 
        logMessage.includes(`" ${code} `)
      );
      
      if (hasSkipStatusCode) {
        return; // Skip these responses
      }
    }
    
    logger.http(logMessage);
  },
};

export default logger;
