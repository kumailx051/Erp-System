import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Wallet,
  PlayCircle,
  Download,
  TrendingUp,
  Users,
  Search,
  ChevronRight,
  FileSpreadsheet,
  Settings,
} from 'lucide-react';
import { payrollService } from '../../services/payrollService';

function formatMoney(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(Number.isFinite(amount) ? amount : 0);
}

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

const StatusBadge = ({ status, isDarkMode }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
      status === 'Paid'
        ? isDarkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : isDarkMode ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200'
    }`}
  >
    {status}
  </span>
);

const PayrollPage = () => {
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState(null);
  const [salaryRegister, setSalaryRegister] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const navigate = useNavigate();
  const { isDarkMode = false } = useOutletContext() || {};

  useEffect(() => {
    let cancelled = false;

    async function loadPayrollData() {
      try {
        setIsLoading(true);
        setError('');

        const [summaryPayload, registerPayload] = await Promise.all([
          payrollService.getSummary(currentMonth, currentYear),
          payrollService.getRegister(currentMonth, currentYear, search)
        ]);

        if (cancelled) return;

        setSummary(summaryPayload?.data || null);
        setSalaryRegister(registerPayload?.data?.rows || []);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || 'Unable to load payroll data.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPayrollData();

    return () => {
      cancelled = true;
    };
  }, [currentMonth, currentYear, search]);

  const payrollStats = useMemo(() => ([
    { label: 'Net Payroll', value: summary ? formatMoney(summary.netPayroll) : '--', sub: `${currentYear}-${String(currentMonth).padStart(2, '0')}`, icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Employees Paid', value: summary ? String(summary.paidCount) : '0', sub: summary ? `of ${summary.employeeCount}` : 'of 0', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pending', value: summary ? String(summary.pendingCount) : '0', sub: 'needs review', icon: PlayCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Gross Payroll', value: summary ? formatMoney(summary.grossPayroll) : '--', sub: 'current month', icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
  ]), [summary, currentMonth, currentYear]);

  const filtered = salaryRegister.map((row) => ({
    id: row.id,
    employeeId: row.employeeId,
    code: row.employeeCode,
    name: row.employeeName,
    dept: row.department,
    gross: formatMoney(row.grossPay),
    deductions: formatMoney(row.deductions),
    net: formatMoney(row.netPay),
    status: row.status === 'paid' ? 'Paid' : 'Pending'
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Payroll Management</h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Unified payroll dashboard, processing and salary register</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate('/dashboard/hr/payroll/process')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-semibold transition-colors ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-950/30' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            <PlayCircle className="w-4 h-4" />
            Process Payroll
          </button>
          <button className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-semibold transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {error && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-rose-500/30 bg-rose-500/10 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
          {error}
        </div>
      )}

      {isLoading && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
          Loading payroll data...
        </div>
      )}

      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {['overview', 'process', 'register', 'reports'].map((item) => (
          <TabButton key={item} active={tab === item} onClick={() => setTab(item)} isDarkMode={isDarkMode}>
            {item.charAt(0).toUpperCase() + item.slice(1)}
          </TabButton>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {payrollStats.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`rounded-2xl p-5 border shadow-sm ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}
              >
                <div className={`p-2.5 rounded-xl w-fit mb-3 ${isDarkMode ? 'bg-white/5' : card.bg}`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{card.value}</div>
                <div className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>{card.label}</div>
                <div className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{card.sub}</div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className={`rounded-2xl border shadow-sm p-6 lg:col-span-2 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
              <h3 className={`text-base font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Current Month Register Snapshot</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px]">
                  <thead>
                    <tr className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                      <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Employee</th>
                      <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Department</th>
                      <th className={`text-right px-4 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Gross</th>
                      <th className={`text-right px-4 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Deductions</th>
                      <th className={`text-right px-4 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Net</th>
                      <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Status</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-gray-50'}`}>
                    {filtered.map((row) => (
                      <tr key={row.id} className={isDarkMode ? 'hover:bg-slate-900/60 transition-colors' : 'hover:bg-gray-50/50 transition-colors'}>
                        <td className="px-4 py-3.5">
                          <div className={`text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{row.name}</div>
                          <div className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{row.code}</div>
                        </td>
                        <td className={`px-4 py-3.5 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{row.dept}</td>
                        <td className={`px-4 py-3.5 text-sm text-right ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{row.gross}</td>
                        <td className={`px-4 py-3.5 text-sm text-right ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{row.deductions}</td>
                        <td className={`px-4 py-3.5 text-sm font-semibold text-right ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{row.net}</td>
                        <td className="px-4 py-3.5"><StatusBadge status={row.status} isDarkMode={isDarkMode} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={`rounded-2xl border shadow-sm p-6 space-y-3 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
              <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Quick Actions</h3>
              <button
                onClick={() => navigate('/dashboard/hr/payroll/process')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${isDarkMode ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20 hover:bg-cyan-500/20' : 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100'}`}
              >
                <span className="text-sm font-medium">Run Payroll Workflow</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  const target = filtered[0]?.employeeId;
                  if (target) navigate(`/dashboard/hr/payroll/salary/${target}`);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
              >
                <span className="text-sm font-medium">Open Employee Salary</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/dashboard/hr/payroll/settings')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${isDarkMode ? 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
              >
                <span className="text-sm font-medium">Payroll Settings</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'process' && (
        <div className={`rounded-2xl border shadow-sm p-6 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
          <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Payroll Processing</h3>
          <p className={`text-sm mb-5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Run monthly payroll with validations and approval workflow.</p>
          <button
            onClick={() => navigate('/dashboard/hr/payroll/process')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-semibold transition-colors ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-950/30' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            <PlayCircle className="w-4 h-4" />
            Open Processing Screen
          </button>
        </div>
      )}

      {tab === 'register' && (
        <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
          <div className={`p-5 border-b flex flex-col sm:flex-row gap-3 sm:items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
            <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Salary Register</h3>
            <div className={`flex items-center border rounded-xl px-3 py-2 w-full sm:w-80 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
              <Search className={`w-4 h-4 mr-2 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employee, code, department"
                className={`bg-transparent outline-none text-sm w-full ${isDarkMode ? 'text-slate-200 placeholder-slate-500' : 'text-gray-700 placeholder-gray-400'}`}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                  <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Employee</th>
                  <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Department</th>
                  <th className={`text-right px-4 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Gross</th>
                  <th className={`text-right px-4 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Deductions</th>
                  <th className={`text-right px-4 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Net</th>
                  <th className={`text-left px-4 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Status</th>
                  <th className={`text-right px-4 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-gray-50'}`}>
                {filtered.map((row) => (
                  <tr key={row.id} className={isDarkMode ? 'hover:bg-slate-900/60 transition-colors' : 'hover:bg-gray-50/50 transition-colors'}>
                    <td className="px-4 py-3.5">
                      <div className={`text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{row.name}</div>
                      <div className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{row.code}</div>
                    </td>
                    <td className={`px-4 py-3.5 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{row.dept}</td>
                    <td className={`px-4 py-3.5 text-sm text-right ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{row.gross}</td>
                    <td className={`px-4 py-3.5 text-sm text-right ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{row.deductions}</td>
                    <td className={`px-4 py-3.5 text-sm font-semibold text-right ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{row.net}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={row.status} isDarkMode={isDarkMode} /></td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => navigate(`/dashboard/hr/payroll/salary/${row.employeeId}`)}
                        className={`inline-flex items-center gap-1.5 text-sm font-medium ${isDarkMode ? 'text-cyan-300 hover:text-cyan-200' : 'text-blue-600 hover:text-blue-700'}`}
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        View Salary
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: 'Payroll Summary', desc: 'Monthly payroll totals by department', icon: Wallet },
            { title: 'Deductions Breakdown', desc: 'PF, ESI, TDS and custom deductions', icon: FileSpreadsheet },
            { title: 'Bank Transfer Sheet', desc: 'Export transfer-ready salary sheet', icon: Download },
            { title: 'Payroll Settings', desc: 'Configure components and compliance rules', icon: Settings, path: '/dashboard/hr/payroll/settings' },
          ].map((card) => (
            <div key={card.title} className={`rounded-2xl border shadow-sm p-6 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${isDarkMode ? 'bg-white/5 text-cyan-300' : 'bg-blue-50 text-blue-600'}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <h3 className={`text-base font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{card.title}</h3>
              <p className={`text-sm mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{card.desc}</p>
              {card.path && (
                <button
                  onClick={() => navigate(card.path)}
                  className={`inline-flex items-center gap-1.5 text-sm font-medium ${isDarkMode ? 'text-cyan-300 hover:text-cyan-200' : 'text-blue-600 hover:text-blue-700'}`}
                >
                  Open
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PayrollPage;
