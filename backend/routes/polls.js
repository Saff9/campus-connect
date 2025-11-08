const express = require('express');
const { auth } = require('../middleware/auth');
const Poll = require('../models/Poll');
const Group = require('../models/Group');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// @route   POST /api/polls
// @desc    Create a poll
router.post('/', [
  auth,
  body('question').notEmpty().withMessage('Question is required'),
  body('options').isArray({ min: 2 }).withMessage('At least 2 options required'),
  body('group').notEmpty().withMessage('Group is required'),
  body('channel').notEmpty().withMessage('Channel is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { question, options, group, channel, isMultiSelect, isAnonymous, endsAt } = req.body;

    // Check group access
    const groupDoc = await Group.findById(group);
    if (!groupDoc) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!groupDoc.isMember(req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Create poll
    const poll = new Poll({
      question,
      options: options.map(opt => ({ text: opt })),
      createdBy: req.user.id,
      group,
      channel,
      isMultiSelect: isMultiSelect || false,
      isAnonymous: isAnonymous || false,
      endsAt: endsAt ? new Date(endsAt) : undefined
    });

    await poll.save();

    res.status(201).json({
      message: 'Poll created successfully',
      poll
    });
  } catch (error) {
    console.error('Create poll error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/polls/:id/vote
// @desc    Vote on a poll
router.post('/:id/vote', [
  auth,
  body('optionIndex').isInt({ min: 0 }).withMessage('Valid option index required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { optionIndex } = req.body;
    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    // Check if poll is active
    if (!poll.isActive) {
      return res.status(400).json({ message: 'Poll is closed' });
    }

    if (poll.endsAt && new Date() > poll.endsAt) {
      poll.isActive = false;
      await poll.save();
      return res.status(400).json({ message: 'Poll has ended' });
    }

    // Check if user has already voted
    const hasVoted = poll.options.some(option => 
      option.votes.some(vote => vote.toString() === req.user.id)
    );

    if (hasVoted && !poll.isMultiSelect) {
      return res.status(400).json({ message: 'You have already voted on this poll' });
    }

    // Add vote
    const option = poll.options[optionIndex];
    if (!option) {
      return res.status(400).json({ message: 'Invalid option' });
    }

    if (!option.votes.includes(req.user.id)) {
      option.votes.push(req.user.id);
      option.voteCount = option.votes.length;
    }

    await poll.save();

    res.json({
      message: 'Vote recorded successfully',
      poll
    });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/polls/:id
// @desc    Get poll details
router.get('/:id', auth, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id)
      .populate('createdBy', 'firstName lastName avatar')
      .populate('options.votes', 'firstName lastName');

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    // Check group access
    const group = await Group.findById(poll.group);
    if (!group.isMember(req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ poll });
  } catch (error) {
    console.error('Get poll error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
