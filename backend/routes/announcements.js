const express = require('express');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Temporary basic routes
router.get('/', auth, (req, res) => {
  res.json({ message: 'Announcements route working' });
});

router.post('/', auth, (req, res) => {
  res.json({ message: 'Create announcement route working' });
});

module.exports = router;
