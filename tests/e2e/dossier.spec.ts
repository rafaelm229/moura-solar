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
  test(`dossier upload, recoverable error, keyboard, archive and second device at ${width}px`, async ({
    page,
    browser,
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
    await page.getByLabel('Nome Completo / Razão Social *').fill(`Cliente Dossiê ${width}`);
    await page.getByRole('button', { name: 'Salvar Cliente' }).click();
    await expect(page.getByRole('heading', { name: `Cliente Dossiê ${width}` })).toBeVisible();
    await expect(page.getByText('Nenhum documento encontrado')).toBeVisible();
    await page.getByRole('button', { name: 'Novo Documento', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Novo Documento no Dossiê' });
    await dialog.getByLabel('Título Identificador*').fill(`Conta histórica ${width}`);
    await dialog.getByLabel('Arquivo (PDF, PNG ou JPEG)*').setInputFiles({
      name: 'falso.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('<html>arquivo falso</html>'),
    });
    await dialog.getByRole('button', { name: 'Concluir Upload' }).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(dialog.getByLabel('Título Identificador*')).toHaveValue(
      `Conta histórica ${width}`,
    );
    const pdf: Buffer = await new Promise((resolve) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.text(`Conta sintetica ${width}`);
      doc.end();
    });
    await dialog
      .getByLabel('Arquivo (PDF, PNG ou JPEG)*')
      .setInputFiles({ name: 'conta.pdf', mimeType: 'application/pdf', buffer: pdf });
    // Tab remains within the dialog; Escape restores focus when closing.
    await dialog.getByRole('button', { name: 'Concluir Upload' }).focus();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Fechar', exact: true })).toBeFocused();
    await dialog.getByRole('button', { name: 'Concluir Upload' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText('Documento verificado e disponível.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Baixar', exact: true })).toBeEnabled();
    await page.screenshot({ path: info.outputPath(`dossier-${width}.png`), fullPage: true });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await page.screenshot({ path: info.outputPath(`dossier-${width}.png`), fullPage: true });
    const customerResponse = await page.request.get('http://localhost:3318/api/v1/customers', {
      headers,
    });
    const customers = await customerResponse.json();
    const customer = (Array.isArray(customers) ? customers : customers.items).find(
      (c: { legalName: string }) => c.legalName === `Cliente Dossiê ${width}`,
    );
    const docsResponse = await page.request.get(
      `http://localhost:3318/api/v1/customers/${customer.id}/documents`,
      { headers },
    );
    const doc = (await docsResponse.json())[0];
    const second = await browser.newContext();
    await second.request.post('http://localhost:3318/api/v1/identity/login', {
      headers,
      data: { email: 'admin@e2e.test', password },
    });
    const download = await second.request.get(`http://localhost:3318${doc.contentUrl}`, {
      headers,
    });
    expect(download.status()).toBe(200);
    expect(await download.body()).toEqual(pdf);
    await page.getByRole('button', { name: 'Histórico', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Baixar versão 1' })).toBeEnabled();
    await page
      .getByRole('dialog', { name: 'Histórico do Documento' })
      .getByRole('button', { name: 'Fechar', exact: true })
      .click();
    await page.getByRole('button', { name: 'Substituir', exact: true }).click();
    const replacementDialog = page.getByRole('dialog', { name: 'Substituir Documento' });
    await replacementDialog
      .getByLabel('Arquivo (PDF, PNG ou JPEG)*')
      .setInputFiles({ name: 'conta-revisada.pdf', mimeType: 'application/pdf', buffer: pdf });
    await replacementDialog.getByRole('button', { name: 'Concluir Upload' }).click();
    await expect(replacementDialog).not.toBeVisible();
    await page.getByRole('button', { name: 'Histórico', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Baixar versão 2' })).toBeEnabled();
    await page
      .getByRole('dialog', { name: 'Histórico do Documento' })
      .getByRole('button', { name: 'Fechar', exact: true })
      .click();
    await page.getByRole('button', { name: 'Arquivar', exact: true }).click();
    await page.getByLabel('Motivo do arquivamento (opcional):').fill('Versão histórica preservada');
    await page.getByRole('button', { name: 'Confirmar Arquivamento' }).click();
    await expect(page.getByRole('dialog', { name: 'Arquivar Documento' })).not.toBeVisible();
    const after = await second.request.get(
      `http://localhost:3318/api/v1/customers/${customer.id}/documents`,
      { headers },
    );
    expect((await after.json())[0].status).toBe('ARCHIVED');
    // A persisted intention survives reload and is completed without creating another document.
    const pendingResponse = await page.request.post(
      `http://localhost:3318/api/v1/customers/${customer.id}/document-uploads`,
      {
        headers: { ...headers, 'Idempotency-Key': `pending-resume-${width}` },
        data: {
          title: `Envio interrompido ${width}`,
          category: 'UTILITY_BILL',
          fileName: 'conta.pdf',
          declaredMime: 'application/pdf',
          fileSize: pdf.length,
        },
      },
    );
    expect(pendingResponse.status()).toBe(201);
    const pending = await pendingResponse.json();
    await page.reload();
    if (width < 768) await page.getByText('Mais', { exact: true }).click();
    await page.getByRole('button', { name: 'Clientes', exact: true }).click();
    await page
      .locator(width < 768 ? '.customer-mobile-list article' : '.desktop-only tbody tr')
      .filter({ hasText: `Cliente Dossiê ${width}` })
      .getByRole('button', { name: 'Ver detalhes', exact: true })
      .click();
    await page.getByRole('button', { name: 'Retomar envio', exact: true }).click();
    const resume = page.getByRole('dialog', { name: 'Retomar Envio' });
    await resume.getByLabel('Arquivo (PDF, PNG ou JPEG)*').setInputFiles({
      name: 'conta.pdf',
      mimeType: 'application/pdf',
      buffer: pdf,
    });
    await resume.getByRole('button', { name: 'Concluir Upload' }).click();
    await expect(resume).not.toBeVisible();
    const resumedResponse = await second.request.get(
      `http://localhost:3318/api/v1/customers/${customer.id}/documents`,
      { headers },
    );
    const resumed = (await resumedResponse.json()).find(
      (entry: { id: string }) => entry.id === pending.id,
    );
    expect(resumed.currentVersion.persistenceState).toBe('READY');
    expect(resumed.currentVersion.versionNumber).toBe(1);
    await second.close();
  });
}
