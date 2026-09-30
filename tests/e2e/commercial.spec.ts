import { test, expect } from '@playwright/test';

const password = 'E2e-test-password-2026';

for (const [width, height] of [
  [360, 800],
  [1440, 900],
]) {
  test(`seller commercial journey from customer to qualification and activities at ${width}px`, async ({
    page,
    browser,
    request,
  }, testInfo) => {
    await page.setViewportSize({ width, height });

    // 1. Ensure bootstrap is initialized
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

    // 2. Admin logs in to invite seller
    await page.goto('/');
    await page.getByLabel('E-mail', { exact: true }).fill('admin@e2e.test');
    await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Minhas sessões' })).toBeVisible();

    // Invite seller
    await page.getByRole('button', { name: 'Pessoas', exact: true }).click();
    await page.getByLabel('Nome', { exact: true }).fill(`Vendedor Comercial ${width}`);
    await page.getByLabel('E-mail', { exact: true }).fill(`seller-comm-${width}@e2e.test`);
    await page
      .getByRole('combobox', { name: 'Papel', exact: true })
      .selectOption({ label: 'Vendedor' });
    await page.getByRole('button', { name: 'Gerar convite' }).click();

    const linkField = page.getByLabel('Link de acesso');
    await expect(linkField).toBeVisible();
    const link = await linkField.inputValue();

    // 3. Seller context
    const device = await browser.newContext({ viewport: { width, height } });
    const seller = await device.newPage();
    await seller.goto(link);
    await seller.getByLabel('Nova senha').fill(password);
    await seller.getByRole('button', { name: 'Salvar senha' }).click();

    await seller.getByLabel('E-mail', { exact: true }).fill(`seller-comm-${width}@e2e.test`);
    await seller.getByLabel('Senha', { exact: true }).fill(password);
    await seller.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(seller.getByRole('heading', { name: 'Minhas sessões' })).toBeVisible();

    // 4. Seller creates customer
    await seller.getByRole('button', { name: 'Clientes', exact: true }).click();
    await expect(seller.getByRole('heading', { name: 'Clientes' })).toBeVisible();

    await seller.getByRole('button', { name: '+ Novo Cliente' }).click();
    await seller.getByLabel('Nome Completo / Razão Social *').fill(`Fazenda Solar ${width}`);
    await seller
      .getByLabel('Telefone / WhatsApp')
      .fill(`(31) 98888-${width.toString().padStart(4, '0')}`);
    await seller.getByLabel('Cidade').fill('Belo Horizonte');
    await seller.getByRole('button', { name: 'Salvar Cliente' }).click();

    await expect(seller.getByRole('heading', { name: `Fazenda Solar ${width}` })).toBeVisible();

    // 5. Seller creates opportunity from customer detail panel
    await seller.getByRole('button', { name: '+ Nova Oportunidade' }).click();
    await expect(seller.getByRole('heading', { name: 'Oportunidades' })).toBeVisible();

    await seller.getByLabel('Título da Negociação *').fill(`Projeto Rural 25kWp ${width}`);
    await seller.getByLabel('Consumo Médio Estimado (kWh/mês)').fill('1800');
    await seller
      .getByLabel('Resumo da Necessidade *')
      .fill('Redução de custo de irrigação para tarifa rural');
    await seller
      .getByLabel('Assunto da Atividade *')
      .fill('Reunião técnica inicial com proprietário');
    await seller.getByRole('button', { name: 'Criar Oportunidade' }).click();

    await expect(
      seller.getByRole('heading', { name: new RegExp(`Projeto Rural 25kWp ${width}`) }),
    ).toBeVisible();
    await expect(seller.getByText('NOVO', { exact: true }).first()).toBeVisible();

    // 6. Seller qualifies opportunity (Gate A)
    await seller.getByRole('button', { name: /Qualificar Oportunidade/i }).click();
    await seller
      .getByLabel('Resumo Confirmado da Necessidade *')
      .fill('Necessidade confirmada: 3 transformadores trifásicos 220V');
    await seller.getByRole('button', { name: 'Confirmar Qualificação' }).click();

    await expect(seller.getByText('QUALIFICADO', { exact: true }).first()).toBeVisible();
    await expect(seller.getByText('NOVO → QUALIFICADO').first()).toBeVisible();

    // 7. Seller navigates to Activities and completes the scheduled activity
    if (width < 768) {
      await seller.getByText('Mais', { exact: true }).click();
    }
    await seller.getByRole('button', { name: 'Atividades', exact: true }).click();
    await expect(seller.getByRole('heading', { name: 'Atividades Comerciais' })).toBeVisible();

    await expect(
      seller.getByText('Reunião técnica inicial com proprietário').first(),
    ).toBeVisible();

    // Complete the activity
    await seller.getByRole('button', { name: 'Concluir' }).first().click();
    await expect(seller.getByRole('heading', { name: 'Concluir Atividade' })).toBeVisible();
    await seller.getByRole('button', { name: 'Confirmar Conclusão' }).click();

    // Verify activity moved to completed state in "Todas" tab
    await seller.getByRole('tab', { name: 'Todas' }).click();
    await expect(seller.getByText('Concluída').first()).toBeVisible();

    // 8. Viewport and responsiveness check
    await expect
      .poll(() => seller.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);

    await seller.screenshot({
      path: testInfo.outputPath(`comercial-${width}.png`),
      fullPage: true,
    });
  });
}
