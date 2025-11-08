const express = require('express');
const { auth } = require('../middleware/auth');
const Group = require('../models/Group');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// @route   GET /api/groups
// @desc    Get user's groups
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'clubs.club',
      select: 'name description type avatar privacy members channels settings'
    });

    const groups = user.clubs.map(club => club.club);

    res.json({ groups });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/groups
// @desc    Create new group
router.post('/', [
  auth,
  body('name').notEmpty().withMessage('Group name is required'),
  body('type').isIn(['club', 'organization', 'study_group', 'class', 'project']).withMessage('Invalid group type'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, type, privacy, tags } = req.body;

    // Create group
    const group = new Group({
      name,
      description,
      type,
      privacy: privacy || 'public',
      tags: tags || [],
      admin: req.user.id,
      members: [{
        user: req.user.id,
        role: 'member',
        joinedAt: new Date()
      }],
      channels: [
        { name: 'general', type: 'text', description: 'General discussions' },
        { name: 'announcements', type: 'announcements', description: 'Important announcements' }
      ]
    });

    await group.save();

    // Add group to user's clubs
    await User.findByIdAndUpdate(req.user.id, {
      $push: {
        clubs: {
          club: group._id,
          role: 'admin'
        }
      }
    });

    res.status(201).json({
      message: 'Group created successfully',
      group
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/groups/:id
// @desc    Get group details
router.get('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('admin', 'firstName lastName email avatar')
      .populate('members.user', 'firstName lastName email avatar status')
      .populate('moderators.user', 'firstName lastName email avatar');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is member
    if (!group.isMember(req.user.id) && group.privacy === 'private') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ group });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/groups/:id/join
// @desc    Join a group
router.post('/:id/join', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if already member
    if (group.isMember(req.user.id)) {
      return res.status(400).json({ message: 'Already a member of this group' });
    }

    // Add user to group members
    group.members.push({
      user: req.user.id,
      role: 'member',
      joinedAt: new Date()
    });

    await group.save();

    // Add group to user's clubs
    await User.findByIdAndUpdate(req.user.id, {
      $push: {
        clubs: {
          club: group._id,
          role: 'member'
        }
      }
    });

    res.json({
      message: 'Joined group successfully',
      group
    });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/groups/:id/channels
// @desc    Create new channel
router.post('/:id/channels', [
  auth,
  body('name').notEmpty().withMessage('Channel name is required'),
  body('type').isIn(['text', 'voice', 'announcements', 'events', 'resources']).withMessage('Invalid channel type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is admin or moderator
    if (!group.isAdminOrModerator(req.user.id)) {
      return res.status(403).json({ message: 'Only admins and moderators can create channels' });
    }

    const { name, description, type, isPrivate } = req.body;

    // Check if channel already exists
    const existingChannel = group.channels.find(ch => ch.name === name);
    if (existingChannel) {
      return res.status(400).json({ message: 'Channel with this name already exists' });
    }

    group.channels.push({
      name,
      description,
      type: type || 'text',
      isPrivate: isPrivate || false,
      createdAt: new Date()
    });

    await group.save();

    res.status(201).json({
      message: 'Channel created successfully',
      channels: group.channels
    });
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
