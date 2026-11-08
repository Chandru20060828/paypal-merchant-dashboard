import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import { Spinner } from './components/ui.jsx';
import Login from './pages/Login.jsx';
import Overview from './pages/Overview.jsx';
import ProductAnalytics from './pages/ProductAnalytics.jsx';
import Transactions from './pages/Transactions.jsx';
import AIInsights from './pages/AIInsights.jsx';
import ProfitCalculator from './pages/ProfitCalculator.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Signing you in…" />;
  if (!user) return <Routes><Route path="/login" element={<Login />} /><Route path="*" element={<Navigate to="/login" replace />} /></Routes>;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Overview />} />
        <Route path="products" element={<ProductAnalytics />} />
        <Route path="products/:name" element={<ProductAnalytics />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="insights" element={<AIInsights />} />
        <Route path="calculator" element={<ProfitCalculator />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
