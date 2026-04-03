import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Users, 
  Target, 
  Zap, 
  Globe, 
  Award,
  Lock,
  Server,
  BookOpen
} from 'lucide-react';
import Navigation from '../shared/components/Navigation';

const AboutPage = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('homepage_theme') === 'dark');

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

  const features = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Cybersecurity Solutions',
      description: 'Advanced information security services and protection from evolving cyber threats'
    },
    {
      icon: <Server className="w-6 h-6" />,
      title: 'IT Infrastructure',
      description: 'Digital infrastructure development and IT system optimization for businesses'
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: 'Security Assessments',
      description: 'Comprehensive security evaluations using advanced security laboratories'
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: 'Security Training',
      description: 'Professional training programs to enhance organizational security awareness'
    }
  ];

  const values = [
    {
      icon: <Target className="w-8 h-8" />,
      title: 'Innovation',
      description: 'Continuous research and modern technology solutions'
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: 'Reliability',
      description: 'Trusted partner for businesses seeking digital protection'
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: 'International Standards',
      description: 'Solutions designed to meet global security standards'
    }
  ];

  return (
    <div className={`min-h-screen relative transition-colors duration-500 ${isDarkMode ? 'bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_28%),linear-gradient(180deg,_#07131b_0%,_#0a1e29_45%,_#08151f_100%)]' : 'bg-gradient-to-br from-blue-50 via-white to-cyan-50'}`}>
      {/* Grid Pattern Background */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, ${isDarkMode ? 'rgba(34,211,238,0.09)' : 'rgba(59,130,246,0.1)'} 1px, transparent 1px),
            linear-gradient(to bottom, ${isDarkMode ? 'rgba(34,211,238,0.09)' : 'rgba(59,130,246,0.1)'} 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      ></div>

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
      <Navigation isScrolled={true} isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(prev => !prev)} />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
           

            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-500 bg-clip-text text-transparent">
                Securing Your Digital Future
              </span>
            </h1>
            
            <p className={`text-xl max-w-4xl mx-auto leading-relaxed ${isDarkMode ? 'text-cyan-50/80' : 'text-gray-600'}`}>
              Tech Horizon is a technology and cybersecurity solutions provider dedicated to delivering 
              advanced information security services, IT consultancy, and digital infrastructure solutions 
              for businesses and organizations.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className={`py-20 px-6 backdrop-blur-sm ${isDarkMode ? 'bg-slate-900/40' : 'bg-white/50'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl font-bold mb-6">
                <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Who We Are
                </span>
              </h2>
              <div className="space-y-4 leading-relaxed">
                <p className={isDarkMode ? 'text-slate-300' : 'text-gray-700'}>
                  With a strong emphasis on innovation, reliability, and security, Tech Horizon provides 
                  a comprehensive range of services including cybersecurity consulting, security assessments, 
                  IT infrastructure development, and security training.
                </p>
                <p className={isDarkMode ? 'text-slate-300' : 'text-gray-700'}>
                  Our solutions are designed to meet international standards and ensure that organizations 
                  remain protected in today's rapidly changing technological landscape.
                </p>
                <p className={isDarkMode ? 'text-slate-300' : 'text-gray-700'}>
                  Tech Horizon operates with a team of highly skilled professionals equipped with modern 
                  research facilities and advanced security laboratories. These facilities enable us to 
                  analyze digital threats, perform security evaluations, and develop effective solutions 
                  tailored to the needs of businesses of all sizes.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-3xl p-1">
                <div className={`rounded-3xl p-8 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                  <div className="flex items-center justify-center mb-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-3xl flex items-center justify-center">
                      <Shield className="w-12 h-12 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-center mb-4 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    Our Mission
                  </h3>
                  <p className={`text-center leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    To simplify the process of securing digital environments by offering dependable 
                    cybersecurity solutions, technical consultancy, and expert support. By combining 
                    technical expertise with innovative thinking, we help organizations enhance operational 
                    efficiency, reduce risks, and build a secure technological foundation for future growth.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Our Services
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Comprehensive solutions to protect and optimize your digital infrastructure
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
                variants={fadeInUp}
                whileHover={{ y: -10, scale: 1.03 }}
                className={`rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 ${isDarkMode ? 'bg-slate-950/45 border border-cyan-400/15' : 'bg-white'}`}
              >
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white mb-6">
                  {feature.icon}
                </div>
                <h3 className={`text-xl font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{feature.title}</h3>
                <p className={isDarkMode ? 'text-slate-300' : 'text-gray-600'}>{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
      <section className={`py-20 px-6 backdrop-blur-sm ${isDarkMode ? 'bg-slate-900/40' : 'bg-white/50'}`}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Our Core Values
              </span>
            </h2>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                variants={fadeInUp}
                className={`rounded-3xl p-10 shadow-xl text-center hover:shadow-2xl transition-all duration-300 ${isDarkMode ? 'bg-slate-950/45 border border-cyan-400/15' : 'bg-white'}`}
              >
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-3xl flex items-center justify-center text-white">
                    {value.icon}
                  </div>
                </div>
                <h3 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{value.title}</h3>
                <p className={`leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>{value.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Commitment Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl p-8 sm:p-12 md:p-16 text-center text-white shadow-2xl"
          >
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                <Users className="w-10 h-10 text-white" />
              </div>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Our Commitment
            </h2>
            <p className="text-xl mb-8 opacity-90 max-w-4xl mx-auto leading-relaxed">
              Through continuous research, professional training programs, and modern technology solutions, 
              Tech Horizon strives to remain a trusted partner for businesses seeking strong digital protection 
              and reliable IT infrastructure.
            </p>
            <Link to="/login">
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}
                whileTap={{ scale: 0.95 }}
                className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all inline-flex items-center space-x-3"
              >
                <span>Get Started Today</span>
                <Zap className="w-5 h-5" />
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`text-white py-12 px-6 ${isDarkMode ? 'bg-gradient-to-b from-[#07131b] to-[#040c12]' : 'bg-gray-900'}`}>
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <img 
              src="/assets/images/logo.png" 
              alt="Tech Horizon Logo" 
              className="w-12 h-12 object-contain"
            />
            <span className="text-2xl font-bold">Tech Horizon</span>
          </div>
          <p className="text-gray-400 mb-6">
            Securing digital environments with innovative cybersecurity solutions
          </p>
          <div className="text-gray-500 text-sm">
            © 2026 Tech Horizon. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;
