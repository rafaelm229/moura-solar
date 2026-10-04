import { test, expect } from '@playwright/test';

const password = 'E2e-test-password-2026';

for (const [width, height] of [
  [360, 800],
  [768, 1024],
  [1440, 900],
]) {
  test(`full proposal commercial lifecycle (PDF, delivery tracking, Gate B, formal acceptance) at ${width}px`, async ({
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
    await page.getByLabel('Nome Completo / Razão Social *').fill(`Solar Proposta Silva ${width}`);
    await page
      .getByLabel('Telefone / WhatsApp')
      .fill(`(31) 96666-${width.toString().padStart(4, '0')}`);
    await page.getByLabel('Cidade').fill('Belo Horizonte');
    await page.getByRole('button', { name: 'Salvar Cliente' }).click();

    await expect(
      page.getByRole('heading', { name: `Solar Proposta Silva ${width}` }),
    ).toBeVisible();

    // 4. Create opportunity from customer detail panel
    await page.getByRole('button', { name: '+ Nova Oportunidade' }).click();
    await expect(page.getByRole('heading', { name: 'Oportunidades' })).toBeVisible();

    await page.getByLabel('Título da Negociação *').fill(`Negócio Proposta ${width}`);
    await page.getByLabel('Consumo Médio Estimado (kWh/mês)').fill('600');
    await page
      .getByLabel('Resumo da Necessidade *')
      .fill('Proposta comercial completa para sistema fotovoltaico');
    await page
      .getByLabel('Assunto da Atividade *')
      .fill('Apresentação de proposta técnica e comercial');
    await page.getByRole('button', { name: 'Criar Oportunidade' }).click();

    await expect(
      page.getByRole('heading', { name: new RegExp(`Negócio Proposta ${width}`) }),
    ).toBeVisible();

    // 5. Navigate to Consumo & Vistoria sub-tab
    await page.getByRole('button', { name: 'Consumo & Vistoria' }).click();

    // Create and link utility unit
    await page.getByRole('button', { name: '+ Cadastrar Nova Unidade Consumidora' }).click();
    await page.getByLabel('Código da UC *').fill(`UC-PROP-${width}-001`);
    await page.getByLabel('Concessionária *').fill('Cemig Distribuição');
    await page.getByRole('button', { name: 'Salvar e Vincular UC' }).click();

    await expect(page.getByText(`UC-PROP-${width}-001`)).toBeVisible();

    // Fill in technical survey and conclude
    await page.getByRole('button', { name: '+ Iniciar Levantamento Técnico' }).click();
    await page.getByRole('button', { name: 'Salvar Levantamento' }).click();
    await page.getByRole('button', { name: '✔ Concluir e Validar Vistoria Técnica' }).click();
    await expect(page.getByText('Vistoria Concluída')).toBeVisible();

    // 6. Navigate to Dimensionamento & Custos sub-tab
    await page.getByRole('button', { name: 'Dimensionamento & Custos' }).click();

    // Calculate suggestion and create design
    await page.getByRole('button', { name: 'Calcular Sugestão de Dimensionamento' }).click();
    await expect(page.getByText('SUGESTÃO TÉCNICA AUTOMATIZADA')).toBeVisible();

    await page
      .getByRole('button', { name: 'Criar Dimensionamento a partir desta Sugestão' })
      .click();

    await expect(page.getByText('v1 (DRAFT)').first()).toBeVisible();

    // Approve Version 1 (SPEC-005)
    await page.getByRole('button', { name: '✔ Aprovar Versão do Dimensionamento' }).click();
    await expect(page.getByTestId('approval-dialog')).toBeVisible();

    const confirmApprovalBtn = page.getByTestId('confirm-approval-btn');
    if (await confirmApprovalBtn.isDisabled()) {
      await page
        .getByTestId('override-margin-input')
        .fill('Margem aprovada estrategicamente pela diretoria');
    }
    await confirmApprovalBtn.click();

    await expect(page.getByText('v1 (APPROVED)').first()).toBeVisible();

    // 7. Navigate to Propostas Comerciais sub-tab
    await page.getByRole('button', { name: 'Propostas Comerciais' }).click();

    // Verify empty state is visible
    await expect(page.getByText('Nenhuma proposta emitida')).toBeVisible();

    // Click "+ Nova Proposta Comercial" or "Criar Primeira Proposta"
    await page
      .getByRole('button', { name: /\+ Nova Proposta Comercial|Criar Primeira Proposta/ })
      .first()
      .click();
    await expect(
      page.getByRole('heading', { name: 'Emitir Nova Proposta Comercial (PDF)' }),
    ).toBeVisible();

    // Verify approved design version option is listed in dropdown
    const designSelect = page.getByLabel('Dimensionamento Técnico Aprovado *');
    await expect(designSelect).toBeVisible();

    // Fill in validity and observations
    await page.getByLabel('Prazo de Validade (dias corridos) *').fill('10');
    await page
      .getByLabel('Observações Comerciais (impressas no PDF)')
      .fill('Instalação prevista para até 15 dias úteis após homologação.');

    // Submit proposal generation
    await page.getByRole('button', { name: 'Gerar Proposta e PDF Oficial' }).click();

    // Verify proposal card is created with code and READY version
    await expect(page.getByText(/PROP-\d+/).first()).toBeVisible();
    await expect(page.getByText('Versão 1').first()).toBeVisible();
    await expect(page.getByText('READY').first()).toBeVisible();

    // Verify technical and commercial metrics
    await expect(page.getByText('Potência Pico').first()).toBeVisible();
    await expect(page.getByText('Geração Estimada').first()).toBeVisible();
    await expect(page.getByText('Valor do Investimento (Preço Final)').first()).toBeVisible();

    // Verify PDF document info and download button
    await expect(page.getByText(/proposta-PROP-\d+-v1\.pdf/).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Baixar PDF' }).first()).toBeVisible();

    // 8. Gate B: Record Delivery (WhatsApp)
    await page
      .getByRole('button', { name: /Registrar Envio/ })
      .first()
      .click();
    await expect(
      page.getByRole('heading', { name: 'Registrar Envio da Proposta (Gate B)' }),
    ).toBeVisible();

    await page.getByLabel('Destinatário *').fill(`(31) 98888-${width.toString().padStart(4, '0')}`);
    await page
      .getByLabel('Notas do Envio')
      .fill('Enviado pelo WhatsApp corporativo ao diretor financeiro da empresa.');
    await page.getByRole('button', { name: 'Confirmar Envio' }).click();

    // Verify status updated to SENT and delivery record appears
    await expect(page.getByText('SENT').first()).toBeVisible();
    await expect(page.getByText(/Histórico de Envios/)).toBeVisible();
    await expect(page.getByText(`(31) 98888-${width.toString().padStart(4, '0')}`)).toBeVisible();

    // Verify Gate B transition: Opportunity State advances to PROPOSTA_APRESENTADA
    await expect(page.getByText('PROPOSTA_APRESENTADA').first()).toBeVisible();

    // 9. Record Formal Customer Acceptance
    await page
      .getByRole('button', { name: /Registrar Aceite Formal/ })
      .first()
      .click();
    await expect(
      page.getByRole('heading', { name: 'Registrar Aceite Formal do Cliente' }),
    ).toBeVisible();

    await page
      .getByLabel('Nome do Decisor / Signatário *')
      .fill('Dr. Marcos Antunes (Diretor Executivo)');
    await page
      .getByLabel('Observações do Aceite')
      .fill('Aceite confirmado formalmente pelo cliente com autorização de contratação.');
    await page.getByRole('button', { name: 'Confirmar Aceite Formal' }).first().click();

    // Verify version marked ACCEPTED, proposal marked CONTRATADA
    await expect(page.getByText('ACCEPTED').first()).toBeVisible();
    await expect(page.getByText('CONTRATADA (ACEITE FORMAL)')).toBeVisible();
    await expect(page.getByText('Proposta Comercial Aceita Formalmente')).toBeVisible();
    await expect(page.getByText('Dr. Marcos Antunes (Diretor Executivo)')).toBeVisible();

    // Verify Opportunity State is now CONTRATACAO
    await expect(page.getByText('CONTRATACAO').first()).toBeVisible();

    // 10. Check viewport responsiveness (no horizontal scrollbar)
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);

    // Save screenshots
    await page.screenshot({
      path: `docs/evidencias/m4/proposta-${width}.png`,
      fullPage: true,
    });
    await page.screenshot({
      path: testInfo.outputPath(`proposta-${width}.png`),
      fullPage: true,
    });
  });
}
