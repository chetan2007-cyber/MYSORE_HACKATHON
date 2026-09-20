// Centralized environment configuration for CivicTrack frontend

const defaultProdApiUrl = 'https://civictrack-backend-rsy2.onrender.com/api';
const rawApiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? defaultProdApiUrl : '/api');
const cleanApiUrl = rawApiUrl.replace(/\/+$/, '');
// Ensure apiUrl points to /api even if configured as a bare domain (e.g. https://civictrack-backend-rsy2.onrender.com)
const apiUrl = (cleanApiUrl.startsWith('http') && !cleanApiUrl.endsWith('/api'))
  ? `${cleanApiUrl}/api`
  : cleanApiUrl;

const mode = import.meta.env.MODE || 'development';
const isDev = import.meta.env.DEV || mode === 'development';
const isProd = import.meta.env.PROD || mode === 'production';
const enableDemoLogin = import.meta.env.VITE_ENABLE_DEMO_LOGIN !== 'false';

// Compute backend origin URL for media assets (strips trailing /api)
const backendOrigin = apiUrl.startsWith('http')
  ? apiUrl.replace(/\/api\/?$/, '')
  : '';

/**
 * Resolves uploaded media URLs against the production backend host
 * or local dev proxy.
 */
export const getMediaUrl = (filePath) => {
  if (!filePath) return '';
  if (
    filePath.startsWith('http://') ||
    filePath.startsWith('https://') ||
    filePath.startsWith('data:') ||
    filePath.startsWith('blob:')
  ) {
    return filePath;
  }
  const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return backendOrigin ? `${backendOrigin}${cleanPath}` : cleanPath;
};

export const env = {
  apiUrl,
  backendOrigin,
  mode,
  isDev,
  isProd,
  enableDemoLogin
};

export default env;
