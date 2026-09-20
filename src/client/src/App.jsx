import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import AuthLandingPage from './pages/AuthLandingPage';
import LoginPage from './pages/LoginPage';
import StaffLoginPage from './pages/StaffLoginPage';
import StaffSetupPage from './pages/StaffSetupPage';
import StaffManagementPage from './pages/StaffManagementPage';
import RegisterPage from './pages/RegisterPage';
import VerifyOtpPage from './pages/VerifyOtpPage';
import CitizenDashboardPage from './pages/CitizenDashboardPage';
import WorkerDashboardPage from './pages/WorkerDashboardPage';
import OfficerDashboardPage from './pages/OfficerDashboardPage';
import SupervisorDashboardPage from './pages/SupervisorDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import DashboardPage from './pages/DashboardPage';
import IssuesListPage from './pages/IssuesListPage';
import IssueDetailPage from './pages/IssueDetailPage';
import ReportIssuePage from './pages/ReportIssuePage';
import EscalationsPage from './pages/EscalationsPage';
import DepartmentsPage from './pages/DepartmentsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AuditLogPage from './pages/AuditLogPage';
import MapViewPage from './pages/MapViewPage';
import DevRouteCheckPage from './pages/DevRouteCheckPage';

// Smart Home Redirect based on Backend Role
const HomeRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role === 'CITIZEN') return <Navigate to="/my-reports" replace />;
  if (user.role === 'FIELD_WORKER') return <Navigate to="/worker" replace />;
  if (user.role === 'OFFICER') return <Navigate to="/officer" replace />;
  if (user.role === 'SUPERVISOR') return <Navigate to="/supervisor" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  return <Navigate to="/my-reports" replace />;
};

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <Routes>
              {/* Public Auth Routes */}
              <Route element={<AuthLayout />}>
                <Route path="/auth" element={<AuthLandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/staff/login" element={<StaffLoginPage />} />
                <Route path="/staff/setup/:token" element={<StaffSetupPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-otp" element={<VerifyOtpPage />} />
              </Route>

              {/* Protected Operational Routes */}
              <Route element={<DashboardLayout />}>
                <Route path="/" element={<HomeRedirect />} />

                {/* Role-Specific Home Portals with Explicit ProtectedRoute */}
                <Route
                  path="/my-reports"
                  element={
                    <ProtectedRoute allowedRoles={['CITIZEN', 'ADMIN']}>
                      <CitizenDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/citizen" element={<Navigate to="/my-reports" replace />} />

                <Route
                  path="/worker"
                  element={
                    <ProtectedRoute allowedRoles={['FIELD_WORKER', 'ADMIN']}>
                      <WorkerDashboardPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/officer"
                  element={
                    <ProtectedRoute allowedRoles={['OFFICER', 'ADMIN']}>
                      <OfficerDashboardPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/supervisor"
                  element={
                    <ProtectedRoute allowedRoles={['SUPERVISOR', 'ADMIN']}>
                      <SupervisorDashboardPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminDashboardPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/staff"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <StaffManagementPage />
                    </ProtectedRoute>
                  }
                />

                {/* Shared Governance Modules */}
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/issues" element={<IssuesListPage />} />
                <Route path="/issues/:id" element={<IssueDetailPage />} />
                <Route path="/report" element={<ReportIssuePage />} />
                <Route path="/escalations" element={<EscalationsPage />} />
                <Route path="/departments" element={<DepartmentsPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/audit-log" element={<AuditLogPage />} />
                <Route path="/map" element={<MapViewPage />} />

                {/* Development Diagnostic Tool */}
                <Route path="/dev/route-check" element={<DevRouteCheckPage />} />
              </Route>

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
