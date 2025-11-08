const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password not required for Google OAuth
    }
  },
  googleId: {
    type: String,
    sparse: true
  },
  avatar: {
    url: String,
    publicId: String
  },
  bio: {
    type: String,
    maxlength: 500
  },
  role: {
    type: String,
    enum: ['student', 'club_admin', 'organization_admin', 'super_admin'],
    default: 'student'
  },
  studyMode: {
    enabled: { type: Boolean, default: false },
    schedule: {
      start: String, // "22:00"
      end: String,   // "07:00"
      days: [String] // ["mon", "tue", "wed", "thu", "fri"]
    }
  },
  notificationPreferences: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sound: { type: Boolean, default: true },
    priorityOnly: { type: Boolean, default: false }
  },
  clubs: [{
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    role: { type: String, enum: ['member', 'admin', 'moderator'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ['online', 'offline', 'away', 'busy'],
    default: 'offline'
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for search functionality
userSchema.index({ firstName: 'text', lastName: 'text', email: 'text' });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('User', userSchema);
