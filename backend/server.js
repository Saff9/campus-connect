const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const socketIO = require('socket.io');
const http = require('http');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

const app = express();
const server = http.createServer(app);

// CORS configuration
app.use(cors({
  origin: [
    'https://campus-connect2-pi.vercel.app/',
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

// In-memory storage (temporary - replace with database later)
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

// Generate JWT token
const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email }, 
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '30d' }
  );
};

// Auth routes
app.post('/api/auth/register', [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, password } = req.body;
    
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = {
      id: Date.now().toString(),
      firstName,
      lastName,
      email,
      password: hashedPassword,
      avatar: null,
      role: 'student',
      studyMode: { enabled: false, schedule: {} },
      notificationPreferences: { email: true, push: true, sound: true, priorityOnly: false },
      clubs: [],
      status: 'online',
      lastSeen: new Date(),
      createdAt: new Date()
    };

    users.push(user);

    const token = generateToken(user.id, user.email);

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
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

app.post('/api/auth/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').exists().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.email);

    // Update user status
    user.status = 'online';
    user.lastSeen = new Date();

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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
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
      bio: user.bio,
      role: user.role,
      studyMode: user.studyMode,
      notificationPreferences: user.notificationPreferences,
      clubs: user.clubs,
      status: user.status
    }
  });
});

app.post('/api/auth/logout', auth, (req, res) => {
  const user = users.find(u => u.id === req.user.userId);
  if (user) {
    user.status = 'offline';
    user.lastSeen = new Date();
  }
  res.json({ message: 'Logout successful' });
});

// Users routes
app.get('/api/users/profile', auth, (req, res) => {
  const user = users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json({ user });
});

