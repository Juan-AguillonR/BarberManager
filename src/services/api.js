const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export async function apiRequest(endpoint, options = {}, user = null) {
  const { method = 'GET', body = null } = options;

  const headers = { 'Content-Type': 'application/json' };

  // RNF2 + RNF4: enviar info del usuario para roles y auditoría
  if (user) {
    headers['x-user-rol'] = user.rol || 'cliente';
    headers['x-user-usuario'] = user.usuario || '';
  }

  const fetchOptions = { method, headers };
  if (body) fetchOptions.body = body;

  const response = await fetch(`${API_URL}${endpoint}`, fetchOptions);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.message || `Error ${response.status}`);
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  return response.json();
}

export default API_URL;