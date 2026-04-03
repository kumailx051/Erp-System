import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { ArrowLeft, Wallet, Receipt, Calendar, Download, TrendingUp } from 'lucide-react';

const salaryHistory = [
  { month: 'Mar 2026', basic: '$5,500', allowance: '$1,700', deductions: '$1,180', net: '$6,020', status: 'Paid' },
  { month: 'Feb 2026', basic: '$5,500', allowance: '$1,650', deductions: '$1,130', net: '$6,020', status: 'Paid' },
  { month: 'Jan 2026', basic: '$5,200', allowance: '$1,600', deductions: '$1,050', net: '$5,750', status: 'Paid' },
];

const EmployeeSalary = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isDarkMode = false } = useOutletContext() || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard/hr/payroll')}
          className={`p-2 rounded-xl ${isDarkMode ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Employee Salary</h1>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Salary structure and monthly payouts for employee #{id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Current CTC', value: '$86,400 / year', icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Last Net Pay', value: '$6,020', icon: Receipt, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Revision', value: '+5.8%', icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map((item, i) => (
          <motion.div key={item.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className={`rounded-2xl border shadow-sm p-5 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${isDarkMode ? 'bg-white/5' : item.bg}`}>
              <item.icon className={`w-5 h-5 ${item.color}`} />
            </div>
            <div className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.value}</div>
            <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{item.label}</div>
          </motion.div>
        ))}
      </div>

      <div className={`rounded-2xl border shadow-sm p-6 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
        <h3 className={`text-base font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Salary Structure</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { k: 'Basic Salary', v: '$5,500' },
            { k: 'HRA', v: '$1,200' },
            { k: 'Special Allowance', v: '$500' },
            { k: 'Performance Allowance', v: '$300' },
            { k: 'PF', v: '$520' },
            { k: 'Tax (TDS)', v: '$610' },
          ].map((row) => (
            <div key={row.k} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-gray-50 border-gray-100'}`}>
              <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{row.k}</span>
              <span className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{row.v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
        <div className={`px-5 py-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
          <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Payslip History</h3>
          <button className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${isDarkMode ? 'bg-slate-900 hover:bg-slate-800 text-slate-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
            <Calendar className="w-4 h-4" />
            2026
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Month</th>
                <th className={`text-right px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Basic</th>
                <th className={`text-right px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Allowance</th>
                <th className={`text-right px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Deductions</th>
                <th className={`text-right px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Net</th>
                <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Status</th>
                <th className={`text-right px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-gray-50'}`}>
              {salaryHistory.map((row) => (
                <tr key={row.month} className={isDarkMode ? 'hover:bg-slate-900/60' : 'hover:bg-gray-50/50'}>
                  <td className={`px-5 py-3.5 text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{row.month}</td>
                  <td className={`px-5 py-3.5 text-sm text-right ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{row.basic}</td>
                  <td className={`px-5 py-3.5 text-sm text-right ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{row.allowance}</td>
                  <td className={`px-5 py-3.5 text-sm text-right ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{row.deductions}</td>
                  <td className={`px-5 py-3.5 text-sm font-semibold text-right ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{row.net}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${isDarkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button className={`inline-flex items-center gap-1.5 text-sm font-medium ${isDarkMode ? 'text-cyan-300 hover:text-cyan-200' : 'text-blue-600 hover:text-blue-700'}`}>
                      <Download className="w-4 h-4" />
                      Payslip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EmployeeSalary;
