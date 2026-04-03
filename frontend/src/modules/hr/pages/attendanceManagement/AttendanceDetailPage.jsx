import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Clock, CheckCircle, XCircle,
  AlertTriangle, FileText, ChevronLeft, ChevronRight
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'on_leave', label: 'On Leave' }
];

const StatusBadge = ({ status, isDarkMode }) => {
  const s = {
    present: isDarkMode ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-50 text-emerald-700', late: isDarkMode ? 'bg-amber-500/10 text-amber-300' : 'bg-amber-50 text-amber-700',
    absent: isDarkMode ? 'bg-red-500/10 text-red-300' : 'bg-red-50 text-red-700', half_day: isDarkMode ? 'bg-orange-500/10 text-orange-300' : 'bg-orange-50 text-orange-700',
    on_leave: isDarkMode ? 'bg-cyan-500/10 text-cyan-300' : 'bg-blue-50 text-blue-700',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${s[status] || s.absent}`}>
      {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
    </span>
  );
};

function toMonthString(dateValue) {
  return dateValue.toISOString().slice(0, 7);
}

function toMonthTitle(monthString) {
  const [yearPart, monthPart] = monthString.split('-');
  const date = new Date(Date.UTC(Number(yearPart), Number(monthPart) - 1, 1));
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function shiftMonth(monthString, delta) {
  const [yearPart, monthPart] = monthString.split('-');
  const date = new Date(Date.UTC(Number(yearPart), Number(monthPart) - 1 + delta, 1));
  return toMonthString(date);
}

const AttendanceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDarkMode = false } = useOutletContext() || {};
  const token = localStorage.getItem('erp_token');

  const [month, setMonth] = useState(() => toMonthString(new Date()));
  const [employee, setEmployee] = useState({ fullName: 'Employee', department: '-', designation: '-' });
  const [monthlyData, setMonthlyData] = useState([]);
  const [summary, setSummary] = useState({ present: 0, absent: 0, late: 0, halfDay: 0, avgHours: '-', totalDays: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [showRegForm, setShowRegForm] = useState(false);
  const [regDate, setRegDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [regStatus, setRegStatus] = useState('present');
  const [regReason, setRegReason] = useState('');
  const [savingRegularization, setSavingRegularization] = useState(false);

  const openNativePicker = (event) => {
    if (typeof event.currentTarget.showPicker === 'function') {
      event.currentTarget.showPicker();
    }
  };

  const monthLabel = useMemo(() => toMonthTitle(month), [month]);

  const fetchDetails = async () => {
    if (!token) {
      setErrorMessage('Login session missing. Please login again.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');

      const response = await fetch(`http://localhost:5000/api/hr/attendance/employees/${id}/details?month=${month}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to load attendance details');
      }

      setEmployee(payload?.data?.employee || { fullName: 'Employee', department: '-', designation: '-' });
      setMonthlyData(Array.isArray(payload?.data?.records) ? payload.data.records : []);
      setSummary(payload?.data?.summary || { present: 0, absent: 0, late: 0, halfDay: 0, avgHours: '-', totalDays: 0 });
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load attendance details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id, month]);

  const submitRegularization = async () => {
    if (!token) {
      setErrorMessage('Login session missing. Please login again.');
      return;
    }

    try {
      setSavingRegularization(true);
      setErrorMessage('');

      const response = await fetch('http://localhost:5000/api/hr/attendance/mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date: regDate,
          records: [
            {
              employeeId: Number(id),
              status: regStatus,
              remarks: regReason || ''
            }
          ]
        })
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to submit regularization');
      }

      setShowRegForm(false);
      setRegReason('');
      setSuccessMessage('Regularization saved successfully.');
      await fetchDetails();
    } catch (error) {
      setErrorMessage(error.message || 'Failed to submit regularization');
    } finally {
      setSavingRegularization(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button onClick={() => navigate(-1)} className={`p-2 rounded-xl ${isDarkMode ? 'text-slate-500 hover:text-slate-200 hover:bg-slate-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{employee.fullName}</h1>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{employee.department} · {employee.designation}</p>
        </div>
        <button onClick={() => setShowRegForm(true)}
          className={`flex items-center space-x-2 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isDarkMode ? 'bg-cyan-600 shadow-lg shadow-cyan-950/30 hover:bg-cyan-500' : 'bg-blue-600 shadow-lg shadow-blue-500/25 hover:bg-blue-700'}`}>
          <FileText className="w-4 h-4" /><span>Regularize</span>
        </button>
      </div>

      {errorMessage && (
        <div className={`rounded-xl px-4 py-2.5 text-sm border ${isDarkMode ? 'bg-red-500/10 text-red-300 border-red-500/30' : 'bg-red-50 text-red-700 border-red-100'}`}>
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className={`rounded-xl px-4 py-2.5 text-sm border ${isDarkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
          {successMessage}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Present', val: summary.present, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Absent', val: summary.absent, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Late', val: summary.late, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Half Day', val: summary.halfDay, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Avg Hours', val: summary.avgHours, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Work Days', val: summary.totalDays, icon: Calendar, color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`rounded-xl p-4 border shadow-sm text-center ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
            <div className={`p-1.5 rounded-lg w-fit mx-auto mb-2 ${isDarkMode ? 'bg-white/5' : c.bg}`}><c.icon className={`w-4 h-4 ${c.color}`} /></div>
            <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{c.val}</div>
            <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{c.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Records Table */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
        <div className={`px-5 py-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
          <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Attendance Log — {monthLabel}</h3>
          <div className="flex items-center space-x-1">
            <button onClick={() => setMonth((prev) => shiftMonth(prev, -1))} className={`p-1.5 rounded-lg ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}><ChevronLeft className={`w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} /></button>
            <button onClick={() => setMonth((prev) => shiftMonth(prev, 1))} className={`p-1.5 rounded-lg ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}><ChevronRight className={`w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} /></button>
          </div>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Date</th>
              <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Day</th>
              <th className={`text-center px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Check In</th>
              <th className={`text-center px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Check Out</th>
              <th className={`text-center px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Hours</th>
              <th className={`text-center px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Status</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-gray-50'}`}>
            {loading && (
              <tr>
                <td className={`px-5 py-6 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`} colSpan={6}>
                  Loading attendance records...
                </td>
              </tr>
            )}
            {!loading && monthlyData.length === 0 && (
              <tr>
                <td className={`px-5 py-6 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`} colSpan={6}>
                  No attendance records found for this month.
                </td>
              </tr>
            )}
            {!loading && monthlyData.map((r) => (
              <tr key={r.date} className={`transition-colors ${isDarkMode ? 'hover:bg-slate-900/60' : 'hover:bg-gray-50/50'}`}>
                <td className={`px-5 py-3 text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>{r.date}</td>
                <td className={`px-5 py-3 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{r.day}</td>
                <td className={`px-5 py-3 text-sm text-center font-mono ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{r.checkIn}</td>
                <td className={`px-5 py-3 text-sm text-center font-mono ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{r.checkOut}</td>
                <td className={`px-5 py-3 text-sm text-center ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{r.hours}</td>
                <td className="px-5 py-3 text-center"><StatusBadge status={r.status} isDarkMode={isDarkMode} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Regularization Modal */}
      {showRegForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowRegForm(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className={`rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl ${isDarkMode ? 'bg-[#0d2230] border border-cyan-400/10' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Attendance Regularization</h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Date</label>
                <input value={regDate} onChange={(e) => setRegDate(e.target.value)} onClick={openNativePicker} type="date" className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 ${isDarkMode ? 'calendar-input-dark bg-slate-900 border-slate-700 text-slate-100 focus:ring-cyan-400/20 focus:border-cyan-400' : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'}`} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Status</label>
                <select value={regStatus} onChange={(e) => setRegStatus(e.target.value)} className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 focus:ring-cyan-400/20 focus:border-cyan-400' : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'}`}>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Reason</label>
                <textarea value={regReason} onChange={(e) => setRegReason(e.target.value)} rows={3} placeholder="Enter reason for regularization..."
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-cyan-400/20 focus:border-cyan-400' : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'}`} />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button onClick={() => setShowRegForm(false)} className={`px-4 py-2 text-sm rounded-xl ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}>Cancel</button>
                <button disabled={savingRegularization} onClick={submitRegularization} className={`px-4 py-2 text-white text-sm font-medium rounded-xl disabled:opacity-60 ${isDarkMode ? 'bg-cyan-600 shadow-lg shadow-cyan-950/30 hover:bg-cyan-500' : 'bg-blue-600 shadow-lg shadow-blue-500/25 hover:bg-blue-700'}`}>{savingRegularization ? 'Saving...' : 'Submit'}</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AttendanceDetailPage;
