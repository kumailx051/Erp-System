import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Server,
  Lock,
  BookOpen,
  Building2,
  Briefcase,
  Factory,
  ArrowRight,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Navigation from '../shared/components/Navigation';

const SolutionsPage = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('homepage_theme') === 'dark');

  useEffect(() => {
    localStorage.setItem('homepage_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const solutionCards = [
    {
      title: 'Cybersecurity Solutions',
      description: 'Advanced information security services that protect organizations from evolving cyber threats.',
      icon: <Shield className="w-6 h-6" />
    },
    {
      title: 'IT Infrastructure Solutions',
      description: 'Digital infrastructure design and optimization for resilient, high-performance operations.',
      icon: <Server className="w-6 h-6" />
    },
    {
      title: 'Security Assessments',
      description: 'Comprehensive evaluations, threat analysis, and risk mitigation plans using modern labs.',
      icon: <Lock className="w-6 h-6" />
    },
    {
      title: 'Security Training Programs',
      description: 'Professional training initiatives to raise organizational awareness and response readiness.',
      icon: <BookOpen className="w-6 h-6" />
    }
  ];

  const industries = [
    {
      title: 'Growing Startups',
      icon: <Building2 className="w-6 h-6" />,
      points: ['Fast onboarding workflows', 'Scalable attendance and leave', 'Compliance-ready payroll setup']
    },
    {
      title: 'Mid-Size Businesses',
      icon: <Briefcase className="w-6 h-6" />,
      points: ['Unified HR dashboards', 'Role-based approvals', 'Automated reports and exports']
    },
    {
      title: 'Enterprise Organizations',
      icon: <Factory className="w-6 h-6" />,
      points: ['Event-driven modular architecture', 'Advanced security assessments', 'Policy-driven workforce operations']
    }
  ];

  return (
    <div className={`min-h-screen relative overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_28%),linear-gradient(180deg,_#07131b_0%,_#0a1e29_45%,_#08151f_100%)]' : 'bg-gradient-to-br from-blue-50 via-white to-cyan-50'}`}>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, ${isDarkMode ? 'rgba(34,211,238,0.09)' : 'rgba(59,130,246,0.1)'} 1px, transparent 1px),
            linear-gradient(to bottom, ${isDarkMode ? 'rgba(34,211,238,0.09)' : 'rgba(59,130,246,0.1)'} 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 100, 0] }}
          transition={{ duration: 21, repeat: Infinity, ease: 'linear' }}
          className={`absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl ${isDarkMode ? 'bg-gradient-to-br from-cyan-400/15 to-emerald-400/10' : 'bg-gradient-to-br from-blue-400/20 to-cyan-400/20'}`}
        />
        <motion.div
          animate={{ scale: [1, 1.25, 1], rotate: [0, -100, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
          className={`absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl ${isDarkMode ? 'bg-gradient-to-br from-sky-500/10 to-cyan-400/10' : 'bg-gradient-to-br from-cyan-400/20 to-blue-300/20'}`}
        />
      </div>

      <Navigation isScrolled={true} isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(prev => !prev)} />

      <section className="relative pt-32 pb-14 px-6">
        <div className="max-w-7xl mx-auto text-center">
          
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl md:text-6xl font-bold mb-6"
          >
            <span className="bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-500 bg-clip-text text-transparent">
              Solutions Crafted For
            </span>
            <br />
            <span className="bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Real-World Operations
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className={`text-xl max-w-4xl mx-auto ${isDarkMode ? 'text-cyan-50/80' : 'text-gray-600'}`}
          >
            We combine cybersecurity expertise with practical HR and business workflows to deliver trusted performance at scale.
          </motion.p>
        </div>
      </section>

      <section className="relative py-16 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {solutionCards.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              whileHover={{ y: -8, scale: 1.01 }}
              className={`group rounded-3xl p-8 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all ${isDarkMode ? 'bg-slate-950/45 border border-cyan-400/15 hover:border-cyan-400/30' : 'bg-white/80 border border-white/60 hover:border-blue-200'}`}
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center shadow-lg mb-5 group-hover:rotate-6 transition-transform">
                {item.icon}
              </div>
              <h3 className={`text-2xl font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{item.title}</h3>
              <p className={`leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>{item.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center text-4xl md:text-5xl font-bold mb-12 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent"
          >
            Industry-Ready Delivery Models
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8">
            {industries.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`rounded-3xl backdrop-blur-sm p-8 shadow-xl ${isDarkMode ? 'bg-slate-950/45 border border-cyan-400/15' : 'bg-white/80 border border-white/60'}`}
              >
                <div className="w-14 h-14 mb-5 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center">
                  {item.icon}
                </div>
                <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{item.title}</h3>
                <ul className="space-y-3">
                  {item.points.map((point) => (
                    <li key={point} className={`flex items-start gap-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                      <CheckCircle2 className="w-4 h-4 mt-1 text-cyan-600" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className={`bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl p-8 sm:p-12 text-white text-center shadow-2xl`}
          >
            <h3 className="text-3xl md:text-4xl font-bold mb-5">Need A Tailored Solution Architecture?</h3>
            <p className="text-lg opacity-90 mb-8 max-w-3xl mx-auto">
              Let us align security, operations, and HR process design into one implementation roadmap built for your organization.
            </p>
            <Link to="/login" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors">
              <span>Book A Solution Session</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      <footer className={`relative text-white py-10 px-6 ${isDarkMode ? 'bg-gradient-to-b from-[#07131b] to-[#040c12]' : 'bg-gray-900'}`}>
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-400">Tech Horizon ERP Solutions</p>
        </div>
      </footer>
    </div>
  );
};

export default SolutionsPage;
