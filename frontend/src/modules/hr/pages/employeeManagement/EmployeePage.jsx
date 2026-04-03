import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Users, UserPlus, Building2, Briefcase, Search, Filter,
  Eye, Edit3, Trash2, Download, ChevronDown, ChevronRight, X,
  TrendingUp, UserCheck, UserX, Calendar, Mail, Phone, MapPin
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';

const pieColors = ['#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#64748b'];

const getDepartmentVisual = (departmentName = '') => {
  const name = String(departmentName).toLowerCase();

  if (/eng|develop|software|it|tech|qa|devops/.test(name)) {
    return { icon: '💻', color: 'from-blue-500 to-cyan-500' };
  }
  if (/design|ui|ux|graphic|creative/.test(name)) {
    return { icon: '🎨', color: 'from-violet-500 to-purple-500' };
  }
  if (/market|brand|content|media/.test(name)) {
    return { icon: '📢', color: 'from-pink-500 to-rose-500' };
  }
  if (/sales|business|bd/.test(name)) {
    return { icon: '💼', color: 'from-amber-500 to-orange-500' };
  }
  if (/finance|account|audit|tax/.test(name)) {
    return { icon: '📊', color: 'from-cyan-500 to-teal-500' };
  }
  if (/hr|human|people|talent/.test(name)) {
    return { icon: '👥', color: 'from-emerald-500 to-green-500' };
  }

  return { icon: '🏢', color: 'from-slate-500 to-slate-600' };
};

const getDesignationLevel = (title = '') => {
  const t = String(title).toLowerCase();
  if (/\blead\b|chief|director|head|\bceo\b|\bcto\b|\bcfo\b|\bcoo\b|\bvp\b|vice president|president|founder/.test(t)) return 'Lead';
  if (/senior|sr\./.test(t)) return 'Senior';
  if (/manager/.test(t)) return 'Manager';
  if (/coordinator/.test(t)) return 'Coordinator';
  if (/analyst|scientist|research|ml|ai|data/.test(t)) return 'Analyst';
  if (/designer|ui|ux|graphic|creative/.test(t)) return 'Designer';
  if (/executive/.test(t)) return 'Executive';
  if (/engineer|developer|devops|qa|sre|specialist|associate/.test(t)) return 'Engineer';
  return 'Staff';
};

/* ─── sub-components ─────────────────────────────────────────── */

const StatusBadge = ({ status, isDarkMode }) => {
  const styles = {
    active: isDarkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    on_leave: isDarkMode ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200',
    terminated: isDarkMode ? 'bg-red-500/10 text-red-300 border-red-500/20' : 'bg-red-50 text-red-700 border-red-200',
  };
  const labels = { active: 'Active', on_leave: 'On Leave', terminated: 'Terminated' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status === 'active' ? 'bg-emerald-500' : status === 'on_leave' ? 'bg-amber-500' : 'bg-red-500'}`} />
      {labels[status]}
    </span>
  );
};

const TabButton = ({ active, children, onClick, count, isDarkMode }) => (
  <button
    onClick={onClick}
    className={`relative px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 whitespace-nowrap
      ${active
        ? isDarkMode
          ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/30'
          : 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
        : isDarkMode
          ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
      }`}
  >
    {children}
    {count !== undefined && (
      <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-semibold
        ${active ? 'bg-white/20 text-white' : isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-gray-200 text-gray-600'}`}
      >
        {count}
      </span>
    )}
  </button>
);

