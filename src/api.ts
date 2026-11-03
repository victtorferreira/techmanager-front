export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
export type SessionUser = { id: string; name: string; email: string; role: string };
export function getToken() { return localStorage.getItem('techmanager_token'); }
export function getTenantSlug() { return localStorage.getItem('techmanager_tenant_slug') || 'assistencia-demo'; }
export function getTenantName() { return localStorage.getItem('techmanager_tenant_name'); }
export function getSessionUser(): SessionUser | null {
  try {
    const value = localStorage.getItem('techmanager_user');
    return value ? JSON.parse(value) as SessionUser : null;
  } catch {
    return null;
  }
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem('techmanager_token', token);
  else localStorage.removeItem('techmanager_token');
}
export function setTenantSlug(slug: string | null) {
  if (slug) localStorage.setItem('techmanager_tenant_slug', slug);
  else localStorage.removeItem('techmanager_tenant_slug');
}
export function setTenantName(name: string | null) {
  if (name) localStorage.setItem('techmanager_tenant_name', name);
  else localStorage.removeItem('techmanager_tenant_name');
}
export function setSessionUser(user: SessionUser | null) {
  if (user) localStorage.setItem('techmanager_user', JSON.stringify(user));
  else localStorage.removeItem('techmanager_user');
}
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) {
      setToken(null);
      window.dispatchEvent(new Event('techmanager:unauthorized'));
    }
    throw new Error(body.message || 'Não foi possível concluir a operação.');
  }
  return response.json();
}

export async function publicApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(body.message) ? body.message.join(' ') : body.message;
    throw new Error(message || 'Não foi possível enviar a solicitação. Tente novamente.');
  }
  return body as T;
}
