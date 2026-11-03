import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Camera, Check, Copy, Eye, FileDown, FileText, HandCoins, IdCard, LoaderCircle, Mail, MapPin, MessageCircle, Pencil, Phone, Plus, Receipt, Search, ShoppingBag, ShoppingCart, SlidersHorizontal, Ticket, UserRound, Users, WalletCards, Wrench, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

type Customer = { id: string; name: string; customerType: 'INDIVIDUAL' | 'COMPANY'; photoData?: string | null; phone?: string | null; whatsapp?: string | null; whatsappSameAsPhone: boolean; email?: string | null; document?: string | null; dateOfBirth?: string | null; zipCode?: string | null; street?: string | null; addressNumber?: string | null; complement?: string | null; neighborhood?: string | null; city?: string | null; state?: string | null; addressReference?: string | null; deliveryRoute?: string | null; isTaxPayer?: boolean | null; stateRegistration?: string | null; cityIbgeCode?: string | null; municipalRegistration?: string | null; invoiceEmail?: string | null; classification: 'NORMAL' | 'VIP' | 'PREMIUM'; active: boolean; creditLimit: string | number; priceTable: 'RETAIL' | 'WHOLESALE'; discountPercent: string | number; notes?: string | null; createdAt: string };
type Sale = { id: string; number: number; customerId?: string | null; total: string | number; createdAt: string; paymentMethod: string; items: Array<{ productName: string; quantity: number; unitPrice: string | number; total: string | number }>; customer?: { id: string; name: string } | null };
type Order = { id: string; number: number; customerId: string; status: string; createdAt: string; reportedIssue: string; estimatedDelivery?: string | null; device: { brand: string; model: string } };
type CustomerForm = {
  name: string; customerType: 'INDIVIDUAL' | 'COMPANY'; photoData: string; document: string; dateOfBirth: string;
  phone: string; whatsapp: string; whatsappSameAsPhone: boolean; email: string;
  zipCode: string; street: string; addressNumber: string; complement: string; neighborhood: string; city: string; state: string; addressReference: string; deliveryRoute: string;
  isTaxPayer: '' | 'YES' | 'NO'; stateRegistration: string; cityIbgeCode: string; municipalRegistration: string; invoiceEmail: string;
  classification: 'NORMAL' | 'VIP' | 'PREMIUM'; active: boolean; creditLimit: string; priceTable: 'RETAIL' | 'WHOLESALE'; discountPercent: string; notes: string;
};

const emptyForm: CustomerForm = { name: '', customerType: 'INDIVIDUAL', photoData: '', document: '', dateOfBirth: '', phone: '', whatsapp: '', whatsappSameAsPhone: true, email: '', zipCode: '', street: '', addressNumber: '', complement: '', neighborhood: '', city: '', state: '', addressReference: '', deliveryRoute: 'BY_NEIGHBORHOOD', isTaxPayer: '', stateRegistration: '', cityIbgeCode: '', municipalRegistration: '', invoiceEmail: '', classification: 'NORMAL', active: true, creditLimit: '0', priceTable: 'RETAIL', discountPercent: '0', notes: '' };
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString('pt-BR') : 'Ainda não comprou';
const digits = (value?: string | null) => (value ?? '').replace(/\D/g, '');
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
const latestSaleDate = (customerSales: Sale[]) => customerSales.reduce<string | undefined>((latest, sale) => !latest || sale.createdAt > latest ? sale.createdAt : latest, undefined);
const avatarTones = ['purple', 'pink', 'blue', 'orange', 'green'];

