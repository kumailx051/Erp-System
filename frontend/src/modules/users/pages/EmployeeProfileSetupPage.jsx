import React, { useEffect, useMemo, useState } from 'react';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Briefcase, Building2, CalendarClock, Mail, Phone, Save, User } from 'lucide-react';

const API_BASE = 'http://localhost:5000';

const EmployeeProfileSetupPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('erp_token');
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('erp_user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [designationOptions, setDesignationOptions] = useState([]);
  const [shiftOptions, setShiftOptions] = useState([]);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: user?.email || '',
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
    employmentType: 'full_time',
    baseSalary: '',
    shiftId: ''
  });

  useEffect(() => {
    if (!token || user?.role !== 'employee') {
      navigate('/login');
      return;
    }

    const checkStatus = async () => {
      try {
        setChecking(true);
        const response = await fetch(`${API_BASE}/api/hr/employees/my-profile/status`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const payload = await response.json();
        if (response.ok && payload?.success && payload?.data?.completed) {
          localStorage.setItem('erp_employee_profile_complete', 'true');
          navigate('/dashboard/employee');
          return;
        }
      } catch {
        // keep user on form
      } finally {
        setChecking(false);
      }
    };

    checkStatus();
  }, [navigate, token, user?.role]);

  useEffect(() => {
    if (!token) return;

    const fetchOptions = async () => {
      try {
        const [orgResponse, shiftResponse] = await Promise.all([
          fetch(`${API_BASE}/api/hr/organization/options`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API_BASE}/api/hr/shifts`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const orgPayload = await orgResponse.json();
        const shiftPayload = await shiftResponse.json();

        if (orgResponse.ok && orgPayload?.success) {
          setDepartmentOptions((orgPayload?.data?.departments || []).map((item) => ({ value: item.name, label: item.name })));
          setDesignationOptions((orgPayload?.data?.designations || []).map((item) => ({
            value: item.title,
            label: item.title,
            departmentName: item.departmentName
          })));
        }

        if (shiftResponse.ok && shiftPayload?.success) {
          setShiftOptions((shiftPayload?.data?.shifts || []).map((shift) => ({
            value: String(shift.id),
            label: `${shift.name} (${shift.startTime}-${shift.endTime})`
          })));
        }
      } catch {
        // optional data
      }
    };

    fetchOptions();
  }, [token]);

  const filteredDesignationOptions = designationOptions.filter((item) => !formData.department || item.departmentName === formData.department);

  const onChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'department' ? { designation: '' } : {})
    }));
  };

  const validate = () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) return 'First and last name are required';
    if (!formData.department || !formData.designation) return 'Department and designation are required';
    if (!formData.joinDate) return 'Join date is required';
    if (!formData.email || !String(formData.email).includes('@')) return 'Valid email is required';
    return '';
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const validationMessage = validate();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    try {
      setLoading(true);

      const submitData = new FormData();
      submitData.append('firstName', formData.firstName);
      submitData.append('lastName', formData.lastName);
      submitData.append('email', formData.email);
      submitData.append('phone', formData.phone || '');
      submitData.append('dob', formData.dob || '');
      submitData.append('gender', formData.gender || '');
      submitData.append('address', formData.address || '');
      submitData.append('city', formData.city || '');
      submitData.append('state', formData.state || '');
      submitData.append('zipCode', formData.zipCode || '');
      submitData.append('department', formData.department);
      submitData.append('designation', formData.designation);
      submitData.append('joinDate', formData.joinDate);
      submitData.append('employmentType', formData.employmentType);
      submitData.append('baseSalary', formData.baseSalary || '');
      submitData.append('shiftId', formData.shiftId || '');

      const response = await fetch(`${API_BASE}/api/hr/employees`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: submitData
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to save employee profile');
      }

      localStorage.setItem('erp_employee_profile_complete', 'true');
      setSuccess('Profile saved successfully. Redirecting to dashboard...');
      setTimeout(() => navigate('/dashboard/employee'), 1200);
    } catch (submitError) {
      setError(submitError.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">Checking profile status...</div>;
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#09111d_0%,_#0f172a_100%)] px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Complete Employee Profile</h1>
          <p className="text-sm text-slate-400 mt-1">Before accessing dashboard, please complete your employee details.</p>
        </div>

        {error && (
          <div className="rounded-xl border px-4 py-3 text-sm border-red-500/30 bg-red-500/10 text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        {success && <div className="rounded-xl border px-4 py-3 text-sm border-emerald-500/30 bg-emerald-500/10 text-emerald-200">{success}</div>}

        <form onSubmit={submit} className="rounded-2xl border shadow-sm p-6 bg-[#0d2230] border-cyan-400/10 shadow-black/20 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-medium mb-1.5 block text-slate-200">First Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input name="firstName" value={formData.firstName} onChange={onChange} className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm bg-slate-900 border-slate-700 text-slate-100" placeholder="John" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block text-slate-200">Last Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input name="lastName" value={formData.lastName} onChange={onChange} className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm bg-slate-900 border-slate-700 text-slate-100" placeholder="Doe" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block text-slate-200">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input name="email" value={formData.email} readOnly className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm bg-slate-950 border-slate-800 text-slate-300" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block text-slate-200">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input name="phone" value={formData.phone} onChange={onChange} className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm bg-slate-900 border-slate-700 text-slate-100" placeholder="+92 3000000000" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block text-slate-200">Date of Birth</label>
              <DatePicker
                value={formData.dob ? dayjs(formData.dob, 'YYYY-MM-DD') : null}
                onChange={(value) => setFormData((prev) => ({ ...prev, dob: value ? value.format('YYYY-MM-DD') : '' }))}
                format="DD/MM/YYYY"
                className="w-full"
                style={{ height: 42 }}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block text-slate-200">Gender</label>
              <select name="gender" value={formData.gender} onChange={onChange} className="w-full px-4 py-2.5 border rounded-xl text-sm bg-slate-900 border-slate-700 text-slate-100">
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-1.5 block text-slate-200">Address</label>
              <input name="address" value={formData.address} onChange={onChange} className="w-full px-4 py-2.5 border rounded-xl text-sm bg-slate-900 border-slate-700 text-slate-100" placeholder="Address" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block text-slate-200">City</label>
              <input name="city" value={formData.city} onChange={onChange} className="w-full px-4 py-2.5 border rounded-xl text-sm bg-slate-900 border-slate-700 text-slate-100" placeholder="City" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block text-slate-200">State</label>
              <input name="state" value={formData.state} onChange={onChange} className="w-full px-4 py-2.5 border rounded-xl text-sm bg-slate-900 border-slate-700 text-slate-100" placeholder="State" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block text-slate-200">Zip Code</label>
              <input name="zipCode" value={formData.zipCode} onChange={onChange} className="w-full px-4 py-2.5 border rounded-xl text-sm bg-slate-900 border-slate-700 text-slate-100" placeholder="Zip code" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block text-slate-200">Join Date</label>
              <DatePicker
                value={formData.joinDate ? dayjs(formData.joinDate, 'YYYY-MM-DD') : null}
                onChange={(value) => setFormData((prev) => ({ ...prev, joinDate: value ? value.format('YYYY-MM-DD') : '' }))}
                format="DD/MM/YYYY"
                className="w-full"
                style={{ height: 42 }}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block text-slate-200">Department</label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <select name="department" value={formData.department} onChange={onChange} className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm bg-slate-900 border-slate-700 text-slate-100">
                  <option value="">Select...</option>
                  {departmentOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block text-slate-200">Designation</label>
              <div className="relative">
                <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <select name="designation" value={formData.designation} onChange={onChange} className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm bg-slate-900 border-slate-700 text-slate-100">
                  <option value="">Select...</option>
                  {filteredDesignationOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block text-slate-200">Employment Type</label>
              <select name="employmentType" value={formData.employmentType} onChange={onChange} className="w-full px-4 py-2.5 border rounded-xl text-sm bg-slate-900 border-slate-700 text-slate-100">
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block text-slate-200">Shift</label>
              <select name="shiftId" value={formData.shiftId} onChange={onChange} className="w-full px-4 py-2.5 border rounded-xl text-sm bg-slate-900 border-slate-700 text-slate-100">
                <option value="">Select...</option>
                {shiftOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block text-slate-200">Base Salary</label>
              <input name="baseSalary" type="number" value={formData.baseSalary} onChange={onChange} className="w-full px-4 py-2.5 border rounded-xl text-sm bg-slate-900 border-slate-700 text-slate-100" placeholder="50000" />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60">
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeProfileSetupPage;
