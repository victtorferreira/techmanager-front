import { today } from './inventory-shared';
import { useRef } from 'react';
export function useRequestId() {
  const request = useRef({ fingerprint: '', id: crypto.randomUUID() });
  return { withRequestId: <T extends object,>(payload: T) => {
    const fingerprint = JSON.stringify(payload);
    if (request.current.fingerprint !== fingerprint) request.current = { fingerprint, id: crypto.randomUUID() };
    return { ...payload, requestId: request.current.id };
  }, resetRequestId: () => { request.current = { fingerprint: '', id: crypto.randomUUID() }; } };
}
export const paymentLabels: Record<string, string> = { PIX: 'Pix', CASH: 'Dinheiro', CREDIT_CARD: 'Cartão de crédito', DEBIT_CARD: 'Cartão de débito', BANK_TRANSFER: 'Transferência', OTHER: 'Outro' };
export type PurchasePayment = { status: 'PENDING' | 'PAID'; paymentMethod: string; dueAt: string; paidAt: string };
export const emptyPayment = (): PurchasePayment => ({ status: 'PENDING', paymentMethod: 'PIX', dueAt: today(), paidAt: today() });
export function PurchasePaymentFields({ value, onChange }: { value: PurchasePayment; onChange: (value: PurchasePayment) => void }) {
  return <>
    <label>Pagamento da compra<select value={value.status} onChange={e => onChange({ ...value, status: e.target.value as PurchasePayment['status'] })}><option value="PENDING">A pagar</option><option value="PAID">Já paga</option></select></label>
    <label>Vencimento<input required type="date" value={value.dueAt} onChange={e => onChange({ ...value, dueAt: e.target.value })}/></label>
    {value.status === 'PAID' && <><label>Data do pagamento<input required type="date" value={value.paidAt} onChange={e => onChange({ ...value, paidAt: e.target.value })}/></label><label>Forma de pagamento<select value={value.paymentMethod} onChange={e => onChange({ ...value, paymentMethod: e.target.value })}>{Object.entries(paymentLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></>}
    <p className="modal-wide inventory-hint">A compra gera uma despesa vinculada ao fornecedor no Financeiro. O estoque é atualizado no registro da compra.</p>
  </>;
}
export async function refreshBusiness(client: { invalidateQueries: (options: { queryKey: string[] }) => Promise<unknown> }) {
  await Promise.all(['finance-summary', 'reports-summary', 'orders', 'products', 'stock-movements', 'product-purchases', 'dashboard', 'inventory-orders'].map(key => client.invalidateQueries({ queryKey: [key] })));
}
