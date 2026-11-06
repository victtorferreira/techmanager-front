import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { emptyPayment, PurchasePaymentFields, refreshBusiness, useRequestId } from './payment-shared';
import { InventoryDialog, MovementList, MovementTable, Pagination, movementLabels, today, useSupplierOptions } from './inventory-shared';
export default function ProductStock({ product, onClose, purchaseOnly = false }: { product: { id: string; name: string; costPrice: string | number; active: boolean }; onClose: () => void; purchaseOnly?: boolean }) {
  const client = useQueryClient();
  const { withRequestId, resetRequestId } = useRequestId();
  const [payment, setPayment] = useState(emptyPayment);
  const [page, setPage] = useState(1);
  const [type, setType] = useState('PURCHASE');
  const [quantity, setQuantity] = useState('1');
  const [direction, setDirection] = useState('IN');
  const [supplierId, setSupplierId] = useState('');
  const [unitCost, setUnitCost] = useState(String(product.costPrice));
  const [occurredAt, setOccurredAt] = useState(today());
  const [serviceOrderId, setServiceOrderId] = useState('');
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState('');
  const suppliers = useSupplierOptions();
  const orders = useQuery({ queryKey: ['inventory-orders'], queryFn: () => api<{ id: string; number: number; customer: { name: string } }[]>('/products/service-orders') });
  const history = useQuery({ queryKey: ['stock-movements', product.id, page], queryFn: () => api<MovementList>(`/products/${product.id}/movements?page=${page}`) });
  const move = useMutation({ mutationFn: (payload: object) => api(`/products/${product.id}/movements`, { method: 'POST', body: JSON.stringify(payload) }), onSuccess: () => {
    setPage(1); setFeedback('Movimentação registrada.'); setNotes('');
    resetRequestId();
    void refreshBusiness(client);
  } });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (move.isPending) return;
    setFeedback('');
    const payload = withRequestId({ type, quantity: Number(quantity) * (['ADJUSTMENT', 'WARRANTY'].includes(type) && direction === 'OUT' ? -1 : 1),
      occurredAt, notes, ...(type === 'PURCHASE' ? { supplierId, unitCost: Number(unitCost), payment } : {}),
      ...(type !== 'PURCHASE' && serviceOrderId ? { serviceOrderId } : {}),
    });
    move.mutate(payload);
  }
  return <InventoryDialog title={`Estoque · ${product.name}`} onClose={onClose} busy={move.isPending}>
    {product.active ? <form onSubmit={submit}>
      <fieldset className="supplier-fieldset" disabled={move.isPending}><div className="modal-fields">
        <label>Tipo de movimentação<select value={type} disabled={purchaseOnly} onChange={e => { setType(e.target.value); move.reset(); setFeedback(''); }}>{Object.entries(movementLabels).filter(([key]) => !['INITIAL', 'SALE'].includes(key)).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label>Quantidade<input required type="number" min="1" max="2147483647" step="1" value={quantity} onChange={e => setQuantity(e.target.value)}/></label>
        {['ADJUSTMENT', 'WARRANTY'].includes(type) && <label>Direção<select value={direction} onChange={e => setDirection(e.target.value)}><option value="IN">Entrada no estoque</option><option value="OUT">Saída do estoque</option></select></label>}
        <label>{type === 'PURCHASE' ? 'Data da compra' : 'Data da movimentação'}<input required type="date" value={occurredAt} onChange={e => setOccurredAt(e.target.value)}/></label>
        {type === 'PURCHASE' ? <><label>Fornecedor<select required value={supplierId} onChange={e => setSupplierId(e.target.value)}><option value="">Selecione</option>{suppliers.data?.map(s => <option key={s.id} value={s.id}>{s.name}{!s.active ? ' (inativo)' : ''}</option>)}</select></label><label>Custo unitário (R$)<input required type="number" min="0" step="0.01" value={unitCost} onChange={e => setUnitCost(e.target.value)}/></label></> : <label className="modal-wide">Ordem de serviço {type === 'SERVICE_ORDER' ? '(obrigatória)' : '(opcional)'}<select required={type === 'SERVICE_ORDER'} value={serviceOrderId} onChange={e => setServiceOrderId(e.target.value)}><option value="">Selecione a OS</option>{orders.data?.map(o => <option key={o.id} value={o.id}>OS #{o.number} · {o.customer.name}</option>)}</select></label>}
        {type === 'PURCHASE' && <PurchasePaymentFields value={payment} onChange={setPayment}/>}
        <label className="modal-wide">Motivo / observações<textarea required={['ADJUSTMENT', 'WARRANTY', 'LOSS'].includes(type)} maxLength={1000} rows={2} value={notes} onChange={e => setNotes(e.target.value)}/></label>
      </div></fieldset>
      {suppliers.error && type === 'PURCHASE' && <p className="feedback error">Não foi possível carregar os fornecedores.</p>}{orders.error && type !== 'PURCHASE' && <p className="feedback error">Não foi possível carregar as ordens de serviço.</p>}
      {move.error && <p role="alert" className="feedback error">{move.error.message}</p>}{feedback && <p role="status" className="supplier-success">{feedback}</p>}
      <div className="form-modal-actions"><button className="primary-btn" disabled={move.isPending}>{move.isPending ? 'Registrando...' : 'Registrar movimentação'}</button></div>
    </form> : <p className="feedback">Produto inativo. Reative o cadastro para movimentar o estoque.</p>}
    <h3>Histórico de movimentações</h3><p className="inventory-hint">O saldo segue a ordem de registro. Datas anteriores não recalculam os saldos históricos.</p>
    {history.isLoading ? <p className="feedback">Carregando histórico...</p> : history.error ? <p className="feedback error">{history.error.message}</p> : history.data && <>{history.data.items.length ? <MovementTable items={history.data.items}/> : <p className="feedback">Nenhuma movimentação registrada.</p>}<Pagination page={page} total={history.data.total} busy={history.isFetching} onChange={setPage}/></>}
  </InventoryDialog>;
}
