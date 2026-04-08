import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { Settings, Percent, Landmark, Plus, X, Trash2, PencilLine, Save } from 'lucide-react';
import { payrollService } from '../../services/payrollService';

const defaultComponentForm = {
  name: '',
  componentType: 'earning',
  valueType: 'fixed',
  value: '',
  percentageOf: 'base_salary',
  isTaxable: false,
  isActive: true
};

const defaultRuleDraft = {
  salary_basis: { mode: 'fixed_30' },
  paid_leave_treatment: { mode: 'paid' },
  leave_deduction_rate: { rate: 1 },
  overtime_multiplier: { multiplier: 1.5 },
  proration_mode: { mode: 'daily' }
};

function formatMoney(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 2
  }).format(Number.isFinite(amount) ? amount : 0);
}

const PayrollSettings = () => {
  const { isDarkMode = false } = useOutletContext() || {};
  const [components, setComponents] = useState([]);
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [componentModalOpen, setComponentModalOpen] = useState(false);
  const [editingComponentId, setEditingComponentId] = useState(null);
  const [componentForm, setComponentForm] = useState(defaultComponentForm);
  const [isSavingComponent, setIsSavingComponent] = useState(false);
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [ruleDraft, setRuleDraft] = useState(defaultRuleDraft);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError('');
      const [componentsPayload, rulesPayload] = await Promise.all([
        payrollService.getComponents(),
        payrollService.getRules()
      ]);

      setComponents(componentsPayload?.data || []);
      setRules(rulesPayload?.data || []);

      const nextRuleDraft = { ...defaultRuleDraft };
      (rulesPayload?.data || []).forEach((rule) => {
        if (rule.key === 'salary_basis') {
          nextRuleDraft.salary_basis = { mode: rule.value?.mode || 'fixed_30' };
        }
        if (rule.key === 'paid_leave_treatment') {
          nextRuleDraft.paid_leave_treatment = { mode: rule.value?.mode || 'paid' };
        }
        if (rule.key === 'leave_deduction_rate') {
          nextRuleDraft.leave_deduction_rate = { rate: Number(rule.value?.rate ?? 1) };
        }
        if (rule.key === 'overtime_multiplier') {
          nextRuleDraft.overtime_multiplier = { multiplier: Number(rule.value?.multiplier ?? 1.5) };
        }
        if (rule.key === 'proration_mode') {
          nextRuleDraft.proration_mode = { mode: rule.value?.mode || 'daily' };
        }
      });
      setRuleDraft(nextRuleDraft);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load payroll settings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const openCreateModal = () => {
    setEditingComponentId(null);
    setComponentForm(defaultComponentForm);
    setComponentModalOpen(true);
  };

  const openEditModal = (component) => {
    setEditingComponentId(component.id);
    setComponentForm({
      name: component.name || '',
      componentType: component.componentType || 'earning',
      valueType: component.valueType || 'fixed',
      value: String(component.value ?? ''),
      percentageOf: component.percentageOf || 'base_salary',
      isTaxable: Boolean(component.isTaxable),
      isActive: Boolean(component.isActive)
    });
    setComponentModalOpen(true);
  };

  const saveComponent = async () => {
    try {
      setIsSavingComponent(true);
      setError('');

      const payload = {
        name: String(componentForm.name || '').trim(),
        componentType: componentForm.componentType,
        valueType: componentForm.valueType,
        value: Number(componentForm.value || 0),
        percentageOf: componentForm.percentageOf,
        isTaxable: Boolean(componentForm.isTaxable),
        isActive: Boolean(componentForm.isActive)
      };

      if (!payload.name) {
        throw new Error('Component name is required');
      }

      if (editingComponentId) {
        await payrollService.updateComponent(editingComponentId, payload);
      } else {
        await payrollService.createComponent(payload);
      }

      setComponentModalOpen(false);
      setEditingComponentId(null);
      setComponentForm(defaultComponentForm);
      await loadSettings();
    } catch (actionError) {
      setError(actionError.message || 'Failed to save component.');
    } finally {
      setIsSavingComponent(false);
    }
  };

  const deleteComponent = async (component) => {
    setDeleteTarget(component);
  };

  const confirmDeleteComponent = async () => {
    if (!deleteTarget) return;

    try {
      setError('');
      await payrollService.deleteComponent(deleteTarget.id);
      setDeleteTarget(null);
      await loadSettings();
    } catch (actionError) {
      setError(actionError.message || 'Failed to delete component.');
    }
  };

  const saveRules = async () => {
    try {
      setIsSavingRules(true);
      setError('');

      const payload = [
        {
          key: 'salary_basis',
          label: 'Salary Basis',
          category: 'salary',
          value: ruleDraft.salary_basis,
          description: 'Choose whether monthly salary is prorated over 30 days or calendar days.'
        },
        {
          key: 'paid_leave_treatment',
          label: 'Paid Leave Treatment',
          category: 'leave',
          value: ruleDraft.paid_leave_treatment,
          description: 'Control whether approved paid leaves are fully paid or deducted.'
        },
        {
          key: 'leave_deduction_rate',
          label: 'Leave Deduction Rate',
          category: 'leave',
          value: ruleDraft.leave_deduction_rate,
          description: 'Percentage of daily salary deducted for unpaid leave days.'
        },
        {
          key: 'overtime_multiplier',
          label: 'Overtime Multiplier',
          category: 'overtime',
          value: ruleDraft.overtime_multiplier,
          description: 'Multiplier applied to the hourly overtime rate.'
        },
        {
          key: 'proration_mode',
          label: 'Proration Mode',
          category: 'salary',
          value: ruleDraft.proration_mode,
          description: 'Controls how base salary is prorated across payable days.'
        }
      ];

      await payrollService.saveRules(payload);
      await loadSettings();
    } catch (actionError) {
      setError(actionError.message || 'Failed to save payroll rules.');
    } finally {
      setIsSavingRules(false);
    }
  };

  const componentSummary = useMemo(() => ({
    earnings: components.filter((item) => item.componentType === 'earning').length,
    deductions: components.filter((item) => item.componentType === 'deduction').length,
    active: components.filter((item) => item.isActive).length
  }), [components]);

  return (
    <div className="space-y-6">
      <div>
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Payroll Settings</h1>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Configure salary components, statutory rules and templates</p>
        </div>
      </div>

      {error && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-rose-500/30 bg-rose-500/10 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
          {error}
        </div>
      )}

      {isLoading && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
          Loading payroll components...
        </div>
      )}

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

      <div className={`rounded-2xl border shadow-sm p-6 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Payroll Rules</h3>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>These settings affect real salary calculations for every employee.</p>
          </div>
          <button
            onClick={saveRules}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-950/30' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            <Save className="w-4 h-4" />
            {isSavingRules ? 'Saving...' : 'Save Rules'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-gray-100 bg-gray-50'}`}>
            <p className={`text-xs uppercase font-semibold ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Salary Basis</p>
            <select
              value={ruleDraft.salary_basis.mode}
              onChange={(e) => setRuleDraft((prev) => ({ ...prev, salary_basis: { ...prev.salary_basis, mode: e.target.value } }))}
              className={`mt-2 w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`}
            >
              <option value="fixed_30">Fixed 30 Days</option>
              <option value="calendar_days">Calendar Days</option>
            </select>
          </div>

          <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-gray-100 bg-gray-50'}`}>
            <p className={`text-xs uppercase font-semibold ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Paid Leave Treatment</p>
            <select
              value={ruleDraft.paid_leave_treatment.mode}
              onChange={(e) => setRuleDraft((prev) => ({ ...prev, paid_leave_treatment: { ...prev.paid_leave_treatment, mode: e.target.value } }))}
              className={`mt-2 w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`}
            >
              <option value="paid">Paid</option>
              <option value="deduct">Deduct</option>
            </select>
          </div>

          <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-gray-100 bg-gray-50'}`}>
            <p className={`text-xs uppercase font-semibold ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Leave Deduction Rate</p>
            <input
              type="number"
              min="0"
              step="0.01"
              value={ruleDraft.leave_deduction_rate.rate}
              onChange={(e) => setRuleDraft((prev) => ({ ...prev, leave_deduction_rate: { ...prev.leave_deduction_rate, rate: e.target.value } }))}
              className={`mt-2 w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`}
            />
          </div>

          <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-gray-100 bg-gray-50'}`}>
            <p className={`text-xs uppercase font-semibold ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Overtime Multiplier</p>
            <input
              type="number"
              min="0"
              step="0.01"
              value={ruleDraft.overtime_multiplier.multiplier}
              onChange={(e) => setRuleDraft((prev) => ({ ...prev, overtime_multiplier: { ...prev.overtime_multiplier, multiplier: e.target.value } }))}
              className={`mt-2 w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`}
            />
          </div>
        </div>

        <div className={`mt-4 rounded-xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-gray-100 bg-gray-50'}`}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>Proration Mode</p>
            <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Used when salary is prorated by attendance and leave.</span>
          </div>
          <select
            value={ruleDraft.proration_mode.mode}
            onChange={(e) => setRuleDraft((prev) => ({ ...prev, proration_mode: { ...prev.proration_mode, mode: e.target.value } }))}
            className={`w-full max-w-sm px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`}
          >
            <option value="daily">Daily Proration</option>
            <option value="monthly">Monthly Fixed</option>
          </select>
        </div>
      </div>

      <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
        <div className={`px-5 py-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
          <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Salary Components</h3>
          <button
            onClick={openCreateModal}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-semibold ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-950/30' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
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
                <th className={`text-left px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Active</th>
                <th className={`text-right px-5 py-3 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-gray-50'}`}>
              {components.map((row, i) => (
                <motion.tr key={row.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={isDarkMode ? 'hover:bg-slate-900/60' : 'hover:bg-gray-50/50'}>
                  <td className={`px-5 py-3.5 text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{row.name}</td>
                  <td className={`px-5 py-3.5 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{row.componentType}</td>
                  <td className={`px-5 py-3.5 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                    {row.valueType === 'fixed' ? formatMoney(row.value) : `${row.value}% of ${row.percentageOf === 'gross_pay' ? 'Gross' : 'Base'}`}
                  </td>
                  <td className={`px-5 py-3.5 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{row.isTaxable ? 'Yes' : 'No'}</td>
                  <td className="px-5 py-3.5 text-sm">
                    <button onClick={() => openEditModal(row)} className={`px-2.5 py-1 rounded-lg border ${row.isActive ? (isDarkMode ? 'text-emerald-300 border-emerald-500/30' : 'text-emerald-700 border-emerald-300') : (isDarkMode ? 'text-amber-300 border-amber-500/30' : 'text-amber-700 border-amber-300')}`}>
                      {row.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end items-center gap-2">
                      <button
                        onClick={() => openEditModal(row)}
                        className={`p-2 rounded-lg border ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                        title="Edit component"
                      >
                        <PencilLine className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteComponent(row)}
                        className={`p-2 rounded-lg border ${isDarkMode ? 'border-rose-500/20 text-rose-300 hover:bg-rose-500/10' : 'border-rose-200 text-rose-600 hover:bg-rose-50'}`}
                        title="Delete component"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {!isLoading && components.length === 0 && (
                <tr>
                  <td colSpan={6} className={`px-5 py-6 text-center text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    No salary components configured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {componentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setComponentModalOpen(false)}>
          <div
            className={`w-full max-w-2xl rounded-2xl border shadow-2xl ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/15' : 'bg-white border-gray-200'}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`px-5 py-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <div>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{editingComponentId ? 'Edit Component' : 'Add Component'}</h3>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Enter salary component details before saving.</p>
              </div>
              <button
                onClick={() => setComponentModalOpen(false)}
                className={`p-2 rounded-lg ${isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Component Name</label>
                <input
                  value={componentForm.name}
                  onChange={(e) => setComponentForm((prev) => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`}
                  placeholder="Example: House Rent Allowance"
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Type</label>
                <select
                  value={componentForm.componentType}
                  onChange={(e) => setComponentForm((prev) => ({ ...prev, componentType: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="earning">Earning</option>
                  <option value="deduction">Deduction</option>
                </select>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Calculation Type</label>
                <select
                  value={componentForm.valueType}
                  onChange={(e) => setComponentForm((prev) => ({ ...prev, valueType: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="fixed">Fixed Amount</option>
                  <option value="percentage">Percentage</option>
                </select>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Amount / Percentage</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={componentForm.value}
                  onChange={(e) => setComponentForm((prev) => ({ ...prev, value: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`}
                  placeholder={componentForm.valueType === 'fixed' ? '0.00' : '10'}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Percentage Applies To</label>
                <select
                  value={componentForm.percentageOf}
                  onChange={(e) => setComponentForm((prev) => ({ ...prev, percentageOf: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="base_salary">Base Salary</option>
                  <option value="gross_pay">Gross Pay</option>
                </select>
              </div>

              <div className="flex items-center gap-4 md:col-span-2">
                <label className={`inline-flex items-center gap-2 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  <input
                    type="checkbox"
                    checked={componentForm.isTaxable}
                    onChange={(e) => setComponentForm((prev) => ({ ...prev, isTaxable: e.target.checked }))}
                  />
                  Taxable
                </label>
                <label className={`inline-flex items-center gap-2 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  <input
                    type="checkbox"
                    checked={componentForm.isActive}
                    onChange={(e) => setComponentForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                  />
                  Active
                </label>
              </div>

              <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setComponentModalOpen(false)}
                  className={`px-4 py-2 rounded-lg text-sm ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveComponent}
                  disabled={isSavingComponent}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-white ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-900/50' : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300'} disabled:cursor-not-allowed`}
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSavingComponent ? 'Saving...' : 'Save Component'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl ${isDarkMode ? 'bg-[#0d2230] border-rose-400/20' : 'bg-white border-gray-200'}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`px-5 py-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <div>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Delete Component</h3>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>This action cannot be undone.</p>
              </div>
              <button
                onClick={() => setDeleteTarget(null)}
                className={`p-2 rounded-lg ${isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-rose-500/20 bg-rose-500/10 text-rose-100' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                Are you sure you want to delete <span className="font-semibold">{deleteTarget.name}</span>?
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className={`px-4 py-2 rounded-lg text-sm ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteComponent}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-white ${isDarkMode ? 'bg-rose-600 hover:bg-rose-500' : 'bg-rose-600 hover:bg-rose-700'}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollSettings;
