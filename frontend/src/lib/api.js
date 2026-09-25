/**
 * Client for the Operations API (../../api). Same-origin by default: the Vite
 * dev server proxies /api, and the API can serve the built frontend itself.
 * VITE_API_URL points elsewhere when the two are hosted apart.
 */
const BASE = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const request = async (path, { method = 'GET', body } = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.detail || `Request failed (${res.status})`);
  return data;
};

/**
 * True only when a real API answers. A static host (Netlify) rewrites /api/*
 * to index.html with a 200, so the body must be checked, not the status.
 */
export const detectApi = async (timeoutMs = 1500) => {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${BASE}/api/health`, { signal: ctrl.signal, credentials: 'include' });
    clearTimeout(timer);
    const data = await res.json();
    return data?.service === 'rmo-api';
  } catch {
    return false;
  }
};

export const api = {
  /** Role selection opens a session; Ground also names its department. */
  session: (role, department) => request('/api/session', { method: 'POST', body: { role, department: department || null } }),
  me: () => request('/api/auth/me'),
  events: (after = 0) => request(`/api/events?after=${after}`),
  appendEvent: (kind, taskId, payload) => request('/api/events', { method: 'POST', body: { kind, task_id: taskId ?? null, payload } }),
  uploadPhoto: (name, dataUrl) => request('/api/files', { method: 'POST', body: { name, data_url: dataUrl } }),
  fileUrl: (id) => `${BASE}/api/files/${id}`,
  alertsSeen: () => request('/api/alerts/seen'),
  markAlertsSeen: (lastEventId) => request('/api/alerts/seen', { method: 'POST', body: { last_event_id: lastEventId } }),
  reset: () => request('/api/admin/reset', { method: 'POST' }),
};
