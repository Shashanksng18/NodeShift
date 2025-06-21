const rateLimit = require("express-rate-limit");
const logger = require("../utils/logger");

//General rate limiter -> for all routes

const generalLimiter = rateLimit({
    windowMS: 15 * 60 * 1000, //15 minute
    max: 10, // limit each IP to 10 requires per windowMS
    message: {
        success: false,
        error: {
            message: "Too many requests from this IP, please try again later",
            type: 'RATE_LIMIT_EXCEEDED'
        }
    },
    standardHeaders: true, 
    legacyHeader: false,
    handler: (req, res, next, options) => {
        logger.warn({
            message: "Rate limit exceeded",
            ip: req.ip,
            userAgent: req.get("User-Agent"),
            url: req.originalUrl,
            method: req.method
        });
        res.status(options.statusCode).json(options.message);
    }
})

// Strict rate limiter - for sensitive routes (login, register, etc.)
const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
      success: false,
      error: {
        message: 'Too many attempts from this IP, please try again later.',
        type: 'STRICT_RATE_LIMIT_EXCEEDED'
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
      logger.warn({
        message: 'Strict rate limit exceeded',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method
      });
      
      res.status(options.statusCode).json(options.message);
    }
  });
  

  // API rate limiter - for API routes
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs for API
    message: {
      success: false,
      error: {
        message: 'API rate limit exceeded, please try again later.',
        type: 'API_RATE_LIMIT_EXCEEDED'
      }
    },
    standardHeaders: true,
    legacyHeaders: false
  });
  
  // Create account limiter - very strict for account creation
  const createAccountLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // limit each IP to 3 account creation attempts per hour
    message: {
      success: false,
      error: {
        message: 'Too many account creation attempts, please try again later.',
        type: 'ACCOUNT_CREATION_LIMIT_EXCEEDED'
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true // Don't count successful requests
  });
  
  module.exports = {
    generalLimiter,
    strictLimiter,
    apiLimiter,
    createAccountLimiter
  };
  
  