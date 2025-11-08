const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: 1000
  },
  type: {
    type: String,
    enum: ['club', 'organization', 'study_group', 'class', 'project'],
    required: true
  },
  avatar: {
    url: String,
    publicId: String
  },
  banner: {
    url: String,
    publicId: String
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  moderators: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now }
  }],
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['member', 'moderator'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    notifications: { type: Boolean, default: true }
  }],
  privacy: {
    type: String,
    enum: ['public', 'private', 'hidden'],
    default: 'public'
  },
  joinCode: {
    type: String,
    sparse: true
  },
  channels: [{
    name: { type: String, required: true },
    description: { type: String },
    type: { 
      type: String, 
      enum: ['text', 'voice', 'announcements', 'events', 'resources'],
      default: 'text'
    },
    isPrivate: { type: Boolean, default: false },
    allowedRoles: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
  }],
  settings: {
    allowInvites: { type: Boolean, default: true },
    slowMode: { type: Number, default: 0 }, // seconds between messages
    fileSharing: { type: Boolean, default: true },
    pollCreation: { type: String, enum: ['admins', 'all'], default: 'all' }
  },
  analytics: {
    totalMessages: { type: Number, default: 0 },
    activeMembers: { type: Number, default: 0 },
    engagementRate: { type: Number, default: 0 }
  },
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for search and filtering
groupSchema.index({ name: 'text', description: 'text', tags: 'text' });
groupSchema.index({ type: 1, privacy: 1 });

// Method to check if user is member
groupSchema.methods.isMember = function(userId) {
  return this.members.some(member => member.user.toString() === userId.toString());
};

// Method to check if user is admin or moderator
groupSchema.methods.isAdminOrModerator = function(userId) {
  return this.admin.toString() === userId.toString() || 
         this.moderators.some(mod => mod.user.toString() === userId.toString());
};

module.exports = mongoose.model('Group', groupSchema);
