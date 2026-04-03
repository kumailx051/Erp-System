import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Search,
  Paperclip
} from 'lucide-react';

const API_BASE = 'http://localhost:5000';

const STATUS_STYLES = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200'
};

const getDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
};

const formatDate = (value) => {
  if (!value) return '--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const StatusBadge = ({ status, isDarkMode }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
      isDarkMode
        ? ({
            Pending: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
            Approved: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
            Rejected: 'bg-red-500/10 text-red-300 border-red-500/20'
          }[status] || 'bg-amber-500/10 text-amber-300 border-amber-500/20')
        : (STATUS_STYLES[status] || STATUS_STYLES.Pending)
    }`}
  >
    {status}
  </span>
);

const EmployeeLeavePage = () => {
  const { isDarkMode = false } = useOutletContext() || {};
  const token = localStorage.getItem('erp_token');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [employeeId, setEmployeeId] = useState(null);
  const [leaveBalances, setLeaveBalances] = useState({});
  const [query, setQuery] = useState('');

  const [form, setForm] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
    attachmentName: ''
  });

  const fetchLeaveData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError('');

      const statusRes = await fetch(`${API_BASE}/api/hr/employees/my-profile/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const statusPayload = await statusRes.json();

      if (!statusRes.ok || !statusPayload?.success || !statusPayload?.data?.employeeId) {
        throw new Error(statusPayload?.message || 'Employee profile is not linked yet');
      }

      const currentEmployeeId = statusPayload.data.employeeId;
      setEmployeeId(currentEmployeeId);

      const [employeeRes, leaveTypesRes, leavesRes] = await Promise.all([
        fetch(`${API_BASE}/api/hr/employees/${currentEmployeeId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/hr/leave-types`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/hr/leaves`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const employeePayload = await employeeRes.json();
      const leaveTypesPayload = await leaveTypesRes.json();
      const leavesPayload = await leavesRes.json();

      if (!employeeRes.ok || !employeePayload?.success) {
        throw new Error(employeePayload?.message || 'Failed to fetch employee details');
      }
      if (!leaveTypesRes.ok || !leaveTypesPayload?.success) {
        throw new Error(leaveTypesPayload?.message || 'Failed to fetch leave types');
      }
      if (!leavesRes.ok || !leavesPayload?.success) {
        throw new Error(leavesPayload?.message || 'Failed to fetch leaves');
      }

      setLeaveBalances(employeePayload?.data?.leaveBalances || {});
      setLeaveTypes(leaveTypesPayload?.data?.leaveTypes || []);
      setLeaves(leavesPayload?.data?.leaves || []);
    } catch (fetchError) {
      setError(fetchError.message || 'Failed to fetch leave information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, []);

  const leavesWithMeta = useMemo(() => {
    return leaves.map((leave) => ({
      ...leave,
      days: leave.totalDays || getDays(leave.startDate, leave.endDate),
      leaveType: leave.leaveTypeName
    }));
  }, [leaves]);

  const counts = useMemo(() => {
    const pending = leavesWithMeta.filter((leave) => leave.status === 'Pending').length;
    const approved = leavesWithMeta.filter((leave) => leave.status === 'Approved').length;
    const rejected = leavesWithMeta.filter((leave) => leave.status === 'Rejected').length;

    return {
      total: leavesWithMeta.length,
      pending,
      approved,
      rejected
    };
  }, [leavesWithMeta]);

  const filteredLeaves = useMemo(() => {
    const lower = query.toLowerCase().trim();
    if (!lower) return leavesWithMeta;

    return leavesWithMeta.filter((leave) => {
      return (
        String(leave?.leaveCode || '').toLowerCase().includes(lower)
        || String(leave?.leaveType || '').toLowerCase().includes(lower)
        || String(leave?.status || '').toLowerCase().includes(lower)
      );
    });
  }, [leavesWithMeta, query]);

  const formDays = getDays(form.startDate, form.endDate);

  const getEmployeeBalance = () => {
    if (!form.leaveTypeId) return null;
    const key = String(form.leaveTypeId);
    return leaveBalances?.[key];
  };

  const getMinDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString().split('T')[0];
  };

  const getMaxEndDate = () => {
    if (!form.startDate) return null;
    const balance = getEmployeeBalance();
    if (balance === null || balance === undefined) return null;

    const availableBalance = Number(balance);
    if (availableBalance <= 0) return form.startDate;

    const start = new Date(form.startDate);
    const maxDate = new Date(start);
    maxDate.setDate(maxDate.getDate() + availableBalance - 1);
    return maxDate.toISOString().split('T')[0];
  };

  const isStartDateValid = () => {
    if (!form.startDate) return false;
    const selectedStart = new Date(form.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedStart >= today;
  };

  const isEndDateBeforeStartDate = () => {
    if (!form.startDate || !form.endDate) return false;
    return new Date(form.endDate) < new Date(form.startDate);
  };

  const isEndDateValid = () => {
    if (!form.startDate || !form.endDate) return true;

    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (end < start) return false;

    const maxEnd = getMaxEndDate();
    if (!maxEnd) return true;
    return end <= new Date(maxEnd);
  };

  const hasBalance = () => {
    const balance = getEmployeeBalance();
    if (balance === null || balance === undefined) return true;
    return Number(balance) > 0;
  };

  const isFormValid = () => {
    if (!form.leaveTypeId || !form.startDate || !form.endDate || !form.reason.trim()) return false;
    if (!isStartDateValid()) return false;
    if (!isEndDateValid()) return false;
    if (!hasBalance()) return false;
    return formDays > 0;
  };

  const resetForm = () => {
    setForm({
      leaveTypeId: '',
      startDate: '',
      endDate: '',
      reason: '',
      attachmentName: ''
    });
  };

  const handleAttachment = (event) => {
    const file = event.target.files?.[0];
    setForm((prev) => ({ ...prev, attachmentName: file?.name || '' }));
  };

  const handleCreateLeave = async (event) => {
    event.preventDefault();

    if (!token || !employeeId || !isFormValid()) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const response = await fetch(`${API_BASE}/api/hr/leaves`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          employeeId,
          leaveTypeId: Number(form.leaveTypeId),
          startDate: form.startDate,
          endDate: form.endDate,
          reason: form.reason.trim(),
          attachmentName: form.attachmentName || null
        })
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to submit leave request');
      }

      setMessage('Leave request submitted successfully. HR will review it soon.');
      resetForm();
      await fetchLeaveData();
    } catch (saveError) {
      setError(saveError.message || 'Failed to submit leave request');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>My Leaves</h1>
        <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          Apply for leave, track request status, and view your available leave balance.
        </p>
      </div>

      {error && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {error}
        </div>
      )}
      {message && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: counts.total, icon: CalendarDays, tone: 'text-blue-600 bg-blue-50' },
          { label: 'Pending', value: counts.pending, icon: Clock, tone: 'text-amber-600 bg-amber-50' },
          { label: 'Approved', value: counts.approved, icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50' },
          { label: 'Rejected', value: counts.rejected, icon: XCircle, tone: 'text-red-600 bg-red-50' }
        ].map((card) => (
          <div key={card.label} className={`rounded-2xl border shadow-sm p-5 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${isDarkMode ? 'bg-white/5 text-cyan-300' : card.tone}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{card.value}</div>
            <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-5">
        <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
          <div className={`px-5 py-4 border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
            <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>My Leave Balance</h3>
          </div>

          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {leaveTypes.map((type) => {
              const balanceValue = leaveBalances?.[String(type.id)];
              const balance = balanceValue === null || balanceValue === undefined
                ? (type.daysPerYear ?? '--')
                : balanceValue;

              return (
                <div key={type.id} className={`rounded-xl border p-3 ${isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-gray-100 bg-gray-50'}`}>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{type.name}</p>
                  <p className={`text-xl font-semibold mt-1 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{balance}</p>
                  <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>days available</p>
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleCreateLeave} className={`rounded-2xl border shadow-sm p-5 space-y-4 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
          <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Apply for Leave</h3>

          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Leave Type</label>
            <select
              value={form.leaveTypeId}
              onChange={(event) => setForm((prev) => ({ ...prev, leaveTypeId: event.target.value }))}
              className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 focus:ring-cyan-400/20 focus:border-cyan-400' : 'border-gray-200 text-gray-700 focus:ring-blue-500/20 focus:border-blue-400'}`}
              required
            >
              <option value="">Select leave type</option>
              {leaveTypes.map((type) => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Start Date</label>
              <input
                type="date"
                min={getMinDate()}
                value={form.startDate}
                onChange={(event) => {
                  const nextStartDate = event.target.value;
                  setForm((prev) => ({
                    ...prev,
                    startDate: nextStartDate,
                    endDate: prev.endDate && new Date(prev.endDate) < new Date(nextStartDate)
                      ? nextStartDate
                      : prev.endDate
                  }));
                }}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 focus:ring-cyan-400/20 focus:border-cyan-400' : 'border-gray-200 text-gray-700 focus:ring-blue-500/20 focus:border-blue-400'}`}
                required
              />
              {form.startDate && !isStartDateValid() && (
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                  Start date cannot be in the past.
                </p>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>End Date</label>
              <input
                type="date"
                min={form.startDate || getMinDate()}
                max={getMaxEndDate()}
                value={form.endDate}
                onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 focus:ring-cyan-400/20 focus:border-cyan-400' : 'border-gray-200 text-gray-700 focus:ring-blue-500/20 focus:border-blue-400'}`}
                required
              />
              {form.endDate && form.startDate && isEndDateBeforeStartDate() && (
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                  End date must be the same as start date or a future date.
                </p>
              )}
            </div>
          </div>

          {!hasBalance() && form.leaveTypeId && (
            <p className={`text-xs ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
              You have no available balance for this leave type.
            </p>
          )}

          {form.endDate && form.startDate && !isEndDateValid() && (
            <p className={`text-xs ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
              Selected date range exceeds your available leave balance.
            </p>
          )}

          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Reason</label>
            <textarea
              rows={3}
              value={form.reason}
              onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
              placeholder="Write a short reason"
              className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 resize-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-cyan-400/20 focus:border-cyan-400' : 'border-gray-200 text-gray-700 focus:ring-blue-500/20 focus:border-blue-400'}`}
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Attachment (Optional)</label>
            <label className={`w-full inline-flex items-center gap-2 px-3.5 py-2.5 border rounded-xl text-sm cursor-pointer ${isDarkMode ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <Paperclip className={`w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
              <span className="truncate">{form.attachmentName || 'Upload file'}</span>
              <input type="file" className="hidden" onChange={handleAttachment} />
            </label>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              Duration: <span className={`font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{formDays > 0 ? `${formDays} day${formDays > 1 ? 's' : ''}` : '--'}</span>
            </p>
            <button
              type="submit"
              disabled={saving || !isFormValid()}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold ${!isFormValid() ? (isDarkMode ? 'bg-gray-600 cursor-not-allowed' : 'bg-gray-400 cursor-not-allowed') : (isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-950/30' : 'bg-blue-600 hover:bg-blue-700')}`}
            >
              <Send className="w-4 h-4" />
              {saving ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>

      <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
        <div className={`px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
          <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>My Leave Requests</h3>
          <div className={`flex items-center border rounded-xl px-3 py-2 w-full sm:w-72 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
            <Search className={`w-4 h-4 mr-2 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by code, type, status"
              className={`bg-transparent text-sm focus:outline-none w-full ${isDarkMode ? 'text-slate-200 placeholder-slate-500' : 'text-gray-700 placeholder-gray-400'}`}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Request</th>
                <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Leave Type</th>
                <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Dates</th>
                <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Days</th>
                <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-gray-50'}`}>
              {!loading && filteredLeaves.length === 0 && (
                <tr>
                  <td colSpan={5} className={`px-5 py-8 text-center text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    No leave requests found.
                  </td>
                </tr>
              )}

              {filteredLeaves.map((leave) => (
                <tr key={leave.id} className={isDarkMode ? 'hover:bg-slate-900/60' : 'hover:bg-gray-50/50'}>
                  <td className="px-5 py-3.5">
                    <div>
                      <div className={`text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{leave.leaveCode || leave.id}</div>
                      <div className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{formatDate(leave.startDate)}</div>
                    </div>
                  </td>
                  <td className={`px-5 py-3.5 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{leave.leaveType}</td>
                  <td className={`px-5 py-3.5 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{formatDate(leave.startDate)} - {formatDate(leave.endDate)}</td>
                  <td className={`px-5 py-3.5 text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{leave.days}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={leave.status} isDarkMode={isDarkMode} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EmployeeLeavePage;
