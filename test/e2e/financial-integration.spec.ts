import { test, expect, orderId, customer, device } from './fixtures';

test('purchase form sends supplier, due date and payment together with stock entry', async ({ page, apiState }) => {
  let movement: any;
  const product = { id: 'p1', name: 'Tela QA', active: true, stockQuantity: 10, minimumStock: 1, costPrice: '100', salePrice: '180' };
  await page.route('**/api/products**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/purchases')) return route.fulfill({ json: { items: [], total: 0, totalAmount: '0', suppliers: [], page: 1, pageSize: 30 } });
    if (url.pathname.endsWith('/movements')) {
      if (route.request().method() === 'POST') { movement = route.request().postDataJSON(); return route.fulfill({ json: { id: 'm1' } }); }
      return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 30 } });
    }
    if (url.pathname.endsWith('/service-orders')) return route.fulfill({ json: [] });
    return route.fulfill({ json: [product] });
  });
  await page.route('**/api/suppliers**', route => route.fulfill({ json: { items: [{ id: 's1', name: 'Fornecedor QA', active: true }], total: 1 } }));
  await page.goto('/compras');
  await page.getByRole('combobox', { name: 'Produto para comprar', exact: true }).selectOption('p1');
  await page.getByRole('button', { name: 'Registrar compra', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Fornecedor', exact: true }).selectOption('s1');
  await dialog.getByLabel('Quantidade', { exact: true }).fill('2');
  await dialog.getByLabel('Vencimento', { exact: true }).fill('2026-12-10');
  await dialog.getByRole('button', { name: 'Registrar movimentação' }).click();
  await expect(dialog.getByRole('status')).toHaveText('Movimentação registrada.');
  expect(movement).toMatchObject({ type: 'PURCHASE', quantity: 2, supplierId: 's1', unitCost: 100, payment: { status: 'PENDING', dueAt: '2026-12-10' } });
  expect(movement.requestId).toMatch(/^[\da-f-]{36}$/);
  await dialog.getByLabel('Pagamento da compra').selectOption('PAID');
  await dialog.getByLabel('Forma de pagamento').selectOption('CASH');
  await dialog.getByLabel('Data do pagamento').fill('2026-12-09');
  await dialog.getByRole('button', { name: 'Registrar movimentação' }).click();
  await expect.poll(() => movement.payment.status).toBe('PAID');
  expect(movement.payment).toMatchObject({ paidAt: '2026-12-09', paymentMethod: 'CASH' });
});

