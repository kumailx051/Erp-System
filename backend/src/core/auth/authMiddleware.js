const jwt = require('jsonwebtoken');
const { isTokenRevoked } = require('./tokenBlacklist');
const User = require('../../modules/admin/models/User');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (isTokenRevoked(token)) {
      return res.status(401).json({ message: 'Token has been revoked' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ message: 'JWT secret is not configured' });
    }

    const payload = jwt.verify(token, jwtSecret);

    const user = await User.findByPk(payload.sub, {
      attributes: ['id', 'role', 'is_active']
    });

    if (!user || !user.is_active) {
      return res.status(401).json({
        message: 'Account deactivated. Please contact administrator.'
      });
    }

    req.user = payload;
    req.token = token;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  return next();
}

module.exports = {
  requireAuth,
  requireAdmin
};
