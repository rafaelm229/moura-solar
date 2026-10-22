import { test, expect } from '@playwright/test';

const password = 'E2e-test-password-2026';

test.describe('Lote 3 — Navegação, Histórico, Deep Links e Mobile por Perfil (T-UX-03 e T-UX-04)', () => {
  test.beforeEach(async ({ request }) => {
    // Ensure bootstrap is initialized
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
  });

  test('T-UX-04: deep link sem sessão redireciona após login (returnTo)', async ({ page }) => {
    // 1. Visit protected deep link directly while unauthenticated
    await page.goto('/?tab=customers');
    await expect(page.getByRole('heading', { name: 'Entre na plataforma' })).toBeVisible();

    // 2. Perform login
    await page.getByLabel('E-mail', { exact: true }).fill('admin@e2e.test');
    await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();

    // 3. User lands on Clientes tab as requested in deep link
    await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
    await expect(page).toHaveURL(/\?tab=customers/);
  });

  test('T-UX-04: histórico do navegador (pushState e popstate) e refresh', async ({ page }) => {
    // 1. Login normally
    await page.goto('/');
    await page.getByLabel('E-mail', { exact: true }).fill('admin@e2e.test');
    await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Minhas sessões' })).toBeVisible();

    // 2. Click Clientes
    await page.getByRole('button', { name: 'Clientes', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
    await expect(page).toHaveURL(/\?tab=customers/);

    // 3. Click Oportunidades
    await page.getByRole('button', { name: 'Oportunidades', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Oportunidades' })).toBeVisible();
    await expect(page).toHaveURL(/\?tab=opportunities/);

    // 4. Press Browser Back button -> returns to Clientes
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
    await expect(page).toHaveURL(/\?tab=customers/);

    // 5. Press Browser Forward button -> returns to Oportunidades
    await page.goForward();
    await expect(page.getByRole('heading', { name: 'Oportunidades' })).toBeVisible();
    await expect(page).toHaveURL(/\?tab=opportunities/);

    // 6. Refresh page (F5) -> stays on Oportunidades
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Oportunidades' })).toBeVisible();
    await expect(page).toHaveURL(/\?tab=opportunities/);
  });

  test('T-UX-03: atalhos mobile por perfil e menu Mais acessível', async ({ page, browser }) => {
    await page.setViewportSize({ width: 360, height: 800 });

    // 1. Admin login on mobile
    await page.goto('/');
    await page.getByLabel('E-mail', { exact: true }).fill('admin@e2e.test');
    await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Minhas sessões' })).toBeVisible();

    // Primary mobile nav for admin has Pessoas directly visible
    await expect(page.getByRole('button', { name: 'Pessoas', exact: true })).toBeVisible();

    // Admin opens Mais to access Papéis
    await page.getByText('Mais', { exact: true }).click();
    await expect(page.getByRole('button', { name: 'Papéis', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Papéis', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Papéis' })).toBeVisible();
    await expect(page).toHaveURL(/\?tab=roles/);
  });
});
