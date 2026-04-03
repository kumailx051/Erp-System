import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ShieldCheck, Users, UserPlus, ArrowRight, RotateCcw, X } from 'lucide-react';

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { isDarkMode = false } = useOutletContext() || {};
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [databaseTables, setDatabaseTables] = useState([]);
  const [selectedResetTables, setSelectedResetTables] = useState([]);
  const [resetConfirmationText, setResetConfirmationText] = useState('');
  const [tableListLoading, setTableListLoading] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem('erp_token');
      const response = await fetch('http://localhost:5000/api/admin/users', {
        headers: {
          Authorization: `Bearer ${token || ''}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        setAccounts([]);
        return;
      }

      setAccounts(data.accounts || []);
    } catch {
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openResetModal = async () => {
    setErrorMessage('');
    setInfoMessage('');
    setResetConfirmationText('');
    setShowResetModal(true);
    setTableListLoading(true);

    try {
      const token = localStorage.getItem('erp_token');
      const response = await fetch('http://localhost:5000/api/admin/database-tables', {
        headers: {
          Authorization: `Bearer ${token || ''}`
        }
      });

      const data = await response.json();
      if (response.ok && Array.isArray(data.tables)) {
        setDatabaseTables(data.tables);
        // Select all tables by default
        setSelectedResetTables(data.tables.map((table) => table.key));
      } else {
        setErrorMessage('Failed to load database tables');
        setDatabaseTables([]);
        setSelectedResetTables([]);
      }
    } catch (error) {
      setErrorMessage('Failed to load database tables: ' + (error.message || 'Unknown error'));
      setDatabaseTables([]);
      setSelectedResetTables([]);
    } finally {
      setTableListLoading(false);
    }
  };

  const closeResetModal = () => {
    if (!isResetting) {
      setShowResetModal(false);
    }
  };

  const toggleResetTable = (tableKey) => {
    setSelectedResetTables((prev) => (
      prev.includes(tableKey)
        ? prev.filter((key) => key !== tableKey)
        : [...prev, tableKey]
    ));
  };

  const handleResetDatabase = async () => {
    setErrorMessage('');
    setInfoMessage('');

    if (selectedResetTables.length === 0) {
      setErrorMessage('Please select at least one table to reset.');
      return;
    }

    if (String(resetConfirmationText || '').trim() !== 'RESET_DATABASE') {
      setErrorMessage('Reset cancelled. Confirmation text did not match.');
      return;
    }

    try {
      setIsResetting(true);
      const token = localStorage.getItem('erp_token');
      const response = await fetch('http://localhost:5000/api/admin/reset-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`
        },
        body: JSON.stringify({
          confirmation: 'RESET_DATABASE',
          tables: selectedResetTables
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to reset database');
      }

      const resetUsersTable = Array.isArray(data?.resetTables) && data.resetTables.includes('users');
      if (resetUsersTable) {
        setInfoMessage('Selected reset completed. Users table was reset, redirecting to login...');
        localStorage.removeItem('erp_user');
        localStorage.removeItem('erp_token');
        setAccounts([]);
        setTimeout(() => {
          navigate('/login');
        }, 800);
      } else {
        setInfoMessage(`Selected tables reset successfully: ${selectedResetTables.join(', ')}`);
        fetchUsers();
      }

      setShowResetModal(false);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to reset database');
    } finally {
      setIsResetting(false);
    }
  };

  const recentAccounts = useMemo(
    () =>
      [...accounts]
        .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
        .slice(0, 4),
    [accounts]
  );

  const stats = useMemo(
    () => [
      {
        label: 'Total User Accounts',
        value: String(accounts.length),
        icon: Users,
        tone: 'text-cyan-300'
      },
      {
        label: 'Active Users',
        value: String(accounts.filter((account) => account.isActive).length),
        icon: ShieldCheck,
        tone: 'text-emerald-300'
      },
      {
        label: 'Quick Action',
        value: 'Create User Account',
        icon: UserPlus,
        tone: 'text-amber-300'
      }
    ],
    [accounts]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Admin Dashboard</h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            Manage user access across all departments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openResetModal}
            disabled={isResetting}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed ${isDarkMode ? 'bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-950/30' : 'bg-rose-600 hover:bg-rose-700'}`}
          >
            <RotateCcw className="w-4 h-4" />
            {isResetting ? 'Resetting...' : 'Reset Tables'}
          </button>
          <button
            onClick={() => navigate('/dashboard/admin/hr-accounts')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-950/30' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            <UserPlus className="w-4 h-4" />
            Create User Account
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className={`rounded-xl px-4 py-2.5 text-sm border ${isDarkMode ? 'bg-red-500/10 text-red-300 border-red-500/30' : 'bg-red-50 text-red-700 border-red-100'}`}>
          {errorMessage}
        </div>
      )}

      {infoMessage && (
        <div className={`rounded-xl px-4 py-2.5 text-sm border ${isDarkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
          {infoMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl border shadow-sm p-5 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${isDarkMode ? 'bg-white/5' : 'bg-blue-50'}`}>
              <stat.icon className={`w-5 h-5 ${stat.tone}`} />
            </div>
            <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stat.value}</div>
            <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div className={`rounded-2xl border shadow-sm p-6 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center justify-between mb-4 gap-3">
          <div>
            <h2 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Recent User Accounts</h2>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              Latest user accounts managed by admin.
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard/admin/hr-accounts')}
            className={`inline-flex items-center gap-1.5 text-sm font-medium ${isDarkMode ? 'text-cyan-300 hover:text-cyan-200' : 'text-blue-600 hover:text-blue-700'}`}
          >
            Manage
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {isLoading && (
            <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Loading user accounts...</div>
          )}

          {!isLoading && recentAccounts.map((account) => (
            <div
              key={account.id}
              className={`flex items-center justify-between gap-3 rounded-xl border p-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-gray-50 border-gray-100'}`}
            >
              <div>
                <div className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{account.name}</div>
                <div className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  {account.email} · {account.role}
                </div>
              </div>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${isDarkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                {account.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          ))}

          {!isLoading && recentAccounts.length === 0 && (
            <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>No users found.</div>
          )}
        </div>
      </div>

      {showResetModal && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-xl rounded-2xl border shadow-2xl ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/20' : 'bg-white border-gray-200'}`}>
            <div className={`px-5 py-4 border-b flex items-start justify-between ${isDarkMode ? 'border-cyan-400/10' : 'border-gray-200'}`}>
              <div>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Reset Selected Tables</h3>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Choose one or more tables to reset.
                </p>
              </div>
              <button
                type="button"
                onClick={closeResetModal}
                className={`p-2 rounded-lg ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tableListLoading ? (
                  <div className={`col-span-full text-center py-8 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    <p>Loading database tables...</p>
                  </div>
                ) : databaseTables.length > 0 ? (
                  databaseTables.map((table) => {
                    const selected = selectedResetTables.includes(table.key);
                    return (
                      <label
                        key={table.key}
                        className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${selected
                          ? isDarkMode
                            ? 'bg-cyan-500/10 border-cyan-400/40'
                            : 'bg-blue-50 border-blue-300'
                          : isDarkMode
                            ? 'bg-slate-900 border-slate-700 hover:border-slate-600'
                            : 'bg-white border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleResetTable(table.key)}
                        />
                        <span className={`text-sm ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>{table.label}</span>
                      </label>
                    );
                  })
                ) : (
                  <div className={`col-span-full text-center py-8 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    <p>No tables found</p>
                  </div>
                )}
              </div>

              <div>
                <label className={`text-sm font-medium block mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Type RESET_DATABASE to confirm
                </label>
                <input
                  value={resetConfirmationText}
                  onChange={(event) => setResetConfirmationText(event.target.value)}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  placeholder="RESET_DATABASE"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeResetModal}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${isDarkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetDatabase}
                  disabled={isResetting}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed ${isDarkMode ? 'bg-rose-600 hover:bg-rose-500' : 'bg-rose-600 hover:bg-rose-700'}`}
                >
                  {isResetting ? 'Resetting...' : 'Reset Selected'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
