import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Calendar, Download, Printer, RefreshCw, BarChart3 } from 'lucide-react';

const reportTypeOptions = [
  { value: 'monthly_summary', label: 'Monthly Summary' },
  { value: 'late_arrivals', label: 'Late Arrivals' },
  { value: 'absentee_report', label: 'Absentee Report' },
  { value: 'overtime_report', label: 'Overtime Report' },
  { value: 'employee_detailed', label: 'Employee Detailed Attendance' }
];

function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addMonths(date, months) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const maxDayInTargetMonth = new Date(year, month + months + 1, 0).getDate();
  return new Date(year, month + months, Math.min(day, maxDayInTargetMonth));
}

function buildDefaultDateRange() {
  const today = new Date();
  return {
    startDate: formatDateForInput(today),
    endDate: formatDateForInput(addMonths(today, 1))
  };
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

function openPrintWindow({ title, subtitle, columns, rows }) {
  const printWindow = window.open('', '_blank', 'width=1000,height=700');
  if (!printWindow) {
    return;
  }

  const head = columns.map((col) => `<th>${col.label}</th>`).join('');
  const body = rows.map((row) => {
    const cells = columns.map((col) => `<td>${String(row[col.key] ?? '-')}</td>`).join('');
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
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
          th { background: #f3f4f6; font-weight: 700; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>${subtitle}</p>
        <table>
          <thead><tr>${head}</tr></thead>
          <tbody>${body || '<tr><td colspan="100%">No data</td></tr>'}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

const AttendanceReportPage = () => {
  const { isDarkMode = false } = useOutletContext() || {};
  const token = localStorage.getItem('erp_token');

  const [dateRange, setDateRange] = useState(() => buildDefaultDateRange());
  const [todayOnly, setTodayOnly] = useState(false);
  const [reportType, setReportType] = useState('monthly_summary');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState({
    title: 'Attendance Report',
    note: null,
    columns: [],
    rows: []
  });
  const { startDate, endDate } = dateRange;

  const activeTypeLabel = useMemo(() => {
    const matched = reportTypeOptions.find((option) => option.value === reportType);
    return matched ? matched.label : 'Attendance Report';
  }, [reportType]);

  const loadReport = async () => {
    if (!token) {
      setError('Login session missing. Please login again.');
      return;
    }

    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }

    if (startDate > endDate) {
      setError('Start date cannot be after end date.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const query = new URLSearchParams({
        type: reportType,
        startDate,
        endDate
      });

      const response = await fetch(`http://localhost:5000/api/hr/attendance/reports?${query.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to fetch attendance report');
      }

      setReportData({
        title: payload?.data?.title || 'Attendance Report',
        note: payload?.data?.note || null,
        columns: Array.isArray(payload?.data?.columns) ? payload.data.columns : [],
        rows: Array.isArray(payload?.data?.rows) ? payload.data.rows : []
      });
    } catch (loadError) {
      setError(loadError.message || 'Failed to fetch attendance report');
      setReportData({ title: 'Attendance Report', note: null, columns: [], rows: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [startDate, endDate, reportType]);

  const handleTodayOnlyChange = (event) => {
    const checked = event.target.checked;
    setTodayOnly(checked);

    if (checked) {
      const today = formatDateForInput(new Date());
      setDateRange({
        startDate: today,
        endDate: today
      });
      return;
    }

    setDateRange(buildDefaultDateRange());
  };

  const handleDownloadCsv = () => {
    if (!reportData.columns.length) return;
    const fileName = `attendance-${reportType}-${startDate}-to-${endDate}.csv`;
    downloadCsv(fileName, reportData.columns, reportData.rows);
  };

  const handlePrint = () => {
    openPrintWindow({
      title: reportData.title || 'Attendance Report',
      subtitle: `${activeTypeLabel} | Date Range: ${startDate} to ${endDate}`,
      columns: reportData.columns,
      rows: reportData.rows
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Attendance Report</h1>
        <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>View, download and print attendance reports</p>
      </div>

      {error && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {error}
        </div>
      )}

      <div className={`rounded-2xl border shadow-sm p-5 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Report Type</label>
            <select
              value={reportType}
              onChange={(event) => setReportType(event.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`}
            >
              {reportTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Date Range</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <Calendar className={`w-4 h-4 absolute left-3 top-2.5 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
                <input
                  type="date"
                  value={startDate}
                  disabled={todayOnly}
                  onChange={(event) => setDateRange((prev) => ({ ...prev, startDate: event.target.value }))}
                  className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm disabled:opacity-60 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>
              <div className="relative">
                <Calendar className={`w-4 h-4 absolute left-3 top-2.5 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
                <input
                  type="date"
                  value={endDate}
                  disabled={todayOnly}
                  onChange={(event) => setDateRange((prev) => ({ ...prev, endDate: event.target.value }))}
                  className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm disabled:opacity-60 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={loadReport}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white self-end ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            <RefreshCw className="w-4 h-4" />
            {loading ? 'Loading...' : 'Refresh'}
          </button>

          <div className="flex gap-2 self-end">
            <label className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium ${isDarkMode ? 'border-slate-700 text-slate-200' : 'border-gray-300 text-gray-700'}`}>
              <input
                type="checkbox"
                checked={todayOnly}
                onChange={handleTodayOnlyChange}
                className={`h-4 w-4 rounded border ${isDarkMode ? 'bg-slate-900 border-slate-700 text-cyan-500' : 'border-gray-300 text-blue-600'}`}
              />
              Today
            </label>
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={!reportData.columns.length}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border disabled:opacity-50 ${isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={!reportData.columns.length}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border disabled:opacity-50 ${isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>
      </div>

      <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
        <div className={`px-5 py-4 border-b flex items-center gap-2 ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
          <BarChart3 className={`w-4 h-4 ${isDarkMode ? 'text-cyan-300' : 'text-blue-600'}`} />
          <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{reportData.title || activeTypeLabel}</h3>
        </div>

        {reportData.note && (
          <div className={`px-5 py-3 text-xs border-b ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-gray-100 text-gray-500'}`}>
            {reportData.note}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                {reportData.columns.map((col) => (
                  <th key={col.key} className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-gray-50'}`}>
              {loading && (
                <tr>
                  <td className={`px-5 py-6 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`} colSpan={Math.max(1, reportData.columns.length)}>
                    Loading report data...
                  </td>
                </tr>
              )}
              {!loading && reportData.rows.length === 0 && (
                <tr>
                  <td className={`px-5 py-6 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`} colSpan={Math.max(1, reportData.columns.length)}>
                    No data found for selected date range and report type.
                  </td>
                </tr>
              )}
              {!loading && reportData.rows.map((row, index) => (
                <tr key={`row-${index}`}>
                  {reportData.columns.map((col) => (
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

export default AttendanceReportPage;
