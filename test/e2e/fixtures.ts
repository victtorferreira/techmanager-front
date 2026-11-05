import { test as base, expect } from '@playwright/test';
export const customerId = '11111111-1111-4111-8111-111111111111';
export const deviceId = '22222222-2222-4222-8222-222222222222';
export const orderId = '33333333-3333-4333-8333-333333333333';
export const customer = { id: customerId, name: 'Cliente QA', customerType: 'INDIVIDUAL', active: true, phone: '11999990000', whatsappSameAsPhone: true, classification: 'NORMAL', creditLimit: '0', discountPercent: '0', priceTable: 'RETAIL', createdAt: '2026-11-05T12:00:00Z' };
export const device = { id: deviceId, brand: 'Apple', model: 'iPhone 13' };
type ApiState = { customers: typeof customer[]; orders: any[]; appointments: any[]; orderPayloads: any[]; appointmentPayloads: any[]; customerPayloads: any[]; orderError: boolean; searchError: boolean };
export const test = base.extend<{ apiState: ApiState }>({
  apiState: async ({ page }, use) => {
    const state: ApiState = { customers: [{ ...customer }], orders: [], appointments: [], orderPayloads: [], appointmentPayloads: [], customerPayloads: [], orderError: false, searchError: false };
    await page.addInitScript(() => {
      localStorage.setItem('techmanager_token', 'qa-local-token');
      localStorage.setItem('techmanager_user', JSON.stringify({ id: 'owner', name: 'Proprietário QA', email: 'qa@example.test', role: 'OWNER' }));
    });
    await page.route('**/api/**', async route => {
      const request = route.request(); const url = new URL(request.url()); const path = url.pathname.replace('/api', '');
      const reply = (json: unknown, status = 200) => route.fulfill({ status, json });
      if (request.method() === 'OPTIONS') return reply({});
      if (path === '/tenant/profile') return reply({ name: 'Assistência QA', slug: 'qa', logo: null });
      if (path === '/customers' && request.method() === 'POST') {
        const payload = request.postDataJSON(); state.customerPayloads.push(payload);
        const saved = { ...customer, ...payload }; state.customers.push(saved); return reply(saved);
      }
      if (path === '/customers') return reply(state.customers);
      if (path.startsWith('/customers/')) return reply(customer);
      if (path === '/sales' || path === '/products') return reply([]);
      if (path === '/suppliers') return reply({ items: [], total: 0, page: 1, pageSize: 20 });
      if (path === '/service-orders/devices') return reply([device]);
      if (path === '/service-orders' && request.method() === 'POST') {
        const payload = request.postDataJSON(); state.orderPayloads.push(payload);
        if (state.orderError) return reply({ message: 'Não foi possível salvar a ordem.' }, 500);
        const order = { id: orderId, number: 1, customerId, ...payload, customer, device: payload.device || device, status: 'RECEIVED', publicRequest: false, createdAt: new Date().toISOString() };
        state.orders.push(order); return reply(order);
      }
      if (path === '/service-orders') return reply(state.orders.filter(row => !url.searchParams.has('orderId') || row.id === url.searchParams.get('orderId')));
      if (path === '/appointments' && request.method() === 'POST') {
        const payload = request.postDataJSON(); state.appointmentPayloads.push(payload);
        const appointment = { id: 'appointment1', ...payload, customer, status: 'SCHEDULED' }; state.appointments.push(appointment); return reply(appointment);
      }
      if (path === '/appointments') return reply(state.appointments);
      if (path === '/search') {
        if (state.searchError) return reply({ message: 'Busca indisponível.' }, 500);
        return reply({ items: url.searchParams.get('q')?.includes('inexistente') ? [] : [{ id: customerId, kind: 'Cliente', title: customer.name, description: customer.phone, href: `/clientes/${customerId}` }] });
      }
      return reply({ message: `Endpoint não simulado: ${path}` }, 404);
    });
    await use(state);
  },
});
export { expect };
