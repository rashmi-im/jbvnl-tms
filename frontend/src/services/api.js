const API_BASE = import.meta.env.VITE_API_URL || 'https://jbvnl-tms-1.onrender.com';

export async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {},
    credentials: 'include',
  };

  const token = localStorage.getItem('tms_token');
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}/api/${endpoint}`, options);

  const contentType = response.headers.get('content-type') || '';

  let data;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else if (contentType.includes('text/csv')) {
    data = await response.text();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = (typeof data === 'object' && data.detail) || (typeof data === 'object' && data.error) || 'API Request failed';
    throw new Error(errorMsg);
  }

  if (endpoint === 'login' && data.token) {
    localStorage.setItem('tms_token', data.token);
  }

  if (endpoint === 'logout') {
    localStorage.removeItem('tms_token');
  }

  return data;
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
