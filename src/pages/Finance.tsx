import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, CircleDollarSign, Plus, X } from 'lucide-react';
import { api } from '../api';
import { Link } from 'react-router-dom';
import { InventoryDialog, today } from './inventory-shared';
import { refreshBusiness } from './payment-shared';

type Entry = { id: string; type: 'INCOME' | 'EXPENSE'; status: 'PENDING' | 'PAID' | 'CANCELED'; category: string; description: string; amount: string | number; paymentMethod?: string | null; occurredAt: string; source: 'SALE' | 'MANUAL' | 'PURCHASE' | 'SERVICE_ORDER' | 'REVERSAL'; createdBy?: string | null; serviceOrderId?: string; supplierId?: string; dueAt?: string; reversed?: boolean; reversalOfId?: string };
type Summary = { totals: { income: string | number; expenses: string | number; balance: string | number; pendingIncome: string | number; pendingExpenses: string | number }; entries: Entry[] };
type EntryForm = { type: 'INCOME' | 'EXPENSE'; status: 'PAID' | 'PENDING'; category: string; description: string; amount: string; paymentMethod: string; occurredAt: string };

const money = (value: string | number) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const paymentLabels: Record<string, string> = { CASH: 'Dinheiro', PIX: 'Pix', CREDIT_CARD: 'Cartão de crédito', DEBIT_CARD: 'Cartão de débito', BANK_TRANSFER: 'Transferência', OTHER: 'Outro' };
const statusLabels = { PAID: 'Pago', PENDING: 'Pendente', CANCELED: 'Cancelado' };

