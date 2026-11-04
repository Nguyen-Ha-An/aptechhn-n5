import { test, expect, type Page } from '@playwright/test';
import { getLatestOtpCode } from './helpers/mail';

// ============================================================================
// Helper Functions (Isolate selectors and interactions)
// ============================================================================

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
  await expect(page.getByText(new RegExp(`Check your inbox at ${email}`, 'i'))).toBeVisible();

  // Retrieve OTP code from local mail server
  const otpCode = await getLatestOtpCode(email);

  // Fill in the 6-digit code
  const codeInput = page.getByRole('textbox', { name: /code|token/i });
  await codeInput.fill(otpCode);

  // If a submit button is present, click it; otherwise press Enter
  const verifyBtn = page.getByRole('button', { name: /verify|sign in|submit/i });
  if (await verifyBtn.isVisible()) {
    await verifyBtn.click();
  } else {
    await codeInput.press('Enter');
  }

  // User should land on the main authenticated view (Today)
  await expect(page.getByRole('link', { name: 'Today' })).toBeVisible();
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
  const testEmail = `student-${Date.now()}@example.com`;

  test('complete study lifecycle: auth, todos, pages, focus, chat, theme', async ({ page }) => {
    // 1. Sign in with OTP code
    await signInWithEmailOtp(page, testEmail);

    // ------------------------------------------------------------------------
    // 2. Add, complete, and undo todo
    // ------------------------------------------------------------------------
    await page.getByRole('link', { name: 'Todos' }).click();
    await expect(page.getByRole('heading', { name: 'Todos' })).toBeVisible();

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
    const newPageBtn = page.getByRole('button', { name: 'New page' });
    await newPageBtn.click();

    const targetTitle = 'Calculus Derivatives';
    const pageTitleInput = page.getByLabel('Page title');
    await pageTitleInput.fill(targetTitle);
    await pageTitleInput.press('Enter');

    // Create subpage from menu or sidebar
    const addSubpageBtn = page.getByRole('button', { name: 'Add subpage' });
    await addSubpageBtn.click();

    const subpageTitle = 'Derivative Practice Problems';
    await pageTitleInput.fill(subpageTitle);
    await pageTitleInput.press('Enter');

    // Insert [[link]] in editor
    const editor = page.locator('.ProseMirror, [contenteditable="true"]').first();
    await editor.click();
    await editor.pressSequentially('[[Calculus');

    // Select the target page from suggestion list
    const linkSuggestion = page.getByRole('option', { name: new RegExp(targetTitle, 'i') });
    if (await linkSuggestion.isVisible()) {
      await linkSuggestion.click();
    } else {
      await page.keyboard.press('Enter');
    }

    // Wait for autosave to settle
    await page.waitForTimeout(1000);

    // Navigate to target page and rename it
    await page.getByRole('link', { name: targetTitle }).first().click();
    const renamedTargetTitle = 'Advanced Calculus Derivatives';
    await pageTitleInput.fill(renamedTargetTitle);
    await pageTitleInput.press('Enter');
    await page.waitForTimeout(1000);

    // Return to subpage and click the link: should still navigate to the renamed target
    await page.getByRole('link', { name: subpageTitle }).click();
    const pageLinkNode = page.locator(`a[data-page-id], a:has-text("${renamedTargetTitle}")`).first();
    await pageLinkNode.click();
    await expect(page.getByLabel('Page title')).toHaveValue(renamedTargetTitle);

    // ------------------------------------------------------------------------
    // 4. Focus session in open mode, distraction, reload, end, rate, save
    // ------------------------------------------------------------------------
    await page.getByRole('link', { name: 'Focus' }).click();

    // Use Open mode (since minimum timed mode is 5 minutes)
    const openModeBtn = page.getByRole('button', { name: 'Open' });
    if (await openModeBtn.isVisible()) {
      await openModeBtn.click();
    } else {
      await page.getByRole('tab', { name: 'Open' }).click();
    }

    const startSessionBtn = page.getByRole('button', { name: 'Start focus session' });
    await startSessionBtn.click();

    // Verify session is active
    const endSessionBtn = page.getByRole('button', { name: 'End session' });
    await expect(endSessionBtn).toBeVisible();

    // Log a distraction
    const logDistractionBtn = page.getByRole('button', { name: 'Log distraction' });
    await logDistractionBtn.click();
    const phoneCategoryBtn = page.getByRole('button', { name: 'Phone' });
    await phoneCategoryBtn.click();

    // Reload page and assert session is still running
    await page.reload();
    await expect(page.getByRole('button', { name: 'End session' })).toBeVisible();

    // End session
    await endSessionBtn.click();
    const confirmEndBtn = page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'End session' })
      .or(page.getByRole('button', { name: 'End session' }).last());
    await confirmEndBtn.click();

    // Rate session
    const ratingRadio = page.getByRole('radio', { name: '5' }).or(page.getByLabel('5'));
    if (await ratingRadio.isVisible()) {
      await ratingRadio.click();
    }

    // Save session
    const saveSessionBtn = page.getByRole('button', { name: 'Save session' });
    await saveSessionBtn.click();

    // "First steps" achievement toast should be displayed
    await expect(page.getByText(/first steps/i)).toBeVisible();

    // Navigate to sessions list and verify it is listed
    await page.getByRole('link', { name: 'Progress' }).click();
    const allSessionsLink = page.getByRole('link', { name: /all sessions|sessions/i });
    if (await allSessionsLink.isVisible()) {
      await allSessionsLink.click();
      await expect(page.getByRole('heading', { name: 'Sessions' })).toBeVisible();
    }

    // ------------------------------------------------------------------------
    // 5. Chat with fake model streams "Echo:"
    // ------------------------------------------------------------------------
    await page.getByRole('link', { name: 'Chat' }).click();
    const newChatBtn = page.getByRole('button', { name: 'New chat' });
    if (await newChatBtn.isVisible()) {
      await newChatBtn.click();
    }

    const chatComposer = page.getByLabel('Message');
    await chatComposer.fill('Help me review calculus');
    await chatComposer.press('Enter');

    // CHAT_FAKE_MODEL=1 causes fake stream starting with "Echo:"
    await expect(page.getByText(/Echo:\s*Help me review calculus/i)).toBeVisible();

    // ------------------------------------------------------------------------
    // 6. Theme toggle
    // ------------------------------------------------------------------------
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    // Switch to dark theme
    const darkThemeBtn = page.getByRole('button', { name: 'Dark' }).or(page.getByLabel('Dark'));
    await darkThemeBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Switch back to light theme
    const lightThemeBtn = page.getByRole('button', { name: 'Light' }).or(page.getByLabel('Light'));
    await lightThemeBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  // --------------------------------------------------------------------------
  // Mobile responsive horizontal overflow check across all routes
  // --------------------------------------------------------------------------
  test('no horizontal scroll overflow on mobile across all routes', async ({ page }) => {
    // Authenticate first
    await signInWithEmailOtp(page, `mobile-check-${Date.now()}@example.com`);

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
    await signInWithEmailOtp(page, `keyboard-check-${Date.now()}@example.com`);
    await page.goto('./#/');

    // Tab reaches "Skip to content" link first
    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: /skip to content/i });
    await expect(skipLink).toBeFocused();

    // Open any modal / dialog (e.g. search pages dialog or settings delete account dialog)
    const searchPagesBtn = page.getByRole('button', { name: /search pages/i });
    if (await searchPagesBtn.isVisible()) {
      await searchPagesBtn.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // Press Escape to close dialog
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
    }
  });
});
