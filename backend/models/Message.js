const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    text: String,
    attachments: [{
      url: String,
      type: { type: String, enum: ['image', 'video', 'audio', 'file'] },
      name: String,
      size: Number,
      thumbnail: String
    }]
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'voice', 'poll', 'announcement', 'event'],
    default: 'text'
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  channel: {
    type: String,
    required: true
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  thread: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }],
  reactions: [{
    emoji: String,
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    count: { type: Number, default: 0 }
  }],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  isPinned: {
    type: Boolean,
    default: false
  },
  pinnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  pinnedAt: Date,
  encryption: {
    isEncrypted: { type: Boolean, default: false },
    key: String
  },
  metadata: {
    voiceDuration: Number, // for voice messages in seconds
    poll: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll' },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' }
  }
}, {
  timestamps: true
});

// Index for efficient querying
messageSchema.index({ group: 1, channel: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ 'content.text': 'text' });

// Virtual for message preview
messageSchema.virtual('preview').get(function() {
  if (this.type === 'text') {
    return this.content.text?.substring(0, 100) || '';
  } else if (this.type === 'image') {
    return '📷 Image';
  } else if (this.type === 'voice') {
    return '🎤 Voice message';
  } else if (this.type === 'poll') {
    return '📊 Poll';
  }
  return 'Message';
});

module.exports = mongoose.model('Message', messageSchema);
