const express = require('express');
const { auth } = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, (req, res) => {
  res.json({ message: 'Events route working' });
});

router.post('/', auth, (req, res) => {
  res.json({ message: 'Create event route working' });
});

module.exports = router;
