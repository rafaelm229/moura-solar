import { test, expect } from '@playwright/test';
const password = 'E2e-test-password-2026';
for (const [width, height] of [
  [360, 800],
  [390, 844],
  [768, 1024],
  [1024, 768],
  [1366, 768],
  [1440, 900],
]) {
  test(`admin invites seller across devices at ${width}px`, async ({
    page,
    browser,
    request,
  }, testInfo) => {
    await page.setViewportSize({ width, height });
    await request.post('http://localhost:3318/api/v1/identity/bootstrap', {
      headers: {
        origin: 'http://localhost:3320',
        'x-requested-with': 'MouraSolar',
        'x-bootstrap-token': 'e2e-test-bootstrap-secret-at-least-32-characters',
      },
      data: {
        email: 'admin@e2e.test',
        name: 'Administrador E2E',
        organization: 'Moura Solar E2E',
        password,
      },
    });
    await page.goto('/');
    await page.getByLabel('E-mail', { exact: true }).fill('admin@e2e.test');
    await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Minhas sessões' })).toBeVisible();
    await page.getByRole('button', { name: 'Pessoas', exact: true }).click();
    await page.getByLabel('Nome', { exact: true }).fill(`Vendedor ${width}`);
    await page.getByLabel('E-mail', { exact: true }).fill(`seller${width}@e2e.test`);
    await page
      .getByRole('combobox', { name: 'Papel', exact: true })
      .selectOption({ label: 'Vendedor' });
    await page.getByRole('button', { name: 'Gerar convite' }).click();
    const linkField = page.getByLabel('Link de acesso');
    await expect(linkField).toBeVisible();
    const link = await linkField.inputValue();
    await expect(
      page.getByRole('heading', { name: `Vendedor ${width}`, exact: true }),
    ).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`equipe-${width}.png`), fullPage: true });
    if (width < 768) await page.getByText('Mais', { exact: true }).click();
    await page.getByRole('button', { name: 'Papéis', exact: true }).click();
    await page.getByRole('button', { name: 'Editar Vendedor', exact: true }).click();
    await page.getByLabel('Filtrar permissões').fill('proposals:view_margin');
    await expect(page.getByRole('combobox', { name: 'proposals:view_margin' })).toHaveValue('own');
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`papeis-${width}.png`), fullPage: true });
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await page.getByRole('button', { name: 'Equipes', exact: true }).click();
    await page.getByRole('button', { name: 'Criar equipe', exact: true }).click();
    await page.getByLabel('Nome da equipe').fill(`Equipe ${width}`);
    await page.getByRole('checkbox', { name: `Vendedor ${width}`, exact: true }).check();
    await page.getByRole('button', { name: 'Salvar equipe' }).click();
    await expect(page.getByRole('heading', { name: `Equipe ${width}`, exact: true })).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`equipes-${width}.png`), fullPage: true });
    const device = await browser.newContext({ viewport: { width, height } });
    const seller = await device.newPage();
    await seller.goto(link);
    await seller.getByLabel('Nova senha').fill(password);
    await seller.getByRole('button', { name: 'Salvar senha' }).click();
    await seller.getByLabel('E-mail', { exact: true }).fill(`seller${width}@e2e.test`);
    await seller.getByLabel('Senha', { exact: true }).fill(password);
    await seller.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(seller.getByRole('heading', { name: 'Minhas sessões' })).toBeVisible();
    await expect(seller.getByRole('button', { name: 'Pessoas', exact: true })).toHaveCount(0);
    const denied = await seller.evaluate(
      async () => (await fetch('/api/v1/identity/members')).status,
    );
    expect(denied).toBe(403);
    // API outage on an operational query does not redirect or destroy a valid session.
    await seller.route('**/api/v1/identity/audit', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Serviço temporariamente indisponível.' }),
      }),
    );
    if (width < 768) await seller.getByText('Mais', { exact: true }).click();
    await seller.getByRole('button', { name: 'Auditoria', exact: true }).click();
    await expect(seller.getByRole('alert').filter({ hasText: 'indisponível' })).toBeVisible();
    await expect(seller.getByRole('button', { name: 'Sair', exact: true })).toBeVisible();
    if (width < 768) await seller.getByText('Mais', { exact: true }).click();
    await seller.getByRole('button', { name: 'Minhas sessões', exact: true }).click();
    await expect
      .poll(() => seller.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await seller.screenshot({ path: testInfo.outputPath(`sessoes-${width}.png`), fullPage: true });
    await seller.keyboard.press('Tab');
    expect(await seller.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
    await device.close();
  });
}
