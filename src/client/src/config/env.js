// Centralized environment configuration for CivicTrack frontend

const apiUrl = import.meta.env.VITE_API_URL || '/api';
const mode = import.meta.env.MODE || 'development';
const isDev = import.meta.env.DEV || mode === 'development';
const isProd = import.meta.env.PROD || mode === 'production';

export const env = {
  apiUrl,
  mode,
  isDev,
  isProd
};

export default env;
