import axios from 'axios';
import env from '../config/env';

const api = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('civictrack_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized and not already on an auth page, redirect to login
      const currentPath = window.location.pathname;
      const isAuthPage = currentPath.includes('/login') || 
                         currentPath.includes('/register') || 
                         currentPath.includes('/verify-otp') ||
                         currentPath.includes('/staff-setup');
      
      if (!isAuthPage) {
        localStorage.removeItem('civictrack_token');
        localStorage.removeItem('civictrack_user');
        window.location.href = '/login?expired=1';
      }
    }
    return Promise.reject(error);
  }
);

// Auth Services
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  register: (data) => api.post('/auth/register', data),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  resendOtp: (data) => api.post('/auth/resend-otp', data),
  getMe: () => api.get('/auth/me'),
  demoLogin: (role) => api.post('/auth/demo-login', { role }),
  getWorkers: (departmentId) => api.get('/auth/workers', { params: { departmentId } }),
  getUsers: () => api.get('/auth/users')
};

// Issues Services
export const issueService = {
  getIssues: (params) => api.get('/issues', { params }),
  getIssueById: (id) => api.get(`/issues/${id}`),
  createIssue: (formData, options = {}) => api.post('/issues', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(options.headers || {})
    }
  }),
  updateIssue: (id, data) => api.patch(`/issues/${id}`, data)
};

// Workflow Services
export const workflowService = {
  assignIssue: (id, data) => api.post(`/issues/${id}/assign`, data),
  acknowledgeAssignment: (id, data) => api.post(`/issues/${id}/acknowledge`, data),
  startWork: (id) => api.post(`/issues/${id}/start`),
  addProgressUpdate: (id, formData) => api.post(`/issues/${id}/updates`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  submitResolution: (id, formData) => api.post(`/issues/${id}/resolution`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  verifyResolution: (id, data) => api.post(`/issues/${id}/verify`, data),
  confirmResolution: (id, data) => api.post(`/issues/${id}/confirm`, data),
  escalateIssue: (id, data) => api.post(`/issues/${id}/escalate`, data)
};

// Operations Dashboard Service
export const dashboardService = {
  getMetrics: () => api.get('/dashboard')
};

// Escalations Service
export const escalationService = {
  getEscalations: (params) => api.get('/escalations', { params }),
  resolveEscalation: (id, data) => api.post(`/escalations/${id}/resolve`, data)
};

// Departments Service
export const departmentService = {
  getDepartments: () => api.get('/departments'),
  getDepartmentById: (id) => api.get(`/departments/${id}`)
};

// Analytics Service
export const analyticsService = {
  getAnalytics: () => api.get('/analytics')
};

// Audit Service
export const auditService = {
  getAuditLogs: (params) => api.get('/audit-logs', { params })
};

// Notification Service
export const notificationService = {
  getNotifications: () => api.get('/notifications'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`)
};

// Admin Service
export const adminService = {
  getStaff: () => api.get('/admin/staff'),
  inviteStaff: (data) => api.post('/admin/staff', data),
  updateStaff: (id, data) => api.patch(`/admin/staff/${id}`, data),
  resendStaffInvitation: (id) => api.post(`/admin/staff/${id}/resend-invitation`),
  getOverview: () => api.get('/admin/overview')
};

// Staff Onboarding & Setup Service
export const staffService = {
  getInvitation: (token) => api.get(`/staff/invitation/${token}`),
  completeSetup: (token, data) => api.post(`/staff/invitation/${token}/complete`, data)
};

// Field Worker Workspace Service
export const workerService = {
  getAssignments: () => api.get('/worker/assignments')
};

// Operations Officer Service
export const officerService = {
  getIssues: () => api.get('/officer/issues')
};

// Supervisor Oversight Service
export const supervisorService = {
  getOverview: () => api.get('/supervisor/overview')
};

export default api;
