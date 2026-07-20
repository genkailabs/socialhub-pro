import { test, expect } from '@playwright/test';

test.fixme('shell mostra navegação agrupada quando autenticado', async ({ page }) => {
  // Pré-condição: sessão válida (configurar storageState com usuário de teste).
  await page.goto('/dashboard');
  await expect(page.getByText('Dashboard')).toBeVisible();
  await expect(page.getByText('Planejamento')).toBeVisible();
});
