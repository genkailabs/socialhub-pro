import { test, expect } from '@playwright/test';

test('rota protegida sem sessão redireciona para /login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
});

test('login mostra opção Google', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: /Google/ })).toBeVisible();
});
