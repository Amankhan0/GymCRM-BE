const jwt = require('jsonwebtoken');

// Default expiry shortened from 7d to 1d so a stolen token's blast radius is one day, not a week.
// Algorithm is pinned to HS256 so a forged token with alg=none can't be accepted.
const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
};

module.exports = generateToken;
