import User from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';

// Cookie options helper
const getCookieOptions = (rememberMe = false) => {
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
  };
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { fullName, username, email, password, confirmPassword, bio } = req.body;

    // Validate required fields
    if (!fullName || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, username, email, and password.',
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }

    // Check existing email
    const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    // Check existing username
    const existingUsername = await User.findOne({ username: username.toLowerCase().trim() });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username is already taken. Please choose another one.',
      });
    }

    // Avatar path if uploaded
    let profilePicture = '';
    if (req.file) {
      profilePicture = `/uploads/avatars/${req.file.filename}`;
    }

    const user = await User.create({
      fullName: fullName.trim(),
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      password,
      profilePicture,
      bio: bio ? bio.trim() : 'Hey there! I am using RealTime Chat.',
      isOnline: true,
      lastSeen: new Date(),
    });

    const token = generateToken(user._id);

    res.cookie('token', token, getCookieOptions(true));

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Log in user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { loginId, password, rememberMe } = req.body;

    if (!loginId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username or email and password.',
      });
    }

    const normalizedLoginId = loginId.toLowerCase().trim();

    // Query user by email OR username (include password field)
    const user = await User.findOne({
      $or: [{ email: normalizedLoginId }, { username: normalizedLoginId }],
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please check your username/email and password.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please check your username/email and password.',
      });
    }

    // Mark online
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.cookie('token', token, getCookieOptions(rememberMe));

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Log out current user
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        isOnline: false,
        lastSeen: new Date(),
      });
    }

    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get currently logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
};
