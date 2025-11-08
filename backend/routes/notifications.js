const express = require('express');
const { auth } = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, (req, res) => {
  res.json({ message: 'Notifications route working' });
});

module.exports = router;
