import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { errMsg } from '../api.js';
import { useAuth } from './AuthContext.jsx';

const Ctx = createContext(null);
export const useData = () => useContext(Ctx);

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [days, setDays] = useState('30');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError('');
    try { setData((await api.get('/dashboard', { params: { days } })).data); }
    catch (e) { setError(errMsg(e)); }
    finally { setLoading(false); }
  }, [user, days]);

  useEffect(() => { if (user) reload(); else setData(null); }, [user, reload]);
  return <Ctx.Provider value={{ days, setDays, data, loading, error, reload }}>{children}</Ctx.Provider>;
}
