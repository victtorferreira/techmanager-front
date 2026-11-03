import { FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Plus, UserRound, X } from 'lucide-react';
import { api } from '../api';

type Customer = { id: string; name: string; phone?: string | null };
type Appointment = {
  id: string; title: string; deviceDescription?: string | null; details?: string | null;
  startsAt: string; endsAt: string; status: string;
  customer: Customer;
};
type AppointmentForm = { customerId: string; title: string; deviceDescription: string; details: string; startsAt: string; endsAt: string };

const statusLabels: Record<string, string> = { SCHEDULED: 'Agendado', CONFIRMED: 'Confirmado', COMPLETED: 'Concluído', CANCELED: 'Cancelado', NO_SHOW: 'Não compareceu' };
const statuses = Object.keys(statusLabels);
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const toLocalInput = (date: Date, hours: number, minutes = 0) => `${dateKey(date)}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
const monthGridStart = (month: Date) => {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  first.setDate(first.getDate() - offset);
  return first;
};
const eventTime = (date: string) => new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default function Agenda() {
  const queryClient = useQueryClient();
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);
  const [modalOpen, setModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [form, setForm] = useState<AppointmentForm>({ customerId: '', title: 'Avaliação do aparelho', deviceDescription: '', details: '', startsAt: toLocalInput(today, 10), endsAt: toLocalInput(today, 10, 30) });
  const rangeStart = monthGridStart(month);
  const rangeEnd = new Date(rangeStart); rangeEnd.setDate(rangeEnd.getDate() + 42);
  const from = rangeStart.toISOString();
  const to = rangeEnd.toISOString();
  const appointmentsQuery = useQuery({
    queryKey: ['appointments', from, to],
    queryFn: () => api<Appointment[]>(`/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  });
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: () => api<Customer[]>('/customers') });
  const appointments = appointmentsQuery.data ?? [];
  const customers = customersQuery.data ?? [];
  const days = useMemo(() => Array.from({ length: 42 }, (_, index) => {
    const date = new Date(rangeStart); date.setDate(date.getDate() + index); return date;
  }), [from]);
  const appointmentsByDay = useMemo(() => {
    const grouped = new Map<string, Appointment[]>();
    appointments.forEach(appointment => {
      const key = dateKey(new Date(appointment.startsAt));
      grouped.set(key, [...(grouped.get(key) ?? []), appointment]);
    });
    return grouped;
  }, [appointments]);
  const selectedAppointments = appointmentsByDay.get(dateKey(selectedDate)) ?? [];

  const createAppointment = useMutation({
    mutationFn: (payload: object) => api<Appointment>('/appointments', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: async () => {
      setModalOpen(false); setErrorMessage('');
      await queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: error => setErrorMessage(error.message),
  });
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api<Appointment>(`/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
    onError: error => setErrorMessage(error.message),
  });

  function openNewAppointment() {
    const start = new Date(selectedDate); start.setHours(10, 0, 0, 0);
    const end = new Date(start); end.setMinutes(end.getMinutes() + 30);
    setForm({ customerId: '', title: 'Avaliação do aparelho', deviceDescription: '', details: '', startsAt: toLocalInput(start, start.getHours(), start.getMinutes()), endsAt: toLocalInput(end, end.getHours(), end.getMinutes()) });
    setErrorMessage(''); setModalOpen(true);
  }

  function submit(event: FormEvent) {
    event.preventDefault(); setErrorMessage('');
    createAppointment.mutate({
      customerId: form.customerId,
      title: form.title.trim(),
      ...(form.deviceDescription.trim() ? { deviceDescription: form.deviceDescription.trim() } : {}),
      ...(form.details.trim() ? { details: form.details.trim() } : {}),
      startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString(),
    });
  }

  function changeMonth(amount: number) {
    setMonth(current => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  return <div className="page-stack">
    <div className="section-toolbar agenda-heading"><div><h2>Agenda</h2><p>Organize avaliações, entregas e retornos da assistência.</p></div><button className="primary-btn" onClick={openNewAppointment}><Plus size={17}/> Novo agendamento</button></div>
    <div className="calendar-toolbar panel"><div className="calendar-month-label">{month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</div><div className="calendar-controls"><button className="secondary-btn" onClick={() => { setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(today); }}>Hoje</button><button className="calendar-arrow" aria-label="Mês anterior" onClick={() => changeMonth(-1)}><ChevronLeft size={18}/></button><button className="calendar-arrow" aria-label="Próximo mês" onClick={() => changeMonth(1)}><ChevronRight size={18}/></button></div></div>
    <div className="agenda-layout">
      <section className="panel calendar-panel">
        <div className="calendar-weekdays">{['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => <span key={day}>{day}</span>)}</div>
        <div className="agenda-legend"><span><i className="legend-scheduled"/>Agendado</span><span><i className="legend-confirmed"/>Confirmado</span><span><i className="legend-completed"/>Concluído</span><span><i className="legend-canceled"/>Cancelado / ausência</span></div>
        <div className="calendar-grid">{days.map(day => {
          const key = dateKey(day); const dayEvents = appointmentsByDay.get(key) ?? [];
          const outside = day.getMonth() !== month.getMonth(); const isToday = key === dateKey(today); const isSelected = key === dateKey(selectedDate);
          return <button key={key} className={`calendar-day ${outside ? 'calendar-day-outside' : ''} ${isToday ? 'calendar-day-today' : ''} ${isSelected ? 'calendar-day-selected' : ''}`} onClick={() => { setSelectedDate(day); if (outside) setMonth(new Date(day.getFullYear(), day.getMonth(), 1)); }}>
            <span className="calendar-day-number">{day.getDate()}</span>
            <span className="calendar-day-events">{dayEvents.slice(0, 2).map(appointment => <span key={appointment.id} className={`calendar-event-dot status-${appointment.status.toLowerCase()}`}><b>{eventTime(appointment.startsAt)}</b> {appointment.customer.name.split(' ')[0]}</span>)}{dayEvents.length > 2 && <small>+{dayEvents.length - 2} mais</small>}</span>
          </button>;
        })}</div>
        {appointmentsQuery.isLoading && <p className="feedback">Carregando agenda...</p>}
        {appointmentsQuery.error && <p className="feedback error">Não foi possível carregar os agendamentos.</p>}
      </section>

      <aside className="panel agenda-day-panel">
        <div className="agenda-day-heading"><div><span>Compromissos do dia</span><h3>{selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3></div><button className="icon-btn" aria-label="Criar agendamento neste dia" onClick={openNewAppointment}><Plus size={18}/></button></div>
        {selectedAppointments.length === 0 ? <div className="agenda-empty"><CalendarDays size={26}/><strong>Dia livre</strong><span>Não há agendamentos nesta data.</span></div> : <div className="agenda-events">{selectedAppointments.map(appointment => <article key={appointment.id} className={`agenda-event status-${appointment.status.toLowerCase()}`}>
          <div className="agenda-event-time"><Clock3 size={14}/><strong>{eventTime(appointment.startsAt)} – {eventTime(appointment.endsAt)}</strong></div>
          <h4>{appointment.title}</h4>
          <p><UserRound size={13}/>{appointment.customer.name}{appointment.customer.phone ? ` · ${appointment.customer.phone}` : ''}</p>
          {appointment.deviceDescription && <p className="agenda-device">{appointment.deviceDescription}</p>}
          {appointment.details && <p className="agenda-details">{appointment.details}</p>}
          <select aria-label={`Status de ${appointment.title}`} value={appointment.status} onChange={event => updateStatus.mutate({ id: appointment.id, status: event.target.value })} disabled={updateStatus.isPending}>
            {statuses.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}
          </select>
        </article>)}</div>}
      </aside>
    </div>

    {modalOpen && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setModalOpen(false); }}>
      <form className="form-modal appointment-modal" onSubmit={submit}>
        <div className="form-modal-heading"><div><h2>Novo agendamento</h2><p>{selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div><button type="button" className="icon-btn" aria-label="Fechar" onClick={() => setModalOpen(false)}><X size={18}/></button></div>
        <div className="modal-fields">
          <label className="modal-wide">Cliente<select required value={form.customerId} onChange={event => setForm(current => ({ ...current, customerId: event.target.value }))}><option value="">Selecione um cliente</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ''}</option>)}</select></label>
          {customersQuery.isLoading && <p className="feedback">Carregando clientes...</p>}
          {!customersQuery.isLoading && customers.length === 0 && <p className="feedback modal-wide">Cadastre primeiro um cliente. <Link to="/clientes">Ir para clientes</Link></p>}
          <label className="modal-wide">Motivo do atendimento<input required minLength={2} maxLength={100} value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} /></label>
          <label className="modal-wide">Aparelho <span className="field-optional">(opcional)</span><input maxLength={120} placeholder="Ex.: iPhone 13, Samsung A54" value={form.deviceDescription} onChange={event => setForm(current => ({ ...current, deviceDescription: event.target.value }))} /></label>
          <label>Início<input required type="datetime-local" value={form.startsAt} onChange={event => setForm(current => ({ ...current, startsAt: event.target.value }))} /></label>
          <label>Término<input required type="datetime-local" value={form.endsAt} onChange={event => setForm(current => ({ ...current, endsAt: event.target.value }))} /></label>
          <label className="modal-wide">Observações <span className="field-optional">(opcional)</span><textarea rows={3} maxLength={1000} value={form.details} onChange={event => setForm(current => ({ ...current, details: event.target.value }))} /></label>
        </div>
        {errorMessage && <p className="feedback error">{errorMessage}</p>}
        <div className="form-modal-actions"><button type="button" className="secondary-btn" onClick={() => setModalOpen(false)}>Cancelar</button><button className="primary-btn" disabled={createAppointment.isPending || customers.length === 0}>{createAppointment.isPending ? 'Salvando...' : 'Salvar agendamento'}</button></div>
      </form>
    </div>}
  </div>;
}
