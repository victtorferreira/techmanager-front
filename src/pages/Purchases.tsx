import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '../api';
import ProductPurchases from './ProductPurchases';
import ProductStock from './ProductStock';
type Product = { id: string; name: string; costPrice: string; active: boolean };
export default function Purchases() {
  const [params] = useSearchParams();
  const [productId, setProductId] = useState('');
  const [open, setOpen] = useState(false);
  const products = useQuery({ queryKey: ['products'], queryFn: () => api<Product[]>('/products') });
  const selected = products.data?.find(p => p.id === productId);
  return <div className="page-stack">
    <div className="section-toolbar"><div><h2>Compras</h2><p>Registre entradas de peças e acompanhe as despesas por fornecedor.</p></div><Link className="secondary-btn" to="/financeiro">Ver contas a pagar</Link></div>
    <div className="panel"><div className="filter-row"><label>Produto para comprar <select aria-label="Produto para comprar" value={productId} onChange={e => setProductId(e.target.value)}><option value="">Selecione uma peça cadastrada</option>{products.data?.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><button className="primary-btn" disabled={!selected} onClick={() => setOpen(true)}><Plus size={17}/> Registrar compra</button></div><p className="inventory-hint">Para uma peça nova, <Link to="/produtos">cadastre o produto</Link> e informe a compra inicial.</p>{products.error && <p role="alert" className="feedback error">{products.error.message}</p>}</div>
    <ProductPurchases initialSupplier={params.get('supplierId') ?? ''}/>
    {open && selected && <ProductStock product={selected} purchaseOnly onClose={() => setOpen(false)}/>}
  </div>;
}
