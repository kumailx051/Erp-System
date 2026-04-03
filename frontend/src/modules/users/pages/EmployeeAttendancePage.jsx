import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { CalendarCheck, Clock3, UserCheck, CalendarDays, X } from 'lucide-react';

const API_BASE = 'http://localhost:5000';

const statusClasses = (status, isDarkMode) => {
  const styles = {
    present: isDarkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    late: isDarkMode ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200',
    absent: isDarkMode ? 'bg-red-500/10 text-red-300 border-red-500/20' : 'bg-red-50 text-red-700 border-red-200',
    half_day: isDarkMode ? 'bg-orange-500/10 text-orange-300 border-orange-500/20' : 'bg-orange-50 text-orange-700 border-orange-200',
    on_leave: isDarkMode ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' : 'bg-blue-50 text-blue-700 border-blue-200',
    not_marked: isDarkMode ? 'bg-slate-700/30 text-slate-300 border-slate-600/40' : 'bg-gray-100 text-gray-600 border-gray-200'
  };

  return styles[status] || styles.not_marked;
};

const toStatusLabel = (status) => {
  if (!status || status === 'not_marked') return 'Not Marked';
  return String(status).replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const parseTimeMinutes = (value) => {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return (hours * 60) + minutes;
};

const formatTime12Hour = (value) => {
  const raw = String(value || '').trim();
  if (!raw || raw === '-') return '-';

  const match = raw.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (!match) return raw;

  const hours24 = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours24) || !Number.isInteger(minutes)) return raw;

  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
};

