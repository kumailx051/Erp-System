import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const backgroundImageUrl = '/assets/images/backgroundImage.png';
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPageReady, setIsPageReady] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [invalidCredentialsMessage, setInvalidCredentialsMessage] = useState('');
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordSetupError, setPasswordSetupError] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (!invalidCredentialsMessage) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setInvalidCredentialsMessage('');
    }, 2600);

    return () => clearTimeout(timer);
  }, [invalidCredentialsMessage]);

  useEffect(() => {
    let isMounted = true;
    const img = new Image();
    img.src = backgroundImageUrl;

    const handleDone = () => {
      if (isMounted) {
        setIsPageReady(true);
      }
    };

    if (img.complete) {
      handleDone();
    } else {
      img.onload = handleDone;
      img.onerror = handleDone;
    }

    return () => {
      isMounted = false;
      img.onload = null;
      img.onerror = null;
    };
  }, [backgroundImageUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setInvalidCredentialsMessage('');

    const normalizedEmail = formData.email.trim().toLowerCase();
    if (!normalizedEmail.includes('@')) {
      setError('Email must include @ symbol.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password: formData.password || ''
        })
      });

      const data = await response.json();

      if (!response.ok) {
        const apiMessage = data.message || 'Invalid email or password';
        if (apiMessage.toLowerCase().includes('invalid credentials') || apiMessage.toLowerCase().includes('invalid email or password')) {
          setInvalidCredentialsMessage('Invalid email or password');
        } else {
          setError(apiMessage);
        }
        setIsLoading(false);
        return;
      }

      if (data.requiresPasswordChange) {
        setTempToken(data.tempToken || '');
        setShowPasswordSetup(true);
        setSuccessMessage('Temporary password verified. Please create a new password.');
        setIsLoading(false);
        return;
      }

      const backendUser = data.user || {};
      const role = backendUser.role || 'user';

      localStorage.setItem('erp_token', data.token || '');
      localStorage.setItem(
        'erp_user',
        JSON.stringify({
          id: backendUser.id,
          email: backendUser.email,
          name: backendUser.fullName,
          role,
          avatar: null
        })
      );
      localStorage.setItem(
        'erp_employee_profile_complete',
        data.requiresEmployeeProfileCompletion ? 'false' : 'true'
      );

      setSuccessMessage('Login successful! Redirecting...');
      setIsLoading(false);

      if (role === 'admin') {
        setTimeout(() => navigate('/dashboard/admin'), 1200);
      } else if (role === 'hr' || role === 'hr_admin') {
        setTimeout(() => navigate('/dashboard'), 1200);
      } else if (role === 'candidate') {
        setTimeout(() => navigate('/candidate/dashboard'), 1200);
      } else if (role === 'employee') {
        if (data.requiresEmployeeProfileCompletion) {
          setTimeout(() => navigate('/employee/complete-profile'), 1200);
        } else {
          setTimeout(() => navigate('/dashboard/employee'), 1200);
        }
      } else {
        setError('Your account does not have dashboard access yet.');
        setSuccessMessage('');
      }
    } catch (apiError) {
      setError('Cannot reach server. Make sure backend is running on port 5000.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemporaryPasswordUpdate = async (event) => {
    event.preventDefault();
    setPasswordSetupError('');

    const nextPassword = newPassword.trim();
    const confirmPassword = confirmNewPassword.trim();

    if (!nextPassword || !confirmPassword) {
      setPasswordSetupError('Please fill both password fields.');
      return;
    }

    if (nextPassword.length < 6) {
      setPasswordSetupError('New password must be at least 6 characters.');
      return;
    }

    if (nextPassword !== confirmPassword) {
      setPasswordSetupError('Passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/change-temporary-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tempToken,
          newPassword: nextPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setPasswordSetupError(data.message || 'Failed to update password.');
        return;
      }

      const backendUser = data.user || {};
      const role = backendUser.role || 'user';

      localStorage.setItem('erp_token', data.token || '');
      localStorage.setItem(
        'erp_user',
        JSON.stringify({
          id: backendUser.id,
          email: backendUser.email,
          name: backendUser.fullName,
          role,
          avatar: null
        })
      );
      localStorage.setItem(
        'erp_employee_profile_complete',
        data.requiresEmployeeProfileCompletion ? 'false' : 'true'
      );

      setShowPasswordSetup(false);
      setTempToken('');
      setNewPassword('');
      setConfirmNewPassword('');
      setSuccessMessage('Password updated successfully! Redirecting...');

      if (role === 'admin') {
        setTimeout(() => navigate('/dashboard/admin'), 900);
      } else if (role === 'hr' || role === 'hr_admin') {
        setTimeout(() => navigate('/dashboard'), 900);
      } else if (role === 'candidate') {
        setTimeout(() => navigate('/candidate/dashboard'), 900);
      } else if (role === 'employee') {
        if (data.requiresEmployeeProfileCompletion) {
          setTimeout(() => navigate('/employee/complete-profile'), 900);
        } else {
          setTimeout(() => navigate('/dashboard/employee'), 900);
        }
      } else {
        setError('Your account does not have dashboard access yet.');
      }
    } catch {
      setPasswordSetupError('Cannot reach server. Make sure backend is running on port 5000.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value
    });

    if (name === 'email') {
      if (value && !value.includes('@')) {
        setError('Email must include @ symbol.');
      } else if (error === 'Email must include @ symbol.') {
        setError('');
      }
    } else if (error) {
      setError('');
    }
  };

  if (!isPageReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600">
        <div className="w-14 h-14 border-4 border-white/40 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden bg-white"
      style={{
        backgroundColor: '#ffffff',
        backgroundImage: `url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <Link to="/" className="absolute top-8 left-8 z-20">
        <motion.button
          whileHover={{ scale: 1.05, x: -5 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Home</span>
        </motion.button>
      </Link>

      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, x: 30, y: -20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 30, y: -20 }}
            transition={{ duration: 0.25 }}
            className="absolute top-6 right-6 z-30 max-w-xs w-[calc(100%-3rem)] sm:w-auto"
          >
            <div className="flex items-center gap-2 bg-emerald-600/95 text-white rounded-xl px-4 py-3 shadow-xl border border-emerald-300/30 backdrop-blur">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{successMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {invalidCredentialsMessage && (
          <motion.div
            initial={{ opacity: 0, x: 30, y: -20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 30, y: -20 }}
            transition={{ duration: 0.25 }}
            className="absolute top-24 right-6 z-30 max-w-xs w-[calc(100%-3rem)] sm:w-auto"
          >
            <div className="flex items-center gap-2 bg-red-500/95 text-white rounded-xl px-4 py-3 shadow-xl border border-red-300/30 backdrop-blur">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{invalidCredentialsMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay */}
      <div className="absolute inset-0 bg-blue-950/20"></div>

      <AnimatePresence>
        {showPasswordSetup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/45"
          >
            <motion.form
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleTemporaryPasswordUpdate}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-200"
            >
              <h2 className="text-xl font-bold text-gray-900">Create New Password</h2>
              <p className="text-sm text-gray-600 mt-1">
                Your temporary password can only be used once. Set a new password to continue.
              </p>

              <div className="mt-5 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(event) => setConfirmNewPassword(event.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              {passwordSetupError && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                  {passwordSetupError}
                </div>
              )}

              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="mt-5 w-full rounded-xl bg-blue-600 text-white py-2.5 font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isUpdatingPassword ? 'Updating Password...' : 'Update Password'}
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated Background Blobs */}
      <motion.div
        className="absolute top-20 left-20 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.3, 1],
          x: [0, -30, 0],
          y: [0, -50, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-[36rem] mx-4 flex items-center justify-center"
      >
        <div className="w-[min(92vw,38rem)] h-[min(92vw,38rem)] min-h-[34rem] bg-white/20 backdrop-blur-2xl rounded-full shadow-2xl px-8 sm:px-12 py-10 sm:py-12 border border-white/30 ring-1 ring-white/20 flex flex-col justify-center overflow-hidden">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-6"
          >
            <div className="flex justify-center mb-4">
              <img 
                src="/assets/images/logo.png" 
                alt="Tech Horizon Logo" 
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Login</h1>
            <p className="text-blue-100">Welcome back to Tech Horizon ERP</p>
          </motion.div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="mb-4 flex items-center space-x-2 bg-red-500/20 border border-red-400/30 text-red-100 rounded-xl px-4 py-3 text-sm"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm mx-auto">
            {/* Email Input */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <label className="block text-white text-sm font-medium mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-300 w-5 h-5" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="username@gmail.com"
                  className="w-full pl-12 pr-4 py-3 bg-white/90 rounded-xl border border-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-gray-800 placeholder-gray-400 transition-all"
                  required
                />
              </div>
            </motion.div>

            {/* Password Input */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <label className="block text-white text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-300 w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Password"
                  className="w-full pl-12 pr-12 py-3 bg-white/90 rounded-xl border border-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-gray-800 placeholder-gray-400 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </motion.div>

            {/* Forgot Password */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center pt-1"
            >
              <a href="#" className="text-sm text-blue-200 hover:text-white transition-colors">
                Forgot Password?
              </a>
            </motion.div>

            {/* Sign In Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full max-w-[16rem] mx-auto bg-black text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:bg-gray-900 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign in</span>
                  <LogIn className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
