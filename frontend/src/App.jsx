import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import AboutPage from './pages/AboutPage';
import FeaturesPage from './pages/FeaturesPage';
import SolutionsPage from './pages/SolutionsPage';
import CareerPage from './pages/CareerPage';
import DashboardPage from './modules/hr/pages/DashboardPage';
import AdminDashboardPage from './modules/admin/pages/AdminDashboardPage';
import HrAccountsPage from './modules/admin/pages/HrAccountsPage';
import DashboardLayout from './shared/components/DashboardLayout';

// HR Module Pages — Employee Management
import EmployeePage from './modules/hr/pages/employeeManagement/EmployeePage';
import EmployeeForm from './modules/hr/pages/employeeManagement/EmployeeForm';
import EmployeeProfile from './modules/hr/pages/employeeManagement/EmployeeProfile';
import OrganizationChart from './modules/hr/pages/employeeManagement/OrganizationChart';
import DepartmentDesignationPage from './modules/hr/pages/employeeManagement/DepartmentDesignationPage';
import DesignationPage from './modules/hr/pages/employeeManagement/DesignationPage';

// HR Module Pages — Attendance Management
import AttendancePage from './modules/hr/pages/attendanceManagement/AttendancePage';
import AttendanceDetailPage from './modules/hr/pages/attendanceManagement/AttendanceDetailPage';
import ShiftManagement from './modules/hr/pages/attendanceManagement/ShiftManagement';

// HR Module Pages — Leave Management
import LeavePage from './modules/hr/pages/leaveManagement/LeavePage';
import LeaveCalendar from './modules/hr/pages/leaveManagement/LeaveCalendar';
import LeaveSettings from './modules/hr/pages/leaveManagement/LeaveSettings';
import HrProfilePage from './modules/hr/pages/HrProfilePage';

// HR Module Pages — Payroll Management
import PayrollPage from './modules/hr/pages/payrollManagement/PayrollPage';
import EmployeeSalary from './modules/hr/pages/payrollManagement/EmployeeSalary';
import PayrollProcessing from './modules/hr/pages/payrollManagement/PayrollProcessing';
import PayrollSettings from './modules/hr/pages/payrollManagement/PayrollSettings';

// HR Module Pages — Recruitment
import RecruitmentPage from './modules/hr/pages/recruitmentManagement/RecruitmentPage';
import CandidateProfile from './modules/hr/pages/recruitmentManagement/CandidateProfile';
import OnboardingPage from './modules/hr/pages/recruitmentManagement/OnboardingPage';
import CandidateDashboardPage from './modules/users/pages/CandidateDashboardPage';
import CandidateApplicationDetailPage from './modules/users/pages/CandidateApplicationDetailPage';
import EmployeeDashboardPage from './modules/users/pages/EmployeeDashboardPage';
import EmployeeAttendancePage from './modules/users/pages/EmployeeAttendancePage';
import EmployeeLeavePage from './modules/users/pages/EmployeeLeavePage';
import EmployeeResignationPage from './modules/users/pages/EmployeeResignationPage';
import EmployeeProfileSetupPage from './modules/users/pages/EmployeeProfileSetupPage';
import EmployeeSalaryPage from './modules/users/pages/EmployeeSalaryPage';

// HR Module Pages — Exit
import ExitManagementPage from './modules/hr/pages/exitManagement/ExitManagementPage';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const DashboardHome = () => {
  try {
    const user = JSON.parse(localStorage.getItem('erp_user') || '{}');
    if (user?.role === 'admin') {
      return <Navigate to="/dashboard/admin" replace />;
    }
    if (user?.role === 'candidate') {
      return <Navigate to="/candidate/dashboard" replace />;
    }
    if (user?.role === 'employee') {
      const employeeProfileCompleted = localStorage.getItem('erp_employee_profile_complete') !== 'false';
      return <Navigate to={employeeProfileCompleted ? '/dashboard/employee' : '/employee/complete-profile'} replace />;
    }
  } catch {
    // Ignore malformed localStorage payloads and fall back to HR dashboard.
  }

  return <DashboardPage />;
};

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        {/* Public Pages */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/solutions" element={<SolutionsPage />} />
        <Route path="/career" element={<CareerPage />} />
        <Route path="/employee/complete-profile" element={<EmployeeProfileSetupPage />} />

        <Route path="/candidate" element={<DashboardLayout />}>
          <Route path="dashboard" element={<CandidateDashboardPage />} />
          <Route path="application/:id" element={<CandidateApplicationDetailPage />} />
        </Route>

        {/* Dashboard (Protected) */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />

          {/* Admin */}
          <Route path="admin" element={<AdminDashboardPage />} />
          <Route path="admin/hr-accounts" element={<HrAccountsPage />} />

          {/* HR - Employee Management */}
          <Route path="hr/employees" element={<EmployeePage />} />
          <Route path="hr/employee/new" element={<EmployeeForm />} />
          <Route path="hr/employee/:id" element={<EmployeeProfile />} />
          <Route path="hr/departments-designations" element={<DepartmentDesignationPage />} />
          <Route path="hr/designations" element={<DesignationPage />} />
          <Route path="hr/organization-chart" element={<OrganizationChart />} />

          {/* HR - Attendance Management */}
          <Route path="hr/attendance" element={<AttendancePage />} />
          <Route path="hr/attendance/:id" element={<AttendanceDetailPage />} />
          <Route path="hr/shifts" element={<ShiftManagement />} />

          {/* HR - Leave Management */}
          <Route path="hr/leaves" element={<LeavePage />} />
          <Route path="hr/leave/calendar" element={<LeaveCalendar />} />
          <Route path="hr/leave/settings" element={<LeaveSettings />} />

          {/* HR - Payroll Management */}
          <Route path="hr/payroll" element={<PayrollPage />} />
          <Route path="hr/payroll/salary/:id" element={<EmployeeSalary />} />
          <Route path="hr/payroll/process" element={<PayrollProcessing />} />
          <Route path="hr/payroll/settings" element={<PayrollSettings />} />

          {/* HR - Recruitment */}
          <Route path="hr/recruitment" element={<RecruitmentPage />} />
          <Route path="hr/recruitment/candidate/:id" element={<CandidateProfile />} />
          <Route path="hr/recruitment/onboarding" element={<OnboardingPage />} />

          {/* HR - Exit */}
          <Route path="hr/exit" element={<ExitManagementPage />} />

          {/* HR - Profile */}
          <Route path="hr/profile" element={<HrProfilePage />} />

          {/* Employee */}
          <Route path="employee" element={<EmployeeDashboardPage />} />
          <Route path="employee/attendance" element={<EmployeeAttendancePage />} />
          <Route path="employee/leaves" element={<EmployeeLeavePage />} />
          <Route path="employee/salary" element={<EmployeeSalaryPage />} />
          <Route path="employee/resignation" element={<EmployeeResignationPage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
