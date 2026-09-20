// Centralized environment configuration for CivicTrack frontend

const rawApiUrl = import.meta.env.VITE_API_URL || '/api';
const apiUrl = rawApiUrl.replace(/\/+$/, '');
const mode = import.meta.env.MODE || 'development';
const isDev = import.meta.env.DEV || mode === 'development';
const isProd = import.meta.env.PROD || mode === 'production';

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
  isProd
};

export default env;