test('OS editing, partial receipt and part use refresh the displayed balance and cost', async ({ page, apiState }) => {
  const order: any = { id: orderId, number: 1, reportedIssue: 'Tela quebrada', customer, device, status: 'RECEIVED', createdAt: new Date().toISOString(), totalAmount: '0', laborAmount: '0', partsAmount: '0', financialEntries: [], stockMovements: [] };
  let receivedPayload: any;
  await page.route('**/api/service-orders**', async route => {
    const req = route.request();
    if (req.method() === 'PATCH') { const payload = req.postDataJSON(); Object.assign(order, payload, { totalAmount: Number(payload.laborAmount) + Number(payload.partsAmount) }); return route.fulfill({ json: order }); }
    if (req.method() === 'POST') { receivedPayload = req.postDataJSON(); order.financialEntries.push({ id: 'income1', status: 'PAID', type: 'INCOME', amount: receivedPayload.amount, occurredAt: `${receivedPayload.paidAt}T15:00:00Z` }); return route.fulfill({ json: {} }); }
    return route.fulfill({ json: [order] });
  });
  await page.route('**/api/products**', async route => {
    if (route.request().method() === 'POST') { const payload = route.request().postDataJSON(); expect(payload.serviceOrderId).toBe(orderId); order.stockMovements.push({ productId: 'p1', productName: 'Tela QA', quantity: -payload.quantity, unitCost: '100' }); return route.fulfill({ json: {} }); }
    return route.fulfill({ json: [{ id: 'p1', name: 'Tela QA', active: true, stockQuantity: 10 }] });
  });
  await page.goto(`/ordens?orderId=${orderId}`);
  await page.getByRole('button', { name: 'Atendimento / financeiro' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Mão de obra cobrada (R$)').fill('150');
  await dialog.getByLabel('Peças cobradas ao cliente (R$)').fill('200');
  await dialog.getByRole('button', { name: 'Salvar atendimento e valores' }).click();
  await expect(dialog.locator('.order-finance-summary').getByText(/350,00/)).toHaveCount(3);
  await dialog.getByLabel('Valor recebido (R$)').fill('100');
  await dialog.getByRole('button', { name: 'Registrar recebimento' }).click();
  await expect(dialog.locator('.order-finance-summary').getByText(/250,00/)).toBeVisible();
  expect(receivedPayload.amount).toBe(100);
  expect(receivedPayload.requestId).toMatch(/^[\da-f-]{36}$/);
  await dialog.getByRole('combobox', { name: 'Peça', exact: true }).selectOption('p1');
  await dialog.getByRole('button', { name: 'Registrar peça' }).click();
  await expect(dialog.getByText('Tela QA · Utilizadas: 1', { exact: false })).toBeVisible();
  await expect(dialog.locator('.order-finance-summary').getByText(/100,00/)).toHaveCount(2);
});

test('Finance settles supplier payable with chosen method and actual payment date', async ({ page, apiState }) => {
  let saved: any;
  const entry: any = { id: 'entry1', source: 'PURCHASE', type: 'EXPENSE', status: 'PENDING', category: 'Compra de peças', description: 'Tela QA · Fornecedor QA', amount: '200', occurredAt: new Date().toISOString(), supplierId: 's1' };
  await page.route('**/api/finance/**', async route => {
    if (route.request().method() === 'PATCH') { saved = route.request().postDataJSON(); entry.status = saved.status; entry.paymentMethod = saved.paymentMethod; return route.fulfill({ json: entry }); }
    return route.fulfill({ json: { totals: { income: 0, expenses: entry.status === 'PAID' ? 200 : 0, balance: 0, pendingIncome: 0, pendingExpenses: entry.status === 'PENDING' ? 200 : 0 }, entries: [entry] } });
  });
  await page.goto('/financeiro');
  await page.getByRole('button', { name: 'Pagar', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Forma de pagamento').selectOption('BANK_TRANSFER');
  await dialog.getByLabel('Data realizada').fill('2026-11-12');
  await dialog.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(saved).toMatchObject({ status: 'PAID', paymentMethod: 'BANK_TRANSFER', paidAt: '2026-11-12' });
  await expect(page.getByRole('cell', { name: 'Pago', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver compras do fornecedor' })).toHaveAttribute('href', '/produtos?supplierId=s1');
});

test('Reports show services and supplier spending alongside the consolidated cash figures', async ({ page, apiState }) => {
  await page.route('**/api/reports/summary**', route => route.fulfill({ json: {
    totals: { sales: 500, saleCount: 1, averageTicket: 500, grossProfit: 200, income: 600, expenses: 250, balance: 350, orders: 1, newCustomers: 0, appointments: 0, completedAppointments: 0, lowStock: 0, serviceIncome: 100, serviceRefunds: 0, serviceQuoted: 350, servicePartsCost: 100, serviceResult: 250, purchases: 450, pendingIncome: 250, pendingExpenses: 200 },
    series: [{ date: '2026-11-06', income: 600, sales: 500, expenses: 250, appointments: 0 }], suppliers: [{ id: 's1', name: 'Fornecedor QA', purchases: 2, purchased: 450, paid: 250 }], ordersByStatus: [{ status: 'IN_REPAIR', count: 1 }], topProducts: [], appointmentsByStatus: [],
  } }));
  await page.goto('/relatorios');
  await expect(page.getByText('Serviços recebidos', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Compras e pagamentos por fornecedor' })).toBeVisible();
  await expect(page.getByRole('row', { name: /Fornecedor QA/ })).toContainText('450,00');
  await expect(page.getByRole('row', { name: /Fornecedor QA/ })).toContainText('250,00');
  await expect(page.getByRole('heading', { name: 'Receitas e despesas por dia' })).toBeVisible();
});
