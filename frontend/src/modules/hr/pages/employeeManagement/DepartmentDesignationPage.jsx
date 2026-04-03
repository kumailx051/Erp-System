import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, Plus, AlertCircle, CheckCircle2, GitBranch } from 'lucide-react';

const DepartmentDesignationPage = () => {
  const { isDarkMode = false } = useOutletContext() || {};
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [departmentForm, setDepartmentForm] = useState({ name: '', description: '' });
  const [departmentMode, setDepartmentMode] = useState('root');
  const [parentDepartmentId, setParentDepartmentId] = useState('');

  const token = localStorage.getItem('erp_token');

  const fetchOptions = async () => {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/hr/organization/options', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to fetch departments/designations');
      }

      setDepartments(payload.data?.departments || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch departments/designations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  const departmentMap = useMemo(() => {
    const map = new Map();
    departments.forEach((dept) => map.set(dept.id, dept));
    return map;
  }, [departments]);

  const departmentPathMap = useMemo(() => {
    const cache = new Map();

    const resolvePath = (id, visited = new Set()) => {
      if (!id || visited.has(id)) {
        return '';
      }
      if (cache.has(id)) {
        return cache.get(id);
      }

      visited.add(id);
      const current = departmentMap.get(id);
      if (!current) {
        return '';
      }

      const parentId = current.parentDepartmentId;
      const parentPath = parentId ? resolvePath(parentId, visited) : '';
      const path = parentPath ? `${parentPath} > ${current.name}` : current.name;
      cache.set(id, path);
      return path;
    };

    departments.forEach((dept) => {
      resolvePath(dept.id);
    });

    return cache;
  }, [departments, departmentMap]);

  const departmentTree = useMemo(() => {
    const byParent = new Map();

    for (const dept of departments) {
      const parentId = dept.parentDepartmentId || null;
      if (!byParent.has(parentId)) {
        byParent.set(parentId, []);
      }
      byParent.get(parentId).push(dept);
    }

    for (const list of byParent.values()) {
      list.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    }

    const buildNodes = (parentId = null, level = 0) => {
      const children = byParent.get(parentId) || [];
      return children.map((child) => ({
        ...child,
        level,
        children: buildNodes(child.id, level + 1)
      }));
    };

    return buildNodes(null, 0);
  }, [departments]);

  const flattenTree = (nodes) => {
    const result = [];
    const stack = [...nodes].reverse();

    while (stack.length > 0) {
      const node = stack.pop();
      result.push(node);
      const children = [...(node.children || [])].reverse();
      children.forEach((child) => stack.push(child));
    }

    return result;
  };

  const flattenedDepartments = useMemo(() => flattenTree(departmentTree), [departmentTree]);

  const departmentOptionsForSelect = useMemo(() => {
    return flattenedDepartments.map((dept) => ({
      id: dept.id,
      label: `${dept.level > 0 ? `${'↳ '.repeat(dept.level)}` : ''}${dept.name}`
    }));
  }, [flattenedDepartments]);

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!token) return;

    setError('');
    setMessage('');

    try {
      const response = await fetch('http://localhost:5000/api/hr/organization/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...departmentForm,
          parentDepartmentId: departmentMode === 'sub' ? Number(parentDepartmentId) : null
        })
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to create department');
      }

      setDepartmentForm({ name: '', description: '' });
      setDepartmentMode('root');
      setParentDepartmentId('');
      setMessage('Department created successfully');
      await fetchOptions();
    } catch (err) {
      setError(err.message || 'Failed to create department');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Departments</h1>
        <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          Create and manage department hierarchy for employee work details.
        </p>
      </div>

      {message && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl px-4 py-3 text-sm border flex items-center gap-2 ${isDarkMode ? 'bg-emerald-900/20 border-emerald-600/30 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
          <CheckCircle2 className="w-4 h-4" /> {message}
        </motion.div>
      )}
      {error && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl px-4 py-3 text-sm border flex items-center gap-2 ${isDarkMode ? 'bg-red-900/20 border-red-600/30 text-red-200' : 'bg-red-50 border-red-200 text-red-700'}`}>
          <AlertCircle className="w-4 h-4" /> {error}
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-6">
        <div className={`rounded-2xl border p-5 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10' : 'bg-white border-gray-100'}`}>
          <h2 className={`text-lg font-semibold flex items-center gap-2 mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <Building2 className="w-5 h-5" /> Create Department
          </h2>
          <form onSubmit={handleCreateDepartment} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`block mb-1 text-xs font-medium uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Department Type</label>
                <select
                  value={departmentMode}
                  onChange={(e) => {
                    const next = e.target.value;
                    setDepartmentMode(next);
                    if (next === 'root') {
                      setParentDepartmentId('');
                    }
                  }}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`}
                >
                  <option value="root">Main Department</option>
                  <option value="sub">Sub Department</option>
                </select>
              </div>

              <div>
                <label className={`block mb-1 text-xs font-medium uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Parent Department</label>
                <select
                  value={parentDepartmentId}
                  onChange={(e) => setParentDepartmentId(e.target.value)}
                  disabled={departmentMode !== 'sub'}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 disabled:bg-slate-800/60 disabled:text-slate-500' : 'bg-white border-gray-200 text-gray-800 disabled:bg-gray-100 disabled:text-gray-400'}`}
                  required={departmentMode === 'sub'}
                >
                  <option value="">Select parent department</option>
                  {departmentOptionsForSelect.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <input
              type="text"
              value={departmentForm.name}
              onChange={(e) => setDepartmentForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Department name"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`}
              required
            />
            <textarea
              value={departmentForm.description}
              onChange={(e) => setDepartmentForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Description (optional)"
              rows={3}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`}
            />
            <button type="submit" className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-700'}`}>
              <Plus className="w-4 h-4" /> Add Department
            </button>
          </form>
        </div>
      </div>

      <div className={`rounded-2xl border p-5 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10' : 'bg-white border-gray-100'}`}>
        <h2 className={`text-lg font-semibold flex items-center gap-2 mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          <GitBranch className="w-5 h-5" /> Department Hierarchy
        </h2>
        {loading ? (
          <p className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Loading...</p>
        ) : departmentTree.length === 0 ? (
          <p className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>No departments yet.</p>
        ) : (
          <div className="space-y-2">
            {flattenedDepartments.map((dept) => (
              <div key={`tree-${dept.id}`} className={`rounded-xl px-3 py-2 border ${isDarkMode ? 'border-slate-800 bg-slate-900/40' : 'border-gray-100 bg-gray-50/70'}`}>
                <div className="flex items-center justify-between" style={{ paddingLeft: `${dept.level * 18}px` }}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${dept.level > 0 ? (isDarkMode ? 'text-amber-300' : 'text-amber-600') : (isDarkMode ? 'text-cyan-300' : 'text-blue-600')}`}>
                      {dept.level > 0 ? '↳' : '●'}
                    </span>
                    <span className={`text-sm font-medium ${dept.level > 0 ? (isDarkMode ? 'text-amber-200' : 'text-amber-700') : (isDarkMode ? 'text-cyan-300' : 'text-blue-700')}`}>
                      {dept.name}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${dept.level > 0 ? (isDarkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-700') : (isDarkMode ? 'bg-cyan-500/15 text-cyan-300' : 'bg-blue-100 text-blue-700')}`}>
                    {dept.level > 0 ? `Sub Dept L${dept.level}` : 'Main Dept'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default DepartmentDesignationPage;
