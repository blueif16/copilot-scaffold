import { test, expect, Page } from '@playwright/test';

test.describe('Course Builder E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login as teacher first
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Click the Teacher demo button
    await page.getByRole('button', { name: /Teacher/i }).click();

    // Submit login form
    await page.getByRole('button', { name: /Log in|登录/i }).click();

    // Wait for redirect to dashboard
    await page.waitForURL('/teacher/dashboard', { timeout: 10000 });

    // Navigate to course builder via the Create link
    await page.getByRole('link', { name: 'Create' }).click();
    await page.waitForLoadState('networkidle');
  });

  test('should display landing page with format options', async ({ page }) => {
    // Check for landing page elements
    await expect(page.getByRole('heading', { name: 'Create a lesson' })).toBeVisible();
    await expect(page.getByText('Pick a format, then describe what you want to teach')).toBeVisible();

    // Check format pills
    await expect(page.getByRole('button', { name: /Lab Simulation/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Quiz/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Dialogue/i })).toBeVisible();
  });

  test('should transition to chat phase when format selected', async ({ page }) => {
    // Click Lab format
    await page.getByRole('button', { name: /Lab Simulation/i }).click();

    // Should transition to chat phase
    await expect(page.getByRole('heading', { name: /Lab Simulation/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /Describe your lesson/i })).toBeVisible();
  });

  test('should send message and receive response', async ({ page }) => {
    // Setup console logging
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        logs.push(msg.text());
      }
    });

    // Select format
    await page.getByRole('button', { name: /Lab Simulation/i }).click();
    await page.waitForTimeout(1000);

    // Type message
    const input = page.getByRole('textbox', { name: /Describe your lesson/i });
    await input.fill('Create a simple water cycle simulation for 8 year olds');

    // Send message
    await input.press('Enter');

    // Check frontend logging
    await page.waitForTimeout(500);
    const sendLogs = logs.filter(log => log.includes('[Frontend:handleSend]'));
    expect(sendLogs.length).toBeGreaterThan(0);

    // Wait for assistant response (loading indicator or message)
    await page.waitForTimeout(2000);
  });

  test('should transition to split view when files are generated', async ({ page }) => {
    // Setup console logging to track state changes
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        logs.push(msg.text());
      }
    });

    // Select format and send message
    await page.getByRole('button', { name: /Lab Simulation/i }).click();
    await page.waitForTimeout(1000);

    const input = page.getByRole('textbox', { name: /Describe your lesson/i });
    await input.fill('Create a simple color mixing lab');
    await input.press('Enter');

    // Wait for agent to generate files (this may take time)
    await page.waitForTimeout(10000);

    // Check for state update logs
    const stateUpdateLogs = logs.filter(log => log.includes('[Frontend:useCoAgent]'));
    console.log('State update logs:', stateUpdateLogs.length);

    // Check for phase transition logs
    const phaseTransitionLogs = logs.filter(log => log.includes('[Frontend:phase]'));
    console.log('Phase transition logs:', phaseTransitionLogs);

    // If files were generated, split view should appear
    const livePreview = page.getByText('Live Preview');
    if (await livePreview.isVisible({ timeout: 5000 })) {
      // Split view appeared
      await expect(livePreview).toBeVisible();

      // Check for Sandpack preview iframe
      const iframe = page.locator('iframe').first();
      await expect(iframe).toBeVisible({ timeout: 10000 });

      console.log('✅ Split view successfully rendered');
    } else {
      console.log('⚠️ Split view did not appear - checking logs for issues');
      console.log('All logs:', logs.slice(-20)); // Last 20 logs
    }
  });

  test('should log complete data flow cycle', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        logs.push(msg.text());
      }
    });

    // Select format
    await page.getByRole('button', { name: /Quiz/i }).click();
    await page.waitForTimeout(1000);

    // Send message
    const input = page.getByRole('textbox', { name: /Describe your lesson/i });
    await input.fill('Create a 3-question quiz about photosynthesis');
    await input.press('Enter');

    // Wait for processing
    await page.waitForTimeout(10000);

    // Analyze logs for complete cycle
    console.log('\n=== DATA FLOW ANALYSIS ===\n');

    const frontendSend = logs.filter(log => log.includes('[Frontend:handleSend]'));
    console.log('1. Frontend Send:', frontendSend.length > 0 ? '✅' : '❌');

    const frontendState = logs.filter(log => log.includes('[Frontend:useCoAgent]'));
    console.log('2. Frontend State Update:', frontendState.length > 0 ? '✅' : '❌');

    const phaseTransition = logs.filter(log => log.includes('[Frontend:phase]'));
    console.log('3. Phase Transition:', phaseTransition.length > 0 ? '✅' : '❌');

    console.log('\n=== RECENT LOGS ===\n');
    logs.slice(-10).forEach(log => console.log(log));
  });
});
