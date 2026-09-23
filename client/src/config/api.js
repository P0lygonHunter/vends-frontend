import axios from 'axios'

/**
 * API Configuration
 * Automatically uses Vercel URL in production, localhost in development
 */

const API_BASE_URL = import.meta.env.PROD
  ? 'https://vends-backend.vercel.app/api'
  : 'http://localhost:5000/api';

axios.interceptors.request.use(config => {
  const isCeoRequest = /\/(ceo|admin)(\/|$)/.test(config.url || '');
  const isParentRequest = /\/parent(\/|$)/.test(config.url || '');
  const isTeacherPortalRequest = /\/teacher-portal(\/|$)/.test(config.url || '');
  const tokenKey = isCeoRequest ? 'ceoAuthToken' : isParentRequest ? 'parentAuthToken' : isTeacherPortalRequest ? 'teacherAuthToken' : 'authToken';
  const token = localStorage.getItem(tokenKey);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default API_BASE_URL;
