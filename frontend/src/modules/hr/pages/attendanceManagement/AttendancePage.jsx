import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  CalendarCheck, UserCheck, UserX, Clock, AlertTriangle, Search,
  ChevronLeft, ChevronRight, Eye, CheckCircle, XCircle, BarChart3, X
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'on_leave', label: 'On Leave' }
];

function normalizeTimeDisplay(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '-';
  }

  if (raw.length >= 5) {
    return raw.slice(0, 5);
  }

  return raw;
}

function parseTimeMinutes(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return (hours * 60) + minutes;
}

const StatusBadge = ({ status, isDarkMode }) => {
  const s = {
    present: isDarkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    late: isDarkMode ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200',
    absent: isDarkMode ? 'bg-red-500/10 text-red-300 border-red-500/20' : 'bg-red-50 text-red-700 border-red-200',
    half_day: isDarkMode ? 'bg-orange-500/10 text-orange-300 border-orange-500/20' : 'bg-orange-50 text-orange-700 border-orange-200',
    on_leave: isDarkMode ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' : 'bg-blue-50 text-blue-700 border-blue-200',
    not_marked: isDarkMode ? 'bg-slate-700/30 text-slate-300 border-slate-600/40' : 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const label = status === 'not_marked'
    ? 'Not Marked'
    : status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${s[status] || s.not_marked}`}>
      {label}
    </span>
  );
};

const TabButton = ({ active, children, onClick, isDarkMode }) => (
  <button onClick={onClick}
    className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-all whitespace-nowrap
      ${active ? (isDarkMode ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/30' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/25') : (isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100')}`}>
    {children}
  </button>
);

