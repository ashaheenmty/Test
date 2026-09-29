import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const password = 'a long enough passphrase';
const uniqueEmail = () => `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.org`;

async function expectNoHorizontalScroll(page: Page) {
  const [scrollWidth, innerWidth] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

async function expectNoA11yViolations(page: Page) {
  await expectNoHorizontalScroll(page);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

test.describe('Arabic browser', () => {
  test.use({ locale: 'ar-EG' });
  test('redirects to the best matching language and renders Arabic right-to-left', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/ar$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('إلى أين؟');
  await expectNoA11yViolations(page);
  });
});

test('register → profile → add traveller → change language → sign out → sign in', async ({ page }) => {
  const email = uniqueEmail();
  await page.goto('/en/register');
  await page.getByLabel('First name').fill('Lea');
  await page.getByLabel('Last name').fill('Becker');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel(/I accept the terms/).check();
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/\/en\/profile/);
  await expect(page.locator('.alert-success')).toHaveText('We have sent you an email to confirm your address.');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hello Lea');
  await expect(page.getByText('Email address not yet confirmed')).toBeVisible();

  await page.getByText('Add traveller').click();
  await page.locator('#p-first').fill('Mia');
  await page.locator('#p-last').fill('Becker');
  await page.locator('#p-dob').fill('2015-03-02');
  await page.getByRole('button', { name: 'Save' }).first().click();
  await expect(page.locator('.alert-success')).toHaveText('Saved');
  await expect(page.getByText('Mia Becker')).toBeVisible();
  await expectNoA11yViolations(page);

  // Language change is stored in the profile and applied immediately.
  await page.locator('#profile-lang').selectOption('de');
  await page.locator('#profile-lang').locator('xpath=ancestor::form').getByRole('button').click();
  await expect(page).toHaveURL(/\/de\/profile/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Guten Tag, Lea');

  await page.getByRole('button', { name: 'Abmelden' }).click();
  await expect(page).toHaveURL(/\/de$/);
  await expect(page.getByRole('link', { name: 'Anmelden' }).first()).toBeVisible();

  await page.goto('/de/login');
  await page.getByLabel('E-Mail-Adresse').fill(email);
  await page.getByLabel('Passwort', { exact: true }).fill('wrong password here');
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await expect(page.locator('.alert-error')).toHaveText('E-Mail-Adresse oder Passwort ist falsch.');
  await page.getByLabel('Passwort', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await expect(page).toHaveURL(/\/de$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Guten Tag, Lea');
});

test('session survives an expired access token via silent refresh', async ({ page, context }) => {
  const email = uniqueEmail();
  await page.goto('/en/register');
  await page.getByLabel('First name').fill('Tom');
  await page.getByLabel('Last name').fill('Klein');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel(/I accept the terms/).check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/en\/profile/);

  const cookies = await context.cookies();
  expect(cookies.find((c) => c.name === 'tb_at')?.httpOnly).toBe(true);
  expect(cookies.find((c) => c.name === 'tb_rt')?.httpOnly).toBe(true);
  await context.clearCookies({ name: 'tb_at' });
  await page.goto('/en/profile');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hello Tom');
});

test('dark theme and legal pages are accessible', async ({ page }) => {
  await page.goto('/fr');
  await page.getByRole('button', { name: 'Sombre' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expectNoA11yViolations(page);
  await page.getByRole('link', { name: 'Mentions légales' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mentions légales');
  await expect(page.locator('article').getByText('PLACEHOLDER Reisevermittlung GmbH')).toBeVisible();
  await expectNoA11yViolations(page);
});

test('ignores unsafe post-login redirect targets (no open redirect)', async ({ page, baseURL }) => {
  const email = uniqueEmail();
  await page.goto('/en/register');
  await page.getByLabel('First name').fill('Ola');
  await page.getByLabel('Last name').fill('Nowak');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel(/I accept the terms/).check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/en\/profile/);
  await page.getByRole('button', { name: 'Sign out' }).click();

  await page.goto('/en/login?next=//evil.example.com');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(`${baseURL}/en`);
});
