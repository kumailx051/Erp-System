import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Briefcase, 
  MapPin, 
  Clock, 
  TrendingUp, 
  Users, 
  Heart, 
  Zap,
  Globe,
  Award,
  Coffee,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  Loader,
  X,
  Upload,
  FileText,
  Mail,
  Phone,
  User,
  Plus,
  Trash2
} from 'lucide-react';
import Navigation from '../shared/components/Navigation';
import MouseGrains from '../shared/components/MouseGrains';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const normalizeOpening = (opening) => ({
  id: opening?.id,
  title: opening?.title || opening?.role || 'Untitled Role',
  role: opening?.role || opening?.title || 'Untitled Role',
  department: opening?.department || 'General',
  location: opening?.location || 'Not specified',
  role_type: opening?.role_type || 'Full-time Job',
  salary_type: opening?.salary_type || 'Paid',
  experience: opening?.experience || opening?.experience_required || 'Experience not specified',
  description: opening?.description || 'No description provided.',
  skills: Array.isArray(opening?.skills)
    ? opening.skills
    : String(opening?.skills || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  date_published: opening?.date_published || 'Recently posted',
  deadline: opening?.deadline || 'Not specified',
  status: String(opening?.status || '').trim()
});

const CareerPage = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('homepage_theme') === 'dark');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [openRoles, setOpenRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [applySuccess, setApplySuccess] = useState('');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountEmail, setAccountEmail] = useState('');
  const [appliedEmailForAccount, setAppliedEmailForAccount] = useState('');
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [accountSuccess, setAccountSuccess] = useState('');
  const [emailValidationError, setEmailValidationError] = useState('');
  const [emailValidationLoading, setEmailValidationLoading] = useState(false);
  const [accountForm, setAccountForm] = useState({
    password: '',
    confirmPassword: ''
  });
  const [applyForm, setApplyForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    experienceYears: '',
    coverLetter: '',
    cvFile: null,
    educationEntries: [{ degree: '', institution: '', year: '' }],
    experienceEntries: [{ company: '', title: '', duration: '' }]
  });

  // Ref for the apply form container to enable auto-scroll on success
  const formContainerRef = useRef(null);

  // Auto-scroll to top of form when success message appears
  useEffect(() => {
    if (applySuccess && formContainerRef.current) {
      formContainerRef.current.scrollTop = 0;
    }
  }, [applySuccess]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    localStorage.setItem('homepage_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Fetch job openings from API
  useEffect(() => {
    const fetchOpenings = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`${API_BASE_URL}/hr/public/current-openings`);

        if (!response?.data?.success) {
          throw new Error(response?.data?.message || 'Failed to load job openings');
        }

        const openings = Array.isArray(response?.data?.data?.openings)
          ? response.data.data.openings
          : [];

        const normalizedOpenings = openings
          .map(normalizeOpening)
          .filter((opening) => opening.status.toLowerCase() === 'open');

        setOpenRoles(normalizedOpenings);
      } catch (err) {
        console.error('Error fetching openings:', err);
        setError(err?.response?.data?.message || 'Failed to load job openings');
        setOpenRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOpenings();
  }, []);

  // Debounced email validation
  const validateEmailWithDebounce = React.useRef(null);
  
  const handleEmailBlur = async () => {
    const email = applyForm.email.trim().toLowerCase();
    if (!email || !selectedRole) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailValidationError('Invalid email format');
      return;
    }

    setEmailValidationLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/hr/public/check-email`, {
        email,
        roleId: selectedRole.id
      });

      if (response?.data?.exists) {
        setEmailValidationError('You have already applied for this role with this email');
      } else {
        setEmailValidationError('');
      }
    } catch (err) {
      console.error('Email validation error:', err);
      setEmailValidationError('');
    } finally {
      setEmailValidationLoading(false);
    }
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    // Extract only digits
    let digits = value.replace(/\D/g, '');
    
    // Ensure it starts with 92 (Pakistan country code)
    if (!digits.startsWith('92')) {
      digits = '92' + digits;
    }
    
    // Limit to 92 + 10 digits (12 total)
    if (digits.length > 12) {
      digits = digits.substring(0, 12);
    }
    
    // Format as +92XXXXXXXXXX
    let formatted = '';
    if (digits.length > 0) {
      formatted = '+' + digits;
    }
    
    setApplyForm((p) => ({ ...p, phone: formatted }));
  };

  const handleCreateAccountClick = () => {
    const email = (appliedEmailForAccount || applyForm.email || '').trim().toLowerCase();
    if (!email) {
      setAccountError('No submitted application email found. Please apply first.');
      return;
    }
    setAccountEmail(email);
    setAccountForm({ password: '', confirmPassword: '' });
    setAccountError('');
    setAccountSuccess('');
    setShowAccountModal(true);
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!accountEmail || !accountForm.password || !accountForm.confirmPassword) {
      setAccountError('All fields are required');
      return;
    }

    if (accountForm.password.length < 8) {
      setAccountError('Password must be at least 8 characters');
      return;
    }

    if (accountForm.password !== accountForm.confirmPassword) {
      setAccountError('Passwords do not match');
      return;
    }

    try {
      setAccountLoading(true);
      setAccountError('');

      const response = await axios.post(`${API_BASE_URL}/auth/create-candidate-account`, {
        email: accountEmail,
        password: accountForm.password,
        confirmPassword: accountForm.confirmPassword
      });

      if (response?.data?.success) {
        setAccountSuccess('Account created successfully! You can now login.');
        setTimeout(() => {
          setShowAccountModal(false);
          setShowApplyModal(false);
          window.location.href = '/login';
        }, 2000);
      } else {
        setAccountError(response?.data?.message || 'Failed to create account');
      }
    } catch (err) {
      const message = err?.response?.data?.message || 'Failed to create account';
      setAccountError(message);
    } finally {
      setAccountLoading(false);
    }
  };

  const closeApplyModal = () => {
    setShowApplyModal(false);
    setShowAccountModal(false);
    setSelectedRole(null);
    setApplyError('');
    setApplySuccess('');
    setEmailValidationError('');
    setAppliedEmailForAccount('');
    setAccountEmail('');
    setAccountForm({ password: '', confirmPassword: '' });
    setAccountError('');
    setAccountSuccess('');
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const scaleIn = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } }
  };

  const benefits = [
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: 'Competitive Salary',
      description: 'Market-leading compensation packages',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: 'Health Insurance',
      description: 'Comprehensive medical coverage',
      color: 'from-red-500 to-pink-500'
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: 'Remote Work',
      description: 'Flexible work from anywhere',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: 'Growth Opportunities',
      description: 'Career advancement programs',
      color: 'from-purple-500 to-indigo-500'
    },
    {
      icon: <Coffee className="w-6 h-6" />,
      title: 'Work-Life Balance',
      description: 'Flexible hours and paid time off',
      color: 'from-orange-500 to-amber-500'
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: 'Learning Budget',
      description: 'Annual education allowance',
      color: 'from-yellow-500 to-orange-500'
    }
  ];

  const roleTypes = ['All', 'Full-time Job', 'Internship', 'Part-time Job', 'Contract'];

  const filteredRoles = selectedDepartment === 'All' 
    ? openRoles 
    : openRoles.filter(role => role.role_type === selectedDepartment);

  const openApplyModal = (role) => {
    setSelectedRole(role);
    setApplyError('');
    setApplySuccess('');
    setAppliedEmailForAccount('');
    setApplyForm({
      fullName: '',
      email: '',
      phone: '',
      experienceYears: '',
      coverLetter: '',
      cvFile: null,
      educationEntries: [{ degree: '', institution: '', year: '' }],
      experienceEntries: [{ company: '', title: '', duration: '' }]
    });
    setShowApplyModal(true);
  };

  const handleApplySubmit = async (event) => {
    event.preventDefault();
    if (!selectedRole) return;

    if (!applyForm.cvFile) {
      setApplyError('Please upload your CV before submitting.');
      return;
    }

    // Validate phone format
    if (!applyForm.phone || applyForm.phone.length !== 13) {
      setApplyError('Please enter a valid phone number (+92 + 10 digits).');
      return;
    }

    // Check for email validation error
    if (emailValidationError) {
      setApplyError('Please resolve email validation error before submitting.');
      return;
    }

    try {
      setApplyLoading(true);
      setApplyError('');
      setApplySuccess('');

      const formData = new FormData();
      formData.append('fullName', applyForm.fullName);
      formData.append('email', applyForm.email);
      formData.append('phone', applyForm.phone);
      formData.append('experienceYears', applyForm.experienceYears);
      formData.append('coverLetter', applyForm.coverLetter);
      formData.append('educationEntries', JSON.stringify(applyForm.educationEntries));
      formData.append('experienceEntries', JSON.stringify(applyForm.experienceEntries));
      formData.append('roleId', String(selectedRole.id));
      formData.append('cv', applyForm.cvFile);

      const response = await axios.post(`${API_BASE_URL}/hr/public/apply`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (!response?.data?.success) {
        throw new Error(response?.data?.message || 'Failed to submit application');
      }

      setApplySuccess('Application submitted successfully! ✨');
      setAppliedEmailForAccount(applyForm.email.trim().toLowerCase());
      setApplyForm((prev) => ({
        ...prev,
        fullName: '',
        email: '',
        phone: '',
        experienceYears: '',
        coverLetter: '',
        cvFile: null,
        educationEntries: [{ degree: '', institution: '', year: '' }],
        experienceEntries: [{ company: '', title: '', duration: '' }]
      }));
      setEmailValidationError('');
    } catch (submitError) {
      setApplyError(submitError?.response?.data?.message || submitError.message || 'Failed to submit application');
    } finally {
      setApplyLoading(false);
    }
  };

  const addEducationRow = () => {
    setApplyForm((prev) => ({
      ...prev,
      educationEntries: [...prev.educationEntries, { degree: '', institution: '', year: '' }]
    }));
  };

  const removeEducationRow = (index) => {
    setApplyForm((prev) => ({
      ...prev,
      educationEntries:
        prev.educationEntries.length === 1
          ? prev.educationEntries
          : prev.educationEntries.filter((_, i) => i !== index)
    }));
  };

  const updateEducationRow = (index, key, value) => {
    setApplyForm((prev) => ({
      ...prev,
      educationEntries: prev.educationEntries.map((entry, i) => (
        i === index ? { ...entry, [key]: value } : entry
      ))
    }));
  };

  const addExperienceRow = () => {
    setApplyForm((prev) => ({
      ...prev,
      experienceEntries: [...prev.experienceEntries, { company: '', title: '', duration: '' }]
    }));
  };

  const removeExperienceRow = (index) => {
    setApplyForm((prev) => ({
      ...prev,
      experienceEntries:
        prev.experienceEntries.length === 1
          ? prev.experienceEntries
          : prev.experienceEntries.filter((_, i) => i !== index)
    }));
  };

  const updateExperienceRow = (index, key, value) => {
    setApplyForm((prev) => ({
      ...prev,
      experienceEntries: prev.experienceEntries.map((entry, i) => (
        i === index ? { ...entry, [key]: value } : entry
      ))
    }));
  };

  return (
    <div className={`min-h-screen overflow-hidden transition-colors duration-500 ${
      isDarkMode ? 'bg-[#08151f]' : 'bg-gray-50'
    }`}>
      {/* Navigation */}
      <Navigation 
        isScrolled={isScrolled} 
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />

      {/* Hero Section with Node Background */}
      <section className={`relative pt-40 pb-24 px-4 md:px-6 overflow-hidden ${
        isDarkMode
          ? 'bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_28%),linear-gradient(180deg,_#07131b_0%,_#0a1e29_45%,_#08151f_100%)]'
          : 'bg-gradient-to-br from-blue-50 via-white to-cyan-50'
      }`}>
        {/* Mouse Grain Effect - Only in Hero */}
        <MouseGrains isDarkMode={isDarkMode} />
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center"
          >
            <motion.div variants={fadeInUp} className="inline-block mb-6">
              <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                isDarkMode 
                  ? 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/20' 
                  : 'bg-blue-100 text-blue-700 border border-blue-200'
              }`}>
                <Briefcase className="w-4 h-4 mr-2" />
                Join Our Team
              </span>
            </motion.div>

            <motion.h1 
              variants={fadeInUp}
              className={`text-5xl md:text-7xl font-extrabold mb-6 ${
                isDarkMode 
                  ? 'bg-gradient-to-r from-cyan-300 via-emerald-300 to-cyan-300 bg-clip-text text-transparent' 
                  : 'bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent'
              }`}
            >
              Build Your Career
              <br />
              <span className={isDarkMode ? 'text-cyan-50' : 'text-gray-900'}>
                With Innovation
              </span>
            </motion.h1>

            <motion.p 
              variants={fadeInUp}
              className={`text-xl md:text-2xl max-w-3xl mx-auto mb-12 ${
                isDarkMode ? 'text-cyan-50/70' : 'text-gray-600'
              }`}
            >
              Join a team of passionate innovators building the future of enterprise software. 
              Where your ideas matter and your growth is our priority.
            </motion.p>

            <motion.div 
              variants={fadeInUp}
              className="flex flex-wrap gap-4 justify-center"
            >
              <motion.a
                href="#open-roles"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 inline-flex items-center ${
                  isDarkMode
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40 hover:bg-cyan-500 hover:shadow-xl hover:shadow-cyan-900/50'
                    : 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/40'
                }`}
              >
                View Open Positions
                <ArrowRight className="ml-2 w-5 h-5" />
              </motion.a>
            </motion.div>
          </motion.div>
        </div>

        {/* Floating Elements */}
        <motion.div
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 5, 0]
          }}
          transition={{ 
            duration: 6, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-32 right-10 opacity-20"
        >
          <Users className={`w-24 h-24 ${isDarkMode ? 'text-cyan-400' : 'text-blue-400'}`} />
        </motion.div>

        <motion.div
          animate={{ 
            y: [0, 20, 0],
            rotate: [0, -5, 0]
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-10 left-10 opacity-20"
        >
          <Zap className={`w-32 h-32 ${isDarkMode ? 'text-emerald-400' : 'text-cyan-400'}`} />
        </motion.div>
      </section>

      {/* Benefits Section */}
      <section className={`py-20 px-4 md:px-6 relative ${
        isDarkMode ? 'bg-[#08151f]' : 'bg-white'
      }`}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2 
              variants={fadeInUp}
              className={`text-4xl md:text-5xl font-bold mb-4 ${
                isDarkMode ? 'text-cyan-50' : 'text-gray-900'
              }`}
            >
              Why Join Tech Horizon?
            </motion.h2>
            <motion.p 
              variants={fadeInUp}
              className={`text-lg ${isDarkMode ? 'text-cyan-50/60' : 'text-gray-600'}`}
            >
              We invest in our people with benefits that matter
            </motion.p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                variants={scaleIn}
                whileHover={{ y: -8, scale: 1.02 }}
                className={`p-8 rounded-2xl transition-all duration-300 ${
                  isDarkMode
                    ? 'bg-gradient-to-br from-cyan-900/20 to-cyan-800/10 border border-cyan-400/20 hover:border-cyan-400/40 hover:shadow-xl hover:shadow-cyan-900/20'
                    : 'bg-white border border-gray-200 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10'
                }`}
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${benefit.color} flex items-center justify-center mb-6 text-white`}>
                  {benefit.icon}
                </div>
                <h3 className={`text-xl font-bold mb-3 ${isDarkMode ? 'text-cyan-50' : 'text-gray-900'}`}>
                  {benefit.title}
                </h3>
                <p className={isDarkMode ? 'text-cyan-50/60' : 'text-gray-600'}>
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Open Roles Section */}
      <section id="open-roles" className={`py-20 px-4 md:px-6 relative ${
        isDarkMode ? 'bg-[#0a1e29]' : 'bg-gray-50'
      }`}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.h2 
              variants={fadeInUp}
              className={`text-4xl md:text-5xl font-bold mb-4 ${
                isDarkMode ? 'text-cyan-50' : 'text-gray-900'
              }`}
            >
              Open Roles
            </motion.h2>
            <motion.p 
              variants={fadeInUp}
              className={`text-lg mb-8 ${isDarkMode ? 'text-cyan-50/60' : 'text-gray-600'}`}
            >
              Find your perfect position and start your journey with us
            </motion.p>
            <motion.p
              variants={fadeInUp}
              className={`text-sm mb-6 ${isDarkMode ? 'text-cyan-50/50' : 'text-gray-500'}`}
            >
              {openRoles.length} open role{openRoles.length === 1 ? '' : 's'} available
            </motion.p>

            {/* Role Type Filter */}
            <motion.div 
              variants={fadeInUp}
              className="flex flex-wrap gap-3 justify-center"
            >
              {roleTypes.map((type) => (
                <motion.button
                  key={type}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDepartment(type)}
                  className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${
                    selectedDepartment === type
                      ? isDarkMode
                        ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40'
                        : 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : isDarkMode
                        ? 'bg-cyan-900/20 text-cyan-300 border border-cyan-400/20 hover:bg-cyan-900/30'
                        : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </motion.button>
              ))}
            </motion.div>
          </motion.div>

          {/* Job Listings */}
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <Loader className={`w-12 h-12 animate-spin ${isDarkMode ? 'text-cyan-400' : 'text-blue-600'}`} />
              <p className={`mt-4 text-lg ${isDarkMode ? 'text-cyan-50/60' : 'text-gray-600'}`}>
                Loading open positions...
              </p>
            </motion.div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <p className={`text-xl ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                {error}
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.reload()}
                className={`mt-6 px-6 py-3 rounded-xl font-semibold ${
                  isDarkMode
                    ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Try Again
              </motion.button>
            </motion.div>
          ) : filteredRoles.length > 0 ? (
            <div className="space-y-6">
            {filteredRoles.map((role) => (
              <div
                key={role.id}
                className={`p-8 rounded-2xl transition-all duration-300 cursor-pointer ${
                  isDarkMode
                    ? 'bg-gradient-to-br from-cyan-900/20 to-cyan-800/10 border border-cyan-400/20 hover:border-cyan-400/40 hover:shadow-xl hover:shadow-cyan-900/20 hover:translate-x-1'
                    : 'bg-white border border-gray-200 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10 hover:translate-x-1'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-start gap-3 mb-4">
                      <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-cyan-50' : 'text-gray-900'}`}>
                        {role.title}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        role.role_type === 'Internship'
                          ? isDarkMode 
                            ? 'bg-purple-400/10 text-purple-300 border border-purple-400/20' 
                            : 'bg-purple-100 text-purple-700 border border-purple-200'
                          : role.role_type === 'Contract'
                            ? isDarkMode 
                              ? 'bg-orange-400/10 text-orange-300 border border-orange-400/20' 
                              : 'bg-orange-100 text-orange-700 border border-orange-200'
                            : role.role_type === 'Part-time Job'
                              ? isDarkMode 
                                ? 'bg-yellow-400/10 text-yellow-300 border border-yellow-400/20' 
                                : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                              : isDarkMode 
                                ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20' 
                                : 'bg-green-100 text-green-700 border border-green-200'
                      }`}>
                        {role.role_type}
                      </span>
                      {role.salary_type === 'Paid' && (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          isDarkMode 
                            ? 'bg-green-400/10 text-green-300 border border-green-400/20' 
                            : 'bg-green-100 text-green-700 border border-green-200'
                        }`}>
                          💰 {role.salary_type}
                        </span>
                      )}
                    </div>

                    <p className={`text-base mb-6 ${isDarkMode ? 'text-cyan-50/70' : 'text-gray-600'}`}>
                      {role.description}
                    </p>

                    <div className="flex flex-wrap gap-4 mb-6">
                      <div className={`flex items-center ${isDarkMode ? 'text-cyan-50/60' : 'text-gray-600'}`}>
                        <MapPin className="w-4 h-4 mr-2" />
                        <span className="text-sm">{role.location}</span>
                      </div>
                      <div className={`flex items-center ${isDarkMode ? 'text-cyan-50/60' : 'text-gray-600'}`}>
                        <TrendingUp className="w-4 h-4 mr-2" />
                        <span className="text-sm">{role.experience}</span>
                      </div>
                      <div className={`flex items-center ${isDarkMode ? 'text-cyan-50/60' : 'text-gray-600'}`}>
                        <Clock className="w-4 h-4 mr-2" />
                        <span className="text-sm">Deadline: {role.deadline}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(role.skills) ? role.skills : []).map((skill, idx) => (
                        <span
                          key={idx}
                          className={`px-3 py-1 rounded-lg text-sm font-medium ${
                            isDarkMode
                              ? 'bg-cyan-400/10 text-cyan-300'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-start lg:items-end gap-4">
                    <span className={`text-sm ${isDarkMode ? 'text-cyan-50/50' : 'text-gray-500'}`}>
                      Published {role.date_published}
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => openApplyModal(role)}
                      className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 inline-flex items-center ${
                        isDarkMode
                          ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40 hover:bg-cyan-500'
                          : 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700'
                      }`}
                    >
                      Apply Now
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <p className={`text-xl ${isDarkMode ? 'text-cyan-50/60' : 'text-gray-600'}`}>
                No positions available in this category at the moment.
              </p>
            </motion.div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className={`py-24 px-4 md:px-6 relative ${
        isDarkMode ? 'bg-[#08151f]' : 'bg-white'
      }`}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className={`p-12 rounded-3xl text-center relative overflow-hidden ${
              isDarkMode
                ? 'bg-gradient-to-br from-cyan-600 to-emerald-600'
                : 'bg-gradient-to-br from-blue-600 to-cyan-600'
            }`}
          >
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Don't See the Right Fit?
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                We're always looking for talented individuals. Send us your resume and let's talk about future opportunities.
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 inline-flex items-center"
              >
                Send Your Resume
                <ArrowRight className="ml-2 w-5 h-5" />
              </motion.button>
            </div>

            {/* Decorative Elements */}
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.2, 0.3]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl"
            />
            <motion.div
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.2, 0.1, 0.2]
              }}
              transition={{ 
                duration: 5, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute bottom-0 left-0 w-80 h-80 bg-white rounded-full blur-3xl"
            />
          </motion.div>
        </div>
      </section>

      {showApplyModal && selectedRole && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden ${
              isDarkMode
                ? 'bg-gradient-to-br from-[#0d2230] to-[#0a1920] border-cyan-400/20'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className={`px-6 py-5 border-b ${isDarkMode ? 'border-cyan-400/10' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Apply for {selectedRole.title}</h3>
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                    {selectedRole.location} • {selectedRole.role_type} • {selectedRole.salary_type}
                  </p>
                </div>
                <button
                  onClick={closeApplyModal}
                  className={`p-2 rounded-xl ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form ref={formContainerRef} onSubmit={handleApplySubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {applyError && (
                <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
                  {applyError}
                </div>
              )}
              {applySuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl border px-4 py-4 ${isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50'}`}
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${isDarkMode ? 'text-emerald-200' : 'text-emerald-800'}`}>
                        {applySuccess}
                      </p>
                      <p className={`text-xs mt-2 ${isDarkMode ? 'text-emerald-300/80' : 'text-emerald-700'}`}>
                        Create an account to track your application status
                      </p>
                      <button
                        type="button"
                        onClick={handleCreateAccountClick}
                        className={`mt-3 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${isDarkMode ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                      >
                        Create Account
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className={`rounded-2xl p-4 border ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
                <p className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-cyan-300' : 'text-blue-700'}`}>Job Details</p>
                <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{selectedRole.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`text-sm font-medium mb-1.5 block ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Full Name</label>
                  <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-300'}`}>
                    <User className={`w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
                    <input
                      required
                      value={applyForm.fullName}
                      onChange={(e) => setApplyForm((p) => ({ ...p, fullName: e.target.value }))}
                      className={`w-full bg-transparent outline-none text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                      placeholder="Your full name"
                    />
                  </div>
                </div>
                <div>
                  <label className={`text-sm font-medium mb-1.5 block ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Email</label>
                  <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-300'} ${emailValidationError ? (isDarkMode ? 'border-red-500/50' : 'border-red-400') : ''}`}>
                    <Mail className={`w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
                    <input
                      required
                      type="email"
                      value={applyForm.email}
                      onChange={(e) => {
                        setApplyForm((p) => ({ ...p, email: e.target.value }));
                        setEmailValidationError('');
                      }}
                      onBlur={handleEmailBlur}
                      className={`w-full bg-transparent outline-none text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                      placeholder="you@example.com"
                    />
                    {emailValidationLoading && <Loader className="w-4 h-4 animate-spin" />}
                  </div>
                  {emailValidationError && (
                    <p className={`text-xs mt-1.5 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                      {emailValidationError}
                    </p>
                  )}
                </div>
                <div>
                  <label className={`text-sm font-medium mb-1.5 block ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Phone</label>
                  <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-300'}`}>
                    <Phone className={`w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
                    <input
                      value={applyForm.phone}
                      onChange={handlePhoneChange}
                      className={`w-full bg-transparent outline-none text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                      placeholder="+923365017866"
                      maxLength="13"
                    />
                  </div>
                  <p className={`text-xs mt-1.5 ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>Format: +92XXXXXXXXXX (10 digits after +92)</p>
                </div>
                <div>
                  <label className={`text-sm font-medium mb-1.5 block ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Experience (years)</label>
                  <input
                    type="number"
                    min="0"
                    max="40"
                    step="0.1"
                    value={applyForm.experienceYears}
                    onChange={(e) => setApplyForm((p) => ({ ...p, experienceYears: e.target.value }))}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    placeholder="e.g., 2"
                  />
                </div>
              </div>

              <div>
                <label className={`text-sm font-medium mb-1.5 block ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Cover Letter (optional)</label>
                <textarea
                  rows="4"
                  value={applyForm.coverLetter}
                  onChange={(e) => setApplyForm((p) => ({ ...p, coverLetter: e.target.value }))}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm resize-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  placeholder="Tell us why you are a great fit..."
                />
              </div>

              <div className={`rounded-2xl p-4 border space-y-3 ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-cyan-300' : 'text-blue-700'}`}>Education</h4>
                  <button
                    type="button"
                    onClick={addEducationRow}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${isDarkMode ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Education
                  </button>
                </div>

                {applyForm.educationEntries.map((entry, index) => (
                  <div key={`edu-${index}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <input
                      value={entry.degree}
                      onChange={(e) => updateEducationRow(index, 'degree', e.target.value)}
                      placeholder="Degree"
                      className={`md:col-span-4 w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    />
                    <input
                      value={entry.institution}
                      onChange={(e) => updateEducationRow(index, 'institution', e.target.value)}
                      placeholder="Institution"
                      className={`md:col-span-5 w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    />
                    <input
                      value={entry.year}
                      onChange={(e) => updateEducationRow(index, 'year', e.target.value)}
                      placeholder="Year"
                      className={`md:col-span-2 w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeEducationRow(index)}
                      className={`md:col-span-1 inline-flex justify-center items-center p-2 rounded-lg ${isDarkMode ? 'text-red-300 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'}`}
                      title="Remove row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className={`rounded-2xl p-4 border space-y-3 ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-cyan-300' : 'text-blue-700'}`}>Experience</h4>
                  <button
                    type="button"
                    onClick={addExperienceRow}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${isDarkMode ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Experience
                  </button>
                </div>

                {applyForm.experienceEntries.map((entry, index) => (
                  <div key={`exp-${index}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <input
                      value={entry.company}
                      onChange={(e) => updateExperienceRow(index, 'company', e.target.value)}
                      placeholder="Company"
                      className={`md:col-span-4 w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    />
                    <input
                      value={entry.title}
                      onChange={(e) => updateExperienceRow(index, 'title', e.target.value)}
                      placeholder="Job Title"
                      className={`md:col-span-4 w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    />
                    <input
                      value={entry.duration}
                      onChange={(e) => updateExperienceRow(index, 'duration', e.target.value)}
                      placeholder="Duration (e.g., 2022-2024)"
                      className={`md:col-span-3 w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeExperienceRow(index)}
                      className={`md:col-span-1 inline-flex justify-center items-center p-2 rounded-lg ${isDarkMode ? 'text-red-300 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'}`}
                      title="Remove row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label className={`text-sm font-medium mb-1.5 block ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Drop Your CV</label>
                <label className={`flex items-center gap-3 px-4 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${isDarkMode ? 'bg-slate-900/50 border-slate-700 hover:border-cyan-500/50' : 'bg-gray-50 border-gray-300 hover:border-blue-400'}`}>
                  <Upload className={`w-5 h-5 ${isDarkMode ? 'text-cyan-300' : 'text-blue-600'}`} />
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                      {applyForm.cvFile ? applyForm.cvFile.name : 'Click to upload CV (PDF, DOC, DOCX)'}
                    </div>
                    <div className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>Max size 10MB</div>
                  </div>
                  <FileText className={`w-5 h-5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setApplyForm((p) => ({ ...p, cvFile: e.target.files?.[0] || null }))}
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeApplyModal}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold ${isDarkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyLoading}
                  className={`px-6 py-2.5 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {applyLoading ? <Loader className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  {applyLoading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Account Creation Modal - slides from left */}
      {showAccountModal && (
        <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden ${
              isDarkMode
                ? 'bg-gradient-to-br from-[#0d2230] to-[#0a1920] border-cyan-400/20'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className={`px-6 py-5 border-b ${isDarkMode ? 'border-cyan-400/10' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Create Account</h3>
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                    to track your application
                  </p>
                </div>
                <button
                  onClick={() => setShowAccountModal(false)}
                  className={`p-2 rounded-xl ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateAccount} className="p-6 space-y-4">
              {accountError && (
                <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
                  {accountError}
                </div>
              )}
              {accountSuccess && (
                <div className={`rounded-xl border px-4 py-3 text-sm flex items-center gap-2 ${isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                  <CheckCircle2 className="w-4 h-4" />
                  {accountSuccess}
                </div>
              )}

              <div className={`rounded-2xl p-4 border ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
                <p className={`text-sm font-semibold mb-2 ${isDarkMode ? 'text-cyan-300' : 'text-blue-700'}`}>Account Email</p>
                <p className={`text-sm font-mono ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{accountEmail}</p>
              </div>

              <div>
                <label className={`text-sm font-medium mb-1.5 block ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Password</label>
                <input
                  type="password"
                  required
                  value={accountForm.password}
                  onChange={(e) => setAccountForm((p) => ({ ...p, password: e.target.value }))}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  placeholder="Enter password (min 8 characters)"
                />
                <p className={`text-xs mt-1.5 ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>
                  Minimum 8 characters required
                </p>
              </div>

              <div>
                <label className={`text-sm font-medium mb-1.5 block ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Confirm Password</label>
                <input
                  type="password"
                  required
                  value={accountForm.confirmPassword}
                  onChange={(e) => setAccountForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  placeholder="Confirm password"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold ${isDarkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={accountLoading}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {accountLoading ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {accountLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CareerPage;
