import React from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { Settings, Percent, Landmark, Plus } from 'lucide-react';

const components = [
  { name: 'Basic Salary', type: 'Earning', calc: 'Fixed', taxable: 'Yes' },
  { name: 'HRA', type: 'Earning', calc: '40% of Basic', taxable: 'Yes' },
  { name: 'Special Allowance', type: 'Earning', calc: 'Fixed', taxable: 'Yes' },
  { name: 'PF Employee', type: 'Deduction', calc: '12% of Basic', taxable: 'No' },
  { name: 'Professional Tax', type: 'Deduction', calc: 'By Slab', taxable: 'No' },
];

const PayrollSettings = () => {
  const { isDarkMode = false } = useOutletContext() || {};
  return (
    <div className="space-y-6">
      <div>
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Payroll Settings</h1>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Configure salary components, statutory rules and templates</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`rounded-2xl border shadow-sm p-5 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${isDarkMode ? 'bg-white/5 text-cyan-300' : 'bg-blue-50 text-blue-600'}`}>
            <Settings className="w-5 h-5" />
          </div>
          <h3 className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Salary Templates</h3>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Create templates by grade, role and location.</p>
        </div>
        <div className={`rounded-2xl border shadow-sm p-5 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${isDarkMode ? 'bg-white/5 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>
            <Percent className="w-5 h-5" />
          </div>
          <h3 className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Tax & Deductions</h3>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Define statutory rates and slab logic.</p>
        </div>
        <div className={`rounded-2xl border shadow-sm p-5 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${isDarkMode ? 'bg-white/5 text-violet-300' : 'bg-violet-50 text-violet-600'}`}>
            <Landmark className="w-5 h-5" />
          </div>
          <h3 className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Bank Rules</h3>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Configure transfer files and account checks.</p>
        </div>
      </div>

      <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
        <div className={`px-5 py-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
          <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Salary Components</h3>
          <button className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-semibold ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-950/30' : 'bg-blue-600 hover:bg-blue-700'}`}>
            <Plus className="w-4 h-4" />
            Add Component
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Component</th>
                <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Type</th>
                <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Calculation</th>
                <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Taxable</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-gray-50'}`}>
              {components.map((row, i) => (
                <motion.tr key={row.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={isDarkMode ? 'hover:bg-slate-900/60' : 'hover:bg-gray-50/50'}>
                  <td className={`px-5 py-3.5 text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{row.name}</td>
                  <td className={`px-5 py-3.5 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{row.type}</td>
                  <td className={`px-5 py-3.5 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{row.calc}</td>
                  <td className={`px-5 py-3.5 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{row.taxable}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PayrollSettings;
