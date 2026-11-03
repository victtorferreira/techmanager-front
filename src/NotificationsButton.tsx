import { useEffect, useRef, useState } from 'react';
import { Bell, ClipboardList, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';

type NotificationOrder = {
  id: string;
  number: number;
  publicRequest: boolean;
  status: string;
  createdAt: string;
  customer: { name: string };
  device: { brand: string; model: string };
};

function timeLabel(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'Agora';
  if (minutes < 60) return `Há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours} h`;
  return new Date(value).toLocaleDateString('pt-BR');
}

export default function NotificationsButton({ tenantSlug }: { tenantSlug: string }) {
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState(() => localStorage.getItem(`techmanager_notifications_seen_${tenantSlug}`));
  const container = useRef<HTMLDivElement>(null);
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['orders'], queryFn: () => api<NotificationOrder[]>('/service-orders'), refetchInterval: 15000,
  });
  const publicRequests = data.filter(order => order.publicRequest && order.status === 'RECEIVED');
  const requests = publicRequests.slice(0, 8);
  const unread = publicRequests.filter(order => !lastSeen || new Date(order.createdAt).getTime() > new Date(lastSeen).getTime()).length;

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

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      const seenAt = new Date().toISOString();
      localStorage.setItem(`techmanager_notifications_seen_${tenantSlug}`, seenAt);
      setLastSeen(seenAt);
    }
  }

  return <div className="notification-wrap" ref={container}>
    <button className="icon-btn notification" aria-label="Notificações" aria-expanded={open} onClick={toggle}>
      <Bell size={18}/>{unread > 0 && <span className="notification-count">{unread > 9 ? '9+' : unread}</span>}
    </button>
    {open && <section className="notification-popover" aria-label="Notificações recentes">
      <header><div><strong>Notificações</strong><span>{unread ? `${unread} nova${unread === 1 ? '' : 's'}` : 'Solicitações recebidas'}</span></div><ClipboardList size={18}/></header>
      {isLoading ? <p className="notification-message">Carregando solicitações...</p> : error ? <p className="notification-message notification-error">Não foi possível carregar as notificações.</p> : requests.length === 0 ? <p className="notification-message">Nenhuma solicitação recebida pelo site.</p> : <ul>{requests.map(order => <li key={order.id} className={!lastSeen || new Date(order.createdAt).getTime() > new Date(lastSeen).getTime() ? 'notification-unread' : ''}>
        <span className="notification-bullet"/><div><strong>Nova solicitação #{String(order.number).padStart(5, '0')}</strong><span>{order.customer.name} · {order.device.brand} {order.device.model}</span><small>{timeLabel(order.createdAt)}</small></div>
      </li>)}</ul>}
      <Link className="notification-footer" to="/ordens" onClick={() => setOpen(false)}>Ver solicitações e ordens <ExternalLink size={14}/></Link>
    </section>}
  </div>;
}