export default function Finance() {
  const queryClient = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [filter, setFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState('');
  const [settlement, setSettlement] = useState<{ entry: Entry; status: 'PAID' | 'CANCELED'; paymentMethod: string; paidAt: string } | null>(null);
  const [form, setForm] = useState<EntryForm>({ type: 'EXPENSE', status: 'PAID', category: 'Despesa operacional', description: '', amount: '', paymentMethod: 'PIX', occurredAt: dayKey(now) });
  const from = new Date(month.getFullYear(), month.getMonth(), 1).toISOString();
  const to = new Date(month.getFullYear(), month.getMonth() + 1, 1).toISOString();
  const query = useQuery({ queryKey: ['finance-summary', from, to], queryFn: () => api<Summary>(`/finance/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`) });
  const createEntry = useMutation({
    mutationFn: (payload: object) => api<Entry>('/finance/entries', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: async () => { setModalOpen(false); setSuccess('Lançamento financeiro registrado.'); await refreshBusiness(queryClient); },
    onError: error => setErrorMessage(error.message),
  });
  const updateEntry = useMutation({
    mutationFn: ({ id, status, paymentMethod, paidAt }: { id: string; status: 'PAID' | 'CANCELED'; paymentMethod?: string; paidAt?: string }) => api<Entry>(`/finance/entries/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, paymentMethod, paidAt }) }),
    onSuccess: async () => { setSettlement(null); setSuccess('Movimentação atualizada.'); await refreshBusiness(queryClient); },
    onError: error => setErrorMessage(error.message),
  });
  const summary = query.data;
  const entries = (summary?.entries ?? []).filter(entry => filter === 'ALL' || entry.type === filter);

  function openEntry() {
    setErrorMessage(''); setSuccess('');
    setForm({ type: 'EXPENSE', status: 'PAID', category: 'Despesa operacional', description: '', amount: '', paymentMethod: 'PIX', occurredAt: dayKey(new Date()) });
    setModalOpen(true);
  }

  function submit(event: FormEvent) {
    event.preventDefault(); setErrorMessage(''); setSuccess('');
    createEntry.mutate({
      type: form.type, status: form.status, category: form.category.trim(), description: form.description.trim(),
      amount: Number(form.amount), paymentMethod: form.paymentMethod,
      occurredAt: new Date(`${form.occurredAt}T12:00:00`).toISOString(),
    });
  }

  function changeMonth(amount: number) {
    setMonth(current => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  function setType(type: EntryForm['type']) {
    setForm(current => ({ ...current, type, category: type === 'INCOME' ? 'Receita avulsa' : 'Despesa operacional' }));
  }

  return <div className="page-stack">
    <div className="section-toolbar"><div><h2>Financeiro</h2><p>Entradas, despesas e vendas recebidas pela assistência.</p></div><button className="primary-btn" onClick={openEntry}><Plus size={17}/> Novo lançamento</button></div>
    <div className="finance-period panel"><button className="calendar-arrow" aria-label="Período anterior" onClick={() => changeMonth(-1)}><ArrowLeft size={17}/></button><strong>{month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</strong><button className="calendar-arrow" aria-label="Próximo período" onClick={() => changeMonth(1)}><ArrowRight size={17}/></button><button className="secondary-btn finance-current" onClick={() => setMonth(new Date(now.getFullYear(), now.getMonth(), 1))}>Este mês</button></div>
    {query.error && <p className="feedback error">Não foi possível carregar os dados financeiros.</p>}
    <section className="finance-cards">
      <article className="finance-card income-card"><div><span>Entradas recebidas</span><ArrowDownLeft size={18}/></div><strong>{query.isLoading ? '—' : money(summary?.totals.income ?? 0)}</strong><small>Vendas, serviços e outras entradas</small></article>
      <article className="finance-card expense-card"><div><span>Despesas pagas</span><ArrowUpRight size={18}/></div><strong>{query.isLoading ? '—' : money(summary?.totals.expenses ?? 0)}</strong><small>{money(summary?.totals.pendingExpenses ?? 0)} pendentes</small></article>
      <article className="finance-card balance-card"><div><span>Saldo do período</span><CircleDollarSign size={18}/></div><strong>{query.isLoading ? '—' : money(summary?.totals.balance ?? 0)}</strong><small>{money(summary?.totals.pendingIncome ?? 0)} a receber</small></article>
    </section>
    {success && <div className="sale-message">{success}</div>}
    {errorMessage && !modalOpen && <div className="login-error">{errorMessage}</div>}
    <section className="panel finance-history">
      <div className="panel-heading"><div><h3>Movimentações</h3><p>Vendas, compras e recebimentos de OS são vinculados automaticamente. Pendências seguem a data prevista; pagamentos e estornos seguem a data realizada.</p></div>
        <select aria-label="Filtrar movimentações" value={filter} onChange={event => setFilter(event.target.value)}><option value="ALL">Todas</option><option value="INCOME">Entradas</option><option value="EXPENSE">Despesas</option></select>
      </div>
      {query.isLoading ? <p className="feedback">Carregando movimentações...</p> : entries.length === 0 ? <div className="empty-state"><CircleDollarSign size={28}/><strong>Nenhuma movimentação neste período</strong><span>Vendas e lançamentos financeiros aparecerão aqui.</span></div> :
        <div className="table-scroll"><table><thead><tr><th>DATA</th><th>DESCRIÇÃO</th><th>CATEGORIA</th><th>FORMA</th><th>STATUS</th><th className="finance-amount">VALOR</th><th></th></tr></thead><tbody>{entries.map(entry => <tr key={entry.id}>
          <td>{new Date(entry.occurredAt).toLocaleDateString('pt-BR')}</td>
          <td className="finance-description">{entry.description}<small className="table-subtext">{({ SALE: 'Venda do sistema', PURCHASE: 'Compra vinculada', SERVICE_ORDER: 'Ordem de serviço', REVERSAL: 'Estorno', MANUAL: 'Lançamento manual' })[entry.source]}{entry.reversed ? ' · Estornado' : ''}</small>{entry.serviceOrderId && <Link to={`/ordens?orderId=${entry.serviceOrderId}`}>Ver OS</Link>}{entry.supplierId && <Link to={`/produtos?supplierId=${entry.supplierId}`}>Ver compras do fornecedor</Link>}</td>
          <td>{entry.category}</td><td>{entry.paymentMethod ? paymentLabels[entry.paymentMethod] || entry.paymentMethod : '—'}</td>
          <td><span className={`finance-status finance-status-${entry.status.toLowerCase()}`}>{statusLabels[entry.status]}</span></td>
          <td className={`finance-amount ${entry.type === 'INCOME' ? 'amount-income' : 'amount-expense'}`}>{entry.type === 'INCOME' ? '+' : '−'} {money(entry.amount)}</td>
          <td>{entry.source !== 'SALE' && !entry.reversed && !entry.reversalOfId && entry.status !== 'CANCELED' && <div className="supplier-actions">{entry.status === 'PENDING' && <button className="finance-action" disabled={updateEntry.isPending} onClick={() => { setErrorMessage(''); setSettlement({ entry, status: 'PAID', paymentMethod: entry.paymentMethod || 'PIX', paidAt: today() }); }}>{entry.type === 'INCOME' ? 'Receber saldo' : 'Pagar'}</button>}{!(entry.source === 'SERVICE_ORDER' && entry.status === 'PENDING') && <button className="finance-action" disabled={updateEntry.isPending} onClick={() => { setErrorMessage(''); setSettlement({ entry, status: 'CANCELED', paymentMethod: entry.paymentMethod || 'PIX', paidAt: today() }); }}>{entry.source === 'PURCHASE' ? 'Cancelar compra' : entry.status === 'PAID' ? 'Estornar' : 'Cancelar'}</button>}</div>}</td>
        </tr>)}</tbody></table></div>}
    </section>

    {settlement && <InventoryDialog title={settlement.status === 'PAID' ? 'Confirmar pagamento / recebimento' : 'Confirmar cancelamento / estorno'} busy={updateEntry.isPending} onClose={() => setSettlement(null)}><form onSubmit={e => { e.preventDefault(); updateEntry.mutate({ id: settlement.entry.id, status: settlement.status, paymentMethod: settlement.paymentMethod, paidAt: settlement.paidAt }); }}>
      <p>{settlement.entry.description} · {money(settlement.entry.amount)}</p>
      {settlement.status === 'CANCELED' && <p>{settlement.entry.source === 'PURCHASE' ? 'A compra será cancelada e as unidades serão retiradas do estoque. ' : ''}{settlement.entry.status === 'PAID' ? 'Confirme somente após devolver ou recuperar o dinheiro. O estorno terá um lançamento próprio, preservando o histórico.' : 'A pendência será cancelada.'}</p>}
      <fieldset className="supplier-fieldset" disabled={updateEntry.isPending}><div className="modal-fields"><label>Data realizada<input required type="date" value={settlement.paidAt} onChange={e => setSettlement({ ...settlement, paidAt: e.target.value })}/></label><label>Forma de pagamento<select value={settlement.paymentMethod} onChange={e => setSettlement({ ...settlement, paymentMethod: e.target.value })}>{Object.entries(paymentLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>{errorMessage && <p role="alert" className="feedback error">{errorMessage}</p>}<div className="form-modal-actions"><button className="primary-btn">Confirmar</button></div></fieldset>
    </form></InventoryDialog>}
    {modalOpen && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setModalOpen(false); }}>
      <form className="form-modal" onSubmit={submit}>
        <div className="form-modal-heading"><div><h2>Novo lançamento</h2><p>Registre uma entrada ou uma despesa.</p></div><button type="button" className="icon-btn" aria-label="Fechar" onClick={() => setModalOpen(false)}><X size={18}/></button></div>
        <div className="modal-fields">
          <label>Tipo<select value={form.type} onChange={event => setType(event.target.value as EntryForm['type'])}><option value="EXPENSE">Despesa</option><option value="INCOME">Entrada</option></select></label>
          <label>Status<select value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value as EntryForm['status'] }))}><option value="PAID">Já pago/recebido</option><option value="PENDING">Pendente</option></select></label>
          <label>Categoria<input required minLength={2} maxLength={60} value={form.category} onChange={event => setForm(current => ({ ...current, category: event.target.value }))} /></label>
          <label>Valor (R$)<input required type="number" min="0.01" step="0.01" max="999999999" value={form.amount} onChange={event => setForm(current => ({ ...current, amount: event.target.value }))} /></label>
          <label className="modal-wide">Descrição<input required minLength={2} maxLength={240} value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} /></label>
          <label>Data prevista/realizada<input required type="date" value={form.occurredAt} onChange={event => setForm(current => ({ ...current, occurredAt: event.target.value }))} /></label>
          <label>Forma de pagamento<select value={form.paymentMethod} onChange={event => setForm(current => ({ ...current, paymentMethod: event.target.value }))}><option value="PIX">Pix</option><option value="CASH">Dinheiro</option><option value="CREDIT_CARD">Cartão de crédito</option><option value="DEBIT_CARD">Cartão de débito</option><option value="BANK_TRANSFER">Transferência</option><option value="OTHER">Outro</option></select></label>
        </div>
        {errorMessage && <p className="feedback error">{errorMessage}</p>}
        <div className="form-modal-actions"><button type="button" className="secondary-btn" onClick={() => setModalOpen(false)}>Cancelar</button><button className="primary-btn" disabled={createEntry.isPending}>{createEntry.isPending ? 'Salvando...' : 'Salvar lançamento'}</button></div>
      </form>
    </div>}
  </div>;
}
