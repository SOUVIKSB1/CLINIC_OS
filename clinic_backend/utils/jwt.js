const jwt = require('jsonwebtoken');

function signToken(user) {
  return jwt.sign(
    { userId: user.USER_ID, role: user.ROLE, patientId: user.PATIENT_ID || null, email: user.EMAIL, doctorId: user.DOCTOR_ID || null },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { signToken, verifyToken };
