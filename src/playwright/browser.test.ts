import { describe, it, expect, afterEach } from '@jest/globals';
import type { Browser } from 'playwright';

describe('Playwright Browser Manager', () => {
  let testBrowser: Browser | null = null;

  afterEach(async () => {
    // Cleanup test browser
    if (testBrowser) {
      try {
        await testBrowser.close();
      } catch (error) {
        // Ignore cleanup errors
      }
      testBrowser = null;
    }
  });

  describe('launchBrowser', () => {
    it('should launch a browser instance', async () => {
      const { launchBrowser } = await import('./browser.js');

      const result = await launchBrowser();

      expect(result.ok).toBe(true);
      if (result.ok) {
        testBrowser = result.value;
        expect(testBrowser.isConnected()).toBe(true);
      }
    });

    it('should launch browser with headless mode by default', async () => {
      const { launchBrowser } = await import('./browser.js');

      const result = await launchBrowser();

      expect(result.ok).toBe(true);
      if (result.ok) {
        testBrowser = result.value;
        // Browser should be connected in headless mode
        expect(testBrowser.isConnected()).toBe(true);
      }
    });

    it('should support custom launch options', async () => {
      const { launchBrowser } = await import('./browser.js');

      const result = await launchBrowser({
        headless: true,
        timeout: 60000
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        testBrowser = result.value;
        expect(testBrowser.isConnected()).toBe(true);
      }
    });
  });

  describe('getOrCreatePage', () => {
    it('should create new page from browser', async () => {
      const { launchBrowser, getOrCreatePage } = await import('./browser.js');

      const browserResult = await launchBrowser();
      expect(browserResult.ok).toBe(true);
      if (!browserResult.ok) return;

      testBrowser = browserResult.value;

      const pageResult = await getOrCreatePage(testBrowser, null);

      expect(pageResult.ok).toBe(true);
      if (pageResult.ok) {
        expect(pageResult.value).toBeDefined();
        expect(pageResult.value.url()).toBe('about:blank');
      }
    });

    it('should reuse existing page', async () => {
      const { launchBrowser, getOrCreatePage } = await import('./browser.js');

      const browserResult = await launchBrowser();
      expect(browserResult.ok).toBe(true);
      if (!browserResult.ok) return;

      testBrowser = browserResult.value;

      // Create first page
      const firstPageResult = await getOrCreatePage(testBrowser, null);
      expect(firstPageResult.ok).toBe(true);
      if (!firstPageResult.ok) return;

      const firstPage = firstPageResult.value;

      // Reuse same page
      const secondPageResult = await getOrCreatePage(testBrowser, firstPage);
      expect(secondPageResult.ok).toBe(true);
      if (secondPageResult.ok) {
        expect(secondPageResult.value).toBe(firstPage);
      }
    });

    it('should create new page if existing page is closed', async () => {
      const { launchBrowser, getOrCreatePage } = await import('./browser.js');

      const browserResult = await launchBrowser();
      expect(browserResult.ok).toBe(true);
      if (!browserResult.ok) return;

      testBrowser = browserResult.value;

      // Create first page
      const firstPageResult = await getOrCreatePage(testBrowser, null);
      expect(firstPageResult.ok).toBe(true);
      if (!firstPageResult.ok) return;

      const firstPage = firstPageResult.value;

      // Close the page
      await firstPage.close();

      // Should create new page
      const secondPageResult = await getOrCreatePage(testBrowser, firstPage);
      expect(secondPageResult.ok).toBe(true);
      if (secondPageResult.ok) {
        expect(secondPageResult.value).not.toBe(firstPage);
        expect(secondPageResult.value.isClosed()).toBe(false);
      }
    });
  });

  describe('isBrowserHealthy', () => {
    it('should return true for connected browser', async () => {
      const { launchBrowser, isBrowserHealthy } = await import('./browser.js');

      const result = await launchBrowser();
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      testBrowser = result.value;

      expect(isBrowserHealthy(testBrowser)).toBe(true);
    });

    it('should return false for disconnected browser', async () => {
      const { launchBrowser, isBrowserHealthy } = await import('./browser.js');

      const result = await launchBrowser();
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      testBrowser = result.value;

      // Close browser
      await testBrowser.close();

      expect(isBrowserHealthy(testBrowser)).toBe(false);
    });

    it('should return false for null browser', async () => {
      const { isBrowserHealthy } = await import('./browser.js');

      expect(isBrowserHealthy(null)).toBe(false);
    });
  });

  describe('closeBrowser', () => {
    it('should close browser gracefully', async () => {
      const { launchBrowser, closeBrowser } = await import('./browser.js');

      const result = await launchBrowser();
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      testBrowser = result.value;

      const closeResult = await closeBrowser(testBrowser);

      expect(closeResult.ok).toBe(true);
      expect(testBrowser.isConnected()).toBe(false);

      testBrowser = null; // Already closed
    });

    it('should handle null browser', async () => {
      const { closeBrowser } = await import('./browser.js');

      const result = await closeBrowser(null);

      expect(result.ok).toBe(true);
    });

    it('should handle already closed browser', async () => {
      const { launchBrowser, closeBrowser } = await import('./browser.js');

      const result = await launchBrowser();
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      testBrowser = result.value;

      // Close browser manually
      await testBrowser.close();

      // Should handle gracefully
      const closeResult = await closeBrowser(testBrowser);

      expect(closeResult.ok).toBe(true);

      testBrowser = null;
    });
  });
});
