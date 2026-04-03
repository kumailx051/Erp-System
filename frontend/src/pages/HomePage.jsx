import React, { useState, useEffect } from 'react';
import MouseGrains from '../shared/components/MouseGrains';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  Wallet, 
  BarChart3, 
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import Navigation from '../shared/components/Navigation';

const HomePage = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollOpacity, setScrollOpacity] = useState(1);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('homepage_theme') === 'dark');

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 20);
      
      // Calculate opacity based on scroll position (fades from 0 to 300px)
      const opacity = Math.max(0, 1 - scrollY / 300);
      setScrollOpacity(opacity);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    localStorage.setItem('homepage_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const scaleIn = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } }
  };

  const features = [
    {
      icon: <Users className="w-6 h-6" />,
      title: 'HR Management',
      description: 'Complete employee lifecycle management from hiring to exit',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: 'Attendance & Leave',
      description: 'Automated attendance tracking and leave management system',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: <Wallet className="w-6 h-6" />,
      title: 'Payroll Processing',
      description: 'Accurate payroll calculation with statutory compliance',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Analytics & Reports',
      description: 'Real-time insights and comprehensive reporting dashboard',
      color: 'from-orange-500 to-red-500'
    }
  ];

  const stats = [
    { value: '10K+', label: 'Active Users', icon: '/assets/icons/user.png' },
    { value: '99.9%', label: 'Uptime', icon: '/assets/icons/uptime.png' },
    { value: '50+', label: 'Countries', icon: '/assets/icons/countries.png' },
    { value: '24/7', label: 'Support', icon: '/assets/icons/support.png' }
  ];

  return (
    <div className={`min-h-screen overflow-hidden relative transition-colors duration-500 ${
      isDarkMode
        ? 'bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_28%),linear-gradient(180deg,_#07131b_0%,_#0a1e29_45%,_#08151f_100%)]'
        : 'bg-gradient-to-br from-blue-50 via-white to-cyan-50'
   }`}>
      {/* Grid Pattern Background - Fades on Scroll */}
      <div 
        className="fixed inset-0 pointer-events-none transition-opacity duration-300"
        style={{ 
          opacity: scrollOpacity,
          backgroundImage: `
            linear-gradient(to right, ${isDarkMode ? 'rgba(34, 211, 238, 0.09)' : 'rgba(59, 130, 246, 0.1)'} 1px, transparent 1px),
            linear-gradient(to bottom, ${isDarkMode ? 'rgba(34, 211, 238, 0.09)' : 'rgba(59, 130, 246, 0.1)'} 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className={`absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl ${isDarkMode ? 'bg-gradient-to-br from-cyan-400/15 to-emerald-400/10' : 'bg-gradient-to-br from-blue-400/20 to-cyan-400/20'}`}
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className={`absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl ${isDarkMode ? 'bg-gradient-to-br from-sky-500/10 to-cyan-400/10' : 'bg-gradient-to-br from-cyan-400/20 to-blue-300/20'}`}
        />
      </div>

      {/* Navigation */}
      <Navigation isScrolled={isScrolled} isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode((prev) => !prev)} />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        {/* Mouse-following grains/confetti effect — scoped to hero */}
        <MouseGrains isDarkMode={isDarkMode} />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight"
            >
              <span className="bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-500 bg-clip-text text-transparent drop-shadow-2xl">
                Smart Solutions That Drive
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-600 bg-clip-text text-transparent drop-shadow-2xl">
                Your Enterprise Growth
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className={`text-xl md:text-2xl max-w-3xl mx-auto mb-10 leading-relaxed ${isDarkMode ? 'text-cyan-50/80' : 'text-gray-600'}`}
            >
              Transforming businesses with cutting-edge technology for efficiency, 
              cost savings, and real-time insights across all your operations.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6"
            >
              <Link to="/login">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 25px 50px rgba(59, 130, 246, 0.4)" }}
                  whileTap={{ scale: 0.95 }}
                  className="group px-10 py-5 bg-blue-600 text-white rounded-2xl font-semibold text-lg shadow-2xl hover:bg-blue-700 hover:shadow-3xl transition-all flex items-center space-x-3"
                >
                  <span>Try it for free</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>
            </motion.div>
          </div>

          {/* Premium Floating Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 60, rotateX: 8 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 1, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mt-20 relative"
            style={{ perspective: '1200px' }}
          >
            {/* Glow behind the dashboard */}
            <div className="absolute -inset-8 bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-blue-500/20 rounded-[40px] blur-3xl animate-pulse" />
            
            {/* Main Dashboard Container */}
            <motion.div
              whileHover={{ y: -8, rotateX: 2, rotateY: -1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[28px] p-1 shadow-2xl"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Animated gradient border */}
              <div className="absolute inset-0 rounded-[28px] bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 opacity-60 blur-[1px]" 
                style={{ backgroundSize: '200% 100%', animation: 'shimmer 3s linear infinite' }} />
              
              <div className="relative bg-gradient-to-br from-slate-900 via-[#0f172a] to-slate-900 rounded-[26px] p-6 md:p-8 overflow-hidden">
                {/* Subtle grid overlay */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                  backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
                  backgroundSize: '24px 24px'
                }} />
                
                {/* Top bar */}
                <div className="relative flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/30" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/30" />
                      <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/30" />
                    </div>
                    <div className="hidden sm:flex items-center bg-white/5 rounded-lg px-4 py-1.5 border border-white/10">
                      <span className="text-white/40 text-xs font-mono">dashboard.techhorizon.app</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <BarChart3 className="w-4 h-4 text-white" />
                    </div>
                    <div className="hidden sm:block text-white/60 text-sm font-medium">Enterprise Dashboard</div>
                  </div>
                </div>

                {/* Dashboard Grid */}
                <div className="relative grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5">
                  
                  {/* Revenue - Large Card */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.0 }}
                    className="md:col-span-5 group relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] rounded-2xl p-5 border border-white/[0.08] hover:border-blue-500/30 transition-all duration-500 overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors duration-500" />
                    <div className="relative">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white/50 text-sm font-medium tracking-wide uppercase">Total Revenue</span>
                        <div className="flex items-center space-x-1 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full text-xs font-semibold">
                          <TrendingUp className="w-3 h-3" />
                          <span>+33.2%</span>
                        </div>
                      </div>
                      <div className="text-3xl md:text-4xl font-bold text-white mt-2 mb-4 tracking-tight">$23,569<span className="text-white/30 text-lg">.00</span></div>
                      
                      {/* Sparkline chart */}
                      <div className="h-16 mt-2">
                        <svg className="w-full h-full" viewBox="0 0 300 60" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                            </linearGradient>
                            <linearGradient id="revLine" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#3b82f6" />
                              <stop offset="100%" stopColor="#06b6d4" />
                            </linearGradient>
                          </defs>
                          <path d="M0 45 C20 42, 40 38, 60 35 C80 32, 100 40, 120 28 C140 16, 160 22, 180 18 C200 14, 220 20, 240 12 C260 8, 280 15, 300 6" fill="none" stroke="url(#revLine)" strokeWidth="2.5" strokeLinecap="round" />
                          <path d="M0 45 C20 42, 40 38, 60 35 C80 32, 100 40, 120 28 C140 16, 160 22, 180 18 C200 14, 220 20, 240 12 C260 8, 280 15, 300 6 L300 60 L0 60 Z" fill="url(#revGrad)" />
                        </svg>
                      </div>
                    </div>
                  </motion.div>

                  {/* Quick Stats - 2 stacked cards */}
                  <div className="md:col-span-3 flex flex-col gap-4 md:gap-5">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.1 }}
                      className="group relative flex-1 bg-gradient-to-br from-white/[0.08] to-white/[0.02] rounded-2xl p-5 border border-white/[0.08] hover:border-cyan-500/30 transition-all duration-500 overflow-hidden"
                    >
                      <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-colors duration-500" />
                      <div className="relative">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                            <Users className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-white/40 text-xs font-medium uppercase tracking-wider">Employees</span>
                        </div>
                        <div className="text-2xl font-bold text-white">2,847</div>
                        <div className="flex items-center mt-1">
                          <div className="flex -space-x-1.5">
                            {['bg-blue-500','bg-cyan-500','bg-teal-500','bg-emerald-500'].map((c,i) => (
                              <div key={i} className={`w-5 h-5 rounded-full ${c} border-2 border-slate-900`} />
                            ))}
                          </div>
                          <span className="text-white/30 text-xs ml-2">+48 new</span>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.2 }}
                      className="group relative flex-1 bg-gradient-to-br from-white/[0.08] to-white/[0.02] rounded-2xl p-5 border border-white/[0.08] hover:border-emerald-500/30 transition-all duration-500 overflow-hidden"
                    >
                      <div className="absolute -top-4 -left-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-colors duration-500" />
                      <div className="relative">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-white/40 text-xs font-medium uppercase tracking-wider">Tasks Done</span>
                        </div>
                        <div className="text-2xl font-bold text-white">94.2%</div>
                        {/* Mini progress bar */}
                        <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '94%' }}
                            transition={{ delay: 1.5, duration: 1, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full shadow-lg shadow-emerald-500/30"
                          />
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Performance Chart */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.3 }}
                    className="md:col-span-4 group relative bg-gradient-to-br from-white/[0.08] to-white/[0.02] rounded-2xl p-5 border border-white/[0.08] hover:border-purple-500/30 transition-all duration-500 overflow-hidden"
                  >
                    <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-purple-500/5 to-transparent group-hover:from-purple-500/10 transition-colors duration-500" />
                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-white/50 text-sm font-medium tracking-wide uppercase">Performance</span>
                        <div className="flex items-center space-x-1 text-white/30 text-xs">
                          <span className="px-2 py-0.5 bg-white/5 rounded text-white/60">Weekly</span>
                        </div>
                      </div>
                      
                      {/* Bar chart */}
                      <div className="flex items-end justify-between h-28 gap-2 mt-2">
                        {[
                          { h: '45%', color: 'from-blue-500 to-blue-400', label: 'M' },
                          { h: '72%', color: 'from-cyan-500 to-cyan-400', label: 'T' },
                          { h: '58%', color: 'from-blue-500 to-blue-400', label: 'W' },
                          { h: '88%', color: 'from-cyan-500 to-cyan-400', label: 'T' },
                          { h: '65%', color: 'from-blue-500 to-blue-400', label: 'F' },
                          { h: '95%', color: 'from-violet-500 to-purple-400', label: 'S' },
                          { h: '78%', color: 'from-cyan-500 to-cyan-400', label: 'S' },
                        ].map((bar, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: bar.h }}
                              transition={{ delay: 1.5 + i * 0.08, duration: 0.6, ease: 'easeOut' }}
                              className={`w-full bg-gradient-to-t ${bar.color} rounded-lg shadow-lg opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
                              style={{ minHeight: '4px' }}
                            />
                            <span className="text-white/25 text-[10px] font-medium">{bar.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>

                </div>

                {/* Bottom activity strip */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.6 }}
                  className="relative mt-5 flex flex-wrap items-center gap-3"
                >
                  {[
                    { label: 'Payroll Processed', color: 'bg-emerald-500', glow: 'shadow-emerald-500/30' },
                    { label: 'New Hire: Sarah K.', color: 'bg-blue-500', glow: 'shadow-blue-500/30' },
                    { label: 'Leave Approved: 3', color: 'bg-amber-500', glow: 'shadow-amber-500/30' },
                    { label: 'Report Generated', color: 'bg-violet-500', glow: 'shadow-violet-500/30' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center space-x-2 bg-white/[0.04] border border-white/[0.06] rounded-full px-3.5 py-1.5 hover:bg-white/[0.08] transition-colors cursor-default">
                      <div className={`w-2 h-2 rounded-full ${item.color} shadow-lg ${item.glow} animate-pulse`} />
                      <span className="text-white/40 text-xs font-medium">{item.label}</span>
                    </div>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={`py-20 px-6 ${isDarkMode ? 'bg-gradient-to-b from-cyan-400/5 to-transparent backdrop-blur-sm' : 'bg-gradient-to-b from-white/50 to-transparent backdrop-blur-sm'}`}>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              variants={fadeInUp}
              whileHover={{ scale: 1.05, y: -5 }}
              className="text-center group cursor-pointer"
            >
              <div className="flex justify-center mb-4">
                <motion.div 
                  className={`w-20 h-20 rounded-3xl flex items-center justify-center p-3 transition-all duration-300 shadow-lg group-hover:shadow-xl ${isDarkMode ? 'bg-gradient-to-br from-cyan-500/10 to-sky-500/10 group-hover:from-cyan-400/20 group-hover:to-sky-400/20 border border-cyan-400/10' : 'bg-gradient-to-br from-blue-50 to-cyan-50 group-hover:from-blue-100 group-hover:to-cyan-100'}`}
                  whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <img 
                    src={stat.icon} 
                    alt={stat.label}
                    className={`w-full h-full object-contain ${isDarkMode ? 'brightness-0 invert' : ''}`}
                  />
                </motion.div>
              </div>
              <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                {stat.value}
              </div>
              <div className={`font-semibold text-lg ${isDarkMode ? 'text-cyan-50/75' : 'text-gray-600'}`}>{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold mb-6">
              <span className={`bg-clip-text text-transparent ${isDarkMode ? 'bg-gradient-to-r from-cyan-300 to-sky-400' : 'bg-gradient-to-r from-blue-600 to-cyan-600'}`}>
                Powerful Features
              </span>
            </h2>
            <p className={`text-xl max-w-2xl mx-auto ${isDarkMode ? 'text-cyan-50/75' : 'text-gray-600'}`}>
              Everything you need to manage your enterprise efficiently in one platform
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={scaleIn}
                whileHover={{ y: -15, scale: 1.03 }}
                className={`group backdrop-blur-sm rounded-3xl p-8 shadow-xl transition-all duration-300 relative overflow-hidden ${isDarkMode ? 'bg-slate-950/45 border border-cyan-400/15 hover:border-cyan-300/35 shadow-cyan-950/30' : 'bg-white/80 border border-white/50 hover:border-blue-200'}`}
              >
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'bg-gradient-to-br from-cyan-400/8 to-emerald-400/8' : 'bg-gradient-to-br from-blue-50/30 to-cyan-50/30'}`}></div>
                <div className="relative z-10">
                  <motion.div 
                    className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg group-hover:shadow-xl transition-shadow`}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    {feature.icon}
                  </motion.div>
                  <h3 className={`text-xl font-bold mb-3 transition-colors ${isDarkMode ? 'text-white group-hover:text-cyan-300' : 'text-gray-800 group-hover:text-blue-600'}`}>{feature.title}</h3>
                  <p className={`${isDarkMode ? 'text-slate-200' : 'text-gray-600'} leading-relaxed`}>{feature.description}</p>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-6 overflow-hidden">
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(to right, ${isDarkMode ? 'rgba(45, 212, 191, 0.14)' : 'rgb(59, 130, 246, 0.1)'} 1px, transparent 1px),
              linear-gradient(to bottom, ${isDarkMode ? 'rgba(45, 212, 191, 0.14)' : 'rgb(59, 130, 246, 0.1)'} 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        ></div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto relative z-10"
        >
          {/* Animated Background Glow */}
          <div className={`absolute inset-0 rounded-3xl blur-3xl opacity-20 ${isDarkMode ? 'bg-gradient-to-r from-cyan-400 to-emerald-400' : 'bg-gradient-to-r from-blue-400 to-cyan-400'}`}></div>
          
          <div className={`relative rounded-3xl p-8 sm:p-12 md:p-16 text-center text-white shadow-2xl overflow-hidden ${isDarkMode ? 'bg-gradient-to-r from-[#0f2c3a] via-[#12384a] to-[#0d2635] border border-cyan-400/20' : 'bg-gradient-to-r from-blue-600 to-cyan-600'}`}>
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 drop-shadow-lg">
                  Ready to Transform Your Business?
                </h2>
              </motion.div>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="text-xl md:text-2xl mb-10 opacity-90"
              >
                Join thousands of companies already using Tech Horizon ERP
              </motion.p>
              
              <Link to="/login">
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                  whileHover={{ scale: 1.05, boxShadow: "0 25px 50px rgba(0,0,0,0.4)" }}
                  whileTap={{ scale: 0.95 }}
                  className={`group px-12 py-5 rounded-2xl font-bold text-lg transition-all flex items-center space-x-3 mx-auto shadow-2xl border ${isDarkMode ? 'bg-white/95 text-slate-900 border-white/70 hover:bg-cyan-50' : 'bg-white text-blue-700 border-white/90 hover:bg-blue-50'}`}
                >
                  <span>Start Free Trial</span>
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </motion.button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className={`relative text-white py-16 px-6 overflow-hidden ${isDarkMode ? 'bg-gradient-to-b from-[#07131b] to-[#040c12]' : 'bg-gradient-to-b from-gray-900 to-gray-950'}`}>
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage: `
              linear-gradient(to right, ${isDarkMode ? 'rgba(45, 212, 191, 0.22)' : 'rgba(59, 130, 246, 0.4)'} 1px, transparent 1px),
              linear-gradient(to bottom, ${isDarkMode ? 'rgba(45, 212, 191, 0.22)' : 'rgba(59, 130, 246, 0.4)'} 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        ></div>

        {/* Decorative Elements */}
        <div className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl ${isDarkMode ? 'bg-cyan-500/10' : 'bg-blue-500/10'}`}></div>
        <div className={`absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl ${isDarkMode ? 'bg-emerald-400/10' : 'bg-cyan-500/10'}`}></div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-center space-x-3 mb-6"
          >
            <img 
              src="/assets/images/logo.png" 
              alt="Tech Horizon Logo" 
              className="w-14 h-14 object-contain"
            />
            <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Tech Horizon ERP</span>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className={`mb-8 text-lg ${isDarkMode ? 'text-cyan-50/70' : 'text-gray-400'}`}
          >
            Empowering enterprises with intelligent solutions
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="w-32 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 mx-auto mb-8 rounded-full"
          ></motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className={`text-sm ${isDarkMode ? 'text-cyan-100/45' : 'text-gray-500'}`}
          >
            © 2026 Tech Horizon ERP. All rights reserved.
          </motion.div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
