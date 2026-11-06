import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { History, Package, Pencil, Plus, Search } from 'lucide-react';
import { api } from '../api';
import ProductStock from './ProductStock';
import { emptyPayment, PurchasePaymentFields, refreshBusiness, useRequestId } from './payment-shared';
import ProductPurchases from './ProductPurchases';
import { InventoryDialog, date, money, useSupplierOptions } from './inventory-shared';
type Product = { id: string; name: string; sku?: string | null; category?: string | null; compatibility?: string | null; quality?: string | null; location?: string | null; supplierId?: string | null; supplier?: { name: string } | null; purchaseDate?: string | null; stockQuantity: number; minimumStock: number; salePrice: string | number; costPrice: string | number; active: boolean };
const emptyForm = { name: '', sku: '', category: '', compatibility: '', quality: '', location: '', supplierId: '', purchaseDate: '', costPrice: '0', salePrice: '0', stockQuantity: '0', minimumStock: '0', active: true };
export default function Products() {
  const client = useQueryClient();
  const { withRequestId, resetRequestId } = useRequestId();
  const [payment, setPayment] = useState(emptyPayment);
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(params.has('supplierId') ? 'purchases' : 'products');
  const [editor, setEditor] = useState<{ id?: string } | null>(null);
  const [stock, setStock] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [lowOnly, setLowOnly] = useState(false);
  const productId = params.get('productId');
  useEffect(() => { if (productId) { setTab('products'); setSearch(''); setStatus('all'); setLowOnly(false); } }, [productId]);
  const query = useQuery({ queryKey: ['products'], queryFn: () => api<Product[]>('/products') });
  const suppliers = useSupplierOptions();
  const save = useMutation({ mutationFn: (payload: object) => api(editor?.id ? `/products/${editor.id}` : '/products', { method: editor?.id ? 'PUT' : 'POST', body: JSON.stringify(payload) }), onSuccess: () => {
    setEditor(null);
    void refreshBusiness(client);
  } });
  function openEditor(product?: Product) {
    save.reset();
    resetRequestId();
    setPayment(emptyPayment());
    setForm(product ? { name: product.name, sku: product.sku || '', category: product.category || '', compatibility: product.compatibility || '', quality: product.quality || '', location: product.location || '', supplierId: product.supplierId || '', purchaseDate: product.purchaseDate?.slice(0, 10) || '', costPrice: String(product.costPrice), salePrice: String(product.salePrice), stockQuantity: String(product.stockQuantity), minimumStock: String(product.minimumStock), active: product.active } : { ...emptyForm });
    setEditor(product ? { id: product.id } : {});
  }
  function submit(event: FormEvent) {
    event.preventDefault(); if (save.isPending) return;
    const { stockQuantity, purchaseDate, ...rest } = form;
    const payload = { ...rest, supplierId: form.supplierId || null, costPrice: Number(form.costPrice), salePrice: Number(form.salePrice), minimumStock: Number(form.minimumStock), ...(!editor?.id ? { stockQuantity: Number(stockQuantity), ...(purchaseDate && form.supplierId && Number(stockQuantity) > 0 ? { purchaseDate, payment } : {}) } : {}) };
    save.mutate(editor?.id ? payload : withRequestId(payload));
  }
  function field(key: keyof typeof emptyForm, value: string | boolean) { setForm(current => ({ ...current, [key]: value })); }
  const items = (query.data ?? []).filter(p => (!productId || p.id === productId) && (status === 'all' || p.active === (status === 'active')) && (!lowOnly || p.stockQuantity <= p.minimumStock) && [p.name, p.sku, p.category, p.compatibility, p.quality, p.location, p.supplier?.name].some(value => value?.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())));
  return <div className="page-stack">
    <div className="section-toolbar"><div><h2>Produtos e estoque</h2><p>Controle suas peças, movimentações e compras por fornecedor.</p></div><button className="primary-btn" onClick={() => openEditor()}><Plus size={17}/> Novo produto</button></div>
    {productId && <button className="secondary-btn" onClick={() => setParams({})}>Ver todos os produtos</button>}
    <div className="inventory-tabs"><button className={tab === 'products' ? 'primary-btn' : 'secondary-btn'} onClick={() => setTab('products')}>Peças e movimentações</button><button className={tab === 'purchases' ? 'primary-btn' : 'secondary-btn'} onClick={() => setTab('purchases')}>Compras por fornecedor</button></div>
    {tab === 'purchases' ? <ProductPurchases initialSupplier={params.get('supplierId') || ''}/> : <div className="panel">
      <div className="list-toolbar supplier-toolbar"><div className="search-field"><Search size={17}/><input aria-label="Buscar peças" placeholder="Nome, SKU, compatibilidade, fornecedor ou localização" value={search} onChange={e => setSearch(e.target.value)}/></div><div className="supplier-filters"><select aria-label="Status" value={status} onChange={e => setStatus(e.target.value)}><option value="active">Ativos</option><option value="inactive">Inativos</option><option value="all">Todos</option></select><label className="inventory-checkbox"><input type="checkbox" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)}/> Estoque baixo</label><span>{items.length} produtos</span></div></div>
      {query.isLoading ? <p className="feedback">Carregando produtos...</p> : query.error ? <p role="alert" className="feedback error">{query.error.message}</p> : !items.length ? <div className="empty-state"><Package size={28}/><strong>Nenhuma peça encontrada</strong><span>Cadastre uma peça ou ajuste os filtros.</span></div> : <div className="table-scroll"><table><thead><tr><th>PEÇA</th><th>COMPATIBILIDADE / QUALIDADE</th><th>FORNECEDOR / ÚLTIMA COMPRA</th><th>ESTOQUE / MÍNIMO</th><th>LOCALIZAÇÃO</th><th>CUSTO / VENDA</th><th>AÇÕES</th></tr></thead><tbody>{items.map(p => <tr key={p.id}>
        <td><strong className="order-number">{p.name}</strong><small className="table-subtext">{[p.sku, p.category].filter(Boolean).join(' · ') || 'Sem SKU / categoria'}{!p.active ? ' · Inativo' : ''}</small></td><td>{p.compatibility || '—'}<small className="table-subtext">{p.quality || 'Qualidade não informada'}</small></td><td>{p.supplier?.name || '—'}<small className="table-subtext">{p.purchaseDate ? date(p.purchaseDate) : 'Sem compra registrada'}</small></td><td><span className={p.stockQuantity <= p.minimumStock ? 'stock-low' : 'stock-ok'}>{p.stockQuantity} un.</span><small className="table-subtext">Mínimo: {p.minimumStock}</small></td><td>{p.location || '—'}</td><td>{money(p.costPrice)}<small className="table-subtext">Venda: {money(p.salePrice)}</small></td><td><div className="supplier-actions"><button className="icon-btn" aria-label={`Editar ${p.name}`} title="Editar peça" onClick={() => openEditor(p)}><Pencil size={16}/></button><button className="secondary-btn" onClick={() => setStock(p)}><History size={15}/> Estoque</button></div></td>
      </tr>)}</tbody></table></div>}
    </div>}
    {stock && <ProductStock product={(query.data ?? []).find(p => p.id === stock.id) ?? stock} onClose={() => setStock(null)}/>}
    {editor && <InventoryDialog title={editor.id ? 'Editar peça' : 'Nova peça'} busy={save.isPending} onClose={() => setEditor(null)}><form onSubmit={submit}><fieldset className="supplier-fieldset" disabled={save.isPending}><div className="modal-fields">
      <label className="modal-wide">Nome da peça<input autoFocus required minLength={2} maxLength={120} value={form.name} onChange={e => field('name', e.target.value)}/></label>
      {([['sku', 'SKU', 80], ['category', 'Categoria', 80], ['compatibility', 'Compatibilidade', 200], ['quality', 'Qualidade (Original, OLED, Incell...)', 80], ['location', 'Localização (ex.: Gaveta A3)', 120]] as const).map(([key, label, max]) => <label key={key}>{label}<input maxLength={max} value={form[key]} onChange={e => field(key, e.target.value)}/></label>)}
      <label>Fornecedor<select value={form.supplierId} onChange={e => field('supplierId', e.target.value)}><option value="">Não informado</option>{suppliers.data?.map(s => <option key={s.id} value={s.id}>{s.name}{!s.active ? ' (inativo)' : ''}</option>)}</select></label>
      <label>Custo unitário (R$)<input required type="number" min="0" step="0.01" value={form.costPrice} onChange={e => field('costPrice', e.target.value)}/></label><label>Preço de venda (R$)<input required type="number" min="0" step="0.01" value={form.salePrice} onChange={e => field('salePrice', e.target.value)}/></label>
      {!editor.id && <><label>Estoque inicial<input required type="number" min="0" max="2147483647" step="1" value={form.stockQuantity} onChange={e => field('stockQuantity', e.target.value)}/></label><label>Data da compra inicial<input type="date" required={!!form.supplierId && Number(form.stockQuantity) > 0} disabled={!form.supplierId || Number(form.stockQuantity) === 0} value={form.purchaseDate} onChange={e => field('purchaseDate', e.target.value)}/></label><p className="modal-wide inventory-hint">Com fornecedor e data, a quantidade inicial registra uma compra. Sem fornecedor, registra apenas o saldo inicial.</p></>}
      {!editor.id && !!form.supplierId && Number(form.stockQuantity) > 0 && <PurchasePaymentFields value={payment} onChange={setPayment}/>}
      <label>Estoque mínimo<input required type="number" min="0" max="2147483647" step="1" value={form.minimumStock} onChange={e => field('minimumStock', e.target.value)}/></label><label>Status<select value={String(form.active)} onChange={e => field('active', e.target.value === 'true')}><option value="true">Ativo</option><option value="false">Inativo</option></select></label>
    </div></fieldset>{suppliers.error && <p className="feedback error">Não foi possível carregar os fornecedores.</p>}{save.error && <p className="feedback error" role="alert">{save.error.message}</p>}<div className="form-modal-actions"><button className="secondary-btn" type="button" disabled={save.isPending} onClick={() => setEditor(null)}>Cancelar</button><button className="primary-btn" disabled={save.isPending}>{save.isPending ? 'Salvando...' : 'Salvar peça'}</button></div></form></InventoryDialog>}
  </div>;
}
