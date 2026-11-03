import { FormEvent, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, Package, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { api } from '../api';

type Product = { id: string; name: string; sku?: string | null; stockQuantity: number; salePrice: string | number };
type Customer = { id: string; name: string; phone?: string | null };
type SaleLine = { productId: string; productName: string; sku?: string | null; quantity: number; unitPrice: string | number; total: string | number };
type Sale = { id: string; number: number; createdAt: string; paymentMethod: string; subtotal: string | number; total: string | number; customer?: { name: string } | null; seller?: { name: string } | null; items: SaleLine[] };
type CreatedSale = { number: number };

const paymentLabels: Record<string, string> = { CASH: 'Dinheiro', PIX: 'Pix', CREDIT_CARD: 'Cartão de crédito', DEBIT_CARD: 'Cartão de débito', BANK_TRANSFER: 'Transferência', OTHER: 'Outro' };
const money = (value: string | number) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Sales() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerId, setCustomerId] = useState(searchParams.get('customerId') ?? '');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [notes, setNotes] = useState('');
  const [cartError, setCartError] = useState('');
  const [success, setSuccess] = useState('');
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: () => api<Product[]>('/products') });
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: () => api<Customer[]>('/customers') });
  const salesQuery = useQuery({ queryKey: ['sales'], queryFn: () => api<Sale[]>('/sales') });
  const products = productsQuery.data ?? [];
  const selectedProduct = products.find(product => product.id === productId);
  const cartLines = Object.entries(cart).map(([id, count]) => ({ product: products.find(product => product.id === id), quantity: count })).filter((line): line is { product: Product; quantity: number } => Boolean(line.product));
  const total = useMemo(() => cartLines.reduce((sum, line) => sum + Number(line.product.salePrice) * line.quantity, 0), [cartLines]);
  const createSale = useMutation({
    mutationFn: (payload: object) => api<CreatedSale>('/sales', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: async sale => {
      setSuccess(`Venda #${String(sale.number).padStart(5, '0')} registrada.`);
      setCart({}); setNotes(''); setCustomerId('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sales'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
      ]);
    },
  });

  function addToCart(event: FormEvent) {
    event.preventDefault();
    setCartError(''); setSuccess('');
    if (!selectedProduct) return;
    const amount = Number(quantity);
    if (!Number.isInteger(amount) || amount < 1) { setCartError('Informe uma quantidade válida.'); return; }
    const next = (cart[selectedProduct.id] ?? 0) + amount;
    if (next > selectedProduct.stockQuantity) { setCartError(`Estoque disponível de ${selectedProduct.name}: ${selectedProduct.stockQuantity}.`); return; }
    setCart(current => ({ ...current, [selectedProduct.id]: next }));
    setProductId(''); setQuantity('1');
  }

  function setLineQuantity(id: string, value: string) {
    const amount = Number(value);
    const product = products.find(item => item.id === id);
    if (!product || !Number.isInteger(amount) || amount < 1 || amount > product.stockQuantity) return;
    setCart(current => ({ ...current, [id]: amount }));
  }

  function finalize() {
    setCartError(''); setSuccess('');
    if (cartLines.length === 0) { setCartError('Adicione produtos à venda.'); return; }
    createSale.mutate({
      items: cartLines.map(line => ({ productId: line.product.id, quantity: line.quantity })),
      paymentMethod,
      ...(customerId ? { customerId } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    });
  }

  return <div className="page-stack">
    <div className="section-toolbar"><div><h2>Vendas</h2><p>Registre vendas de balcão e acompanhe o estoque baixado.</p></div></div>
    <div className="sales-layout">
      <div className="panel sale-builder">
        <div><h3 className="sale-section-title">Nova venda</h3><p className="panel-heading-copy">Os preços vêm do cadastro e o estoque é atualizado ao confirmar.</p></div>
        <div>
          <form className="sale-add-row" onSubmit={addToCart}>
            <select aria-label="Produto" value={productId} onChange={event => setProductId(event.target.value)} required>
              <option value="">Selecione um produto</option>{products.map(product => <option key={product.id} value={product.id} disabled={product.stockQuantity < 1}>{product.name} · {money(product.salePrice)} · estoque {product.stockQuantity}</option>)}
            </select>
            <input aria-label="Quantidade" type="number" min="1" max={selectedProduct?.stockQuantity || 1} step="1" value={quantity} onChange={event => setQuantity(event.target.value)} />
            <button className="secondary-btn" type="submit"><Plus size={14}/> Adicionar</button>
          </form>
          {productsQuery.isLoading && <p className="feedback">Carregando estoque...</p>}
          {productsQuery.error && <p className="feedback error">Não foi possível carregar o estoque.</p>}
          {!productsQuery.isLoading && products.length === 0 && <p className="feedback">Cadastre produtos antes de realizar uma venda. <Link to="/produtos">Ir para produtos</Link></p>}
        </div>

        <div className="sale-cart">
          <h3 className="sale-section-title">Itens da venda</h3>
          {cartLines.length === 0 ? <div className="sale-empty"><ShoppingCart size={22}/><p>Adicione produtos para começar.</p></div> : cartLines.map(({ product, quantity: count }) => <div className="sale-cart-row" key={product.id}>
            <div className="sale-cart-product"><strong>{product.name}</strong><span>{money(product.salePrice)} cada · estoque {product.stockQuantity}</span></div>
            <input aria-label={`Quantidade de ${product.name}`} type="number" min="1" max={product.stockQuantity} value={count} onChange={event => setLineQuantity(product.id, event.target.value)} />
            <strong>{money(Number(product.salePrice) * count)}</strong>
            <button type="button" className="sale-remove" aria-label={`Remover ${product.name}`} onClick={() => setCart(current => { const next = { ...current }; delete next[product.id]; return next; })}><Trash2 size={15}/></button>
          </div>)}
        </div>

        <div className="sale-options">
          <label>Cliente <span className="field-optional">(opcional)</span><select value={customerId} onChange={event => setCustomerId(event.target.value)}><option value="">Consumidor final</option>{(customersQuery.data ?? []).map(customer => <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ''}</option>)}</select></label>
          <label>Forma de pagamento<select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)}><option value="PIX">Pix</option><option value="CASH">Dinheiro</option><option value="CREDIT_CARD">Cartão de crédito</option><option value="DEBIT_CARD">Cartão de débito</option><option value="BANK_TRANSFER">Transferência</option><option value="OTHER">Outro</option></select></label>
          <label className="sale-option-wide">Observação <span className="field-optional">(opcional)</span><textarea rows={2} maxLength={500} value={notes} onChange={event => setNotes(event.target.value)} /></label>
        </div>
        <div className="sale-total"><span>Total da venda</span><strong>{money(total)}</strong></div>
        {(cartError || createSale.error) && <p className="feedback error sale-error">{cartError || createSale.error?.message}</p>}
        {success && <div className="sale-message">{success}</div>}
        <button type="button" className="primary-btn sale-confirm" onClick={finalize} disabled={createSale.isPending || cartLines.length === 0}><Banknote size={17}/>{createSale.isPending ? 'Registrando...' : 'Finalizar venda'}</button>
      </div>

      <section className="panel">
        <div className="panel-heading"><div><h3>Vendas recentes</h3><p>Histórico das últimas vendas registradas</p></div><span className="payment-pill">{salesQuery.data?.length ?? 0} vendas</span></div>
        {salesQuery.isLoading ? <p className="feedback">Carregando vendas...</p> : salesQuery.error ? <p className="feedback error">Não foi possível carregar as vendas.</p> : !salesQuery.data?.length ? <div className="empty-state"><Package size={28}/><strong>Nenhuma venda registrada</strong><span>As vendas finalizadas aparecerão aqui.</span></div> : <div className="sales-list">{salesQuery.data.map(sale => <article className="sale-list-row" key={sale.id}>
          <div className="sale-list-main"><strong>Venda #{String(sale.number).padStart(5, '0')} · {sale.customer?.name || 'Consumidor final'}</strong><span>{new Date(sale.createdAt).toLocaleString('pt-BR')} · {sale.seller?.name || 'Equipe'}</span></div>
          <strong className="sale-list-total">{money(sale.total)}</strong>
          <span className="payment-pill">{paymentLabels[sale.paymentMethod] || sale.paymentMethod}</span>
          <div className="sale-list-items">{sale.items.map(item => `${item.quantity}× ${item.productName}`).join(' · ')}</div>
        </article>)}</div>}
      </section>
    </div>
  </div>;
}
