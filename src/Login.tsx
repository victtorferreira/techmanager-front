import { FormEvent, useState } from 'react';
import { Smartphone } from 'lucide-react';
import { API_URL, SessionUser } from './api';

export default function Login({ onLogin, tenantName }: { onLogin: (token: string, tenantSlug: string, user: SessionUser, tenantName: string) => void; tenantName: string }) {
  const [registering, setRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (registering && password !== confirmation) {
      setError('As senhas não coincidem.');
      return;
    }
    if (registering && new TextEncoder().encode(password).length > 72) {
      setError('A senha deve ter no máximo 72 bytes. Use uma senha mais curta.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/${registering ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = Array.isArray(body.message) ? body.message.join(' ') : body.message;
        throw new Error(message || (registering ? 'Não foi possível criar sua conta.' : 'Não foi possível entrar. Confira seu e-mail e senha.'));
      }
      onLogin(body.accessToken, body.tenant.slug, body.user, body.tenant.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível conectar à API.');
    } finally {
      setLoading(false);
    }
  }

  return <main className="login-page"><form className="login-card" onSubmit={submit}>
    <div className="login-brand"><div className="brand-mark"><Smartphone size={21}/></div><div><strong title={tenantName}>{tenantName}</strong><span>GESTÃO INTELIGENTE</span></div></div>
    <h1>{registering ? 'Crie sua conta' : 'Entre na sua conta'}</h1><p>{registering ? 'Cadastre-se para gerenciar sua assistência técnica.' : 'Acesse sua assistência técnica.'}</p>
    <label htmlFor="login-email">E-mail</label><input id="login-email" type="email" autoComplete="username" maxLength={254} disabled={loading} value={email} onChange={e => setEmail(e.target.value)} required />
    <label htmlFor="login-password">Senha</label><input id="login-password" type="password" autoComplete={registering ? 'new-password' : 'current-password'} minLength={registering ? 12 : undefined} maxLength={registering ? 72 : undefined} aria-describedby={registering ? 'register-password-hint' : undefined} disabled={loading} value={password} onChange={e => setPassword(e.target.value)} required />
    {registering && <><small id="register-password-hint" className="login-hint">Use pelo menos 12 caracteres.</small><label htmlFor="register-confirmation">Confirme a senha</label><input id="register-confirmation" type="password" autoComplete="new-password" disabled={loading} value={confirmation} onChange={e => setConfirmation(e.target.value)} required /></>}
    {error && <div className="login-error" role="alert">{Array.isArray(error) ? error.join(', ') : error}</div>}
    <button type="submit" className="primary-btn login-submit" disabled={loading}>{loading ? (registering ? 'Criando conta...' : 'Entrando...') : (registering ? 'Criar conta' : 'Entrar')}</button>
    <div className="login-switch"><span>{registering ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'}</span><button type="button" disabled={loading} onClick={() => { setRegistering(!registering); setPassword(''); setConfirmation(''); setError(''); }}>{registering ? 'Entrar' : 'Cadastre-se'}</button></div>
  </form></main>;
}
