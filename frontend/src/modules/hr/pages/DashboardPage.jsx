import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  Plus,
  Activity,
  Building2,
  Bell
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

const API_BASE = 'http://localhost:5000';

const defaultAttendanceTrend = [
  { name: 'Mon', present: 0, absent: 0 },
  { name: 'Tue', present: 0, absent: 0 },
  { name: 'Wed', present: 0, absent: 0 },
  { name: 'Thu', present: 0, absent: 0 },
  { name: 'Fri', present: 0, absent: 0 }
];

const departmentData = [
  { name: 'Engineering', count: 45 },
  { name: 'Design', count: 18 },
  { name: 'Marketing', count: 22 },
  { name: 'Sales', count: 30 },
  { name: 'HR', count: 12 },
  { name: 'Finance', count: 15 },
];

const quickActions = [
  { label: 'Add Employee', icon: Plus, path: '/dashboard/hr/employee/new', color: 'from-blue-500 to-cyan-500' },
  { label: 'Mark Attendance', icon: CalendarCheck, path: '/dashboard/hr/attendance', color: 'from-emerald-500 to-green-500' },
  { label: 'Manage Shifts', icon: Clock, path: '/dashboard/hr/shifts', color: 'from-violet-500 to-purple-500' },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 }
  })
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('erp_user') || '{}');
  const token = localStorage.getItem('erp_token');
  const { isDarkMode = false } = useOutletContext() || {};

  const [dashboardData, setDashboardData] = useState({
    totalEmployees: 0,
    departments: departmentData,
    recentActivities: [],
    attendanceSummary: {
      presentToday: 0,
      absentToday: 0,
      markedEmployees: 0,
      totalEmployees: 0
    },
    attendanceTrend: defaultAttendanceTrend
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!token) return;

      try {
        const today = new Date();
        const dateString = today.toISOString().slice(0, 10);
        const monthString = dateString.slice(0, 7);

        const [employeeRes, summaryRes, attendanceRes, analyticsRes] = await Promise.all([
          fetch(`${API_BASE}/api/hr/employees`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }),
          fetch(`${API_BASE}/api/hr/organization/summary`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }),
          fetch(`${API_BASE}/api/hr/attendance/employees?date=${dateString}`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }),
          fetch(`${API_BASE}/api/hr/attendance/analytics?month=${monthString}&date=${dateString}`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          })
        ]);

        const employeePayload = await employeeRes.json();
        const summaryPayload = await summaryRes.json();
        const attendancePayload = await attendanceRes.json();
        const analyticsPayload = await analyticsRes.json();

        if (!employeeRes.ok || !employeePayload?.success) {
          throw new Error(employeePayload?.message || 'Failed to fetch employees data');
        }

        if (!summaryRes.ok || !summaryPayload?.success) {
          throw new Error(summaryPayload?.message || 'Failed to fetch organization summary');
        }

        if (!attendanceRes.ok || !attendancePayload?.success) {
          throw new Error(attendancePayload?.message || 'Failed to fetch attendance summary');
        }

        if (!analyticsRes.ok || !analyticsPayload?.success) {
          throw new Error(analyticsPayload?.message || 'Failed to fetch attendance analytics');
        }

        const employees = employeePayload?.data?.employees || [];
        const departments = (summaryPayload?.data?.departments || []).map((d) => ({
          name: d.name,
          count: Number(d.members || 0)
        }));

        const formatTimeAgo = (dateString) => {
          if (!dateString) return 'just now';
          const now = Date.now();
          const created = new Date(dateString).getTime();
          if (Number.isNaN(created)) return 'just now';

          const diffMinutes = Math.max(0, Math.floor((now - created) / 60000));
          if (diffMinutes < 1) return 'just now';
          if (diffMinutes < 60) return `${diffMinutes} min ago`;

          const diffHours = Math.floor(diffMinutes / 60);
          if (diffHours < 24) return `${diffHours} hr ago`;

          const diffDays = Math.floor(diffHours / 24);
          return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        };

        const recentEmployeeActivities = employees.slice(0, 5).map((emp, index) => ({
          id: emp.id || index + 1,
          text: `${emp.fullName || 'Employee'} joined ${emp.department || 'team'}`,
          time: formatTimeAgo(emp.createdAt || emp.joinDate),
          type: 'join',
          color: 'bg-green-500'
        }));

        const attendanceSummary = attendancePayload?.data?.summary || {};
        const weeklyTrend = (analyticsPayload?.data?.weeklyTrend || []).map((item) => ({
          name: item.day,
          present: Number(item.present || 0),
          absent: Number(item.absent || 0)
        }));

        setDashboardData({
          totalEmployees: Number(employeePayload?.data?.employeeTotal || employees.length || 0),
          departments,
          recentActivities: recentEmployeeActivities,
          attendanceSummary: {
            presentToday: Number(attendanceSummary.present || 0)
              + Number(attendanceSummary.late || 0)
              + Number(attendanceSummary.halfDay || 0),
            absentToday: Number(attendanceSummary.absent || 0),
            markedEmployees: Number(attendanceSummary.markedEmployees || 0),
            totalEmployees: Number(attendanceSummary.totalEmployees || 0)
          },
          attendanceTrend: weeklyTrend.length > 0 ? weeklyTrend : defaultAttendanceTrend
        });
      } catch (error) {
        // Keep existing values when API is unavailable.
        setDashboardData((prev) => ({
          ...prev,
          totalEmployees: prev.totalEmployees || 0,
          attendanceTrend: prev.attendanceTrend?.length ? prev.attendanceTrend : defaultAttendanceTrend
        }));
      }
    };

    fetchDashboardData();
  }, [token]);

  const statCards = useMemo(() => ([
    {
      title: 'Total Employees',
      value: String(dashboardData.totalEmployees || 0),
      change: 'Live',
      changeText: 'from database',
      trend: 'up',
      icon: Users,
      gradient: 'from-blue-500 to-blue-600',
      shadow: 'shadow-blue-500/20',
      bg: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      title: 'Present Today',
      value: String(dashboardData.attendanceSummary.presentToday || 0),
      change: `${dashboardData.attendanceSummary.markedEmployees || 0}/${dashboardData.attendanceSummary.totalEmployees || 0}`,
      changeText: 'marked employees',
      trend: 'up',
      icon: UserCheck,
      gradient: 'from-emerald-500 to-green-600',
      shadow: 'shadow-emerald-500/20',
      bg: 'bg-emerald-50',
      iconColor: 'text-emerald-600'
    },
    {
      title: 'Absent Today',
      value: String(dashboardData.attendanceSummary.absentToday || 0),
      change: 'Live',
      changeText: 'from attendance',
      trend: 'down',
      icon: UserX,
      gradient: 'from-amber-500 to-orange-600',
      shadow: 'shadow-amber-500/20',
      bg: 'bg-amber-50',
      iconColor: 'text-amber-600'
    }
  ]), [
    dashboardData.totalEmployees,
    dashboardData.attendanceSummary.presentToday,
    dashboardData.attendanceSummary.absentToday,
    dashboardData.attendanceSummary.markedEmployees,
    dashboardData.attendanceSummary.totalEmployees
  ]);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-2xl p-6 lg:p-8 text-white ${isDarkMode ? 'bg-[linear-gradient(135deg,_rgba(34,211,238,0.2)_0%,_rgba(37,99,235,0.38)_45%,_rgba(6,182,212,0.3)_100%)] border border-cyan-400/15 shadow-[0_10px_40px_rgba(8,21,31,0.35)]' : 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500'}`}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-white/10 rounded-full blur-3xl translate-y-1/2" />
        <div className="relative z-10">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">
            Welcome back, {user.name || 'HR Admin'} 👋
          </h1>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.title}
            custom={i}
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={`rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all cursor-pointer ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-white/5' : card.bg}`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <div className={`flex items-center space-x-1 text-xs font-medium ${card.trend === 'up' ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600') : (isDarkMode ? 'text-amber-400' : 'text-amber-600')}`}>
                {card.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{card.change}</span>
              </div>
            </div>
            <div className={`text-2xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{card.value}</div>
            <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{card.title}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Attendance Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`lg:col-span-2 rounded-2xl p-6 border shadow-sm ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Attendance Overview</h3>
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>This week's attendance trend</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Present</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Absent</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={dashboardData.attendanceTrend}>
              <defs>
                <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isDarkMode ? '#22d3ee' : '#3b82f6'} stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? 'rgba(148, 163, 184, 0.12)' : '#f1f5f9'} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#94a3b8' : '#94a3b8', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#94a3b8' : '#94a3b8', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: isDarkMode ? '#07131b' : '#1e293b',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                  padding: '8px 12px'
                }}
              />
              <Area type="monotone" dataKey="present" stroke={isDarkMode ? '#22d3ee' : '#3b82f6'} fill="url(#presentGrad)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="absent" stroke="#f87171" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Department Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={`rounded-2xl p-6 border shadow-sm ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}
        >
          <h3 className={`text-lg font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Departments</h3>
          <p className={`text-sm mb-6 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Employee distribution</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dashboardData.departments} layout="vertical" margin={{ left: 0 }}>
              <defs>
                <linearGradient id="departmentBarGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={isDarkMode ? '#22d3ee' : '#3b82f6'} />
                  <stop offset="100%" stopColor={isDarkMode ? '#06b6d4' : '#06b6d4'} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? 'rgba(148, 163, 184, 0.12)' : '#f1f5f9'} horizontal={false} />
              <XAxis type="number" domain={[0, 'dataMax + 1']} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 11 }} width={80} />
              <Tooltip
                contentStyle={{
                  background: isDarkMode ? '#07131b' : '#1e293b',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                  padding: '8px 12px'
                }}
              />
              <Bar dataKey="count" minPointSize={6} fill="url(#departmentBarGrad)" radius={[0, 6, 6, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className={`rounded-2xl p-6 border shadow-sm ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}
        >
          <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <motion.button
                key={action.label}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(action.path)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all group ${isDarkMode ? 'bg-slate-900/60 hover:bg-slate-900 border-cyan-400/10' : 'bg-gray-50 hover:bg-gray-100 border-gray-100'}`}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-2 shadow-lg group-hover:shadow-xl transition-shadow`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <span className={`text-xs font-medium transition-colors ${isDarkMode ? 'text-slate-300 group-hover:text-white' : 'text-gray-600 group-hover:text-gray-900'}`}>{action.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className={`lg:col-span-2 rounded-2xl p-6 border shadow-sm ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Recent Activity</h3>
            <button className={`text-sm font-medium flex items-center space-x-1 ${isDarkMode ? 'text-cyan-300 hover:text-cyan-200' : 'text-blue-600 hover:text-blue-700'}`}>
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-4">
            {dashboardData.recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 group">
                <div className={`w-2 h-2 rounded-full ${activity.color} mt-2 flex-shrink-0 ring-4 ring-opacity-20 ${activity.color.replace('bg-', 'ring-')}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm transition-colors ${isDarkMode ? 'text-slate-300 group-hover:text-white' : 'text-gray-700 group-hover:text-gray-900'}`}>{activity.text}</p>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{activity.time}</p>
                </div>
              </div>
            ))}
            {dashboardData.recentActivities.length === 0 && (
              <div className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                No recent activity yet.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardPage;
