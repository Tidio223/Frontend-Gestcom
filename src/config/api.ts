export const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    console.log('Current hostname:', hostname);

    // Toujours utiliser localhost en développement
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      console.log('Using local API: http://localhost:5001');
      return 'http://localhost:5001';
    }

    // Sinon utiliser l'API de production
    console.log('Using production API: https://backend-gestcom.onrender.com');
    return 'https://backend-gestcom.onrender.com';
  }

  return 'http://localhost:5001';
};

export const API_BASE_URL = getApiBaseUrl();

// Helper pour les options de fetch (localStorage avec Authorization header)
export const getFetchOptions = (options: RequestInit = {}): RequestInit => {
  const token = localStorage.getItem("token");

  // Fusionner les headers : options.headers d'abord, puis Authorization et Content-Type
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
    ...(token && { Authorization: `Bearer ${token}` }),
    'Content-Type': 'application/json',
  };

  return {
    ...options,
    headers,
  };
};
