import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Plus, Search } from 'lucide-react';
import { api } from '../api';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import NewOrderDialog from './NewOrderDialog';
import OrderFinanceDialog from './OrderFinanceDialog';

type Order = {
  id: string; number: number; reportedIssue: string; status: string; createdAt: string;
  publicRequest: boolean; accessories?: string | null; devicePowersOn?: boolean | null;
  deliveryMethod?: 'DROP_OFF' | 'PICKUP' | null; pickupAddress?: string | null; devicePhotos?: string[];
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
  const [params, setParams] = useSearchParams();
  const orderId = params.get('orderId');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  useEffect(() => { setSearch(''); setStatus(''); }, [orderId]);
  const { data = [], isLoading, error } = useQuery({ queryKey: orderId ? ['orders', orderId] : ['orders'], queryFn: () => api<Order[]>(`/service-orders${orderId ? `?orderId=${encodeURIComponent(orderId)}` : ''}`) });
  const visibleOrders = data.filter(order => (!status || order.status === status) && [String(order.number), order.customer.name, order.customer.phone, order.device.brand, order.device.model, order.reportedIssue].some(value => value?.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR').replace(/^#/, ''))));
  return <div className="page-stack">
    <div className="section-toolbar"><div><h2>Ordens de serviço</h2><p>Solicitações do site e atendimentos registrados pela assistência.</p></div><button className="primary-btn" onClick={() => setOpen(true)}><Plus size={17}/> Nova ordem</button></div>
    {orderId && <button className="secondary-btn" onClick={() => setParams({})}>Ver todas as ordens</button>}
    <div className="filter-row"><div className="search-field"><Search size={17}/><input aria-label="Buscar ordens" placeholder="Buscar OS, cliente ou aparelho" value={search} onChange={event => setSearch(event.target.value)}/></div><select aria-label="Filtrar ordens por status" value={status} onChange={event => setStatus(event.target.value)}><option value="">Todos os status</option>{Object.entries(labels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></div>
    <div className="panel">{isLoading ? <p className="feedback">Carregando ordens...</p> : error ? <p className="feedback error">Não foi possível carregar as ordens. Verifique a autenticação e a API.</p> : data.length === 0 ? <div className="empty-state"><ClipboardList size={28}/><strong>Nenhuma ordem cadastrada</strong><span>Quando uma solicitação for enviada ou uma OS criada, ela aparecerá aqui.</span></div> :
      visibleOrders.length === 0 ? <p className="feedback">Nenhuma ordem encontrada com estes filtros.</p> : <div className="table-scroll"><table><thead><tr><th>Nº OS</th><th>CLIENTE / CONTATO</th><th>APARELHO</th><th>DEFEITO RELATADO</th><th>TRIAGEM</th><th>ORIGEM</th><th>STATUS</th><th>ENTRADA</th></tr></thead><tbody>{visibleOrders.map(order => <tr key={order.id}>
        <td className="order-number">#{String(order.number).padStart(5, '0')}</td>
        <td>{order.customer.name}<small className="table-subtext">{order.customer.phone || 'Sem telefone'}</small></td>
        <td>{order.device.brand} {order.device.model}{order.device.color && <small className="table-subtext">{order.device.color}</small>}</td>
        <td className="issue-cell">{order.reportedIssue}{Boolean(order.devicePhotos?.length) && <details className="order-photos"><summary>Ver fotos ({order.devicePhotos!.length})</summary><div className="device-photo-grid">{order.devicePhotos!.map((photo, index) => <a key={index} href={photo} download={`OS-${order.number}-foto-${index + 1}.jpg`} title="Baixar foto"><img src={photo} alt={`Foto ${index + 1} do aparelho da OS ${order.number}`} loading="lazy"/></a>)}</div></details>}
          {order.deliveryMethod && <small className="table-subtext"><strong>{order.deliveryMethod === 'PICKUP' ? 'Coleta solicitada' : 'Cliente levará à assistência'}</strong>{order.deliveryMethod === 'PICKUP' && <span className="pickup-address">{order.pickupAddress}</span>}</small>}
        </td>
        <td className="triage-cell">{order.publicRequest ? <>{order.devicePowersOn ? 'Liga' : 'Não liga'} · {order.liquidDamage ? 'Teve contato com líquido' : 'Sem contato com líquido'} · {order.previousRepair ? 'Já reparado' : 'Sem reparo anterior'}{order.accessories && <small className="table-subtext">Acompanha: {order.accessories}</small>}{order.preferredContact && <small className="table-subtext">Contato: {order.preferredContact === 'WHATSAPP' ? 'WhatsApp' : order.preferredContact === 'PHONE' ? 'Ligação' : 'E-mail'}</small>}</> : '—'}</td>
        <td>{order.publicRequest ? <span className="origin-pill">Site</span> : 'Balcão'}</td>
        <td><span className={`status-pill ${order.status === 'READY' ? 'green' : order.status === 'RECEIVED' ? 'orange' : 'blue'}`}>{labels[order.status] || order.status}</span></td>
        <td>{new Date(order.createdAt).toLocaleDateString('pt-BR')}<div><button className="secondary-btn" onClick={() => setSelected(order.id)}>Atendimento / financeiro</button></div></td>
      </tr>)}</tbody></table></div>}</div>
    {open && <NewOrderDialog onClose={() => { setOpen(false); if (orderId) setParams({}); }}/>}
    {selected && <OrderFinanceDialog id={selected} labels={labels} onClose={() => setSelected(null)}/>}
  </div>;
}
