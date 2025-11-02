import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import type { Browser, Page } from 'playwright';

describe('Playwright Actions', () => {
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

  describe('waitForElement', () => {
    it('should wait for element to appear', async () => {
      const { waitForElement } = await import('./actions.js');
      if (!testPage) throw new Error('Test page not initialized');

      // Create simple HTML with target element
      await testPage.setContent('<div><button id="test-btn">Click me</button></div>');

      const result = await waitForElement(testPage, '#test-btn');

      expect(result.ok).toBe(true);
    });

    it('should timeout when element not found', async () => {
      const { waitForElement } = await import('./actions.js');
      if (!testPage) throw new Error('Test page not initialized');

      await testPage.setContent('<div>No button here</div>');

      const result = await waitForElement(testPage, '#nonexistent', { timeout: 100 });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('timeout');
        if (result.error.type === 'timeout') {
          expect(result.error.selector).toBe('#nonexistent');
        }
      }
    });

    it('should support custom state option', async () => {
      const { waitForElement } = await import('./actions.js');
      if (!testPage) throw new Error('Test page not initialized');

      await testPage.setContent('<div><button id="test-btn" style="visibility:hidden">Hidden</button></div>');

      const result = await waitForElement(testPage, '#test-btn', { state: 'attached' });

      expect(result.ok).toBe(true);
    });
  });

  describe('clickElement', () => {
    it('should click on element successfully', async () => {
      const { clickElement } = await import('./actions.js');
      if (!testPage) throw new Error('Test page not initialized');

      await testPage.setContent(`
        <div>
          <button id="test-btn" onclick="this.textContent='Clicked'">Click me</button>
        </div>
      `);

      const result = await clickElement(testPage, '#test-btn');

      expect(result.ok).toBe(true);

      // Verify button was clicked
      const buttonText = await testPage.textContent('#test-btn');
      expect(buttonText).toBe('Clicked');
    });

    it('should return error when element not found', async () => {
      const { clickElement } = await import('./actions.js');
      if (!testPage) throw new Error('Test page not initialized');

      await testPage.setContent('<div>No button</div>');

      const result = await clickElement(testPage, '#nonexistent', { timeout: 100 });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('timeout');
      }
    });

    it('should support click options', async () => {
      const { clickElement } = await import('./actions.js');
      if (!testPage) throw new Error('Test page not initialized');

      await testPage.setContent(`
        <div>
          <button id="test-btn" ondblclick="this.textContent='Double Clicked'">Click me</button>
        </div>
      `);

      const result = await clickElement(testPage, '#test-btn', { clickCount: 2 });

      expect(result.ok).toBe(true);

      const buttonText = await testPage.textContent('#test-btn');
      expect(buttonText).toBe('Double Clicked');
    });
  });

  describe('typeText', () => {
    it('should type text into input field', async () => {
      const { typeText } = await import('./actions.js');
      if (!testPage) throw new Error('Test page not initialized');

      await testPage.setContent('<div><input id="test-input" type="text" /></div>');

      const result = await typeText(testPage, '#test-input', 'Hello World');

      expect(result.ok).toBe(true);

      const inputValue = await testPage.inputValue('#test-input');
      expect(inputValue).toBe('Hello World');
    });

    it('should return error when input not found', async () => {
      const { typeText } = await import('./actions.js');
      if (!testPage) throw new Error('Test page not initialized');

      await testPage.setContent('<div>No input</div>');

      const result = await typeText(testPage, '#nonexistent', 'text', { timeout: 100 });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('timeout');
      }
    });

    it('should support typing delay', async () => {
      const { typeText } = await import('./actions.js');
      if (!testPage) throw new Error('Test page not initialized');

      await testPage.setContent('<div><input id="test-input" type="text" /></div>');

      const result = await typeText(testPage, '#test-input', 'ABC', { delay: 50 });

      expect(result.ok).toBe(true);

      const inputValue = await testPage.inputValue('#test-input');
      expect(inputValue).toBe('ABC');
    });
  });

  describe('fillText', () => {
    it('should fill input field with text', async () => {
      const { fillText } = await import('./actions.js');
      if (!testPage) throw new Error('Test page not initialized');

      await testPage.setContent('<div><input id="test-input" type="text" value="Old" /></div>');

      const result = await fillText(testPage, '#test-input', 'New Value');

      expect(result.ok).toBe(true);

      const inputValue = await testPage.inputValue('#test-input');
      expect(inputValue).toBe('New Value');
    });

    it('should clear previous value', async () => {
      const { fillText } = await import('./actions.js');
      if (!testPage) throw new Error('Test page not initialized');

      await testPage.setContent('<div><input id="test-input" type="text" value="Initial" /></div>');

      await fillText(testPage, '#test-input', 'Replaced');

      const inputValue = await testPage.inputValue('#test-input');
      expect(inputValue).toBe('Replaced');
      expect(inputValue).not.toContain('Initial');
    });
  });
});
