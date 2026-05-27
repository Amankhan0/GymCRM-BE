const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

// PUT /api/profile
const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, phone, avatar, gymName } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (phone !== undefined) user.phone = phone;
  if (avatar !== undefined) user.avatar = avatar;
  if (gymName !== undefined) user.gymName = gymName;

  await user.save();
  return success(
    res,
    {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatar: user.avatar,
      gymName: user.gymName,
    },
    'Profile updated'
  );
});

// PUT /api/profile/password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Both current and new passwords are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user || !(await user.matchPassword(currentPassword))) {
    return res.status(401).json({ success: false, message: 'Current password is incorrect' });
  }

  user.password = newPassword;
  await user.save();
  return success(res, null, 'Password updated');
});

module.exports = { updateProfile, changePassword };
