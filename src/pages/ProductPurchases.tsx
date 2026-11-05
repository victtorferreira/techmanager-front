import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { MovementList, MovementTable, Pagination, money, useSupplierOptions } from './inventory-shared';
type Purchases = MovementList & { totalAmount: string; suppliers: { supplierId: string; supplierName: string; quantity: number; totalAmount: string; purchases: number }[] };
export default function ProductPurchases({ initialSupplier = '' }: { initialSupplier?: string }) {
  const [supplierId, setSupplierId] = useState(initialSupplier);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const suppliers = useSupplierOptions();
  const query = useQuery({ queryKey: ['product-purchases', supplierId, from, to, page], queryFn: () => {
    const params = new URLSearchParams({ page: String(page) });
    if (supplierId) params.set('supplierId', supplierId);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return api<Purchases>(`/products/purchases?${params}`);
  } });
  return <div className="panel">
    <div className="inventory-filters"><label>Fornecedor<select value={supplierId} onChange={e => { setSupplierId(e.target.value); setPage(1); }}><option value="">Todos os fornecedores</option>{suppliers.data?.map(s => <option key={s.id} value={s.id}>{s.name}{!s.active ? ' (inativo)' : ''}</option>)}</select></label><label>De<input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }}/></label><label>Até<input type="date" min={from} value={to} onChange={e => { setTo(e.target.value); setPage(1); }}/></label></div>
    {suppliers.error && <p className="feedback error">Não foi possível carregar os fornecedores.</p>}
    {query.isLoading ? <p className="feedback">Carregando compras...</p> : query.error ? <p role="alert" className="feedback error">{query.error.message}</p> : query.data && <>
      <p className="inventory-total">Total comprado: <strong>{money(query.data.totalAmount)}</strong></p>
      {query.data.suppliers.length > 0 && <div className="table-scroll"><table><thead><tr><th>FORNECEDOR</th><th>ENTRADAS POR COMPRA</th><th>PEÇAS COMPRADAS</th><th>VALOR TOTAL</th></tr></thead><tbody>{query.data.suppliers.map(s => <tr key={s.supplierId}><td>{s.supplierName}</td><td>{s.purchases}</td><td>{s.quantity}</td><td>{money(s.totalAmount)}</td></tr>)}</tbody></table></div>}
      <h3>Detalhamento das compras</h3>{query.data.items.length ? <MovementTable items={query.data.items} purchases/> : <p className="feedback">Nenhuma compra registrada neste filtro.</p>}
      <Pagination page={page} total={query.data.total} busy={query.isFetching} onChange={setPage}/>
    </>}
  </div>;
}
