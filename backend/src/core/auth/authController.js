const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../../modules/admin/models/User');
const Candidate = require('../../modules/hr/models/Candidate');
const { Employee } = require('../../modules/hr/models/Employee');
const { revokeToken } = require('./tokenBlacklist');
const path = require('path');
const fs = require('fs');

function sanitizeUser(user) {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    profileImage: user.profile_image || null,
    role: user.role,
    isActive: user.is_active,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}

async function getAuthenticatedUser(req, res) {
  try {
    const userId = req.user?.sub;
    const user = await User.findByPk(userId);

    if (!user || !user.is_active) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'Profile fetched successfully',
      user: sanitizeUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
}

async function updateAuthenticatedUserProfile(req, res) {
  try {
    const userId = req.user?.sub;
    const fullName = String(req.body?.fullName || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();

    if (!fullName || !email) {
      return res.status(400).json({
        message: 'Full name and email are required'
      });
    }

    const user = await User.findByPk(userId);
    if (!user || !user.is_active) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser && existingUser.id !== user.id) {
      return res.status(409).json({
        message: 'Another account with this email already exists'
      });
    }

    user.full_name = fullName;
    user.email = email;
    user.updated_at = new Date();
    await user.save();

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: sanitizeUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to update profile',
      error: error.message
    });
  }
}

async function changeAuthenticatedUserPassword(req, res) {
  try {
    const userId = req.user?.sub;
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    const confirmPassword = String(req.body?.confirmPassword || '');

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: 'All password fields are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: 'New password must be at least 8 characters'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: 'New password and confirm password do not match'
      });
    }

    const user = await User.findByPk(userId);
    if (!user || !user.is_active) {
      return res.status(404).json({ message: 'User not found' });
    }

    let isCurrentPasswordValid = false;
    try {
      isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    } catch {
      isCurrentPasswordValid = false;
    }

    if (!isCurrentPasswordValid && user.password_hash === currentPassword) {
      isCurrentPasswordValid = true;
    }

    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password_hash = await bcrypt.hash(newPassword, 10);
    user.temporary_password = null;
    user.updated_at = new Date();
    await user.save();

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to update password',
      error: error.message
    });
  }
}

async function uploadAuthenticatedUserAvatar(req, res) {
  try {
    const userId = req.user?.sub;

    if (!req.file) {
      return res.status(400).json({ message: 'No avatar file uploaded' });
    }

    if (!String(req.file.mimetype || '').startsWith('image/')) {
      return res.status(400).json({ message: 'Only image files are allowed' });
    }

    const user = await User.findByPk(userId);
    if (!user || !user.is_active) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.profile_image) {
      const oldAvatarPath = user.profile_image.startsWith('/')
        ? path.join(__dirname, '../../..', user.profile_image)
        : path.join(__dirname, '../../..', 'uploads', path.basename(user.profile_image));

      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    user.profile_image = `/uploads/${req.file.filename}`;
    user.updated_at = new Date();
    await user.save();

    return res.status(200).json({
      message: 'Avatar uploaded successfully',
      user: sanitizeUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to upload avatar',
      error: error.message
    });
  }
}

function signAuthToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

async function hasEmployeeProfile(user) {
  if (!user || user.role !== 'employee') {
    return true;
  }

  const employee = await Employee.findOne({
    where: {
      is_active: true,
      email: String(user.email || '').trim().toLowerCase()
    }
  });

  return Boolean(employee);
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Email is required'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ where: { email: normalizedEmail } });

    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.password_hash) {
      const tempToken = jwt.sign(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
          purpose: 'temp_password_change'
        },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      return res.status(200).json({
        message: 'Welcome! Please set your password on first login',
        requiresPasswordChange: true,
        tempToken,
        user: sanitizeUser(user)
      });
    }

    if (user.temporary_password) {
      const isTemporaryPassword = user.temporary_password === password;

      if (!isTemporaryPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const tempToken = jwt.sign(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
          purpose: 'temp_password_change'
        },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      return res.status(200).json({
        message: 'Temporary password verified',
        requiresPasswordChange: true,
        tempToken,
        user: sanitizeUser(user)
      });
    }

    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, user.password_hash);
    } catch {
      isPasswordValid = false;
    }

    // Allows bootstrap users where plain password is temporarily stored in password_hash.
    if (!isPasswordValid && user.password_hash === password) {
      isPasswordValid = true;
    }

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ message: 'JWT secret is not configured' });
    }

    const token = signAuthToken(user);
    const employeeProfileExists = await hasEmployeeProfile(user);

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: sanitizeUser(user),
      requiresEmployeeProfileCompletion: user.role === 'employee' && !employeeProfileExists
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Server error during login',
      error: error.message
    });
  }
}

async function changeTemporaryPassword(req, res) {
  try {
    const { tempToken, newPassword } = req.body;

    if (!tempToken || !newPassword) {
      return res.status(400).json({
        message: 'Temporary token and new password are required'
      });
    }

    const nextPassword = String(newPassword).trim();
    if (nextPassword.length < 6) {
      return res.status(400).json({
        message: 'New password must be at least 6 characters'
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ message: 'JWT secret is not configured' });
    }

    let payload;
    try {
      payload = jwt.verify(tempToken, jwtSecret);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired temporary token' });
    }

    if (payload.purpose !== 'temp_password_change') {
      return res.status(401).json({ message: 'Invalid temporary token' });
    }

    const user = await User.findByPk(payload.sub);
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    if (!user.temporary_password) {
      return res.status(400).json({ message: 'No temporary password setup is pending' });
    }

    user.password_hash = await bcrypt.hash(nextPassword, 10);
    user.temporary_password = null;
    await user.save();

    const token = signAuthToken(user);
    const employeeProfileExists = await hasEmployeeProfile(user);

    return res.status(200).json({
      message: 'Password updated successfully',
      token,
      user: sanitizeUser(user),
      requiresEmployeeProfileCompletion: user.role === 'employee' && !employeeProfileExists
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to update password',
      error: error.message
    });
  }
}

async function logout(req, res) {
  try {
    const token = req.token;
    const userPayload = req.user;

    if (!token || !userPayload || !userPayload.exp) {
      return res.status(400).json({ message: 'No active session found' });
    }

    revokeToken(token, userPayload.exp);
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to logout',
      error: error.message
    });
  }
}

// Create candidate account from job application
async function createCandidateAccount(req, res) {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '').trim();
    const confirmPassword = String(req.body?.confirmPassword || '').trim();

    if (!email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and confirm password are required'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password and confirm password do not match'
      });
    }

    const candidateProfile = await Candidate.findOne({
      where: { email, is_active: true },
      order: [['created_at', 'DESC']]
    });

    if (!candidateProfile) {
      return res.status(404).json({
        success: false,
        message: 'No job application found for this email'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Account already exists. Please login.'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with candidate role
    const newUser = await User.create({
      full_name: candidateProfile.full_name,
      email,
      password_hash: passwordHash,
      role: 'candidate',
      is_active: true
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create account',
      error: error.message
    });
  }
}

module.exports = {
  login,
  changeTemporaryPassword,
  logout,
  getAuthenticatedUser,
  updateAuthenticatedUserProfile,
  changeAuthenticatedUserPassword,
  uploadAuthenticatedUserAvatar,
  createCandidateAccount
};
