import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import type { Browser, Page } from 'playwright';
import * as fs from 'fs';

describe('Playwright Screenshot', () => {
  let testBrowser: Browser | null = null;
  let testPage: Page | null = null;

  beforeEach(async () => {
    const { launchBrowser } = await import('./browser.js');
    const browserResult = await launchBrowser();
    if (browserResult.ok) {
      testBrowser = browserResult.value;
      testPage = await testBrowser.newPage();
      // Set viewport for consistent screenshots
      await testPage.setViewportSize({ width: 800, height: 600 });
    }
  });

  afterEach(async () => {
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

  describe('captureScreenshot', () => {
    it('should capture full page screenshot as base64', async () => {
      const { captureScreenshot } = await import('./screenshot.js');
      if (!testPage) throw new Error('Test page not initialized');

      await testPage.setContent('<div><h1>Test Page</h1></div>');

      const result = await captureScreenshot(testPage, { fullPage: true });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toBeDefined();
        expect(result.value.data.length).toBeGreaterThan(0);
        // Verify base64 format
        expect(result.value.data).toMatch(/^[A-Za-z0-9+/]+=*$/);
      }
    });

    it('should capture viewport screenshot by default', async () => {
      const { captureScreenshot } = await import('./screenshot.js');
      if (!testPage) throw new Error('Test page not initialized');

      await testPage.setContent('<div><h1>Test Page</h1></div>');

      const result = await captureScreenshot(testPage);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toBeDefined();
      }
    });

    it('should save screenshot to file when path provided', async () => {
      const { captureScreenshot } = await import('./screenshot.js');
      if (!testPage) throw new Error('Test page not initialized');

      await testPage.setContent('<div><h1>Test Page</h1></div>');

      const tempPath = '/tmp/test-screenshot.png';

      // Clean up any existing file
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }

      const result = await captureScreenshot(testPage, { path: tempPath });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.path).toBe(tempPath);
        expect(fs.existsSync(tempPath)).toBe(true);

        // Verify file is not empty
        const stats = fs.statSync(tempPath);
        expect(stats.size).toBeGreaterThan(0);

        // Cleanup
        fs.unlinkSync(tempPath);
      }
    });

    it('should support element-specific screenshot', async () => {
      const { captureScreenshot } = await import('./screenshot.js');
      if (!testPage) throw new Error('Test page not initialized');

      await testPage.setContent(`
        <div>
          <div id="target" style="width: 200px; height: 100px; background: red;">
            Target Element
          </div>
        </div>
      `);

      const result = await captureScreenshot(testPage, { selector: '#target' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data).toBeDefined();
      }
    });

    it('should return error when element not found', async () => {
      const { captureScreenshot } = await import('./screenshot.js');
      if (!testPage) throw new Error('Test page not initialized');

      await testPage.setContent('<div>No target</div>');

      const result = await captureScreenshot(testPage, {
        selector: '#nonexistent',
        timeout: 100,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('timeout');
      }
    });

    it('should support different image formats', async () => {
      const { captureScreenshot } = await import('./screenshot.js');
      if (!testPage) throw new Error('Test page not initialized');

      await testPage.setContent('<div><h1>Test</h1></div>');

      const jpegResult = await captureScreenshot(testPage, { type: 'jpeg', quality: 80 });

      expect(jpegResult.ok).toBe(true);
      if (jpegResult.ok) {
        expect(jpegResult.value.data).toBeDefined();
      }
    });
  });
});
