import { test, expect } from '@playwright/test';

const password = 'E2e-test-password-2026';

for (const [width, height] of [
  [360, 800],
  [768, 1024],
  [1440, 900],
]) {
  test(`engineer/seller journey for sizing, consumption history, and margin governance at ${width}px`, async ({
    page,
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

    // 2. Admin logs in
    await page.goto('/');
    await page.getByLabel('E-mail', { exact: true }).fill('admin@e2e.test');
    await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Minhas sessões' })).toBeVisible();

    // 3. Navigate to Clientes and create customer
    if (width < 768) {
      await page.getByText('Mais', { exact: true }).click();
    }
    await page.getByRole('button', { name: 'Clientes', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();

    await page.getByRole('button', { name: '+ Novo Cliente' }).click();
    await page
      .getByLabel('Nome Completo / Razão Social *')
      .fill(`Solar Residencial Silva ${width}`);
    await page
      .getByLabel('Telefone / WhatsApp')
      .fill(`(31) 95555-${width.toString().padStart(4, '0')}`);
    await page.getByLabel('Cidade').fill('Belo Horizonte');
    await page.getByRole('button', { name: 'Salvar Cliente' }).click();

    await expect(
      page.getByRole('heading', { name: `Solar Residencial Silva ${width}` }),
    ).toBeVisible();

    // 4. Create opportunity from customer detail panel
    await page.getByRole('button', { name: '+ Nova Oportunidade' }).click();
    await expect(page.getByRole('heading', { name: 'Oportunidades' })).toBeVisible();

    await page.getByLabel('Título da Negociação *').fill(`Residência Silva 10kWp ${width}`);
    await page.getByLabel('Consumo Médio Estimado (kWh/mês)').fill('600');
    await page
      .getByLabel('Resumo da Necessidade *')
      .fill('Dimensionamento completo on-grid para residência urbana');
    await page.getByLabel('Assunto da Atividade *').fill('Vistoria e dimensionamento técnico');
    await page.getByRole('button', { name: 'Criar Oportunidade' }).click();

    await expect(
      page.getByRole('heading', { name: new RegExp(`Residência Silva 10kWp ${width}`) }),
    ).toBeVisible();

    // 5. Navigate to Consumo & Vistoria sub-tab
    await page.getByRole('button', { name: '⚡ Consumo & Vistoria' }).click();

    // Create and link utility unit
    await page.getByRole('button', { name: '+ Cadastrar Nova Unidade Consumidora' }).click();
    await page.getByLabel('Código da UC *').fill(`UC-${width}-9876`);
    await page.getByLabel('Concessionária *').fill('Neoenergia');
    await page.getByRole('button', { name: 'Salvar e Vincular UC' }).click();

    await expect(page.getByText(`UC-${width}-9876`)).toBeVisible();

    // Register 2 consumption readings to trigger incomplete history alert
    await page.getByLabel('Mês de Referência (AAAA-MM) *').fill('2026-06');
    await page.getByLabel('Consumo Mensal (kWh) *').fill('550');
    await page.getByLabel('Valor Faturado (R$)').fill('520.00');
    await page.getByRole('button', { name: 'Salvar Leitura' }).click();
    const readingsContainer = page.locator(width < 768 ? '.mobile-readings-list' : '.desktop-only');
    await expect(readingsContainer.getByText('550 kWh')).toBeVisible();

    await page.getByLabel('Mês de Referência (AAAA-MM) *').fill('2026-07');
    await page.getByLabel('Consumo Mensal (kWh) *').fill('650');
    await page.getByLabel('Valor Faturado (R$)').fill('620.00');
    await page.getByRole('button', { name: 'Salvar Leitura' }).click();

    await expect(readingsContainer.getByText('650 kWh')).toBeVisible();

    // SPEC-005 item 16 Acceptance Criteria: Incomplete history must be prominently warned
    await expect(page.getByTestId('incomplete-history-notice')).toBeVisible();
    await expect(page.getByText('2 / 12')).toBeVisible();
    await expect(page.getByText('600 kWh').first()).toBeVisible(); // (550 + 650) / 2 = 600

    // Fill in technical survey
    await page.getByRole('button', { name: '+ Iniciar Levantamento Técnico' }).click();
    await page.getByRole('button', { name: 'Salvar Levantamento' }).click();
    await expect(page.getByText('Em Elaboração (Rascunho)')).toBeVisible();

    await page.getByRole('button', { name: '✔ Concluir e Validar Vistoria Técnica' }).click();
    await expect(page.getByText('Vistoria Concluída')).toBeVisible();

    // 6. Navigate to Dimensionamento & Custos sub-tab
    await page.getByRole('button', { name: '☀️ Dimensionamento & Custos' }).click();

    // Assistant pre-fills target kWh
    await expect(page.getByLabel('Geração Mensal Alvo (kWh/mês) *')).toHaveValue('600');

    // Calculate suggestion
    await page.getByRole('button', { name: 'Calcular Sugestão de Dimensionamento' }).click();
    await expect(page.getByText('SUGESTÃO TÉCNICA AUTOMATIZADA')).toBeVisible();

    // Create Design from suggestion
    await page
      .getByRole('button', { name: 'Criar Dimensionamento a partir desta Sugestão' })
      .click();

    // Verify Version 1 is active in Draft
    await expect(page.getByText('v1 (DRAFT)').first()).toBeVisible();
    await expect(page.getByText('POTÊNCIA DC')).toBeVisible();

    // Verify BOM and Pricing panel (SPEC-005 items 8, 9, 16)
    await expect(
      page.getByRole('heading', { name: 'Composição de Custos, Markup e Margem Bruta' }),
    ).toBeVisible();

    // Change markup to 10% to trigger low margin governance rule (< 20%)
    const markupInput = page.getByLabel('Markup sobre o Custo Total (%) *');
    await markupInput.fill('10');

    // Verify low margin alert appears
    await expect(page.getByTestId('low-margin-alert')).toBeVisible();

    // Try to approve version
    await page.getByRole('button', { name: '✔ Aprovar Versão do Dimensionamento' }).click();
    await expect(page.getByTestId('approval-dialog')).toBeVisible();

    // Confirm button must be disabled until required override justification is provided
    const confirmApprovalBtn = page.getByTestId('confirm-approval-btn');
    await expect(confirmApprovalBtn).toBeDisabled();

    // Fill in mandatory governance override justification
    await page
      .getByTestId('override-margin-input')
      .fill('Aprovação comercial estratégica autorizada pela diretoria executiva');
    await expect(confirmApprovalBtn).toBeEnabled();

    // Approve and freeze version
    await confirmApprovalBtn.click();

    // Verify Version 1 is now APPROVED and immutable
    await expect(page.getByText('v1 (APPROVED)').first()).toBeVisible();
    await expect(page.getByText(/Versão 1 Aprovada em/)).toBeVisible();
    await expect(page.getByText('Esta versão foi congelada e é imutável')).toBeVisible();

    // Verify versioning: creating a new version clones from approved version
    await page.getByRole('button', { name: '+ Nova Versão' }).click();
    await expect(page.getByText('v2 (DRAFT)').first()).toBeVisible();

    // 7. Viewport and responsiveness check
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);

    // Save screenshots
    await page.screenshot({
      path: `docs/evidencias/m3/dimensionamento-${width}.png`,
      fullPage: true,
    });
    await page.screenshot({
      path: testInfo.outputPath(`dimensionamento-${width}.png`),
      fullPage: true,
    });
  });
}
