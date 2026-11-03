import { useEffect, useRef, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, BarChart3, CalendarDays, ChevronDown, ClipboardList, CreditCard, LayoutDashboard, Menu, Moon, Package, Search, Settings, Smartphone, Sun, Users, Wrench } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Agenda from './pages/Agenda';
import Finance from './pages/Finance';
import Reports from './pages/Reports';
import SettingsPage from './pages/Settings';
import Login from './Login';
import PublicRepairRequest from './PublicRepairRequest';
import NotificationsButton from './NotificationsButton';
import UserMenu from './UserMenu';
import { api, getSessionUser, getTenantName, getTenantSlug, getToken, SessionUser, setSessionUser, setTenantName, setTenantSlug, setToken } from './api';

const nav = [
  { label: 'Visão geral', to: '/', icon: LayoutDashboard },
  { label: 'Ordens de serviço', to: '/ordens', icon: ClipboardList },
  { label: 'Clientes', to: '/clientes', icon: Users },
  { label: 'Produtos e estoque', to: '/produtos', icon: Package },
  { label: 'Vendas', to: '/vendas', icon: CreditCard },
  { label: 'Agenda', to: '/agenda', icon: CalendarDays },
  { label: 'Financeiro', to: '/financeiro', icon: BarChart3 },
  { label: 'Relatórios', to: '/relatorios', icon: Activity },
];
const titles: Record<string, string> = {
  '/': 'Visão geral', '/ordens': 'Ordens de serviço', '/clientes': 'Clientes',
  '/produtos': 'Produtos e estoque', '/vendas': 'Vendas', '/agenda': 'Agenda',
  '/financeiro': 'Financeiro', '/relatorios': 'Relatórios', '/configuracoes': 'Configurações',
};

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => localStorage.getItem('techmanager_theme') === 'dark' ? 'dark' : 'light');
  const [token, setAuthToken] = useState(getToken());
  const [user, setUser] = useState(getSessionUser());
  const [storedTenantName, setStoredTenantName] = useState(getTenantName());
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const tenantQuery = useQuery({ queryKey: ['tenant-profile'], queryFn: () => api<{ id: string; name: string; slug: string }>('/tenant/profile'), enabled: Boolean(token) });
  const tenantName = tenantQuery.data?.name || storedTenantName || 'techmanager';
  const title = titles[location.pathname] || 'TechManager';
  const publicRequestSlug = location.pathname.match(/^\/solicitar\/([^/]+)\/?$/)?.[1];

  useEffect(() => {
    const handleUnauthorized = () => { setAuthToken(null); setUser(null); setSessionUser(null); };
    window.addEventListener('techmanager:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('techmanager:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    localStorage.setItem('techmanager_theme', theme);
  }, [theme]);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!workspaceRef.current?.contains(event.target as Node)) setWorkspaceOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setWorkspaceOpen(false); };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  function handleLogin(value: string, slug: string, account: SessionUser, name: string) {
    setToken(value);
    setTenantSlug(slug);
    setTenantName(name);
    setStoredTenantName(name);
    setSessionUser(account);
    setAuthToken(value);
    setUser(account);
  }

  function handleLogout() {
    setTenantName(tenantName);
    setStoredTenantName(tenantName);
    setToken(null);
    setTenantSlug(null);
    setSessionUser(null);
    setAuthToken(null);
    setUser(null);
  }

  if (publicRequestSlug) return <PublicRepairRequest slug={decodeURIComponent(publicRequestSlug)} />;
  if (!token || !user) return <Login onLogin={handleLogin} tenantName={storedTenantName || 'techmanager'} />;

  return <div className={`app-shell ${theme === 'dark' ? 'theme-dark' : ''}`}>
    <aside className={`sidebar ${collapsed ? 'sidebar-small' : ''}`}>
      <div className="brand"><div className="brand-mark"><Smartphone size={21}/></div>{!collapsed && <div className="brand-tenant"><strong title={tenantName}>{tenantName}</strong><span>GESTÃO INTELIGENTE</span></div>}</div>
      <div className="workspace-wrap" ref={workspaceRef}><button type="button" className={`workspace ${workspaceOpen ? "workspace-open" : ""}`} aria-expanded={workspaceOpen} aria-label="Abrir opções da assistência" onClick={() => setWorkspaceOpen(open => !open)}><span className="workspace-avatar">{tenantName.trim().charAt(0).toUpperCase()}</span>{!collapsed && <span className="workspace-copy"><strong title={tenantName}>{tenantName}</strong><span>Sua assistência</span></span>}<ChevronDown size={15} className="workspace-chevron"/></button>{workspaceOpen && <div className="workspace-menu"><div className="workspace-menu-info"><span>Assistência atual</span><strong>{tenantName}</strong><small>Link público: /solicitar/{getTenantSlug()}</small></div><NavLink to="/configuracoes" onClick={() => setWorkspaceOpen(false)}><Settings size={15}/> Configurações da assistência</NavLink><a href={`/solicitar/${encodeURIComponent(getTenantSlug())}`} target="_blank" rel="noreferrer" onClick={() => setWorkspaceOpen(false)}><Smartphone size={15}/> Abrir formulário público</a></div>}</div>
      <div className="nav-label">{!collapsed && 'MENU PRINCIPAL'}</div>
      <nav>{nav.map(item => <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={collapsed ? item.label : undefined}><item.icon size={18}/>{!collapsed && <span>{item.label}</span>}</NavLink>)}</nav>
      <div className="sidebar-bottom"><NavLink to="/configuracoes" className="nav-item"><Settings size={18}/>{!collapsed && <span>Configurações</span>}</NavLink><button className="nav-item collapse-btn" onClick={() => setCollapsed(!collapsed)}><Menu size={18}/>{!collapsed && <span>Recolher menu</span>}</button></div>
      <div className="user-card"><div className="user-avatar">{user.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</div>{!collapsed && <div className="user-copy"><strong>{user.name}</strong><span>{user.email}</span></div>}</div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div><div className="breadcrumb">Painel <span>/</span> <strong>{title}</strong></div><h1>{title}</h1></div><div className="top-actions"><button className="icon-btn" aria-label="Buscar" title="Buscar"><Search size={18}/></button><button className="icon-btn theme-toggle" aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'} title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'} onClick={() => setTheme(current => current === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button><NotificationsButton tenantSlug={getTenantSlug()}/><div className="top-divider"/><UserMenu user={user} onLogout={handleLogout}/></div></header>
      <div className="page-content"><Routes><Route path="/" element={<Dashboard tenantSlug={getTenantSlug()}/>}/><Route path="/ordens" element={<Orders/>}/><Route path="/clientes" element={<Customers/>}/><Route path="/produtos" element={<Products/>}/><Route path="/vendas" element={<Sales/>}/><Route path="/agenda" element={<Agenda/>}/><Route path="/financeiro" element={<Finance/>}/><Route path="/relatorios" element={<Reports/>}/><Route path="/configuracoes" element={<SettingsPage canEdit={user.role === "OWNER" || user.role === "ADMIN"}/>}/><Route path="*" element={<div className="placeholder-panel"><div className="empty-icon"><Wrench/></div><h2>Módulo em construção</h2><p>Esta área será implementada nas próximas etapas do TechManager.</p></div>}/></Routes></div>
    </main>
  </div>;
}
