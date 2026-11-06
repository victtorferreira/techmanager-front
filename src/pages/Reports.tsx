import { useMemo, useState } from 'react';
import { BarChart3, Download, Package, ShoppingBag, Users, Wrench } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

type Report = {
  totals: { sales: number; saleCount: number; averageTicket: number; grossProfit: number; income: number; expenses: number; balance: number; orders: number; newCustomers: number; appointments: number; completedAppointments: number; lowStock: number; serviceIncome: number; serviceRefunds: number; serviceQuoted: number; servicePartsCost: number; serviceResult: number; purchases: number; pendingIncome: number; pendingExpenses: number };
  series: Array<{ date: string; sales: number; income: number; expenses: number; appointments: number }>;
  suppliers: Array<{ id: string; name: string; purchases: number; purchased: number; paid: number }>;
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
  const maxBar = Math.max(1, ...(report?.series.flatMap(item => [item.income, item.expenses]) ?? []));

  function exportCsv() {
    if (!report) return;
    const rows: unknown[][] = [
      ['Relatório TechManager', fromDate, toDate], [], ['Indicador', 'Valor'],
      ['Vendas', report.totals.sales], ['Quantidade de vendas', report.totals.saleCount], ['Ticket médio', report.totals.averageTicket],
      ['Lucro bruto estimado', report.totals.grossProfit], ['Receitas', report.totals.income], ['Despesas', report.totals.expenses], ['Saldo', report.totals.balance],
      ['Ordens de serviço', report.totals.orders], ['Novos clientes', report.totals.newCustomers], ['Agendamentos', report.totals.appointments], [],
      ['Recebimentos de OS', report.totals.serviceIncome], ['Estornos de OS', report.totals.serviceRefunds],
      ['Compras registradas', report.totals.purchases], ['A receber', report.totals.pendingIncome], ['A pagar', report.totals.pendingExpenses],
      ['Valor das OS criadas', report.totals.serviceQuoted], ['Custo das peças das OS criadas', report.totals.servicePartsCost], ['Resultado estimado das OS criadas', report.totals.serviceResult], [],
      ['Receitas e despesas por dia', 'Receitas', 'Despesas', 'Agendamentos'],
      ...report.series.map(item => [item.date, item.income, item.expenses, item.appointments]), [],
      ['Fornecedor', 'Registros de compra', 'Compras no período', 'Pagamentos líquidos no período'],
      ...report.suppliers.map(item => [item.name, item.purchases, item.purchased, item.paid]), [],
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
    { label: 'Serviços recebidos', value: money(report.totals.serviceIncome), note: `${money(report.totals.serviceRefunds)} em estornos no período`, icon: Wrench, tone: 'green' },
    { label: 'Compras registradas', value: money(report.totals.purchases), note: 'Compras no período, pagas ou a pagar; exclui canceladas', icon: ShoppingBag, tone: 'orange' },
    { label: 'Contas pendentes', value: money(report.totals.pendingExpenses), note: `${money(report.totals.pendingIncome)} a receber · data prevista no período`, icon: BarChart3, tone: 'violet' },
    { label: 'Resultado estimado das OS', value: money(report.totals.serviceResult), note: `OS criadas no período: ${money(report.totals.serviceQuoted)} cobrados menos ${money(report.totals.servicePartsCost)} em peças; exclui canceladas/sem conserto`, icon: Wrench, tone: 'green' },
  ] : [];

  return <div className="page-stack">
    <div className="section-toolbar reports-toolbar"><div><h2>Relatórios</h2><p>Acompanhe vendas, financeiro, ordens e agenda em um só lugar.</p></div><button className="primary-btn" onClick={exportCsv} disabled={!report}><Download size={16}/> Exportar CSV</button></div>
    <section className="panel report-filters"><label>De<input type="date" value={fromDate} max={toDate || undefined} onChange={event => setFromDate(event.target.value)} /></label><label>Até<input type="date" value={toDate} min={fromDate || undefined} max={dateKey(today)} onChange={event => setToDate(event.target.value)} /></label><span>Período máximo: 12 meses</span></section>
    {query.error && <p className="feedback error">{query.error.message || 'Não foi possível carregar os relatórios.'}</p>}
    {query.isLoading ? <p className="feedback">Carregando relatórios...</p> : report && <>
      <section className="report-cards">{cards.map(card => <article className="report-card" key={card.label}><div className="report-card-top"><span>{card.label}</span><i className={`stat-icon ${card.tone}`}><card.icon size={18}/></i></div><strong>{card.value}</strong><small>{card.note}</small></article>)}</section>
      <section className="panel report-chart-panel"><div className="panel-heading"><div><h3>Receitas e despesas por dia</h3><p>Vendas, recebimentos de serviços, compras pagas e outros lançamentos realizados. Estornos entram na direção oposta.</p></div><div className="report-legend"><span><i className="report-dot report-sales-dot"/>Receitas</span><span><i className="report-dot report-expenses-dot"/>Despesas</span></div></div>
        <div className="report-chart-scroll"><div className="report-bars">{report.series.map(item => <div className="report-bar-day" key={item.date} title={`${new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR')}: receitas ${money(item.income)} · despesas ${money(item.expenses)}`}><div className="report-bar-pair"><i className="report-sales-bar" style={{ height: `${Math.max(item.income ? 3 : 0, item.income / maxBar * 150)}px` }}/><i className="report-expenses-bar" style={{ height: `${Math.max(item.expenses ? 3 : 0, item.expenses / maxBar * 150)}px` }}/></div><small>{new Date(`${item.date}T12:00:00`).getDate()}</small></div>)}</div></div>
      </section>
      <section className="panel"><div className="panel-heading"><div><h3>Compras e pagamentos por fornecedor</h3><p>Compras seguem a data da compra. Pagamentos líquidos seguem a data de pagamento ou estorno e podem incluir compras de outros períodos.</p></div></div>{report.suppliers.length ? <div className="table-scroll"><table><thead><tr><th>FORNECEDOR</th><th>REGISTROS DE COMPRA</th><th>COMPRAS NO PERÍODO</th><th>PAGAMENTOS LÍQUIDOS</th></tr></thead><tbody>{report.suppliers.map(s => <tr key={s.id}><td>{s.name}</td><td>{s.purchases}</td><td>{money(s.purchased)}</td><td>{money(s.paid)}</td></tr>)}</tbody></table></div> : <p className="report-empty">Nenhuma compra ou pagamento vinculado no período.</p>}</section>
      <div className="report-tables-grid">
        <section className="panel report-table-panel"><div className="panel-heading"><div><h3>Ordens por status</h3><p>{report.totals.orders} ordem(ns) criada(s) no período.</p></div></div>{report.ordersByStatus.length ? <div className="report-status-list">{report.ordersByStatus.map(item => <div key={item.status}><span>{labels[item.status] || item.status}</span><strong>{item.count}</strong><i><b style={{ width: `${Math.max(4, item.count / report.totals.orders * 100)}%` }}/></i></div>)}</div> : <p className="report-empty">Nenhuma ordem no período.</p>}</section>
        <section className="panel report-table-panel"><div className="panel-heading"><div><h3>Produtos mais vendidos</h3><p>Classificados pela quantidade vendida.</p></div></div>{report.topProducts.length ? <div className="table-scroll"><table><thead><tr><th>PRODUTO</th><th>UNIDADES</th><th>TOTAL VENDIDO</th></tr></thead><tbody>{report.topProducts.map(item => <tr key={item.id}><td>{item.name}</td><td>{item.quantity}</td><td>{money(item.total)}</td></tr>)}</tbody></table></div> : <p className="report-empty">Nenhum produto vendido no período.</p>}</section>
      </div>
      <section className="panel report-appointments"><div className="panel-heading"><div><h3>Agenda por status</h3><p>{report.totals.appointments} agendamento(s) no período.</p></div></div>{report.appointmentsByStatus.length ? <div className="report-appointment-pills">{report.appointmentsByStatus.map(item => <span key={item.status}>{labels[item.status] || item.status}<strong>{item.count}</strong></span>)}</div> : <p className="report-empty">Nenhum agendamento no período.</p>}</section>
    </>}
  </div>;
}
