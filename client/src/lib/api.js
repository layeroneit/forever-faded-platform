const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('ff_token');
}

function getHeaders(includeAuth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (includeAuth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function api(path, options = {}) {
  const { method = 'GET', body, auth = true } = options;
  const res = await fetch(API_BASE + path, {
    method,
    headers: getHeaders(auth),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export const auth = {
  login: (email, password) => api('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  register: (email, password, name, phone) =>
    api('/auth/register', { method: 'POST', body: { email, password, name, phone }, auth: false }),
};

export const locations = {
  list: () => api('/locations'),
  get: (id) => api(`/locations/${id}`),
  create: (data) => api('/locations', { method: 'POST', body: data }),
  update: (id, data) => api(`/locations/${id}`, { method: 'PATCH', body: data }),
};

export const services = {
  list: (locationId, all) => {
    let path = '/services';
    const params = [];
    if (locationId) params.push(`locationId=${locationId}`);
    if (all) params.push('all=1');
    if (params.length) path += '?' + params.join('&');
    return api(path);
  },
  get: (id) => api(`/services/${id}`),
  create: (data) => api('/services', { method: 'POST', body: data }),
  update: (id, data) => api(`/services/${id}`, { method: 'PATCH', body: data }),
};

export const appointments = {
  list: (params) => {
    const q = new URLSearchParams(params).toString();
    return api(q ? `/appointments?${q}` : '/appointments');
  },
  get: (id) => api(`/appointments/${id}`),
  create: (body) => api('/appointments', { method: 'POST', body }),
  update: (id, body) => api(`/appointments/${id}`, { method: 'PATCH', body }),
};

export const payments = {
  config: () => api('/payments/config'),
  createPaymentIntent: (appointmentId, amountCents) =>
    api('/payments/create-payment-intent', { method: 'POST', body: { appointmentId, amountCents } }),
  confirmPaidAtShop: (appointmentId) =>
    api('/payments/confirm-paid-at-shop', { method: 'POST', body: { appointmentId } }),
};

export const schedule = {
  list: (params) => {
    const q = new URLSearchParams(params).toString();
    return api(q ? `/schedule?${q}` : '/schedule');
  },
  upsert: (body) => api('/schedule', { method: 'POST', body }),
};

export const inventory = {
  list: (locationId) => api(locationId ? `/inventory?locationId=${locationId}` : '/inventory'),
  update: (id, body) => api(`/inventory/${id}`, { method: 'PATCH', body }),
};

export const payroll = {
  list: (params) => {
    const q = new URLSearchParams(params).toString();
    return api(q ? `/payroll?${q}` : '/payroll');
  },
};

export const admin = {
  stats: (locationId) => api(locationId ? `/admin/stats?locationId=${locationId}` : '/admin/stats'),
  users: (params) => {
    const q = new URLSearchParams(params).toString();
    return api(q ? `/admin/users?${q}` : '/admin/users');
  },
};

export const users = {
  list: (params) => {
    const q = new URLSearchParams(params).toString();
    return api(q ? `/users?${q}` : '/users');
  },
  me: () => api('/users/me'),
  updateMe: (body) => api('/users/me', { method: 'PATCH', body }),
  create: (data) => api('/users', { method: 'POST', body: data }),
  update: (id, data) => api(`/users/${id}`, { method: 'PATCH', body: data }),
};

export function setToken(token) {
  if (token) localStorage.setItem('ff_token', token);
  else localStorage.removeItem('ff_token');
}

export function getStoredUser() {
  try {
    const u = localStorage.getItem('ff_user');
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) localStorage.setItem('ff_user', JSON.stringify(user));
  else localStorage.removeItem('ff_user');
}
