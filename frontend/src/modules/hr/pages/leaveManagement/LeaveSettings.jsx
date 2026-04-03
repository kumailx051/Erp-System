import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import {
  Plus, Edit3, Trash2, RefreshCw, Calendar, Info, Shield, Settings, X
} from 'lucide-react';

const API_BASE = 'http://localhost:5000';

const policies = [
  { icon: RefreshCw, label: 'Leave Accrual',       value: 'Monthly (Pro-rated for new joiners)'           },
  { icon: Calendar,  label: 'Carry Forward Limit', value: 'Max 15 days — Earned Leave only'               },
  { icon: Info,      label: 'Advance Leave',        value: 'Allowed up to 3 days in advance'               },
  { icon: Shield,    label: 'Sandwich Rule',        value: 'Weekends counted between two consecutive leaves' },
  { icon: Settings,  label: 'Leave Encashment',     value: 'At the time of Full & Final Settlement'        },
];

const LeaveSettings = () => {
  const [section, setSection] = useState('types');
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLeaveType, setNewLeaveType] = useState({
    name: '',
    abbreviation: '',
    daysPerYear: '',
    carryForward: false,
    encashable: false,
    applicableTo: 'All Employees'
  });
  const { isDarkMode = false } = useOutletContext() || {};

  const token = localStorage.getItem('erp_token');

  const getBadgeColor = (abbr = '') => {
    const value = String(abbr || '').toLowerCase();
    if (value.includes('sl') || value.includes('sick')) return 'bg-red-100 text-red-700';
    if (value.includes('el') || value.includes('earned')) return 'bg-emerald-100 text-emerald-700';
    if (value.includes('ml') || value.includes('mater')) return 'bg-pink-100 text-pink-700';
    if (value.includes('lop')) return 'bg-gray-100 text-gray-700';
    return 'bg-blue-100 text-blue-700';
  };

  const fetchLeaveTypes = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_BASE}/api/hr/leave-types`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to fetch leave types');
      }

      setLeaveTypes(payload?.data?.leaveTypes || []);
    } catch (fetchError) {
      setError(fetchError.message || 'Failed to fetch leave types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const handleCreateLeaveType = async (event) => {
    event.preventDefault();
    if (!token) return;

    if (!newLeaveType.name.trim() || !newLeaveType.abbreviation.trim()) {
      setError('Leave type name and abbreviation are required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const response = await fetch(`${API_BASE}/api/hr/leave-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newLeaveType.name.trim(),
          abbreviation: newLeaveType.abbreviation.trim().toUpperCase(),
          daysPerYear: newLeaveType.daysPerYear === '' ? null : Number(newLeaveType.daysPerYear),
          carryForward: Boolean(newLeaveType.carryForward),
          encashable: Boolean(newLeaveType.encashable),
          applicableTo: newLeaveType.applicableTo.trim() || 'All Employees'
        })
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to create leave type');
      }

      setMessage('Leave type created successfully');
      setShowAddModal(false);
      setNewLeaveType({
        name: '',
        abbreviation: '',
        daysPerYear: '',
        carryForward: false,
        encashable: false,
        applicableTo: 'All Employees'
      });

      await fetchLeaveTypes();
    } catch (saveError) {
      setError(saveError.message || 'Failed to create leave type');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Leave Settings</h1>
          <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Configure leave types, policies and accrual rules</p>
        </div>
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

      {/* Section toggle */}
      <div className={`flex gap-1 rounded-xl p-1 w-fit ${isDarkMode ? 'bg-slate-900' : 'bg-gray-100'}`}>
        {[
          { key: 'types',    label: 'Leave Types' },
          { key: 'policies', label: 'Policies'    },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all
              ${section === s.key ? (isDarkMode ? 'bg-slate-800 text-slate-100 shadow-sm' : 'bg-white text-gray-900 shadow-sm') : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700')}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Leave Types */}
      {section === 'types' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{leaveTypes.length} leave types configured</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setError('');
                setMessage('');
                setShowAddModal(true);
              }}
              className={`flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-semibold transition-colors ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-950/30' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              <Plus className="w-4 h-4" />
              Add Leave Type
            </motion.button>
          </div>

          {loading && (
            <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Loading leave types...</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {leaveTypes.map((lt, i) => (
              <motion.div
                key={lt.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className={`rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all group ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold ${getBadgeColor(lt.abbreviation)} flex-shrink-0`}>
                      {lt.abbreviation}
                    </div>
                    <div>
                      <div className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{lt.name}</div>
                      <div className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{lt.applicableTo}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className={`p-1.5 rounded-lg transition-all ${isDarkMode ? 'text-slate-500 hover:text-amber-300 hover:bg-amber-500/10' : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'}`}>
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button className={`p-1.5 rounded-lg transition-all ${isDarkMode ? 'text-slate-500 hover:text-red-300 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className={`space-y-2 pt-3 border-t ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                  <div className="flex justify-between items-center text-xs">
                    <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Days Per Year</span>
                    <span className={`font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{lt.daysPerYear ?? '—'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Carry Forward</span>
                    <span className={`font-medium ${lt.carryForward ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {lt.carryForward ? '✓ Yes' : '✗ No'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Encashable</span>
                    <span className={`font-medium ${lt.encashable ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {lt.encashable ? '✓ Yes' : '✗ No'}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Policies */}
      {section === 'policies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Company-wide leave policies and rules</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`px-4 py-2 text-white rounded-xl text-sm font-semibold transition-colors ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-950/30' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              Save Changes
            </motion.button>
          </div>

          <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
            {policies.map((policy, i) => (
              <div
                key={i}
                className={`flex items-start gap-4 p-5 hover:bg-gray-50/50 transition-colors
                  ${i < policies.length - 1 ? (isDarkMode ? 'border-b border-slate-800' : 'border-b border-gray-100') : ''} ${isDarkMode ? 'hover:bg-slate-900/60' : 'hover:bg-gray-50/50'}`}
              >
                <div className={`p-2.5 rounded-xl flex-shrink-0 ${isDarkMode ? 'bg-white/5' : 'bg-blue-50'}`}>
                  <policy.icon className={`w-4 h-4 ${isDarkMode ? 'text-cyan-300' : 'text-blue-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{policy.label}</div>
                  <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{policy.value}</div>
                </div>
                <button className={`p-1.5 rounded-lg transition-all flex-shrink-0 self-center ${isDarkMode ? 'text-slate-500 hover:text-amber-300 hover:bg-amber-500/10' : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'}`}>
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddModal(false)} />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`relative z-10 w-full max-w-lg rounded-2xl border shadow-2xl ${isDarkMode ? 'bg-[#10293a] border-cyan-400/20' : 'bg-white border-gray-200'}`}
          >
            <div className={`flex items-center justify-between p-5 border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Add Leave Type</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className={`p-1.5 rounded-lg ${isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLeaveType} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block mb-1 text-xs font-medium uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Name</label>
                  <input
                    type="text"
                    value={newLeaveType.name}
                    onChange={(e) => setNewLeaveType((prev) => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`}
                    placeholder="e.g. Casual Leave"
                    required
                  />
                </div>
                <div>
                  <label className={`block mb-1 text-xs font-medium uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Abbreviation</label>
                  <input
                    type="text"
                    value={newLeaveType.abbreviation}
                    onChange={(e) => setNewLeaveType((prev) => ({ ...prev, abbreviation: e.target.value.toUpperCase() }))}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`}
                    placeholder="e.g. CL"
                    required
                  />
                </div>
                <div>
                  <label className={`block mb-1 text-xs font-medium uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Days Per Year</label>
                  <input
                    type="number"
                    min="0"
                    value={newLeaveType.daysPerYear}
                    onChange={(e) => setNewLeaveType((prev) => ({ ...prev, daysPerYear: e.target.value }))}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`}
                    placeholder="Leave blank for unlimited"
                  />
                </div>
                <div>
                  <label className={`block mb-1 text-xs font-medium uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Applicable To</label>
                  <input
                    type="text"
                    value={newLeaveType.applicableTo}
                    onChange={(e) => setNewLeaveType((prev) => ({ ...prev, applicableTo: e.target.value }))}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`}
                    placeholder="All Employees"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  <input
                    type="checkbox"
                    checked={newLeaveType.carryForward}
                    onChange={(e) => setNewLeaveType((prev) => ({ ...prev, carryForward: e.target.checked }))}
                  />
                  Carry Forward Enabled
                </label>
                <label className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  <input
                    type="checkbox"
                    checked={newLeaveType.encashable}
                    onChange={(e) => setNewLeaveType((prev) => ({ ...prev, encashable: e.target.checked }))}
                  />
                  Encashable
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium ${isDarkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-60 ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {saving ? 'Saving...' : 'Create Leave Type'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default LeaveSettings;
