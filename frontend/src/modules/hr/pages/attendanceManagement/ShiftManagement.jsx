import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import {
  Clock, Plus, Sun, Moon, Sunset, X
} from 'lucide-react';

const API_BASE = 'http://localhost:5000';

function getShiftVisual(name = '') {
  const normalized = String(name).toLowerCase();

  if (normalized.includes('morning')) {
    return { icon: Sun, color: 'from-amber-400 to-orange-500' };
  }
  if (normalized.includes('night')) {
    return { icon: Moon, color: 'from-slate-600 to-slate-800' };
  }
  if (normalized.includes('evening')) {
    return { icon: Sunset, color: 'from-violet-500 to-fuchsia-500' };
  }

  return { icon: Clock, color: 'from-blue-500 to-cyan-500' };
}

const TabButton = ({ active, children, onClick, isDarkMode }) => (
  <button onClick={onClick}
    className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-all whitespace-nowrap
      ${active ? (isDarkMode ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/30' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/25') : (isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100')}`}>
    {children}
  </button>
);

const ShiftManagement = () => {
  const [activeTab, setActiveTab] = useState('shifts');
  const [shifts, setShifts] = useState([]);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddShiftModal, setShowAddShiftModal] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [newShiftForm, setNewShiftForm] = useState({
    name: '',
    startTime: '',
    endTime: '',
    breakMinutes: '0'
  });
  const { isDarkMode = false } = useOutletContext() || {};

  const token = useMemo(() => {
    return localStorage.getItem('erp_token') || localStorage.getItem('authToken') || localStorage.getItem('token') || '';
  }, []);

  const fetchShiftData = async () => {
    try {
      setLoading(true);
      setError('');

      const [shiftsResponse, rosterResponse] = await Promise.all([
        fetch(`${API_BASE}/api/hr/shifts`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/hr/shifts/roster`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const shiftsPayload = await shiftsResponse.json();
      const rosterPayload = await rosterResponse.json();

      if (!shiftsResponse.ok || !rosterResponse.ok) {
        throw new Error(
          shiftsPayload?.message
            || rosterPayload?.message
            || 'Failed to load shifts and roster data'
        );
      }

      setShifts(shiftsPayload?.data?.shifts || []);
      setRoster(rosterPayload?.data?.roster || []);
    } catch (fetchError) {
      setError(fetchError.message || 'Failed to load shift data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setError('Authentication token not found. Please login again.');
      setLoading(false);
      return;
    }

    fetchShiftData();
  }, []);

  const handleCreateShift = async (event) => {
    event.preventDefault();

    const payload = {
      name: newShiftForm.name.trim(),
      startTime: newShiftForm.startTime,
      endTime: newShiftForm.endTime,
      breakMinutes: Number(newShiftForm.breakMinutes || 0)
    };

    if (!payload.name || !payload.startTime || !payload.endTime) {
      setError('Shift name, start time and end time are required');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const response = await fetch(`${API_BASE}/api/hr/shifts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to create shift');
      }

      setMessage('Shift created successfully');
      setShowAddShiftModal(false);
      setNewShiftForm({ name: '', startTime: '', endTime: '', breakMinutes: '0' });
      await fetchShiftData();
    } catch (createError) {
      setError(createError.message || 'Failed to create shift');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignShift = async (employeeId, shiftId) => {
    try {
      setSaving(true);
      setError('');

      const response = await fetch(`${API_BASE}/api/hr/shifts/roster/${employeeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ shiftId: shiftId || null })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update roster');
      }

      setMessage('Shift assignment updated');
      await fetchShiftData();
    } catch (assignError) {
      setError(assignError.message || 'Failed to update roster');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div>
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Shift Management</h1>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Manage shifts and roster assignments</p>
          </div>
        </div>
        {activeTab === 'shifts' && (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => {
              setError('');
              setMessage('');
              setShowAddShiftModal(true);
            }}
            className={`flex items-center space-x-2 text-white px-5 py-2.5 rounded-xl text-sm font-medium ${isDarkMode ? 'bg-cyan-600 shadow-lg shadow-cyan-950/30 hover:bg-cyan-500' : 'bg-blue-600 shadow-lg shadow-blue-500/25 hover:bg-blue-700'}`}>
            <Plus className="w-4 h-4" /><span>Add Shift</span>
          </motion.button>
        )}
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

      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {['shifts', 'roster'].map(t => (
          <TabButton key={t} active={activeTab === t} onClick={() => setActiveTab(t)} isDarkMode={isDarkMode}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </TabButton>
        ))}
      </div>

      {activeTab === 'shifts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!loading && shifts.length === 0 && (
            <div className={`md:col-span-2 rounded-2xl border px-6 py-10 text-center ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 text-slate-400' : 'bg-white border-gray-100 text-gray-500'}`}>
              No shifts found. Add your first shift.
            </div>
          )}
          {shifts.map((s, i) => (
            (() => {
              const visual = getShiftVisual(s.name);
              const ShiftIcon = visual.icon;

              return (
            <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className={`rounded-2xl p-6 border shadow-sm hover:shadow-md transition-all group ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${visual.color} flex items-center justify-center shadow-lg`}>
                  <ShiftIcon className="w-6 h-6 text-white" />
                </div>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${isDarkMode ? 'bg-cyan-500/10 text-cyan-300' : 'bg-blue-50 text-blue-700'}`}>
                  Active
                </span>
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{s.name}</h3>
              <div className={`space-y-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                <div className="flex justify-between"><span>Timing</span><span className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>{s.startTime} - {s.endTime}</span></div>
                <div className="flex justify-between"><span>Break</span><span className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>{s.breakMinutes || 0} min</span></div>
                <div className="flex justify-between"><span>Employees</span><span className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>{s.employees}</span></div>
              </div>
            </motion.div>
              );
            })()
          ))}
        </div>
      )}

      {activeTab === 'roster' && (
        <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                  <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Employee</th>
                  <th className={`text-left px-3 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Department</th>
                  <th className={`text-left px-3 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Assigned Shift</th>
                  <th className={`text-left px-3 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Status</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-gray-50'}`}>
                {roster.map(r => (
                  <tr key={r.employeeId} className={isDarkMode ? 'hover:bg-slate-900/60' : 'hover:bg-gray-50/50'}>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-[9px] font-bold">
                          {String(r.employeeName || 'NA').split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div className={`text-sm font-medium whitespace-nowrap ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{r.employeeName}</div>
                          <div className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>#{r.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td className={`px-3 py-3 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{r.department || '-'}</td>
                    <td className="px-3 py-3">
                      <select
                        value={r.shiftId || ''}
                        onChange={(event) => handleAssignShift(r.employeeId, event.target.value ? Number(event.target.value) : null)}
                        disabled={saving}
                        className={`w-full text-sm rounded-xl px-3 py-2 border outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-gray-200 text-gray-700'}`}
                      >
                        <option value="">Unassigned</option>
                        {shifts.map((shift) => (
                          <option key={shift.id} value={shift.id}>{shift.name} ({shift.startTime}-{shift.endTime})</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${r.status === 'assigned'
                        ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
                        : (isDarkMode ? 'bg-slate-700/40 text-slate-300' : 'bg-gray-100 text-gray-600')}`}
                      >
                        {r.status === 'assigned' ? 'Assigned' : 'Unassigned'}
                      </span>
                    </td>
                  </tr>
                ))}
                {!loading && roster.length === 0 && (
                  <tr>
                    <td colSpan={4} className={`px-4 py-8 text-center text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      No active employees found for roster assignment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddShiftModal(false)} />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`relative z-10 w-full max-w-lg rounded-2xl border shadow-2xl ${isDarkMode ? 'bg-[#10293a] border-cyan-400/20' : 'bg-white border-gray-200'}`}
          >
            <div className={`flex items-center justify-between p-5 border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Add New Shift</h3>
              <button onClick={() => setShowAddShiftModal(false)} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-gray-100 text-gray-500'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateShift} className="p-5 space-y-4">
              <div>
                <label className={`block mb-1 text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>Shift Name</label>
                <input
                  type="text"
                  value={newShiftForm.name}
                  onChange={(event) => setNewShiftForm((prev) => ({ ...prev, name: event.target.value }))}
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`}
                  placeholder="General Shift"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block mb-1 text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>Start Time</label>
                  <input
                    type="time"
                    value={newShiftForm.startTime}
                    onChange={(event) => setNewShiftForm((prev) => ({ ...prev, startTime: event.target.value }))}
                    className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`}
                    required
                  />
                </div>
                <div>
                  <label className={`block mb-1 text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>End Time</label>
                  <input
                    type="time"
                    value={newShiftForm.endTime}
                    onChange={(event) => setNewShiftForm((prev) => ({ ...prev, endTime: event.target.value }))}
                    className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={`block mb-1 text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>Break (Minutes)</label>
                <input
                  type="number"
                  min="0"
                  value={newShiftForm.breakMinutes}
                  onChange={(event) => setNewShiftForm((prev) => ({ ...prev, breakMinutes: event.target.value }))}
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`}
                />
              </div>

              <div className="pt-1 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddShiftModal(false)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium ${isDarkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-4 py-2 rounded-xl text-sm font-medium text-white ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-700'} disabled:opacity-50`}
                >
                  {saving ? 'Saving...' : 'Save Shift'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ShiftManagement;
