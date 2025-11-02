import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import type { Browser, Page } from 'playwright';

describe('Playwright Content Operations', () => {
  let testBrowser: Browser | null = null;
  let testPage: Page | null = null;

  beforeEach(async () => {
    const { launchBrowser } = await import('./browser.js');
    const browserResult = await launchBrowser();
    if (browserResult.ok) {
      testBrowser = browserResult.value;
      testPage = await testBrowser.newPage();
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

  describe('getPageContent', () => {
    it('should retrieve page HTML content', async () => {
      const { getPageContent } = await import('./content.js');
      if (!testPage) throw new Error('Test page not initialized');

      await testPage.setContent('<html><body><h1>Test Page</h1></body></html>');

      const result = await getPageContent(testPage);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toContain('<h1>Test Page</h1>');
      }
    });
  });

  describe('getElementText', () => {
    it('should retrieve text content of element', async () => {
      const { getElementText } = await import('./content.js');
      if (!testPage) throw new Error('Test page not initialized');

      await testPage.setContent('<div><p id="test">Hello World</p></div>');

      const result = await getElementText(testPage, '#test');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('Hello World');
      }
    });

    it('should return error when element not found', async () => {
      const { getElementText } = await import('./content.js');
      if (!testPage) throw new Error('Test page not initialized');

      await testPage.setContent('<div>No target</div>');

      const result = await getElementText(testPage, '#nonexistent', { timeout: 100 });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('timeout');
      }
    });
  });

  describe('getElementAttribute', () => {
    it('should retrieve element attribute', async () => {
      const { getElementAttribute } = await import('./content.js');
      if (!testPage) throw new Error('Test page not initialized');

      await testPage.setContent('<div><a id="link" href="https://example.com">Link</a></div>');

      const result = await getElementAttribute(testPage, '#link', 'href');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('https://example.com');
      }
    });

    it('should return null when attribute does not exist', async () => {
      const { getElementAttribute } = await import('./content.js');
      if (!testPage) throw new Error('Test page not initialized');

      await testPage.setContent('<div><a id="link">Link</a></div>');

      const result = await getElementAttribute(testPage, '#link', 'href');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe('executeScript', () => {
    it('should execute JavaScript and return result', async () => {
      const { executeScript } = await import('./content.js');
      if (!testPage) throw new Error('Test page not initialized');

      await testPage.setContent('<div>Test</div>');

      const result = await executeScript(testPage, '() => 1 + 2');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(3);
      }
    });

    it('should support passing arguments to script', async () => {
      const { executeScript } = await import('./content.js');
      if (!testPage) throw new Error('Test page not initialized');

      await testPage.setContent('<div>Test</div>');

      const result = await executeScript(
        testPage,
        '(a, b) => a + b',
        [5, 10]
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(15);
      }
    });

    it('should handle script errors', async () => {
      const { executeScript } = await import('./content.js');
      if (!testPage) throw new Error('Test page not initialized');

      await testPage.setContent('<div>Test</div>');

      const result = await executeScript(testPage, '() => { throw new Error("Test error") }');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('script_error');
      }
    });

    it('should support DOM manipulation', async () => {
      const { executeScript } = await import('./content.js');
      if (!testPage) throw new Error('Test page not initialized');

      await testPage.setContent('<div id="target">Original</div>');

      const result = await executeScript(
        testPage,
        `() => {
          document.getElementById('target').textContent = 'Modified';
          return document.getElementById('target').textContent;
        }`
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('Modified');
      }

      // Verify DOM was actually modified
      const textContent = await testPage.textContent('#target');
      expect(textContent).toBe('Modified');
    });
  });

  describe('evaluateOnSelector', () => {
    it('should evaluate function on selected element', async () => {
      const { evaluateOnSelector } = await import('./content.js');
      if (!testPage) throw new Error('Test page not initialized');

      await testPage.setContent('<div><button id="btn" disabled>Click</button></div>');

      const result = await evaluateOnSelector(
        testPage,
        '#btn',
        'el => el.disabled'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(true);
      }
    });

    it('should support element property access', async () => {
      const { evaluateOnSelector } = await import('./content.js');
      if (!testPage) throw new Error('Test page not initialized');

      await testPage.setContent('<div><input id="field" value="Test Value" /></div>');

      const result = await evaluateOnSelector(
        testPage,
        '#field',
        'el => el.value'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('Test Value');
      }
    });

    it('should return error when element not found', async () => {
      const { evaluateOnSelector } = await import('./content.js');
      if (!testPage) throw new Error('Test page not initialized');

      await testPage.setContent('<div>No target</div>');

      const result = await evaluateOnSelector(
        testPage,
        '#nonexistent',
        'el => el.textContent',
        { timeout: 100 }
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('timeout');
      }
    });
  });
});
