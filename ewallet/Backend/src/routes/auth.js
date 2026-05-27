const express = require('express');
const router = express.Router();
const { register, login, googleAuth } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
// Google auth only if Firebase is initialized
try {
  router.post('/google', googleAuth);
} catch (e) {
  console.warn('Google auth not available:', e.message);
}

module.exports = router;
