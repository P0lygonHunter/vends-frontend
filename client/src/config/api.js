/**
 * API Configuration
 * Automatically uses Vercel URL in production, localhost in development
 */

const API_BASE_URL = import.meta.env.PROD
  ? 'https://vends-backend.vercel.app/api'
  : 'http://localhost:5000/api';

export default API_BASE_URL;
