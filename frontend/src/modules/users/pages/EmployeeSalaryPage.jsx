import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { Wallet, Receipt, Calendar, Download } from 'lucide-react';
import { payrollService } from '../../hr/services/payrollService';

function formatMoney(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 2
  }).format(Number.isFinite(amount) ? amount : 0);
}

function monthLabel(monthYear) {
  if (!monthYear || !/^\d{4}-\d{2}$/.test(monthYear)) return monthYear || '--';
  const [year, month] = monthYear.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

const EmployeeSalaryPage = () => {
  const { isDarkMode = false } = useOutletContext() || {};
  const [salary, setSalary] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [components, setComponents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setIsLoading(true);
        setError('');

        const [salaryPayload, payslipsPayload, componentsPayload] = await Promise.all([
          payrollService.getMySalary(),
          payrollService.getMyPayslips(),
          payrollService.getComponents()
        ]);

        if (cancelled) return;

        setSalary(salaryPayload?.data || null);
        setPayslips(payslipsPayload?.data?.payslips || []);
        setComponents((componentsPayload?.data || []).filter((item) => item.isActive));
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || 'Unable to load salary details.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const structureRows = useMemo(() => {
    if (!salary) return [];

    const baseSalary = Number(salary.baseSalary || 0);
    const rows = [{ name: 'Basic Salary', value: formatMoney(baseSalary), type: 'earning' }];

    components.forEach((component) => {
      const numericValue = Number(component.value || 0);
      const amount = component.valueType === 'fixed'
        ? numericValue
        : (baseSalary * numericValue) / 100;

      rows.push({
        name: component.name,
        value: formatMoney(amount),
        type: component.componentType
      });
    });

    return rows;
  }, [salary, components]);

  const handleDownload = async (payslipId) => {
    try {
      const blob = await payrollService.downloadPayslipPdf(payslipId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payslip-${payslipId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError.message || 'Failed to download payslip.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>My Salary</h1>
        <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          Track your salary structure and monthly payslips.
        </p>
      </div>

      {error && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-rose-500/30 bg-rose-500/10 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
          {error}
        </div>
      )}

      {isLoading && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
          Loading salary details...
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Annual CTC', value: salary ? formatMoney(salary.annualCtc) : '--', icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Last Net Pay', value: salary ? formatMoney(salary.lastNetPay) : '--', icon: Receipt, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Latest Payslip', value: salary?.latestMonth ? monthLabel(salary.latestMonth) : '--', icon: Calendar, color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className={`rounded-2xl border shadow-sm p-5 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${isDarkMode ? 'bg-white/5' : card.bg}`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{card.value}</div>
            <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{card.label}</div>
          </motion.div>
        ))}
      </div>

      <div className={`rounded-2xl border shadow-sm p-6 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
        <h3 className={`text-base font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Salary Structure</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {structureRows.map((row) => (
            <div key={row.name} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-gray-50 border-gray-100'}`}>
              <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                {row.name} ({row.type})
              </span>
              <span className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
        <div className={`px-5 py-4 border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
          <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Payslip History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Month</th>
                <th className={`text-right px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Gross</th>
                <th className={`text-right px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Deductions</th>
                <th className={`text-right px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Net</th>
                <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Status</th>
                <th className={`text-right px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-gray-50'}`}>
              {payslips.map((row) => (
                <tr key={row.id} className={isDarkMode ? 'hover:bg-slate-900/60' : 'hover:bg-gray-50/50'}>
                  <td className={`px-5 py-3.5 text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{monthLabel(row.monthYear)}</td>
                  <td className={`px-5 py-3.5 text-sm text-right ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{formatMoney(row.grossPay)}</td>
                  <td className={`px-5 py-3.5 text-sm text-right ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{formatMoney(row.deductions)}</td>
                  <td className={`px-5 py-3.5 text-sm font-semibold text-right ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{formatMoney(row.netPay)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${row.status === 'paid' ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200') : (isDarkMode ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200')}`}>
                      {String(row.status).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => handleDownload(row.id)}
                      className={`inline-flex items-center gap-1.5 text-sm font-medium ${isDarkMode ? 'text-cyan-300 hover:text-cyan-200' : 'text-blue-600 hover:text-blue-700'}`}
                    >
                      <Download className="w-4 h-4" />
                      Payslip
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && payslips.length === 0 && (
                <tr>
                  <td colSpan={6} className={`px-5 py-6 text-sm text-center ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    No payslips available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EmployeeSalaryPage;
