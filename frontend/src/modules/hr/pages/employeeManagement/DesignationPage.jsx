import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';

const DesignationPage = () => {
  const { isDarkMode = false } = useOutletContext() || {};
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [designationForm, setDesignationForm] = useState({ departmentId: '', title: '' });

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
      setDesignations(payload.data?.designations || []);
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

  const groupedDesignations = useMemo(() => {
    const grouped = {};
    for (const des of designations) {
      const key = des.departmentName || 'Unassigned';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(des);
    }
    return grouped;
  }, [designations]);

  const departmentOptions = useMemo(() => {
    return [...departments]
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      .map((dept) => ({ id: dept.id, label: departmentPathMap.get(dept.id) || dept.name }));
  }, [departments, departmentPathMap]);

  const handleCreateDesignation = async (e) => {
    e.preventDefault();
    if (!token) return;

    setError('');
    setMessage('');

    try {
      const response = await fetch('http://localhost:5000/api/hr/organization/designations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          departmentId: Number(designationForm.departmentId),
          title: designationForm.title
        })
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to create designation');
      }

      setDesignationForm({ departmentId: '', title: '' });
      setMessage('Designation created successfully');
      await fetchOptions();
    } catch (err) {
      setError(err.message || 'Failed to create designation');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Designations</h1>
        <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          Create and manage designation titles for each department.
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

      <div className={`rounded-2xl border p-5 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10' : 'bg-white border-gray-100'}`}>
        <h2 className={`text-lg font-semibold flex items-center gap-2 mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          <Briefcase className="w-5 h-5" /> Create Designation
        </h2>
        <form onSubmit={handleCreateDesignation} className="space-y-3">
          <select
            value={designationForm.departmentId}
            onChange={(e) => setDesignationForm((prev) => ({ ...prev, departmentId: e.target.value }))}
            className={`w-full px-4 py-2.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`}
            required
          >
            <option value="">Select department</option>
            {departmentOptions.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.label}</option>
            ))}
          </select>
          <input
            type="text"
            value={designationForm.title}
            onChange={(e) => setDesignationForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Designation title"
            className={`w-full px-4 py-2.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`}
            required
          />
          <button type="submit" className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-700'}`}>
            <Plus className="w-4 h-4" /> Add Designation
          </button>
        </form>
      </div>

      <div className={`rounded-2xl border p-5 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10' : 'bg-white border-gray-100'}`}>
        <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Current Structure</h2>
        {loading ? (
          <p className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Loading...</p>
        ) : Object.keys(groupedDesignations).length === 0 ? (
          <p className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>No designations yet.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedDesignations).map(([deptName, items]) => (
              <div key={deptName}>
                <p className={`font-medium ${isDarkMode ? 'text-cyan-300' : 'text-blue-700'}`}>
                  {departmentPathMap.get(items[0]?.departmentId) || deptName}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {items.map((item) => (
                    <span key={item.id} className={`px-3 py-1 rounded-full text-xs ${isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-gray-100 text-gray-700'}`}>
                      {item.title}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DesignationPage;
