import { test, expect, type Page } from '@playwright/test';
import { getLatestOtpCode } from './helpers/mail';

// ============================================================================
// Helper Functions (Isolate selectors and interactions)
// ============================================================================

/**
 * Open the mobile navigation drawer if on a mobile viewport (< 768px).
 */
async function openSidebarIfNeeded(page: Page) {
  const menuBtn = page.getByRole('button', { name: 'Open navigation menu' });
  if (await menuBtn.isVisible()) {
    const dialog = page.getByRole('dialog', { name: 'Navigation' });
    if (!(await dialog.isVisible())) {
      await menuBtn.click();
      await expect(dialog).toBeVisible();
    }
  }
}

/**
 * Click a top-level navigation link inside the Main sidebar.
 */
async function clickSidebarNav(page: Page, label: string) {
  await openSidebarIfNeeded(page);
  const mainNav = page.getByRole('navigation', { name: 'Main' });
  await mainNav.getByRole('link', { name: label, exact: true }).click();
}

/**
 * Sign in using email OTP code flow.
 */
async function signInWithEmailOtp(page: Page, email: string) {
  await page.goto('./#/login');

  const emailInput = page.getByRole('textbox', { name: /email/i });
  await emailInput.fill(email);

  const sendLinkBtn = page.getByRole('button', { name: 'Send sign-in link' });
  await sendLinkBtn.click();

  // Wait for sent state confirmation
  await expect(page.getByText(/check your inbox at/i)).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();

  // Retrieve OTP code from local mail server
  const otpCode = await getLatestOtpCode(email);

  // Fill in the 6-digit code
  const codeInput = page.getByRole('textbox', { name: /code|token/i });
  await codeInput.fill(otpCode);

  // Click Verify code button
  const verifyBtn = page.getByRole('button', { name: /verify|sign in|submit/i });
  await verifyBtn.click();

  // User should land on the main authenticated view (Today)
  await expect(page.locator('#main')).toBeVisible();
}

/**
 * Assert that the current page has no horizontal scrolling overflow.
 */
async function assertNoHorizontalOverflow(page: Page) {
  const isWithinViewport = await page.evaluate(() => {
    return document.documentElement.scrollWidth <= window.innerWidth;
  });
  expect(isWithinViewport).toBe(true);
}

// ============================================================================
// E2E Test Suite
// ============================================================================

