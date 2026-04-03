import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { UserPlus, ShieldCheck, Mail, Lock, Building2 } from 'lucide-react';

const DEPARTMENT_OPTIONS = [
  'Human Resources',
  'Finance',
  'Sales',
  'Operations',
  'IT'
];

const HrAccountsPage = () => {
  const { isDarkMode = false } = useOutletContext() || {};
  const [message, setMessage] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [form, setForm] = useState({
    name: '',
    email: '',
    temporaryPassword: '',
    department: 'Human Resources',
  });

  const fetchHrAccounts = async () => {
    setIsLoadingAccounts(true);
    setMessage('');

    try {
      const token = localStorage.getItem('erp_token');
      const response = await fetch('http://localhost:5000/api/admin/users', {
        headers: {
          Authorization: `Bearer ${token || ''}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || 'Unable to fetch user accounts.');
        setAccounts([]);
        return;
      }

      setAccounts(data.accounts || []);
    } catch {
      setMessage('Unable to fetch user accounts.');
      setAccounts([]);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  useEffect(() => {
    fetchHrAccounts();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    if (message) setMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextEmail = form.email.trim().toLowerCase();
    const nextName = form.name.trim();
    const nextTempPassword = form.temporaryPassword.trim();

    if (!nextName || !nextEmail || !nextTempPassword) {
      setMessage('Name, email, and temporary password are required.');
      return;
    }

    setIsSaving(true);
    setMessage('');

    try {
      const token = localStorage.getItem('erp_token');
      const response = await fetch('http://localhost:5000/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`
        },
        body: JSON.stringify({
          name: nextName,
          email: nextEmail,
          temporaryPassword: nextTempPassword,
          department: form.department
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || 'Unable to save the HR account.');
        return;
      }

      setForm({
        name: '',
        email: '',
        temporaryPassword: '',
        department: 'Human Resources',
      });
      setMessage(`User account created for ${data.account.email}.`);
      fetchHrAccounts();
    } catch {
      setMessage('Unable to save the user account.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>User Account Management</h1>
        <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Create user accounts and manage access across departments.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <form
          onSubmit={handleSubmit}
          className={`rounded-2xl border shadow-sm p-6 space-y-5 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}
        >
          <div className="flex items-center gap-2">
            <UserPlus className={`w-5 h-5 ${isDarkMode ? 'text-cyan-300' : 'text-blue-600'}`} />
            <h2 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Create User Account</h2>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>Full Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="HR manager name"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>Email</label>
            <div className="relative">
              <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="hr.user@company.com"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>Password</label>
            <div className="relative">
              <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
              <input
                name="temporaryPassword"
                value={form.temporaryPassword}
                onChange={handleChange}
                placeholder="Temporary password"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>Department</label>
            <div className="relative">
              <Building2 className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
              <select
                name="department"
                value={form.department}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm appearance-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-900'}`}
              >
                {DEPARTMENT_OPTIONS.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>
              Role is assigned automatically based on selected department.
            </p>
          </div>

          {message && (
            <div className={`rounded-xl border px-4 py-3 text-sm ${message.includes('created') ? (isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700') : (isDarkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700')}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-950/30' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            <ShieldCheck className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save User Account'}
          </button>
        </form>

        <div className={`rounded-2xl border shadow-sm p-6 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
          <h2 className={`text-base font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Current User Accounts</h2>
          <div className="space-y-3">
            {isLoadingAccounts && (
              <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Loading user accounts...</div>
            )}
            {accounts.map((account) => (
              <div
                key={account.id}
                className={`rounded-xl border p-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-gray-50 border-gray-100'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{account.name}</div>
                    <div className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{account.email}</div>
                  </div>
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${isDarkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                    {account.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className={`text-xs mt-2 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  Department: {account.department || '-'} · Role: {account.role} · Temporary Password: {account.temporaryPassword || '-'}
                </div>
              </div>
            ))}
            {!isLoadingAccounts && accounts.length === 0 && (
              <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>No users found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HrAccountsPage;
