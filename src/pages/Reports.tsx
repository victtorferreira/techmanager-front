import { useMemo, useState } from 'react';
import { BarChart3, Download, Package, ShoppingBag, Users, Wrench } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

type Report = {
  totals: { sales: number; saleCount: number; averageTicket: number; grossProfit: number; income: number; expenses: number; balance: number; orders: number; newCustomers: number; appointments: number; completedAppointments: number; lowStock: number };
  series: Array<{ date: string; sales: number; expenses: number; appointments: number }>;
  ordersByStatus: Array<{ status: string; count: number }>;
  appointmentsByStatus: Array<{ status: string; count: number }>;
  topProducts: Array<{ id: string; name: string; quantity: number; total: number }>;
};

const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const labels: Record<string, string> = { RECEIVED: 'Recebida', DIAGNOSIS: 'Em diagnóstico', WAITING_APPROVAL: 'Aguardando aprovação', WAITING_PART: 'Aguardando peça', IN_REPAIR: 'Em reparo', TESTING: 'Em testes', READY: 'Pronta', DELIVERED: 'Entregue', CANCELED: 'Cancelada', NO_REPAIR: 'Sem conserto', SCHEDULED: 'Agendado', CONFIRMED: 'Confirmado', COMPLETED: 'Concluído', NO_SHOW: 'Não compareceu' };
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Reports() {
  const today = new Date();
  const [fromDate, setFromDate] = useState(dateKey(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [toDate, setToDate] = useState(dateKey(today));
  const range = useMemo(() => {
    if (!fromDate || !toDate) return null;
    const from = new Date(`${fromDate}T00:00:00`);
    const to = new Date(`${toDate}T00:00:00`); to.setDate(to.getDate() + 1);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [fromDate, toDate]);
  const query = useQuery({
    queryKey: ['reports-summary', range?.from, range?.to],
    queryFn: () => api<Report>(`/reports/summary?from=${encodeURIComponent(range!.from)}&to=${encodeURIComponent(range!.to)}`),
    enabled: Boolean(range),
  });
  const report = query.data;
  const maxBar = Math.max(1, ...(report?.series.flatMap(item => [item.sales, item.expenses]) ?? []));

  function exportCsv() {
    if (!report) return;
    const rows: unknown[][] = [
      ['Relatório TechManager', fromDate, toDate], [], ['Indicador', 'Valor'],
      ['Vendas', report.totals.sales], ['Quantidade de vendas', report.totals.saleCount], ['Ticket médio', report.totals.averageTicket],
      ['Lucro bruto estimado', report.totals.grossProfit], ['Receitas', report.totals.income], ['Despesas', report.totals.expenses], ['Saldo', report.totals.balance],
      ['Ordens de serviço', report.totals.orders], ['Novos clientes', report.totals.newCustomers], ['Agendamentos', report.totals.appointments], [],
      ['Vendas e despesas por dia', 'Vendas', 'Despesas', 'Agendamentos'],
      ...report.series.map(item => [item.date, item.sales, item.expenses, item.appointments]), [],
      ['Produtos mais vendidos', 'Quantidade', 'Total'],
      ...report.topProducts.map(item => [item.name, item.quantity, item.total]),
    ];
    const csv = rows.map(row => row.map(value => {
      const safe = String(value ?? '').replace(/[\r\n]+/g, ' ');
      const guarded = /^[=+\-@]/.test(safe) ? `'${safe}` : safe;
      return `"${guarded.replace(/"/g, '""')}"`;
    }).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `relatorio-techmanager-${fromDate}-${toDate}.csv`; link.click(); URL.revokeObjectURL(url);
  }

  const cards = report ? [
    { label: 'Vendas no período', value: money(report.totals.sales), note: `${report.totals.saleCount} venda(s) · ticket médio ${money(report.totals.averageTicket)}`, icon: ShoppingBag, tone: 'blue' },
    { label: 'Lucro bruto estimado', value: money(report.totals.grossProfit), note: 'Vendas menos custo dos produtos', icon: BarChart3, tone: 'green' },
    { label: 'Saldo financeiro', value: money(report.totals.balance), note: `${money(report.totals.income)} receitas · ${money(report.totals.expenses)} despesas`, icon: BarChart3, tone: 'violet' },
    { label: 'Ordens de serviço', value: String(report.totals.orders), note: `${report.totals.newCustomers} cliente(s) novo(s)`, icon: Wrench, tone: 'orange' },
    { label: 'Agendamentos', value: String(report.totals.appointments), note: `${report.totals.completedAppointments} concluído(s)`, icon: Users, tone: 'blue' },
    { label: 'Produtos com estoque baixo', value: String(report.totals.lowStock), note: 'No estoque atual', icon: Package, tone: 'orange' },
  ] : [];

  return <div className="page-stack">
    <div className="section-toolbar reports-toolbar"><div><h2>Relatórios</h2><p>Acompanhe vendas, financeiro, ordens e agenda em um só lugar.</p></div><button className="primary-btn" onClick={exportCsv} disabled={!report}><Download size={16}/> Exportar CSV</button></div>
    <section className="panel report-filters"><label>De<input type="date" value={fromDate} max={toDate || undefined} onChange={event => setFromDate(event.target.value)} /></label><label>Até<input type="date" value={toDate} min={fromDate || undefined} max={dateKey(today)} onChange={event => setToDate(event.target.value)} /></label><span>Período máximo: 12 meses</span></section>
    {query.error && <p className="feedback error">{query.error.message || 'Não foi possível carregar os relatórios.'}</p>}
    {query.isLoading ? <p className="feedback">Carregando relatórios...</p> : report && <>
      <section className="report-cards">{cards.map(card => <article className="report-card" key={card.label}><div className="report-card-top"><span>{card.label}</span><i className={`stat-icon ${card.tone}`}><card.icon size={18}/></i></div><strong>{card.value}</strong><small>{card.note}</small></article>)}</section>
      <section className="panel report-chart-panel"><div className="panel-heading"><div><h3>Vendas e despesas por dia</h3><p>Vendas de produtos e despesas pagas no período.</p></div><div className="report-legend"><span><i className="report-dot report-sales-dot"/>Vendas</span><span><i className="report-dot report-expenses-dot"/>Despesas</span></div></div>
        <div className="report-chart-scroll"><div className="report-bars">{report.series.map(item => <div className="report-bar-day" key={item.date} title={`${new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR')}: vendas ${money(item.sales)} · despesas ${money(item.expenses)}`}><div className="report-bar-pair"><i className="report-sales-bar" style={{ height: `${Math.max(item.sales ? 3 : 0, item.sales / maxBar * 150)}px` }}/><i className="report-expenses-bar" style={{ height: `${Math.max(item.expenses ? 3 : 0, item.expenses / maxBar * 150)}px` }}/></div><small>{new Date(`${item.date}T12:00:00`).getDate()}</small></div>)}</div></div>
      </section>
      <div className="report-tables-grid">
        <section className="panel report-table-panel"><div className="panel-heading"><div><h3>Ordens por status</h3><p>{report.totals.orders} ordem(ns) criada(s) no período.</p></div></div>{report.ordersByStatus.length ? <div className="report-status-list">{report.ordersByStatus.map(item => <div key={item.status}><span>{labels[item.status] || item.status}</span><strong>{item.count}</strong><i><b style={{ width: `${Math.max(4, item.count / report.totals.orders * 100)}%` }}/></i></div>)}</div> : <p className="report-empty">Nenhuma ordem no período.</p>}</section>
        <section className="panel report-table-panel"><div className="panel-heading"><div><h3>Produtos mais vendidos</h3><p>Classificados pela quantidade vendida.</p></div></div>{report.topProducts.length ? <div className="table-scroll"><table><thead><tr><th>PRODUTO</th><th>UNIDADES</th><th>TOTAL VENDIDO</th></tr></thead><tbody>{report.topProducts.map(item => <tr key={item.id}><td>{item.name}</td><td>{item.quantity}</td><td>{money(item.total)}</td></tr>)}</tbody></table></div> : <p className="report-empty">Nenhum produto vendido no período.</p>}</section>
      </div>
      <section className="panel report-appointments"><div className="panel-heading"><div><h3>Agenda por status</h3><p>{report.totals.appointments} agendamento(s) no período.</p></div></div>{report.appointmentsByStatus.length ? <div className="report-appointment-pills">{report.appointmentsByStatus.map(item => <span key={item.status}>{labels[item.status] || item.status}<strong>{item.count}</strong></span>)}</div> : <p className="report-empty">Nenhum agendamento no período.</p>}</section>
    </>}
  </div>;
}