test.describe('FocusLearn End-to-End Suite', () => {
  test('complete study lifecycle: auth, todos, pages, focus, chat, theme', async ({ page }) => {
    const testEmail = `student-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

    // 1. Sign in with OTP code
    await signInWithEmailOtp(page, testEmail);

    // ------------------------------------------------------------------------
    // 2. Add, complete, and undo todo
    // ------------------------------------------------------------------------
    await clickSidebarNav(page, 'Todos');
    await expect(page.getByRole('heading', { name: 'Todos', exact: true })).toBeVisible();

    const todoTitle = 'Study Chapter 5 Calculus';
    const addTodoInput = page.getByLabel('Add a todo');
    await addTodoInput.fill(todoTitle);
    await addTodoInput.press('Enter');

    const todoCheckbox = page.getByRole('checkbox', { name: todoTitle });
    await expect(todoCheckbox).toBeVisible();

    // Complete todo
    await todoCheckbox.check();
    await expect(todoCheckbox).toBeChecked();

    // Undo completion (uncheck or trigger undo)
    await todoCheckbox.uncheck();
    await expect(todoCheckbox).not.toBeChecked();

    // ------------------------------------------------------------------------
    // 3. Create page + subpage + [[link]], rename target, link still navigates
    // ------------------------------------------------------------------------
    await openSidebarIfNeeded(page);
    const newPageBtn = page.getByRole('button', { name: 'New page' }).first();
    await newPageBtn.click();

    const targetTitle = 'Calculus Derivatives';
    const pageTitleInput = page.getByLabel('Page title');
    await expect(pageTitleInput).toBeVisible();
    await pageTitleInput.fill(targetTitle);

    // Wait for debounced autosave (500ms) to persist target page title
    await page.waitForTimeout(700);

    // Create subpage from Page options menu
    const pageOptionsBtn = page.getByRole('button', { name: 'Page options' });
    await pageOptionsBtn.click();
    const addSubpageItem = page.getByRole('menuitem', { name: 'Add subpage' });
    await addSubpageItem.click();

    const subpageTitle = 'Derivative Practice Problems';
    await expect(pageTitleInput).toHaveValue('');
    await pageTitleInput.fill(subpageTitle);
    await page.waitForTimeout(700);

    // Insert [[link]] in editor
    const editor = page.locator('.ProseMirror, [contenteditable="true"]').first();
    await editor.click();
    await editor.pressSequentially('[[Calculus');

    // Select the target page from suggestion list
    const linkSuggestion = page.getByRole('option', { name: new RegExp(targetTitle, 'i') });
    await expect(linkSuggestion).toBeVisible();
    await linkSuggestion.click();

    // Wait for autosave to settle
    await page.waitForTimeout(800);

    // Navigate to target page and rename it
    await openSidebarIfNeeded(page);
    const pagesNav = page.getByRole('navigation', { name: 'Pages' });
    await pagesNav.getByRole('link', { name: targetTitle, exact: true }).click();
    await expect(pageTitleInput).toHaveValue(targetTitle);
    const renamedTargetTitle = 'Advanced Calculus Derivatives';
    await pageTitleInput.fill(renamedTargetTitle);
    await page.waitForTimeout(800);

    // Return to subpage and click the link: should still navigate to the renamed target
    await openSidebarIfNeeded(page);
    const expandBtn = pagesNav.getByRole('button', { name: `Expand ${renamedTargetTitle}`, exact: true });
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
    }
    await pagesNav.getByRole('link', { name: subpageTitle, exact: true }).click();
    await expect(pageTitleInput).toHaveValue(subpageTitle);

    const pageLinkNode = page.locator('a[data-page-id]').first();
    await expect(pageLinkNode).toBeVisible();
    await pageLinkNode.click();
    await expect(page.getByLabel('Page title')).toHaveValue(renamedTargetTitle);

    // ------------------------------------------------------------------------
    // 4. Focus session in open mode, distraction, reload, end, rate, save
    // ------------------------------------------------------------------------
    await clickSidebarNav(page, 'Focus');

    // Use Open mode (since minimum timed mode is 5 minutes)
    const openModeRadio = page.getByRole('radio', { name: 'Open' });
    await openModeRadio.click();

    const startSessionBtn = page.getByRole('button', { name: 'Start focus session' });
    await startSessionBtn.click();

    // Verify session is active
    const endSessionBtn = page.getByRole('button', { name: 'End session' });
    await expect(endSessionBtn).toBeVisible();

    // Log a distraction
    const logDistractionBtn = page.getByRole('button', { name: /log distraction/i });
    await logDistractionBtn.click();
    const phoneCategoryBtn = page.getByRole('button', { name: 'Phone', exact: true });
    await phoneCategoryBtn.click();
    const saveDistractionBtn = page.getByRole('button', { name: 'Log', exact: true });
    await saveDistractionBtn.click();

    // Reload page and assert session is still running
    await page.reload();
    await expect(page.getByRole('button', { name: 'End session' })).toBeVisible();

    // End session
    await page.getByRole('button', { name: 'End session' }).click();
    const confirmEndBtn = page.getByRole('alertdialog').getByRole('button', { name: 'End session' });
    await confirmEndBtn.click();

    // Rate session
    const ratingRadio = page.getByRole('radio', { name: /Rating 5 of 5/i });
    await ratingRadio.click();

    // Save session
    const saveSessionBtn = page.getByRole('button', { name: 'Save session' });
    await saveSessionBtn.click();

    // "First steps" achievement toast should be displayed
    await expect(page.getByText(/first steps/i)).toBeVisible();

    // Navigate to sessions list and verify it is listed
    await clickSidebarNav(page, 'Progress');
    const allSessionsLink = page.getByRole('link', { name: /all sessions/i });
    await expect(allSessionsLink).toBeVisible();
    await allSessionsLink.click();
    await expect(page.getByRole('heading', { name: 'Sessions', exact: true })).toBeVisible();

    // ------------------------------------------------------------------------
    // 5. Chat with fake model streams "Echo:"
    // ------------------------------------------------------------------------
    await clickSidebarNav(page, 'Chat');
    const newChatBtn = page.getByRole('button', { name: 'New chat' }).first();
    await newChatBtn.click();

    const chatComposer = page.getByLabel('Message');
    await expect(chatComposer).toBeVisible();
    await chatComposer.fill('Help me review calculus');
    await chatComposer.press('Enter');

    // CHAT_FAKE_MODEL=1 causes fake stream starting with "Echo:"
    await expect(page.getByText(/Echo:\s*Help me review calculus/i)).toBeVisible();

    // ------------------------------------------------------------------------
    // 6. Theme toggle
    // ------------------------------------------------------------------------
    await clickSidebarNav(page, 'Settings');
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();

    // Switch to dark theme
    const darkThemeRadio = page.getByRole('radio', { name: 'Dark' });
    await darkThemeRadio.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Switch back to light theme
    const lightThemeRadio = page.getByRole('radio', { name: 'Light' });
    await lightThemeRadio.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  // --------------------------------------------------------------------------
  // Mobile responsive horizontal overflow check across all routes
  // --------------------------------------------------------------------------
  test('no horizontal scroll overflow on mobile across all routes', async ({ page }) => {
    // Authenticate first
    await signInWithEmailOtp(page, `mobile-check-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`);

    const routes = [
      './#/',
      './#/todos',
      './#/focus',
      './#/chat',
      './#/progress',
      './#/progress/sessions',
      './#/settings',
      './#/settings/import',
      './#/notes/trash',
      './#/login',
    ];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
      await assertNoHorizontalOverflow(page);
    }
  });

  // --------------------------------------------------------------------------
  // Keyboard accessibility: Skip link and Escape key for dialogs
  // --------------------------------------------------------------------------
  test('keyboard accessibility: Tab reaches skip link first and Escape closes dialogs', async ({ page }) => {
    // Authenticate first to mount AppShell with skip link
    await signInWithEmailOtp(page, `keyboard-check-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`);
    await page.goto('./#/');
    await expect(page.locator('#main')).toBeVisible();

    // Focus document body and press Tab to reach "Skip to content" link first
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: /skip to content/i });
    await expect(skipLink).toBeFocused();

    // Blur skipLink so it returns to sr-only and does not overlay top-left mobile menu trigger
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

    // Open search pages dialog (opening mobile drawer first if on mobile)
    await openSidebarIfNeeded(page);
    const searchPagesBtn = page.getByRole('button', { name: /search pages/i });
    await searchPagesBtn.click();
    const searchDialog = page.getByRole('dialog', { name: /search pages/i });
    await expect(searchDialog).toBeVisible();

    // Press Escape to close dialog
    await page.keyboard.press('Escape');
    await expect(searchDialog).not.toBeVisible();
  });
});
