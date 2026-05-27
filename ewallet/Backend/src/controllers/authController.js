const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const admin = require('../config/firebase');

const signToken = (user) => {
  return jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1h' });
};

const register = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });

  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: 'Email already used' });

  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ name, email, password: hashed, role: 'user', balance: 0 });
  await user.save();

  const token = signToken(user);

  res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, balance: user.balance } });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Missing email or password' });

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  const token = signToken(user);
  res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, balance: user.balance } });
};

const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ message: 'Missing Google ID token' });
    }

    // Check if Firebase is initialized
    if (!admin || !admin.auth) {
      return res.status(500).json({ message: 'Firebase Admin SDK not initialized. Check server configuration.' });
    }

    // Verify the Google ID token with Firebase
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (verifyError) {
      console.error('Firebase ID token verification failed:', verifyError.message);
      return res.status(401).json({ message: 'Invalid Google ID token: ' + verifyError.message });
    }

    const { email, name, picture, uid } = decodedToken;

    if (!email) {
      return res.status(400).json({ message: 'Email not found in Google account' });
    }

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user with Google account
      user = new User({
        name: name || email.split('@')[0],
        email,
        password: await bcrypt.hash(uid + process.env.JWT_SECRET, 10), // Random password
        role: 'user',
        balance: 0,
        googleId: uid
      });
      await user.save();
    } else if (!user.googleId) {
      // Link existing account with Google
      user.googleId = uid;
      await user.save();
    }

    const token = signToken(user);
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        balance: user.balance 
      } 
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ message: 'Google authentication failed: ' + error.message });
  }
};

module.exports = { register, login, googleAuth };
