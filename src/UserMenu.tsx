import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import { SessionUser } from './api';

const roleLabels: Record<string, string> = {
  OWNER: 'Proprietário', ADMIN: 'Administrador', ATTENDANT: 'Atendente', TECHNICIAN: 'Técnico',
};

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'U';
}

export default function UserMenu({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return <div className="user-menu-wrap" ref={container}>
    <button className="top-user user-menu-trigger" aria-label="Menu da conta" aria-expanded={open} onClick={() => setOpen(!open)}>
      <div className="user-avatar">{initials(user.name)}</div>
      <div><strong>{user.name}</strong><span>{roleLabels[user.role] || user.role}</span></div>
      <ChevronDown size={15}/>
    </button>
    {open && <section className="user-menu-popover" aria-label="Conta do usuário">
      <div className="user-menu-identity"><div className="user-avatar">{initials(user.name)}</div><div><strong>{user.name}</strong><span>{user.email}</span></div></div>
      <div className="user-menu-role">{roleLabels[user.role] || user.role}</div>
      <button className="user-menu-logout" onClick={onLogout}><LogOut size={16}/> Sair da conta</button>
    </section>}
  </div>;
}