export default function Customers() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [modal, setModal] = useState<'form' | 'profile' | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [zipFeedback, setZipFeedback] = useState('');
  const [photoFeedback, setPhotoFeedback] = useState('');
  const [search, setSearch] = useState('');
  const [purchaseFilter, setPurchaseFilter] = useState('ALL');
  const [documentFilter, setDocumentFilter] = useState('ALL');
  const [sort, setSort] = useState('NAME_ASC');
  const [copied, setCopied] = useState('');

  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: () => api<Customer[]>('/customers') });
  const salesQuery = useQuery({ queryKey: ['sales'], queryFn: () => api<Sale[]>('/sales') });
  const ordersQuery = useQuery({ queryKey: ['orders'], queryFn: () => api<Order[]>('/service-orders') });
  const customers = customersQuery.data ?? [];
  const sales = salesQuery.data ?? [];
  const orders = ordersQuery.data ?? [];

  const salesByCustomer = useMemo(() => {
    const map = new Map<string, Sale[]>();
    for (const sale of sales) if (sale.customerId) map.set(sale.customerId, [...(map.get(sale.customerId) ?? []), sale]);
    return map;
  }, [sales]);
  const ordersByCustomer = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const order of orders) map.set(order.customerId, [...(map.get(order.customerId) ?? []), order]);
    return map;
  }, [orders]);
  const visibleCustomers = useMemo(() => customers.filter(customer => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    const matchesQuery = !query || [customer.name, customer.phone, customer.email, customer.document].some(value => value?.toLocaleLowerCase('pt-BR').includes(query));
    const customerSales = salesByCustomer.get(customer.id) ?? [];
    const matchesPurchase = purchaseFilter === 'ALL' || (purchaseFilter === 'WITH_PURCHASE' ? customerSales.length > 0 : customerSales.length === 0);
    const matchesDoc = documentFilter === 'ALL' || (documentFilter === 'PF' ? customer.customerType === 'INDIVIDUAL' : customer.customerType === 'COMPANY');
    return matchesQuery && matchesPurchase && matchesDoc;
  }).sort((a, b) => {
    if (sort === 'NAME_DESC') return b.name.localeCompare(a.name, 'pt-BR');
    if (sort === 'SPEND_DESC') return (salesByCustomer.get(b.id) ?? []).reduce((sum, sale) => sum + Number(sale.total), 0) - (salesByCustomer.get(a.id) ?? []).reduce((sum, sale) => sum + Number(sale.total), 0);
    if (sort === 'NEWEST') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return a.name.localeCompare(b.name, 'pt-BR');
  }), [customers, search, purchaseFilter, documentFilter, sort, salesByCustomer]);

  const totalSales = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const customersWithPurchases = new Set(sales.map(sale => sale.customerId).filter((id): id is string => Boolean(id))).size;
  const openOrders = orders.filter(order => !['DELIVERED', 'CANCELED', 'NO_REPAIR'].includes(order.status)).length;

  const saveCustomer = useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: CustomerForm }) => api<Customer>(id ? `/customers/${id}` : '/customers', { method: id ? 'PATCH' : 'POST', body: JSON.stringify({
      name: payload.name.trim(), customerType: payload.customerType, photoData: payload.photoData || null,
      phone: payload.phone.trim() || null, whatsapp: payload.whatsappSameAsPhone ? (payload.phone.trim() || null) : (payload.whatsapp.trim() || null), whatsappSameAsPhone: payload.whatsappSameAsPhone,
      email: payload.email.trim() || null, document: payload.document.trim() || null, dateOfBirth: payload.dateOfBirth || null,
      zipCode: payload.zipCode.trim() || null, street: payload.street.trim() || null, addressNumber: payload.addressNumber.trim() || null,
      complement: payload.complement.trim() || null, neighborhood: payload.neighborhood.trim() || null, city: payload.city.trim() || null, state: payload.state || null,
      addressReference: payload.addressReference.trim() || null, deliveryRoute: payload.deliveryRoute || null,
      isTaxPayer: payload.isTaxPayer === '' ? null : payload.isTaxPayer === 'YES', stateRegistration: payload.stateRegistration.trim() || null,
      cityIbgeCode: payload.cityIbgeCode.trim() || null, municipalRegistration: payload.municipalRegistration.trim() || null, invoiceEmail: payload.invoiceEmail.trim() || null,
      classification: payload.classification, active: payload.active, creditLimit: Number(payload.creditLimit || 0), priceTable: payload.priceTable,
      discountPercent: Number(payload.discountPercent || 0), notes: payload.notes.trim() || null,
    }) }),
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['customers'] }), queryClient.invalidateQueries({ queryKey: ['appointments'] }), queryClient.invalidateQueries({ queryKey: ['orders'] })]);
      setModal(null); setEditing(null); setForm(emptyForm);
    },
  });

  function openNewCustomer() { setEditing(null); setForm(emptyForm); setZipFeedback(''); setPhotoFeedback(''); saveCustomer.reset(); setModal('form'); }
  function openEditCustomer(customer: Customer) {
    setEditing(customer); setZipFeedback(''); setPhotoFeedback(''); saveCustomer.reset();
    setForm({ ...emptyForm, name: customer.name, customerType: customer.customerType ?? 'INDIVIDUAL', photoData: customer.photoData ?? '', phone: customer.phone ?? '', whatsapp: customer.whatsapp ?? customer.phone ?? '', whatsappSameAsPhone: customer.whatsappSameAsPhone ?? true,
      email: customer.email ?? '', document: customer.document ?? '', dateOfBirth: customer.dateOfBirth ? new Date(customer.dateOfBirth).toISOString().slice(0, 10) : '',
      zipCode: customer.zipCode ?? '', street: customer.street ?? '', addressNumber: customer.addressNumber ?? '', complement: customer.complement ?? '', neighborhood: customer.neighborhood ?? '', city: customer.city ?? '', state: customer.state ?? '', addressReference: customer.addressReference ?? '', deliveryRoute: customer.deliveryRoute ?? 'BY_NEIGHBORHOOD',
      isTaxPayer: customer.isTaxPayer === null || customer.isTaxPayer === undefined ? '' : customer.isTaxPayer ? 'YES' : 'NO', stateRegistration: customer.stateRegistration ?? '', cityIbgeCode: customer.cityIbgeCode ?? '', municipalRegistration: customer.municipalRegistration ?? '', invoiceEmail: customer.invoiceEmail ?? '',
      classification: customer.classification ?? 'NORMAL', active: customer.active ?? true, creditLimit: String(customer.creditLimit ?? 0), priceTable: customer.priceTable ?? 'RETAIL', discountPercent: String(customer.discountPercent ?? 0), notes: customer.notes ?? '' }); setModal('form');
  }
  function submit(event: FormEvent) { event.preventDefault(); saveCustomer.mutate({ id: editing?.id, payload: form }); }

  function updateForm<K extends keyof CustomerForm>(key: K, value: CustomerForm[K]) {
    setForm(current => ({ ...current, [key]: value, ...(key === 'phone' && current.whatsappSameAsPhone ? { whatsapp: String(value) } : {}) }));
  }

  async function lookupZip() {
    const zip = digits(form.zipCode);
    if (zip.length !== 8) { setZipFeedback('Informe um CEP com 8 números.'); return; }
    setZipFeedback('Consultando CEP...');
    try {
      const response = await fetch(`https://viacep.com.br/ws/${zip}/json/`);
      if (!response.ok) throw new Error('Não foi possível consultar o CEP agora.');
      const address = await response.json();
      if (address.erro) { setZipFeedback('CEP não encontrado. Você pode preencher o endereço manualmente.'); return; }
      setForm(current => ({ ...current, zipCode: address.cep || current.zipCode, street: address.logradouro || current.street, complement: address.complemento || current.complement, neighborhood: address.bairro || current.neighborhood, city: address.localidade || current.city, state: address.uf || current.state, cityIbgeCode: address.ibge || current.cityIbgeCode }));
      setZipFeedback('Endereço preenchido pelo CEP.');
    } catch (error) { setZipFeedback(error instanceof Error ? error.message : 'Falha ao consultar o CEP.'); }
  }

  async function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setPhotoFeedback('Selecione um arquivo de imagem.'); return; }
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Não foi possível ler a foto.'));
        reader.onload = () => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('Arquivo de imagem inválido.')); img.src = String(reader.result); };
        reader.readAsDataURL(file);
      });
      const scale = Math.min(1, 420 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d'); if (!context) throw new Error('Não foi possível preparar a foto.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const photo = canvas.toDataURL('image/jpeg', 0.76);
      if (photo.length > 450000) throw new Error('A foto ficou muito grande. Escolha outra imagem.');
      updateForm('photoData', photo); setPhotoFeedback('Foto pronta para salvar.');
    } catch (error) { setPhotoFeedback(error instanceof Error ? error.message : 'Não foi possível carregar a foto.'); }
  }

  async function copyPhone(customer: Customer) {
    if (!customer.phone) return;
    try { await navigator.clipboard.writeText(customer.phone); setCopied(customer.id); window.setTimeout(() => setCopied(''), 1600); } catch { setCopied(''); }
  }

  function exportCsv() {
    const rows = [['Nome', 'Telefone', 'E-mail', 'CPF/CNPJ', 'Compras', 'Total comprado', 'Última compra', 'Ordens de serviço']];
    for (const customer of visibleCustomers) {
      const customerSales = salesByCustomer.get(customer.id) ?? [];
      const total = customerSales.reduce((sum, sale) => sum + Number(sale.total), 0);
      const latest = latestSaleDate(customerSales);
      rows.push([customer.name, customer.phone ?? '', customer.email ?? '', customer.document ?? '', String(customerSales.length), total.toFixed(2), latest ? new Date(latest).toLocaleDateString('pt-BR') : '', String((ordersByCustomer.get(customer.id) ?? []).length)]);
    }
    const csv = rows.map(row => row.map(value => `"${value.replace(/[\r\n]+/g, ' ').replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'clientes-techmanager.csv'; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div className="page-stack customer-page">
    <div className="customer-page-heading"><div><div className="customer-breadcrumb"><Users size={13}/> Cadastros <span>/</span> Clientes</div><h2>Clientes</h2><p>Cadastro, histórico de atendimentos e compras registradas.</p></div><button className="primary-btn" onClick={openNewCustomer}><Plus size={17}/> Novo cliente</button></div>

    <section className="customer-stats">
      <article className="customer-stat stat-customers"><div><span>Clientes cadastrados</span><i><Users size={17}/></i></div><strong>{customersQuery.isLoading ? '—' : customers.length}</strong><small>Na lista desta assistência</small></article>
      <article className="customer-stat stat-spend"><div><span>Compras registradas</span><i><WalletCards size={17}/></i></div><strong>{salesQuery.isLoading ? '—' : money(totalSales)}</strong><small>{sales.length} venda(s) carregada(s)</small></article>
      <article className="customer-stat stat-buyers"><div><span>Clientes compradores</span><i><ShoppingBag size={17}/></i></div><strong>{salesQuery.isLoading ? '—' : customersWithPurchases}</strong><small>Com ao menos uma venda</small></article>
      <article className="customer-stat stat-orders"><div><span>Ordens em andamento</span><i><Wrench size={17}/></i></div><strong>{ordersQuery.isLoading ? '—' : openOrders}</strong><small>Vinculadas aos clientes</small></article>
    </section>

    <section className="panel customer-toolbar">
      <label className="customer-search"><Search size={16}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nome, telefone, CPF/CNPJ ou e-mail" /></label>
      <select aria-label="Filtrar clientes por compras" value={purchaseFilter} onChange={event => setPurchaseFilter(event.target.value)}><option value="ALL">Todos os clientes</option><option value="WITH_PURCHASE">Com compras</option><option value="WITHOUT_PURCHASE">Sem compras</option></select>
      <select aria-label="Filtrar clientes por documento" value={documentFilter} onChange={event => setDocumentFilter(event.target.value)}><option value="ALL">PF e PJ</option><option value="PF">Pessoa física</option><option value="PJ">Pessoa jurídica</option></select>
      <select aria-label="Ordenar clientes" value={sort} onChange={event => setSort(event.target.value)}><option value="NAME_ASC">Ordenar: A–Z</option><option value="NAME_DESC">Ordenar: Z–A</option><option value="SPEND_DESC">Maior valor comprado</option><option value="NEWEST">Mais recentes</option></select>
      <div className="customer-toolbar-actions"><button className="secondary-btn" onClick={exportCsv} disabled={!customers.length}><FileDown size={15}/> Exportar CSV</button><button className="primary-btn customer-toolbar-new" onClick={openNewCustomer}><Plus size={16}/> Novo cliente</button></div>
    </section>

    <section className="panel customer-table-panel">
      {customersQuery.isLoading ? <p className="feedback">Carregando clientes...</p> : customersQuery.error ? <p className="feedback error">Não foi possível carregar os clientes. Verifique se a API está rodando e se você está autenticado.</p> : customers.length === 0 ? <div className="empty-state"><Users size={28}/><strong>Nenhum cliente cadastrado</strong><span>Cadastre um cliente para organizar atendimentos e vendas.</span><button className="primary-btn" onClick={openNewCustomer}><Plus size={16}/> Novo cliente</button></div> : visibleCustomers.length === 0 ? <div className="customer-no-results"><Search size={22}/><strong>Nenhum resultado</strong><span>Tente ajustar a busca ou os filtros.</span></div> : <div className="table-scroll"><table className="customer-table"><thead><tr><th>CLIENTE</th><th>TELEFONE / WHATSAPP</th><th>COMPRAS</th><th>ÚLTIMA COMPRA</th><th>ORDENS</th><th>SITUAÇÃO</th><th className="customer-actions-heading">AÇÕES</th></tr></thead><tbody>{visibleCustomers.map((customer, index) => {
        const customerSales = salesByCustomer.get(customer.id) ?? [];
        const customerOrders = ordersByCustomer.get(customer.id) ?? [];
        const spent = customerSales.reduce((sum, sale) => sum + Number(sale.total), 0);
        const latest = latestSaleDate(customerSales);
        return <tr key={customer.id}>
          <td><div className="customer-identity"><span className={`customer-avatar ${avatarTones[index % avatarTones.length]}`}>{customer.photoData ? <img src={customer.photoData} alt=""/> : initials(customer.name)}</span><span><strong>{customer.name}</strong><small>{customer.document || 'Documento não informado'}</small></span></div></td>
          <td><div className="customer-contact">{customer.phone ? <a href={`https://wa.me/${digits(customer.phone)}`} target="_blank" rel="noreferrer" title="Abrir conversa no WhatsApp"><MessageCircle size={13}/>{customer.phone}</a> : <span className="customer-muted">Telefone não informado</span>}{customer.email && <small>{customer.email}</small>}</div></td>
          <td className="customer-spend"><strong>{money(spent)}</strong><small>{customerSales.length} compra(s)</small></td>
          <td>{dateLabel(latest)}</td><td><span className="customer-order-count">{customerOrders.length}</span></td>
          <td><div className="customer-status-tags"><span className={`customer-tag ${customer.active ? "" : "inactive"}`}>{customer.active ? "Ativo" : "Inativo"}</span>{customer.classification !== "NORMAL" && <span className={`customer-tag customer-class-${customer.classification.toLowerCase()}`}>{customer.classification === "VIP" ? "★ VIP" : "◆ Premium"}</span>}</div></td>
          <td><div className="customer-row-actions"><button className="customer-open-btn" onClick={() => { setSelected(customer); setModal('profile'); }}><Eye size={13}/> Abrir ficha</button><button className="customer-icon-btn whatsapp-action" title="WhatsApp" aria-label={`Abrir WhatsApp de ${customer.name}`} disabled={!customer.phone} onClick={() => window.open(`https://wa.me/${digits(customer.phone)}`, '_blank', 'noopener,noreferrer')}><MessageCircle size={15}/></button><button className="customer-icon-btn" title={copied === customer.id ? 'Telefone copiado' : 'Copiar telefone'} aria-label={`Copiar telefone de ${customer.name}`} disabled={!customer.phone} onClick={() => copyPhone(customer)}><Copy size={14}/></button><button className="customer-icon-btn" title="Editar cliente" aria-label={`Editar ${customer.name}`} onClick={() => openEditCustomer(customer)}><Pencil size={14}/></button></div></td>
        </tr>;
      })}</tbody></table></div>}
      {!customersQuery.isLoading && !customersQuery.error && customers.length > 0 && <div className="customer-table-footer"><span>Exibindo {visibleCustomers.length} de {customers.length} clientes</span><span>Totais baseados nas vendas e ordens carregadas pelo sistema</span></div>}
    </section>

    {modal === "form" && <CustomerFormModal form={form} editing={Boolean(editing)} isPending={saveCustomer.isPending} error={saveCustomer.error?.message ?? ""} zipFeedback={zipFeedback} photoFeedback={photoFeedback} onChange={updateForm} onZipLookup={lookupZip} onPhoto={selectPhoto} onClose={() => setModal(null)} onSubmit={submit} />}

    {modal === "profile" && selected && <CustomerProfileModal customer={selected} sales={salesByCustomer.get(selected.id) ?? []} orders={ordersByCustomer.get(selected.id) ?? []} onEdit={() => openEditCustomer(selected)} onClose={() => setModal(null)} onNewSale={() => { setModal(null); navigate(`/vendas?customerId=${encodeURIComponent(selected.id)}`); }} />}
  </div>;
}

