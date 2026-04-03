import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { ChevronDown, ChevronRight, ZoomIn, ZoomOut, Maximize2, X } from 'lucide-react';

const normalizeText = (value = '') => String(value).trim().toLowerCase();

const isTopExecutiveTitle = (designation = '') => {
  const title = normalizeText(designation);
  return /\bceo\b|chief executive officer|founder|president/.test(title);
};

const getDepartmentGradient = (department = '') => {
  const name = normalizeText(department);

  if (/exec|corporate|board|leadership/.test(name)) return 'from-slate-600 to-slate-800';
  if (/eng|develop|software|it|tech|qa|devops/.test(name)) return 'from-blue-500 to-cyan-500';
  if (/design|ui|ux|creative|graphic/.test(name)) return 'from-violet-500 to-purple-500';
  if (/market|brand|content|media/.test(name)) return 'from-pink-500 to-rose-500';
  if (/finance|account|audit|tax/.test(name)) return 'from-emerald-500 to-green-500';
  if (/hr|human|people|talent/.test(name)) return 'from-teal-500 to-emerald-500';
  if (/sale|business|revenue/.test(name)) return 'from-amber-500 to-orange-500';
  if (/security|soc/.test(name)) return 'from-cyan-600 to-sky-600';
  if (/ai|artificial|data|ml/.test(name)) return 'from-indigo-500 to-violet-500';

  return 'from-slate-500 to-slate-600';
};

const buildOrgTree = ({ employees, departments }) => {
  const safeEmployees = Array.isArray(employees) ? employees : [];
  const safeDepartments = Array.isArray(departments) ? departments : [];

  const ceo = safeEmployees.find((emp) => isTopExecutiveTitle(emp.designation));
  const root = ceo
    ? {
        id: `employee-${ceo.id}`,
        name: ceo.name,
        title: ceo.designation || 'CEO',
        department: 'Executive',
        children: []
      }
    : {
        id: 'root-company',
        name: 'Company',
        title: 'CEO (Unassigned)',
        department: 'Executive',
        children: []
      };

  const departmentsByName = new Map();

  for (const department of safeDepartments) {
    const name = String(department?.name || '').trim();
    if (!name) continue;
    departmentsByName.set(normalizeText(name), {
      id: department.id,
      name,
      headEmployeeId: department.headEmployeeId || null,
      headName: department.headName || null
    });
  }

  for (const employee of safeEmployees) {
    const deptName = String(employee.department || '').trim();
    if (!deptName) continue;
    const key = normalizeText(deptName);
    if (!departmentsByName.has(key)) {
      departmentsByName.set(key, {
        id: `virtual-${key}`,
        name: deptName,
        headEmployeeId: null,
        headName: null
      });
    }
  }

  const allDepartments = Array.from(departmentsByName.values()).sort((a, b) => a.name.localeCompare(b.name));

  for (const department of allDepartments) {
    const deptEmployees = safeEmployees
      .filter((employee) => normalizeText(employee.department) === normalizeText(department.name))
      .filter((employee) => !ceo || Number(employee.id) !== Number(ceo.id));

    // If there are no employees and no assigned head, skip this department entirely.
    if (!department.headEmployeeId && deptEmployees.length === 0) {
      continue;
    }

    let departmentHead = null;

    if (department.headEmployeeId) {
      departmentHead = deptEmployees.find((employee) => Number(employee.id) === Number(department.headEmployeeId)) || null;
    }

    if (!departmentHead && department.headName) {
      departmentHead = deptEmployees.find((employee) => normalizeText(employee.name) === normalizeText(department.headName)) || null;
    }

    const remainingEmployees = deptEmployees
      .filter((employee) => !departmentHead || Number(employee.id) !== Number(departmentHead.id))
      .sort((a, b) => String(a.designation || '').localeCompare(String(b.designation || '')) || String(a.name || '').localeCompare(String(b.name || '')));

    const children = remainingEmployees.map((employee) => ({
      id: `employee-${employee.id}`,
      name: employee.name,
      title: employee.designation || 'Employee',
      department: department.name,
      children: []
    }));

    if (departmentHead) {
      root.children.push({
        id: `employee-${departmentHead.id}`,
        name: departmentHead.name,
        title: departmentHead.designation || `${department.name} Head`,
        department: department.name,
        children
      });
    } else {
      // No assigned head: show only employee node(s), no synthetic department node.
      for (const employeeNode of children) {
        root.children.push(employeeNode);
      }
    }
  }

  return root;
};

