import { test, expect } from '@playwright/test';

const key = 'focuslearn-simple-v1';
const accept = page => page.once('dialog', dialog => dialog.accept());
const dismiss = page => page.once('dialog', dialog => dialog.dismiss());

test('three sections, HTML templates, themes and keyboard navigation', async ({ page }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#/chat');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your study desk');
  await expect(page.getByText('A sample study workspace', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('navigation').getByRole('link')).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'Study chat' })).toHaveCount(0);
  await expect(page.locator('template')).toHaveCount(2);
  await page.getByRole('link', { name: 'Skip to content' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  for (const name of ['Tasks', 'Notes', 'Timer']) {
    await page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: `test-results/${info.project.name}-light.png`, fullPage: true });
  await page.keyboard.press('Tab');
  await page.getByRole('button', { name: 'Dark mode', exact: true }).focus();
  expect(await page.getByRole('button', { name: 'Dark mode' }).evaluate(button => getComputedStyle(button).outlineStyle)).toBe('solid');
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Dark mode' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: `test-results/${info.project.name}-dark.png`, fullPage: true });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('link', { name: 'FocusLearn', exact: true }).click();
  await expect(page.locator('#main')).toBeFocused();
  expect(errors).toEqual([]);
});

test('add, complete and delete tasks, including empty and validation states', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByLabel('What needs doing?')).toBeFocused();
  const title = '<img src=x onerror=alert(1)> Practice';
  await page.getByLabel('What needs doing?').fill(title);
  await page.getByRole('button', { name: 'Add task' }).click();
  const task = page.locator('#task-list li').filter({ hasText: title });
  await task.getByRole('checkbox').check();
  await expect(task.locator('span')).toHaveClass('done');
  await expect(task.locator('img')).toHaveCount(0);
  await page.reload();
  await expect(task.getByRole('checkbox')).toBeChecked();
  while (await page.locator('#task-list li').count()) {
    await page.locator('#task-list').getByRole('button', { name: 'Delete' }).first().click();
  }
  await expect(page.locator('#tasks-empty')).toBeVisible();
});

test('notes add, edit, save, clear, guard changes and delete', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Title', { exact: true }).fill('My note');
  await page.getByLabel('Text', { exact: true }).fill('A plain text note');
  await page.getByRole('button', { name: 'Add note', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear editor' }).click();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'My note', exact: true }).click();
  await page.getByLabel('Text', { exact: true }).fill('Edited text');
  dismiss(page);
  await page.getByRole('button', { name: 'Clear editor' }).click();
  await expect(page.getByLabel('Text', { exact: true })).toHaveValue('Edited text');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'My note', exact: true }).click();
  await expect(page.getByLabel('Text', { exact: true })).toHaveValue('Edited text');
  await page.getByLabel('Text', { exact: true }).fill('Discard me');
  accept(page);
  await page.getByRole('button', { name: 'HTML and JavaScript', exact: true }).click();
  await expect(page.getByLabel('Text', { exact: true })).toHaveValue('HTML describes the page.\nJavaScript makes buttons and forms work.');
  while (await page.locator('#note-list li').count()) {
    accept(page);
    await page.locator('#note-list').getByRole('button', { name: 'Delete' }).first().click();
  }
  await expect(page.locator('#notes-empty')).toBeVisible();
});

test('timer starts, pauses, resumes after refresh, completes and resets', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-04T14:00:00Z') });
  await page.goto('/');
  await page.getByLabel('Minutes', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Start timer', exact: true }).click();
  await page.clock.fastForward(5000);
  await expect(page.locator('#timer')).toHaveText('00:55');
  await page.getByRole('button', { name: 'Pause timer', exact: true }).click();
  await page.clock.fastForward(10_000);
  await expect(page.locator('#timer')).toHaveText('00:55');
  await page.reload();
  await expect(page.locator('#timer')).toHaveText('00:55');
  await page.getByRole('button', { name: 'Resume timer', exact: true }).click();
  await page.clock.fastForward(56_000);
  await expect(page.locator('#timer')).toHaveText('00:00');
  await expect(page.locator('#timer-status')).toContainText('Time is up');
  await expect(page.locator('#start-timer')).toBeDisabled();
  await page.getByRole('button', { name: 'Reset timer' }).click();
  await expect(page.locator('#timer')).toHaveText('01:00');
  await expect(page.getByLabel('Minutes', { exact: true })).toBeEnabled();
});

test('reset is explicit; storage errors and old data are handled', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('focuslearn-showcase-v1', JSON.stringify({
      tasks: [{ id: 'old-task', title: 'Keep my task', done: false }],
      notes: [{ id: 'old-note', title: 'Keep my note', text: 'Original text' }],
      timer: null, settings: { theme: 'light' },
    }));
  });
  await page.goto('/');
  await expect(page.locator('#task-list')).toContainText('Keep my task');
  dismiss(page);
  await page.getByRole('button', { name: 'Reset examples' }).click();
  await expect(page.locator('#task-list')).toContainText('Keep my task');
  accept(page);
  await page.getByRole('button', { name: 'Reset examples' }).click();
  await expect(page.getByRole('alert')).toContainText('Examples restored');
  await expect(page.locator('#task-list li')).toHaveCount(3);
  expect(await page.evaluate(() => localStorage.getItem('focuslearn-showcase-v1'))).toContain('Keep my task');
  await page.evaluate(key => localStorage.setItem(key, '{broken'), key);
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Saved data could not be read');
  await page.getByLabel('What needs doing?').fill('Do not overwrite');
  await page.getByRole('button', { name: 'Add task' }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe('{broken');
  accept(page);
  await page.getByRole('button', { name: 'Reset examples' }).click();
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Blocked'); }; });
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByRole('alert')).toContainText('Could not save');
  await expect(page.locator('#task-list')).not.toContainText('Do not overwrite');
});
