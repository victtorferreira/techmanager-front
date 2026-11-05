import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2, Truck, X } from 'lucide-react';
import { api } from '../api';
import { Link } from 'react-router-dom';

type SupplierForm = {
  name: string; tradeName: string; document: string; contactName: string; phone: string;
  whatsapp: string; email: string; address: string; city: string; state: string;
  paymentTerms: string; notes: string; active: boolean;
};
type Supplier = Omit<SupplierForm, 'active'> & { id: string; active: boolean };
type SupplierList = { items: Supplier[]; total: number; page: number; pageSize: number };
const emptyForm: SupplierForm = {
  name: '', tradeName: '', document: '', contactName: '', phone: '', whatsapp: '', email: '',
  address: '', city: '', state: '', paymentTerms: '', notes: '', active: true,
};
const states = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

function formatDocument(value: string | null) {
  if (!value) return 'Sem CPF/CNPJ';
  if (value.length === 14) return value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  return value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

function SupplierDialog({ children, onClose, titleId }: { children: ReactNode; onClose: () => void; titleId: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return <dialog ref={ref} className="form-modal supplier-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
  }}>{children}</dialog>;
}

export default function Suppliers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{ id?: string } | null>(null);
  const [form, setForm] = useState<SupplierForm>(emptyForm);
  const [deleting, setDeleting] = useState<Supplier | null>(null);
  const [feedback, setFeedback] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const suppliers = useQuery({
    queryKey: ['suppliers', debouncedSearch, status, page],
    queryFn: () => api<SupplierList>(`/suppliers?${new URLSearchParams({ search: debouncedSearch, status, page: String(page) })}`),
  });
  const items = suppliers.data?.items ?? [];
  const total = suppliers.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 20));
  const save = useMutation({
    mutationFn: ({ id, values }: { id?: string; values: SupplierForm }) => api<Supplier>(id ? `/suppliers/${id}` : '/suppliers', {
      method: id ? 'PUT' : 'POST', body: JSON.stringify(values),
    }),
    onSuccess: (_supplier, variables) => {
      setEditor(null);
      setFeedback(variables.id ? 'Fornecedor atualizado.' : 'Fornecedor cadastrado.');
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api<{ deleted: boolean }>(`/suppliers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setDeleting(null);
      setFeedback('Fornecedor excluído.');
      if (items.length === 1 && page > 1) setPage(current => current - 1);
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  function openEditor(supplier?: Supplier) {
    save.reset();
    setFeedback('');
    setForm(supplier ? Object.fromEntries(Object.entries(emptyForm).map(([key, fallback]) => [key, supplier[key as keyof SupplierForm] ?? fallback])) as SupplierForm : { ...emptyForm });
    setEditor(supplier ? { id: supplier.id } : {});
  }
  function field<K extends keyof SupplierForm>(key: K, value: SupplierForm[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (save.isPending) return;
    save.mutate({ id: editor?.id, values: form });
  }

  return <div className="page-stack">
    <div className="section-toolbar"><div><h2>Fornecedores</h2><p>Organize seus parceiros, contatos e condições de pagamento.</p></div><button className="primary-btn" onClick={() => openEditor()}><Plus size={17}/> Novo fornecedor</button></div>
    {feedback && <p className="supplier-success" role="status">{feedback}</p>}
    <div className="panel">
      <div className="list-toolbar supplier-toolbar"><div className="search-field"><Search size={17}/><input aria-label="Buscar fornecedores" maxLength={160} placeholder="Buscar nome, CPF/CNPJ, contato ou cidade" value={search} onChange={event => setSearch(event.target.value)}/></div><div className="supplier-filters"><select aria-label="Filtrar fornecedores por status" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="all">Todos os status</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select><span>{total} {total === 1 ? 'fornecedor' : 'fornecedores'}</span></div></div>
      {suppliers.isLoading ? <p className="feedback" role="status">Carregando fornecedores...</p> : suppliers.error ? <div className="feedback error" role="alert">Não foi possível carregar os fornecedores. <button className="secondary-btn" onClick={() => void suppliers.refetch()}>Tentar novamente</button></div> : items.length === 0 ? <div className="empty-state"><Truck size={28}/><strong>{search || status !== 'all' ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado'}</strong><span>{search || status !== 'all' ? 'Ajuste a busca ou o filtro de status.' : 'Cadastre seu primeiro fornecedor para organizar seus contatos.'}</span></div> : <div className="table-scroll"><table><thead><tr><th>FORNECEDOR</th><th>CONTATO</th><th>LOCALIZAÇÃO</th><th>PAGAMENTO</th><th>STATUS</th><th>AÇÕES</th></tr></thead><tbody>{items.map(supplier => <tr key={supplier.id}>
        <td><strong className="order-number">{supplier.name}</strong>{supplier.tradeName && <small className="table-subtext">{supplier.tradeName}</small>}<small className="table-subtext">{formatDocument(supplier.document)}</small></td>
        <td>{supplier.contactName || '—'}{supplier.phone && <a className="supplier-contact" href={`tel:${supplier.phone.replace(/[^\d+]/g, '')}`}>{supplier.phone}</a>}{supplier.whatsapp && <span className="supplier-contact">WhatsApp: {supplier.whatsapp}</span>}{supplier.email && <a className="supplier-contact" href={`mailto:${supplier.email}`}>{supplier.email}</a>}</td>
        <td>{[supplier.city, supplier.state].filter(Boolean).join(' / ') || '—'}{supplier.address && <small className="table-subtext supplier-text">{supplier.address}</small>}</td>
        <td className="supplier-text">{supplier.paymentTerms || 'Não informado'}<Link className="supplier-contact" to={`/produtos?supplierId=${supplier.id}`}>Histórico de compras</Link></td>
        <td><span className={`status-pill ${supplier.active ? 'green' : 'supplier-inactive'}`}>{supplier.active ? 'Ativo' : 'Inativo'}</span></td>
        <td><div className="supplier-actions"><button className="icon-btn" title="Editar fornecedor" aria-label={`Editar ${supplier.name}`} onClick={() => openEditor(supplier)}><Pencil size={15}/></button><button className="icon-btn supplier-delete" title="Excluir fornecedor" aria-label={`Excluir ${supplier.name}`} onClick={() => { remove.reset(); setDeleting(supplier); setFeedback(''); }}><Trash2 size={15}/></button></div></td>
      </tr>)}</tbody></table></div>}
      {!suppliers.error && total > 0 && <div className="supplier-pagination"><span>Página {page} de {pages}</span><div><button className="secondary-btn" disabled={page === 1 || suppliers.isFetching} onClick={() => setPage(current => current - 1)}><ChevronLeft size={15}/> Anterior</button><button className="secondary-btn" disabled={page >= pages || suppliers.isFetching} onClick={() => setPage(current => current + 1)}>Próxima <ChevronRight size={15}/></button></div></div>}
    </div>
    {editor && <SupplierDialog titleId="supplier-form-title" onClose={() => { if (!save.isPending) setEditor(null); }}>
      <form onSubmit={submit}>
        <div className="form-modal-heading"><div><h2 id="supplier-form-title">{editor.id ? 'Editar fornecedor' : 'Novo fornecedor'}</h2><p>Somente o nome / razão social é obrigatório.</p></div><button type="button" className="icon-btn" aria-label="Fechar" disabled={save.isPending} onClick={() => setEditor(null)}><X size={18}/></button></div>
        <fieldset className="supplier-fieldset" disabled={save.isPending}><div className="modal-fields">
          <label className="modal-wide">Nome / razão social<input autoFocus required minLength={2} maxLength={160} value={form.name} onChange={event => field('name', event.target.value)}/></label>
          <label>Nome fantasia<input maxLength={160} value={form.tradeName} onChange={event => field('tradeName', event.target.value)}/></label>
          <label>CPF / CNPJ<input inputMode="numeric" maxLength={18} placeholder="Somente números ou com pontuação" value={form.document} onChange={event => field('document', event.target.value)}/></label>
          <label>Pessoa de contato<input maxLength={100} value={form.contactName} onChange={event => field('contactName', event.target.value)}/></label>
          <label>Status<select value={String(form.active)} onChange={event => field('active', event.target.value === 'true')}><option value="true">Ativo</option><option value="false">Inativo</option></select></label>
          <label>Telefone<input type="tel" maxLength={25} value={form.phone} onChange={event => field('phone', event.target.value)}/></label>
          <label>WhatsApp<input type="tel" maxLength={25} value={form.whatsapp} onChange={event => field('whatsapp', event.target.value)}/></label>
          <label className="modal-wide">E-mail<input type="email" maxLength={160} value={form.email} onChange={event => field('email', event.target.value)}/></label>
          <label className="modal-wide">Endereço completo<input maxLength={500} placeholder="Rua, número, bairro, complemento e CEP" value={form.address} onChange={event => field('address', event.target.value)}/></label>
          <label>Cidade<input maxLength={100} value={form.city} onChange={event => field('city', event.target.value)}/></label>
          <label>Estado<select value={form.state} onChange={event => field('state', event.target.value)}><option value="">Não informado</option>{states.map(state => <option key={state}>{state}</option>)}</select></label>
          <label className="modal-wide">Condições de pagamento<input maxLength={300} placeholder="Ex.: Pix à vista ou boleto em 30 dias" value={form.paymentTerms} onChange={event => field('paymentTerms', event.target.value)}/></label>
          <label className="modal-wide">Observações<textarea rows={3} maxLength={2000} value={form.notes} onChange={event => field('notes', event.target.value)}/></label>
        </div></fieldset>
        {save.error && <p className="feedback error" role="alert">{save.error.message}</p>}
        <div className="form-modal-actions"><button type="button" className="secondary-btn" disabled={save.isPending} onClick={() => setEditor(null)}>Cancelar</button><button className="primary-btn" disabled={save.isPending}>{save.isPending ? 'Salvando...' : 'Salvar fornecedor'}</button></div>
      </form>
    </SupplierDialog>}
    {deleting && <SupplierDialog titleId="supplier-delete-title" onClose={() => { if (!remove.isPending) setDeleting(null); }}>
      <div className="form-modal-heading"><div><h2 id="supplier-delete-title">Excluir fornecedor?</h2><p>O cadastro de <strong>{deleting.name}</strong> será excluído permanentemente. Você também pode editar o cadastro e marcá-lo como inativo.</p></div><button type="button" className="icon-btn" aria-label="Fechar" disabled={remove.isPending} onClick={() => setDeleting(null)}><X size={18}/></button></div>
      {remove.error && <p className="feedback error" role="alert">{remove.error.message}</p>}
      <div className="form-modal-actions"><button autoFocus type="button" className="secondary-btn" disabled={remove.isPending} onClick={() => setDeleting(null)}>Cancelar</button><button type="button" className="primary-btn supplier-danger" disabled={remove.isPending} onClick={() => remove.mutate(deleting.id)}>{remove.isPending ? 'Excluindo...' : 'Excluir fornecedor'}</button></div>
    </SupplierDialog>}
  </div>;
}
