import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  BadgeCheck,
  Building2,
  UserCheck,
  Briefcase,
  CalendarDays,
  CalendarClock,
  ShieldCheck,
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  Hash,
  CircleDollarSign,
  Lock,
  X,
  Save
} from 'lucide-react';

const API_BASE = 'http://localhost:5000';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.08, duration: 0.45 }
  })
};

const EmployeeDashboardPage = () => {
  const navigate = useNavigate();
  const { isDarkMode = false } = useOutletContext() || {};
  const token = localStorage.getItem('erp_token');
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileActionMessage, setProfileActionMessage] = useState('');
  const [profileActionError, setProfileActionError] = useState('');
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dob: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    department: '',
    designation: '',
    joinDate: '',
    employmentType: '',
    baseSalary: ''
  });
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('erp_user') || '{}');
    } catch {
      return {};
    }
  })();

  const fetchEmployeeProfile = async () => {
    try {
      setIsLoadingProfile(true);
      setFetchError('');

      const response = await fetch(`${API_BASE}/api/hr/employees/my-profile/status`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success || !payload?.data?.completed) {
        localStorage.setItem('erp_employee_profile_complete', 'false');
        navigate('/employee/complete-profile');
        return;
      }

      localStorage.setItem('erp_employee_profile_complete', 'true');
      const employeeId = payload?.data?.employeeId;

      if (!employeeId) {
        setFetchError('Employee profile is not linked yet.');
        return;
      }

      const profileResponse = await fetch(`${API_BASE}/api/hr/employees/${employeeId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const profilePayload = await profileResponse.json();
      if (!profileResponse.ok || !profilePayload?.success) {
        throw new Error(profilePayload?.message || 'Failed to load employee profile');
      }

      setEmployeeProfile(profilePayload?.data || null);
    } catch {
      setFetchError('Unable to load employee data right now.');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (!token || user?.role !== 'employee') {
      navigate('/login');
      return;
    }

    fetchEmployeeProfile();
  }, [navigate, token, user?.role]);

  const openEditModal = () => {
    if (!employeeProfile) return;

    setProfileActionError('');
    setProfileActionMessage('');
    setEditForm({
      firstName: employeeProfile.firstName || '',
      lastName: employeeProfile.lastName || '',
      email: employeeProfile.email || '',
      phone: employeeProfile.phone || '',
      dob: employeeProfile.dob ? String(employeeProfile.dob).slice(0, 10) : '',
      gender: employeeProfile.gender || '',
      address: employeeProfile.address || '',
      city: employeeProfile.city || '',
      state: employeeProfile.state || '',
      zipCode: employeeProfile.zipCode || '',
      department: employeeProfile.department || '',
      designation: employeeProfile.designation || '',
      joinDate: employeeProfile.joinDate ? String(employeeProfile.joinDate).slice(0, 10) : '',
      employmentType: employeeProfile.employmentType || 'full_time',
      baseSalary: employeeProfile.baseSalary || ''
    });
    setShowEditModal(true);
  };

  const saveProfileUpdates = async () => {
    if (!token || !employeeProfile?.id) {
      setProfileActionError('Employee profile is not available to update.');
      return;
    }

    try {
      setIsSavingProfile(true);
      setProfileActionError('');
      setProfileActionMessage('');

      const response = await fetch(`${API_BASE}/api/hr/employees/${employeeProfile.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: String(editForm.firstName || '').trim(),
          lastName: String(editForm.lastName || '').trim(),
          email: String(editForm.email || '').trim().toLowerCase(),
          phone: String(editForm.phone || '').trim(),
          dob: editForm.dob || null,
          gender: editForm.gender || null,
          address: String(editForm.address || '').trim() || null,
          city: String(editForm.city || '').trim() || null,
          state: String(editForm.state || '').trim() || null,
          zipCode: String(editForm.zipCode || '').trim() || null
        })
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to update profile');
      }

      setProfileActionMessage('Profile updated successfully.');
      setShowEditModal(false);
      await fetchEmployeeProfile();
    } catch (saveError) {
      setProfileActionError(saveError.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const profileCompletion = useMemo(() => {
    if (!employeeProfile) return 0;
    const checks = [
      Boolean(employeeProfile.firstName),
      Boolean(employeeProfile.lastName),
      Boolean(employeeProfile.email),
      Boolean(employeeProfile.phone),
      Boolean(employeeProfile.department),
      Boolean(employeeProfile.designation),
      Boolean(employeeProfile.joinDate),
      Boolean(employeeProfile.employeeCode)
    ];

    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }, [employeeProfile]);

  const formatDate = (value) => {
    if (!value) return '--';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '--' : parsed.toLocaleDateString();
  };

  const formatSalary = (value) => {
    const salaryNumber = Number(value);
    if (!Number.isFinite(salaryNumber) || salaryNumber <= 0) return '--';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0
    }).format(salaryNumber);
  };

  const statCards = [
    {
      label: 'Role',
      value: user?.role || 'employee',
      icon: BadgeCheck,
      bg: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      label: 'Department',
      value: employeeProfile?.department || '--',
      icon: Building2,
      bg: 'bg-cyan-50',
      iconColor: 'text-cyan-600'
    },
    {
      label: 'Designation',
      value: employeeProfile?.designation || '--',
      icon: Briefcase,
      bg: 'bg-emerald-50',
      iconColor: 'text-emerald-600'
    },
    {
      label: 'Profile Completion',
      value: `${profileCompletion}%`,
      icon: ShieldCheck,
      bg: 'bg-amber-50',
      iconColor: 'text-amber-600'
    }
  ];

  const greetingName = employeeProfile
    ? `${employeeProfile.firstName || ''} ${employeeProfile.lastName || ''}`.trim()
    : '';

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-2xl p-6 lg:p-8 border ${
          isDarkMode
            ? 'text-white bg-[linear-gradient(135deg,_rgba(34,211,238,0.2)_0%,_rgba(37,99,235,0.38)_45%,_rgba(6,182,212,0.3)_100%)] border-cyan-400/15 shadow-[0_10px_40px_rgba(8,21,31,0.35)]'
            : 'text-white bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 border-transparent'
        }`}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-white/10 rounded-full blur-3xl translate-y-1/2" />
        <div className="relative z-10">
          <h1 className="text-2xl lg:text-3xl font-bold">
            Hello{greetingName ? `, ${greetingName}` : ''}
          </h1>
          <p className="text-sm text-white/85 mt-1">Track your profile and onboarding readiness.</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/15 text-white ring-1 ring-white/30">
              Account: {user?.email || '--'}
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/15 text-white ring-1 ring-white/30">
              Profile strength: {profileCompletion}%
            </div>
          </div>
        </div>
      </motion.div>

      {fetchError && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
          {fetchError}
        </div>
      )}

      {profileActionMessage && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {profileActionMessage}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <motion.div
            key={card.label}
            custom={index}
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className={`rounded-2xl border p-5 shadow-sm transition-all relative overflow-hidden ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20 hover:shadow-black/35' : 'bg-white border-gray-100 hover:shadow-md'}`}
          >
            <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl ${isDarkMode ? 'bg-cyan-500/10' : 'bg-blue-100/70'}`} />
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-white/5' : card.bg}`}>
              <card.icon className={`w-5 h-5 ${card.iconColor}`} />
            </div>
            <p className={`text-xs mt-3 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{card.label}</p>
            <p className={`text-sm font-semibold mt-1 break-all ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{card.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
        <div className={`rounded-2xl border p-5 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Profile Snapshot</h2>
            <button
              type="button"
              onClick={openEditModal}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            >
              Update Profile
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {isLoadingProfile ? (
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Loading profile details...</p>
          ) : (
            <div className="space-y-4">
              <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-blue-100 bg-blue-50/40'}`}>
                <p className={`text-xs font-semibold mb-3 uppercase tracking-wide ${isDarkMode ? 'text-cyan-300' : 'text-blue-700'}`}>Personal Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    {
                      label: 'Full Name',
                      value: employeeProfile ? `${employeeProfile.firstName || ''} ${employeeProfile.lastName || ''}`.trim() || '--' : '--',
                      icon: UserCheck
                    },
                    {
                      label: 'Work Email',
                      value: employeeProfile?.email || user?.email || '--',
                      icon: Mail
                    },
                    {
                      label: 'Phone',
                      value: employeeProfile?.phone || '--',
                      icon: Phone
                    },
                    {
                      label: 'Date of Birth',
                      value: formatDate(employeeProfile?.dob),
                      icon: CalendarDays
                    },
                    {
                      label: 'Gender',
                      value: employeeProfile?.gender || '--',
                      icon: BadgeCheck
                    },
                    {
                      label: 'Address',
                      value: [employeeProfile?.city, employeeProfile?.state, employeeProfile?.zipCode].filter(Boolean).join(', ') || employeeProfile?.address || '--',
                      icon: MapPin
                    }
                  ].map((item) => (
                    <div key={item.label} className={`rounded-lg px-3 py-2 border ${isDarkMode ? 'border-slate-800 bg-[#081b29]' : 'border-blue-100 bg-white'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <item.icon className="w-3.5 h-3.5 text-cyan-500" />
                        <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{item.label}</p>
                      </div>
                      <p className={`text-sm font-semibold break-all ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-emerald-100 bg-emerald-50/40'}`}>
                <p className={`text-xs font-semibold mb-3 uppercase tracking-wide ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>Work Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    {
                      label: 'Employee Code',
                      value: employeeProfile?.employeeCode || '--',
                      icon: Hash
                    },
                    {
                      label: 'Department',
                      value: employeeProfile?.department || '--',
                      icon: Building2
                    },
                    {
                      label: 'Designation',
                      value: employeeProfile?.designation || '--',
                      icon: Briefcase
                    },
                    {
                      label: 'Join Date',
                      value: formatDate(employeeProfile?.joinDate),
                      icon: CalendarClock
                    },
                    {
                      label: 'Employment Type',
                      value: employeeProfile?.employmentType ? String(employeeProfile.employmentType).replaceAll('_', ' ') : '--',
                      icon: ShieldCheck
                    },
                    {
                      label: 'Base Salary',
                      value: formatSalary(employeeProfile?.baseSalary),
                      icon: CircleDollarSign
                    }
                  ].map((item) => (
                    <div key={item.label} className={`rounded-lg px-3 py-2 border ${isDarkMode ? 'border-slate-800 bg-[#081b29]' : 'border-emerald-100 bg-white'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <item.icon className="w-3.5 h-3.5 text-emerald-500" />
                        <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{item.label}</p>
                      </div>
                      <p className="text-sm font-semibold capitalize">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={`rounded-2xl border p-5 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10' : 'bg-white border-gray-100'}`}>
          <h2 className={`text-base font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Account Health</h2>

          <div className={`rounded-xl p-4 mb-4 ${isDarkMode ? 'bg-slate-900/70 border border-slate-800' : 'bg-gray-50 border border-gray-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Profile Completion</p>
              <p className={`text-xs font-semibold ${isDarkMode ? 'text-cyan-300' : 'text-blue-700'}`}>{profileCompletion}%</p>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
              <div className="h-full bg-cyan-500" style={{ width: `${profileCompletion}%` }} />
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                label: 'Employee Account',
                value: 'Active',
                icon: UserCheck,
                tone: isDarkMode ? 'text-emerald-300' : 'text-emerald-700'
              },
              {
                label: 'Profile Status',
                value: profileCompletion === 100 ? 'Complete' : 'Needs attention',
                icon: ShieldCheck,
                tone: profileCompletion === 100
                  ? (isDarkMode ? 'text-emerald-300' : 'text-emerald-700')
                  : (isDarkMode ? 'text-amber-300' : 'text-amber-700')
              },
              {
                label: 'Employment Type',
                value: employeeProfile?.employmentType ? String(employeeProfile.employmentType).replaceAll('_', ' ') : '--',
                icon: CalendarDays,
                tone: isDarkMode ? 'text-cyan-300' : 'text-blue-700'
              }
            ].map((item) => (
              <div key={item.label} className={`rounded-lg border px-3 py-2 ${isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <item.icon className="w-4 h-4 text-cyan-400" />
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{item.label}</p>
                  </div>
                  <p className={`text-xs font-semibold capitalize ${item.tone}`}>{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={`mt-4 rounded-xl border p-3 ${isDarkMode ? 'border-cyan-900/50 bg-cyan-950/20' : 'border-blue-100 bg-blue-50/70'}`}>
            <p className={`text-xs font-semibold ${isDarkMode ? 'text-cyan-300' : 'text-blue-800'}`}>Tip</p>
            <p className={`text-xs mt-1 leading-5 ${isDarkMode ? 'text-slate-300' : 'text-blue-900/80'}`}>
              Keep your work details up-to-date so HR can process payroll, attendance, and leave requests without delays.
            </p>
            <button
              type="button"
              onClick={() => navigate('/dashboard/employee/salary')}
              className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            >
              View My Salary
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[1px] flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
          <div
            className={`w-full max-w-3xl rounded-2xl border shadow-2xl ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/15' : 'bg-white border-gray-200'}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`px-5 py-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <div>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Update Profile</h3>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Edit your personal and work profile details.</p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className={`p-2 rounded-lg ${isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-auto">
              {profileActionError && (
                <div className={`rounded-lg px-3 py-2 text-sm border ${isDarkMode ? 'bg-red-500/10 text-red-300 border-red-500/30' : 'bg-red-50 text-red-700 border-red-100'}`}>
                  {profileActionError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 rounded-lg border px-3 py-2 bg-gradient-to-r from-cyan-50/80 to-emerald-50/80 border-cyan-100 text-cyan-900">
                  <p className="text-xs font-semibold">Personal Details</p>
                  <p className="text-xs mt-0.5 opacity-80">You can update these details from your dashboard.</p>
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>First Name</label>
                  <input value={editForm.firstName} onChange={(e) => setEditForm((prev) => ({ ...prev, firstName: e.target.value }))} className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`} />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Last Name</label>
                  <input value={editForm.lastName} onChange={(e) => setEditForm((prev) => ({ ...prev, lastName: e.target.value }))} className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`} />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Email</label>
                  <input type="email" value={editForm.email} onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))} className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`} />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Phone</label>
                  <input type="tel" value={editForm.phone} onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))} className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`} />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Date of Birth</label>
                  <input type="date" value={editForm.dob} onChange={(e) => setEditForm((prev) => ({ ...prev, dob: e.target.value }))} className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`} />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Gender</label>
                  <select value={editForm.gender} onChange={(e) => setEditForm((prev) => ({ ...prev, gender: e.target.value }))} className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className={`sm:col-span-2 rounded-lg border px-3 py-2 ${isDarkMode ? 'border-amber-800/50 bg-amber-900/20 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5" />
                    <p className="text-xs font-semibold">HR Managed Fields (Read-only)</p>
                  </div>
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Department</label>
                  <input value={editForm.department} disabled className={`w-full px-3 py-2 rounded-lg border text-sm cursor-not-allowed ${isDarkMode ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-gray-100 border-gray-200 text-gray-600'}`} />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Designation</label>
                  <input value={editForm.designation} disabled className={`w-full px-3 py-2 rounded-lg border text-sm cursor-not-allowed ${isDarkMode ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-gray-100 border-gray-200 text-gray-600'}`} />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Join Date</label>
                  <input type="text" value={formatDate(editForm.joinDate)} disabled className={`w-full px-3 py-2 rounded-lg border text-sm cursor-not-allowed ${isDarkMode ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-gray-100 border-gray-200 text-gray-600'}`} />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Employment Type</label>
                  <input type="text" value={editForm.employmentType ? String(editForm.employmentType).replaceAll('_', ' ') : '--'} disabled className={`w-full px-3 py-2 rounded-lg border text-sm capitalize cursor-not-allowed ${isDarkMode ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-gray-100 border-gray-200 text-gray-600'}`} />
                </div>
                <div className="sm:col-span-2">
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Address</label>
                  <input value={editForm.address} onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))} className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`} />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>City</label>
                  <input value={editForm.city} onChange={(e) => setEditForm((prev) => ({ ...prev, city: e.target.value }))} className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`} />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>State</label>
                  <input value={editForm.state} onChange={(e) => setEditForm((prev) => ({ ...prev, state: e.target.value }))} className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`} />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Zip Code</label>
                  <input value={editForm.zipCode} onChange={(e) => setEditForm((prev) => ({ ...prev, zipCode: e.target.value }))} className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`} />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Base Salary</label>
                  <input type="text" value={formatSalary(editForm.baseSalary)} disabled className={`w-full px-3 py-2 rounded-lg border text-sm cursor-not-allowed ${isDarkMode ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-gray-100 border-gray-200 text-gray-600'}`} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className={`px-4 py-2 rounded-lg text-sm ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveProfileUpdates}
                  disabled={isSavingProfile}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-white ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-900/50' : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300'} disabled:cursor-not-allowed`}
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSavingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboardPage;
