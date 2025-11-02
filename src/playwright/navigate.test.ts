import { describe, it, expect, afterEach } from '@jest/globals';
import type { Browser, Page } from 'playwright';

describe('Playwright Navigation', () => {
  let testBrowser: Browser | null = null;
  let testPage: Page | null = null;

  afterEach(async () => {
    // Cleanup test resources
    if (testPage && !testPage.isClosed()) {
      try {
        await testPage.close();
      } catch (error) {
        // Ignore cleanup errors
      }
      testPage = null;
    }

    if (testBrowser) {
      try {
        await testBrowser.close();
      } catch (error) {
        // Ignore cleanup errors
      }
      testBrowser = null;
    }
  });

  describe('navigateToUrl', () => {
    it('should navigate to URL successfully', async () => {
      const { launchBrowser } = await import('./browser.js');
      const { navigateToUrl } = await import('./navigate.js');

      const browserResult = await launchBrowser();
      expect(browserResult.ok).toBe(true);
      if (!browserResult.ok) return;

      testBrowser = browserResult.value;
      const pageResult = await testBrowser.newPage();
      testPage = pageResult;

      const result = await navigateToUrl(testPage, 'about:blank');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(testPage.url()).toBe('about:blank');
      }
    });

    it('should handle navigation with waitUntil option', async () => {
      const { launchBrowser } = await import('./browser.js');
      const { navigateToUrl } = await import('./navigate.js');

      const browserResult = await launchBrowser();
      expect(browserResult.ok).toBe(true);
      if (!browserResult.ok) return;

      testBrowser = browserResult.value;
      testPage = await testBrowser.newPage();

      const result = await navigateToUrl(testPage, 'about:blank', {
        waitUntil: 'load',
      });

      expect(result.ok).toBe(true);
    });

    it('should handle navigation timeout', async () => {
      const { launchBrowser } = await import('./browser.js');
      const { navigateToUrl } = await import('./navigate.js');

      const browserResult = await launchBrowser();
      expect(browserResult.ok).toBe(true);
      if (!browserResult.ok) return;

      testBrowser = browserResult.value;
      testPage = await testBrowser.newPage();

      // Use very short timeout for an unreachable URL
      const result = await navigateToUrl(testPage, 'https://10.255.255.1', {
        timeout: 100,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('navigation_failed');
        if (result.error.type === 'navigation_failed') {
          expect(result.error.url).toBe('https://10.255.255.1');
        }
      }
    });

    it('should handle invalid URLs', async () => {
      const { launchBrowser } = await import('./browser.js');
      const { navigateToUrl } = await import('./navigate.js');

      const browserResult = await launchBrowser();
      expect(browserResult.ok).toBe(true);
      if (!browserResult.ok) return;

      testBrowser = browserResult.value;
      testPage = await testBrowser.newPage();

      const result = await navigateToUrl(testPage, 'not-a-valid-url');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('navigation_failed');
      }
    });
  });

  describe('navigateWithSession', () => {
    it('should create new page and navigate when no existing page', async () => {
      const { SessionStore } = await import('../session/store.js');
      const { launchBrowser } = await import('./browser.js');
      const { navigateWithSession } = await import('./navigate.js');

      // Create a test session
      const store = SessionStore.getInstance();
      const browserResult = await launchBrowser();
      expect(browserResult.ok).toBe(true);
      if (!browserResult.ok) return;

      testBrowser = browserResult.value;

      const sessionResult = store.createSession({
        url: 'http://localhost:3001',
        port: 3001,
        pid: 12345,
        startedAt: new Date(),
        logs: {
          stdout: '/tmp/stdout.log',
          stderr: '/tmp/stderr.log',
          combined: '/tmp/combined.log',
        },
      });

      expect(sessionResult.ok).toBe(true);
      if (!sessionResult.ok) return;

      const sessionId = sessionResult.value.sessionId;

      // Update session with browser
      store.updateSession(sessionId, { browser: testBrowser });

      // Navigate with session
      const navResult = await navigateWithSession(sessionId, 'about:blank');

      expect(navResult.ok).toBe(true);
      if (navResult.ok) {
        expect(navResult.value.url()).toBe('about:blank');
        testPage = navResult.value;
      }

      // Cleanup
      store.deleteSession(sessionId);
    });

    it('should reuse existing page', async () => {
      const { SessionStore } = await import('../session/store.js');
      const { launchBrowser } = await import('./browser.js');
      const { navigateWithSession } = await import('./navigate.js');

      const store = SessionStore.getInstance();
      const browserResult = await launchBrowser();
      expect(browserResult.ok).toBe(true);
      if (!browserResult.ok) return;

      testBrowser = browserResult.value;
      testPage = await testBrowser.newPage();

      const sessionResult = store.createSession({
        url: 'http://localhost:3001',
        port: 3001,
        pid: 12345,
        startedAt: new Date(),
        logs: {
          stdout: '/tmp/stdout.log',
          stderr: '/tmp/stderr.log',
          combined: '/tmp/combined.log',
        },
      });

      expect(sessionResult.ok).toBe(true);
      if (!sessionResult.ok) return;

      const sessionId = sessionResult.value.sessionId;

      // Update session with browser and page
      store.updateSession(sessionId, { browser: testBrowser, page: testPage });

      // First navigation
      const navResult1 = await navigateWithSession(sessionId, 'about:blank');
      expect(navResult1.ok).toBe(true);

      // Second navigation should reuse the same page
      const navResult2 = await navigateWithSession(sessionId, 'about:blank');
      expect(navResult2.ok).toBe(true);

      if (navResult1.ok && navResult2.ok) {
        expect(navResult2.value).toBe(navResult1.value);
      }

      // Cleanup
      store.deleteSession(sessionId);
    });

    it('should return error for non-existent session', async () => {
      const { navigateWithSession } = await import('./navigate.js');

      const result = await navigateWithSession('non-existent-session', 'about:blank');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('session_not_found');
      }
    });

    it('should return error when browser is not initialized', async () => {
      const { SessionStore } = await import('../session/store.js');
      const { navigateWithSession } = await import('./navigate.js');

      const store = SessionStore.getInstance();

      const sessionResult = store.createSession({
        url: 'http://localhost:3001',
        port: 3001,
        pid: 12345,
        startedAt: new Date(),
        logs: {
          stdout: '/tmp/stdout.log',
          stderr: '/tmp/stderr.log',
          combined: '/tmp/combined.log',
        },
      });

      expect(sessionResult.ok).toBe(true);
      if (!sessionResult.ok) return;

      const sessionId = sessionResult.value.sessionId;

      // Navigate without browser initialized
      const navResult = await navigateWithSession(sessionId, 'about:blank');

      expect(navResult.ok).toBe(false);
      if (!navResult.ok) {
        expect(navResult.error.type).toBe('browser_not_initialized');
      }

      // Cleanup
      store.deleteSession(sessionId);
    });
  });
});