type CustomerFormModalProps = {
  form: CustomerForm;
  editing: boolean;
  isPending: boolean;
  error: string;
  zipFeedback: string;
  photoFeedback: string;
  onChange: <K extends keyof CustomerForm>(key: K, value: CustomerForm[K]) => void;
  onZipLookup: () => void;
  onPhoto: (event: ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
};

function CustomerFormModal({ form, editing, isPending, error, zipFeedback, photoFeedback, onChange, onZipLookup, onPhoto, onClose, onSubmit }: CustomerFormModalProps) {
  const states = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
  return <div className="modal-backdrop customer-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="customer-form-modal" onSubmit={onSubmit}>
      <header className="customer-form-header"><div><UserRound size={19}/><h2>{editing ? 'Editar cliente' : 'Novo cliente'}</h2></div><button type="button" className="icon-btn" aria-label="Fechar" onClick={onClose}><X size={18}/></button></header>
      <div className="customer-form-scroll">
        <section className="customer-form-section">
          <div className="customer-form-section-heading"><UserRound size={15}/><h3>Dados principais</h3></div>
          <div className="customer-photo-row"><div className="customer-photo-preview">{form.photoData ? <img src={form.photoData} alt="Foto do cliente"/> : <span>?</span>}</div><div><label className="customer-photo-button"><Camera size={14}/> Foto do cliente<input type="file" accept="image/*" capture="user" onChange={onPhoto}/></label><p>Opcional. Tire uma foto pela câmera ou escolha um arquivo; ela aparece na ficha e na lista.</p>{form.photoData && <button className="customer-remove-photo" type="button" onClick={() => onChange('photoData', '')}>Remover foto</button>}{photoFeedback && <small className="customer-form-feedback">{photoFeedback}</small>}</div></div>
          <div className="customer-form-grid">
            <label className="span-3">Nome completo / Razão social *<input required minLength={2} maxLength={120} autoFocus value={form.name} onChange={event => onChange('name', event.target.value)} placeholder="Nome do cliente"/></label>
            <label>Tipo<select value={form.customerType} onChange={event => onChange('customerType', event.target.value as CustomerForm['customerType'])}><option value="INDIVIDUAL">Pessoa física</option><option value="COMPANY">Pessoa jurídica</option></select></label>
            <label className="span-2">CPF / CNPJ<input maxLength={40} value={form.document} onChange={event => onChange('document', event.target.value)} placeholder={form.customerType === 'INDIVIDUAL' ? '000.000.000-00' : '00.000.000/0000-00'}/></label>
            {form.customerType === 'INDIVIDUAL' && <label className="span-2">Data de nascimento<input type="date" value={form.dateOfBirth} onChange={event => onChange('dateOfBirth', event.target.value)}/></label>}
            <label className="span-2">Telefone / celular<input type="tel" maxLength={30} value={form.phone} onChange={event => onChange('phone', event.target.value)} placeholder="(00) 00000-0000"/></label>
            <label className="span-2">WhatsApp<input type="tel" maxLength={30} value={form.whatsappSameAsPhone ? form.phone : form.whatsapp} disabled={form.whatsappSameAsPhone} onChange={event => onChange('whatsapp', event.target.value)} placeholder="(00) 00000-0000"/></label>
            <label className="customer-same-phone"><input type="checkbox" checked={form.whatsappSameAsPhone} onChange={event => { const checked = event.target.checked; onChange('whatsappSameAsPhone', checked); if (checked) onChange('whatsapp', form.phone); }}/> O WhatsApp é o mesmo número do telefone</label>
            <label className="span-4">E-mail<input type="email" maxLength={160} value={form.email} onChange={event => onChange('email', event.target.value)} placeholder="email@exemplo.com"/></label>
          </div>
        </section>

        <section className="customer-form-section">
          <div className="customer-form-section-heading"><MapPin size={15}/><h3>Endereço</h3><span>Digite o CEP para preencher o restante</span></div>
          <div className="customer-form-grid">
            <label>CEP<div className="customer-zip-field"><input maxLength={9} value={form.zipCode} onChange={event => onChange('zipCode', event.target.value)} onBlur={() => { if (digits(form.zipCode).length === 8) onZipLookup(); }} placeholder="00000-000"/><button type="button" title="Consultar CEP" aria-label="Consultar CEP" onClick={onZipLookup}><Search size={14}/></button></div></label>
            <label className="span-2">Rua / logradouro<input maxLength={160} value={form.street} onChange={event => onChange('street', event.target.value)} placeholder="Rua, avenida..."/></label>
            <label>Número<input maxLength={30} value={form.addressNumber} onChange={event => onChange('addressNumber', event.target.value)} placeholder="Nº"/></label>
            <label>Complemento<input maxLength={100} value={form.complement} onChange={event => onChange('complement', event.target.value)} placeholder="Apto, bloco..."/></label>
            <label>Bairro<input maxLength={100} value={form.neighborhood} onChange={event => onChange('neighborhood', event.target.value)} placeholder="Bairro"/></label>
            <label>Cidade<input maxLength={100} value={form.city} onChange={event => onChange('city', event.target.value)} placeholder="Cidade"/></label>
            <label>UF<select value={form.state} onChange={event => onChange('state', event.target.value)}><option value="">UF</option>{states.map(state => <option key={state} value={state}>{state}</option>)}</select></label>
            <label className="span-4">Ponto de referência<input maxLength={200} value={form.addressReference} onChange={event => onChange('addressReference', event.target.value)} placeholder="Ajude a encontrar o endereço"/></label>
            <label className="span-2">Rota de entrega<select value={form.deliveryRoute} onChange={event => onChange('deliveryRoute', event.target.value)}><option value="BY_NEIGHBORHOOD">Pelo bairro</option><option value="CENTRAL">Centro</option><option value="PICKUP">Retirada na assistência</option><option value="OTHER">Outra rota</option></select><small>Usada como referência para organizar a entrega.</small></label>
          </div>
          {zipFeedback && <p className={`customer-form-feedback ${zipFeedback.includes('preenchido') ? 'success' : ''}`}>{zipFeedback}</p>}
        </section>

        <section className="customer-form-section">
          <div className="customer-form-section-heading"><FileText size={15}/><h3>Nota fiscal</h3><span>Dados fiscais para emissão de notas</span></div>
          <div className="customer-form-grid">
            <label className="span-2">Contribuinte do ICMS?<select value={form.isTaxPayer} onChange={event => onChange('isTaxPayer', event.target.value as CustomerForm['isTaxPayer'])}><option value="">Escolha...</option><option value="YES">Sim</option><option value="NO">Não</option></select></label>
            <label className="span-2">Inscrição estadual (IE)<input maxLength={40} value={form.stateRegistration} onChange={event => onChange('stateRegistration', event.target.value)} placeholder="Só os números"/></label>
            <label>Código da cidade (IBGE)<input maxLength={10} value={form.cityIbgeCode} onChange={event => onChange('cityIbgeCode', event.target.value)} placeholder="Vem pelo CEP"/></label>
            <label>Inscrição municipal<input maxLength={40} value={form.municipalRegistration} onChange={event => onChange('municipalRegistration', event.target.value)} placeholder="Se tiver"/></label>
            <label className="span-2">E-mail para a nota<input type="email" maxLength={160} value={form.invoiceEmail} onChange={event => onChange('invoiceEmail', event.target.value)} placeholder="Se for outro e-mail"/></label>
          </div>
        </section>

        <section className="customer-form-section">
          <div className="customer-form-section-heading"><SlidersHorizontal size={15}/><h3>Configurações</h3></div>
          <div className="customer-form-grid">
            <label>Classificação<select value={form.classification} onChange={event => onChange('classification', event.target.value as CustomerForm['classification'])}><option value="NORMAL">Normal</option><option value="VIP">VIP</option><option value="PREMIUM">Premium</option></select></label>
            <label>Situação<select value={form.active ? 'ACTIVE' : 'INACTIVE'} onChange={event => onChange('active', event.target.value === 'ACTIVE')}><option value="ACTIVE">Ativo</option><option value="INACTIVE">Inativo</option></select></label>
            <label className="span-2">Limite de fiado (R$)<input type="number" min="0" max="999999999" step="0.01" value={form.creditLimit} onChange={event => onChange('creditLimit', event.target.value)} placeholder="0,00 = sem limite"/></label>
            <label className="span-2">Tabela de preço<select value={form.priceTable} onChange={event => onChange('priceTable', event.target.value as CustomerForm['priceTable'])}><option value="RETAIL">Varejo (preço normal)</option><option value="WHOLESALE">Atacado</option></select></label>
            <label className="span-2">Desconto do cliente (%)<input type="number" min="0" max="100" step="0.01" value={form.discountPercent} onChange={event => onChange('discountPercent', event.target.value)} placeholder="0 = sem desconto"/></label>
            <label className="span-4">Observações<textarea rows={3} maxLength={2000} value={form.notes} onChange={event => onChange('notes', event.target.value)} placeholder="Preferências, horários, combinados com o cliente..."/></label>
          </div>
        </section>
        {error && <p className="feedback error customer-form-error">{error}</p>}
      </div>
      <footer className="customer-form-footer"><button type="button" className="secondary-btn" onClick={onClose}>Cancelar</button><button type="submit" className="primary-btn" disabled={isPending}>{isPending ? <LoaderCircle className="customer-save-spinner" size={15}/> : <Check size={15}/>} {isPending ? 'Salvando...' : editing ? 'Salvar alterações' : 'Salvar cliente'}</button></footer>
    </form>
  </div>;
}

type CustomerProfileTab = 'SUMMARY' | 'SALES' | 'CREDIT' | 'ORDERS' | 'QUOTES' | 'WARRANTIES' | 'CREDITS';
type CustomerProfileModalProps = { customer: Customer; sales: Sale[]; orders: Order[]; onEdit: () => void; onClose: () => void; onNewSale: () => void };
const paymentLabels: Record<string, string> = { CASH: 'Dinheiro', PIX: 'Pix', CREDIT_CARD: 'Cartão de crédito', DEBIT_CARD: 'Cartão de débito', BANK_TRANSFER: 'Transferência', OTHER: 'Outro' };
const orderStatusLabels: Record<string, string> = { RECEIVED: 'Recebida', DIAGNOSIS: 'Em diagnóstico', WAITING_APPROVAL: 'Aguardando aprovação', WAITING_PART: 'Aguardando peça', IN_REPAIR: 'Em reparo', TESTING: 'Em testes', READY: 'Pronta', DELIVERED: 'Entregue', CANCELED: 'Cancelada', NO_REPAIR: 'Sem conserto' };
const profileMoney = (value: number) => money(value);
const profileDate = (value: string) => new Date(value).toLocaleDateString('pt-BR');
const profileDateTime = (value: string) => new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

function CustomerProfileModal({ customer, sales, orders, onEdit, onClose, onNewSale }: CustomerProfileModalProps) {
  const [tab, setTab] = useState<CustomerProfileTab>('SUMMARY');
  const total = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const average = sales.length ? total / sales.length : 0;
  const lastSale = sales.reduce<string | undefined>((last, sale) => !last || sale.createdAt > last ? sale.createdAt : last, undefined);
  const openOrders = orders.filter(order => !['DELIVERED', 'CANCELED', 'NO_REPAIR'].includes(order.status));
  const topProducts = sales.flatMap(sale => sale.items.map(item => ({ ...item, createdAt: sale.createdAt }))).reduce((map, item) => {
    const current = map.get(item.productName) ?? { quantity: 0, total: 0, lastDate: item.createdAt };
    map.set(item.productName, { quantity: current.quantity + item.quantity, total: current.total + Number(item.total), lastDate: item.createdAt > current.lastDate ? item.createdAt : current.lastDate });
    return map;
  }, new Map<string, { quantity: number; total: number; lastDate: string }>());
  const productRows = [...topProducts.entries()].map(([name, data]) => ({ name, ...data })).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  const activity = [
    ...sales.map(sale => ({ id: sale.id, kind: 'SALE' as const, date: sale.createdAt, title: `Compra #V-${String(sale.number).padStart(4, '0')} · ${profileMoney(Number(sale.total))}`, detail: `${profileDateTime(sale.createdAt)} · ${paymentLabels[sale.paymentMethod] || sale.paymentMethod}` })),
    ...orders.map(order => ({ id: order.id, kind: 'ORDER' as const, date: order.createdAt, title: `OS #OS-${String(order.number).padStart(4, '0')} · ${orderStatusLabels[order.status] || order.status}`, detail: `${profileDateTime(order.createdAt)} · ${order.device.brand} ${order.device.model} · ${order.reportedIssue}` })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  const tabs: Array<{ id: CustomerProfileTab; label: string; count?: number }> = [
    { id: 'SUMMARY', label: 'Resumo' }, { id: 'SALES', label: 'Compras', count: sales.length }, { id: 'CREDIT', label: 'Fiado / A receber' },
    { id: 'ORDERS', label: 'Ordens de serviço', count: orders.length }, { id: 'QUOTES', label: 'Orçamentos' }, { id: 'WARRANTIES', label: 'Garantias' }, { id: 'CREDITS', label: 'Vales e créditos' },
  ];
  const address = [customer.street, customer.addressNumber, customer.complement, customer.neighborhood, customer.city, customer.state, customer.zipCode].filter(Boolean).join(', ');
  const mapUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : '';

  function unavailable(title: string) {
    return <div className="customer-profile-unavailable"><span><Ticket size={19}/></span><strong>{title} ainda não está disponível</strong><p>Esta área será preenchida quando o recurso correspondente estiver habilitado no sistema.</p></div>;
  }

  return <div className="modal-backdrop customer-profile-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="customer-profile-modal customer-profile-expanded" aria-label={`Ficha de ${customer.name}`}>
      <div className="customer-profile-scroll">
        <div className="customer-profile-breadcrumb"><button onClick={onClose}>← <span>Todos os clientes</span></button><span>Ficha do cliente</span></div>
        <header className="customer-profile-main-header">
          <div className="customer-profile-title"><span className={`customer-avatar ${customer.photoData ? 'profile-has-photo' : 'purple'}`}>{customer.photoData ? <img src={customer.photoData} alt=""/> : initials(customer.name)}</span><div className="customer-profile-heading-copy"><h2>{customer.name}</h2><div className="customer-profile-tags"><span>{customer.customerType === 'COMPANY' ? 'Pessoa jurídica' : 'Pessoa física'}</span><span className={`customer-tag ${customer.active ? '' : 'inactive'}`}>{customer.active ? 'Ativo' : 'Inativo'}</span>{customer.classification !== 'NORMAL' && <span className={`customer-tag customer-class-${customer.classification.toLowerCase()}`}>★ {customer.classification}</span>}</div><div className="customer-profile-meta">{customer.document && <span><IdCard size={13}/>{customer.document}</span>}{customer.phone && <a href={`tel:${customer.phone}`}><Phone size={13}/>{customer.phone}</a>}{customer.email && <a href={`mailto:${customer.email}`}><Mail size={13}/>{customer.email}</a>}{customer.city && <span><MapPin size={13}/>{customer.city}{customer.state ? ` - ${customer.state}` : ''}</span>}<span><CalendarDays size={13}/>Cliente desde {profileDate(customer.createdAt)}</span></div></div></div>
          <div className="customer-profile-head-actions"><button className="secondary-btn" onClick={onEdit}><Pencil size={14}/> Editar</button><button className="customer-icon-btn" title="Fechar ficha" aria-label="Fechar ficha" onClick={onClose}><X size={15}/></button></div>
        </header>

        
        <div className="customer-profile-quick-actions">
          <button onClick={onNewSale}>
            <ShoppingCart size={16} /> Nova venda
          </button>

          <button onClick={() => setTab('ORDERS')}>
            <Wrench size={16} /> Ordens de serviço
          </button>

          <button disabled title="Orçamentos ainda não estão habilitados">
            <FileText size={16} /> Orçamento
          </button>

          <button disabled title="Venda fiada não está habilitada">
            <HandCoins size={16} /> Lançar fiado
          </button>

          <a
            href={
              customer.whatsapp || customer.phone
                ? `https://wa.me/${digits(customer.whatsapp || customer.phone || '')}`
                : undefined
            }
            target="_blank"
            rel="noreferrer"
            className={!customer.whatsapp && !customer.phone ? 'disabled' : ''}
          >
            <MessageCircle size={16} /> WhatsApp
          </a>

          <button onClick={() => setTab('SALES')}>
            <Receipt size={16} /> Extrato
          </button>
        </div>


        <div className="customer-profile-metrics">
          <article><span>Total comprado</span><strong>{profileMoney(total)}</strong><small>{sales.length} compra(s)</small></article>
          <article><span>Ticket médio</span><strong>{profileMoney(average)}</strong><small>Por compra</small></article>
          <article><span>Última compra</span><strong>{lastSale ? profileDate(lastSale) : '—'}</strong><small>{lastSale ? 'Data da compra mais recente' : 'Nenhuma compra registrada'}</small></article>
          <article><span>Fiado em aberto</span><strong>—</strong><small>Controle de fiado indisponível</small></article>
          <article><span>Limite configurado</span><strong>{profileMoney(Number(customer.creditLimit || 0))}</strong><small>Cadastro do cliente</small></article>
          <article><span>Ordens de serviço</span><strong>{orders.length}</strong><small>{openOrders.length} em andamento</small></article>
        </div>

        <nav className="customer-profile-tabs" aria-label="Seções da ficha">{tabs.map(item => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.label}{item.count !== undefined && <small>{item.count}</small>}</button>)}</nav>

        {tab === 'SUMMARY' && <div className="customer-profile-summary-layout">
          <div className="customer-profile-left-column">
            <section className="customer-profile-panel customer-profile-details"><header><h3><IdCard size={15}/> Dados do cliente</h3><button className="secondary-btn" onClick={onEdit}><Pencil size={13}/> Editar</button></header>
              <dl><dt>Nome / Razão social</dt><dd>{customer.name}</dd><dt>{customer.customerType === 'COMPANY' ? 'CNPJ' : 'CPF'}</dt><dd>{customer.document || '—'}</dd><dt>Telefone</dt><dd>{customer.phone || '—'}</dd><dt>WhatsApp</dt><dd>{customer.whatsapp || customer.phone || '—'}</dd><dt>E-mail</dt><dd>{customer.email || '—'}</dd>{customer.customerType === 'INDIVIDUAL' && <><dt>Nascimento</dt><dd>{customer.dateOfBirth ? profileDate(customer.dateOfBirth) : '—'}</dd></>}<dt>Endereço</dt><dd>{address || 'Não informado'}{mapUrl && <a className="customer-map-link" href={mapUrl} target="_blank" rel="noreferrer"><MapPin size={12}/> Mapa</a>}</dd><dt>Referência</dt><dd>{customer.addressReference || '—'}</dd><dt>Classificação</dt><dd>{customer.classification === 'NORMAL' ? 'Normal' : customer.classification}</dd><dt>Limite de fiado</dt><dd>{profileMoney(Number(customer.creditLimit || 0))}</dd><dt>Observações</dt><dd>{customer.notes || '—'}</dd></dl>
            </section>
            <section className="customer-profile-panel customer-top-products"><header><h3><ShoppingBag size={15}/> O que mais compra</h3></header>{productRows.length ? productRows.map((item, index) => <div className="customer-product-row" key={item.name}><span>{index + 1}</span><div><strong>{item.name}</strong><small>{item.quantity} un. · última vez {profileDate(item.lastDate)}</small></div><b>{profileMoney(item.total)}</b></div>) : <p className="customer-profile-empty">Nenhum item de venda associado a este cliente ainda.</p>}</section>
          </div>
          <section className="customer-profile-panel customer-recent-activity"><header><h3><CalendarDays size={15}/> Atividade recente</h3></header>{activity.length ? activity.map(item => <article key={`${item.kind}-${item.id}`}><span className={`customer-activity-icon ${item.kind.toLowerCase()}`}>{item.kind === 'SALE' ? <ShoppingBag size={13}/> : <Wrench size={13}/>}</span><div><strong>{item.title}</strong><small>{item.detail}</small></div></article>) : <p className="customer-profile-empty">Ainda não há compras ou ordens registradas.</p>}</section>
        </div>}
        {tab === 'SALES' && <section className="customer-profile-panel customer-tab-panel"><header><h3><ShoppingBag size={15}/> Compras</h3><span>{sales.length} registro(s)</span></header>{sales.length ? <div className="table-scroll"><table className="customer-detail-table"><thead><tr><th>VENDA</th><th>DATA</th><th>ITENS</th><th>PAGAMENTO</th><th>TOTAL</th></tr></thead><tbody>{[...sales].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(sale => <tr key={sale.id}><td>#{String(sale.number).padStart(5, '0')}</td><td>{profileDateTime(sale.createdAt)}</td><td>{sale.items.map(item => `${item.quantity}× ${item.productName}`).join(', ')}</td><td>{paymentLabels[sale.paymentMethod] || sale.paymentMethod}</td><td>{profileMoney(Number(sale.total))}</td></tr>)}</tbody></table></div> : <p className="customer-profile-empty">Nenhuma compra registrada.</p>}</section>}
        {tab === 'ORDERS' && <section className="customer-profile-panel customer-tab-panel"><header><h3><Wrench size={15}/> Ordens de serviço</h3><span>{orders.length} registro(s)</span></header>{orders.length ? <div className="table-scroll"><table className="customer-detail-table"><thead><tr><th>ORDEM</th><th>DATA</th><th>APARELHO</th><th>DEFEITO</th><th>STATUS</th></tr></thead><tbody>{[...orders].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(order => <tr key={order.id}><td>#{String(order.number).padStart(5, '0')}</td><td>{profileDateTime(order.createdAt)}</td><td>{order.device.brand} {order.device.model}</td><td>{order.reportedIssue}</td><td>{orderStatusLabels[order.status] || order.status}</td></tr>)}</tbody></table></div> : <p className="customer-profile-empty">Nenhuma ordem registrada.</p>}</section>}
        {tab === 'CREDIT' && unavailable('O controle de fiado / contas a receber')}
        {tab === 'QUOTES' && unavailable('O módulo de orçamentos')}
        {tab === 'WARRANTIES' && unavailable('O controle de garantias')}
        {tab === 'CREDITS' && unavailable('O controle de vales e créditos')}
      </div>
    </section>
  </div>;
}
