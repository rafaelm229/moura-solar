import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const password = 'E2e-test-password-2026';

// Prepare a mock signed PDF file for upload
const mockSignedPdfPath = join('/tmp', 'contrato-assinado-e2e.pdf');
try {
  writeFileSync(
    mockSignedPdfPath,
    Buffer.from('%PDF-1.4 Mock Signed Contract Moura Solar E2E Test\n%%EOF'),
  );
} catch {
  // Ignored
}

for (const [width, height] of [
  [360, 800],
  [768, 1024],
  [1440, 900],
]) {
  test(`full contract lifecycle (DOCX/PDF engine, delivery, signed upload, conference checklist, Gate C to VENDIDO) at ${width}px`, async ({
    page,
    request,
  }, testInfo) => {
    test.setTimeout(120000);
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
    await page.getByLabel('Nome Completo / Razão Social *').fill(`Cliente Contrato ${width}`);
    await page
      .getByLabel('Telefone / WhatsApp')
      .fill(`(81) 97777-${width.toString().padStart(4, '0')}`);
    await page.getByLabel('Cidade').fill('Recife');
    await page.getByRole('button', { name: 'Salvar Cliente' }).click();

    await expect(page.getByRole('heading', { name: `Cliente Contrato ${width}` })).toBeVisible();

    // 4. Create opportunity from customer detail panel
    await page.getByRole('button', { name: '+ Nova Oportunidade' }).click();
    await expect(page.getByRole('heading', { name: 'Oportunidades' })).toBeVisible();

    await page.getByLabel('Título da Negociação *').fill(`Negócio Contrato ${width}`);
    await page.getByLabel('Consumo Médio Estimado (kWh/mês)').fill('750');
    await page
      .getByLabel('Resumo da Necessidade *')
      .fill('Fornecimento e instalação de sistema solar completo');
    await page
      .getByLabel('Assunto da Atividade *')
      .fill('Apresentação de proposta técnica e comercial');
    await page.getByRole('button', { name: 'Criar Oportunidade' }).click();

    await expect(
      page.getByRole('heading', { name: new RegExp(`Negócio Contrato ${width}`) }),
    ).toBeVisible();

    // 5. Navigate to Consumo & Vistoria sub-tab
    await page.getByRole('button', { name: 'Consumo & Vistoria' }).click();

    // Create and link utility unit
    await page.getByRole('button', { name: '+ Cadastrar Nova Unidade Consumidora' }).click();
    await page.getByLabel('Código da UC *').fill(`UC-CTR-${width}-001`);
    await page.getByLabel('Concessionária *').fill('Neoenergia Pernambuco');
    await page.getByRole('button', { name: 'Salvar e Vincular UC' }).click();

    await expect(page.getByText(`UC-CTR-${width}-001`)).toBeVisible();

    // Technical survey
    await page.getByRole('button', { name: '+ Iniciar Levantamento Técnico' }).click();
    await page.getByRole('button', { name: 'Salvar Levantamento' }).click();
    await page.getByRole('button', { name: '✔ Concluir e Validar Vistoria Técnica' }).click();
    await expect(page.getByText('Vistoria Concluída')).toBeVisible();

    // 6. Navigate to Dimensionamento & Custos sub-tab
    await page.getByRole('button', { name: 'Dimensionamento & Custos' }).click();

    await page.getByRole('button', { name: 'Calcular Sugestão de Dimensionamento' }).click();
    await expect(page.getByText('SUGESTÃO TÉCNICA AUTOMATIZADA')).toBeVisible();

    await page
      .getByRole('button', { name: 'Criar Dimensionamento a partir desta Sugestão' })
      .click();

    await expect(page.getByText('v1 (DRAFT)').first()).toBeVisible();

    // Approve Version 1
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
    await expect(page.getByText('Nenhuma proposta emitida')).toBeVisible();

    await page
      .getByRole('button', { name: /\+ Nova Proposta Comercial|Criar Primeira Proposta/ })
      .first()
      .click();
    await expect(
      page.getByRole('heading', { name: 'Emitir Nova Proposta Comercial (PDF)' }),
    ).toBeVisible();

    await page.getByLabel('Prazo de Validade (dias corridos) *').fill('15');
    await page.getByRole('button', { name: 'Gerar Proposta e PDF Oficial' }).click();

    await expect(page.getByText('READY').first()).toBeVisible();

    // Send proposal delivery
    await page
      .getByRole('button', { name: /Registrar Envio/ })
      .first()
      .click();
    await page.getByLabel('Destinatário *').fill(`(81) 98888-${width.toString().padStart(4, '0')}`);
    await page.getByRole('button', { name: 'Confirmar Envio' }).click();
    await expect(page.getByText('SENT').first()).toBeVisible();

    // Accept proposal
    await page
      .getByRole('button', { name: /Registrar Aceite Formal/ })
      .first()
      .click();
    await page.getByLabel('Nome do Decisor / Signatário *').fill(`Decisor Contrato ${width}`);
    await page.getByRole('button', { name: 'Confirmar Aceite Formal' }).first().click();
    await expect(page.getByText('CONTRATADA (ACEITE FORMAL)')).toBeVisible();
    await expect(page.getByText('CONTRATACAO').first()).toBeVisible();

    // 8. Navigate to M5: Contratos & Documentos sub-tab
    await page.getByRole('button', { name: 'Contratos & Documentos' }).click();

    // Verify Gate C status shows PENDING
    await expect(page.getByText(/Gate C Pendente/)).toBeVisible();
    await expect(page.getByText('Nenhum contrato formal gerado ainda')).toBeVisible();

    // 9. Generate Contract (DOCX & PDF)
    await page
      .getByRole('button', { name: /[+➕]?\s*Gerar (Contrato Comercial|Minuta Contratual)/ })
      .first()
      .click();
    await expect(
      page.getByRole('heading', { name: 'Gerar Contrato Comercial Moura Solar' }),
    ).toBeVisible();

    await page.getByLabel('Cidade de Assinatura do Contrato').fill('Recife');
    await page.getByRole('button', { name: 'Confirmar e Emitir Contrato' }).click();

    // Verify Contract created with code and READY badge
    await expect(page.getByText(/CTR-\d{4}-\d{4}/).first()).toBeVisible();
    await expect(page.getByText('Pronto p/ Envio').first()).toBeVisible();

    // Verify DOCX and PDF download links
    await expect(page.getByText('Minuta Editável (DOCX)')).toBeVisible();
    await expect(page.getByText('Contrato Formal (PDF)')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Baixar DOCX' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Baixar PDF' }).first()).toBeVisible();

    // 10. Record Delivery
    await page
      .getByRole('button', { name: /Registrar Envio/ })
      .first()
      .click();
    await expect(page.getByRole('heading', { name: 'Registrar Envio do Contrato' })).toBeVisible();

    await page.getByLabel('Destinatário').fill(`(81) 97777-${width.toString().padStart(4, '0')}`);
    await page
      .locator('form')
      .getByRole('button', { name: 'Registrar Envio', exact: true })
      .click();

    // Verify status updated to SENT
    await expect(page.getByText('Enviado ao Cliente')).toBeVisible();

    // 11. Upload Signed Contract
    await page.getByRole('button', { name: 'Anexar Via Assinada' }).click();
    await expect(
      page.getByRole('heading', { name: 'Anexar Via Assinada pelo Cliente' }),
    ).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles(mockSignedPdfPath);
    await page.getByRole('button', { name: 'Anexar Documento' }).click();

    // Verify status updated to SIGNED_UPLOADED
    await expect(page.getByText('Assinado Anexado (Aguardando Conferência)')).toBeVisible();

    // Verify Gate C is still PENDING (SPEC-007 Item 4 & 9: Upload does not activate prematurely)
    await expect(page.getByText(/Gate C Pendente/)).toBeVisible();
    await expect(
      page.locator('section[aria-label="Detalhes da oportunidade"] .badge-vendido'),
    ).not.toBeVisible();

    // 12. Formal Conference Checklist (Gate C)
    await page.getByRole('button', { name: 'Conferência de Assinatura (Gate C)' }).click();
    await expect(
      page.getByRole('heading', { name: 'Conferência Formal de Assinatura (Gate C)' }),
    ).toBeVisible();

    // Check all 4 items
    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await checkboxes.nth(2).check();
    await checkboxes.nth(3).check();

    // Submit Approval
    await page.getByRole('button', { name: 'Aprovar e Liberar Gate C' }).click();

    // 13. Verify Gate C Satisfied & Opportunity state advances to VENDIDO!
    await expect(page.getByText(/Gate C Superado — Contrato Ativo e Verificado/)).toBeVisible();
    await expect(page.getByText('Ativo & Verificado (Gate C)')).toBeVisible();
    await expect(
      page.locator('section[aria-label="Detalhes da oportunidade"] .badge-vendido'),
    ).toBeVisible();

    // 14. Check viewport responsiveness (no horizontal scrollbar)
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);

    // Save screenshots
    await page.screenshot({
      path: `docs/evidencias/m5/contrato-${width}.png`,
      fullPage: true,
    });
    await page.screenshot({
      path: testInfo.outputPath(`contrato-${width}.png`),
      fullPage: true,
    });
  });
}
