import { test, expect, customerId, deviceId } from './fixtures';

test('TM-QA-001: required customer name is explained in Portuguese in English Chrome', async ({ page, apiState }) => {
  await page.goto('/clientes');
  await page.getByRole('button', { name: 'Novo cliente', exact: true }).first().click();
  const form = page.locator('form.customer-form-modal');
  await form.getByRole('button', { name: 'Salvar cliente', exact: true }).click();
  const name = form.getByPlaceholder('Nome do cliente');
  await expect(name).toBeFocused();
  expect(await name.evaluate((input: HTMLInputElement) => input.validationMessage)).toBe('Preencha o campo Nome completo / Razão social.');
  expect(apiState.customerPayloads).toHaveLength(0);
  await name.fill('Cliente de regressão');
  await form.getByRole('button', { name: 'Salvar cliente', exact: true }).click();
  await expect(form).toBeHidden();
  expect(apiState.customerPayloads[0].name).toBe('Cliente de regressão');
});

test('TM-QA-001: validation also applies outside Customers and clears after editing', async ({ page, apiState }) => {
  await page.goto('/fornecedores');
  await page.getByRole('button', { name: 'Novo fornecedor', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Salvar fornecedor', exact: true }).click();
  const name = dialog.getByLabel('Nome / razão social');
  expect(await name.evaluate((input: HTMLInputElement) => input.validationMessage)).toBe('Preencha o campo Nome / razão social.');
  await name.fill('Fornecedor QA');
  const email = dialog.getByLabel('E-mail', { exact: true });
  await email.fill('inválido');
  await dialog.getByRole('button', { name: 'Salvar fornecedor', exact: true }).click();
  expect(await email.evaluate((input: HTMLInputElement) => input.validationMessage)).toContain('Informe um e-mail válido');
  await email.fill('compras@example.test');
  expect(await email.evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(true);
});

test('TM-QA-002: Nova ordem opens and explains the missing customer', async ({ page, apiState }) => {
  apiState.customers = [];
  await page.goto('/ordens');
  await page.getByRole('button', { name: 'Nova ordem', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Nova ordem de serviço' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Cadastre um cliente para abrir a ordem.', { exact: false })).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Ir para clientes' })).toHaveAttribute('href', '/clientes');
  await expect(dialog.getByRole('button', { name: 'Salvar ordem' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Nova ordem', exact: true })).toBeFocused();
});

test('TM-QA-002: registers an order and a new device for the selected customer', async ({ page, apiState }) => {
  await page.goto('/ordens');
  await page.getByRole('button', { name: 'Nova ordem', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Nova ordem de serviço' });
  await dialog.getByRole('combobox', { name: 'Cliente', exact: true }).selectOption(customerId);
  await dialog.getByLabel('Marca', { exact: true }).fill('Samsung');
  await dialog.getByLabel('Modelo', { exact: true }).fill('Galaxy A54');
  await dialog.getByLabel('Defeito relatado', { exact: true }).fill('Tela sem imagem');
  await dialog.getByRole('button', { name: 'Salvar ordem' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('cell', { name: 'Samsung Galaxy A54' })).toBeVisible();
  expect(apiState.orderPayloads[0]).toMatchObject({ customerId, device: { brand: 'Samsung', model: 'Galaxy A54' }, reportedIssue: 'Tela sem imagem' });
  expect(apiState.orderPayloads[0].deviceId).toBeUndefined();
});

test('TM-QA-002: uses an existing device and shows save errors without closing', async ({ page, apiState }) => {
  apiState.orderError = true;
  await page.goto('/ordens');
  await page.getByRole('button', { name: 'Nova ordem', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Cliente', exact: true }).selectOption(customerId);
  await dialog.getByRole('combobox', { name: 'Aparelho', exact: true }).selectOption(deviceId);
  await expect(dialog.getByLabel('Marca', { exact: true })).toHaveCount(0);
  await dialog.getByLabel('Defeito relatado', { exact: true }).fill('Bateria descarregando');
  await dialog.getByRole('button', { name: 'Salvar ordem' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Não foi possível salvar a ordem.');
  expect(apiState.orderPayloads[0]).toMatchObject({ customerId, deviceId });
  expect(apiState.orderPayloads[0].device).toBeUndefined();
});

test('TM-QA-003: header search opens, focuses the field and navigates to a result', async ({ page, apiState }) => {
  await page.goto('/clientes');
  const button = page.getByRole('button', { name: 'Buscar', exact: true });
  await button.click();
  const dialog = page.getByRole('dialog', { name: 'Busca global' });
  const input = dialog.getByRole('searchbox');
  await expect(input).toBeFocused();
  await input.fill('Cliente QA');
  await dialog.getByRole('link', { name: /Cliente QA/ }).click();
  await expect(page).toHaveURL(`/clientes/${customerId}`);
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Cliente QA', exact: true })).toBeVisible();
});

test('TM-QA-003: search shows empty and error states and closes with Escape', async ({ page, apiState }) => {
  await page.goto('/clientes');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Busca global' });
  await dialog.getByRole('searchbox').fill('inexistente');
  await expect(dialog.getByText('Nenhum resultado encontrado.')).toBeVisible();
  apiState.searchError = true;
  await dialog.getByRole('searchbox').fill('outra busca');
  await expect(dialog.getByRole('alert')).toContainText('Não foi possível realizar a busca.');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Buscar', exact: true })).toBeFocused();
});

for (const end of ['09:15', '09:30', '10:00']) {
  test(`TM-QA-004: rejects end ${end} before or equal to 10:00 without a request`, async ({ page, apiState }) => {
    await page.goto('/agenda');
    await page.getByRole('button', { name: 'Novo agendamento', exact: true }).click();
    const form = page.getByRole('form', { name: 'Novo agendamento' });
    await form.getByRole('combobox', { name: 'Cliente', exact: true }).selectOption(customerId);
    await form.getByLabel('Início', { exact: true }).fill('2026-11-05T10:00');
    await form.getByLabel('Término', { exact: true }).fill(`2026-11-05T${end}`);
    await form.getByRole('button', { name: 'Salvar agendamento' }).click();
    await expect(form.getByRole('alert')).toHaveText('O horário de término deve ser posterior ao início.');
    expect(apiState.appointmentPayloads).toHaveLength(0);
  });
}

test('TM-QA-004: preserves 11:15 in the request and in the appointment card', async ({ page, apiState }) => {
  await page.goto('/agenda');
  await page.getByRole('button', { name: 'Novo agendamento', exact: true }).click();
  const form = page.getByRole('form', { name: 'Novo agendamento' });
  await form.getByRole('combobox', { name: 'Cliente', exact: true }).selectOption(customerId);
  await form.getByLabel('Início', { exact: true }).fill('2026-11-05T10:00');
  await form.getByLabel('Término', { exact: true }).fill('2026-11-05T11:15');
  // Editing another field must not restore the default 10:30 end.
  await form.getByLabel('Motivo do atendimento').fill('Retorno QA');
  await expect(form.getByLabel('Término', { exact: true })).toHaveValue('2026-11-05T11:15');
  await form.getByRole('button', { name: 'Salvar agendamento' }).click();
  await expect(form).toBeHidden();
  expect(apiState.appointmentPayloads[0]).toMatchObject({ startsAt: '2026-11-05T13:00:00.000Z', endsAt: '2026-11-05T14:15:00.000Z' });
  await expect(page.getByText('10:00 – 11:15', { exact: true })).toBeVisible();
});

test('TM-QA-004: submits the value visible in the native control even without a React change event', async ({ page, apiState }) => {
  await page.goto('/agenda');
  await page.getByRole('button', { name: 'Novo agendamento', exact: true }).click();
  const form = page.getByRole('form', { name: 'Novo agendamento' });
  await form.getByRole('combobox', { name: 'Cliente', exact: true }).selectOption(customerId);
  await form.getByLabel('Início', { exact: true }).fill('2026-11-05T10:00');
  await form.getByLabel('Término', { exact: true }).evaluate((input: HTMLInputElement) => { input.value = '2026-11-05T11:15'; });
  await form.getByLabel('Aparelho').fill('iPhone QA');
  await expect(form.getByLabel('Término', { exact: true })).toHaveValue('2026-11-05T11:15');
  await form.getByRole('button', { name: 'Salvar agendamento' }).click();
  await expect(form).toBeHidden();
  expect(apiState.appointmentPayloads[0].endsAt).toBe('2026-11-05T14:15:00.000Z');
});
