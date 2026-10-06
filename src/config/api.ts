export const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    console.log('Current hostname:', hostname);
    
    // Toujours utiliser localhost en développement
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      console.log('Using local API: http://127.0.0.1:5001');
      return 'http://127.0.0.1:5001';
    }
    
    // Sinon utiliser l'API de production
    console.log('Using production API: https://backend-gestcom.onrender.com');
    return 'https://backend-gestcom.onrender.com';
  }
  
  return 'http://127.0.0.1:5001';
};

export const API_BASE_URL = getApiBaseUrl();
