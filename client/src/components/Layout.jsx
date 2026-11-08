import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ArrowLeftRight, Sparkles, Calculator, FileText, Settings, Search, Bell, Menu, ChevronDown, LogOut, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { RangeSelect } from './ui.jsx';

const NAV = [
  ['/', 'Overview', LayoutDashboard], ['/products', 'Product Analytics', Package], ['/transactions', 'Transactions', ArrowLeftRight],
  ['/insights', 'AI Insights', Sparkles], ['/calculator', 'Profit Calculator', Calculator], ['/reports', 'Reports', FileText], ['/settings', 'Settings', Settings],
];

export default function Layout() {
  const [open, setOpen] = useState(false), [menu, setMenu] = useState(null), [q, setQ] = useState('');
  const { user, logout } = useAuth(), { data } = useData(), nav = useNavigate();
  const alerts = (data?.insights || []).filter((i) => i.type === 'negative');
  const search = (e) => { e.preventDefault(); if (q.trim()) { nav(`/transactions?q=${encodeURIComponent(q.trim())}`); setQ(''); } };

  return (
    <div className="min-h-screen lg:flex">
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-ppnavy text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ppblue text-lg font-extrabold">M</div>
            <div className="leading-tight"><p className="font-extrabold">Merchant Copilot</p><p className="text-[11px] text-blue-200">Independent analytics tool</p></div>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-ppblue text-white' : 'text-blue-100 hover:bg-white/10'}`}>
              <Icon className="h-[18px] w-[18px]" />{label}
            </NavLink>
          ))}
        </nav>
        <p className="px-5 py-4 text-[11px] leading-snug text-blue-300">Not an official PayPal product. Profit figures are estimates.</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-6">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <form onSubmit={search} className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input className="input !pl-9" placeholder="Search transactions or products" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Global search" />
          </form>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:block"><RangeSelect /></div>
            <div className="relative">
              <button className="btn-ghost relative !px-2.5" onClick={() => setMenu(menu === 'n' ? null : 'n')} aria-label="Notifications">
                <Bell className="h-4 w-4" />{alerts.length > 0 && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">{alerts.length}</span>}
              </button>
              {menu === 'n' && (
                <div className="card absolute right-0 mt-2 w-80 p-3">
                  <p className="mb-2 text-sm font-bold text-ppnavy">Needs attention</p>
                  {alerts.length ? alerts.map((a, i) => <p key={i} className="border-t border-slate-100 py-2 text-sm text-slate-600">{a.text}</p>) : <p className="text-sm text-slate-500">Nothing needs attention for this period.</p>}
                </div>
              )}
            </div>
            <div className="relative">
              <button className="btn-ghost !px-2.5" onClick={() => setMenu(menu === 'p' ? null : 'p')}>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ppblue text-xs font-bold text-white">{user.name[0]?.toUpperCase()}</span>
                <span className="hidden max-w-[120px] truncate sm:block">{user.name}</span><ChevronDown className="h-3.5 w-3.5" />
              </button>
              {menu === 'p' && (
                <div className="card absolute right-0 mt-2 w-60 p-2">
                  <div className="px-3 py-2"><p className="text-sm font-bold">{user.name}</p><p className="truncate text-xs text-slate-500">{user.email}</p><p className="text-xs text-slate-500">{user.businessName}</p></div>
                  <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50" onClick={() => { setMenu(null); nav('/settings'); }}><Settings className="h-4 w-4" />Settings</button>
                  <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50" onClick={logout}><LogOut className="h-4 w-4" />Log out</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 p-4 lg:p-6" onClick={() => menu && setMenu(null)}><Outlet /></main>
      </div>
    </div>
  );
}
