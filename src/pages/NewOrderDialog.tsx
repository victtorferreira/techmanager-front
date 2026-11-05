import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import Modal from '../components/Modal';

type Customer = { id: string; name: string; phone?: string | null };
type Device = { id: string; brand: string; model: string; color?: string | null; imei?: string | null; serial?: string | null };
export default function NewOrderDialog({ onClose }: { onClose: () => void }) {
  const client = useQueryClient();
  const [customerId, setCustomerId] = useState('');
  const [deviceId, setDeviceId] = useState('new');
  const [form, setForm] = useState({ brand: '', model: '', color: '', imei: '', serial: '', reportedIssue: '', estimatedDelivery: '' });
  const customers = useQuery({ queryKey: ['customers'], queryFn: () => api<Customer[]>('/customers') });
  const devices = useQuery({ queryKey: ['order-devices', customerId], queryFn: () => api<Device[]>(`/service-orders/devices?customerId=${encodeURIComponent(customerId)}`), enabled: !!customerId });
  const create = useMutation({ mutationFn: (payload: object) => api('/service-orders', { method: 'POST', body: JSON.stringify(payload) }), onSuccess: () => {
    for (const key of ['orders', 'dashboard', 'reports', 'inventory-orders', 'order-devices', 'global-search']) void client.invalidateQueries({ queryKey: [key] });
    onClose();
  } });
  function submit(event: FormEvent) {
    event.preventDefault(); if (create.isPending) return;
    create.mutate({ customerId, reportedIssue: form.reportedIssue.trim(),
      ...(deviceId === 'new' ? { device: { brand: form.brand.trim(), model: form.model.trim(), color: form.color.trim(), imei: form.imei.trim(), serial: form.serial.trim() } } : { deviceId }),
      ...(form.estimatedDelivery ? { estimatedDelivery: new Date(`${form.estimatedDelivery}T12:00:00`).toISOString() } : {}),
    });
  }
  function field(key: keyof typeof form, value: string) { setForm(current => ({ ...current, [key]: value })); }
  return <Modal title="Nova ordem de serviço" onClose={onClose} busy={create.isPending}>
    <form onSubmit={submit}><fieldset className="supplier-fieldset" disabled={create.isPending}><div className="modal-fields">
      <label className="modal-wide">Cliente<select required autoFocus value={customerId} onChange={event => { setCustomerId(event.target.value); setDeviceId('new'); }}><option value="">Selecione um cliente</option>{customers.data?.map(customer => <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ''}</option>)}</select></label>
      {customers.isLoading && <p className="feedback modal-wide">Carregando clientes...</p>}
      {customers.error && <p role="alert" className="feedback error modal-wide">Não foi possível carregar os clientes. <button type="button" className="secondary-btn" onClick={() => void customers.refetch()}>Tentar novamente</button></p>}
      {customers.data?.length === 0 && <p className="feedback modal-wide">Cadastre um cliente para abrir a ordem. <Link to="/clientes">Ir para clientes</Link></p>}
      {customerId && <><label className="modal-wide">Aparelho<select value={deviceId} onChange={event => setDeviceId(event.target.value)}><option value="new">Cadastrar novo aparelho</option>{devices.data?.map(device => <option key={device.id} value={device.id}>{device.brand} {device.model}{device.imei ? ` · IMEI ${device.imei}` : device.serial ? ` · Série ${device.serial}` : ''}</option>)}</select></label>{devices.isLoading && <p className="feedback modal-wide">Carregando aparelhos do cliente...</p>}{devices.error && <p role="alert" className="feedback error modal-wide">Não foi possível carregar os aparelhos existentes. <button type="button" className="secondary-btn" onClick={() => void devices.refetch()}>Tentar novamente</button></p>}</>}
      {deviceId === 'new' && <><label>Marca<input required maxLength={80} value={form.brand} onChange={event => field('brand', event.target.value)}/></label><label>Modelo<input required maxLength={120} value={form.model} onChange={event => field('model', event.target.value)}/></label><label>Cor (opcional)<input maxLength={60} value={form.color} onChange={event => field('color', event.target.value)}/></label><label>IMEI (opcional)<input maxLength={40} value={form.imei} onChange={event => field('imei', event.target.value)}/></label><label>Número de série (opcional)<input maxLength={80} value={form.serial} onChange={event => field('serial', event.target.value)}/></label></>}
      <label className="modal-wide">Defeito relatado<textarea required minLength={3} maxLength={2000} rows={3} value={form.reportedIssue} onChange={event => field('reportedIssue', event.target.value)}/></label>
      <label>Previsão de entrega (opcional)<input type="date" value={form.estimatedDelivery} onChange={event => field('estimatedDelivery', event.target.value)}/></label>
    </div></fieldset>{create.error && <p className="feedback error" role="alert">{create.error.message}</p>}
      <div className="form-modal-actions"><button type="button" className="secondary-btn" disabled={create.isPending} onClick={onClose}>Cancelar</button><button className="primary-btn" disabled={create.isPending || !customers.data?.length}>{create.isPending ? 'Salvando...' : 'Salvar ordem'}</button></div>
    </form>
  </Modal>;
}
