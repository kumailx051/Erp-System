import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import {
  User,
  Mail,
  Camera,
  Save,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000';

const normalizeAvatarUrl = (avatarValue) => {
  if (!avatarValue || typeof avatarValue !== 'string') return '';

  const trimmed = avatarValue.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  const path = trimmed.replace(/\\/g, '/');
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

const HrProfilePage = () => {
  const { isDarkMode = false } = useOutletContext() || {};
  const storedUser = useMemo(() => JSON.parse(localStorage.getItem('erp_user') || '{}'), []);
  const token = localStorage.getItem('erp_token');

  const [profile, setProfile] = useState({
    name: storedUser.name || 'HR Admin',
    email: storedUser.email || 'hr.admin@techhorizon.com',
    avatar: storedUser.avatar || '',
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) {
        setError('Authentication required. Please login again.');
        setIsLoadingProfile(false);
        return;
      }

      try {
        setIsLoadingProfile(true);
        const response = await fetch('http://localhost:5000/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.message || 'Failed to fetch profile');
        }

        const user = data?.user || {};
        const avatarUrl = normalizeAvatarUrl(user.profileImage || storedUser.avatar || '');

        setProfile({
          name: user.fullName || storedUser.name || 'HR Admin',
          email: user.email || storedUser.email || '',
          avatar: avatarUrl
        });

        localStorage.setItem('erp_user', JSON.stringify({
          ...storedUser,
          id: user.id || storedUser.id,
          name: user.fullName || storedUser.name,
          email: user.email || storedUser.email,
          role: user.role || storedUser.role,
          avatar: avatarUrl
        }));
      } catch (err) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [token]);

  const onProfileChange = (key, value) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const onPasswordChange = (key, value) => {
    setPasswordForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAvatarUpload = (event) => {
    const uploadAvatar = async () => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file.');
        return;
      }

      if (!token) {
        setError('Authentication required. Please login again.');
        return;
      }

      try {
        setIsUploadingAvatar(true);
        setError('');
        setMessage('');

        const formData = new FormData();
        formData.append('avatar', file);

        const response = await fetch('http://localhost:5000/api/auth/me/avatar', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.message || 'Failed to upload avatar');
        }

        const user = data?.user || {};
        const avatarUrl = normalizeAvatarUrl(user.profileImage || '');

        onProfileChange('avatar', avatarUrl);

        localStorage.setItem('erp_user', JSON.stringify({
          ...storedUser,
          id: user.id || storedUser.id,
          name: user.fullName || profile.name,
          email: user.email || profile.email,
          role: user.role || storedUser.role,
          avatar: avatarUrl
        }));

        setMessage('Profile image updated successfully.');
      } catch (err) {
        setError(err.message || 'Failed to upload avatar');
      } finally {
        setIsUploadingAvatar(false);
        event.target.value = '';
      }
    };

    uploadAvatar();
  };

  const saveProfile = async (event) => {
    event.preventDefault();

    if (!token) {
      setError('Authentication required. Please login again.');
      return;
    }

    try {
      setIsSavingProfile(true);
      setError('');
      setMessage('');

      const response = await fetch('http://localhost:5000/api/auth/me/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullName: profile.name,
          email: profile.email
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to update profile');
      }

      const user = data?.user || {};
      const avatarUrl = normalizeAvatarUrl(user.profileImage || profile.avatar);

      localStorage.setItem('erp_user', JSON.stringify({
        ...storedUser,
        id: user.id || storedUser.id,
        name: user.fullName || profile.name,
        email: user.email || profile.email,
        role: user.role || storedUser.role,
        avatar: avatarUrl
      }));

      setProfile((prev) => ({
        ...prev,
        name: user.fullName || prev.name,
        email: user.email || prev.email,
        avatar: avatarUrl
      }));

      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setError('Please fill all password fields.');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    if (!token) {
      setError('Authentication required. Please login again.');
      return;
    }

    try {
      setIsSavingPassword(true);
      setError('');
      setMessage('');

      const response = await fetch('http://localhost:5000/api/auth/me/change-password', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to change password');
      }

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage('Password changed successfully.');
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const PasswordInput = ({
    label,
    value,
    onChange,
    show,
    toggle,
    placeholder,
  }) => (
    <div>
      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{label}</label>
      <div className="relative">
        <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full pl-11 pr-11 py-3 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-cyan-400/20 focus:border-cyan-400' : 'border-gray-200 text-gray-800 placeholder-gray-400 focus:ring-blue-500/20 focus:border-blue-400'}`}
        />
        <button
          type="button"
          onClick={toggle}
          className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-slate-500 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'}`}
          aria-label="Toggle password visibility"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl w-full mx-auto space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>HR Profile</h1>
        <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Manage your profile, avatar, email and password.</p>
      </div>

      {isLoadingProfile && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-700' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
          Loading profile...
        </div>
      )}

      {message && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm ${isDarkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          <CheckCircle2 className="w-4 h-4" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${isDarkMode ? 'bg-red-500/10 text-red-300 border-red-500/20' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {error}
        </div>
      )}

      <div className="min-h-[calc(100vh-18rem)] flex items-center">
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <motion.form
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={saveProfile}
          className={`rounded-2xl p-8 border shadow-sm flex flex-col space-y-6 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}
        >
          <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Profile Details</h2>

          <div className="flex items-center gap-5">
            <div className={`w-20 h-20 rounded-full overflow-hidden flex items-center justify-center font-bold text-2xl border-2 ${isDarkMode ? 'bg-slate-900 text-cyan-300 border-cyan-500/20' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
              {profile.avatar ? (
                <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                (profile.name || 'H').charAt(0).toUpperCase()
              )}
            </div>

            <label className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl cursor-pointer transition-colors ${isDarkMode ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
              <Camera className="w-4 h-4" />
              {isUploadingAvatar ? 'Uploading...' : 'Upload Image'}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Name</label>
            <div className="relative">
              <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
              <input
                type="text"
                value={profile.name}
                onChange={(e) => onProfileChange('name', e.target.value)}
                placeholder="Your name"
                className={`w-full pl-11 pr-4 py-3 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-cyan-400/20 focus:border-cyan-400' : 'border-gray-200 text-gray-800 placeholder-gray-400 focus:ring-blue-500/20 focus:border-blue-400'}`}
                required
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Email</label>
            <div className="relative">
              <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
              <input
                type="email"
                value={profile.email}
                onChange={(e) => onProfileChange('email', e.target.value)}
                placeholder="you@company.com"
                className={`w-full pl-11 pr-4 py-3 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-cyan-400/20 focus:border-cyan-400' : 'border-gray-200 text-gray-800 placeholder-gray-400 focus:ring-blue-500/20 focus:border-blue-400'}`}
                required
              />
            </div>
          </div>

          <div className="mt-auto pt-2">
            <button
              type="submit"
              disabled={isSavingProfile || isLoadingProfile}
              className={`w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-white rounded-xl text-sm font-semibold transition-colors ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-950/30' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              <Save className="w-4 h-4" />
              {isSavingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </motion.form>

        <motion.form
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onSubmit={savePassword}
          className={`rounded-2xl p-8 border shadow-sm flex flex-col space-y-6 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}
        >
          <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Change Password</h2>

          <PasswordInput
            label="Current Password"
            value={passwordForm.currentPassword}
            onChange={(e) => onPasswordChange('currentPassword', e.target.value)}
            show={showPassword.current}
            toggle={() => setShowPassword((prev) => ({ ...prev, current: !prev.current }))}
            placeholder="Enter current password"
          />

          <PasswordInput
            label="New Password"
            value={passwordForm.newPassword}
            onChange={(e) => onPasswordChange('newPassword', e.target.value)}
            show={showPassword.next}
            toggle={() => setShowPassword((prev) => ({ ...prev, next: !prev.next }))}
            placeholder="Minimum 8 characters"
          />

          <PasswordInput
            label="Confirm New Password"
            value={passwordForm.confirmPassword}
            onChange={(e) => onPasswordChange('confirmPassword', e.target.value)}
            show={showPassword.confirm}
            toggle={() => setShowPassword((prev) => ({ ...prev, confirm: !prev.confirm }))}
            placeholder="Re-enter new password"
          />

          <div className="mt-auto pt-2">
            <button
              type="submit"
              disabled={isSavingPassword || isLoadingProfile}
              className={`w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-white rounded-xl text-sm font-semibold transition-colors ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-950/30' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              <Save className="w-4 h-4" />
              {isSavingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </motion.form>
      </div>
      </div>
    </div>
  );
};

export default HrProfilePage;
