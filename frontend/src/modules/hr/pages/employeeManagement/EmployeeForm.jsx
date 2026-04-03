import React, { useEffect, useState } from 'react';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import {
  User, Briefcase, FileText, Save,
  Mail, Phone, MapPin, Building2, Hash,
  Upload, ChevronRight, CheckCircle, AlertCircle, Trash2
} from 'lucide-react';

const steps = [
  { key: 'personal', label: 'Personal Info', icon: User },
  { key: 'work', label: 'Work Details', icon: Briefcase },
  { key: 'documents', label: 'Documents', icon: FileText },
];

// Moved OUTSIDE EmployeeForm so React sees a stable component reference across renders
const InputField = React.memo(({ label, name, type = 'text', icon: Icon, placeholder, required = false, value, onChange, validationError, helperText, helperClassName, isDarkMode, ...rest }) => (
  <div>
    <label className={`flex items-center text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
      {label}
      {required && <span className="text-red-400 ml-1">*</span>}
    </label>
    <div className="relative">
      {Icon && <Icon className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
          validationError
            ? isDarkMode ? 'bg-red-900/30 border-red-500 text-slate-100 placeholder-slate-500 focus:ring-red-500/20 focus:border-red-400' : 'bg-red-50 border-red-300 text-gray-800 placeholder-gray-400 focus:ring-red-500/20 focus:border-red-400'
            : isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-cyan-500/20 focus:border-cyan-400' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:ring-blue-500/20 focus:border-blue-400'
        }`}
        {...rest}
      />
    </div>
    {validationError && (
      <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        {validationError}
      </p>
    )}
    {!validationError && helperText && (
      <p className={`text-xs mt-1.5 ${helperClassName || (isDarkMode ? 'text-slate-400' : 'text-gray-500')}`}>
        {helperText}
      </p>
    )}
  </div>
));

// Moved OUTSIDE EmployeeForm so React sees a stable component reference across renders
const SelectField = React.memo(({ label, name, options, icon: Icon, required = false, value, onChange, validationError, isDarkMode }) => (
  <div>
    <label className={`flex items-center text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
      {label}
      {required && <span className="text-red-400 ml-1">*</span>}
    </label>
    <div className="relative">
      {Icon && <Icon className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />}
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all appearance-none ${
          validationError
            ? isDarkMode ? 'bg-red-900/30 border-red-500 text-slate-100 focus:ring-red-500/20 focus:border-red-400' : 'bg-red-50 border-red-300 text-gray-800 focus:ring-red-500/20 focus:border-red-400'
            : isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 focus:ring-cyan-500/20 focus:border-cyan-400' : 'bg-white border-gray-200 text-gray-800 focus:ring-blue-500/20 focus:border-blue-400'
        }`}
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
    {validationError && (
      <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        {validationError}
      </p>
    )}
  </div>
));

