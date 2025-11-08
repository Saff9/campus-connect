const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const socketIO = require('socket.io');
const http = require('http');
const connectDB = require('./render-setup');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Enhanced CORS for Render deployment
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'https://campus-connect-frontend.vercel.app'
  ].filter(Boolean),
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Enhanced rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // increased limit for production
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Body parsing middleware with increased limits for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Database connection
connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/polls', require('./routes/polls'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/events', require('./routes/events'));
app.use('/api/notifications', require('./routes/notifications'));

// Initialize Socket.IO after routes
const io = socketIO(server, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000
});

const { setupSocketHandlers } = require('./sockets/socketHandlers');
setupSocketHandlers(io);

// Error handling middleware
app.use(require('./middleware/errorHandler'));

// Enhanced health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.status(200).json({ 
    status: 'OK', 
    message: 'CampusConnect API is running!',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🚀 CampusConnect Backend API',
    version: '1.0.0',
    documentation: '/api/health',
    status: 'operational'
  });
});

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The route ${req.originalUrl} does not exist.`
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 CampusConnect Backend API Active`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
