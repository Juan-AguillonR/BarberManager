const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export async function apiRequest(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message = payload?.message || `Error HTTP ${response.status}.`;
      throw new Error(message);
    }

    return payload;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('No se pudo conectar con la API. Verifica que el backend este ejecutandose.');
    }
    throw error;
  }
}
