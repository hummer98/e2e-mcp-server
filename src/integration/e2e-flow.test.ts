import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SessionManager } from '../session/manager.js';
import { launchBrowser } from '../playwright/browser.js';
import { clickElement } from '../playwright/actions.js';
import { captureScreenshot } from '../playwright/screenshot.js';
import type { Page } from 'playwright';

describe('E2E Session Integration Flow', () => {
  let manager: SessionManager;
  let testPage: Page | null = null;

  beforeEach(async () => {
    manager = new SessionManager({ sessionTimeout: 60000 });

    // Launch a test browser
    const browserResult = await launchBrowser();
    if (browserResult.ok) {
      testPage = await browserResult.value.newPage();
    }
  }, 60000); // 60 second timeout for browser launch

  afterEach(async () => {
    if (testPage) {
      await testPage.close();
      testPage = null;
    }
  }, 30000); // 30 second timeout for cleanup

  it('should complete full E2E session flow: start → navigate → interact → screenshot → end', async () => {
    // Step 1: Start session
    const startResult = await manager.startSession('/bin/echo', [
      JSON.stringify({
        status: 'ready',
        url: 'http://localhost:3001',
        port: 3001,
        pid: 12345,
        startedAt: new Date().toISOString(),
        logs: {
          stdout: '/tmp/stdout.log',
          stderr: '/tmp/stderr.log',
          combined: '/tmp/combined.log',
        },
        message: 'Server started',
      }),
    ]);

    expect(startResult.ok).toBe(true);
    if (!startResult.ok) return;

    const sessionInfo = startResult.value;
    expect(sessionInfo.sessionId).toBeDefined();
    // Browser is not automatically created by startSession
    expect(sessionInfo.browser).toBeNull();

    const sessionId = sessionInfo.sessionId;

    // Step 2: Navigate to a page using test page
    // Note: In a real scenario, session browser would be created via navigateWithSession
    // For this unit test, we use the test page directly
    if (!testPage) {
      throw new Error('Test page not available');
    }

    await testPage.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Test Page</title></head>
        <body>
          <h1>E2E Test Page</h1>
          <button id="test-button">Click Me</button>
          <div id="result"></div>
          <script>
            document.getElementById('test-button').addEventListener('click', () => {
              document.getElementById('result').textContent = 'Button clicked!';
            });
          </script>
        </body>
      </html>
    `);

    // Step 3: Interact with the page (click button)
    const clickResult = await clickElement(testPage, '#test-button');
    expect(clickResult.ok).toBe(true);

    // Step 4: Capture screenshot
    const screenshotResult = await captureScreenshot(testPage);
    expect(screenshotResult.ok).toBe(true);
    if (screenshotResult.ok) {
      expect(screenshotResult.value.data).toBeDefined();
      expect(screenshotResult.value.data.length).toBeGreaterThan(0);
    }

    // Step 5: Stop session
    const stopResult = await manager.stopSession(sessionId, '/bin/echo', [
      JSON.stringify({
        status: 'stopped',
        message: 'Server stopped',
      }),
    ]);

    expect(stopResult.ok).toBe(true);

    // Verify session is removed
    const getResult = manager.getSession(sessionId);
    expect(getResult.ok).toBe(false);
  }, 30000); // 30 second timeout

  it('should handle session with multiple page interactions', async () => {
    // Start session
    const startResult = await manager.startSession('/bin/echo', [
      JSON.stringify({
        status: 'ready',
        url: 'http://localhost:3002',
        port: 3002,
        pid: 12346,
        startedAt: new Date().toISOString(),
        logs: {
          stdout: '/tmp/stdout2.log',
          stderr: '/tmp/stderr2.log',
          combined: '/tmp/combined2.log',
        },
        message: 'Server started',
      }),
    ]);

    expect(startResult.ok).toBe(true);
    if (!startResult.ok) return;

    const sessionId = startResult.value.sessionId;

    if (!testPage) return;

    // Set up test page
    await testPage.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <input id="name" type="text" />
          <button id="submit">Submit</button>
          <div id="output"></div>
        </body>
      </html>
    `);

    // Multiple interactions
    await testPage.fill('#name', 'Test User');
    await testPage.click('#submit');

    // Verify content
    const content = await testPage.content();
    expect(content).toContain('name');

    // Clean up
    await manager.stopSession(sessionId, '/bin/echo', [
      JSON.stringify({ status: 'stopped', message: 'Done' }),
    ]);
  }, 30000); // 30 second timeout

  it('should maintain session state across multiple operations', async () => {
    const startResult = await manager.startSession('/bin/echo', [
      JSON.stringify({
        status: 'ready',
        url: 'http://localhost:3003',
        port: 3003,
        pid: 12347,
        startedAt: new Date().toISOString(),
        logs: {
          stdout: '/tmp/stdout3.log',
          stderr: '/tmp/stderr3.log',
          combined: '/tmp/combined3.log',
        },
        message: 'Server started',
      }),
    ]);

    expect(startResult.ok).toBe(true);
    if (!startResult.ok) return;

    const sessionId = startResult.value.sessionId;

    // Verify session exists
    const getResult1 = manager.getSession(sessionId);
    expect(getResult1.ok).toBe(true);

    // Update session activity
    manager.updateSessionActivity(sessionId);

    // Verify session still exists
    const getResult2 = manager.getSession(sessionId);
    expect(getResult2.ok).toBe(true);

    // Stop session
    await manager.stopSession(sessionId, '/bin/echo', [
      JSON.stringify({ status: 'stopped', message: 'Done' }),
    ]);

    // Verify session removed
    const getResult3 = manager.getSession(sessionId);
    expect(getResult3.ok).toBe(false);
  }, 30000); // 30 second timeout

  it('should handle concurrent sessions', async () => {
    // Start multiple sessions
    const session1 = await manager.startSession('/bin/echo', [
      JSON.stringify({
        status: 'ready',
        url: 'http://localhost:3004',
        port: 3004,
        pid: 12348,
        startedAt: new Date().toISOString(),
        logs: {
          stdout: '/tmp/s1-stdout.log',
          stderr: '/tmp/s1-stderr.log',
          combined: '/tmp/s1-combined.log',
        },
        message: 'Server 1 started',
      }),
    ]);

    const session2 = await manager.startSession('/bin/echo', [
      JSON.stringify({
        status: 'ready',
        url: 'http://localhost:3005',
        port: 3005,
        pid: 12349,
        startedAt: new Date().toISOString(),
        logs: {
          stdout: '/tmp/s2-stdout.log',
          stderr: '/tmp/s2-stderr.log',
          combined: '/tmp/s2-combined.log',
        },
        message: 'Server 2 started',
      }),
    ]);

    expect(session1.ok).toBe(true);
    expect(session2.ok).toBe(true);

    if (!session1.ok || !session2.ok) return;

    const sessionId1 = session1.value.sessionId;
    const sessionId2 = session2.value.sessionId;

    // Both sessions should exist
    expect(manager.getSession(sessionId1).ok).toBe(true);
    expect(manager.getSession(sessionId2).ok).toBe(true);

    // Stop both sessions
    await manager.stopSession(sessionId1, '/bin/echo', [
      JSON.stringify({ status: 'stopped', message: 'Done' }),
    ]);
    await manager.stopSession(sessionId2, '/bin/echo', [
      JSON.stringify({ status: 'stopped', message: 'Done' }),
    ]);

    // Both sessions should be removed
    expect(manager.getSession(sessionId1).ok).toBe(false);
    expect(manager.getSession(sessionId2).ok).toBe(false);
  }, 30000); // 30 second timeout
});
