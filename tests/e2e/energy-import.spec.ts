import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';

const require = createRequire(`${process.cwd()}/apps/api/package.json`);
const PDFDocument = require('pdfkit');
const password = 'E2e-test-password-2026';
const headers = { origin: 'http://localhost:3320', 'x-requested-with': 'MouraSolar' };

for (const [width, height] of [
  [320, 900],
  [360, 800],
  [390, 844],
  [768, 1024],
  [1024, 768],
  [1366, 768],
  [1440, 900],
  [1920, 1080],
]) {
  test(`manual energy import review, confirmation and resume at ${width}px`, async ({
    page,
    request,
  }, info) => {
    await page.setViewportSize({ width, height });
    await request.post('http://localhost:3318/api/v1/identity/bootstrap', {
      headers: {
        ...headers,
        'x-bootstrap-token': 'e2e-test-bootstrap-secret-at-least-32-characters',
      },
      data: { email: 'admin@e2e.test', name: 'Admin E2E', organization: 'Moura E2E', password },
    });

    await page.goto('/');
    await page.getByLabel('E-mail', { exact: true }).fill('admin@e2e.test');
    await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Minhas sessões' })).toBeVisible();
    if (width < 768) await page.getByText('Mais', { exact: true }).click();
    await page.getByRole('button', { name: 'Clientes', exact: true }).click();
    await page.getByRole('button', { name: '+ Novo Cliente' }).click();
    const customerName = `Cliente Importação ${width}`;
    await page.getByLabel('Nome Completo / Razão Social *').fill(customerName);
    await page.getByRole('button', { name: 'Salvar Cliente' }).click();
    await expect(page.getByRole('heading', { name: customerName })).toBeVisible();

    const customerResponse = await page.request.get('http://localhost:3318/api/v1/customers', {
      headers,
    });
    const customerPayload = await customerResponse.json();
    const customer = (
      Array.isArray(customerPayload) ? customerPayload : customerPayload.items
    ).find((item: { legalName: string }) => item.legalName === customerName);
    expect(customer).toBeTruthy();
    const unitResponse = await page.request.post(
      `http://localhost:3318/api/v1/customers/${customer.id}/utility-units`,
      {
        headers,
        data: {
          distributorName: 'Distribuidora de Teste',
          externalCode: `UC-${width}-00123`,
          consumerClass: 'RESIDENTIAL',
          tariffMode: 'CONVENTIONAL',
          connectionType: 'BIPHASIC',
          voltage: '220V',
        },
      },
    );
    expect(unitResponse.status()).toBe(201);
    await page.getByRole('button', { name: 'Fechar', exact: true }).click();
    const customerRow = page
      .locator(width < 768 ? '.customer-mobile-list article' : '.desktop-only tbody tr')
      .filter({ hasText: customerName });
    await customerRow.getByRole('button', { name: 'Ver detalhes', exact: true }).click();
    await expect(page.getByText(`UC-${width}-00123`)).toBeVisible();

    await page.getByRole('button', { name: 'Novo Documento', exact: true }).click();
    const upload = page.getByRole('dialog', { name: 'Novo Documento no Dossiê' });
    await upload.getByLabel('Título Identificador*').fill(`Conta ${width}`);
    const pdf: Buffer = await new Promise((resolve) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.text(`Conta de energia da UC ${width}`);
      doc.end();
    });
    await upload.getByLabel('Arquivo (PDF, PNG ou JPEG)*').setInputFiles({
      name: `conta-${width}.pdf`,
      mimeType: 'application/pdf',
      buffer: pdf,
    });
    await upload.getByRole('button', { name: 'Concluir Upload' }).click();
    await expect(upload).not.toBeVisible();
    await expect(page.getByText('Documento verificado e disponível.')).toBeVisible();

    let candidateEvidenceSubmitted = false;
    await page.route('**/api/v1/energy-imports/*/review', async (route) => {
      const body = route.request().postDataJSON();
      candidateEvidenceSubmitted = Boolean(body.months?.[0]?.evidence?.consumptionKwhCandidateId);
      body.months.forEach((month: { evidence?: unknown }) => delete month.evidence);
      await route.continue({ postData: JSON.stringify(body) });
    });
    await page.route('**/api/v1/energy-imports/*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      const response = await route.fetch();
      const payload = await response.json();
      await route.fulfill({
        response,
        json: {
          ...payload,
          candidates: [
            {
              id: `00000000-0000-4000-8000-${String(width).padStart(12, '0')}`,
              attemptId: '00000000-0000-4000-8000-000000000001',
              field: 'bill.referenceMonth',
              rawValue: '08/2026',
              normalizedValue: '2026-08',
              unit: null,
              page: 1,
              region: null,
              providerConfidence: null,
              qualitySignals: { readable: true },
              systemValidation: { valid: true },
            },
            {
              id: `00000000-0000-4000-8000-${String(width + 100).padStart(12, '0')}`,
              attemptId: '00000000-0000-4000-8000-000000000001',
              field: 'bill.consumptionKwh',
              rawValue: '410',
              normalizedValue: '410.00',
              unit: 'kWh',
              page: 1,
              region: null,
              providerConfidence: { value: 0.91, scale: '0-1' },
              qualitySignals: { readable: true },
              systemValidation: { valid: true },
            },
          ],
        },
      });
    });

    await page.getByRole('button', { name: 'Importar conta de energia' }).click();
    const dialog = page.getByRole('dialog', { name: 'Importação assistida de conta' });
    await dialog
      .getByLabel('Conta de energia READY')
      .selectOption({ label: `Conta ${width} — conta-${width}.pdf` });
    await dialog
      .getByLabel('Unidade consumidora da conta')
      .selectOption({ label: `Distribuidora de Teste — UC-${width}-00123` });
    await dialog.getByRole('button', { name: 'Criar importação' }).click();
    await expect(dialog.getByText('Estado: Aguardando revisão')).toBeVisible();
    await expect(
      dialog.getByRole('heading', { name: 'Dados sugeridos pela extração' }),
    ).toBeVisible();
    await dialog.getByRole('table').getByRole('button', { name: 'Adicionar mês' }).click();
    await dialog.getByLabel('Mês para bill.consumptionKwh página 1').selectOption('2026-08');
    await dialog.getByRole('button', { name: 'Usar valor' }).click();
    await expect(dialog.getByLabel('Mês de referência')).toHaveValue('2026-08');
    await dialog.getByLabel('Decisão').selectOption('INSERT');
    await expect(dialog.getByLabel('Consumo (kWh)')).toHaveValue('410.00');
    await dialog.getByLabel('Consumo (kWh)').fill('421.50');
    await dialog.getByLabel('Energia injetada (kWh)').fill('15.20');
    await dialog.getByLabel('Total faturado (R$)').fill('385.40');
    await dialog.getByRole('button', { name: 'Salvar revisão' }).click();
    await expect(
      dialog.getByText('Revisão salva. A leitura ainda não foi alterada.'),
    ).toBeVisible();
    expect(candidateEvidenceSubmitted).toBe(true);
    await page.reload();
    const resumedDialog = page.getByRole('dialog', { name: 'Importação assistida de conta' });
    await expect(resumedDialog).toBeVisible();
    await expect(resumedDialog.getByLabel('Mês de referência')).toHaveValue('2026-08');
    await expect(resumedDialog.getByLabel('Decisão')).toHaveValue('INSERT');
    await expect(resumedDialog.getByLabel('Consumo (kWh)')).toHaveValue('421.50');
    await resumedDialog.getByRole('button', { name: 'Confirmar importação' }).click();
    await expect(resumedDialog.getByText('Importação confirmada')).toBeVisible();
    await expect(resumedDialog.getByText('Estado: Aplicada')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await page.screenshot({ path: info.outputPath(`energy-import-${width}.png`), fullPage: true });

    const readingsResponse = await page.request.get(
      `http://localhost:3318/api/v1/utility-units/${(await unitResponse.json()).id}/readings`,
      { headers },
    );
    expect(readingsResponse.status()).toBe(200);
    const readings = await readingsResponse.json();
    expect(readings.readings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ referenceMonth: '2026-08', consumptionKwh: 421.5 }),
      ]),
    );

    await page.reload();
    await expect(page.getByRole('dialog', { name: 'Importação assistida de conta' })).toBeVisible();
    await expect(page.getByText('Estado: Aplicada')).toBeVisible();
  });
}
