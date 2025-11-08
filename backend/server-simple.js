const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const socketIO = require('socket.io');
const http = require('http');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);

// CORS configuration
app.use(cors({
  origin: [
    'https://campus-connect1-beta.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
});
app.use(limiter);

// Security middleware
app.use(helmet());

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// In-memory storage (temporary)
const users = [];
const groups = [];
const messages = [];

// Auth middleware
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Auth routes
app.post('/api/auth/register', (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const user = {
    id: Date.now().toString(),
    firstName,
    lastName,
    email,
    password, // In production, hash this
    avatar: null,
    role: 'student',
    createdAt: new Date()
  };

  users.push(user);

  const token = jwt.sign(
    { userId: user.id, email: user.email }, 
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '30d' }
  );

  res.status(201).json({
    message: 'User registered successfully',
    token,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatar: user.avatar,
      role: user.role
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '30d' }
  );

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatar: user.avatar,
      role: user.role
    }
  });
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json({
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      studyMode: { enabled: false },
      notificationPreferences: { email: true, push: true, sound: true, priorityOnly: false },
      clubs: [],
      status: 'online'
    }
  });
});

// Groups routes
app.get('/api/groups', auth, (req, res) => {
  const userGroups = groups.filter(g => 
    g.members.some(m => m.userId === req.user.userId)
  );
  res.json({ groups: userGroups });
});

app.post('/api/groups', auth, (req, res) => {
  const { name, description, type } = req.body;

  const group = {
    id: Date.now().toString(),
    name,
    description,
    type: type || 'club',
    admin: req.user.userId,
    members: [{
      userId: req.user.userId,
      role: 'admin',
      joinedAt: new Date()
    }],
    channels: [
      { name: 'general', type: 'text', description: 'General discussions' },
      { name: 'announcements', type: 'announcements', description: 'Important announcements' }
    ],
    privacy: 'public',
    createdAt: new Date()
  };

  groups.push(group);
  res.status(201).json({ message: 'Group created successfully', group });
});

// Messages routes
app.get('/api/messages/:groupId/:channel', auth, (req, res) => {
  const { groupId, channel } = req.params;
  
  const groupMessages = messages.filter(m => 
    m.groupId === groupId && m.channel === channel
  );

  res.json({ 
    messages: groupMessages,
    pagination: { page: 1, limit: 50, total: groupMessages.length }
  });
});

app.post('/api/messages/send', auth, (req, res) => {
  const { content, groupId, channel, type } = req.body;

  const message = {
    id: Date.now().toString(),
    content,
    type: type || 'text',
    sender: {
      id: req.user.userId,
      firstName: 'User', // Would get from user data
      lastName: 'Name',
      avatar: null
    },
    groupId,
    channel,
    createdAt: new Date(),
    readBy: []
  };

  messages.push(message);
  res.status(201).json({ message: 'Message sent successfully', message });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'CampusConnect API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🚀 CampusConnect Backend API',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      auth: '/api/auth',
      groups: '/api/groups',
      messages: '/api/messages',
      health: '/api/health'
    }
  });
});

// Socket.IO setup
const io = socketIO(server, {
  cors: {
    origin: ['https://campus-connect1-beta.vercel.app', 'http://localhost:3000'],
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  socket.on('join_groups', (groupIds) => {
    groupIds.forEach(groupId => {
      socket.join(groupId);
    });
  });

  socket.on('send_message', (messageData) => {
    socket.broadcast.emit('new_message', messageData);
  });

  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});
