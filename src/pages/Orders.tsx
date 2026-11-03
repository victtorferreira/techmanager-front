import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Plus, Search } from 'lucide-react';
import { api } from '../api';

type Order = {
  id: string; number: number; reportedIssue: string; status: string; createdAt: string;
  publicRequest: boolean; accessories?: string | null; devicePowersOn?: boolean | null;
  liquidDamage?: boolean | null; previousRepair?: boolean | null; preferredContact?: string | null;
  customer: { name: string; phone?: string | null };
  device: { brand: string; model: string; color?: string | null };
};
const labels: Record<string, string> = {
  RECEIVED: 'Recebido', DIAGNOSIS: 'Em diagnóstico', WAITING_APPROVAL: 'Aguardando aprovação',
  WAITING_PART: 'Aguardando peça', IN_REPAIR: 'Em reparo', TESTING: 'Em testes', READY: 'Pronto',
  DELIVERED: 'Entregue', CANCELED: 'Cancelado', NO_REPAIR: 'Sem conserto',
};

export default function Orders() {
  const { data = [], isLoading, error } = useQuery({ queryKey: ['orders'], queryFn: () => api<Order[]>('/service-orders') });
  return <div className="page-stack">
    <div className="section-toolbar"><div><h2>Ordens de serviço</h2><p>Solicitações do site e atendimentos registrados pela assistência.</p></div><button className="primary-btn"><Plus size={17}/> Nova ordem</button></div>
    <div className="filter-row"><div className="search-field"><Search size={17}/><input placeholder="Buscar OS, cliente ou aparelho"/></div><select><option>Todos os status</option>{Object.entries(labels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></div>
    <div className="panel">{isLoading ? <p className="feedback">Carregando ordens...</p> : error ? <p className="feedback error">Não foi possível carregar as ordens. Verifique a autenticação e a API.</p> : data.length === 0 ? <div className="empty-state"><ClipboardList size={28}/><strong>Nenhuma ordem cadastrada</strong><span>Quando uma solicitação for enviada ou uma OS criada, ela aparecerá aqui.</span></div> :
      <div className="table-scroll"><table><thead><tr><th>Nº OS</th><th>CLIENTE / CONTATO</th><th>APARELHO</th><th>DEFEITO RELATADO</th><th>TRIAGEM</th><th>ORIGEM</th><th>STATUS</th><th>ENTRADA</th></tr></thead><tbody>{data.map(order => <tr key={order.id}>
        <td className="order-number">#{String(order.number).padStart(5, '0')}</td>
        <td>{order.customer.name}<small className="table-subtext">{order.customer.phone || 'Sem telefone'}</small></td>
        <td>{order.device.brand} {order.device.model}{order.device.color && <small className="table-subtext">{order.device.color}</small>}</td>
        <td className="issue-cell">{order.reportedIssue}</td>
        <td className="triage-cell">{order.publicRequest ? <>{order.devicePowersOn ? 'Liga' : 'Não liga'} · {order.liquidDamage ? 'Teve contato com líquido' : 'Sem contato com líquido'} · {order.previousRepair ? 'Já reparado' : 'Sem reparo anterior'}{order.accessories && <small className="table-subtext">Acompanha: {order.accessories}</small>}{order.preferredContact && <small className="table-subtext">Contato: {order.preferredContact === 'WHATSAPP' ? 'WhatsApp' : order.preferredContact === 'PHONE' ? 'Ligação' : 'E-mail'}</small>}</> : '—'}</td>
        <td>{order.publicRequest ? <span className="origin-pill">Site</span> : 'Balcão'}</td>
        <td><span className={`status-pill ${order.status === 'READY' ? 'green' : order.status === 'RECEIVED' ? 'orange' : 'blue'}`}>{labels[order.status] || order.status}</span></td>
        <td>{new Date(order.createdAt).toLocaleDateString('pt-BR')}</td>
      </tr>)}</tbody></table></div>}</div>
  </div>;
}
