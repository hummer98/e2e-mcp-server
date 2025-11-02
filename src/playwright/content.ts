import type { Page } from 'playwright';
import { Result, Ok, Err } from '../types/result.js';
import type { PlaywrightError } from '../types/playwright.js';

/**
 * Content retrieval options
 */
export interface ContentOptions {
  /**
   * Timeout for element selection in milliseconds (default: 30000)
   */
  timeout?: number;
}

/**
 * Get full HTML content of page
 * @param page Playwright page instance
 * @returns Result containing HTML content or error
 */
export async function getPageContent(page: Page): Promise<Result<string, PlaywrightError>> {
  try {
    const content = await page.content();
    return Ok(content);
  } catch (error) {
    return Err({
      type: 'navigation_failed',
      url: page.url(),
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get text content of element
 * @param page Playwright page instance
 * @param selector CSS selector for target element
 * @param options Content options
 * @returns Result containing text content or error
 */
export async function getElementText(
  page: Page,
  selector: string,
  options: ContentOptions = {}
): Promise<Result<string, PlaywrightError>> {
  try {
    const text = await page.textContent(selector, {
      timeout: options.timeout ?? 30000,
    });

    return Ok(text ?? '');
  } catch (error) {
    if (error instanceof Error && error.message.includes('Timeout')) {
      return Err({
        type: 'timeout',
        selector,
        timeout: options.timeout ?? 30000,
      });
    }

    return Err({
      type: 'element_not_found',
      selector,
    });
  }
}

/**
 * Get attribute value of element
 * @param page Playwright page instance
 * @param selector CSS selector for target element
 * @param attributeName Name of attribute to retrieve
 * @param options Content options
 * @returns Result containing attribute value or null if not found
 */
export async function getElementAttribute(
  page: Page,
  selector: string,
  attributeName: string,
  options: ContentOptions = {}
): Promise<Result<string | null, PlaywrightError>> {
  try {
    const value = await page.getAttribute(selector, attributeName, {
      timeout: options.timeout ?? 30000,
    });

    return Ok(value);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Timeout')) {
      return Err({
        type: 'timeout',
        selector,
        timeout: options.timeout ?? 30000,
      });
    }

    return Err({
      type: 'element_not_found',
      selector,
    });
  }
}

/**
 * Execute JavaScript in page context
 * @param page Playwright page instance
 * @param script JavaScript code to execute (function string like "() => 1 + 2" or "(a,b) => a + b")
 * @param args Optional arguments to pass to script
 * @returns Result containing script return value or error
 */
export async function executeScript<T = any>(
  page: Page,
  script: string,
  args?: any[]
): Promise<Result<T, PlaywrightError>> {
  try {
    let result: any;

    if (args && args.length > 0) {
      // Execute with arguments
      // Create wrapper function that applies args
      result = await page.evaluate(
        `(${script})(...${JSON.stringify(args)})`
      );
    } else {
      // Execute without arguments
      const fn = new Function('return ' + script)();
      result = await page.evaluate(fn);
    }

    return Ok(result as T);
  } catch (error) {
    return Err({
      type: 'script_error',
      script,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Evaluate function on selected element
 * @param page Playwright page instance
 * @param selector CSS selector for target element
 * @param pageFunction Function to execute on element (string like "el => el.disabled")
 * @param options Content options
 * @returns Result containing function return value or error
 */
export async function evaluateOnSelector<T = any>(
  page: Page,
  selector: string,
  pageFunction: string,
  options: ContentOptions = {}
): Promise<Result<T, PlaywrightError>> {
  try {
    // Wait for element to be available
    await page.waitForSelector(selector, {
      timeout: options.timeout ?? 30000,
      state: 'attached',
    });

    // Create a function from the string
    const fn = new Function('return ' + pageFunction)();

    const result = await page.$eval(selector, fn);

    return Ok(result as T);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Timeout')) {
      return Err({
        type: 'timeout',
        selector,
        timeout: options.timeout ?? 30000,
      });
    }

    if (error instanceof Error && error.message.includes('failed to find element')) {
      return Err({
        type: 'element_not_found',
        selector,
      });
    }

    return Err({
      type: 'script_error',
      script: pageFunction,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
