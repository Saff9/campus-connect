const express = require('express');
const { auth } = require('../middleware/auth');
const Message = require('../models/Message');
const Group = require('../models/Group');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// @route   GET /api/messages/:groupId/:channel
// @desc    Get messages for a channel
router.get('/:groupId/:channel', auth, async (req, res) => {
  try {
    const { groupId, channel } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Check if user has access to group and channel
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.isMember(req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const channelExists = group.channels.find(ch => ch.name === channel);
    if (!channelExists) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    // Get messages
    const messages = await Message.find({
      group: groupId,
      channel
    })
      .populate('sender', 'firstName lastName avatar')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Mark messages as read
    await Message.updateMany(
      {
        group: groupId,
        channel,
        'readBy.user': { $ne: req.user.id }
      },
      {
        $push: {
          readBy: {
            user: req.user.id,
            readAt: new Date()
          }
        }
      }
    );

    res.json({
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        page,
        limit,
        total: await Message.countDocuments({ group: groupId, channel })
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/messages/send
// @desc    Send a message
router.post('/send', [
  auth,
  body('content.text').optional().isLength({ max: 5000 }).withMessage('Message too long'),
  body('group').notEmpty().withMessage('Group is required'),
  body('channel').notEmpty().withMessage('Channel is required'),
  body('type').isIn(['text', 'image', 'file', 'voice', 'poll', 'announcement', 'event']).withMessage('Invalid message type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content, group, channel, type, replyTo } = req.body;

    // Check if user has access to group and channel
    const groupDoc = await Group.findById(group);
    if (!groupDoc) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!groupDoc.isMember(req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const channelExists = groupDoc.channels.find(ch => ch.name === channel);
    if (!channelExists) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    // Create message
    const message = new Message({
      content,
      type,
      sender: req.user.id,
      group,
      channel,
      replyTo
    });

    await message.save();
    await message.populate('sender', 'firstName lastName avatar');

    // Update group analytics
    groupDoc.analytics.totalMessages += 1;
    await groupDoc.save();

    res.status(201).json({
      message: 'Message sent successfully',
      message: message
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/messages/:id
// @desc    Update a message
router.put('/:id', auth, async (req, res) => {
  try {
    const { content } = req.body;

    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is the sender
    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Can only edit your own messages' });
    }

    // Update message
    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();

    await message.save();
    await message.populate('sender', 'firstName lastName avatar');

    res.json({
      message: 'Message updated successfully',
      message: message
    });
  } catch (error) {
    console.error('Update message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/messages/:id
// @desc    Delete a message
router.delete('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is the sender or admin/moderator
    const group = await Group.findById(message.group);
    const isAdminOrModerator = group.isAdminOrModerator(req.user.id);

    if (message.sender.toString() !== req.user.id && !isAdminOrModerator) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    await Message.findByIdAndDelete(req.params.id);

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
