import { test, expect } from '@playwright/test';

const enter = async (page, role, dept) => {
  await page.goto('/');
  await page.getByRole('radio', { name: role }).check({ force: true });
  if (dept) await page.getByLabel('Department').selectOption(dept);
  await page.getByRole('button', { name: 'Continue' }).click();
};

test.beforeEach(async ({ request }) => {
  // Clean slate: reset through the admin endpoint.
  const r = await request.post('http://127.0.0.1:8000/api/session', { data: { role: 'Admin' } });
  expect(r.ok()).toBeTruthy();
  await request.post('http://127.0.0.1:8000/api/admin/reset');
});

test('saved state: a field action survives a reload and reaches the controller', async ({ page }) => {
  await enter(page, /Ground Operations/, 'Electrical / TRD');
  await expect(page.getByText('Saved · shared log')).toBeVisible();

  await page.getByRole('button', { name: 'Requirements' }).click();
  await page.getByRole('spinbutton', { name: /Duration needed/ }).fill('240');
  await page.getByRole('button', { name: 'Submit requirement' }).click();
  await expect(page.getByText(/Submitted/)).toBeVisible();

  await page.reload();
  await page.getByRole('radio', { name: /Ground Operations/ }).check({ force: true });
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'History' }).click();
  await expect(page.getByText(/Requirement: 240 min/)).toBeVisible();

  // Authority sees it as an alert.
  await page.getByRole('button', { name: /^Authority$/i }).click();
  await expect(page.getByRole('button', { name: /Alerts, 1 unread/ })).toBeVisible();
});

test('department isolation: Track / Civil never sees Electrical / TRD history', async ({ page }) => {
  await enter(page, /Ground Operations/, 'Electrical / TRD');
  await page.getByRole('button', { name: 'Requirements' }).click();
  await page.getByRole('spinbutton', { name: /Duration needed/ }).fill('180');
  await page.getByRole('button', { name: 'Submit requirement' }).click();
  await expect(page.getByText(/Submitted/)).toBeVisible();

  await enter(page, /Ground Operations/, 'Track / Civil Engineering');
  await page.getByRole('button', { name: 'History' }).click();
  await expect(page.getByText('No actions recorded yet.')).toBeVisible();
});

test('new pages render without overflow at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await enter(page, /Authority/);
  for (const tab of ['Network map', 'Replanning', 'History']) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    const w = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(w).toBeLessThanOrEqual(375);
  }
});

test('weekly calendar: hover card and original/replanned view', async ({ page }) => {
  await enter(page, /Authority/);
  await page.getByRole('button', { name: 'Maintenance Blocks', exact: true }).click();
  await page.getByRole('button', { name: 'Weekly', exact: true }).click();
  const chip = page.locator('table button', { hasText: 'SEC-' }).first();
  await chip.hover();
  await expect(page.getByRole('dialog')).toContainText('TASK-');
  await page.getByRole('button', { name: 'Replanned', exact: true }).click();
  await expect(page.getByText('View only: the plan is changed on Replanning.')).toBeVisible();
});

test('verification: false closure moves work from Pending to History and alerts the crew', async ({ page }) => {
  // Crew closes a task with a note.
  await enter(page, /Ground Operations/, 'Electrical / TRD');
  await page.getByRole('navigation').getByRole('button', { name: 'Assigned Work', exact: true }).click();
  await page.getByRole('button', { name: 'Start work' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start work' }).click();
  await page.getByRole('button', { name: 'Complete', exact: true }).first().click();
  await page.getByLabel(/Completion note/).fill('Done, section handed back');
  await page.getByRole('button', { name: 'Mark complete' }).click();

  // Controller reports it as a false closure, with a reading.
  await page.getByRole('button', { name: /^Authority$/i }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Work Verification', exact: true }).click();
  await expect(page.getByText('Done, section handed back')).toBeVisible();
  await page.getByRole('button', { name: 'Report false closure' }).first().click();
  const dlg = page.getByRole('dialog');
  await dlg.getByRole('textbox').first().fill('gauge 1680 mm');
  await dlg.locator('textarea').fill('Site not restored');
  await dlg.getByRole('button', { name: 'Report false closure' }).click();

  await page.getByRole('button', { name: /^History · / }).click();
  await expect(page.getByText('gauge 1680 mm').first()).toBeVisible();

  // Audit history outcome tab counts it.
  await page.getByRole('navigation').getByRole('button', { name: 'History', exact: true }).click();
  await page.getByRole('button', { name: /^False closure · 1$/ }).click();
  await expect(page.getByText(/Verification: False Closure Reported/)).toBeVisible();

  // The crew is told.
  await page.getByRole('button', { name: /^Ground ops$/i }).click();
  await expect(page.getByRole('button', { name: /Alerts, 1 unread/ })).toBeVisible();
});
