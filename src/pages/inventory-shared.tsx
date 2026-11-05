import { ReactNode, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { api } from '../api';
export const money = (value: string | number) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const date = (value: string) => new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
export type SupplierOption = { id: string; name: string; active: boolean };
export function useSupplierOptions() {
  return useQuery({ queryKey: ['supplier-options'], queryFn: async () => {
    const items: SupplierOption[] = [];
    for (let page = 1; ; page++) {
      const result = await api<{ items: SupplierOption[]; total: number }>(`/suppliers?page=${page}`);
      items.push(...result.items);
      if (!result.items.length || items.length >= result.total) return items;
    }
  } });
}
export function InventoryDialog({ title, children, onClose, busy = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className="form-modal supplier-dialog inventory-dialog" aria-label={title} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>
    <div className="form-modal-heading"><h2>{title}</h2><button className="icon-btn" type="button" aria-label="Fechar" disabled={busy} onClick={onClose}><X size={18}/></button></div>{children}
  </dialog>;
}
export const movementLabels: Record<string, string> = { INITIAL: 'Saldo inicial', PURCHASE: 'Entrada por compra', SERVICE_ORDER: 'Saída para OS', RETURN: 'Devolução ao estoque', LOSS: 'Perda ou defeito', ADJUSTMENT: 'Ajuste de inventário', WARRANTY: 'Troca em garantia', SALE: 'Venda' };
export type Movement = { id: string; type: string; quantity: number; balanceAfter: number; unitCost: string; productName: string; supplierName?: string; occurredAt: string; createdAt: string; notes?: string; serviceOrder?: { number: number }; sale?: { number: number }; createdBy?: { name: string } };
export type MovementList = { items: Movement[]; total: number; page: number; pageSize: number };
export function Pagination({ page, total, onChange, busy }: { page: number; total: number; onChange: (page: number) => void; busy: boolean }) {
  return <div className="supplier-pagination"><span>Página {page} de {Math.max(1, Math.ceil(total / 30))} · {total} registros</span><div><button className="secondary-btn" disabled={busy || page <= 1} onClick={() => onChange(page - 1)}>Anterior</button><button className="secondary-btn" disabled={busy || page * 30 >= total} onClick={() => onChange(page + 1)}>Próxima</button></div></div>;
}
export function MovementTable({ items, purchases = false }: { items: Movement[]; purchases?: boolean }) {
  return <div className="table-scroll"><table><thead><tr><th>DATA</th><th>{purchases ? 'PEÇA' : 'MOVIMENTAÇÃO'}</th><th>QUANTIDADE</th><th>CUSTO UNIT.</th><th>{purchases ? 'TOTAL' : 'SALDO APÓS'}</th><th>REFERÊNCIA / OBSERVAÇÕES</th><th>RESPONSÁVEL</th></tr></thead><tbody>{items.map(item => <tr key={item.id}>
    <td>{date(item.occurredAt)}<small className="table-subtext">Registrado: {new Date(item.createdAt).toLocaleString('pt-BR')}</small></td><td>{purchases ? item.productName : movementLabels[item.type]}</td><td className={item.quantity > 0 ? 'stock-ok' : 'stock-low'}>{item.quantity > 0 ? '+' : ''}{item.quantity}</td><td>{money(item.unitCost)}</td><td>{purchases ? money(Number(item.unitCost) * item.quantity) : item.balanceAfter}</td>
    <td className="supplier-text">{item.supplierName}{item.serviceOrder && ` OS #${item.serviceOrder.number}`}{item.sale && ` Venda #${item.sale.number}`}<small className="table-subtext">{item.notes}</small></td><td>{item.createdBy?.name || 'Sistema'}</td>
  </tr>)}</tbody></table></div>;
}
