import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Calendar, Download, Printer, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { payrollService } from '../../services/payrollService';

function money(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 2
  }).format(Number.isFinite(amount) ? amount : 0);
}

function csvEscape(value) {
  const raw = String(value ?? '');
  if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function downloadCsv(filename, columns, rows) {
  const headerLine = columns.map((col) => csvEscape(col.label)).join(',');
  const rowLines = rows.map((row) => columns.map((col) => csvEscape(row[col.key])).join(','));
  const csvContent = [headerLine, ...rowLines].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function openPrintWindow({ title, subtitle, summaryRows, registerColumns, registerRows }) {
  const printWindow = window.open('', '_blank', 'width=1100,height=750');
  if (!printWindow) {
    return;
  }

  const summaryHtml = summaryRows.map((row) => `<tr><td>${row.metric}</td><td>${row.value}</td></tr>`).join('');
  const registerHead = registerColumns.map((col) => `<th>${col.label}</th>`).join('');
  const registerBody = registerRows.map((row) => {
    const cells = registerColumns.map((col) => `<td>${String(row[col.key] ?? '-')}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #111827; }
          h1 { margin: 0 0 4px 0; font-size: 22px; }
          p { margin: 0 0 16px 0; color: #6b7280; }
          h2 { margin-top: 18px; margin-bottom: 8px; font-size: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 12px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
          th { background: #f3f4f6; font-weight: 700; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>${subtitle}</p>

        <h2>Summary</h2>
        <table>
          <thead><tr><th>Metric</th><th>Value</th></tr></thead>
          <tbody>${summaryHtml}</tbody>
        </table>

        <h2>Salary Register</h2>
        <table>
          <thead><tr>${registerHead}</tr></thead>
          <tbody>${registerBody || '<tr><td colspan="100%">No data</td></tr>'}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

const PayrollReportPage = () => {
  const { isDarkMode = false } = useOutletContext() || {};
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [registerRows, setRegisterRows] = useState([]);

  const summaryRows = useMemo(() => {
    if (!summary) return [];
    return [
      { metric: 'Employee Count', value: summary.employeeCount ?? 0 },
      { metric: 'Paid Count', value: summary.paidCount ?? 0 },
      { metric: 'Pending Count', value: summary.pendingCount ?? 0 },
      { metric: 'Gross Payroll', value: money(summary.grossPayroll) },
      { metric: 'Total Deductions', value: money(summary.totalDeductions) },
      { metric: 'Net Payroll', value: money(summary.netPayroll) }
    ];
  }, [summary]);

  const registerColumns = [
    { key: 'employeeCode', label: 'Employee Code' },
    { key: 'employeeName', label: 'Employee' },
    { key: 'department', label: 'Department' },
    { key: 'grossPay', label: 'Gross Pay' },
    { key: 'deductions', label: 'Deductions' },
    { key: 'netPay', label: 'Net Pay' },
    { key: 'status', label: 'Status' }
  ];

  const displayRegisterRows = useMemo(() => (
    registerRows.map((row) => ({
      employeeCode: row.employeeCode || '-',
      employeeName: row.employeeName || '-',
      department: row.department || '-',
      grossPay: money(row.grossPay),
      deductions: money(row.deductions),
      netPay: money(row.netPay),
      status: String(row.status || '').toUpperCase()
    }))
  ), [registerRows]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError('');

      const monthNum = Number(month);
      const yearNum = Number(year);

      const [summaryPayload, registerPayload] = await Promise.all([
        payrollService.getSummary(monthNum, yearNum),
        payrollService.getRegister(monthNum, yearNum)
      ]);

      setSummary(summaryPayload?.data || null);
      setRegisterRows(registerPayload?.data?.rows || []);
    } catch (loadError) {
      setError(loadError.message || 'Failed to fetch payroll report');
      setSummary(null);
      setRegisterRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSummary = () => {
    if (!summaryRows.length) return;
    downloadCsv(`payroll-summary-${year}-${month}.csv`, [
      { key: 'metric', label: 'Metric' },
      { key: 'value', label: 'Value' }
    ], summaryRows);
  };

  const handleDownloadRegister = () => {
    if (!displayRegisterRows.length) return;
    downloadCsv(`payroll-register-${year}-${month}.csv`, registerColumns, displayRegisterRows);
  };

  const handlePrint = () => {
    openPrintWindow({
      title: 'Payroll Report',
      subtitle: `Month: ${month} | Year: ${year}`,
      summaryRows,
      registerColumns,
      registerRows: displayRegisterRows
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Payroll Report</h1>
        <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>View, download and print payroll summary and register</p>
      </div>

      {error && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {error}
        </div>
      )}

      <div className={`rounded-2xl border shadow-sm p-5 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Month</label>
            <div className="relative">
              <Calendar className={`w-4 h-4 absolute left-3 top-2.5 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
              <select
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`}
              >
                {Array.from({ length: 12 }, (_, index) => {
                  const value = String(index + 1).padStart(2, '0');
                  return <option key={value} value={value}>{value}</option>;
                })}
              </select>
            </div>
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Year</label>
            <input
              type="number"
              value={year}
              onChange={(event) => setYear(event.target.value)}
              min="2000"
              max="2100"
              className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`}
            />
          </div>

          <button
            type="button"
            onClick={loadReport}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white self-end ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            <RefreshCw className="w-4 h-4" />
            {loading ? 'Loading...' : 'Load Report'}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={!summaryRows.length && !displayRegisterRows.length}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border self-end disabled:opacity-50 ${isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
          >
            <Printer className="w-4 h-4" />
            Print
          </button>

          <div className="flex gap-2 self-end">
            <button
              type="button"
              onClick={handleDownloadSummary}
              disabled={!summaryRows.length}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border disabled:opacity-50 ${isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
            >
              <Download className="w-4 h-4" />
              Summary
            </button>
            <button
              type="button"
              onClick={handleDownloadRegister}
              disabled={!displayRegisterRows.length}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border disabled:opacity-50 ${isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
            >
              <Download className="w-4 h-4" />
              Register
            </button>
          </div>
        </div>
      </div>

      <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
        <div className={`px-5 py-4 border-b flex items-center gap-2 ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
          <FileSpreadsheet className={`w-4 h-4 ${isDarkMode ? 'text-cyan-300' : 'text-blue-600'}`} />
          <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Payroll Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Metric</th>
                <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Value</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-gray-50'}`}>
              {loading && (
                <tr>
                  <td className={`px-5 py-6 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`} colSpan={2}>Loading summary...</td>
                </tr>
              )}
              {!loading && summaryRows.length === 0 && (
                <tr>
                  <td className={`px-5 py-6 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`} colSpan={2}>No summary data loaded.</td>
                </tr>
              )}
              {!loading && summaryRows.map((row) => (
                <tr key={row.metric}>
                  <td className={`px-5 py-3.5 text-sm ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>{row.metric}</td>
                  <td className={`px-5 py-3.5 text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
        <div className={`px-5 py-4 border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
          <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Salary Register</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                {registerColumns.map((col) => (
                  <th key={col.key} className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-gray-50'}`}>
              {loading && (
                <tr>
                  <td className={`px-5 py-6 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`} colSpan={registerColumns.length}>Loading register...</td>
                </tr>
              )}
              {!loading && displayRegisterRows.length === 0 && (
                <tr>
                  <td className={`px-5 py-6 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`} colSpan={registerColumns.length}>No register data loaded.</td>
                </tr>
              )}
              {!loading && displayRegisterRows.map((row, index) => (
                <tr key={`register-${index}`}>
                  {registerColumns.map((col) => (
                    <td key={`${index}-${col.key}`} className={`px-5 py-3.5 text-sm ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
                      {String(row[col.key] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PayrollReportPage;