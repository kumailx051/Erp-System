import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Clock3,
  CalendarCheck2,
  Wallet,
  UserPlus,
  BarChart3,
  GraduationCap,
  Receipt,
  LogOut,
  ShieldCheck,
  Zap,
  Globe
} from 'lucide-react';
import Navigation from '../shared/components/Navigation';

const FeaturesPage = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('homepage_theme') === 'dark');

  useEffect(() => {
    localStorage.setItem('homepage_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const cardVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45 } }
  };

  const featureGroups = [
    {
      title: 'Employee Management',
      icon: <Users className="w-6 h-6" />,
      points: ['Employee master records', 'Department and designation setup', 'Organization hierarchy and self-service']
    },
    {
      title: 'Attendance Management',
      icon: <Clock3 className="w-6 h-6" />,
      points: ['Daily check-in and check-out', 'Shift roster and overtime tracking', 'Monthly attendance reporting']
    },
    {
      title: 'Leave Management',
      icon: <CalendarCheck2 className="w-6 h-6" />,
      points: ['Multi-type leave policies', 'Approval workflows and balances', 'Holiday calendar controls']
    },
    {
      title: 'Payroll Management',
      icon: <Wallet className="w-6 h-6" />,
      points: ['Salary structures and deductions', 'Monthly payroll processing', 'Payslip generation and compliance']
    },
    {
      title: 'Recruitment and Onboarding',
      icon: <UserPlus className="w-6 h-6" />,
      points: ['Job posting and candidate pipeline', 'Interview and offer management', 'Onboarding checklist automation']
    },
    {
      title: 'Performance Management',
      icon: <BarChart3 className="w-6 h-6" />,
      points: ['Goal and KPI tracking', 'Appraisal cycles and ratings', 'Structured feedback loops']
    },
    {
      title: 'Training and Development',
      icon: <GraduationCap className="w-6 h-6" />,
      points: ['Program scheduling', 'Attendance and assessments', 'Certification management']
    },
    {
      title: 'Expense Management',
      icon: <Receipt className="w-6 h-6" />,
      points: ['Expense claim submission', 'Approval workflows', 'Reimbursement processing']
    },
    {
      title: 'Exit Management',
      icon: <LogOut className="w-6 h-6" />,
      points: ['Resignation and termination', 'Exit clearance and asset return', 'Final settlement tracking']
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
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className={`absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl ${isDarkMode ? 'bg-gradient-to-br from-cyan-400/15 to-emerald-400/10' : 'bg-gradient-to-br from-blue-400/20 to-cyan-400/20'}`}
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
          className={`absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl ${isDarkMode ? 'bg-gradient-to-br from-sky-500/10 to-cyan-400/10' : 'bg-gradient-to-br from-cyan-400/20 to-blue-300/20'}`}
        />
      </div>

      <Navigation isScrolled={true} isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(prev => !prev)} />

      <section className="relative pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl md:text-6xl font-bold mb-6"
          >
            <span className="bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-500 bg-clip-text text-transparent">
              Built For Fast, Secure
            </span>
            <br />
            <span className="bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
              HR Operations
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={`text-xl max-w-4xl mx-auto ${isDarkMode ? 'text-cyan-50/80' : 'text-gray-600'}`}
          >
            From employee lifecycle to payroll, performance, and compliance, every workflow is designed as a modern unified experience.
          </motion.p>
        </div>
      </section>

      <section className="relative py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ staggerChildren: 0.08 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {featureGroups.map((item) => (
              <motion.div
                key={item.title}
                variants={cardVariants}
                whileHover={{ y: -10, scale: 1.01 }}
                className={`group backdrop-blur-sm rounded-3xl p-7 shadow-xl hover:shadow-2xl transition-all ${isDarkMode ? 'bg-slate-950/45 border border-cyan-400/15 hover:border-cyan-400/30' : 'bg-white/80 border border-white/60 hover:border-blue-200'}`}
              >
                <div className="w-14 h-14 mb-5 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
                  {item.icon}
                </div>
                <h3 className={`text-xl font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{item.title}</h3>
                <ul className={`space-y-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                  {item.points.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-500" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="relative py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl p-12 text-center text-white shadow-2xl"
          >
            <Zap className="w-12 h-12 mx-auto mb-5" />
            <h3 className="text-3xl md:text-4xl font-bold mb-4">Ready To Explore Deeper Workflows?</h3>
            <p className="text-lg opacity-90 max-w-3xl mx-auto">See how Tech Horizon solutions combine security consulting with practical HR execution across every stage.</p>
          </motion.div>
        </div>
      </section>

      <footer className={`relative text-white py-10 px-6 ${isDarkMode ? 'bg-gradient-to-b from-[#07131b] to-[#040c12]' : 'bg-gray-900'}`}>
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-400">Tech Horizon ERP Features</p>
        </div>
      </footer>
    </div>
  );
};

export default FeaturesPage;
