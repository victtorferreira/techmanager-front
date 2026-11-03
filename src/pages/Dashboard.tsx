import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Copy, ExternalLink, Smartphone, Wrench } from 'lucide-react';
import { api } from '../api';

type Order = {
  id: string; number: number; reportedIssue: string; status: string; createdAt: string; publicRequest: boolean;
  customer: { name: string }; device: { brand: string; model: string };
};
const labels: Record<string, string> = {
  RECEIVED: 'Recebido', DIAGNOSIS: 'Em diagnóstico', WAITING_APPROVAL: 'Aguardando aprovação',
  WAITING_PART: 'Aguardando peça', IN_REPAIR: 'Em reparo', TESTING: 'Em testes', READY: 'Pronto',
  DELIVERED: 'Entregue', CANCELED: 'Cancelado', NO_REPAIR: 'Sem conserto',
};
const inProgress = new Set(['DIAGNOSIS', 'WAITING_APPROVAL', 'WAITING_PART', 'IN_REPAIR', 'TESTING']);

export default function Dashboard({ tenantSlug }: { tenantSlug: string }) {
  const [copied, setCopied] = useState(false);
  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['orders'], queryFn: () => api<Order[]>('/service-orders'), refetchInterval: 15000,
  });
  const recent = orders.slice(0, 6);
  const publicUrl = `${window.location.origin}/solicitar/${tenantSlug}`;
  const cards = [
    { label: 'Novas solicitações online', value: orders.filter(order => order.publicRequest && order.status === 'RECEIVED').length, icon: ClipboardList, tone: 'blue' },
    { label: 'Em andamento', value: orders.filter(order => inProgress.has(order.status)).length, icon: Wrench, tone: 'violet' },
    { label: 'Prontos para retirada', value: orders.filter(order => order.status === 'READY').length, icon: Smartphone, tone: 'green' },
    { label: 'Ordens de serviço', value: orders.length, icon: ClipboardList, tone: 'orange' },
  ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return <div className="page-stack">
    <div className="welcome-row"><div><h2>Painel da assistência</h2><p>Solicitações recebidas e ordens de serviço atualizadas.</p></div>
      <div className="public-link-actions"><a className="primary-btn" href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink size={16}/> Abrir formulário público</a><button className="secondary-btn" onClick={copyLink}><Copy size={15}/> {copied ? 'Link copiado' : 'Copiar link'}</button></div>
    </div>
    <section className="stats-grid">{cards.map(card => <article className="stat-card" key={card.label}><div className="stat-top"><span>{card.label}</span><div className={`stat-icon ${card.tone}`}><card.icon size={19}/></div></div><div className="stat-value">{isLoading ? '—' : card.value}</div></article>)}</section>
    <section className="panel table-panel"><div className="panel-heading"><div><h3>Solicitações e ordens recentes</h3><p>Pedidos enviados pelo formulário público aparecem aqui como recebidos.</p></div><a href="/ordens">Ver todas <span>→</span></a></div>
      {isLoading ? <p className="feedback">Carregando ordens...</p> : error ? <p className="feedback error">Não foi possível carregar as ordens. Verifique a API e sua autenticação.</p> : recent.length === 0 ? <div className="empty-state"><ClipboardList size={28}/><strong>Nenhuma solicitação ainda</strong><span>Compartilhe o link público para receber o primeiro aparelho.</span></div> :
        <div className="table-scroll"><table><thead><tr><th>Nº OS</th><th>CLIENTE</th><th>APARELHO</th><th>DEFEITO RELATADO</th><th>ORIGEM</th><th>STATUS</th></tr></thead><tbody>{recent.map(order => <tr key={order.id}>
          <td className="order-number">#{String(order.number).padStart(5, '0')}</td><td>{order.customer.name}</td><td>{order.device.brand} {order.device.model}</td><td className="dashboard-issue">{order.reportedIssue}</td>
          <td>{order.publicRequest ? <span className="origin-pill">Site</span> : 'Balcão'}</td><td><span className={`status-pill ${order.status === 'READY' ? 'green' : order.status === 'RECEIVED' ? 'orange' : 'blue'}`}>{labels[order.status] || order.status}</span></td>
        </tr>)}</tbody></table></div>}
    </section>
  </div>;
}
