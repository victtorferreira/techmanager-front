import { FormEvent, useState } from 'react';
import { Smartphone } from 'lucide-react';
import { SessionUser } from './api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function Login({ onLogin, tenantName }: { onLogin: (token: string, tenantSlug: string, user: SessionUser, tenantName: string) => void; tenantName: string }) {
  const [email, setEmail] = useState('admin@techmanager.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || 'Não foi possível entrar. Confira seu e-mail e senha.');
      onLogin(body.accessToken, body.tenant.slug, body.user, body.tenant.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível conectar à API.');
    } finally {
      setLoading(false);
    }
  }

  return <main className="login-page"><form className="login-card" onSubmit={submit}>
    <div className="login-brand"><div className="brand-mark"><Smartphone size={21}/></div><div><strong title={tenantName}>{tenantName}</strong><span>GESTÃO INTELIGENTE</span></div></div>
    <h1>Entre na sua conta</h1><p>Acesse sua assistência técnica.</p>
    <label htmlFor="login-email">E-mail</label><input id="login-email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required />
    <label htmlFor="login-password">Senha</label><input id="login-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
    {error && <div className="login-error" role="alert">{Array.isArray(error) ? error.join(', ') : error}</div>}
    <button className="primary-btn login-submit" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
  </form></main>;
}
