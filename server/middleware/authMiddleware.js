import User from '../models/User.js';
import { verifyToken } from '../utils/generateToken.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    // Check Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      // Check cookies
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, please log in' });
    }

    try {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({ success: false, message: 'User belonging to this token no longer exists' });
      }

      req.user = user;
      next();
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token, please log in again' });
    }
  } catch (error) {
    next(error);
  }
};
