const express = require("express");
const cors = require("cors");
const rateLimit = require('express-rate-limit');
const app = express();
const dotenv = require("dotenv");
const mongoose = require("mongoose");

// Load environment variables
if(process.env.NODE_ENV === 'production') {
  dotenv.config({path: './env.production'});
} else {
  dotenv.config(); // defaults to '.env'
}

// Trust proxy (important for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple rate limiter - applies to all routes
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 15 minutes
  max: 4, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again later.',
      type: 'RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    console.log(`Rate limit exceeded for IP: ${req.ip} on ${req.originalUrl}`);
    res.status(options.statusCode).json(options.message);
  }
});

// Apply rate limiting to all routes
app.use(limiter);

// Strict rate limiter for sensitive routes
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
    console.log(`Strict rate limit exceeded for IP: ${req.ip} on ${req.originalUrl}`);
    res.status(options.statusCode).json(options.message);
  }
});

// Database connection
// mongoose.connect(process.env.DB_URL)
//   .then(() => {
//     console.log('✅ Database connected successfully');
//   })
//   .catch((error) => {
//     console.error('❌ Database connection failed:', error.message);
//     process.exit(1);
//   });

// Routes
app.get("/", (req, res) => {
  res.json({ 
    success: true, 
    message: "Hello World",
    environment: process.env.NODE_ENV,
    rateLimit: {
      limit: req.rateLimit?.limit,
      remaining: req.rateLimit?.remaining,
      reset: req.rateLimit?.reset ? new Date(req.rateLimit.reset) : null
    }
  });
});

// API routes
app.get("/api/users", (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: "John Doe", email: "john@example.com" },
      { id: 2, name: "Jane Smith", email: "jane@example.com" }
    ],
    rateLimit: {
      limit: req.rateLimit?.limit,
      remaining: req.rateLimit?.remaining,
      reset: req.rateLimit?.reset ? new Date(req.rateLimit.reset) : null
    }
  });
});

// Login route with strict rate limiting
app.post("/auth/login", strictLimiter, (req, res) => {
  const { email, password } = req.body;
  
  // Simple validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Email and password are required'
      }
    });
  }
  
  // Simulate authentication (DO NOT use this in production!)
  if (email === 'test@example.com' && password === 'password123') {
    res.json({
      success: true,
      message: "Login successful",
      token: "fake-jwt-token-" + Date.now(),
      rateLimit: {
        limit: req.rateLimit?.limit,
        remaining: req.rateLimit?.remaining,
        reset: req.rateLimit?.reset ? new Date(req.rateLimit.reset) : null
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: {
        message: 'Invalid credentials'
      },
      rateLimit: {
        limit: req.rateLimit?.limit,
        remaining: req.rateLimit?.remaining,
        reset: req.rateLimit?.reset ? new Date(req.rateLimit.reset) : null
      }
    });
  }
});

// Registration route with strict rate limiting
app.post("/auth/register", strictLimiter, (req, res) => {
  const { email, password, name } = req.body;
  
  // Simple validation
  if (!email || !password || !name) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'All fields (email, password, name) are required'
      }
    });
  }
  
  // Simulate account creation
  console.log(`✅ New account created for ${email}`);
  
  res.status(201).json({
    success: true,
    message: "Account created successfully",
    data: {
      id: Date.now(),
      email,
      name,
      createdAt: new Date()
    },
    rateLimit: {
      limit: req.rateLimit?.limit,
      remaining: req.rateLimit?.remaining,
      reset: req.rateLimit?.reset ? new Date(req.rateLimit.reset) : null
    }
  });
});

// Route to check rate limit status
app.get("/rate-limit-status", (req, res) => {
  res.json({
    success: true,
    message: "Rate limit status",
    rateLimit: {
      limit: req.rateLimit?.limit,
      remaining: req.rateLimit?.remaining,
      reset: req.rateLimit?.reset ? new Date(req.rateLimit.reset) : null,
      resetTime: req.rateLimit?.reset
    }
  });
});

// Test route to trigger rate limit quickly (for testing)
app.get("/test-rate-limit", (req, res) => {
  res.json({
    success: true,
    message: "Keep hitting this endpoint to test rate limiting!",
    tip: "Try refreshing this page quickly to see rate limiting in action",
    rateLimit: {
      limit: req.rateLimit?.limit,
      remaining: req.rateLimit?.remaining,
      reset: req.rateLimit?.reset ? new Date(req.rateLimit.reset) : null
    }
  });
});

// Handle undefined routes
app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.originalUrl} not found`,
      type: 'NOT_FOUND'
    }
  });
});

// Simple error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  
  res.status(err.status || 500).json({
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      type: 'SERVER_ERROR'
    }
  });
});

const server = app.listen(process.env.PORT || 3000, () => {
  console.log(`🚀 Server running on port ${process.env.PORT || 3000} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`📝 Rate limiting active:`);
  console.log(`   - General routes: 100 requests per 15 minutes`);
  console.log(`   - Auth routes: 5 requests per 15 minutes`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  server.close(() => {
    process.exit(1);
  });
});



// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.log('Shutting down...');
  process.exit(1);
});
