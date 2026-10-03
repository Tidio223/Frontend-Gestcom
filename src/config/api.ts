export const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://127.0.0.1:5001'
      : 'https://backend-gestcom.onrender.com';
  }
  
  return 'http://127.0.0.1:5001';
};

export const API_BASE_URL = getApiBaseUrl();
