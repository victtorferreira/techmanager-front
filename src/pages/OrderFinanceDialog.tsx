import { FormEvent, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { InventoryDialog, money, today } from './inventory-shared';
import { paymentLabels, refreshBusiness, useRequestId } from './payment-shared';

type Entry = { id: string; type: string; status: string; amount: string; occurredAt: string; paymentMethod?: string; reversalOfId?: string; reversal?: { id: string } };
type Part = { productId: string; productName: string; quantity: number; unitCost: string };
type Order = { id: string; number: number; status: string; diagnosis?: string; laborAmount: string; partsAmount: string; totalAmount: string; financialEntries: Entry[]; stockMovements: Part[] };
export default function OrderFinanceDialog({ id, labels, onClose }: { id: string; labels: Record<string, string>; onClose: () => void }) {
  const client = useQueryClient();
  const { withRequestId, resetRequestId } = useRequestId();
  const query = useQuery({ queryKey: ['orders', id, 'finance'], queryFn: async () => (await api<Order[]>(`/service-orders?orderId=${id}`))[0] });
  const order = query.data;
  const [editing, setEditing] = useState<{ status: string; laborAmount: string; partsAmount: string; diagnosis: string } | null>(null);
  const [payment, setPayment] = useState({ amount: '', paidAt: today(), paymentMethod: 'PIX' });
  const request = useRef({ fingerprint: '', id: crypto.randomUUID() });
  const [part, setPart] = useState({ productId: '', quantity: '1', type: 'SERVICE_ORDER' });
  const [message, setMessage] = useState('');
  const [refundId, setRefundId] = useState<string | null>(null);
  const products = useQuery({ queryKey: ['products'], queryFn: () => api<{ id: string; name: string; stockQuantity: number; active: boolean }[]>('/products') });
  const action = useMutation({ mutationFn: ({ path, method, body }: { path: string; method: string; body: object }) => api(path, { method, body: JSON.stringify(body) }), onSuccess: async () => { setEditing(null); setRefundId(null); resetRequestId(); setPayment(p => ({ ...p, amount: '' })); request.current = { fingerprint: '', id: crypto.randomUUID() }; setMessage('Registro salvo.'); await refreshBusiness(client); } });
  const form = editing ?? { status: order?.status ?? 'RECEIVED', laborAmount: order?.laborAmount ?? '0', partsAmount: order?.partsAmount ?? '0', diagnosis: order?.diagnosis ?? '' };
  const received = order?.financialEntries.filter(e => e.status === 'PAID').reduce((sum, e) => sum + Number(e.amount) * (e.type === 'INCOME' ? 1 : -1), 0) ?? 0;
  const partsCost = order?.stockMovements.reduce((sum, p) => sum - p.quantity * Number(p.unitCost), 0) ?? 0;
  const remaining = Number(order?.totalAmount ?? 0) - received;
  const closed = ['CANCELED', 'NO_REPAIR'].includes(order?.status ?? '');
  function run(path: string, method: string, body: object) { setMessage(''); action.mutate({ path, method, body: path.startsWith('/products/') ? withRequestId(body) : body }); }
  function pay(event: FormEvent) {
    event.preventDefault();
    const fingerprint = JSON.stringify(payment);
    if (request.current.fingerprint !== fingerprint) request.current = { fingerprint, id: crypto.randomUUID() };
    run(`/service-orders/${id}/payments`, 'POST', { ...payment, amount: Number(payment.amount), requestId: request.current.id });
  }
  return <InventoryDialog title={order ? `OS #${String(order.number).padStart(5, '0')} · atendimento e financeiro` : 'Carregando OS'} onClose={onClose} busy={action.isPending}>
    {query.error && <p role="alert" className="feedback error">{query.error.message}</p>}
    {action.error && <p role="alert" className="feedback error">{action.error.message}</p>}{message && <p role="status" className="supplier-success">{message}</p>}
    {order && <>
      <div className="order-finance-summary"><p>Total da OS <strong>{money(order.totalAmount)}</strong></p><p>Recebido líquido <strong>{money(received)}</strong></p><p>A receber <strong>{money(closed ? 0 : remaining)}</strong></p><p>Custo das peças utilizadas <strong>{money(partsCost)}</strong></p><p>Resultado estimado <strong>{money(closed ? 0 : Number(order.totalAmount) - partsCost)}</strong></p></div>
      <form onSubmit={e => { e.preventDefault(); run(`/service-orders/${id}`, 'PATCH', { ...form, laborAmount: Number(form.laborAmount), partsAmount: Number(form.partsAmount) }); }}>
        <fieldset className="supplier-fieldset" disabled={action.isPending}><div className="modal-fields">
          <label>Status da OS<select value={form.status} onChange={e => setEditing({ ...form, status: e.target.value })}>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label>Mão de obra cobrada (R$)<input required type="number" min="0" max="999999999" step="0.01" value={form.laborAmount} onChange={e => setEditing({ ...form, laborAmount: e.target.value })}/></label>
          <label>Peças cobradas ao cliente (R$)<input required type="number" min="0" max="999999999" step="0.01" value={form.partsAmount} onChange={e => setEditing({ ...form, partsAmount: e.target.value })}/></label>
          <label className="modal-wide">Diagnóstico<textarea maxLength={2000} value={form.diagnosis} onChange={e => setEditing({ ...form, diagnosis: e.target.value })}/></label>
        </div><p className="inventory-hint">Salve os valores antes de receber. O custo das peças vem do estoque; o preço cobrado é informado acima. Entregar a OS não quita o pagamento. Para cancelar, devolva as peças e estorne os recebimentos primeiro.</p>
        <div className="form-modal-actions"><button className="primary-btn">Salvar atendimento e valores</button></div></fieldset>
      </form>
      {!closed && remaining > 0 && <form onSubmit={pay}><h3>Registrar sinal ou recebimento</h3><fieldset className="supplier-fieldset" disabled={action.isPending}><div className="modal-fields">
        <label>Valor recebido (R$)<input required type="number" min="0.01" max={remaining} step="0.01" value={payment.amount} onChange={e => setPayment({ ...payment, amount: e.target.value })}/></label>
        <label>Data do recebimento<input required type="date" value={payment.paidAt} onChange={e => setPayment({ ...payment, paidAt: e.target.value })}/></label>
        <label>Forma de pagamento<select value={payment.paymentMethod} onChange={e => setPayment({ ...payment, paymentMethod: e.target.value })}>{Object.entries(paymentLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      </div><div className="form-modal-actions"><button className="primary-btn">Registrar recebimento</button></div></fieldset></form>}
      <h3>Recebimentos e estornos</h3>
      {order.financialEntries.filter(e => e.status === 'PAID').map(e => <div className="order-payment-row" key={e.id}><span>{new Date(e.occurredAt).toLocaleDateString('pt-BR')} · {e.type === 'INCOME' ? 'Recebido' : 'Estornado'} · {money(e.amount)}</span>{e.type === 'INCOME' && !e.reversal && <button className="secondary-btn" disabled={action.isPending} onClick={() => setRefundId(e.id)}>Estornar recebimento</button>}{e.reversal && <small>Estornado</small>}</div>)}
      {refundId && <div className="order-refund-confirm"><p>Confirme somente após devolver o valor integral deste recebimento ao cliente. O estorno será registrado com a data de hoje e o saldo a receber será atualizado.</p><button className="secondary-btn" disabled={action.isPending} onClick={() => setRefundId(null)}>Voltar</button> <button className="primary-btn" disabled={action.isPending} onClick={() => run(`/finance/entries/${refundId}/status`, 'PATCH', { status: 'CANCELED' })}>Confirmar estorno</button></div>}
      {!order.financialEntries.some(e => e.status === 'PAID') && <p className="feedback">Nenhum recebimento.</p>}
      <h3>Peças utilizadas e devoluções</h3>
      {order.stockMovements.map((p, index) => <p key={index}>{p.productName} · {p.quantity < 0 ? 'Utilizadas' : 'Devolvidas'}: {Math.abs(p.quantity)} · custo {money(p.unitCost)} / un.</p>)}
      {!closed && order.status !== 'DELIVERED' && <form onSubmit={e => { e.preventDefault(); run(`/products/${part.productId}/movements`, 'POST', { type: part.type, quantity: Number(part.quantity), serviceOrderId: id }); }}><fieldset className="supplier-fieldset" disabled={action.isPending}><div className="modal-fields">
        <label>Movimentação<select value={part.type} onChange={e => setPart({ ...part, type: e.target.value })}><option value="SERVICE_ORDER">Usar peça na OS</option><option value="RETURN">Devolver ao estoque</option></select></label>
        <label>Peça<select required value={part.productId} onChange={e => setPart({ ...part, productId: e.target.value })}><option value="">Selecione</option>{products.data?.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name} · {p.stockQuantity} em estoque</option>)}</select></label>
        <label>Quantidade<input required type="number" min="1" step="1" max="2147483647" value={part.quantity} onChange={e => setPart({ ...part, quantity: e.target.value })}/></label>
      </div>{products.error && <p className="feedback error">{products.error.message}</p>}<div className="form-modal-actions"><button className="primary-btn">Registrar peça</button></div></fieldset></form>}
    </>}
  </InventoryDialog>;
}
