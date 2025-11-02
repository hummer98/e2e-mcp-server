import type { Page } from 'playwright';
import { Result, Ok, Err } from '../types/result.js';
import type { PlaywrightError } from '../types/playwright.js';

/**
 * Wait for element options
 */
export interface WaitForElementOptions {
  /**
   * Maximum wait time in milliseconds (default: 30000)
   */
  timeout?: number;

  /**
   * Element state to wait for (default: 'visible')
   */
  state?: 'attached' | 'detached' | 'visible' | 'hidden';
}

/**
 * Click element options
 */
export interface ClickOptions {
  /**
   * Maximum wait time in milliseconds (default: 30000)
   */
  timeout?: number;

  /**
   * Number of clicks (default: 1)
   */
  clickCount?: number;

  /**
   * Mouse button to click (default: 'left')
   */
  button?: 'left' | 'right' | 'middle';

  /**
   * Time to wait between mousedown and mouseup in milliseconds
   */
  delay?: number;
}

/**
 * Type text options
 */
export interface TypeOptions {
  /**
   * Maximum wait time in milliseconds (default: 30000)
   */
  timeout?: number;

  /**
   * Delay between key presses in milliseconds (default: 0)
   */
  delay?: number;
}

/**
 * Fill text options
 */
export interface FillOptions {
  /**
   * Maximum wait time in milliseconds (default: 30000)
   */
  timeout?: number;
}

/**
 * Wait for element to match specified state
 * @param page Playwright page instance
 * @param selector CSS selector for target element
 * @param options Wait options
 * @returns Result containing void or error
 */
export async function waitForElement(
  page: Page,
  selector: string,
  options: WaitForElementOptions = {}
): Promise<Result<void, PlaywrightError>> {
  try {
    await page.waitForSelector(selector, {
      timeout: options.timeout ?? 30000,
      state: options.state ?? 'visible',
    });

    return Ok(undefined);
  } catch (error) {
    // Capture screenshot on timeout
    let screenshot: string | undefined;
    try {
      const buffer = await page.screenshot({ type: 'png' });
      screenshot = buffer.toString('base64');
    } catch {
      // Ignore screenshot errors
    }

    return Err({
      type: 'timeout',
      selector,
      timeout: options.timeout ?? 30000,
      screenshot,
    });
  }
}

/**
 * Click on element
 * @param page Playwright page instance
 * @param selector CSS selector for target element
 * @param options Click options
 * @returns Result containing void or error
 */
export async function clickElement(
  page: Page,
  selector: string,
  options: ClickOptions = {}
): Promise<Result<void, PlaywrightError>> {
  try {
    await page.click(selector, {
      timeout: options.timeout ?? 30000,
      clickCount: options.clickCount ?? 1,
      button: options.button ?? 'left',
      delay: options.delay,
    });

    return Ok(undefined);
  } catch (error) {
    // Capture screenshot on error
    let screenshot: string | undefined;
    try {
      const buffer = await page.screenshot({ type: 'png' });
      screenshot = buffer.toString('base64');
    } catch {
      // Ignore screenshot errors
    }

    // Determine error type
    if (error instanceof Error && error.message.includes('Timeout')) {
      return Err({
        type: 'timeout',
        selector,
        timeout: options.timeout ?? 30000,
        screenshot,
      });
    }

    return Err({
      type: 'element_not_found',
      selector,
      screenshot,
    });
  }
}

/**
 * Type text into input field (simulates keypresses)
 * @param page Playwright page instance
 * @param selector CSS selector for target input element
 * @param text Text to type
 * @param options Type options
 * @returns Result containing void or error
 */
export async function typeText(
  page: Page,
  selector: string,
  text: string,
  options: TypeOptions = {}
): Promise<Result<void, PlaywrightError>> {
  try {
    await page.type(selector, text, {
      timeout: options.timeout ?? 30000,
      delay: options.delay ?? 0,
    });

    return Ok(undefined);
  } catch (error) {
    // Capture screenshot on error
    let screenshot: string | undefined;
    try {
      const buffer = await page.screenshot({ type: 'png' });
      screenshot = buffer.toString('base64');
    } catch {
      // Ignore screenshot errors
    }

    if (error instanceof Error && error.message.includes('Timeout')) {
      return Err({
        type: 'timeout',
        selector,
        timeout: options.timeout ?? 30000,
        screenshot,
      });
    }

    return Err({
      type: 'element_not_found',
      selector,
      screenshot,
    });
  }
}

/**
 * Fill input field with text (replaces existing value)
 * @param page Playwright page instance
 * @param selector CSS selector for target input element
 * @param text Text to fill
 * @param options Fill options
 * @returns Result containing void or error
 */
export async function fillText(
  page: Page,
  selector: string,
  text: string,
  options: FillOptions = {}
): Promise<Result<void, PlaywrightError>> {
  try {
    await page.fill(selector, text, {
      timeout: options.timeout ?? 30000,
    });

    return Ok(undefined);
  } catch (error) {
    // Capture screenshot on error
    let screenshot: string | undefined;
    try {
      const buffer = await page.screenshot({ type: 'png' });
      screenshot = buffer.toString('base64');
    } catch {
      // Ignore screenshot errors
    }

    if (error instanceof Error && error.message.includes('Timeout')) {
      return Err({
        type: 'timeout',
        selector,
        timeout: options.timeout ?? 30000,
        screenshot,
      });
    }

    return Err({
      type: 'element_not_found',
      selector,
      screenshot,
    });
  }
}
