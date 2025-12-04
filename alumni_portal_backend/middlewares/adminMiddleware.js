const authMiddleware = require('./authMiddleware');

// Middleware to verify user is admin
// This should be used after authMiddleware
const verifyAdmin = (req, res, next) => {
  // Check if user is authenticated and is admin
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }

  next();
};

// Combined middleware: auth + admin check
const requireAdmin = (req, res, next) => {
  authMiddleware(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    
    next();
  });
};

module.exports = requireAdmin;