const buildDepartmentStructure = ({ employees, departments }) => {
  const safeDepartments = Array.isArray(departments) ? departments : [];
  const safeEmployees = Array.isArray(employees) ? employees : [];

  // Find CEO and use their department as company name
  const ceo = safeEmployees.find((emp) => isTopExecutiveTitle(emp.designation));
  const companyName = ceo?.department || 'Company';

  // Build map of departments by ID
  const deptMap = new Map();
  for (const dept of safeDepartments) {
    deptMap.set(dept.id, {
      ...dept,
      children: [],
      designations: new Set(),
      employees: []
    });
  }

  // Group employees by department and collect designations
  for (const employee of safeEmployees) {
    const deptName = String(employee.department || '').trim();
    for (const [deptId, dept] of deptMap) {
      if (normalizeText(dept.name) === normalizeText(deptName)) {
        dept.employees.push(employee);
        if (employee.designation) {
          dept.designations.add(employee.designation);
        }
        break;
      }
    }
  }

  // Build parent-child relationships (sub-departments)
  for (const dept of deptMap.values()) {
    if (dept.parentDepartmentId) {
      const parent = deptMap.get(dept.parentDepartmentId);
      if (parent) {
        parent.children.push(dept);
      }
    }
  }

  // Get main departments (those without parent)
  const mainDepartments = Array.from(deptMap.values())
    .filter((dept) => !dept.parentDepartmentId)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    companyName,
    ceoName: ceo?.name || null,
    mainDepartments
  };
};

