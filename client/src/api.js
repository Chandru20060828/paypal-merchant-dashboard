import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });
api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('mc_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
api.interceptors.response.use((r) => r, (err) => {
  if (err.response?.status === 401 && localStorage.getItem('mc_token') && !err.config.url.startsWith('/auth/')) {
    localStorage.removeItem('mc_token');
    window.dispatchEvent(new Event('mc-logout'));
  }
  return Promise.reject(err);
});

export const errMsg = (e) => e.response?.data?.message || (e.code === 'ERR_NETWORK' ? 'Cannot reach the API. Is the server running on port 5000?' : e.message) || 'Something went wrong.';
export default api;
