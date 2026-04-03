import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  X,
} from 'lucide-react';
const API_BASE = 'http://localhost:5000';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'all', label: 'All Leaves' },
];

const STATUS_STYLES = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
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
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${isDarkMode ? ({ Pending: 'bg-amber-500/10 text-amber-300 border-amber-500/20', Approved: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', Rejected: 'bg-red-500/10 text-red-300 border-red-500/20' }[status] || 'bg-amber-500/10 text-amber-300 border-amber-500/20') : (STATUS_STYLES[status] || STATUS_STYLES.Pending)}`}>
    {status}
  </span>
);

const TabButton = ({ active, onClick, children, isDarkMode }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
      active
        ? isDarkMode ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/30' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
        : isDarkMode ? 'bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
    }`}
  >
    {children}
  </button>
);

const LeavePage = () => {
  const { isDarkMode = false } = useOutletContext() || {};
  const [activeTab, setActiveTab] = useState('overview');
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedLeave, setSelectedLeave] = useState(null);

  const token = localStorage.getItem('erp_token');

  const fetchLeaveData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError('');

      const [leavesRes, employeesRes, leaveTypesRes] = await Promise.all([
        fetch(`${API_BASE}/api/hr/leaves`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/hr/employees`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/hr/leave-types`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const leavesPayload = await leavesRes.json();
      const employeesPayload = await employeesRes.json();
      const leaveTypesPayload = await leaveTypesRes.json();

      if (!leavesRes.ok || !leavesPayload?.success) {
        throw new Error(leavesPayload?.message || 'Failed to fetch leaves');
      }
      if (!employeesRes.ok || !employeesPayload?.success) {
        throw new Error(employeesPayload?.message || 'Failed to fetch employees');
      }
      if (!leaveTypesRes.ok || !leaveTypesPayload?.success) {
        throw new Error(leaveTypesPayload?.message || 'Failed to fetch leave types');
      }

      setLeaves(leavesPayload?.data?.leaves || []);
      setEmployees(employeesPayload?.data?.employees || []);
      setLeaveTypes(leaveTypesPayload?.data?.leaveTypes || []);
    } catch (fetchError) {
      setError(fetchError.message || 'Failed to fetch leave data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, []);

  const leavesWithMeta = useMemo(() => leaves.map((leave) => ({
    ...leave,
    leaveType: leave.leaveTypeName,
    days: leave.totalDays || getDays(leave.startDate, leave.endDate),
  })), [leaves]);

  const counts = useMemo(() => {
    const pending = leaves.filter((leave) => leave.status === 'Pending').length;
    const approved = leaves.filter((leave) => leave.status === 'Approved').length;
    const rejected = leaves.filter((leave) => leave.status === 'Rejected').length;
    return {
      total: leaves.length,
      pending,
      approved,
      rejected,
    };
  }, [leaves]);

  const filteredLeaves = useMemo(() => {
    const lower = query.toLowerCase().trim();
    if (!lower) return leavesWithMeta;

    return leavesWithMeta.filter((leave) => (
      leave.employeeName.toLowerCase().includes(lower)
      || leave.department.toLowerCase().includes(lower)
      || leave.leaveType.toLowerCase().includes(lower)
      || leave.status.toLowerCase().includes(lower)
      || String(leave.id).toLowerCase().includes(lower)
    ));
  }, [leavesWithMeta, query]);

  const updateStatus = async (leaveId, status) => {
    if (!token) return;
    try {
      setSaving(true);
      setError('');
      setMessage('');

      const response = await fetch(`${API_BASE}/api/hr/leaves/${leaveId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: status.toLowerCase() })
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to update status');
      }

      setMessage(`Leave ${status.toLowerCase()} successfully`);
      await fetchLeaveData();
    } catch (statusError) {
      setError(statusError.message || 'Failed to update leave status');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Leave Management</h1>
        <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>HR administrators can create, manage, and approve employee leave requests.</p>
      </div>

      {error && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>{error}</div>
      )}
      {message && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{message}</div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((tab) => (
          <TabButton key={tab.key} active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)} isDarkMode={isDarkMode}>
            {tab.label}
          </TabButton>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: 'Total Leaves', value: counts.total, icon: CalendarDays, tone: 'text-blue-600 bg-blue-50' },
              { label: 'Pending Approvals', value: counts.pending, icon: Clock, tone: 'text-amber-600 bg-amber-50' },
              { label: 'Approved Leaves', value: counts.approved, icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50' },
              { label: 'Rejected Leaves', value: counts.rejected, icon: XCircle, tone: 'text-red-600 bg-red-50' },
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

          <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
            <div className={`px-5 py-4 border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Leave Balance Snapshot (Available Days)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                    <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Employee</th>
                    <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Department</th>
                    {leaveTypes.map((type) => (
                      <th key={type.id} className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{type.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-gray-50'}`}>
                  {employees.map((employee) => (
                    <tr key={employee.id} className={isDarkMode ? 'hover:bg-slate-900/60' : 'hover:bg-gray-50/50'}>
                      <td className={`px-5 py-3.5 text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{employee.fullName}</td>
                      <td className={`px-5 py-3.5 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{employee.department}</td>
                      {leaveTypes.map((type) => {
                        const value = employee.leaveBalances?.[String(type.id)];
                        const available = value === null || value === undefined ? (type.daysPerYear ?? '—') : value;
                        return (
                          <td key={type.id} className={`px-5 py-3.5 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{available}</td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'all' && (
        <div className="space-y-5">
          <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
            <div className={`px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>All Employee Leaves</h3>
              <div className={`flex items-center border rounded-xl px-3 py-2 w-full sm:w-72 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                <Search className={`w-4 h-4 mr-2 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search employee, type, status"
                  className={`bg-transparent text-sm focus:outline-none w-full ${isDarkMode ? 'text-slate-200 placeholder-slate-500' : 'text-gray-700 placeholder-gray-400'}`}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                    <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Employee</th>
                    <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Department</th>
                    <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Leave Type</th>
                    <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Dates</th>
                    <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Days</th>
                    <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Status</th>
                    <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-gray-50'}`}>
                  {!loading && filteredLeaves.length === 0 && (
                    <tr>
                      <td colSpan={7} className={`px-5 py-8 text-center text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                        No leave requests found.
                      </td>
                    </tr>
                  )}
                  {filteredLeaves.map((leave) => (
                    <tr
                      key={leave.id}
                      onClick={() => setSelectedLeave(leave)}
                      className={`${isDarkMode ? 'hover:bg-slate-900/60' : 'hover:bg-gray-50/50'} cursor-pointer`}
                    >
                      <td className="px-5 py-3.5">
                        <div>
                          <div className={`text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{leave.employeeName}</div>
                          <div className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{leave.id}</div>
                        </div>
                      </td>
                      <td className={`px-5 py-3.5 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{leave.department}</td>
                      <td className={`px-5 py-3.5 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{leave.leaveType}</td>
                      <td className={`px-5 py-3.5 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{formatDate(leave.startDate)} - {formatDate(leave.endDate)}</td>
                      <td className={`px-5 py-3.5 text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{leave.days}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={leave.status} isDarkMode={isDarkMode} /></td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(() => {
                            const isActionLocked = String(leave.status || '').toLowerCase() !== 'pending';
                            return (
                              <>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              updateStatus(leave.id, 'Approved');
                            }}
                            disabled={isActionLocked || saving}
                            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border disabled:opacity-50 ${isDarkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}
                          >
                            Approve
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              updateStatus(leave.id, 'Rejected');
                            }}
                            disabled={isActionLocked || saving}
                            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border disabled:opacity-50 ${isDarkMode ? 'bg-red-500/10 text-red-300 border-red-500/20 hover:bg-red-500/20' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'}`}
                          >
                            Reject
                          </button>
                              </>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedLeave && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setSelectedLeave(null)}
        >
          <div
            className={`w-full max-w-2xl rounded-2xl border shadow-2xl ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/15' : 'bg-white border-gray-200'}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`px-5 py-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <div>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Leave Request Details</h3>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Review employee request information.</p>
              </div>
              <button
                onClick={() => setSelectedLeave(null)}
                className={`p-2 rounded-lg ${isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Employee</p>
                <p className={`text-sm font-semibold mt-1 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{selectedLeave.employeeName || '--'}</p>
              </div>
              <div>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Department</p>
                <p className={`text-sm font-semibold mt-1 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{selectedLeave.department || '--'}</p>
              </div>
              <div>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Request Code</p>
                <p className={`text-sm font-semibold mt-1 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{selectedLeave.leaveCode || selectedLeave.id}</p>
              </div>
              <div>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Status</p>
                <div className="mt-1"><StatusBadge status={selectedLeave.status} isDarkMode={isDarkMode} /></div>
              </div>
              <div>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Leave Type</p>
                <p className={`text-sm font-semibold mt-1 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{selectedLeave.leaveTypeName || selectedLeave.leaveType || '--'}</p>
              </div>
              <div>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total Days</p>
                <p className={`text-sm font-semibold mt-1 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{selectedLeave.totalDays || selectedLeave.days || '--'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Dates</p>
                <p className={`text-sm font-semibold mt-1 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{formatDate(selectedLeave.startDate)} - {formatDate(selectedLeave.endDate)}</p>
              </div>
              <div className="sm:col-span-2">
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Reason</p>
                <p className={`text-sm mt-1 whitespace-pre-wrap ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>{selectedLeave.reason || '--'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Attachment</p>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>{selectedLeave.attachmentName || 'No attachment provided'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LeavePage;
