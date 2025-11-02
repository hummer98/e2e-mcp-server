import type { Page } from 'playwright';
import { Result, Ok, Err } from '../types/result.js';
import type { PlaywrightError, ScreenshotResult } from '../types/playwright.js';

/**
 * Screenshot capture options
 */
export interface ScreenshotOptions {
  /**
   * Image format (default: 'png')
   */
  type?: 'png' | 'jpeg';

  /**
   * Image quality (0-100, only for jpeg, default: 80)
   */
  quality?: number;

  /**
   * Capture full scrollable page (default: false)
   */
  fullPage?: boolean;

  /**
   * Optional file path to save screenshot
   */
  path?: string;

  /**
   * Optional selector to capture specific element
   */
  selector?: string;

  /**
   * Timeout for element selection in milliseconds (default: 30000)
   */
  timeout?: number;

  /**
   * Omit white background (default: false, only for png with transparency)
   */
  omitBackground?: boolean;
}

/**
 * Capture screenshot of page or element
 * @param page Playwright page instance
 * @param options Screenshot options
 * @returns Result containing screenshot data or error
 */
export async function captureScreenshot(
  page: Page,
  options: ScreenshotOptions = {}
): Promise<Result<ScreenshotResult, PlaywrightError>> {
  try {
    let buffer: Buffer;

    if (options.selector) {
      // Capture element screenshot
      const element = await page.waitForSelector(options.selector, {
        timeout: options.timeout ?? 30000,
        state: 'visible',
      });

      if (!element) {
        return Err({
          type: 'element_not_found',
          selector: options.selector,
        });
      }

      buffer = await element.screenshot({
        type: options.type ?? 'png',
        quality: options.type === 'jpeg' ? options.quality ?? 80 : undefined,
        path: options.path,
        omitBackground: options.omitBackground ?? false,
      });
    } else {
      // Capture page screenshot
      buffer = await page.screenshot({
        type: options.type ?? 'png',
        quality: options.type === 'jpeg' ? options.quality ?? 80 : undefined,
        fullPage: options.fullPage ?? false,
        path: options.path,
        omitBackground: options.omitBackground ?? false,
      });
    }

    return Ok({
      data: buffer.toString('base64'),
      path: options.path,
    });
  } catch (error) {
    // Determine error type
    if (
      options.selector &&
      error instanceof Error &&
      error.message.includes('Timeout')
    ) {
      return Err({
        type: 'timeout',
        selector: options.selector,
        timeout: options.timeout ?? 30000,
      });
    }

    if (options.selector) {
      return Err({
        type: 'element_not_found',
        selector: options.selector,
      });
    }

    return Err({
      type: 'navigation_failed',
      url: page.url(),
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}
