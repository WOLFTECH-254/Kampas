
const BASE = import.meta.env.VITE_API_URL || '';

const getToken = () => localStorage.getItem('kampas_token');

type FetchOptions = {
  method?:  string;
  body?:    object;
  auth?:    boolean;
};

export async function api<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.message || 'Something went wrong') as any;
    err.code = data.code;
    throw err;
  }

  return data;
}

// Shorthand helpers
export const GET  = (url: string)              => api(url, { auth: true });
export const POST = (url: string, body: object) => api(url, { method: 'POST', body, auth: true });
export const PUT  = (url: string, body: object) => api(url, { method: 'PUT',  body, auth: true });
export const DEL  = (url: string)              => api(url, { method: 'DELETE', auth: true });
