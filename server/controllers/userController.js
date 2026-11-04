import User from '../models/User.js';

/**
 * @desc    Search users by username or full name
 * @route   GET /api/users/search?q=query
 * @access  Private
 */
export const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      // If query is empty, return suggested/recent users (excluding self)
      const recentUsers = await User.find({ _id: { $ne: req.user._id } })
        .select('fullName username profilePicture bio isOnline lastSeen')
        .sort({ isOnline: -1, lastSeen: -1 })
        .limit(20);

      return res.status(200).json({
        success: true,
        users: recentUsers,
      });
    }

    const searchRegex = new RegExp(q.trim(), 'i');

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [{ username: searchRegex }, { fullName: searchRegex }],
    })
      .select('fullName username profilePicture bio isOnline lastSeen')
      .limit(30);

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user profile by ID
 * @route   GET /api/users/:id
 * @access  Private
 */
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select(
      'fullName username profilePicture bio isOnline lastSeen createdAt'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update current user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { fullName, bio, username } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (fullName) user.fullName = fullName.trim();
    if (bio !== undefined) user.bio = bio.trim();

    if (username && username.toLowerCase().trim() !== user.username) {
      const existing = await User.findOne({ username: username.toLowerCase().trim() });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Username is already taken' });
      }
      user.username = username.toLowerCase().trim();
    }

    if (req.file) {
      user.profilePicture = `/uploads/avatars/${req.file.filename}`;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};
