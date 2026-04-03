import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { UserMinus, ClipboardCheck, MessageSquare, Search, ChevronRight, X, Eye, Download } from 'lucide-react';

const API_BASE = 'http://localhost:5000';

const tabs = ['resignations', 'approvals', 'clearance', 'exit interviews'];

const stageMap = {
  resignations: 'resignations',
  approvals: 'approvals',
  clearance: 'clearance',
  'exit interviews': 'exit_interviews'
};

const workflowSteps = [
  { key: 'approvals', label: 'Approval' },
  { key: 'clearance', label: 'Clearance' },
  { key: 'exit_interviews', label: 'Exit Interview' },
  { key: 'completed', label: 'Completed' }
];

const clearanceOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' }
];

const approvalClearanceOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' }
];

const interviewOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'done', label: 'Done' },
  { value: 'waived', label: 'Waived' }
];

const formatDate = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getAttachmentUrl = (attachmentName) => {
  const raw = String(attachmentName || '').trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) return raw;

  if (raw.startsWith('/uploads/')) {
    return `${API_BASE}${raw}`;
  }

  const safeFileName = encodeURIComponent(raw.split('/').pop());
  return `${API_BASE}/uploads/${safeFileName}`;
};

const TabButton = ({ active, children, onClick, isDarkMode }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-all whitespace-nowrap ${
      active
        ? isDarkMode
          ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/30'
          : 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
        : isDarkMode
          ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
    }`}
  >
    {children}
  </button>
);

const ExitManagementPage = () => {
  const [tab, setTab] = useState('resignations');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({
    openExits: 0,
    clearancePending: 0,
    interviewsDone: 0
  });
  const [selectedExit, setSelectedExit] = useState(null);
  const [workflowForm, setWorkflowForm] = useState({
    clearanceStatus: 'pending',
    interviewStatus: 'pending',
    hrNotes: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { isDarkMode = false } = useOutletContext() || {};
  const token = localStorage.getItem('erp_token');

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
        throw new Error(payload?.message || 'Failed to fetch exit records');
      }

      setRecords(payload?.data?.records || []);
      setSummary(payload?.data?.summary || {
        openExits: 0,
        clearancePending: 0,
        interviewsDone: 0
      });
    } catch (fetchError) {
      setError(fetchError.message || 'Failed to fetch exit records');
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

  const filtered = useMemo(() => {
    const stageKey = stageMap[tab];
    const lower = search.toLowerCase().trim();

    return records.filter((row) => {
      if (stageKey === 'exit_interviews') {
        if (!['exit_interviews', 'completed'].includes(row.stageKey)) {
          return false;
        }
      } else if (row.stageKey !== stageKey) {
        return false;
      }

      if (!lower) return true;
      const text = `${row.employeeName} ${row.exitType} ${row.stage} ${row.status} ${row.exitCode}`.toLowerCase();
      return text.includes(lower);
    });
  }, [records, tab, search]);

  const openDetails = (row) => {
    setSelectedExit(row);
    setWorkflowForm({
      clearanceStatus: String(row.clearanceStatus || 'Pending').toLowerCase(),
      interviewStatus: String(row.interviewStatus || 'Pending').toLowerCase(),
      hrNotes: row.hrNotes || ''
    });
  };

  const currentWorkflowStage = selectedExit?.stageKey || 'approvals';
  const isWorkflowCompleted = String(selectedExit?.status || '').toLowerCase() === 'approved' && currentWorkflowStage === 'completed';

  const getNextWorkflowStage = (stageKey, fieldName, value) => {
    if (stageKey === 'approvals' && fieldName === 'clearanceStatus' && value === 'in_progress') {
      return 'clearance';
    }

    if (stageKey === 'clearance' && fieldName === 'clearanceStatus' && value === 'completed') {
      return 'exit_interviews';
    }

    if (stageKey === 'exit_interviews' && fieldName === 'interviewStatus' && ['done', 'waived'].includes(value)) {
      return 'completed';
    }

    return stageKey;
  };

  const getTabForWorkflowStage = (stageKey) => {
    if (stageKey === 'clearance') return 'clearance';
    if (stageKey === 'exit_interviews' || stageKey === 'completed') return 'exit interviews';
    return 'approvals';
  };

  const saveWorkflow = async (nextPayload, { closeAfterSave = false, nextTab = null } = {}) => {
    if (!token || !selectedExit?.id) return;

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const response = await fetch(`${API_BASE}/api/hr/exits/${selectedExit.id}/workflow`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(nextPayload)
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to update workflow');
      }

      setMessage('Workflow updated successfully');
      await fetchExitRecords();

      if (nextTab) {
        setTab(nextTab);
      }

      if (closeAfterSave) {
        setSelectedExit(null);
      }
    } catch (workflowError) {
      setError(workflowError.message || 'Failed to update workflow');
    } finally {
      setSaving(false);
    }
  };

  const updateDecision = async (id, decision) => {
    if (!token) return;

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const response = await fetch(`${API_BASE}/api/hr/exits/${id}/decision`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ decision })
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to update decision');
      }

      setMessage(`Exit request ${decision} successfully`);
      await fetchExitRecords();
      if (selectedExit?.id === id) {
        setSelectedExit(null);
      }
    } catch (updateError) {
      setError(updateError.message || 'Failed to update decision');
    } finally {
      setSaving(false);
    }
  };

  const handleWorkflowStatusChange = async (fieldName, value) => {
    setWorkflowForm((prev) => ({ ...prev, [fieldName]: value }));
  };

  const submitCurrentWorkflow = async () => {
    if (!selectedExit?.id) return;

    if (isWorkflowCompleted) {
      setSelectedExit(null);
      return;
    }

    const relevantField = currentWorkflowStage === 'exit_interviews' ? 'interviewStatus' : 'clearanceStatus';
    const nextStage = getNextWorkflowStage(currentWorkflowStage, relevantField, workflowForm[relevantField]);

    const nextTab = getTabForWorkflowStage(nextStage);

    await saveWorkflow(
      {
        workflowStage: nextStage,
        clearanceStatus: workflowForm.clearanceStatus,
        interviewStatus: workflowForm.interviewStatus,
        hrNotes: workflowForm.hrNotes
      },
      {
        closeAfterSave: true,
        nextTab
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Exit Management</h1>
        <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Unified workflow for resignations, clearance, settlement and exit interviews</p>
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

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {tabs.map((item) => (
          <TabButton key={item} active={tab === item} onClick={() => setTab(item)} isDarkMode={isDarkMode}>
            {item.split(' ').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ')}
          </TabButton>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Open Exits', value: String(summary.openExits || 0), icon: UserMinus, bg: 'bg-blue-50', color: 'text-blue-600' },
          { label: 'Clearance Pending', value: String(summary.clearancePending || 0), icon: ClipboardCheck, bg: 'bg-amber-50', color: 'text-amber-600' },
          { label: 'Interviews Done', value: String(summary.interviewsDone || 0), icon: MessageSquare, bg: 'bg-emerald-50', color: 'text-emerald-600' },
          { label: 'Current Stage', value: workflowSteps.find((step) => step.key === tab)?.label || 'All', icon: ChevronRight, bg: 'bg-violet-50', color: 'text-violet-600' },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className={`rounded-2xl border shadow-sm p-5 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${isDarkMode ? 'bg-white/5' : card.bg}`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{card.value}</div>
            <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{card.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="space-y-4">
        <div className={`flex items-center border rounded-xl px-3 py-2 w-full sm:w-80 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
          <Search className={`w-4 h-4 mr-2 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exit records"
            className={`bg-transparent outline-none text-sm w-full ${isDarkMode ? 'text-slate-200 placeholder-slate-500' : 'text-gray-700 placeholder-gray-400'}`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {!loading && filtered.length === 0 && (
            <div className={`md:col-span-2 xl:col-span-3 rounded-2xl border shadow-sm p-5 text-sm ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 text-slate-300 shadow-black/20' : 'bg-white border-gray-100 text-gray-600'}`}>
              No exit records found for this stage.
            </div>
          )}

          {filtered.map((row) => (
            <div key={row.id} className={`rounded-2xl border shadow-sm p-5 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{row.employeeName}</h3>
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{row.exitType} • Last day {formatDate(row.lastDay)}</p>
                </div>
                <div className="space-y-1 text-right">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${isDarkMode ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                    {row.stage}
                  </span>
                  <div><span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${isDarkMode ? ({ Pending: 'bg-amber-500/10 text-amber-300 border-amber-500/20', Approved: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', Rejected: 'bg-red-500/10 text-red-300 border-red-500/20' }[row.status] || 'bg-slate-500/10 text-slate-300 border-slate-500/20') : ({ Pending: 'bg-amber-50 text-amber-700 border-amber-200', Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200', Rejected: 'bg-red-50 text-red-700 border-red-200' }[row.status] || 'bg-gray-50 text-gray-600 border-gray-200')}`}>{row.status}</span></div>
                </div>
              </div>
              <button onClick={() => openDetails(row)} className={`mt-4 inline-flex items-center gap-1.5 text-sm font-medium ${isDarkMode ? 'text-cyan-300 hover:text-cyan-200' : 'text-blue-600 hover:text-blue-700'}`}>
                Open Workflow
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {selectedExit && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[1px] flex items-center justify-center p-4" onClick={() => setSelectedExit(null)}>
          <div className={`w-full max-w-3xl rounded-2xl border shadow-2xl ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/15' : 'bg-white border-gray-200'}`} onClick={(event) => event.stopPropagation()}>
            <div className={`px-5 py-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <div>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Exit Workflow Details</h3>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Review and update resignation workflow.</p>
              </div>
              <button onClick={() => setSelectedExit(null)} className={`p-2 rounded-lg ${isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[72vh] overflow-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Employee</p>
                  <p className={`text-sm font-semibold mt-1 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{selectedExit.employeeName}</p>
                </div>
                <div>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Exit Code</p>
                  <p className={`text-sm font-semibold mt-1 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{selectedExit.exitCode || selectedExit.id}</p>
                </div>
                <div>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Type</p>
                  <p className={`text-sm font-semibold mt-1 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{selectedExit.exitType}</p>
                </div>
                <div>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Last Working Day</p>
                  <p className={`text-sm font-semibold mt-1 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{formatDate(selectedExit.lastDay)}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Reason</p>
                  <p className={`text-sm mt-1 whitespace-pre-wrap ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>{selectedExit.reason || '--'}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Attachment</p>
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>{selectedExit.attachmentName || 'No attachment provided'}</p>
                  {selectedExit.attachmentName && (
                    <div className="mt-2 flex items-center gap-2">
                      <a
                        href={getAttachmentUrl(selectedExit.attachmentName)}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${isDarkMode ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20 hover:bg-cyan-500/20' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View PDF
                      </a>
                      <a
                        href={getAttachmentUrl(selectedExit.attachmentName)}
                        download={selectedExit.attachmentName}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${isDarkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {String(selectedExit.status || '').toLowerCase() === 'pending' && (
                <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-gray-100 bg-gray-50'}`}>
                  <p className={`text-xs font-semibold mb-3 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Decision</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateDecision(selectedExit.id, 'approved')}
                      disabled={saving}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border disabled:opacity-50 ${isDarkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}
                    >
                      Approve Resignation
                    </button>
                    <button
                      onClick={() => updateDecision(selectedExit.id, 'rejected')}
                      disabled={saving}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border disabled:opacity-50 ${isDarkMode ? 'bg-red-500/10 text-red-300 border-red-500/20 hover:bg-red-500/20' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'}`}
                    >
                      Reject Resignation
                    </button>
                  </div>
                </div>
              )}

              {String(selectedExit.status || '').toLowerCase() === 'approved' && !isWorkflowCompleted && (
                <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-gray-100 bg-gray-50'}`}>
                  <p className={`text-xs font-semibold mb-3 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Workflow Progress</p>
                  <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {workflowSteps.map((step) => {
                      const stepIndex = workflowSteps.findIndex((item) => item.key === step.key);
                      const activeIndex = workflowSteps.findIndex((item) => item.key === selectedExit.stageKey);
                      const active = activeIndex >= stepIndex && activeIndex !== -1;

                      return (
                        <div key={step.key} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${active ? (isDarkMode ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300' : 'border-blue-200 bg-blue-50 text-blue-700') : (isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-500' : 'border-gray-200 bg-white text-gray-400')}`}>
                          {step.label}
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-3">
                    {currentWorkflowStage !== 'exit_interviews' && (
                      <div>
                        <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                          Clearance Status
                        </label>
                        <select
                          value={workflowForm.clearanceStatus}
                          onChange={(event) => handleWorkflowStatusChange('clearanceStatus', event.target.value)}
                          disabled={saving}
                          className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`}
                        >
                          {(currentWorkflowStage === 'approvals' ? approvalClearanceOptions : clearanceOptions).map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        {currentWorkflowStage === 'approvals' && (
                          <p className={`mt-2 text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>
                            Choose <span className="font-semibold">In Progress</span> to move this request into the Clearance tab.
                          </p>
                        )}
                        {currentWorkflowStage === 'clearance' && (
                          <p className={`mt-2 text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>
                            Choose <span className="font-semibold">Completed</span> to move this request to Exit Interviews.
                          </p>
                        )}
                      </div>
                    )}

                    {currentWorkflowStage === 'exit_interviews' && (
                      <div>
                        <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                          Exit Interview Status
                        </label>
                        <select
                          value={workflowForm.interviewStatus}
                          onChange={(event) => handleWorkflowStatusChange('interviewStatus', event.target.value)}
                          disabled={saving}
                          className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`}
                        >
                          {interviewOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <p className={`mt-2 text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>
                          Marking this as <span className="font-semibold">Done</span> or <span className="font-semibold">Waived</span> will complete the exit.
                        </p>
                      </div>
                    )}

                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>HR Notes</label>
                      <textarea
                        rows={3}
                        value={workflowForm.hrNotes}
                        onChange={(event) => setWorkflowForm((prev) => ({ ...prev, hrNotes: event.target.value }))}
                        disabled={saving}
                        className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`}
                      />
                    </div>

                    <div className="flex justify-end">
                      <button onClick={submitCurrentWorkflow} disabled={saving} className={`px-4 py-2 text-xs font-semibold rounded-lg text-white ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-900/50' : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300'} disabled:cursor-not-allowed`}>
                        {saving ? 'Saving...' : 'Save Progress'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isWorkflowCompleted && (
                <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-900/60 text-slate-300' : 'border-gray-100 bg-gray-50 text-gray-700'}`}>
                  <p className="text-xs font-semibold mb-1">Workflow Completed</p>
                  <p className="text-sm">This exit request is finished and cannot be edited anymore.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExitManagementPage;
