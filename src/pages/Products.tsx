import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, Plus, Search, X } from 'lucide-react';
import { api } from '../api';

type Product = { id: string; name: string; sku?: string | null; category?: string | null; stockQuantity: number; minimumStock: number; salePrice: string | number; costPrice: string | number };
type ProductForm = { name: string; sku: string; category: string; costPrice: string; salePrice: string; stockQuantity: string; minimumStock: string };
const emptyForm: ProductForm = { name: '', sku: '', category: '', costPrice: '0', salePrice: '', stockQuantity: '0', minimumStock: '0' };

export default function Products() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const { data = [], isLoading, error } = useQuery({ queryKey: ['products'], queryFn: () => api<Product[]>('/products') });
  const createProduct = useMutation({
    mutationFn: (payload: object) => api<Product>('/products', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['products'] }); setOpen(false); setForm(emptyForm); },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    createProduct.mutate({
      name: form.name.trim(),
      ...(form.sku.trim() ? { sku: form.sku.trim() } : {}),
      ...(form.category.trim() ? { category: form.category.trim() } : {}),
      costPrice: Number(form.costPrice), salePrice: Number(form.salePrice),
      stockQuantity: Number(form.stockQuantity), minimumStock: Number(form.minimumStock),
    });
  }

  function field<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }

  return <div className="page-stack">
    <div className="section-toolbar"><div><h2>Produtos e estoque</h2><p>Cadastre produtos e acompanhe o saldo disponível para venda.</p></div><button className="primary-btn" onClick={() => setOpen(true)}><Plus size={17}/> Novo produto</button></div>
    <div className="panel"><div className="list-toolbar"><div className="search-field"><Search size={17}/><input placeholder="Buscar produto ou SKU"/></div><span>{data.length} produtos</span></div>
      {isLoading ? <p className="feedback">Carregando produtos...</p> : error ? <p className="feedback error">Não foi possível carregar os produtos. Verifique a API e a autenticação.</p> : data.length === 0 ? <div className="empty-state"><Package size={28}/><strong>Seu estoque está vazio</strong><span>Cadastre produtos para começar a vender.</span></div> :
        <div className="table-scroll"><table><thead><tr><th>PRODUTO</th><th>SKU</th><th>CATEGORIA</th><th>ESTOQUE</th><th>CUSTO</th><th>PREÇO DE VENDA</th></tr></thead><tbody>{data.map(product => <tr key={product.id}>
          <td className="order-number">{product.name}</td><td>{product.sku || '—'}</td><td>{product.category || '—'}</td>
          <td><span className={product.stockQuantity <= product.minimumStock ? 'stock-low' : 'stock-ok'}>{product.stockQuantity} un.</span></td>
          <td>{Number(product.costPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
          <td>{Number(product.salePrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
        </tr>)}</tbody></table></div>}
    </div>
    {open && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <form className="form-modal" onSubmit={submit}>
        <div className="form-modal-heading"><div><h2>Novo produto</h2><p>O estoque inicial ficará disponível para vendas.</p></div><button type="button" className="icon-btn" aria-label="Fechar" onClick={() => setOpen(false)}><X size={18}/></button></div>
        <div className="modal-fields">
          <label className="modal-wide">Nome do produto<input required minLength={2} maxLength={120} autoFocus value={form.name} onChange={e => field('name', e.target.value)} /></label>
          <label>SKU <span className="field-optional">(opcional)</span><input maxLength={80} value={form.sku} onChange={e => field('sku', e.target.value)} /></label>
          <label>Categoria <span className="field-optional">(opcional)</span><input maxLength={80} placeholder="Ex.: Acessórios" value={form.category} onChange={e => field('category', e.target.value)} /></label>
          <label>Preço de custo<input required type="number" min="0" step="0.01" value={form.costPrice} onChange={e => field('costPrice', e.target.value)} /></label>
          <label>Preço de venda<input required type="number" min="0.01" step="0.01" value={form.salePrice} onChange={e => field('salePrice', e.target.value)} /></label>
          <label>Estoque inicial<input required type="number" min="0" step="1" value={form.stockQuantity} onChange={e => field('stockQuantity', e.target.value)} /></label>
          <label>Estoque mínimo<input required type="number" min="0" step="1" value={form.minimumStock} onChange={e => field('minimumStock', e.target.value)} /></label>
        </div>
        {createProduct.error && <p className="feedback error">{createProduct.error.message}</p>}
        <div className="form-modal-actions"><button type="button" className="secondary-btn" onClick={() => setOpen(false)}>Cancelar</button><button className="primary-btn" disabled={createProduct.isPending}>{createProduct.isPending ? 'Salvando...' : 'Salvar produto'}</button></div>
      </form>
    </div>}
  </div>;
}
