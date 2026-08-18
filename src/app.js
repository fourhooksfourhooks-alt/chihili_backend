import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';
import errorHandler from './middleware/error.middleware.js';
import { config } from "./config/env.js";
import logger from './config/logger.js';
import { loggingConfig } from './config/logging.config.js';
import './cron/paymentStatusUpdated.js'
import cookieParser from 'cookie-parser';

const app = express();

// Trust proxy for rate limiting and HTTPS
app.set('trust proxy', 1);

// Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 re quests per windowMs
//   message: {
//     success: false,
//     message: 'Too many requests from this IP, please try again later.',
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// Security Middlewares
// app.use(helmet());

// Rate limiting
// app.use('/api/', limiter);

// Body parsing middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Use the allowedOrigins directly from config since it's already processed
const allowedOrigins = config.allowedOrigins;

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow requests like curl / Postman
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS: " + origin));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Handle preflight globally
app.options("*", cors());


// Logging - Using centralized logging configuration
if (loggingConfig.enableHttpLogging) {
  const skipRequest = (req, res) => {
    const matchesSkipPattern = loggingConfig.skipPatterns.some(pattern =>
      pattern.test(req.url)
    );

    if (matchesSkipPattern) return true;

    // In development, skip configured status codes
    if (config.env === 'development') {
      return loggingConfig.skipStatusCodes.includes(res.statusCode);
    }

    // In production, only log errors
    if (config.env === 'production') {
      return res.statusCode < 400;
    }

    return false;
  };

  const format = loggingConfig.formats[config.env] || loggingConfig.formats.development;

  app.use(morgan(format, {
    stream: config.env === 'production' ? logger.stream : undefined,
    skip: skipRequest
  }));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: config.env
  });
});

// API Routes
app.use('/api/v1', routes);

app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error Handling Middleware (last)
app.use(errorHandler);

export default app;
