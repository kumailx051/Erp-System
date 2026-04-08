import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { CheckCircle2, Circle, PlayCircle, ShieldCheck, FileCheck } from 'lucide-react';
import { payrollService } from '../../services/payrollService';

const steps = [
  { id: 1, title: 'Lock Attendance Data', desc: 'Freeze attendance and overtime records for selected period.' },
  { id: 2, title: 'Compute Earnings & Deductions', desc: 'Apply salary templates, arrears and statutory deductions.' },
  { id: 3, title: 'Review Exceptions', desc: 'Resolve missing bank details and validation warnings.' },
  { id: 4, title: 'Approve Payroll Run', desc: 'Manager/HR approval before disbursement export.' },
  { id: 5, title: 'Generate Payslips', desc: 'Publish employee payslips and payroll register.' },
];

const PayrollProcessing = () => {
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });
  const { month, year } = period;

  const [currentStep, setCurrentStep] = useState(1);
  const [runSummary, setRunSummary] = useState(null);
  const [status, setStatus] = useState('draft');
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState('');
  const { isDarkMode = false } = useOutletContext() || {};

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const next = { month: now.getMonth() + 1, year: now.getFullYear() };

      setPeriod((prev) => {
        if (prev.month === next.month && prev.year === next.year) {
          return prev;
        }
        return next;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        setIsLoading(true);
        setError('');
        // Reset UI state while loading a new month so the flow always starts fresh for unseen periods.
        setCurrentStep(1);
        setStatus('draft');
        setRunSummary(null);
        const payload = await payrollService.getProcessStatus(month, year);
        if (cancelled) return;
        setCurrentStep(Number(payload?.data?.currentStep || 1));
        setRunSummary(payload?.data?.summary || null);
        setStatus(payload?.data?.status || 'draft');
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || 'Unable to load process status.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadStatus();
    return () => {
      cancelled = true;
    };
  }, [month, year]);

  const monthLabel = useMemo(
    () => new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    [month, year]
  );

  const isProcessCompleted = currentStep >= steps.length || status === 'published';

  const onGenerate = async () => {
    try {
      setIsWorking(true);
      setError('');
      await payrollService.generateProcess(month, year);
      const payload = await payrollService.getProcessStatus(month, year);
      setCurrentStep(Number(payload?.data?.currentStep || 2));
      setRunSummary(payload?.data?.summary || null);
      setStatus(payload?.data?.status || 'processing');
    } catch (actionError) {
      setError(actionError.message || 'Failed to generate payroll.');
    } finally {
      setIsWorking(false);
    }
  };

  const onAdvance = async () => {
    try {
      setIsWorking(true);
      setError('');
      const payload = await payrollService.advanceProcess(month, year);
      setCurrentStep(Number(payload?.data?.currentStep || currentStep));
      setRunSummary(payload?.data?.summary || null);
      setStatus(payload?.data?.status || status);
    } catch (actionError) {
      setError(actionError.message || 'Failed to advance payroll process.');
    } finally {
      setIsWorking(false);
    }
  };

  const onPublish = async () => {
    try {
      setIsWorking(true);
      setError('');
      const payload = await payrollService.publishProcess(month, year);
      setCurrentStep(Number(payload?.data?.currentStep || steps.length));
      setRunSummary(payload?.data?.summary || null);
      setStatus(payload?.data?.status || 'published');
    } catch (actionError) {
      setError(actionError.message || 'Failed to publish payroll.');
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Payroll Processing</h1>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{monthLabel} payroll run workflow</p>
        </div>
      </div>

      {error && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-rose-500/30 bg-rose-500/10 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
          {error}
        </div>
      )}

      {isLoading && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
          Loading payroll process...
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`lg:col-span-2 rounded-2xl border shadow-sm p-6 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
          <h3 className={`text-base font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Processing Steps</h3>
          <div className="space-y-3">
            {steps.map((step) => {
              const isFinalStep = step.id === steps.length;
              const done = step.id < currentStep || (isFinalStep && isProcessCompleted);
              const active = step.id === currentStep && !(isFinalStep && isProcessCompleted);
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl border p-4 transition-colors ${
                    active ? (isDarkMode ? 'border-cyan-500/30 bg-cyan-500/10' : 'border-blue-200 bg-blue-50') : done ? (isDarkMode ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50') : (isDarkMode ? 'border-slate-700 bg-slate-900/70' : 'border-gray-200 bg-white')
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {done ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : active ? (
                        <PlayCircle className={`w-5 h-5 ${isDarkMode ? 'text-cyan-300' : 'text-blue-600'}`} />
                      ) : (
                        <Circle className={`w-5 h-5 ${isDarkMode ? 'text-slate-600' : 'text-gray-300'}`} />
                      )}
                    </div>
                    <div>
                      <div className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{step.title}</div>
                      <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{step.desc}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={onGenerate}
              className={`px-4 py-2.5 rounded-xl border text-sm font-medium ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              {isWorking ? 'Working...' : 'Generate Payroll'}
            </button>
            {!isProcessCompleted && (
              <button
                onClick={onAdvance}
                className={`px-4 py-2.5 rounded-xl text-white text-sm font-semibold ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-950/30' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isWorking ? 'Working...' : 'Next Step'}
              </button>
            )}
          </div>
        </div>

        <div className={`rounded-2xl border shadow-sm p-6 space-y-4 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
          <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Run Summary</h3>
          <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-cyan-500/20 bg-cyan-500/10' : 'border-blue-200 bg-blue-50'}`}>
            <p className={`text-xs uppercase tracking-wide font-semibold ${isDarkMode ? 'text-cyan-300' : 'text-blue-700'}`}>Current Payroll Month</p>
            <p className={`text-3xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{monthLabel}</p>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Month</span>
              <span className={`font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{monthLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Employees</span>
              <span className={`font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{runSummary?.employeeCount || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Exceptions</span>
              <span className="font-medium text-amber-600">{runSummary?.pendingCount || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Estimated Net</span>
              <span className={`font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(Number(runSummary?.netPayroll || 0))}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Run Status</span>
              <span className={`font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{String(status).toUpperCase()}</span>
            </div>
          </div>

          <div className={`rounded-xl border p-4 text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
            <div className={`flex items-center gap-2 mb-2 font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>
              <ShieldCheck className={`w-4 h-4 ${isDarkMode ? 'text-cyan-300' : 'text-blue-600'}`} />
              Approval Required
            </div>
            Final payroll cannot be published until all exceptions are resolved.
          </div>

          <button
            onClick={onPublish}
            className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-950/30' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            <FileCheck className="w-4 h-4" />
            {isWorking ? 'Publishing...' : 'Publish Payroll'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayrollProcessing;