const EmployeeForm = () => {
  const { id } = useParams();
  const isEdit = id && id !== 'new';
  const navigate = useNavigate();
  const { isDarkMode = false } = useOutletContext() || {};
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', dob: '',
    address: '', city: '', state: '', zipCode: '', gender: '',
    department: '', designation: '', managerId: '', joinDate: '',
    employmentType: 'full_time', baseSalary: '', employeeCode: '', shiftId: '',
  });

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [documentTypes, setDocumentTypes] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [emailCheckMessage, setEmailCheckMessage] = useState('');
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [designationOptions, setDesignationOptions] = useState([]);
  const [shiftOptions, setShiftOptions] = useState([]);

  // Email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  // Phone regex pattern (supports various formats)
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;

  const handleChange = React.useCallback((e) => {
    const { name, value } = e.target;

    if (name === 'employeeCode') {
      return;
    }

    setFormData(prev => {
      if (name === 'department') {
        return { ...prev, department: value, designation: '' };
      }
      return { ...prev, [name]: value };
    });
  }, []);

  const handleDobChange = React.useCallback((value) => {
    setFormData(prev => ({
      ...prev,
      dob: value ? value.format('YYYY-MM-DD') : ''
    }));
  }, []);

  const handleJoinDateChange = React.useCallback((value) => {
    setFormData(prev => ({
      ...prev,
      joinDate: value ? value.format('YYYY-MM-DD') : ''
    }));
  }, []);

  const handleDateInputKeyDown = React.useCallback((e) => {
    const controlKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab', 'Enter'];
    if (controlKeys.includes(e.key) || e.ctrlKey || e.metaKey) {
      return;
    }

    if (!/^\d$/.test(e.key) && e.key !== '/') {
      e.preventDefault();
      return;
    }

    const currentValue = e.currentTarget.value || '';
    const selectionStart = e.currentTarget.selectionStart ?? currentValue.length;
    const selectionEnd = e.currentTarget.selectionEnd ?? currentValue.length;
    const nextValue = `${currentValue.slice(0, selectionStart)}${e.key}${currentValue.slice(selectionEnd)}`;

    // DD/MM/YYYY -> max 8 digits total so year cannot exceed 4 digits.
    if (nextValue.replace(/\D/g, '').length > 8) {
      e.preventDefault();
      return;
    }

    const yearPart = (nextValue.split('/')[2] || '').replace(/\D/g, '');
    if (yearPart.length > 4) {
      e.preventDefault();
    }
  }, []);

  useEffect(() => {
    const email = formData.email.trim().toLowerCase();

    if (!email) {
      setIsCheckingEmail(false);
      setEmailExists(false);
      setEmailCheckMessage('');
      return;
    }

    if (!emailRegex.test(email)) {
      setIsCheckingEmail(false);
      setEmailExists(false);
      setEmailCheckMessage('');
      return;
    }

    const token = localStorage.getItem('erp_token');
    if (!token) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setIsCheckingEmail(true);
        setEmailCheckMessage('Checking email availability...');

        const params = new URLSearchParams({ email });
        if (isEdit && id) {
          params.set('excludeId', id);
        }

        const response = await fetch(`http://localhost:5000/api/hr/employees/check-email?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          signal: controller.signal
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || 'Unable to verify email');
        }

        setEmailExists(Boolean(result?.data?.exists));
        setEmailCheckMessage(result?.data?.exists ? 'Email already exists in database' : 'Email is available');
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }
        setEmailExists(false);
        setEmailCheckMessage('Could not verify email right now');
      } finally {
        if (!controller.signal.aborted) {
          setIsCheckingEmail(false);
        }
      }
    }, 450);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [formData.email, isEdit, id]);

  useEffect(() => {
    const token = localStorage.getItem('erp_token');
    if (!token) return;

    const fetchOrganizationOptions = async () => {
      try {
        const [orgResponse, shiftResponse] = await Promise.all([
          fetch('http://localhost:5000/api/hr/organization/options', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }),
          fetch('http://localhost:5000/api/hr/shifts', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          })
        ]);

        const payload = await orgResponse.json();
        const shiftPayload = await shiftResponse.json();
        if (!orgResponse.ok || !payload?.success) {
          throw new Error(payload?.message || 'Failed to fetch organization options');
        }

        if (!shiftResponse.ok || !shiftPayload?.success) {
          throw new Error(shiftPayload?.message || 'Failed to fetch shifts');
        }

        const departments = payload?.data?.departments || [];
        const designations = payload?.data?.designations || [];

        setDepartmentOptions(
          departments.map((dept) => ({
            value: dept.name,
            label: dept.name
          }))
        );

        setDesignationOptions(
          designations.map((des) => ({
            value: des.title,
            label: des.title,
            departmentName: des.departmentName
          }))
        );

        setShiftOptions(
          (shiftPayload?.data?.shifts || []).map((shift) => ({
            value: String(shift.id),
            label: `${shift.name} (${shift.startTime}-${shift.endTime})`
          }))
        );
      } catch (error) {
        // Keep form usable even if options API fails.
      }
    };

    fetchOrganizationOptions();
  }, []);

  useEffect(() => {
    if (isEdit) {
      return;
    }

    const token = localStorage.getItem('erp_token');
    if (!token) {
      return;
    }

    const fetchNextEmployeeCode = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/hr/employees/next-code', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || 'Failed to generate employee code');
        }

        setFormData((prev) => ({
          ...prev,
          employeeCode: payload?.data?.employeeCode || prev.employeeCode
        }));
      } catch {
        // Keep manual fallback empty if API fails.
      }
    };

    fetchNextEmployeeCode();
  }, [isEdit]);

  const filteredDesignationOptions = designationOptions.filter(
    (des) => !formData.department || des.departmentName === formData.department
  );

  // Pure validation check - does NOT set state, safe to call anywhere
  const getStepErrors = (step) => {
    const errors = {};
    if (step === 0) {
      if (!formData.firstName.trim()) errors.firstName = 'First name is required';
      if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
      if (!formData.email.trim()) {
        errors.email = 'Email is required';
      } else if (!emailRegex.test(formData.email)) {
        errors.email = 'Invalid email format (e.g., user@example.com)';
      } else if (isCheckingEmail) {
        errors.email = 'Please wait, checking email...';
      } else if (emailExists) {
        errors.email = 'Email already registered';
      }
      if (formData.phone && !phoneRegex.test(formData.phone)) {
        errors.phone = 'Invalid phone format (e.g., +1 (555) 123-4567)';
      }
      if (formData.dob && new Date(formData.dob) > new Date()) {
        errors.dob = 'Date of birth cannot be in the future';
      }
    } else if (step === 1) {
      if (isEdit && !formData.employeeCode.trim()) errors.employeeCode = 'Employee code is required';
      if (!formData.joinDate) errors.joinDate = 'Join date is required';
      if (!formData.department) errors.department = 'Department is required';
      if (!formData.designation) errors.designation = 'Designation is required';
      if (formData.baseSalary && isNaN(formData.baseSalary)) {
        errors.baseSalary = 'Base salary must be a valid number';
      }
    }
    return errors;
  };

  // Validates a step and shows errors in UI
  const validateStep = (step) => {
    const errors = getStepErrors(step);
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFileUpload = React.useCallback((e) => {
    const files = Array.from(e.target.files);
    const maxSize = 10 * 1024 * 1024; // 10MB

    const newFiles = files.filter(file => {
      if (file.size > maxSize) {
        setErrorMessage(`${file.name} is too large. Max size is 10MB`);
        return false;
      }
      return true;
    });

    setUploadedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const removeFile = React.useCallback((index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleDocumentTypeChange = React.useCallback((index, type) => {
    setDocumentTypes(prev => ({ ...prev, [index]: type }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Guard against accidental form submit before documents step.
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
      return;
    }
    
    // Use pure validation (no setState) to check both steps without side effects
    const step0Errors = getStepErrors(0);
    const step1Errors = getStepErrors(1);
    
    if (Object.keys(step0Errors).length > 0) {
      setValidationErrors(step0Errors);
      setCurrentStep(0);
      setErrorMessage('Please fix validation errors in Personal Info');
      return;
    }
    if (Object.keys(step1Errors).length > 0) {
      setValidationErrors(step1Errors);
      setCurrentStep(1);
      setErrorMessage('Please fix validation errors in Work Details');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('erp_token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Create FormData for multipart/form-data submission
      const submitData = new FormData();
      
      // Add form fields
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
      submitData.append('managerId', formData.managerId || '');
      submitData.append('joinDate', formData.joinDate);
      submitData.append('employmentType', formData.employmentType);
      submitData.append('baseSalary', formData.baseSalary || '');
      submitData.append('employeeCode', formData.employeeCode);
      submitData.append('shiftId', formData.shiftId || '');

      // Add uploaded files
      uploadedFiles.forEach((file, index) => {
        submitData.append('documents', file);
        submitData.append(`documentType_${index}`, documentTypes[index] || 'other');
      });

      const url = isEdit
        ? `http://localhost:5000/api/hr/employees/${id}`
        : 'http://localhost:5000/api/hr/employees';

      const method = isEdit ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: submitData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to save employee');
      }

      setSuccessMessage(`Employee ${isEdit ? 'updated' : 'created'} successfully!`);
      setTimeout(() => {
        navigate('/dashboard/hr/employees');
      }, 1500);
    } catch (error) {
      console.error('Error saving employee:', error);
      setErrorMessage(error.message || 'Error saving employee. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormKeyDown = React.useCallback((e) => {
    // Prevent implicit submit via Enter on step 1/2. Save should happen only on final step.
    if (e.key === 'Enter' && currentStep < steps.length - 1) {
      e.preventDefault();
    }
  }, [currentStep]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Status Messages */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`rounded-xl px-4 py-3 text-sm font-medium border ${isDarkMode ? 'bg-emerald-900/30 border-emerald-600 text-emerald-100' : 'bg-emerald-50 border-emerald-300 text-emerald-800'}`}
        >
          ✓ {successMessage}
        </motion.div>
      )}

      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`rounded-xl px-4 py-3 text-sm font-medium border flex items-center gap-2 ${isDarkMode ? 'bg-red-900/30 border-red-600 text-red-100' : 'bg-red-50 border-red-300 text-red-800'}`}
        >
          <AlertCircle className="w-4 h-4" />
          {errorMessage}
        </motion.div>
      )}

      {/* Header */}
      <div>
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {isEdit ? 'Edit Employee' : 'Add New Employee'}
        </h1>
        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          {isEdit ? 'Update employee information' : 'Fill in all required fields (*) to add a new employee'}
        </p>
      </div>

      {/* Steps */}
      <div className={`rounded-2xl border shadow-sm p-6 ${isDarkMode ? 'bg-[#0d2230] border-cyan-400/10 shadow-black/20' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, i) => (
            <React.Fragment key={step.key}>
              <button
                type="button"
                onClick={() => {
                  if (validateStep(currentStep)) {
                    setCurrentStep(i);
                  }
                }}
                className="flex items-center space-x-3 group cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all
                  ${i <= currentStep
                    ? isDarkMode ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/30' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {i < currentStep ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <span className={`text-sm font-medium hidden sm:block ${i <= currentStep ? (isDarkMode ? 'text-slate-100' : 'text-gray-900') : (isDarkMode ? 'text-slate-500' : 'text-gray-400')}`}>
                  {step.label}
                </span>
              </button>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 rounded-full ${i < currentStep ? (isDarkMode ? 'bg-cyan-500' : 'bg-blue-500') : (isDarkMode ? 'bg-slate-700' : 'bg-gray-200')}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown}>
          {/* Step 1: Personal Info */}
          {currentStep === 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-5"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputField label="First Name" name="firstName" icon={User} placeholder="John" required value={formData.firstName} onChange={handleChange} validationError={validationErrors.firstName} isDarkMode={isDarkMode} />
                <InputField label="Last Name" name="lastName" icon={User} placeholder="Doe" required value={formData.lastName} onChange={handleChange} validationError={validationErrors.lastName} isDarkMode={isDarkMode} />
                <InputField
                  label="Email"
                  name="email"
                  type="email"
                  icon={Mail}
                  placeholder="john@company.com"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  validationError={validationErrors.email}
                  helperText={emailCheckMessage}
                  helperClassName={emailExists ? 'text-red-500' : (isCheckingEmail ? (isDarkMode ? 'text-amber-300' : 'text-amber-600') : 'text-emerald-500')}
                  isDarkMode={isDarkMode}
                />
                <InputField label="Phone" name="phone" icon={Phone} placeholder="+92 3365017866" value={formData.phone} onChange={handleChange} validationError={validationErrors.phone} isDarkMode={isDarkMode} />
                <div>
                  <label className={`flex items-center text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
                    Date of Birth
                  </label>
                  <div>
                    <DatePicker
                      value={formData.dob ? dayjs(formData.dob, 'YYYY-MM-DD') : null}
                      onChange={handleDobChange}
                      onKeyDown={handleDateInputKeyDown}
                      format="DD/MM/YYYY"
                      placeholder="DD/MM/YYYY"
                      allowClear
                      className="w-full"
                      rootClassName={`${isDarkMode ? 'employee-date-picker-dark' : 'employee-date-picker-light'} ${validationErrors.dob ? 'employee-date-picker-error' : ''}`}
                      style={{ height: 42 }}
                      disabledDate={(current) => current && current > dayjs().endOf('day')}
                      popupClassName={isDarkMode ? 'employee-form-dark-calendar' : 'employee-form-light-calendar'}
                      inputReadOnly={false}
                    />
                  </div>
                  {validationErrors.dob && (
                    <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {validationErrors.dob}
                    </p>
                  )}
                </div>
                <SelectField label="Gender" name="gender" value={formData.gender} onChange={handleChange} validationError={validationErrors.gender} isDarkMode={isDarkMode} options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                ]} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <InputField label="Address" name="address" icon={MapPin} placeholder="123 Main Street" value={formData.address} onChange={handleChange} validationError={validationErrors.address} isDarkMode={isDarkMode} />
                </div>
                <InputField label="City" name="city" placeholder="New York" value={formData.city} onChange={handleChange} validationError={validationErrors.city} isDarkMode={isDarkMode} />
                <InputField label="State" name="state" placeholder="NY" value={formData.state} onChange={handleChange} validationError={validationErrors.state} isDarkMode={isDarkMode} />
              </div>
            </motion.div>
          )}

          {/* Step 2: Work Details */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-5"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputField label="Employee Code" name="employeeCode" icon={Hash} placeholder="EMP-001" required value={formData.employeeCode} onChange={handleChange} validationError={validationErrors.employeeCode} helperText="Auto-generated from database" isDarkMode={isDarkMode} readOnly disabled />
                <div>
                  <label className={`flex items-center text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
                    Date of Joining <span className="text-red-400 ml-1">*</span>
                  </label>
                  <DatePicker
                    value={formData.joinDate ? dayjs(formData.joinDate, 'YYYY-MM-DD') : null}
                    onChange={handleJoinDateChange}
                    onKeyDown={handleDateInputKeyDown}
                    format="DD/MM/YYYY"
                    placeholder="DD/MM/YYYY"
                    allowClear
                    className="w-full"
                    rootClassName={`${isDarkMode ? 'employee-date-picker-dark' : 'employee-date-picker-light'} ${validationErrors.joinDate ? 'employee-date-picker-error' : ''}`}
                    style={{ height: 42 }}
                    popupClassName={isDarkMode ? 'employee-form-dark-calendar' : 'employee-form-light-calendar'}
                    inputReadOnly={false}
                  />
                  {validationErrors.joinDate && (
                    <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {validationErrors.joinDate}
                    </p>
                  )}
                </div>
                <SelectField label="Department" name="department" icon={Building2} required value={formData.department} onChange={handleChange} validationError={validationErrors.department} isDarkMode={isDarkMode} options={[
                  ...departmentOptions
                ]} />
                <SelectField label="Designation" name="designation" icon={Briefcase} required value={formData.designation} onChange={handleChange} validationError={validationErrors.designation} isDarkMode={isDarkMode} options={[
                  ...filteredDesignationOptions.map((item) => ({
                    value: item.value,
                    label: item.label
                  }))
                ]} />
                <SelectField label="Employment Type" name="employmentType" value={formData.employmentType} onChange={handleChange} validationError={validationErrors.employmentType} isDarkMode={isDarkMode} options={[
                  { value: 'full_time', label: 'Full Time' },
                  { value: 'part_time', label: 'Part Time' },
                  { value: 'contract', label: 'Contract' },
                  { value: 'intern', label: 'Intern' },
                ]} />
                <SelectField label="Shift" name="shiftId" value={formData.shiftId} onChange={handleChange} validationError={validationErrors.shiftId} isDarkMode={isDarkMode} options={shiftOptions} />
                <InputField label="Base Salary" name="baseSalary" type="number" placeholder="50000" value={formData.baseSalary} onChange={handleChange} validationError={validationErrors.baseSalary} isDarkMode={isDarkMode} />
              </div>
            </motion.div>
          )}

          {/* Step 3: Documents */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-5"
            >
              {/* Upload Area */}
              <div>
                <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
                  Upload Documents (Optional)
                </p>
                <p className={`text-xs mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Attach any relevant documents such as resume, ID proof, certificates, etc.
                </p>
                <label className={`block border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer group ${isDarkMode ? 'border-slate-700 hover:border-cyan-500/40 hover:bg-cyan-500/5' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'}`}>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  />
                  <div className={`w-14 h-14 mx-auto mb-3 rounded-xl flex items-center justify-center transition-colors ${isDarkMode ? 'bg-slate-800 group-hover:bg-cyan-900/30' : 'bg-gray-100 group-hover:bg-blue-100'}`}>
                    <Upload className={`w-7 h-7 transition-colors ${isDarkMode ? 'text-slate-500 group-hover:text-cyan-300' : 'text-gray-400 group-hover:text-blue-500'}`} />
                  </div>
                  <p className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-slate-300 group-hover:text-cyan-300' : 'text-gray-600 group-hover:text-blue-600'}`}>
                    Click to upload or drag and drop
                  </p>
                  <p className={`text-xs mt-1.5 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                    PDF, JPG, PNG, DOC up to 10MB each
                  </p>
                </label>
              </div>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-3">
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
                    Uploaded Files ({uploadedFiles.length})
                  </p>
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${file.size}`}
                      className={`flex items-center justify-between p-3.5 rounded-xl border ${isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-gray-50 border-gray-200'}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
                          <FileText className={`w-4 h-4 ${isDarkMode ? 'text-cyan-400' : 'text-blue-500'}`} />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                            {file.name}
                          </p>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <select
                          value={documentTypes[index] || ''}
                          onChange={(e) => handleDocumentTypeChange(index, e.target.value)}
                          className={`px-2.5 py-1.5 text-xs border rounded-lg transition-all ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`}
                        >
                          <option value="">Select Type</option>
                          <option value="resume">Resume</option>
                          <option value="id_proof">ID Proof</option>
                          <option value="address_proof">Address Proof</option>
                          <option value="educational_certificate">Certificate</option>
                          <option value="other">Other</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-red-900/30' : 'hover:bg-red-100'}`}
                          title="Remove file"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* No files message */}
              {uploadedFiles.length === 0 && (
                <p className={`text-center text-sm py-2 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  No documents uploaded yet. You can skip this step if no documents are needed.
                </p>
              )}
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className={`flex items-center justify-between mt-8 pt-6 border-t ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
            <button
              type="button"
              onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : navigate(-1)}
              disabled={loading}
              className={`px-5 py-2.5 text-sm font-medium rounded-xl transition-all disabled:opacity-50 ${isDarkMode ? 'text-slate-300 hover:text-slate-100 hover:bg-slate-800' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}
            >
              {currentStep > 0 ? 'Previous' : 'Cancel'}
            </button>
            <div className="flex items-center space-x-3">
              {currentStep < steps.length - 1 ? (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (validateStep(currentStep)) {
                        setCurrentStep((prev) => prev + 1);
                      }
                    }}
                    className={`flex items-center space-x-2 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${isDarkMode ? 'bg-cyan-600 shadow-lg shadow-cyan-950/30 hover:bg-cyan-500' : 'bg-blue-600 shadow-lg shadow-blue-500/25 hover:bg-blue-700'}`}
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center space-x-2 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${isDarkMode ? 'bg-cyan-600 shadow-lg shadow-cyan-950/30 hover:bg-cyan-500' : 'bg-blue-600 shadow-lg shadow-blue-500/25 hover:bg-blue-700'}`}
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'Saving...' : isEdit ? 'Update Employee' : 'Add Employee'}</span>
                </motion.button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeForm;