app.put('/api/users/profile', auth, (req, res) => {
  const user = users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const { firstName, lastName, bio, studyMode, notificationPreferences } = req.body;

  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (bio !== undefined) user.bio = bio;
  if (studyMode) user.studyMode = studyMode;
  if (notificationPreferences) user.notificationPreferences = notificationPreferences;

  res.json({
    message: 'Profile updated successfully',
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      role: user.role,
      studyMode: user.studyMode,
      notificationPreferences: user.notificationPreferences
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

app.post('/api/groups', [
  auth,
  body('name').notEmpty().withMessage('Group name is required'),
  body('type').isIn(['club', 'organization', 'study_group', 'class', 'project']).withMessage('Invalid group type')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, type, privacy, tags } = req.body;

    const group = {
      id: Date.now().toString(),
      name,
      description: description || '',
      type: type || 'club',
      privacy: privacy || 'public',
      tags: tags || [],
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
      settings: {
        allowInvites: true,
        slowMode: 0,
        fileSharing: true,
        pollCreation: 'all'
      },
      analytics: {
        totalMessages: 0,
        activeMembers: 1,
        engagementRate: 0
      },
      createdAt: new Date(),
      isActive: true
    };

    groups.push(group);

    // Add group to user's clubs
    const user = users.find(u => u.id === req.user.userId);
    if (user) {
      user.clubs.push({
        club: group,
        role: 'admin'
      });
    }

    res.status(201).json({
      message: 'Group created successfully',
      group
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/groups/:id', auth, (req, res) => {
  const group = groups.find(g => g.id === req.params.id);
  if (!group) {
    return res.status(404).json({ message: 'Group not found' });
  }

  // Check if user is member
  const isMember = group.members.some(m => m.userId === req.user.userId);
  if (!isMember && group.privacy === 'private') {
    return res.status(403).json({ message: 'Access denied' });
  }

  res.json({ group });
});

app.post('/api/groups/:id/join', auth, (req, res) => {
  const group = groups.find(g => g.id === req.params.id);
  if (!group) {
    return res.status(404).json({ message: 'Group not found' });
  }

  // Check if already member
  if (group.members.some(m => m.userId === req.user.userId)) {
    return res.status(400).json({ message: 'Already a member of this group' });
  }

  // Add user to group members
  group.members.push({
    userId: req.user.userId,
    role: 'member',
    joinedAt: new Date()
  });

  group.analytics.activeMembers += 1;

  // Add group to user's clubs
  const user = users.find(u => u.id === req.user.userId);
  if (user) {
    user.clubs.push({
      club: group,
      role: 'member'
    });
  }

  res.json({
    message: 'Joined group successfully',
    group
  });
});

// Messages routes
app.get('/api/messages/:groupId/:channel', auth, (req, res) => {
  const { groupId, channel } = req.params;
  
  const group = groups.find(g => g.id === groupId);
  if (!group) {
    return res.status(404).json({ message: 'Group not found' });
  }

  // Check if user is member
  if (!group.members.some(m => m.userId === req.user.userId)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const groupMessages = messages.filter(m => 
    m.groupId === groupId && m.channel === channel
  );

  // Mark messages as read
  const user = users.find(u => u.id === req.user.userId);
  groupMessages.forEach(message => {
    if (!message.readBy.some(read => read.userId === req.user.userId)) {
      message.readBy.push({
        userId: req.user.userId,
        readAt: new Date()
      });
    }
  });

  res.json({ 
    messages: groupMessages,
    pagination: { page: 1, limit: 50, total: groupMessages.length }
  });
});

app.post('/api/messages/send', [
  auth,
  body('content.text').optional().isLength({ max: 5000 }).withMessage('Message too long'),
  body('group').notEmpty().withMessage('Group is required'),
  body('channel').notEmpty().withMessage('Channel is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content, group, channel, type, replyTo } = req.body;

    // Check if user has access to group
    const groupDoc = groups.find(g => g.id === group);
    if (!groupDoc) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!groupDoc.members.some(m => m.userId === req.user.userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = users.find(u => u.id === req.user.userId);

    const message = {
      id: Date.now().toString(),
      content: content || {},
      type: type || 'text',
      sender: {
        id: req.user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar
      },
      groupId: group,
      channel,
      replyTo,
      reactions: [],
      mentions: [],
      readBy: [{
        userId: req.user.userId,
        readAt: new Date()
      }],
      isEdited: false,
      isPinned: false,
      createdAt: new Date()
    };

    messages.push(message);

    // Update group analytics
    groupDoc.analytics.totalMessages += 1;

    res.status(201).json({
      message: 'Message sent successfully',
      message: message
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Polls routes
app.post('/api/polls', [
  auth,
  body('question').notEmpty().withMessage('Question is required'),
  body('options').isArray({ min: 2 }).withMessage('At least 2 options required'),
  body('group').notEmpty().withMessage('Group is required'),
  body('channel').notEmpty().withMessage('Channel is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { question, options, group, channel, isMultiSelect, isAnonymous, endsAt } = req.body;

    // Check group access
    const groupDoc = groups.find(g => g.id === group);
    if (!groupDoc) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!groupDoc.members.some(m => m.userId === req.user.userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const poll = {
      id: Date.now().toString(),
      question,
      options: options.map(opt => ({ 
        text: opt, 
        votes: [], 
        voteCount: 0 
      })),
      createdBy: req.user.userId,
      group,
      channel,
      isMultiSelect: isMultiSelect || false,
      isAnonymous: isAnonymous || false,
      endsAt: endsAt ? new Date(endsAt) : undefined,
      isActive: true,
      totalVotes: 0,
      createdAt: new Date()
    };

    // Create a message for the poll
    const message = {
      id: (Date.now() + 1).toString(),
      content: { text: `📊 Poll: ${question}` },
      type: 'poll',
      sender: {
        id: req.user.userId,
        firstName: 'System',
        lastName: '',
        avatar: null
      },
      groupId: group,
      channel,
      metadata: { poll },
      readBy: [],
      createdAt: new Date()
    };

    messages.push(message);

    res.status(201).json({
      message: 'Poll created successfully',
      poll,
      message: message
    });
  } catch (error) {
    console.error('Create poll error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Simple routes for other endpoints
app.get('/api/announcements', auth, (req, res) => {
  res.json({ announcements: [], message: 'Announcements route working' });
});

app.get('/api/events', auth, (req, res) => {
  res.json({ events: [], message: 'Events route working' });
});

app.get('/api/notifications', auth, (req, res) => {
  res.json({ notifications: [], message: 'Notifications route working' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'CampusConnect API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    stats: {
      users: users.length,
      groups: groups.length,
      messages: messages.length
    }
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
      users: '/api/users',
      groups: '/api/groups',
      messages: '/api/messages',
      polls: '/api/polls',
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
    if (Array.isArray(groupIds)) {
      groupIds.forEach(groupId => {
        socket.join(groupId);
        console.log(`User ${socket.id} joined group: ${groupId}`);
      });
    }
  });

  socket.on('join_channel', ({ groupId, channel }) => {
    const roomId = `${groupId}-${channel}`;
    socket.join(roomId);
    console.log(`User ${socket.id} joined channel: ${roomId}`);
  });

  socket.on('send_message', (messageData) => {
    const roomId = `${messageData.groupId}-${messageData.channel}`;
    socket.to(roomId).emit('new_message', messageData);
    console.log(`📨 Message sent to ${roomId}`);
  });

  socket.on('typing_start', ({ groupId, channel, user }) => {
    const roomId = `${groupId}-${channel}`;
    socket.to(roomId).emit('user_typing', { user, typing: true });
  });

  socket.on('typing_stop', ({ groupId, channel, user }) => {
    const roomId = `${groupId}-${channel}`;
    socket.to(roomId).emit('user_typing', { user, typing: false });
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
  console.log(`🎯 Frontend: https://campus-connect1-beta.vercel.app`);
});
