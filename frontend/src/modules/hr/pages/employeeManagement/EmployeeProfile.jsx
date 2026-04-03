import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, Building2,
  Briefcase, Edit3, User, FileText, Clock, Award,
  Download, Eye, X, Camera
} from 'lucide-react';

const InfoItem = ({ icon: Icon, label, value, isDarkMode }) => (
  <div className="flex items-start space-x-3 py-3">
    <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}><Icon className={`w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} /></div>
    <div>
      <div className={`text-xs mb-0.5 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{label}</div>
      <div className={`text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{value || '—'}</div>
    </div>
  </div>
);

const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('personal');
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dob: '',
    gender: '',
    address: '',
    department: '',
    designation: '',
    joinDate: '',
    employeeCode: ''
  });
  const { isDarkMode = false } = useOutletContext() || {};
  const token = localStorage.getItem('erp_token');
  const avatarInputRef = useRef(null);

  const tabs = ['personal', 'work', 'documents'];

  useEffect(() => {
    const fetchEmployee = async () => {
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const response = await fetch(`http://localhost:5000/api/hr/employees/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || 'Failed to fetch employee profile');
        }

        const data = payload.data;
        setEmployee({
          id: data.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '-',
          phone: data.phone || '-',
          dob: data.dob ? String(data.dob).slice(0, 10) : '-',
          gender: data.gender ? String(data.gender).charAt(0).toUpperCase() + String(data.gender).slice(1) : '-',
          address: data.address || '-',
          department: data.department || '-',
          designation: data.designation || '-',
          employeeCode: data.employeeCode || '-',
          profileImage: data.profileImage || null,
          joinDate: data.joinDate ? String(data.joinDate).slice(0, 10) : '-',
          managerName: data.managerId ? `Employee #${data.managerId}` : '-',
          status: data.isActive ? 'active' : 'terminated',
          employmentType: data.employmentType ? String(data.employmentType).replaceAll('_', ' ') : '-',
          baseSalary: data.baseSalary ? String(data.baseSalary) : '-',
          documents: Array.isArray(data.documents) ? data.documents : []
        });
      } catch (err) {
        setError(err.message || 'Failed to fetch employee profile');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [id, token]);

  const employeeName = employee ? `${employee.firstName} ${employee.lastName}`.trim() : '';
  const initials = employeeName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('') || '--';

  const avatarUrl = employee?.profileImage
    ? `http://localhost:5000${employee.profileImage}`
    : null;

  const triggerAvatarPick = () => {
    if (avatarInputRef.current && !isAvatarUploading) {
      avatarInputRef.current.click();
    }
  };

  const handleAvatarFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!String(file.type || '').startsWith('image/')) {
      setError('Please select a valid image file');
      event.target.value = '';
      return;
    }

    if (!token) {
      setError('Authentication required');
      event.target.value = '';
      return;
    }

    try {
      setError('');
      setIsAvatarUploading(true);

      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(`http://localhost:5000/api/hr/employees/${id}/avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to upload profile image');
      }

      setEmployee((prev) => ({
        ...prev,
        profileImage: payload?.data?.profileImage || prev.profileImage
      }));
    } catch (err) {
      setError(err.message || 'Failed to upload profile image');
    } finally {
      setIsAvatarUploading(false);
      event.target.value = '';
    }
  };

  const openEditModal = () => {
    if (!employee) return;

    setEditForm({
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      email: employee.email || '',
      phone: employee.phone || '',
      dob: employee.dob && employee.dob !== '-' ? employee.dob : '',
      gender: employee.gender ? String(employee.gender).toLowerCase() : '',
      address: employee.address && employee.address !== '-' ? employee.address : '',
      department: employee.department && employee.department !== '-' ? employee.department : '',
      designation: employee.designation && employee.designation !== '-' ? employee.designation : '',
      joinDate: employee.joinDate && employee.joinDate !== '-' ? employee.joinDate : '',
      employeeCode: employee.employeeCode && employee.employeeCode !== '-' ? employee.employeeCode : ''
    });
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    setIsEditOpen(false);
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();

    if (!token) {
      setError('Authentication required');
      return;
    }

    try {
      setIsSaving(true);
      setError('');

      const response = await fetch(`http://localhost:5000/api/hr/employees/${id}`, {
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
          dob: editForm.dob || null,
          gender: editForm.gender || null,
          address: editForm.address || null,
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

      setEmployee((prev) => ({
        ...prev,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        phone: editForm.phone || '-',
        dob: editForm.dob || '-',
        gender: editForm.gender ? editForm.gender.charAt(0).toUpperCase() + editForm.gender.slice(1) : '-',
        address: editForm.address || '-',
        department: editForm.department || '-',
        designation: editForm.designation || '-',
        joinDate: editForm.joinDate || '-',
        employeeCode: editForm.employeeCode || '-'
      }));

      setIsEditOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to update employee');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`rounded-2xl p-8 text-sm ${isDarkMode ? 'bg-[#0d2230] text-slate-300 border border-cyan-400/10' : 'bg-white text-gray-600 border border-gray-100'}`}>
        Loading employee profile...
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/dashboard/hr/employees')} className={`flex items-center space-x-2 transition-colors ${isDarkMode ? 'text-slate-500 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'}`}>
          <ArrowLeft className="w-4 h-4" /><span className="text-sm">Back to Employees</span>
        </button>
        <div className={`rounded-2xl p-6 text-sm border ${isDarkMode ? 'bg-red-900/20 border-red-500/30 text-red-200' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {error || 'Employee not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className={`flex items-center space-x-2 transition-colors ${isDarkMode ? 'text-slate-500 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'}`}>
        <ArrowLeft className="w-4 h-4" /><span className="text-sm">Back to Employees</span>
      </button>

      {/* Header Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`relative overflow-hidden rounded-2xl border shadow-sm ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
        <div className="h-32 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500" />
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end space-y-4 sm:space-y-0 sm:space-x-5 -mt-12">
            <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-3xl font-bold border-4 shadow-lg ${isDarkMode ? 'border-[#0d2230]' : 'border-white'}`}>
              <div className="relative w-full h-full rounded-2xl overflow-hidden group">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={employeeName || 'Employee avatar'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold bg-gradient-to-br from-blue-400 to-cyan-500">
                    {initials}
                  </div>
                )}

                <button
                  type="button"
                  onClick={triggerAvatarPick}
                  disabled={isAvatarUploading}
                  className={`absolute inset-0 flex items-center justify-center transition-all ${isAvatarUploading ? 'bg-black/55' : 'bg-black/0 group-hover:bg-black/50'} ${isAvatarUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium text-white bg-cyan-600/90">
                    <Camera className="w-3.5 h-3.5 mr-1" />
                    {isAvatarUploading ? 'Uploading...' : 'Edit'}
                  </span>
                </button>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{employeeName || '-'}</h1>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{employee.designation} · {employee.department}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${employee.status === 'active' ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200') : (isDarkMode ? 'bg-red-500/10 text-red-300 border-red-500/20' : 'bg-red-50 text-red-700 border-red-200')}`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${employee.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    {employee.status === 'active' ? 'Active' : 'Terminated'}
                  </span>
                  <button onClick={openEditModal} className={`flex items-center space-x-2 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isDarkMode ? 'bg-cyan-600 shadow-lg shadow-cyan-950/30 hover:bg-cyan-500' : 'bg-blue-600 shadow-lg shadow-blue-500/25 hover:bg-blue-700'}`}>
                    <Edit3 className="w-4 h-4" /><span>Edit</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className={`flex flex-wrap gap-6 mt-6 pt-5 border-t ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
            {[
              { icon: Mail, text: employee.email },
              { icon: Phone, text: employee.phone },
              { icon: Building2, text: employee.employeeCode },
              { icon: Calendar, text: `Joined ${employee.joinDate}` },
            ].map((item, i) => (
              <div key={i} className={`flex items-center space-x-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                <item.icon className={`w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} /><span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Tabs Content */}
      <div className={`rounded-2xl border shadow-sm ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
        <div className={`flex items-center space-x-1 px-6 pt-4 border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
          {tabs.map((t) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`relative px-4 py-2 text-sm font-medium capitalize transition-all ${activeTab === t ? (isDarkMode ? 'text-cyan-300' : 'text-blue-600') : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700')}`}>
              {t}
              {activeTab === t && <motion.div layoutId="profileTab" className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full ${isDarkMode ? 'bg-cyan-400' : 'bg-blue-600'}`} />}
            </button>
          ))}
        </div>
        <div className="p-6">
          {activeTab === 'personal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <InfoItem icon={User} label="Full Name" value={employeeName} isDarkMode={isDarkMode} />
              <InfoItem icon={Mail} label="Email" value={employee.email} isDarkMode={isDarkMode} />
              <InfoItem icon={Phone} label="Phone" value={employee.phone} isDarkMode={isDarkMode} />
              <InfoItem icon={Calendar} label="Date of Birth" value={employee.dob} isDarkMode={isDarkMode} />
              <InfoItem icon={User} label="Gender" value={employee.gender} isDarkMode={isDarkMode} />
              <InfoItem icon={MapPin} label="Address" value={employee.address} isDarkMode={isDarkMode} />
            </div>
          )}
          {activeTab === 'work' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <InfoItem icon={Building2} label="Department" value={employee.department} isDarkMode={isDarkMode} />
                <InfoItem icon={Briefcase} label="Designation" value={employee.designation} isDarkMode={isDarkMode} />
                <InfoItem icon={Clock} label="Employment Type" value={employee.employmentType} isDarkMode={isDarkMode} />
                <InfoItem icon={Calendar} label="Join Date" value={employee.joinDate} isDarkMode={isDarkMode} />
                <InfoItem icon={User} label="Reports To" value={employee.managerName} isDarkMode={isDarkMode} />
                <InfoItem icon={Award} label="Base Salary" value={employee.baseSalary} isDarkMode={isDarkMode} />
              </div>
            </div>
          )}
          {activeTab === 'documents' && (
            <div className="space-y-3">
              {employee.documents.map((doc) => {
                const fileUrl = doc.path ? `http://localhost:5000${doc.path}` : '#';
                const sizeMb = doc.size ? `${(Number(doc.size) / (1024 * 1024)).toFixed(2)} MB` : 'Unknown size';
                return (
                <div key={doc.id} className={`flex items-center justify-between p-4 rounded-xl transition-colors group ${isDarkMode ? 'bg-slate-900 hover:bg-slate-800' : 'bg-gray-50 hover:bg-gray-100'}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-cyan-500/10' : 'bg-blue-100'}`}>
                      <FileText className={`w-5 h-5 ${isDarkMode ? 'text-cyan-300' : 'text-blue-600'}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{doc.name}</p>
                      <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{doc.type} · {sizeMb}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href={fileUrl} target="_blank" rel="noreferrer" className={`p-2 rounded-lg ${isDarkMode ? 'text-slate-500 hover:text-cyan-300 hover:bg-cyan-500/10' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}><Eye className="w-4 h-4" /></a>
                    <a href={fileUrl} download className={`p-2 rounded-lg ${isDarkMode ? 'text-slate-500 hover:text-emerald-300 hover:bg-emerald-500/10' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'}`}><Download className="w-4 h-4" /></a>
                  </div>
                </div>
                );
              })}
              {employee.documents.length === 0 && (
                <div className={`text-center py-10 text-sm ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>
                  No documents uploaded.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSaveEdit}
            className={`w-full max-w-2xl rounded-2xl border shadow-xl ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/20' : 'bg-white border-gray-200'}`}
          >
            <div className={`flex items-center justify-between px-5 py-4 border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Edit Employee Details</h3>
              <button type="button" onClick={closeEditModal} className={`p-1.5 rounded-lg ${isDarkMode ? 'text-slate-500 hover:text-slate-200 hover:bg-slate-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>First Name</label>
                  <input required value={editForm.firstName} onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))} placeholder="First name" className={`w-full px-3 py-2 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`} />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Last Name</label>
                  <input required value={editForm.lastName} onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))} placeholder="Last name" className={`w-full px-3 py-2 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Email</label>
                  <input required type="email" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className={`w-full px-3 py-2 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`} />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Phone</label>
                  <input value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" className={`w-full px-3 py-2 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Date Of Birth</label>
                  <input type="date" value={editForm.dob} onChange={(e) => setEditForm((p) => ({ ...p, dob: e.target.value }))} className={`w-full px-3 py-2 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`} />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Gender</label>
                  <select value={editForm.gender} onChange={(e) => setEditForm((p) => ({ ...p, gender: e.target.value }))} className={`w-full px-3 py-2 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`}>
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={`block text-xs mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Address</label>
                <input value={editForm.address} onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))} placeholder="Address" className={`w-full px-3 py-2 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Department</label>
                  <input required value={editForm.department} onChange={(e) => setEditForm((p) => ({ ...p, department: e.target.value }))} placeholder="Department" className={`w-full px-3 py-2 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`} />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Designation</label>
                  <input required value={editForm.designation} onChange={(e) => setEditForm((p) => ({ ...p, designation: e.target.value }))} placeholder="Designation" className={`w-full px-3 py-2 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Join Date</label>
                  <input required type="date" value={editForm.joinDate} onChange={(e) => setEditForm((p) => ({ ...p, joinDate: e.target.value }))} className={`w-full px-3 py-2 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`} />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Employee Code</label>
                  <input required value={editForm.employeeCode} onChange={(e) => setEditForm((p) => ({ ...p, employeeCode: e.target.value }))} placeholder="Employee code" className={`w-full px-3 py-2 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`} />
                </div>
              </div>
            </div>

            <div className={`flex items-center justify-end space-x-2 px-5 py-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <button type="button" onClick={closeEditModal} className={`px-4 py-2 rounded-xl text-sm font-medium ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
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

export default EmployeeProfile;
