import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('mc_token'));

  const logout = useCallback(() => { localStorage.removeItem('mc_token'); setUser(null); }, []);
  useEffect(() => {
    window.addEventListener('mc-logout', logout);
    return () => window.removeEventListener('mc-logout', logout);
  }, [logout]);
  useEffect(() => {
    if (!localStorage.getItem('mc_token')) return;
    api.get('/auth/me').then((r) => setUser(r.data.user)).catch(logout).finally(() => setLoading(false));
  }, [logout]);

  const authenticate = async (path, body) => {
    const { data } = await api.post(path, body);
    localStorage.setItem('mc_token', data.token);
    setUser(data.user);
  };
  return (
    <Ctx.Provider value={{ user, loading, logout, login: (b) => authenticate('/auth/login', b), register: (b) => authenticate('/auth/register', b) }}>
      {children}
    </Ctx.Provider>
  );
}
