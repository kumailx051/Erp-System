import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Building2,
  Users,
  UserPlus,
  Network,
  Wallet,
  Receipt,
  PlayCircle,
  Briefcase,
  ClipboardCheck,
  UserMinus,
  CalendarCheck,
  ClipboardList,
  Clock,
  LogOut,
  Menu,
  X,
  Settings,
  CalendarDays,
  Moon,
  Sun,
} from 'lucide-react';

const hrSidebarGroups = [
  {
    label: null,
    items: [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    ],
  },
  {
    label: 'Employees',
    items: [
      { path: '/dashboard/hr/employees', icon: Users, label: 'Employees', matchPaths: ['/dashboard/hr/employees', '/dashboard/hr/employee/'] },
      { path: '/dashboard/hr/employee/new', icon: UserPlus, label: 'Add Employee', exact: true },
      { path: '/dashboard/hr/departments-designations', icon: Building2, label: 'Departments' },
      { path: '/dashboard/hr/designations', icon: Briefcase, label: 'Designations' },
      { path: '/dashboard/hr/organization-chart', icon: Network, label: 'Org Chart' },
    ],
  },
  {
    label: 'Attendance',
    items: [
      { path: '/dashboard/hr/attendance', icon: CalendarCheck, label: 'Attendance', matchPaths: ['/dashboard/hr/attendance'] },
      { path: '/dashboard/hr/shifts', icon: Clock, label: 'Shifts' },
    ],
  },
  {
    label: 'Leave',
    items: [
      { path: '/dashboard/hr/leaves', icon: ClipboardList, label: 'Leaves', matchPaths: ['/dashboard/hr/leaves'] },
      { path: '/dashboard/hr/leave/calendar', icon: CalendarDays, label: 'Calendar', exact: true },
      { path: '/dashboard/hr/leave/settings', icon: Settings, label: 'Leave Settings' },
    ],
  },
  {
    label: 'Payroll',
    items: [
      { path: '/dashboard/hr/payroll', icon: Wallet, label: 'Payroll', exact: true },
      { path: '/dashboard/hr/payroll/process', icon: PlayCircle, label: 'Processing', exact: true },
      { path: '/dashboard/hr/payroll/settings', icon: Receipt, label: 'Pay Settings', exact: true },
    ],
  },
  {
    label: 'Recruitment',
    items: [
      { path: '/dashboard/hr/recruitment', icon: Briefcase, label: 'Recruitment', matchPaths: ['/dashboard/hr/recruitment', '/dashboard/hr/recruitment/candidate/'] },
      { path: '/dashboard/hr/recruitment/onboarding', icon: ClipboardCheck, label: 'Onboarding', exact: true },
    ],
  },
  {
    label: 'Exit',
    items: [
      { path: '/dashboard/hr/exit', icon: UserMinus, label: 'Exit Management' },
    ],
  },
];