/* Calendar component */
const CalendarView = ({ isDarkMode, currentMonth, dayStatus, onPrevMonth, onNextMonth }) => {
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = currentMonth.getDay();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const statusColors = {
    present: isDarkMode ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
    absent: isDarkMode ? 'bg-red-500/15 text-red-300 hover:bg-red-500/20' : 'bg-red-100 text-red-800 hover:bg-red-200',
    late: isDarkMode ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/20' : 'bg-amber-100 text-amber-800 hover:bg-amber-200',
    half_day: isDarkMode ? 'bg-orange-500/15 text-orange-300 hover:bg-orange-500/20' : 'bg-orange-100 text-orange-800 hover:bg-orange-200',
    on_leave: isDarkMode ? 'bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/20' : 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    weekend: isDarkMode ? 'bg-slate-900 text-slate-500' : 'bg-gray-50 text-gray-400',
  };

  return (
    <div className={`rounded-2xl border shadow-sm p-6 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{monthLabel}</h3>
        <div className="flex items-center space-x-2">
          <button onClick={onPrevMonth} className={`p-1.5 rounded-lg ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}><ChevronLeft className={`w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} /></button>
          <button onClick={onNextMonth} className={`p-1.5 rounded-lg ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}><ChevronRight className={`w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {dayNames.map(d => (
          <div key={d} className={`text-center py-2 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{d}</div>
        ))}
        {[...Array(firstDayOfMonth)].map((_, i) => <div key={`e${i}`} />)}
        {[...Array(daysInMonth)].map((_, i) => {
          const day = i + 1;
          const status = dayStatus[String(day)];
          return (
            <div key={day}
              className={`text-center py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all
                ${status ? statusColors[status] : (isDarkMode ? 'text-slate-600 bg-slate-900/60' : 'text-gray-300 bg-gray-50/50')}
                ${!status ? (isDarkMode ? 'text-slate-600' : 'text-gray-300') : ''}`}
            >
              {day}
            </div>
          );
        })}
      </div>
      <div className={`flex items-center gap-4 mt-4 pt-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
        {[
          { label: 'Present', color: 'bg-emerald-500' },
          { label: 'Absent', color: 'bg-red-500' },
          { label: 'Late', color: 'bg-amber-500' },
          { label: 'Half Day', color: 'bg-orange-500' },
          { label: 'On Leave', color: 'bg-blue-500' },
          { label: 'Weekend', color: 'bg-gray-300' },
        ].map(l => (
          <div key={l.label} className={`flex items-center space-x-1.5 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} /><span>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const AttendancePage = () => {
  const token = localStorage.getItem('erp_token');
  const [weeklyData, setWeeklyData] = useState([
    { day: 'Mon', present: 0, absent: 0 },
    { day: 'Tue', present: 0, absent: 0 },
    { day: 'Wed', present: 0, absent: 0 },
    { day: 'Thu', present: 0, absent: 0 },
    { day: 'Fri', present: 0, absent: 0 }
  ]);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [calendarDayStatus, setCalendarDayStatus] = useState({});
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [activeReport, setActiveReport] = useState(null);
  const [reportData, setReportData] = useState({
    title: '',
    note: null,
    columns: [],
    rows: []
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    onLeave: 0
  });
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [markRows, setMarkRows] = useState([]);
  const [markModalError, setMarkModalError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();
  const { isDarkMode = false } = useOutletContext() || {};

  const openNativePicker = (event) => {
    if (typeof event.currentTarget.showPicker === 'function') {
      event.currentTarget.showPicker();
    }
  };

  const fetchAttendanceData = async (date) => {
    if (!token) {
      setErrorMessage('Login session missing. Please login again.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');

      const response = await fetch(`http://localhost:5000/api/hr/attendance/employees?date=${date}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to fetch attendance data');
      }

      const employees = Array.isArray(payload?.data?.employees) ? payload.data.employees : [];
      const formattedRecords = employees.map((employee) => ({
        id: employee.id,
        name: employee.fullName || 'Unknown Employee',
        department: employee.department || '-',
        designation: employee.designation || '-',
        checkIn: normalizeTimeDisplay(employee.checkInTime),
        checkOut: normalizeTimeDisplay(employee.checkOutTime),
        status: employee.attendanceStatus || 'not_marked',
        hours: employee.workedHoursLabel || '-',
        remarks: employee.remarks || ''
      }));

      setAttendanceRecords(formattedRecords);
      setSummary({
        totalEmployees: Number(payload?.data?.summary?.totalEmployees || 0),
        present: Number(payload?.data?.summary?.present || 0),
        absent: Number(payload?.data?.summary?.absent || 0),
        late: Number(payload?.data?.summary?.late || 0),
        halfDay: Number(payload?.data?.summary?.halfDay || 0),
        onLeave: Number(payload?.data?.summary?.onLeave || 0)
      });
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyticsData = async () => {
    if (!token) {
      return;
    }

    try {
      const monthString = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}`;
      const response = await fetch(`http://localhost:5000/api/hr/attendance/analytics?month=${monthString}&date=${attendanceDate}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to fetch attendance analytics');
      }

      setWeeklyData(Array.isArray(payload?.data?.weeklyTrend) ? payload.data.weeklyTrend : []);
      setCalendarDayStatus(payload?.data?.calendar || {});
    } catch {
      setWeeklyData([
        { day: 'Mon', present: 0, absent: 0 },
        { day: 'Tue', present: 0, absent: 0 },
        { day: 'Wed', present: 0, absent: 0 },
        { day: 'Thu', present: 0, absent: 0 },
        { day: 'Fri', present: 0, absent: 0 }
      ]);
      setCalendarDayStatus({});
    }
  };

  useEffect(() => {
    fetchAttendanceData(attendanceDate);
  }, [attendanceDate]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [calendarMonth, attendanceDate]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const refreshNow = () => {
      fetchAttendanceData(attendanceDate);
      fetchAnalyticsData();
    };

    const intervalId = setInterval(() => {
      refreshNow();
    }, 10000);

    window.addEventListener('focus', refreshNow);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', refreshNow);
    };
  }, [token, attendanceDate, calendarMonth]);

  useEffect(() => {
    if (!showMarkModal) {
      return;
    }

    setMarkRows(
      attendanceRecords.map((record) => ({
        employeeId: record.id,
        name: record.name,
        department: record.department,
        status: record.status === 'not_marked' ? 'present' : record.status,
        checkInTime: record.checkIn !== '-' ? record.checkIn : '',
        checkOutTime: record.checkOut !== '-' ? record.checkOut : '',
        remarks: record.remarks || ''
      }))
    );
  }, [showMarkModal, attendanceRecords]);

  const statCards = useMemo(() => {
    const total = summary.totalEmployees || 1;
    const percentage = (count) => `${((count / total) * 100).toFixed(1)}%`;

    return [
      { title: 'Present', value: String(summary.present), subtitle: percentage(summary.present), icon: UserCheck, bg: 'bg-emerald-50', color: 'text-emerald-600' },
      { title: 'Absent', value: String(summary.absent), subtitle: percentage(summary.absent), icon: UserX, bg: 'bg-red-50', color: 'text-red-500' },
      { title: 'Late', value: String(summary.late), subtitle: percentage(summary.late), icon: Clock, bg: 'bg-amber-50', color: 'text-amber-600' },
      { title: 'On Leave', value: String(summary.onLeave), subtitle: percentage(summary.onLeave), icon: CalendarCheck, bg: 'bg-blue-50', color: 'text-blue-600' }
    ];
  }, [summary]);

  const openMarkModal = () => {
    setSuccessMessage('');
    setMarkModalError('');
    setShowMarkModal(true);
  };

  const closeMarkModal = () => {
    setMarkModalError('');
    setShowMarkModal(false);
  };

  const handleMarkRowChange = (employeeId, key, value) => {
    setMarkRows((prev) =>
      prev.map((row) =>
        row.employeeId === employeeId ? { ...row, [key]: value } : row
      )
    );
  };

  const saveAttendance = async () => {
    if (!token) {
      setMarkModalError('Login session missing. Please login again.');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage('');
      setMarkModalError('');

      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const nowMinutes = (now.getHours() * 60) + now.getMinutes();

      for (const row of markRows) {
        const checkInMinutes = parseTimeMinutes(row.checkInTime);
        const checkOutMinutes = parseTimeMinutes(row.checkOutTime);

        if (row.checkInTime && checkInMinutes === null) {
          throw new Error(`Invalid check-in time for ${row.name}`);
        }

        if (row.checkOutTime && checkOutMinutes === null) {
          throw new Error(`Invalid check-out time for ${row.name}`);
        }

        if (checkOutMinutes !== null && checkInMinutes === null) {
          throw new Error(`Check-in time is required before check-out for ${row.name}`);
        }

        if (checkInMinutes !== null && checkOutMinutes !== null && checkOutMinutes <= checkInMinutes) {
          throw new Error(`Check-out time must be later than check-in for ${row.name}`);
        }

        if (attendanceDate === today) {
          if (checkInMinutes !== null && checkInMinutes > nowMinutes) {
            throw new Error(`Check-in time cannot be in the future for ${row.name}`);
          }
          if (checkOutMinutes !== null && checkOutMinutes > nowMinutes) {
            throw new Error(`Check-out time cannot be in the future for ${row.name}`);
          }
        }
      }

      const response = await fetch('http://localhost:5000/api/hr/attendance/mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date: attendanceDate,
          records: markRows.map((row) => ({
            employeeId: row.employeeId,
            status: row.status,
            checkInTime: row.checkInTime || null,
            checkOutTime: row.checkOutTime || null,
            remarks: row.remarks || ''
          }))
        })
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to save attendance');
      }

      setSuccessMessage('Attendance saved successfully.');
      closeMarkModal();
      await fetchAttendanceData(attendanceDate);
    } catch (error) {
      setMarkModalError(error.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const filtered = attendanceRecords.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const reportCards = [
    { type: 'monthly_summary', title: 'Monthly Summary', desc: 'View attendance statistics for the month', icon: BarChart3, color: 'from-blue-500 to-cyan-500' },
    { type: 'late_arrivals', title: 'Late Arrivals', desc: 'Employees with frequent late check-ins', icon: AlertTriangle, color: 'from-amber-500 to-orange-500' },
    { type: 'absentee_report', title: 'Absentee Report', desc: 'Track absence patterns and trends', icon: UserX, color: 'from-red-500 to-rose-500' },
    { type: 'overtime_report', title: 'Overtime Report', desc: 'Employees working beyond regular hours', icon: Clock, color: 'from-violet-500 to-purple-500' },
  ];

  const openReportModal = async (reportType) => {
    if (!token) {
      setErrorMessage('Login session missing. Please login again.');
      return;
    }

    try {
      setErrorMessage('');
      setActiveReport(reportType);
      setShowReportModal(true);
      setReportLoading(true);

      const response = await fetch(`http://localhost:5000/api/hr/attendance/reports?type=${reportType}&month=${reportMonth}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to fetch report data');
      }

      setReportData({
        title: payload?.data?.title || 'Attendance Report',
        note: payload?.data?.note || null,
        columns: Array.isArray(payload?.data?.columns) ? payload.data.columns : [],
        rows: Array.isArray(payload?.data?.rows) ? payload.data.rows : []
      });
    } catch (error) {
      setErrorMessage(error.message || 'Failed to fetch report data');
      setReportData({
        title: 'Attendance Report',
        note: null,
        columns: [],
        rows: []
      });
    } finally {
      setReportLoading(false);
    }
  };

  const refreshReportModal = async () => {
    if (!activeReport) {
      return;
    }

    await openReportModal(activeReport);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Attendance Management</h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Track attendance records marked by employees</p>
        </div>
      </div>

      {errorMessage && !showMarkModal && (
        <div className={`rounded-xl px-4 py-2.5 text-sm border ${isDarkMode ? 'bg-red-500/10 text-red-300 border-red-500/30' : 'bg-red-50 text-red-700 border-red-100'}`}>
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className={`rounded-xl px-4 py-2.5 text-sm border ${isDarkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
          {successMessage}
        </div>
      )}

      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {['dashboard', 'today', 'calendar', 'reports'].map(t => (
          <TabButton key={t} active={activeTab === t} onClick={() => setActiveTab(t)} isDarkMode={isDarkMode}>
            {t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')}
          </TabButton>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((c, i) => (
                  <motion.div key={c.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    className={`rounded-2xl p-5 border shadow-sm ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
                    <div className={`p-2 rounded-xl w-fit mb-3 ${isDarkMode ? 'bg-white/5' : c.bg}`}><c.icon className={`w-5 h-5 ${c.color}`} /></div>
                    <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{c.value}</div>
                    <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{c.title} <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>({c.subtitle})</span></div>
                  </motion.div>
                ))}
              </div>
              <div className={`rounded-2xl border shadow-sm p-6 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
                <h3 className={`text-base font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Weekly Attendance Trend</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={weeklyData}>
                    <defs>
                      <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isDarkMode ? '#22d3ee' : '#3b82f6'} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={isDarkMode ? '#22d3ee' : '#3b82f6'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? 'rgba(148, 163, 184, 0.12)' : '#f1f5f9'} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: isDarkMode ? '#07131b' : '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="present" stroke={isDarkMode ? '#22d3ee' : '#3b82f6'} fill="url(#attGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="absent" stroke="#f87171" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'today' && (
            <div className="space-y-4">
              <div className={`flex items-center border rounded-xl px-3 py-2 w-full sm:w-80 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
                <Search className={`w-4 h-4 mr-2 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees..." className={`bg-transparent outline-none text-sm w-full ${isDarkMode ? 'text-slate-200 placeholder-slate-500' : 'text-gray-700 placeholder-gray-400'}`} />
              </div>
              <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
                <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                      <th className={`text-left px-5 py-3.5 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Employee</th>
                      <th className={`text-left px-5 py-3.5 text-xs font-semibold uppercase hidden md:table-cell ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Department</th>
                      <th className={`text-center px-5 py-3.5 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Check In</th>
                      <th className={`text-center px-5 py-3.5 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Check Out</th>
                      <th className={`text-center px-5 py-3.5 text-xs font-semibold uppercase hidden sm:table-cell ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Hours</th>
                      <th className={`text-center px-5 py-3.5 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Status</th>
                      <th className={`text-right px-5 py-3.5 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Action</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-gray-50'}`}>
                    {loading && (
                      <tr>
                        <td className={`px-5 py-6 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`} colSpan={7}>
                          Loading attendance data...
                        </td>
                      </tr>
                    )}
                    {!loading && filtered.length === 0 && (
                      <tr>
                        <td className={`px-5 py-6 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`} colSpan={7}>
                          No employees found.
                        </td>
                      </tr>
                    )}
                    {!loading && filtered.map(r => (
                      <tr key={r.id} className={`transition-colors group ${isDarkMode ? 'hover:bg-slate-900/60' : 'hover:bg-gray-50/50'}`}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-[10px] font-bold">
                              {r.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{r.name}</span>
                          </div>
                        </td>
                        <td className={`px-5 py-3.5 text-sm hidden md:table-cell ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{r.department}</td>
                        <td className={`px-5 py-3.5 text-sm text-center font-mono ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{r.checkIn}</td>
                        <td className={`px-5 py-3.5 text-sm text-center font-mono ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{r.checkOut}</td>
                        <td className={`px-5 py-3.5 text-sm text-center hidden sm:table-cell ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{r.hours}</td>
                        <td className="px-5 py-3.5 text-center"><StatusBadge status={r.status} isDarkMode={isDarkMode} /></td>
                        <td className="px-5 py-3.5 text-right">
                          <button onClick={() => navigate(`/dashboard/hr/attendance/${r.id}`)} className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${isDarkMode ? 'text-slate-500 hover:text-cyan-300 hover:bg-slate-800' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}>
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              isDarkMode={isDarkMode}
              currentMonth={calendarMonth}
              dayStatus={calendarDayStatus}
              onPrevMonth={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              onNextMonth={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            />
          )}

          {activeTab === 'reports' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reportCards.map((r, i) => (
                <motion.div key={r.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -4 }}
                  onClick={() => openReportModal(r.type)}
                  className={`rounded-2xl p-6 border shadow-sm hover:shadow-md transition-all cursor-pointer group ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${r.color} flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl transition-shadow`}>
                    <r.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className={`text-base font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{r.title}</h3>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{r.desc}</p>
                </motion.div>
              ))}
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {showMarkModal && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[1px] flex items-center justify-center p-4" onClick={closeMarkModal}>
          <div
            className={`w-full max-w-5xl rounded-2xl border shadow-2xl ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/15' : 'bg-white border-gray-200'}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`px-5 py-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <div>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Mark Attendance</h3>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Select status for each employee and save.</p>
              </div>
              <button
                onClick={closeMarkModal}
                className={`p-2 rounded-lg ${isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {markModalError && (
                <div className={`rounded-lg px-3 py-2 text-sm border ${isDarkMode ? 'bg-red-500/10 text-red-300 border-red-500/30' : 'bg-red-50 text-red-700 border-red-100'}`}>
                  {markModalError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <label className={`text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>Attendance Date</label>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(event) => setAttendanceDate(event.target.value)}
                  onClick={openNativePicker}
                  className={`px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'calendar-input-dark bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-gray-200 text-gray-700'}`}
                />
              </div>

              <div className={`rounded-xl border overflow-hidden ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                <div className="max-h-[420px] overflow-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                        <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Employee</th>
                        <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Department</th>
                        <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Status</th>
                        <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Check In</th>
                        <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Check Out</th>
                        <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-gray-50'}`}>
                      {markRows.map((row) => (
                        <tr key={row.employeeId}>
                          <td className={`px-4 py-3 text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{row.name}</td>
                          <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{row.department}</td>
                          <td className="px-4 py-3">
                            <select
                              value={row.status}
                              onChange={(event) => handleMarkRowChange(row.employeeId, 'status', event.target.value)}
                              className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-gray-200 text-gray-700'}`}
                            >
                              {STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="time"
                              value={row.checkInTime}
                              onChange={(event) => handleMarkRowChange(row.employeeId, 'checkInTime', event.target.value)}
                              className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'calendar-input-dark bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-gray-200 text-gray-700'}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="time"
                              value={row.checkOutTime}
                              onChange={(event) => handleMarkRowChange(row.employeeId, 'checkOutTime', event.target.value)}
                              className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'calendar-input-dark bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-gray-200 text-gray-700'}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={row.remarks}
                              onChange={(event) => handleMarkRowChange(row.employeeId, 'remarks', event.target.value)}
                              placeholder="Optional remarks"
                              className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-200 placeholder-slate-500' : 'bg-white border-gray-200 text-gray-700 placeholder-gray-400'}`}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={closeMarkModal}
                  className={`px-4 py-2 rounded-lg text-sm ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={saveAttendance}
                  disabled={saving || markRows.length === 0}
                  className={`px-4 py-2 rounded-lg text-sm text-white ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-900/50' : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300'} disabled:cursor-not-allowed`}
                >
                  {saving ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[1px] flex items-center justify-center p-4" onClick={() => setShowReportModal(false)}>
          <div
            className={`w-full max-w-5xl rounded-2xl border shadow-2xl ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/15' : 'bg-white border-gray-200'}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`px-5 py-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <div>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{reportData.title || 'Report'}</h3>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Live data from attendance database.</p>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className={`p-2 rounded-lg ${isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <label className={`text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>Month</label>
                <input
                  type="month"
                  value={reportMonth}
                  onChange={(event) => setReportMonth(event.target.value)}
                  onClick={openNativePicker}
                  className={`px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'calendar-input-dark bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-gray-200 text-gray-700'}`}
                />
                <button
                  onClick={refreshReportModal}
                  className={`px-4 py-2 rounded-lg text-sm text-white ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  Refresh
                </button>
              </div>

              {reportData.note && (
                <div className={`rounded-lg px-3 py-2 text-xs border ${isDarkMode ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                  {reportData.note}
                </div>
              )}

              <div className={`rounded-xl border overflow-hidden ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                <div className="max-h-[420px] overflow-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                        {reportData.columns.map((col) => (
                          <th key={col.key} className={`text-left px-4 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-gray-50'}`}>
                      {reportLoading && (
                        <tr>
                          <td className={`px-4 py-6 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`} colSpan={Math.max(1, reportData.columns.length)}>
                            Loading report data...
                          </td>
                        </tr>
                      )}
                      {!reportLoading && reportData.rows.length === 0 && (
                        <tr>
                          <td className={`px-4 py-6 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`} colSpan={Math.max(1, reportData.columns.length)}>
                            No data found for this report and month.
                          </td>
                        </tr>
                      )}
                      {!reportLoading && reportData.rows.map((row, index) => (
                        <tr key={`${index}-${row.id || row.employeeId || 'row'}`}>
                          {reportData.columns.map((col) => (
                            <td key={`${index}-${col.key}`} className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
                              {String(row[col.key] ?? '-')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePage;
