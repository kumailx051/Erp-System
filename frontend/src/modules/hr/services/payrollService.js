const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

function getAuthHeaders() {
  const token = localStorage.getItem('erp_token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {})
    }
  });

  const isPdf = response.headers.get('content-type')?.includes('application/pdf');
  if (isPdf) {
    return response;
  }

  const payload = await response.json();
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || 'Request failed');
  }

  return payload;
}

export const payrollService = {
  getSummary(month, year) {
    return request(`/hr/payroll/summary?month=${month}&year=${year}`);
  },

  getRegister(month, year, search = '', status = '') {
    const params = new URLSearchParams({ month: String(month), year: String(year) });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    return request(`/hr/payroll/register?${params.toString()}`);
  },

  getProcessStatus(month, year) {
    return request(`/hr/payroll/process/${year}/${month}`);
  },

  generateProcess(month, year) {
    return request(`/hr/payroll/process/${year}/${month}/generate`, { method: 'POST' });
  },

  advanceProcess(month, year) {
    return request(`/hr/payroll/process/${year}/${month}/advance`, { method: 'POST' });
  },

  publishProcess(month, year) {
    return request(`/hr/payroll/process/${year}/${month}/publish`, { method: 'POST' });
  },

  getComponents() {
    return request('/hr/payroll/components');
  },

  createComponent(payload) {
    return request('/hr/payroll/components', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  updateComponent(id, payload) {
    return request(`/hr/payroll/components/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  deleteComponent(id) {
    return request(`/hr/payroll/components/${id}`, {
      method: 'DELETE'
    });
  },

  getRules() {
    return request('/hr/payroll/rules');
  },

  saveRules(rules) {
    return request('/hr/payroll/rules', {
      method: 'PUT',
      body: JSON.stringify({ rules })
    });
  },

  getEmployeeSalary(employeeId) {
    return request(`/hr/employees/${employeeId}/salary`);
  },

  getEmployeePayslips(employeeId, year) {
    const suffix = year ? `?year=${year}` : '';
    return request(`/hr/employees/${employeeId}/payslips${suffix}`);
  },

  getMySalary() {
    return request('/hr/employees/me/salary');
  },

  getMyPayslips(year) {
    const suffix = year ? `?year=${year}` : '';
    return request(`/hr/employees/me/payslips${suffix}`);
  },

  async downloadPayslipPdf(payslipId) {
    const response = await request(`/hr/payslips/${payslipId}/pdf`);
    return response.blob();
  }
};
