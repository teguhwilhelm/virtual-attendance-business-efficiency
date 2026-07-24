const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
const TOKEN_KEY = 'attendance_auth_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
}
function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try { data = await res.json(); } catch { /* no body */ }

  if (!res.ok) {
    const error = new Error((data && data.message) || `Request failed (${res.status})`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

function buildEntityClient(entityName) {
  return {
    async list(sort, limit) {
      const params = new URLSearchParams();
      if (sort) params.set('sort', sort);
      if (limit) params.set('limit', String(limit));
      const qs = params.toString();
      return apiFetch(`/api/entities/${entityName}${qs ? `?${qs}` : ''}`);
    },
    async filter(criteria = {}, sort, limit) {
      return apiFetch(`/api/entities/${entityName}/filter`, {
        method: 'POST',
        body: { criteria, sort, limit },
      });
    },
    async create(data) {
      return apiFetch(`/api/entities/${entityName}`, { method: 'POST', body: data });
    },
    async update(id, data) {
      return apiFetch(`/api/entities/${entityName}/${id}`, { method: 'PUT', body: data });
    },
    async delete(id) {
      return apiFetch(`/api/entities/${entityName}/${id}`, { method: 'DELETE' });
    },
  };
}

export const base44 = {
  auth: {
    async me() {
      return apiFetch('/api/auth/me');
    },
    logout(redirectUrl) {
      clearToken();
      if (redirectUrl) window.location.href = '/login';
    },
    redirectToLogin() {
      window.location.href = '/login';
    },
    async loginViaEmailPassword(email, password) {
      const result = await apiFetch('/api/auth/login', { method: 'POST', body: { email, password } });
      setToken(result.access_token);
      return result;
    },
    loginWithProvider() {
      window.alert('Login dengan Google belum tersedia di deployment ini.');
    },
    async register({ email, password }) {
      return apiFetch('/api/auth/register', { method: 'POST', body: { email, password } });
    },
    async verifyOtp({ email, otpCode }) {
      const result = await apiFetch('/api/auth/verify-otp', { method: 'POST', body: { email, otpCode } });
      if (result.access_token) setToken(result.access_token);
      return result;
    },
    setToken(token) {
      setToken(token);
    },
    async resendOtp(email) {
      return apiFetch('/api/auth/resend-otp', { method: 'POST', body: { email } });
    },
    async resetPasswordRequest(email) {
      return apiFetch('/api/auth/forgot-password', { method: 'POST', body: { email } });
    },
    async resetPassword({ resetToken, newPassword }) {
      return apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: { token: resetToken, new_password: newPassword },
      });
    },
  },
  entities: {
    Employee: buildEntityClient('Employee'),
    WorkLocation: buildEntityClient('WorkLocation'),
    Shift: buildEntityClient('Shift'),
    LeaveRequest: buildEntityClient('LeaveRequest'),
    AttendanceRecord: buildEntityClient('AttendanceRecord'),
  },
};
        