/* ─── overview tab ───────────────────────────────────────────── */
const OverviewTab = ({ isDarkMode, employees, combinedTotal }) => {
  const safeEmployees = Array.isArray(employees) ? employees : [];
  const activeCount = safeEmployees.filter((e) => e?.status === 'active').length;
  const onLeaveCount = safeEmployees.filter((e) => e?.status === 'on_leave').length;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const newHiresCount = safeEmployees.filter((e) => {
    const d = new Date(e.joinDate);
    return !Number.isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const stats = [
    { title: 'Total', value: String(combinedTotal), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Active', value: String(activeCount), icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'On Leave', value: String(onLeaveCount), icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'New Hires', value: String(newHiresCount), icon: UserPlus, color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  const dynamicPieData = Object.entries(
    safeEmployees.reduce((acc, emp) => {
      const departmentName = emp?.department || 'Unknown';
      acc[departmentName] = (acc[departmentName] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value], index) => ({
    name,
    value,
    color: pieColors[index % pieColors.length]
  }));

  const chartData = dynamicPieData;
  const recentJoiners = [...safeEmployees]
    .sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`rounded-2xl p-5 border shadow-sm ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}
          >
            <div className={`p-2 rounded-xl w-fit mb-3 ${isDarkMode ? 'bg-white/5' : s.bg}`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{s.value}</div>
            <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{s.title}</div>
          </motion.div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`rounded-2xl p-6 border shadow-sm ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
          <h3 className={`text-base font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Department Distribution</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px', padding: '8px 14px' }}
                  labelStyle={{ color: '#f8fafc' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className={`h-[220px] flex items-center justify-center text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              No department data available
            </div>
          )}
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {chartData.map((d) => (
              <div key={d.name} className={`flex items-center space-x-1.5 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                <span>{d.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={`rounded-2xl p-6 border shadow-sm ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
          <h3 className={`text-base font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Recent Joiners</h3>
          <div className="space-y-3">
            {recentJoiners.map((emp) => (
              <div key={emp.id} className={`flex items-center space-x-3 p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-slate-900/60' : 'hover:bg-gray-50'}`}>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {(emp?.name || '-')
                    .split(' ')
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join('') || '-'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{emp?.name || '-'}</div>
                  <div className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{emp?.designation || '-'}</div>
                </div>
                <div className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{emp?.joinDate || '-'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── employees list tab ─────────────────────────────────────── */
const AllEmployeesTab = ({ onView, onEdit, onDelete, isDarkMode, employees }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const safeEmployees = Array.isArray(employees) ? employees : [];

  const filtered = safeEmployees.filter((e) => {
    const name = String(e?.name || '').toLowerCase();
    const email = String(e?.email || '').toLowerCase();
    const matchSearch = name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || e?.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className={`flex items-center border rounded-xl px-3 py-2 w-full sm:w-80 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
          <Search className={`w-4 h-4 mr-2 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees..."
            className={`bg-transparent outline-none text-sm w-full ${isDarkMode ? 'text-slate-200 placeholder-slate-500' : 'text-gray-700 placeholder-gray-400'}`}
          />
        </div>
        <div className="flex items-center space-x-2">
          {['all', 'active', 'on_leave', 'terminated'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${statusFilter === s
                  ? isDarkMode ? 'bg-cyan-600 text-white' : 'bg-blue-600 text-white'
                  : isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {s === 'all' ? 'All' : s === 'on_leave' ? 'On Leave' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                <th className={`text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Employee</th>
                <th className={`text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider hidden md:table-cell ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Department</th>
                <th className={`text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider hidden lg:table-cell ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Designation</th>
                <th className={`text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Status</th>
                <th className={`text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider hidden lg:table-cell ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Join Date</th>
                <th className={`text-right px-5 py-3.5 text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-gray-50'}`}>
              {filtered.map((emp) => (
                <tr key={emp.id} className={`transition-colors group ${isDarkMode ? 'hover:bg-slate-900/60' : 'hover:bg-gray-50/50'}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(emp?.name || '-')
                          .split(' ')
                          .filter(Boolean)
                          .map((n) => n[0])
                          .join('') || '-'}
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{emp?.name || '-'}</div>
                        <div className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{emp?.email || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`px-5 py-3.5 text-sm hidden md:table-cell ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{emp?.department || '-'}</td>
                  <td className={`px-5 py-3.5 text-sm hidden lg:table-cell ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{emp?.designation || '-'}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={emp?.status || 'terminated'} isDarkMode={isDarkMode} /></td>
                  <td className={`px-5 py-3.5 text-sm hidden lg:table-cell ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>{emp?.joinDate || '-'}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onView(emp.id)} className={`p-1.5 rounded-lg transition-all ${isDarkMode ? 'text-slate-500 hover:text-cyan-300 hover:bg-cyan-500/10' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}>
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => onEdit(emp.id)} className={`p-1.5 rounded-lg transition-all ${isDarkMode ? 'text-slate-500 hover:text-amber-300 hover:bg-amber-500/10' : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'}`}>
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDelete(emp.id)} className={`p-1.5 rounded-lg transition-all ${isDarkMode ? 'text-slate-500 hover:text-red-300 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className={`text-center py-12 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
            <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No employees found</p>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── departments tab ────────────────────────────────────────── */
const DepartmentsTab = ({ isDarkMode, departmentTree, onEdit, onDelete, onOpenDepartment }) => {
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderDepartmentCard = (dept, level = 0) => {
    const hasChildren = Array.isArray(dept.children) && dept.children.length > 0;
    const isExpanded = expandedIds.has(dept.id);
    const visual = getDepartmentVisual(dept.name);

    return (
      <div key={dept.id} className="space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2 }}
          onClick={() => onOpenDepartment(dept)}
          className={`rounded-2xl p-6 border shadow-sm hover:shadow-md transition-all cursor-pointer group ${level > 0 ? (isDarkMode ? 'border-amber-500/30 bg-[#0d2230]' : 'border-amber-200 bg-amber-50/40') : (isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100')}`}
          style={{ marginLeft: `${Math.min(level, 3) * 18}px` }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${visual.color} flex items-center justify-center text-2xl shadow-lg group-hover:shadow-xl transition-shadow`}>
                {visual.icon}
              </div>
              {hasChildren && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleExpand(dept.id);
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  {dept.children.length} sub
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${level > 0 ? (isDarkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-700') : (isDarkMode ? 'bg-cyan-500/15 text-cyan-300' : 'bg-blue-100 text-blue-700')}`}>
                {level > 0 ? `Sub Dept L${level}` : 'Main Dept'}
              </span>
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(event) => { event.stopPropagation(); onEdit(dept); }} className={`p-1.5 rounded-lg transition-all ${isDarkMode ? 'text-slate-500 hover:text-amber-300 hover:bg-amber-500/10' : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'}`}>
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={(event) => { event.stopPropagation(); onDelete(dept); }} className={`p-1.5 rounded-lg transition-all ${isDarkMode ? 'text-slate-500 hover:text-red-300 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <h3 className={`text-lg font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{dept.name}</h3>
          {level > 0 && (
            <p className={`text-xs mb-2 ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
              ↳ Sub of {dept.parentName || 'Parent Department'}
            </p>
          )}
          <p className={`text-sm mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Head: {dept.head || '—'}</p>

          <div className={`flex items-center justify-between pt-3 border-t ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
            <div className="flex -space-x-2">
              {[...Array(Math.min(4, Number(dept.members || 0)))].map((_, j) => (
                <div key={j} className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[9px] font-medium ${isDarkMode ? 'from-slate-700 to-slate-800 border-[#0d2230] text-slate-300 bg-gradient-to-br' : 'from-gray-200 to-gray-300 border-white text-gray-500 bg-gradient-to-br'}`}>
                  {String.fromCharCode(65 + j)}
                </div>
              ))}
              {Number(dept.members || 0) > 4 && (
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[9px] font-medium ${isDarkMode ? 'bg-slate-800 border-[#0d2230] text-slate-300' : 'bg-gray-100 border-white text-gray-500'}`}>
                  +{Number(dept.members || 0) - 4}
                </div>
              )}
            </div>
            <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{Number(dept.members || 0)} members</span>
          </div>
        </motion.div>

        <AnimatePresence initial={false}>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="space-y-3 overflow-hidden"
            >
              {dept.children.map((child) => renderDepartmentCard(child, level + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return <div className="space-y-4">{departmentTree.map((dept) => renderDepartmentCard(dept, 0))}</div>;
};

/* ─── designations tab ───────────────────────────────────────── */
const DesignationsTab = ({ isDarkMode, designations, onEdit, onDelete }) => {
  const levelColors = {
    Senior: isDarkMode ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200',
    Lead: isDarkMode ? 'bg-violet-500/10 text-violet-300 border-violet-500/20' : 'bg-violet-50 text-violet-700 border-violet-200',
    Manager: isDarkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Executive: isDarkMode ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200',
    Coordinator: isDarkMode ? 'bg-pink-500/10 text-pink-300 border-pink-500/20' : 'bg-pink-50 text-pink-700 border-pink-200',
    Analyst: isDarkMode ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' : 'bg-cyan-50 text-cyan-700 border-cyan-200',
    Designer: isDarkMode ? 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20' : 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    Engineer: isDarkMode ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' : 'bg-indigo-50 text-indigo-700 border-indigo-200',
  };

  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={`border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <th className={`text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Designation</th>
              <th className={`text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Department</th>
              <th className={`text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Level</th>
              <th className={`text-center px-5 py-3.5 text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Employees</th>
              <th className={`text-right px-5 py-3.5 text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-gray-50'}`}>
            {designations.map((d) => (
              <tr key={d.id} className={`transition-colors group ${isDarkMode ? 'hover:bg-slate-900/60' : 'hover:bg-gray-50/50'}`}>
                <td className="px-5 py-3.5">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
                      <Briefcase className={`w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
                    </div>
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{d.title}</span>
                  </div>
                </td>
                <td className={`px-5 py-3.5 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{d.department}</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${levelColors[getDesignationLevel(d.title)] || (isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-gray-50 text-gray-700 border-gray-200')}`}>
                    {getDesignationLevel(d.title)}
                  </span>
                </td>
                <td className={`px-5 py-3.5 text-center text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{Number(d.count || 0)}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(d)} className={`p-1.5 rounded-lg transition-all ${isDarkMode ? 'text-slate-500 hover:text-amber-300 hover:bg-amber-500/10' : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'}`}>
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(d)} className={`p-1.5 rounded-lg transition-all ${isDarkMode ? 'text-slate-500 hover:text-red-300 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ─── main page ──────────────────────────────────────────────── */

const EmployeePage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [employeesData, setEmployeesData] = useState([]);
  const [departmentsData, setDepartmentsData] = useState([]);
  const [designationsData, setDesignationsData] = useState([]);
  const [combinedTotal, setCombinedTotal] = useState(0);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editForm, setEditForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDepartmentEmployeesOpen, setIsDepartmentEmployeesOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [assigningHeadId, setAssigningHeadId] = useState(null);
  const navigate = useNavigate();
  const { isDarkMode = false } = useOutletContext() || {};
  const token = localStorage.getItem('erp_token');

  const employees = employeesData;
  const totalCount = combinedTotal;

  const hierarchyDepartmentTree = useMemo(() => {
    const byId = new Map();
    (departmentsData || []).forEach((dept) => {
      byId.set(dept.id, { ...dept, children: [] });
    });

    const roots = [];
    byId.forEach((dept) => {
      if (dept.parentDepartmentId && byId.has(dept.parentDepartmentId)) {
        byId.get(dept.parentDepartmentId).children.push(dept);
      } else {
        roots.push(dept);
      }
    });

    const sortByName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''));
    roots.sort(sortByName);
    byId.forEach((dept) => dept.children.sort(sortByName));

    const attachMeta = (node, level = 0, parentName = null) => ({
      ...node,
      level,
      parentName,
      children: (node.children || []).map((child) => attachMeta(child, level + 1, node.name))
    });

    return roots.map((root) => attachMeta(root, 0, null));
  }, [departmentsData]);

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'employees', label: 'All Employees', count: employees.length },
    { key: 'departments', label: 'Departments', count: departmentsData.length },
    { key: 'designations', label: 'Designations', count: designationsData.length },
  ];

  const fetchEmployeesAndSummary = async () => {
    if (!token) {
      setError('Authentication required');
      return;
    }

    try {
      setError('');
      const [employeeRes, summaryRes] = await Promise.all([
        fetch('http://localhost:5000/api/hr/employees', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }),
        fetch('http://localhost:5000/api/hr/organization/summary', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
      ]);

      const payload = await employeeRes.json();
      const summaryPayload = await summaryRes.json();

      if (!employeeRes.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to load employees');
      }

      if (!summaryRes.ok || !summaryPayload?.success) {
        throw new Error(summaryPayload?.message || 'Failed to load departments/designations');
      }

      const mappedEmployees = (payload?.data?.employees || []).map((emp) => ({
        id: emp.id,
        firstName: emp.firstName || '',
        lastName: emp.lastName || '',
        name: emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
        email: emp.email || '-',
        phone: emp.phone || '-',
        department: emp.department || '-',
        designation: emp.designation || '-',
        employeeCode: emp.employeeCode || '',
        status: emp.isActive ? 'active' : 'terminated',
        joinDate: emp.joinDate ? String(emp.joinDate).slice(0, 10) : '-',
        avatar: null
      }));

      setEmployeesData(mappedEmployees);
      setCombinedTotal(Number(payload?.data?.combinedTotal || mappedEmployees.length));

      const summaryDepartments = (summaryPayload?.data?.departments || []).map((department) => ({
        id: department.id,
        name: department.name,
        description: department.description || '',
        parentDepartmentId: department.parentDepartmentId || null,
        head: department.headName || '—',
        headEmployeeId: department.headEmployeeId || null,
        members: Number(department.members || 0)
      }));

      const summaryDesignations = (summaryPayload?.data?.designations || []).map((designation) => ({
        id: designation.id,
        title: designation.title,
        departmentId: designation.departmentId,
        department: designation.departmentName,
        count: Number(designation.employees || 0)
      }));

      setDepartmentsData(summaryDepartments);
      setDesignationsData(summaryDesignations);
    } catch (err) {
      setError(err.message || 'Failed to load employees');
    }
  };

  useEffect(() => {
    fetchEmployeesAndSummary();
  }, []);

  const handleViewProfile = (id) => {
    navigate(`/dashboard/hr/employee/${id}`);
  };

  const openModal = (type, initialValues) => {
    setModalType(type);
    setEditForm(initialValues);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalType('');
    setEditForm({});
  };

  const handleEditEmployee = async (employeeId) => {
    if (!token) return;

    try {
      const response = await fetch(`http://localhost:5000/api/hr/employees/${employeeId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to load employee details');
      }

      const employee = payload.data;
      openModal('employee', {
        id: employee.id,
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.email || '',
        phone: employee.phone || '',
        department: employee.department || '',
        designation: employee.designation || '',
        joinDate: employee.joinDate ? String(employee.joinDate).slice(0, 10) : '',
        employeeCode: employee.employeeCode || ''
      });
    } catch (err) {
      setError(err.message || 'Failed to load employee details');
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (!token) return;
    if (!window.confirm('Delete this employee?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/hr/employees/${employeeId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to delete employee');
      }

      await fetchEmployeesAndSummary();
    } catch (err) {
      setError(err.message || 'Failed to delete employee');
    }
  };

  const handleEditDepartment = (department) => {
    openModal('department', {
      id: department.id,
      name: department.name || '',
      description: department.description || ''
    });
  };

  const openDepartmentEmployees = (department) => {
    setSelectedDepartment(department);
    setIsDepartmentEmployeesOpen(true);
  };

  const closeDepartmentEmployees = () => {
    setIsDepartmentEmployeesOpen(false);
    setSelectedDepartment(null);
  };

  const handleAssignDepartmentHead = async (department, employee) => {
    if (!token) return;

    try {
      setAssigningHeadId(employee.id);
      const response = await fetch(`http://localhost:5000/api/hr/organization/departments/${department.id}/head`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ employeeId: employee.id })
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to assign department head');
      }

      await fetchEmployeesAndSummary();
      setSelectedDepartment((prev) => {
        if (!prev || prev.id !== department.id) return prev;
        return {
          ...prev,
          head: payload?.data?.headName || employee.name,
          headEmployeeId: payload?.data?.headEmployeeId || employee.id
        };
      });
    } catch (err) {
      setError(err.message || 'Failed to assign department head');
    } finally {
      setAssigningHeadId(null);
    }
  };

  const handleDeleteDepartment = async (department) => {
    if (!token) return;
    if (!window.confirm(`Delete department "${department.name}"?`)) return;

    try {
      const response = await fetch(`http://localhost:5000/api/hr/organization/departments/${department.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to delete department');
      }

      await fetchEmployeesAndSummary();
    } catch (err) {
      setError(err.message || 'Failed to delete department');
    }
  };

  const handleEditDesignation = (designation) => {
    openModal('designation', {
      id: designation.id,
      title: designation.title || '',
      departmentId: designation.departmentId || departmentsData.find((d) => d.name === designation.department)?.id || ''
    });
  };

  const handleDeleteDesignation = async (designation) => {
    if (!token) return;
    if (!window.confirm(`Delete designation "${designation.title}"?`)) return;

    try {
      const response = await fetch(`http://localhost:5000/api/hr/organization/designations/${designation.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to delete designation');
      }

      await fetchEmployeesAndSummary();
    } catch (err) {
      setError(err.message || 'Failed to delete designation');
    }
  };

  const handleSaveModal = async (event) => {
    event.preventDefault();
    if (!token) return;
    setIsSaving(true);

    try {
      if (modalType === 'employee') {
        const response = await fetch(`http://localhost:5000/api/hr/employees/${editForm.id}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            firstName: editForm.firstName,
            lastName: editForm.lastName,
            email: editForm.email,
            phone: editForm.phone,
            department: editForm.department,
            designation: editForm.designation,
            joinDate: editForm.joinDate,
            employeeCode: editForm.employeeCode
          })
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || 'Failed to update employee');
        }
      }

      if (modalType === 'department') {
        const response = await fetch(`http://localhost:5000/api/hr/organization/departments/${editForm.id}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: editForm.name,
            description: editForm.description
          })
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || 'Failed to update department');
        }
      }

      if (modalType === 'designation') {
        const response = await fetch(`http://localhost:5000/api/hr/organization/designations/${editForm.id}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: editForm.title,
            departmentId: Number(editForm.departmentId)
          })
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || 'Failed to update designation');
        }
      }

      closeModal();
      await fetchEmployeesAndSummary();
    } catch (err) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className={`rounded-xl px-4 py-3 text-sm border ${isDarkMode ? 'bg-red-900/20 border-red-500/30 text-red-200' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {error}
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Employee Management</h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Manage your workforce, departments, and designations</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/dashboard/hr/employee/new')}
          className={`flex items-center space-x-2 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDarkMode ? 'bg-cyan-600 shadow-lg shadow-cyan-950/30 hover:bg-cyan-500' : 'bg-blue-600 shadow-lg shadow-blue-500/25 hover:bg-blue-700'}`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Employee</span>
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <TabButton
            key={tab.key}
            active={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            count={tab.count}
            isDarkMode={isDarkMode}
          >
            {tab.label}
          </TabButton>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && <OverviewTab isDarkMode={isDarkMode} employees={employees} combinedTotal={totalCount} />}
          {activeTab === 'employees' && <AllEmployeesTab onView={handleViewProfile} onEdit={handleEditEmployee} onDelete={handleDeleteEmployee} isDarkMode={isDarkMode} employees={employees} />}
          {activeTab === 'departments' && <DepartmentsTab isDarkMode={isDarkMode} departmentTree={hierarchyDepartmentTree} onEdit={handleEditDepartment} onDelete={handleDeleteDepartment} onOpenDepartment={openDepartmentEmployees} />}
          {activeTab === 'designations' && <DesignationsTab isDarkMode={isDarkMode} designations={designationsData} onEdit={handleEditDesignation} onDelete={handleDeleteDesignation} />}
        </motion.div>
      </AnimatePresence>

      {isDepartmentEmployeesOpen && selectedDepartment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`w-full max-w-3xl rounded-2xl border shadow-xl ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/20' : 'bg-white border-gray-200'}`}
          >
            <div className={`flex items-center justify-between px-5 py-4 border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <div>
                <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedDepartment.name} - Employees</h3>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Assign a department head from employees in this department</p>
              </div>
              <button type="button" onClick={closeDepartmentEmployees} className={`p-1.5 rounded-lg ${isDarkMode ? 'text-slate-500 hover:text-slate-200 hover:bg-slate-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 max-h-[65vh] overflow-auto">
              {employees
                .filter((employee) => String(employee.department || '').trim().toLowerCase() === String(selectedDepartment.name || '').trim().toLowerCase())
                .map((employee) => {
                  const isHead = Number(selectedDepartment.headEmployeeId || 0) === Number(employee.id);
                  return (
                    <div key={employee.id} className={`flex items-center justify-between p-3 rounded-xl border mb-2 ${isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-gray-100 bg-gray-50/70'}`}>
                      <div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{employee.name}</p>
                        <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{employee.designation} · {employee.email}</p>
                      </div>
                      <button
                        type="button"
                        disabled={isHead || assigningHeadId === employee.id}
                        onClick={() => handleAssignDepartmentHead(selectedDepartment, employee)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isHead
                          ? (isDarkMode ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
                          : (isDarkMode ? 'bg-cyan-600 text-white hover:bg-cyan-500' : 'bg-blue-600 text-white hover:bg-blue-700')
                        } disabled:opacity-70`}
                      >
                        {isHead ? 'Current Head' : assigningHeadId === employee.id ? 'Assigning...' : 'Make Head'}
                      </button>
                    </div>
                  );
                })}

              {employees.filter((employee) => String(employee.department || '').trim().toLowerCase() === String(selectedDepartment.name || '').trim().toLowerCase()).length === 0 && (
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>No employees found in this department.</p>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSaveModal}
            className={`w-full max-w-lg rounded-2xl border shadow-xl ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/20' : 'bg-white border-gray-200'}`}
          >
            <div className={`flex items-center justify-between px-5 py-4 border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {modalType === 'employee' ? 'Edit Employee' : modalType === 'department' ? 'Edit Department' : 'Edit Designation'}
              </h3>
              <button type="button" onClick={closeModal} className={`p-1.5 rounded-lg ${isDarkMode ? 'text-slate-500 hover:text-slate-200 hover:bg-slate-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              {modalType === 'employee' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input value={editForm.firstName || ''} onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))} placeholder="First name" className={`px-3 py-2 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`} />
                    <input value={editForm.lastName || ''} onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))} placeholder="Last name" className={`px-3 py-2 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`} />
                  </div>
                  <input value={editForm.email || ''} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className={`w-full px-3 py-2 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`} />
                  <input value={editForm.phone || ''} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" className={`w-full px-3 py-2 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input value={editForm.department || ''} onChange={(e) => setEditForm((p) => ({ ...p, department: e.target.value }))} placeholder="Department" className={`px-3 py-2 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`} />
                    <input value={editForm.designation || ''} onChange={(e) => setEditForm((p) => ({ ...p, designation: e.target.value }))} placeholder="Designation" className={`px-3 py-2 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="date" value={editForm.joinDate || ''} onChange={(e) => setEditForm((p) => ({ ...p, joinDate: e.target.value }))} className={`px-3 py-2 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`} />
                    <input value={editForm.employeeCode || ''} onChange={(e) => setEditForm((p) => ({ ...p, employeeCode: e.target.value }))} placeholder="Employee code" className={`px-3 py-2 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`} />
                  </div>
                </>
              )}

              {modalType === 'department' && (
                <>
                  <input value={editForm.name || ''} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} placeholder="Department name" className={`w-full px-3 py-2 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`} />
                  <textarea value={editForm.description || ''} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" rows={3} className={`w-full px-3 py-2 rounded-xl border text-sm resize-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`} />
                </>
              )}

              {modalType === 'designation' && (
                <>
                  <input value={editForm.title || ''} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} placeholder="Designation title" className={`w-full px-3 py-2 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`} />
                  <select value={editForm.departmentId || ''} onChange={(e) => setEditForm((p) => ({ ...p, departmentId: e.target.value }))} className={`w-full px-3 py-2 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`}>
                    <option value="">Select department</option>
                    {departmentsData.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </>
              )}
            </div>

            <div className={`flex items-center justify-end space-x-2 px-5 py-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <button type="button" onClick={closeModal} className={`px-4 py-2 rounded-xl text-sm font-medium ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                Cancel
              </button>
              <button type="submit" disabled={isSaving} className={`px-4 py-2 rounded-xl text-sm font-medium text-white ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-blue-600 hover:bg-blue-700'} disabled:opacity-60`}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </div>
  );
};

export default EmployeePage;