const adminSidebarGroups = [
  {
    label: null,
    items: [
      { path: '/dashboard/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    ],
  },
  {
    label: 'Administration',
    items: [
      { path: '/dashboard/admin/hr-accounts', icon: Users, label: 'HR Accounts', exact: true },
    ],
  },
];

const candidateSidebarGroups = [
  {
    label: null,
    items: [
      { path: '/candidate/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    ],
  },
  {
    label: 'Applications',
    items: [
      { path: '/candidate/dashboard', icon: Briefcase, label: 'My Applications', exact: true },
    ],
  },
];

const employeeSidebarGroups = [
  {
    label: null,
    items: [
      { path: '/dashboard/employee', icon: LayoutDashboard, label: 'Dashboard', exact: true },
      { path: '/dashboard/employee/attendance', icon: CalendarCheck, label: 'Attendance', exact: true },
      { path: '/dashboard/employee/leaves', icon: ClipboardList, label: 'Leaves', exact: true },
      { path: '/dashboard/employee/salary', icon: Wallet, label: 'My Salary', exact: true },
      { path: '/dashboard/employee/resignation', icon: UserMinus, label: 'Resignation', exact: true },
    ],
  },
];

const isItemActive = (item, pathname) => {
  if (item.exact) return pathname === item.path;
  if (Array.isArray(item.matchPaths) && item.matchPaths.length > 0) {
    return item.matchPaths.some((m) => pathname === m || pathname.startsWith(m));
  }
  return pathname === item.path;
};

const SidebarContent = ({ expanded, navigate, location, handleLogout, user, isDarkMode, onToggleDarkMode, sidebarGroups, profilePath }) => (
  <div className="flex flex-col h-full overflow-hidden">
    <div className="flex items-center h-14 px-3.5 flex-shrink-0">
      <div className="w-8 h-8 flex-shrink-0 rounded-xl overflow-hidden">
        <img src="/assets/images/logo.png" alt="Logo" className="w-full h-full object-contain" />
      </div>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ width: expanded ? 148 : 0, opacity: expanded ? 1 : 0 }}
      >
        <span className={`ml-3 text-[15px] font-bold whitespace-nowrap ${isDarkMode ? 'text-cyan-300' : 'text-blue-600'}`}>
          Horizon Tech
        </span>
      </div>
    </div>

    <div className={`mx-3 h-px flex-shrink-0 bg-gradient-to-r from-transparent ${isDarkMode ? 'via-slate-700 to-transparent' : 'via-blue-100 to-transparent'}`} />

    <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-px" style={{ scrollbarWidth: 'none' }}>
      {sidebarGroups.map((group, gi) => (
        <div key={gi}>
          <div
            className="overflow-hidden transition-all duration-200"
            style={{ maxHeight: expanded && group.label ? 28 : 0, opacity: expanded && group.label ? 1 : 0 }}
          >
            <p className={`px-3 pt-3 pb-0.5 text-[10px] font-bold uppercase tracking-[0.13em] whitespace-nowrap select-none ${isDarkMode ? 'text-slate-400' : 'text-blue-400/70'}`}>
              {group.label}
            </p>
          </div>

          {group.items.map((item) => {
            const active = isItemActive(item, location.pathname);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                title={!expanded ? item.label : undefined}
                className={`
                  relative flex items-center rounded-xl transition-all duration-200 mb-0.5
                  ${expanded ? 'px-3 py-2.5' : 'justify-center p-3'}
                  ${active
                    ? isDarkMode ? 'text-cyan-300' : 'text-blue-600'
                    : isDarkMode ? 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50/70'}
                `}
              >
                {active && (
                  <motion.div
                    layoutId="sidebarActivePill"
                    className={`absolute inset-0 rounded-xl border ${isDarkMode ? 'bg-gradient-to-r from-cyan-500/12 to-blue-500/10 border-cyan-500/20' : 'bg-gradient-to-r from-blue-500/15 to-cyan-400/10 border-blue-200/60'}`}
                    transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                  />
                )}
                <item.icon className={`relative flex-shrink-0 w-[18px] h-[18px] ${active ? (isDarkMode ? 'text-cyan-300' : 'text-blue-600') : ''}`} />
                <div
                  className="relative overflow-hidden transition-all duration-300"
                  style={{ width: expanded ? 160 : 0, opacity: expanded ? 1 : 0 }}
                >
                  <span className="ml-3 text-[13px] font-semibold whitespace-nowrap">{item.label}</span>
                </div>
              </NavLink>
            );
          })}

          {gi < sidebarGroups.length - 1 && !expanded && (
            <div className="flex justify-center my-1">
              <div className={`w-5 h-px ${isDarkMode ? 'bg-slate-700' : 'bg-blue-100/80'}`} />
            </div>
          )}
        </div>
      ))}
    </nav>

    <div className={`mx-3 h-px flex-shrink-0 bg-gradient-to-r from-transparent ${isDarkMode ? 'via-slate-700 to-transparent' : 'via-blue-100 to-transparent'}`} />

    {/* Dark mode toggle */}
    <div className="px-2 pt-2 flex-shrink-0">
      <button
        onClick={onToggleDarkMode}
        title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        className={`
          flex items-center rounded-xl transition-all duration-200 w-full
          ${expanded ? 'px-3 py-2.5' : 'justify-center p-3'}
          ${isDarkMode
            ? 'bg-cyan-400/10 border border-cyan-300/20 text-cyan-300 hover:bg-cyan-400/15'
            : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50/70'}
        `}
      >
        {isDarkMode ? <Sun className="flex-shrink-0 w-[18px] h-[18px]" /> : <Moon className="flex-shrink-0 w-[18px] h-[18px]" />}
        <div
          className="overflow-hidden transition-all duration-300"
          style={{ width: expanded ? 160 : 0, opacity: expanded ? 1 : 0 }}
        >
          <span className="ml-3 text-[13px] font-semibold whitespace-nowrap">
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </span>
        </div>
      </button>
    </div>

    <div className={`mx-3 h-px flex-shrink-0 mt-2 bg-gradient-to-r from-transparent ${isDarkMode ? 'via-slate-700 to-transparent' : 'via-blue-100 to-transparent'}`} />

    <div className="p-2 flex-shrink-0">
      <div
        onClick={() => navigate(profilePath)}
        className={`flex items-center rounded-xl cursor-pointer transition-all duration-200 p-2 ${expanded ? '' : 'justify-center'} ${isDarkMode ? 'hover:bg-slate-800/80' : 'hover:bg-blue-50/70'}`}
      >
        <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md ${isDarkMode ? 'ring-2 ring-slate-800' : 'ring-2 ring-white'}`}>
          {user?.avatar
            ? <img src={user.avatar} alt="avatar" className="w-full h-full object-cover rounded-full" />
            : (user?.name?.[0]?.toUpperCase() || 'H')
          }
        </div>
        <div
          className="overflow-hidden transition-all duration-300 flex items-center"
          style={{ width: expanded ? 140 : 0, opacity: expanded ? 1 : 0 }}
        >
          <div className="ml-2.5 flex-1 min-w-0">
            <p className={`text-[13px] font-semibold truncate ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{user?.name || 'User'}</p>
            <p className={`text-[11px] truncate ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>{user?.role || 'user'}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleLogout(); }}
            className={`ml-1 p-1.5 rounded-lg transition-colors flex-shrink-0 ${isDarkMode ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  </div>
);

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hovered, setHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('homepage_theme') === 'dark');
  const [logoutMessage, setLogoutMessage] = useState('');

  useEffect(() => {
    localStorage.setItem('homepage_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  const user = (() => {
    try { return JSON.parse(localStorage.getItem('erp_user') || '{}'); }
    catch { return {}; }
  })();
  const isAdminUser = user?.role === 'admin';
  const isCandidateUser = user?.role === 'candidate';
  const isEmployeeUser = user?.role === 'employee';
  const sidebarGroups = isAdminUser
    ? adminSidebarGroups
    : (isCandidateUser ? candidateSidebarGroups : (isEmployeeUser ? employeeSidebarGroups : hrSidebarGroups));
  const profilePath = isAdminUser
    ? '/dashboard/admin/hr-accounts'
    : (isCandidateUser ? '/candidate/dashboard' : (isEmployeeUser ? '/dashboard/employee' : '/dashboard/hr/profile'));

  useEffect(() => {
    if (!localStorage.getItem('erp_user')) navigate('/login');
  }, [navigate]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setLogoutMessage('Logging out...');
    const token = localStorage.getItem('erp_token');

    try {
      if (token) {
        await fetch('http://localhost:5000/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      }
    } catch {
      // Always proceed with client-side logout even if API call fails.
    } finally {
      localStorage.removeItem('erp_user');
      localStorage.removeItem('erp_token');
      localStorage.removeItem('erp_employee_profile_complete');
      setTimeout(() => {
        navigate('/login');
      }, 700);
    }
  };

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${isDarkMode ? 'bg-[linear-gradient(180deg,_#09111d_0%,_#0f172a_100%)]' : 'bg-[#f0f4fa]'}`}>

      <AnimatePresence>
        {logoutMessage && (
          <motion.div
            initial={{ opacity: 0, x: 24, y: -20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 24, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-6 right-6 z-[90]"
          >
            <div className="rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl bg-red-600/95 border border-red-300/40">
              {logoutMessage}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={`
          fixed top-0 left-0 h-full w-64 z-50 lg:hidden
          ${isDarkMode ? 'bg-slate-950 border-r border-slate-800 shadow-[0_10px_40px_rgba(2,8,23,0.75)] text-slate-100' : 'bg-sky-50 border-r border-blue-200 shadow-2xl'}
          transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className={`flex items-center justify-between px-4 h-14 flex-shrink-0 ${isDarkMode ? 'border-b border-slate-800' : 'border-b border-blue-50'}`}>
          <div className="flex items-center space-x-2">
            <img src="/assets/images/logo.png" alt="Logo" className="w-7 h-7 object-contain" />
            <span className={`font-bold text-sm ${isDarkMode ? 'text-cyan-300' : 'text-blue-600'}`}>
              Horizon Tech
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className={`p-1.5 rounded-lg ${isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-100' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <SidebarContent
          expanded={true}
          navigate={navigate}
          location={location}
          handleLogout={handleLogout}
          user={user}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          sidebarGroups={sidebarGroups}
          profilePath={profilePath}
        />
      </div>

      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ width: hovered ? 220 : 68 }}
        className={`fixed top-4 left-4 bottom-4 z-50 hidden lg:flex flex-col rounded-2xl overflow-hidden transition-[width] duration-300 ease-in-out ${isDarkMode ? 'bg-slate-950 border border-slate-800 shadow-[0_12px_50px_rgba(2,8,23,0.7)]' : 'bg-sky-50 border border-blue-200 shadow-[0_8px_40px_rgba(59,130,246,0.16),0_2px_12px_rgba(59,130,246,0.08)]'}`}
      >
        <div className={`absolute top-0 left-0 right-0 h-px pointer-events-none bg-gradient-to-r from-transparent ${isDarkMode ? 'via-cyan-400/30 to-transparent' : 'via-blue-300/50 to-transparent'}`} />
        <SidebarContent
          expanded={hovered}
          navigate={navigate}
          location={location}
          handleLogout={handleLogout}
          user={user}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          sidebarGroups={sidebarGroups}
          profilePath={profilePath}
        />
      </aside>

      <div className="flex-1 lg:ml-[84px] min-w-0">
        <main className={`p-4 lg:p-6 min-h-screen transition-colors duration-300 ${isDarkMode ? 'text-slate-100' : ''}`}>
          <button
            onClick={() => setMobileOpen(true)}
            className={`lg:hidden mb-4 inline-flex items-center justify-center p-2.5 rounded-xl transition-all ${isDarkMode ? 'border border-slate-700 bg-slate-900 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40' : 'border border-gray-200 bg-white text-gray-600 hover:text-blue-600 hover:border-blue-200 shadow-sm'}`}
          >
            <Menu className="w-5 h-5" />
          </button>
          <Outlet context={{ isDarkMode }} />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
