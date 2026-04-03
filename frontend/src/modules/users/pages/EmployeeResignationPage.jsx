import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { UserMinus, CalendarDays, Clock, CheckCircle2, XCircle, Send, Search, Paperclip } from 'lucide-react';

const API_BASE = 'http://localhost:5000';

const STATUS_STYLES = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
  Withdrawn: 'bg-slate-50 text-slate-700 border-slate-200'
};

const formatDate = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const stageLabel = (value) => {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || '--';
};

const StatusBadge = ({ status, isDarkMode }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
      isDarkMode
        ? ({
            Pending: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
            Approved: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
            Rejected: 'bg-red-500/10 text-red-300 border-red-500/20',
            Withdrawn: 'bg-slate-500/10 text-slate-300 border-slate-500/20'
          }[status] || 'bg-slate-500/10 text-slate-300 border-slate-500/20')
        : (STATUS_STYLES[status] || STATUS_STYLES.Pending)
    }`}
  >
    {status}
  </span>
);

const EmployeeResignationPage = () => {
  const { isDarkMode = false } = useOutletContext() || {};
  const token = localStorage.getItem('erp_token');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    lastDay: '',
    reason: '',
    attachmentName: ''
  });

  const fetchExitRecords = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_BASE}/api/hr/exits`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to fetch resignation records');
      }

      setRecords(payload?.data?.records || []);
    } catch (fetchError) {
      setError(fetchError.message || 'Failed to fetch resignation records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExitRecords();

    const intervalId = window.setInterval(() => {
      fetchExitRecords();
    }, 8000);

    const handleFocus = () => fetchExitRecords();
    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const summary = useMemo(() => {
    const pending = records.filter((item) => item.status === 'Pending').length;
    const approved = records.filter((item) => item.status === 'Approved').length;
    const rejected = records.filter((item) => item.status === 'Rejected').length;

    return {
      total: records.length,
      pending,
      approved,
      rejected
    };
  }, [records]);

  const workflowSteps = ['approvals', 'clearance', 'exit interviews', 'completed'];

  const filteredRecords = useMemo(() => {
    const lower = query.toLowerCase().trim();
    if (!lower) return records;

    return records.filter((item) => {
      const text = `${item.exitCode} ${item.exitType} ${item.status} ${item.stage}`.toLowerCase();
      return text.includes(lower);
    });
  }, [records, query]);

  const getMinDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString().split('T')[0];
  };

  const isFormValid = () => {
    if (!form.lastDay || !form.reason.trim()) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(form.lastDay) >= today;
  };

  const handleAttachment = (event) => {
    const file = event.target.files?.[0];
    setForm((prev) => ({ ...prev, attachmentName: file?.name || '' }));
  };

  const submitResignation = async (event) => {
    event.preventDefault();
    if (!token || !isFormValid()) return;

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const response = await fetch(`${API_BASE}/api/hr/exits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          exitType: 'resignation',
          lastDay: form.lastDay,
          reason: form.reason.trim(),
          attachmentName: form.attachmentName || null
        })
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to submit resignation');
      }

      setMessage('Resignation submitted successfully. HR will review your request.');
      setForm({ lastDay: '', reason: '', attachmentName: '' });
      await fetchExitRecords();
    } catch (submitError) {
      setError(submitError.message || 'Failed to submit resignation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Resignation</h1>
        <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Submit resignation and track workflow progress from HR.</p>
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
          { label: 'Total Requests', value: summary.total, icon: UserMinus, tone: 'text-blue-600 bg-blue-50' },
          { label: 'Pending', value: summary.pending, icon: Clock, tone: 'text-amber-600 bg-amber-50' },
          { label: 'Approved', value: summary.approved, icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50' },
          { label: 'Rejected', value: summary.rejected, icon: XCircle, tone: 'text-red-600 bg-red-50' }
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

      <form onSubmit={submitResignation} className={`rounded-2xl border shadow-sm p-5 space-y-4 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
        <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Submit Resignation</h3>

        <div>
          <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Last Working Day</label>
          <input
            type="date"
            min={getMinDate()}
            value={form.lastDay}
            onChange={(event) => setForm((prev) => ({ ...prev, lastDay: event.target.value }))}
            className={`w-full md:w-80 px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 focus:ring-cyan-400/20 focus:border-cyan-400' : 'border-gray-200 text-gray-700 focus:ring-blue-500/20 focus:border-blue-400'}`}
            required
          />
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Reason</label>
          <textarea
            rows={3}
            value={form.reason}
            onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
            placeholder="Write your resignation reason"
            className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 resize-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-cyan-400/20 focus:border-cyan-400' : 'border-gray-200 text-gray-700 focus:ring-blue-500/20 focus:border-blue-400'}`}
            required
          />
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Attachment (Optional)</label>
          <label className={`w-full md:w-96 inline-flex items-center gap-2 px-3.5 py-2.5 border rounded-xl text-sm cursor-pointer ${isDarkMode ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <Paperclip className={`w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
            <span className="truncate">{form.attachmentName || 'Upload file'}</span>
            <input type="file" className="hidden" onChange={handleAttachment} />
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !isFormValid()}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold ${!isFormValid() ? (isDarkMode ? 'bg-gray-600 cursor-not-allowed' : 'bg-gray-400 cursor-not-allowed') : (isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-950/30' : 'bg-blue-600 hover:bg-blue-700')}`}
          >
            <Send className="w-4 h-4" />
            {saving ? 'Submitting...' : 'Submit Resignation'}
          </button>
        </div>
      </form>

      <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
        <div className={`px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
          <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>My Resignation Requests</h3>
          <div className={`flex items-center border rounded-xl px-3 py-2 w-full sm:w-72 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
            <Search className={`w-4 h-4 mr-2 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by code, status, stage"
              className={`bg-transparent text-sm focus:outline-none w-full ${isDarkMode ? 'text-slate-200 placeholder-slate-500' : 'text-gray-700 placeholder-gray-400'}`}
            />
          </div>
        </div>

        <div className={`px-5 py-4 border-b ${isDarkMode ? 'border-slate-800 bg-slate-950/30' : 'border-gray-100 bg-gray-50/60'}`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {workflowSteps.map((step, index) => (
              <div key={step} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-300' : 'border-gray-200 bg-white text-gray-600'}`}>
                {index + 1}. {stageLabel(step)}
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Request</th>
                <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Last Day</th>
                <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Stage</th>
                <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Status</th>
                <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Submitted</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-gray-50'}`}>
              {!loading && filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={5} className={`px-5 py-8 text-center text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    No resignation requests found.
                  </td>
                </tr>
              )}

              {filteredRecords.map((row) => (
                <tr key={row.id} className={isDarkMode ? 'hover:bg-slate-900/60' : 'hover:bg-gray-50/50'}>
                  <td className="px-5 py-3.5">
                    <div>
                      <div className={`text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{row.exitCode || row.id}</div>
                      <div className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{row.exitType}</div>
                    </div>
                  </td>
                  <td className={`px-5 py-3.5 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{formatDate(row.lastDay)}</td>
                  <td className={`px-5 py-3.5 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{stageLabel(row.stageKey || row.stage)}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={row.status} isDarkMode={isDarkMode} /></td>
                  <td className={`px-5 py-3.5 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{formatDate(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EmployeeResignationPage;
