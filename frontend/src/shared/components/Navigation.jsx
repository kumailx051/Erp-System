import React from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';

const Navigation = ({ isScrolled = false, isDarkMode = false, onToggleDarkMode }) => {
  const location = useLocation();
  
  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'Features', href: '/features' },
    { name: 'Solutions', href: '/solutions' },
    { name: 'About', href: '/about' },
    { name: 'Career', href: '/career' }
  ];

  const isActiveRoute = (href) => {
    return location.pathname === href;
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed top-4 left-0 right-0 z-50 px-4 md:px-6"
    >
      <div
        className={`max-w-7xl mx-auto px-6 py-3 rounded-2xl border transition-all duration-300 ${
          isDarkMode
            ? isScrolled
              ? 'bg-[#0b2230]/80 backdrop-blur-xl border-cyan-400/20 shadow-xl shadow-cyan-950/40'
              : 'bg-[#0b2230]/65 backdrop-blur-lg border-cyan-400/15 shadow-lg shadow-cyan-950/25'
            : isScrolled
              ? 'bg-sky-100/55 backdrop-blur-xl border-sky-200/70 shadow-xl shadow-sky-500/15'
              : 'bg-sky-100/40 backdrop-blur-lg border-sky-200/60 shadow-lg shadow-sky-500/10'
        }`}
      >
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center space-x-3 cursor-pointer group"
            >
              <img 
                src="/assets/images/logo.png" 
                alt="Tech Horizon Logo" 
                className="w-12 h-12 object-contain transform group-hover:rotate-12 transition-transform duration-300"
              />
              <span className={`text-xl md:text-2xl font-bold bg-clip-text text-transparent ${isDarkMode ? 'bg-gradient-to-r from-cyan-300 to-emerald-300' : 'bg-gradient-to-r from-blue-600 to-cyan-600'}`}>
                Horizon Tech
              </span>
            </motion.div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-7">
            {navItems.map((item, index) => {
              const isActive = isActiveRoute(item.href);

              return (
                <Link key={item.name} to={item.href}>
                  <motion.span
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    className={`relative font-medium transition-colors cursor-pointer ${
                      isActive 
                        ? isDarkMode ? 'text-cyan-300 after:w-full' : 'text-blue-600 after:w-full'
                        : isDarkMode ? 'text-cyan-50/85 hover:text-cyan-300 after:w-0 hover:after:w-full' : 'text-gray-700 hover:text-blue-600 after:w-0 hover:after:w-full'
                    } after:absolute after:bottom-0 after:left-0 after:h-0.5 after:bg-gradient-to-r after:from-blue-600 after:to-cyan-600 after:transition-all after:duration-300`}
                  >
                    {item.name}
                  </motion.span>
                </Link>
              );
            })}
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center space-x-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggleDarkMode}
              className={`inline-flex items-center justify-center w-12 h-12 rounded-xl border transition-all duration-300 ${isDarkMode ? 'bg-cyan-400/10 border-cyan-300/20 text-cyan-200 hover:bg-cyan-400/15' : 'bg-white/70 border-sky-200 text-sky-700 hover:bg-white'}`}
              aria-label="Toggle homepage dark mode"
              title="Toggle homepage dark mode"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </motion.button>
            <Link to="/login">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-8 py-3 text-white font-semibold rounded-xl transition-all duration-300 ${isDarkMode ? 'bg-cyan-600 shadow-lg shadow-cyan-900/40 hover:bg-cyan-500 hover:shadow-xl hover:shadow-cyan-900/50' : 'bg-blue-600 shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/40'}`}
              >
                <span>Log In</span>
              </motion.button>
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navigation;
