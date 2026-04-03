import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { CheckCircle2, Circle, PlayCircle, ShieldCheck, FileCheck } from 'lucide-react';

const steps = [
  { id: 1, title: 'Lock Attendance Data', desc: 'Freeze attendance and overtime records for selected period.' },
  { id: 2, title: 'Compute Earnings & Deductions', desc: 'Apply salary templates, arrears and statutory deductions.' },
  { id: 3, title: 'Review Exceptions', desc: 'Resolve missing bank details and validation warnings.' },
  { id: 4, title: 'Approve Payroll Run', desc: 'Manager/HR approval before disbursement export.' },
  { id: 5, title: 'Generate Payslips', desc: 'Publish employee payslips and payroll register.' },
];

const PayrollProcessing = () => {
  const [currentStep, setCurrentStep] = useState(2);
  const { isDarkMode = false } = useOutletContext() || {};

  return (
    <div className="space-y-6">
      <div>
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Payroll Processing</h1>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>March 2026 payroll run workflow</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`lg:col-span-2 rounded-2xl border shadow-sm p-6 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
          <h3 className={`text-base font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Processing Steps</h3>
          <div className="space-y-3">
            {steps.map((step) => {
              const done = step.id < currentStep;
              const active = step.id === currentStep;
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
              onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
              className={`px-4 py-2.5 rounded-xl border text-sm font-medium ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentStep((s) => Math.min(steps.length, s + 1))}
              className={`px-4 py-2.5 rounded-xl text-white text-sm font-semibold ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-950/30' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              Next Step
            </button>
          </div>
        </div>

        <div className={`rounded-2xl border shadow-sm p-6 space-y-4 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
          <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Run Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Month</span>
              <span className={`font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>March 2026</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Employees</span>
              <span className={`font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>156</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Exceptions</span>
              <span className="font-medium text-amber-600">4</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Estimated Net</span>
              <span className={`font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>$245,820</span>
            </div>
          </div>

          <div className={`rounded-xl border p-4 text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
            <div className={`flex items-center gap-2 mb-2 font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>
              <ShieldCheck className={`w-4 h-4 ${isDarkMode ? 'text-cyan-300' : 'text-blue-600'}`} />
              Approval Required
            </div>
            Final payroll cannot be published until all exceptions are resolved.
          </div>

          <button className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-950/30' : 'bg-blue-600 hover:bg-blue-700'}`}>
            <FileCheck className="w-4 h-4" />
            Publish Payroll
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayrollProcessing;