const getCurrentTimeString = () => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const EmployeeAttendancePage = () => {
  const navigate = useNavigate();
  const { isDarkMode = false } = useOutletContext() || {};
  const token = localStorage.getItem('erp_token');
  const [employeeId, setEmployeeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [todayStatus, setTodayStatus] = useState({
    status: 'not_marked',
    checkIn: '-',
    checkOut: '-',
    hours: '-',
    remarks: ''
  });
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [monthlySummary, setMonthlySummary] = useState({
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    onLeave: 0,
    totalDays: 0,
    avgHours: '-'
  });
  const [records, setRecords] = useState([]);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [markError, setMarkError] = useState('');
  const [markSuccess, setMarkSuccess] = useState('');
  const [marking, setMarking] = useState(false);
  const [markForm, setMarkForm] = useState({
    status: 'present',
    checkInTime: '',
    checkOutTime: '',
    remarks: ''
  });

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    const user = (() => {
      try {
        return JSON.parse(localStorage.getItem('erp_user') || '{}');
      } catch {
        return {};
      }
    })();

    if (!token || user?.role !== 'employee') {
      navigate('/login');
    }
  }, [navigate, token]);

  useEffect(() => {
    const loadAttendance = async () => {
      if (!token) return;

      try {
        setLoading(true);
        setError('');

        const statusResponse = await fetch(`${API_BASE}/api/hr/employees/my-profile/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const statusPayload = await statusResponse.json();

        if (!statusResponse.ok || !statusPayload?.success || !statusPayload?.data?.employeeId) {
          throw new Error(statusPayload?.message || 'Employee profile not found');
        }

        const id = Number(statusPayload.data.employeeId);
        setEmployeeId(id);

        const [todayResponse, monthlyResponse] = await Promise.all([
          fetch(`${API_BASE}/api/hr/attendance/employees?date=${today}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API_BASE}/api/hr/attendance/employees/${id}/details?month=${month}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const [todayPayload, monthlyPayload] = await Promise.all([
          todayResponse.json(),
          monthlyResponse.json()
        ]);

        if (!todayResponse.ok || !todayPayload?.success) {
          throw new Error(todayPayload?.message || 'Failed to load today attendance');
        }

        if (!monthlyResponse.ok || !monthlyPayload?.success) {
          throw new Error(monthlyPayload?.message || 'Failed to load monthly attendance');
        }

        const employeeRow = (todayPayload?.data?.employees || []).find((row) => Number(row.id) === id);
        setTodayStatus({
          status: employeeRow?.attendanceStatus || 'not_marked',
          checkIn: employeeRow?.checkInTime ? String(employeeRow.checkInTime).slice(0, 5) : '-',
          checkOut: employeeRow?.checkOutTime ? String(employeeRow.checkOutTime).slice(0, 5) : '-',
          hours: employeeRow?.workedHoursLabel || '-',
          remarks: employeeRow?.remarks || ''
        });

        setMonthlySummary(monthlyPayload?.data?.summary || {
          present: 0,
          absent: 0,
          late: 0,
          halfDay: 0,
          onLeave: 0,
          totalDays: 0,
          avgHours: '-'
        });

        setRecords(Array.isArray(monthlyPayload?.data?.records) ? monthlyPayload.data.records : []);
      } catch (loadError) {
        setError(loadError.message || 'Failed to load attendance');
      } finally {
        setLoading(false);
      }
    };

    loadAttendance();
  }, [token, month, today]);

  const summaryCards = [
    { label: 'Present', value: monthlySummary.present, icon: UserCheck, bg: 'bg-emerald-50', color: 'text-emerald-600' },
    { label: 'Late', value: monthlySummary.late, icon: Clock3, bg: 'bg-amber-50', color: 'text-amber-600' },
    { label: 'On Leave', value: monthlySummary.onLeave, icon: CalendarDays, bg: 'bg-blue-50', color: 'text-blue-600' },
    { label: 'Avg Hours', value: monthlySummary.avgHours || '-', icon: CalendarCheck, bg: 'bg-cyan-50', color: 'text-cyan-600' }
  ];

  const openMarkModal = () => {
    setMarkError('');
    setMarkSuccess('');
    setMarkForm({
      status: todayStatus.status && todayStatus.status !== 'not_marked' ? todayStatus.status : 'present',
      checkInTime: todayStatus.checkIn && todayStatus.checkIn !== '-' ? todayStatus.checkIn : '',
      checkOutTime: todayStatus.checkOut && todayStatus.checkOut !== '-' ? todayStatus.checkOut : '',
      remarks: todayStatus.remarks || ''
    });
    setShowMarkModal(true);
  };

  const handleCheckInNow = () => {
    setMarkError('');
    setMarkForm((prev) => ({
      ...prev,
      checkInTime: getCurrentTimeString()
    }));
  };

  const handleCheckOutNow = () => {
    setMarkError('');
    if (!markForm.checkInTime) {
      setMarkError('Please check in first, then check out.');
      return;
    }

    const nowTime = getCurrentTimeString();
    const checkInMinutes = parseTimeMinutes(markForm.checkInTime);
    const checkOutMinutes = parseTimeMinutes(nowTime);

    if (checkInMinutes !== null && checkOutMinutes !== null && checkOutMinutes <= checkInMinutes) {
      setMarkError('Check-out time must be later than check-in.');
      return;
    }

    setMarkForm((prev) => ({
      ...prev,
      checkOutTime: nowTime
    }));
  };

  const saveMyAttendance = async () => {
    if (!token || !employeeId) {
      setMarkError('Unable to identify employee profile.');
      return;
    }

    const checkInMinutes = markForm.checkInTime ? parseTimeMinutes(markForm.checkInTime) : null;
    const checkOutMinutes = markForm.checkOutTime ? parseTimeMinutes(markForm.checkOutTime) : null;

    if (markForm.checkInTime && checkInMinutes === null) {
      setMarkError('Check-in time must be valid HH:mm');
      return;
    }
    if (markForm.checkOutTime && checkOutMinutes === null) {
      setMarkError('Check-out time must be valid HH:mm');
      return;
    }
    if (checkOutMinutes !== null && checkInMinutes === null) {
      setMarkError('Check-in time is required before check-out');
      return;
    }
    if (checkInMinutes !== null && checkOutMinutes !== null && checkOutMinutes <= checkInMinutes) {
      setMarkError('Check-out time must be later than check-in');
      return;
    }

    try {
      setMarking(true);
      setMarkError('');

      const response = await fetch(`${API_BASE}/api/hr/attendance/mark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date: today,
          records: [
            {
              employeeId,
              status: markForm.status,
              checkInTime: markForm.checkInTime || null,
              checkOutTime: markForm.checkOutTime || null,
              remarks: markForm.remarks || ''
            }
          ]
        })
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to mark attendance');
      }

      setMarkSuccess('Attendance marked successfully.');
      setShowMarkModal(false);
      setMonth(new Date().toISOString().slice(0, 7));
      setError('');

      const statusResponse = await fetch(`${API_BASE}/api/hr/attendance/employees?date=${today}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const statusPayload = await statusResponse.json();
      if (statusResponse.ok && statusPayload?.success) {
        const employeeRow = (statusPayload?.data?.employees || []).find((row) => Number(row.id) === Number(employeeId));
        setTodayStatus({
          status: employeeRow?.attendanceStatus || 'not_marked',
          checkIn: employeeRow?.checkInTime ? String(employeeRow.checkInTime).slice(0, 5) : '-',
          checkOut: employeeRow?.checkOutTime ? String(employeeRow.checkOutTime).slice(0, 5) : '-',
          hours: employeeRow?.workedHoursLabel || '-',
          remarks: employeeRow?.remarks || ''
        });
      }

      const monthlyResponse = await fetch(`${API_BASE}/api/hr/attendance/employees/${employeeId}/details?month=${month}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const monthlyPayload = await monthlyResponse.json();
      if (monthlyResponse.ok && monthlyPayload?.success) {
        setMonthlySummary(monthlyPayload?.data?.summary || monthlySummary);
        setRecords(Array.isArray(monthlyPayload?.data?.records) ? monthlyPayload.data.records : []);
      }
    } catch (saveError) {
      setMarkError(saveError.message || 'Failed to mark attendance');
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>My Attendance</h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Track attendance records and mark your status for today.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={openMarkModal}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white self-start sm:self-auto ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-950/30' : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25'}`}
        >
          <CalendarCheck className="w-4 h-4" />
          Mark My Attendance
        </motion.button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-2xl p-6 lg:p-8 border ${
          isDarkMode
            ? 'bg-[linear-gradient(135deg,_rgba(34,211,238,0.16)_0%,_rgba(37,99,235,0.30)_45%,_rgba(6,182,212,0.24)_100%)] border-cyan-400/15 shadow-[0_10px_40px_rgba(8,21,31,0.32)]'
            : 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 border-blue-300/30'
        }`}
      >
        <div className="absolute top-0 right-0 w-52 h-52 bg-white/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
        <div className="relative z-10">
          <p className="text-sm text-white/85">Daily status is visible after saving. Use the top button to mark today attendance.</p>
        </div>
      </motion.div>

      {error && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {error}
        </div>
      )}

      {markSuccess && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {markSuccess}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className={`rounded-2xl border p-5 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10' : 'bg-white border-gray-100'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-white/5' : card.bg}`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <p className={`text-xs mt-3 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{card.label}</p>
            <p className={`text-xl font-bold mt-1 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4">
        <div className={`rounded-2xl border p-5 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between mb-4 gap-3">
            <h2 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Attendance History</h2>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className={`px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`}
            />
          </div>

          {loading ? (
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Loading attendance...</p>
          ) : records.length === 0 ? (
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>No attendance records found for this month.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                    <th className={`py-2 text-left text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Date</th>
                    <th className={`py-2 text-left text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Day</th>
                    <th className={`py-2 text-left text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Status</th>
                    <th className={`py-2 text-left text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Check In</th>
                    <th className={`py-2 text-left text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Check Out</th>
                    <th className={`py-2 text-left text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Hours</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-gray-100'}`}>
                  {records.map((row) => (
                    <tr key={`${row.date}-${row.day}`}>
                      <td className={`py-2.5 text-sm ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>{new Date(row.date).toLocaleDateString()}</td>
                      <td className={`py-2.5 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{row.day}</td>
                      <td className="py-2.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusClasses(row.status, isDarkMode)}`}>
                          {toStatusLabel(row.status)}
                        </span>
                      </td>
                      <td className={`py-2.5 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{formatTime12Hour(row.checkIn || '-')}</td>
                      <td className={`py-2.5 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{formatTime12Hour(row.checkOut || '-')}</td>
                      <td className={`py-2.5 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{row.hours || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={`rounded-2xl border p-5 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10' : 'bg-white border-gray-100'}`}>
          <h2 className={`text-base font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Today</h2>

          <div className={`rounded-xl border p-4 mb-3 ${statusClasses(todayStatus.status, isDarkMode)}`}>
            <p className="text-xs mb-1 opacity-80">Status</p>
            <p className="text-sm font-semibold">{toStatusLabel(todayStatus.status)}</p>
          </div>

          <div className="space-y-2.5">
            <div className={`flex items-center justify-between text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              <span>Check In</span>
              <span className="font-semibold">{formatTime12Hour(todayStatus.checkIn)}</span>
            </div>
            <div className={`flex items-center justify-between text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              <span>Check Out</span>
              <span className="font-semibold">{formatTime12Hour(todayStatus.checkOut)}</span>
            </div>
            <div className={`flex items-center justify-between text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              <span>Worked Hours</span>
              <span className="font-semibold">{todayStatus.hours}</span>
            </div>
            <div className={`flex items-center justify-between text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              <span>Employee ID</span>
              <span className="font-semibold">{employeeId || '--'}</span>
            </div>
          </div>

          {todayStatus.remarks && (
            <div className={`mt-4 rounded-lg border px-3 py-2 text-xs ${isDarkMode ? 'border-slate-700 bg-slate-900/70 text-slate-300' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
              Note: {todayStatus.remarks}
            </div>
          )}
        </div>
      </div>

      {showMarkModal && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[1px] flex items-center justify-center p-4" onClick={() => setShowMarkModal(false)}>
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/15' : 'bg-white border-gray-200'}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`px-5 py-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <div>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Mark My Attendance</h3>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Submit your attendance for today.</p>
              </div>
              <button
                onClick={() => setShowMarkModal(false)}
                className={`p-2 rounded-lg ${isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {markError && (
                <div className={`rounded-lg px-3 py-2 text-sm border ${isDarkMode ? 'bg-red-500/10 text-red-300 border-red-500/30' : 'bg-red-50 text-red-700 border-red-100'}`}>
                  {markError}
                </div>
              )}

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Status</label>
                <select
                  value={markForm.status}
                  onChange={(e) => setMarkForm((prev) => ({ ...prev, status: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                  <option value="half_day">Half Day</option>
                  <option value="on_leave">On Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={`rounded-xl border p-3 ${isDarkMode ? 'border-slate-700 bg-slate-900/60' : 'border-gray-200 bg-gray-50'}`}>
                  <p className={`text-xs font-semibold mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Check In</p>
                  <p className={`text-lg font-bold mb-3 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{markForm.checkInTime ? formatTime12Hour(markForm.checkInTime) : '--:--'}</p>
                  <button
                    type="button"
                    onClick={handleCheckInNow}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-semibold text-white ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    Check In Now
                  </button>
                </div>

                <div className={`rounded-xl border p-3 ${isDarkMode ? 'border-slate-700 bg-slate-900/60' : 'border-gray-200 bg-gray-50'}`}>
                  <p className={`text-xs font-semibold mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Check Out</p>
                  <p className={`text-lg font-bold mb-3 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{markForm.checkOutTime ? formatTime12Hour(markForm.checkOutTime) : '--:--'}</p>
                  <button
                    type="button"
                    onClick={handleCheckOutNow}
                    disabled={!markForm.checkInTime}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    Check Out Now
                  </button>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Remarks</label>
                <input
                  type="text"
                  value={markForm.remarks}
                  onChange={(e) => setMarkForm((prev) => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Optional remark"
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMarkModal(false)}
                  className={`px-4 py-2 rounded-lg text-sm ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveMyAttendance}
                  disabled={marking}
                  className={`px-4 py-2 rounded-lg text-sm text-white ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-900/50' : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300'} disabled:cursor-not-allowed`}
                >
                  {marking ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeAttendancePage;
