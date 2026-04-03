import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const API_BASE = 'http://localhost:5000';

const LEAVE_STYLES = {
  'My Leave': {
    badge: 'bg-blue-100 text-blue-700',
    softLight: 'bg-blue-50 border border-blue-200',
    softDark: 'bg-blue-500/10 border border-blue-500/20',
    dot: 'bg-blue-400',
  },
  'Team Leave': {
    badge: 'bg-violet-100 text-violet-700',
    softLight: 'bg-violet-50 border border-violet-200',
    softDark: 'bg-violet-500/10 border border-violet-500/20',
    dot: 'bg-violet-400',
  },
  Holiday: {
    badge: 'bg-amber-100 text-amber-700',
    softLight: 'bg-amber-50 border border-amber-200',
    softDark: 'bg-amber-500/10 border border-amber-500/20',
    dot: 'bg-amber-400',
  },
};

const PAKISTAN_PUBLIC_HOLIDAYS = [
  { name: 'Kashmir Day', start: { month: 2, day: 5 }, end: { month: 2, day: 5 } },
  { name: 'Eid-ul-Fitr', start: { month: 3, day: 21 }, end: { month: 3, day: 23 } },
  { name: 'Pakistan Day', start: { month: 3, day: 23 }, end: { month: 3, day: 23 } },
  { name: 'Labour Day', start: { month: 5, day: 1 }, end: { month: 5, day: 1 } },
  { name: 'Eid-ul-Adha', start: { month: 5, day: 27 }, end: { month: 5, day: 29 } },
  { name: 'Youm-e-Takbeer', start: { month: 5, day: 28 }, end: { month: 5, day: 28 } },
  { name: 'Ashura', start: { month: 6, day: 24 }, end: { month: 6, day: 25 } },
  { name: 'Independence Day', start: { month: 8, day: 14 }, end: { month: 8, day: 14 } },
  { name: 'Eid Milad-un-Nabi', start: { month: 8, day: 25 }, end: { month: 8, day: 25 } },
  { name: 'Iqbal Day', start: { month: 11, day: 9 }, end: { month: 11, day: 9 } },
  { name: 'Quaid-e-Azam Day', start: { month: 12, day: 25 }, end: { month: 12, day: 25 } },
];

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getLeaveStyle = (key) => LEAVE_STYLES[key] || {
  badge: 'bg-slate-100 text-slate-700',
  softLight: 'bg-slate-50 border border-slate-200',
  softDark: 'bg-slate-500/10 border border-slate-500/20',
  dot: 'bg-slate-400',
};

const formatDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const shortName = (fullName) => {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Team';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1].charAt(0)}.`;
};

const getHolidayInfoForDate = (year, monthIndex, day) => {
  const current = new Date(year, monthIndex, day);
  const matchedNames = [];

  PAKISTAN_PUBLIC_HOLIDAYS.forEach((holiday) => {
    const start = new Date(year, holiday.start.month - 1, holiday.start.day);
    const end = new Date(year, holiday.end.month - 1, holiday.end.day);

    if (current >= start && current <= end) {
      matchedNames.push(holiday.name);
    }
  });

  if (matchedNames.length === 0) return null;

  return {
    name: matchedNames.join(' / '),
    shortLabel: matchedNames[0].split(' ')[0],
  };
};

const LeaveCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [view, setView] = useState('all');
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isDarkMode = false } = useOutletContext() || {};

  const token = localStorage.getItem('erp_token');
  const user = JSON.parse(localStorage.getItem('erp_user') || '{}');

  useEffect(() => {
    const fetchLeaves = async () => {
      if (!token) {
        setLeaves([]);
        setLoading(false);
        setError('Authentication required to load calendar data');
        return;
      }

      try {
        setLoading(true);
        setError('');

        const response = await fetch(`${API_BASE}/api/hr/leaves`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || 'Failed to fetch leave calendar data');
        }

        const mappedLeaves = (payload?.data?.leaves || []).map((item) => ({
          id: item.id,
          employeeName: item.employeeName,
          leaveTypeName: item.leaveTypeName,
          startDate: item.startDate,
          endDate: item.endDate,
          totalDays: item.totalDays,
          status: String(item.status || '').toLowerCase(),
          isMine: String(item.employeeName || '').toLowerCase() === String(user?.name || '').toLowerCase(),
        }));

        setLeaves(mappedLeaves);
      } catch (fetchError) {
        setError(fetchError.message || 'Failed to load calendar data');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaves();
  }, [token, user?.name]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const totalCells = 42;
  const trailingCells = totalCells - firstDay - daysInMonth;

  const todayDate = new Date();
  const isCurrentMonth = todayDate.getFullYear() === year && todayDate.getMonth() === month;
  const todayDay = isCurrentMonth ? todayDate.getDate() : -1;

  const isWeekend = (day) => [0, 6].includes(new Date(year, month, day).getDay());

  const calendarEventsByDay = useMemo(() => {
    const map = {};

    const activeLeaves = leaves.filter((leave) => leave.status !== 'rejected');

    activeLeaves.forEach((leave) => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;

      const cursor = new Date(start);
      while (cursor <= end) {
        if (cursor.getFullYear() === year && cursor.getMonth() === month) {
          const day = cursor.getDate();
          if (!map[day]) map[day] = [];

          map[day].push({
            key: leave.isMine ? 'My Leave' : 'Team Leave',
            name: leave.isMine ? 'My Leave' : shortName(leave.employeeName),
            employeeName: leave.employeeName,
            leaveTypeName: leave.leaveTypeName,
          });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    });

    return map;
  }, [leaves, year, month]);

  const visibleLeaves = (day) => {
    const all = calendarEventsByDay[day] || [];
    if (view === 'all') return all;
    if (view === 'mine') return all.filter((l) => l.key === 'My Leave');
    if (view === 'team') return all.filter((l) => l.key === 'Team Leave');
    if (view === 'holidays') return all.filter((l) => l.key === 'Holiday');
    return all;
  };

  const upcomingLeaves = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return leaves
      .filter((leave) => leave.status !== 'rejected')
      .filter((leave) => {
        const end = new Date(leave.endDate);
        end.setHours(0, 0, 0, 0);
        return end >= today;
      })
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
      .slice(0, 8);
  }, [leaves]);

  return (
    <div className="space-y-6">
      <div>
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Leave Calendar</h1>
          <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Team leaves and company holidays at a glance</p>
        </div>
      </div>

      {error && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
            className={`p-2 rounded-lg border transition-colors ${isDarkMode ? 'hover:bg-slate-800 border-slate-700' : 'hover:bg-gray-100 border-gray-200'}`}
          >
            <ChevronLeft className={`w-4 h-4 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`} />
          </button>
          <span className={`text-base font-semibold min-w-[160px] text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {monthNames[month]} {year}
          </span>
          <button
            onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
            className={`p-2 rounded-lg border transition-colors ${isDarkMode ? 'hover:bg-slate-800 border-slate-700' : 'hover:bg-gray-100 border-gray-200'}`}
          >
            <ChevronRight className={`w-4 h-4 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`} />
          </button>
        </div>

        <div className={`flex items-center gap-1 rounded-xl p-1 ${isDarkMode ? 'bg-slate-900' : 'bg-gray-100'}`}>
          {[
            { key: 'all', label: 'All' },
            { key: 'mine', label: 'My Leaves' },
            { key: 'team', label: 'Team' },
            { key: 'holidays', label: 'Holidays' },
          ].map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${view === v.key ? (isDarkMode ? 'bg-slate-800 text-slate-100 shadow-sm' : 'bg-white text-gray-900 shadow-sm') : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700')}`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`rounded-2xl border shadow-sm p-4 sm:p-6 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
        <div className="flex flex-wrap gap-3 mb-5">
          {[
            { color: 'bg-blue-100', label: 'My Leave' },
            { color: 'bg-violet-100', label: 'Team Leave' },
            { color: 'bg-amber-100', label: 'Holiday' },
            { color: 'bg-gray-100', label: 'Weekend' },
          ].map((l) => (
            <div key={l.label} className={`flex items-center gap-1.5 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              <div className={`w-3 h-3 rounded-sm ${l.color}`} />
              {l.label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 mb-1">
          {dayNames.map((d) => (
            <div key={d} className={`text-center text-xs font-semibold py-2 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {[...Array(firstDay)].map((_, i) => <div key={`e${i}`} />)}
          {[...Array(daysInMonth)].map((_, i) => {
            const day = i + 1;
            const weekend = isWeekend(day);
            const today = day === todayDay;
            const holiday = getHolidayInfoForDate(year, month, day);
            const leavesForDay = visibleLeaves(day);

            return (
              <motion.div
                key={day}
                whileHover={{ scale: 1.04 }}
                className={`relative rounded-xl p-1.5 min-h-[52px] sm:min-h-[72px] cursor-pointer transition-colors
                  ${today ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : ''}
                  ${!today && holiday && !leavesForDay.length ? (isDarkMode ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200') : ''}
                  ${!today && !holiday && weekend ? (isDarkMode ? 'bg-slate-900' : 'bg-gray-50') : ''}
                  ${!today && !holiday && !weekend && !leavesForDay.length ? (isDarkMode ? 'hover:bg-slate-900/70' : 'hover:bg-gray-50') : ''}
                  ${!today && leavesForDay.length && !holiday ? (isDarkMode ? getLeaveStyle(leavesForDay[0].key).softDark : getLeaveStyle(leavesForDay[0].key).softLight) : ''}
                `}
              >
                <div className={`text-xs font-semibold mb-1 ${today ? 'text-white' : weekend ? (isDarkMode ? 'text-slate-600' : 'text-gray-300') : (isDarkMode ? 'text-slate-200' : 'text-gray-700')}`}>
                  {day}
                </div>
                {holiday && !today && (
                  <div className={`hidden sm:block text-[9px] font-medium leading-tight truncate ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                    {holiday.shortLabel}
                  </div>
                )}
                <div className="space-y-0.5 hidden sm:block">
                  {leavesForDay.slice(0, 2).map((l, li) => (
                    <div
                      key={li}
                      title={`${l.employeeName} (${l.leaveTypeName})`}
                      className={`text-[9px] font-medium px-1 py-0.5 rounded truncate ${today ? 'bg-white/20 text-white' : getLeaveStyle(l.key).badge}`}
                    >
                      {l.name}
                    </div>
                  ))}
                  {leavesForDay.length > 2 && (
                    <div className={`text-[9px] pl-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>+{leavesForDay.length - 2}</div>
                  )}
                </div>
                {leavesForDay.length > 0 && !today && (
                  <div className={`sm:hidden w-1.5 h-1.5 rounded-full mx-auto mt-0.5 ${getLeaveStyle(leavesForDay[0].key).dot}`} />
                )}
              </motion.div>
            );
          })}
          {[...Array(trailingCells)].map((_, i) => <div key={`t${i}`} />)}
        </div>

        {loading && (
          <div className={`text-xs mt-3 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Loading leave data...</div>
        )}
      </div>

      <div className={`rounded-2xl border shadow-sm p-6 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
        <h3 className={`text-base font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Upcoming Leaves</h3>
        <div className="space-y-3">
          {upcomingLeaves.length === 0 && (
            <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>No upcoming leaves found.</div>
          )}

          {upcomingLeaves.map((item, i) => (
            <motion.div
              key={`${item.id}-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`flex items-center gap-3 p-3 rounded-xl transition-colors border ${isDarkMode ? 'hover:bg-slate-900 border-slate-800' : 'hover:bg-gray-50 border-gray-100'}`}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {item.employeeName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{item.employeeName}</div>
                <div className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{formatDate(item.startDate)} {' -> '} {formatDate(item.endDate)} {item.totalDays} day{item.totalDays > 1 ? 's' : ''}</div>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${getLeaveStyle(item.isMine ? 'My Leave' : 'Team Leave').badge}`}>
                {item.leaveTypeName}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeaveCalendar;
