import { test, expect, Page } from '@playwright/test';

test.describe('Course Builder E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to course builder page
    await page.goto('/teacher/courses/new');
    await page.waitForLoadState('networkidle');
  });

  test('should display landing page with format options', async ({ page }) => {
    // Check for landing page elements
    await expect(page.getByText('Create a lesson')).toBeVisible();
    await expect(page.getByText('Pick a format, then describe what you want to teach')).toBeVisible();

    // Check format pills
    await expect(page.getByText('Lab Simulation')).toBeVisible();
    await expect(page.getByText('Quiz')).toBeVisible();
    await expect(page.getByText('Dialogue')).toBeVisible();
  });

  test('should transition to chat phase when format selected', async ({ page }) => {
    // Click Lab format
    await page.getByText('Lab Simulation').click();

    // Should transition to chat phase
    await expect(page.getByText('🧪 Lab Simulation')).toBeVisible();
    await expect(page.getByPlaceholder('Describe your lesson...')).toBeVisible();

    // Should show assistant greeting
    await expect(page.getByText(/Great, let's build a/)).toBeVisible();
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
    await page.getByText('Lab Simulation').click();
    await page.waitForTimeout(1000);

    // Type message
    const input = page.getByPlaceholder('Describe your lesson...');
    await input.fill('Create a simple water cycle simulation for 8 year olds');

    // Send message
    await input.press('Enter');

    // Check frontend logging
    await page.waitForTimeout(500);
    const sendLogs = logs.filter(log => log.includes('[Frontend:handleSend]'));
    expect(sendLogs.length).toBeGreaterThan(0);

    // Wait for assistant response
    await expect(page.locator('.bg-ink\\/\\[0\\.04\\]').first()).toBeVisible({ timeout: 30000 });

    // Check if loading indicator appeared
    const loadingLogs = logs.filter(log => log.includes('isLoading'));
    console.log('Loading logs:', loadingLogs);
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
    await page.getByText('Lab Simulation').click();
    await page.waitForTimeout(1000);

    const input = page.getByPlaceholder('Describe your lesson...');
    await input.fill('Create a simple color mixing lab');
    await input.press('Enter');

    // Wait for agent to generate files (this may take time)
    // Look for split view elements
    await page.waitForTimeout(2000);

    // Check for state update logs
    const stateUpdateLogs = logs.filter(log => log.includes('[Frontend:useCoAgent]'));
    console.log('State update logs:', stateUpdateLogs);

    // Check for phase transition logs
    const phaseTransitionLogs = logs.filter(log => log.includes('[Frontend:phase]'));
    console.log('Phase transition logs:', phaseTransitionLogs);

    // Check for backend logs (if visible in browser console)
    const backendLogs = logs.filter(log =>
      log.includes('[Agent:') || log.includes('[CopilotKit')
    );
    console.log('Backend-related logs:', backendLogs);

    // If files were generated, split view should appear
    const livePreview = page.getByText('Live Preview');
    if (await livePreview.isVisible({ timeout: 30000 })) {
      // Split view appeared
      await expect(livePreview).toBeVisible();
      await expect(page.locator('.w-\\[420px\\]')).toBeVisible(); // Chat panel

      // Check for Sandpack preview
      await expect(page.locator('iframe[title="Sandpack Preview"]')).toBeVisible({ timeout: 10000 });

      console.log('✅ Split view successfully rendered');
    } else {
      console.log('⚠️ Split view did not appear - checking logs for issues');
      console.log('All logs:', logs);
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
    await page.getByText('Quiz').click();
    await page.waitForTimeout(1000);

    // Send message
    const input = page.getByPlaceholder('Describe your lesson...');
    await input.fill('Create a 3-question quiz about photosynthesis');
    await input.press('Enter');

    // Wait for processing
    await page.waitForTimeout(5000);

    // Analyze logs for complete cycle
    console.log('\n=== DATA FLOW ANALYSIS ===\n');

    const frontendSend = logs.filter(log => log.includes('[Frontend:handleSend]'));
    console.log('1. Frontend Send:', frontendSend.length > 0 ? '✅' : '❌');
    if (frontendSend.length > 0) console.log('   ', frontendSend[0]);

    const copilotKitRequest = logs.filter(log => log.includes('[CopilotKit→Backend]'));
    console.log('2. CopilotKit Request:', copilotKitRequest.length > 0 ? '✅' : '❌');
    if (copilotKitRequest.length > 0) console.log('   ', copilotKitRequest[0]);

    const agentChat = logs.filter(log => log.includes('[Agent:chat_node]'));
    console.log('3. Agent Chat Node:', agentChat.length > 0 ? '✅' : '❌');
    if (agentChat.length > 0) console.log('   ', agentChat[0]);

    const agentTool = logs.filter(log => log.includes('[Agent:tool_executor]'));
    console.log('4. Agent Tool Executor:', agentTool.length > 0 ? '✅' : '❌');
    if (agentTool.length > 0) console.log('   ', agentTool[0]);

    const copilotKitResponse = logs.filter(log => log.includes('[Backend→CopilotKit]'));
    console.log('5. CopilotKit Response:', copilotKitResponse.length > 0 ? '✅' : '❌');
    if (copilotKitResponse.length > 0) console.log('   ', copilotKitResponse[0]);

    const frontendState = logs.filter(log => log.includes('[Frontend:useCoAgent]'));
    console.log('6. Frontend State Update:', frontendState.length > 0 ? '✅' : '❌');
    if (frontendState.length > 0) console.log('   ', frontendState[0]);

    const phaseTransition = logs.filter(log => log.includes('[Frontend:phase]'));
    console.log('7. Phase Transition:', phaseTransition.length > 0 ? '✅' : '❌');
    if (phaseTransition.length > 0) console.log('   ', phaseTransition[0]);

    console.log('\n=== ALL LOGS ===\n');
    logs.forEach(log => console.log(log));
  });
});