const OrgNode = ({ node, level = 0, isDarkMode }) => {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;
  const gradient = getDepartmentGradient(node.department);

  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: level * 0.05 }}
        whileHover={{ y: -2 }}
        className={`relative rounded-2xl border p-4 w-48 cursor-pointer transition-all group ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-sm shadow-black/20 hover:shadow-md hover:shadow-black/30' : 'bg-white border-gray-100 shadow-sm hover:shadow-md'}`}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-sm font-bold mx-auto mb-3 shadow-lg`}>
          {node.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="text-center">
          <div className={`text-sm font-semibold truncate ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{node.name}</div>
          <div className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{node.title}</div>
          <div className={`text-[10px] mt-1 px-2 py-0.5 rounded-full inline-block ${isDarkMode ? 'text-slate-400 bg-slate-900' : 'text-gray-400 bg-gray-50'}`}>{node.department}</div>
        </div>
        {hasChildren && (
          <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center shadow-sm transition-colors z-10 ${isDarkMode ? 'bg-slate-900 border border-slate-700 hover:bg-cyan-500/10 hover:border-cyan-500/30' : 'bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-300'}`}>
            {expanded
              ? <ChevronDown className={`w-3 h-3 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
              : <ChevronRight className={`w-3 h-3 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
            }
          </div>
        )}
      </motion.div>

      {hasChildren && expanded && (
        <>
          <div className={`w-px h-6 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`} />
          <div className="relative flex items-start gap-8">
            {node.children.length > 1 && (
              <div className={`absolute top-0 left-1/2 -translate-x-1/2 h-px ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}
                style={{ width: `calc(100% - 12rem)` }}
              />
            )}
            {node.children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                <div className={`w-px h-6 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`} />
                <OrgNode node={child} level={level + 1} isDarkMode={isDarkMode} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const DepartmentNode = ({ dept, isDarkMode, onOpenDetails }) => {
  return (
    <div className="flex flex-col items-center">
      {/* Company Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-2xl border p-5 mb-4 text-center ${isDarkMode ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-cyan-400/20' : 'bg-gradient-to-br from-blue-50 to-white border-blue-200'}`}
      >
        <div className={`text-xl font-bold ${isDarkMode ? 'text-cyan-300' : 'text-blue-600'}`}>{dept.companyName}</div>
        <div className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Company</div>
      </motion.div>

      {/* Vertical connector from company to departments */}
      {dept.mainDepartments.length > 0 && (
        <div className={`w-px h-6 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-300'}`} />
      )}

      {/* Main Departments Container with horizontal connectors */}
      {dept.mainDepartments.length > 0 && (
        <div className="relative flex items-start gap-8">
          {/* Horizontal connector line */}
          {dept.mainDepartments.length > 1 && (
            <div
              className={`absolute top-0 left-1/2 -translate-x-1/2 h-px ${isDarkMode ? 'bg-slate-700' : 'bg-gray-300'}`}
              style={{ width: `calc(100% - 12rem)` }}
            />
          )}

          {/* Main Departments */}
          {dept.mainDepartments.map((mainDept) => (
            <div key={mainDept.id} className="flex flex-col items-center">
              {/* Vertical connector to department card */}
              <div className={`w-px h-6 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-300'}`} />
              <DepartmentCard department={mainDept} isDarkMode={isDarkMode} onOpenDetails={onOpenDetails} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const DepartmentCard = ({ department, isDarkMode, onOpenDetails }) => {
  const [expanded, setExpanded] = useState(true);
  const hasSubDepts = department.children && department.children.length > 0;
  const hasDesignations = department.designations && department.designations.size > 0;
  const gradient = getDepartmentGradient(department.name);
  const designationArray = Array.from(department.designations || []).sort();
  const sortedEmployees = (department.employees || [])
    .slice()
    .sort((a, b) => String(a.designation || '').localeCompare(String(b.designation || '')) || String(a.name || '').localeCompare(String(b.name || '')));
  const previewEmployees = sortedEmployees.slice(0, 3);
  const remainingEmployeesCount = Math.max(0, sortedEmployees.length - previewEmployees.length);
  const childNodeCount = (hasDesignations ? 1 : 0) + (hasSubDepts ? department.children.length : 0);

  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-xl border p-4 w-48 cursor-pointer transition-all ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 hover:border-cyan-400/30' : 'bg-white border-gray-200 hover:border-gray-300'}`}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xs font-bold`}>
              {department.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </div>
            <div>
              <div className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{department.name}</div>
              <div className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>{department.employees?.length || 0} emp</div>
            </div>
          </div>
          <div className={`text-xs font-medium px-2 py-1 rounded ${isDarkMode ? 'bg-cyan-500/10 text-cyan-300' : 'bg-blue-100 text-blue-700'}`}>
            Head: <span className="font-semibold text-xs">{department.headName || 'Unassigned'}</span>
          </div>
        </div>

        {(hasDesignations || hasSubDepts) && (
          <div className={`mt-3 pt-3 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs w-full"
            >
              {expanded ? (
                <ChevronDown className={`w-3 h-3 ${isDarkMode ? 'text-cyan-400' : 'text-blue-500'}`} />
              ) : (
                <ChevronRight className={`w-3 h-3 ${isDarkMode ? 'text-cyan-400' : 'text-blue-500'}`} />
              )}
              <span className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                {designationArray.length}P {hasSubDepts && `• ${department.children.length}S`}
              </span>
            </button>
          </div>
        )}
      </motion.div>

      {expanded && (hasDesignations || hasSubDepts) && (
        <>
          {/* Vertical trunk from parent card to child junction */}
          <div className={`w-px h-6 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-300'}`} />

          {/* Unified child row: designation and sub-departments share one connector bus */}
          <div className="relative inline-flex items-start gap-10">
            {childNodeCount > 1 && (
              <div className={`absolute top-0 left-3 right-3 h-px ${isDarkMode ? 'bg-slate-700' : 'bg-gray-300'}`} />
            )}

            {hasDesignations && (
              <div className="relative pt-6 flex flex-col items-center">
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-px h-6 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-300'}`} />
                <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                  <div className={`text-xs font-semibold mb-2 ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>Designations & Users</div>
                  {previewEmployees.length > 0 ? (
                    <div className="space-y-1 min-w-[180px]">
                      {previewEmployees.map((emp) => (
                        <div key={emp.id} className={`text-[11px] px-2 py-1 rounded ${isDarkMode ? 'bg-amber-500/20 text-amber-100' : 'bg-amber-100 text-amber-700'}`}>
                          <span className="font-semibold">{emp.name}</span>
                          <span className="opacity-80"> - {emp.designation || 'N/A'}</span>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => onOpenDetails({ departmentName: department.name, employees: sortedEmployees })}
                        className={`text-[11px] underline ${isDarkMode ? 'text-cyan-300 hover:text-cyan-200' : 'text-blue-700 hover:text-blue-800'}`}
                      >
                        {remainingEmployeesCount > 0 ? `View all ${sortedEmployees.length} users` : 'View users'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1 max-w-[210px]">
                      {designationArray.slice(0, 3).map((des) => (
                        <span key={des} className={`text-xs px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-amber-500/20 text-amber-100' : 'bg-amber-100 text-amber-700'}`}>
                          {des}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {hasSubDepts && department.children
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((subDept) => (
                <div key={subDept.id} className="relative pt-6 flex flex-col items-center">
                  <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-px h-6 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-300'}`} />
                  <DepartmentCard department={subDept} isDarkMode={isDarkMode} onOpenDetails={onOpenDetails} />
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
};

const OrganizationChart = () => {
  const [zoom, setZoom] = useState(1);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartView, setChartView] = useState('employee'); // 'employee' or 'department'
  const [detailsPopup, setDetailsPopup] = useState(null);
  const { isDarkMode = false } = useOutletContext() || {};
  const token = localStorage.getItem('erp_token');

  useEffect(() => {
    const fetchOrgData = async () => {
      if (!token) {
        setLoading(false);
        setError('Authentication required');
        return;
      }

      try {
        setLoading(true);
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

        const employeePayload = await employeeRes.json();
        const summaryPayload = await summaryRes.json();

        if (!employeeRes.ok || !employeePayload?.success) {
          throw new Error(employeePayload?.message || 'Failed to fetch employees');
        }

        if (!summaryRes.ok || !summaryPayload?.success) {
          throw new Error(summaryPayload?.message || 'Failed to fetch organization summary');
        }

        const mappedEmployees = (employeePayload?.data?.employees || []).map((emp) => ({
          id: emp.id,
          name: emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
          department: emp.department || '',
          designation: emp.designation || ''
        }));

        const mappedDepartments = (summaryPayload?.data?.departments || []).map((dept) => ({
          id: dept.id,
          name: dept.name,
          headEmployeeId: dept.headEmployeeId || null,
          headName: dept.headName || null,
          parentDepartmentId: dept.parentDepartmentId || null
        }));

        setEmployees(mappedEmployees);
        setDepartments(mappedDepartments);
      } catch (err) {
        setError(err.message || 'Failed to fetch organization chart data');
      } finally {
        setLoading(false);
      }
    };

    fetchOrgData();
  }, [token]);

  const chartRoot = useMemo(() => buildOrgTree({ employees, departments }), [employees, departments]);
  const deptStructure = useMemo(() => buildDepartmentStructure({ employees, departments }), [employees, departments]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Organization Chart</h1>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Visual representation of your company hierarchy</p>
        </div>
        <div className={`flex items-center space-x-2 rounded-xl border p-1 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
          <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className={`p-1.5 rounded-lg ${isDarkMode ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className={`text-xs w-10 text-center ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(Math.min(1.5, zoom + 0.1))} className={`p-1.5 rounded-lg ${isDarkMode ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => setZoom(1)} className={`p-1.5 rounded-lg ${isDarkMode ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chart View Tabs */}
      <div className={`flex gap-2 rounded-xl border p-1 w-fit ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
        <button
          onClick={() => setChartView('employee')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            chartView === 'employee'
              ? isDarkMode
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-blue-100 text-blue-600 border border-blue-200'
              : isDarkMode
              ? 'text-slate-400 hover:text-slate-100'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Employee Hierarchy
        </button>
        <button
          onClick={() => setChartView('department')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            chartView === 'department'
              ? isDarkMode
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-blue-100 text-blue-600 border border-blue-200'
              : isDarkMode
              ? 'text-slate-400 hover:text-slate-100'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Department Structure
        </button>
      </div>

      <div className={`rounded-2xl border shadow-sm p-8 overflow-auto min-h-[600px] ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
        {loading && (
          <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Loading organization chart...</div>
        )}

        {!loading && error && (
          <div className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>{error}</div>
        )}

        {!loading && !error && (
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.3s ease' }}>
            {chartView === 'employee' ? (
              <OrgNode node={chartRoot} isDarkMode={isDarkMode} />
            ) : (
              <DepartmentNode dept={deptStructure} isDarkMode={isDarkMode} onOpenDetails={setDetailsPopup} />
            )}
          </div>
        )}
      </div>

      {detailsPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDetailsPopup(null)}
        >
          <div
            className={`w-full max-w-2xl rounded-2xl border shadow-xl ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`flex items-center justify-between px-5 py-4 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <div>
                <h3 className={`text-base font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{detailsPopup.departmentName} - Users & Designations</h3>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{detailsPopup.employees.length} users from database</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailsPopup(null)}
                className={`p-1.5 rounded-lg ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-auto p-5">
              {detailsPopup.employees.length === 0 ? (
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>No users found for this department.</p>
              ) : (
                <div className="space-y-2">
                  {detailsPopup.employees.map((emp) => (
                    <div key={emp.id} className={`flex items-center justify-between rounded-lg px-3 py-2 border ${isDarkMode ? 'border-slate-700 bg-slate-800/60' : 'border-gray-200 bg-gray-50'}`}>
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{emp.name}</span>
                      <span className={`text-xs px-2 py-1 rounded ${isDarkMode ? 'bg-cyan-500/20 text-cyan-200' : 'bg-blue-100 text-blue-700'}`}>{emp.designation || 'N/A'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationChart;
