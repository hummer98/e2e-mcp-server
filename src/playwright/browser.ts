import { chromium, type Browser, type Page, type LaunchOptions } from 'playwright';
import { Result, Ok, Err } from '../types/result.js';
import type { PlaywrightError } from '../types/playwright.js';

/**
 * Browser launch options
 */
export interface BrowserLaunchOptions {
  /**
   * Whether to run browser in headless mode (default: true)
   */
  headless?: boolean;

  /**
   * Timeout for browser launch in milliseconds (default: 30000)
   */
  timeout?: number;

  /**
   * Additional Playwright launch options
   */
  args?: string[];
}

/**
 * Launch a new browser instance
 * @param options Browser launch options
 * @returns Result containing Browser instance or error
 */
export async function launchBrowser(
  options: BrowserLaunchOptions = {}
): Promise<Result<Browser, PlaywrightError>> {
  const { headless = true, timeout = 30000, args = [] } = options;

  try {
    const launchOptions: LaunchOptions = {
      headless,
      timeout,
      args,
    };

    const browser = await chromium.launch(launchOptions);

    return Ok(browser);
  } catch (error) {
    return Err({
      type: 'navigation_failed',
      url: 'browser-launch',
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get existing page or create new one
 * @param browser Browser instance
 * @param existingPage Existing page instance (can be null or closed)
 * @returns Result containing Page instance or error
 */
export async function getOrCreatePage(
  browser: Browser,
  existingPage: Page | null
): Promise<Result<Page, PlaywrightError>> {
  try {
    // Check if existing page is still open
    if (existingPage && !existingPage.isClosed()) {
      return Ok(existingPage);
    }

    // Create new page
    const page = await browser.newPage();

    return Ok(page);
  } catch (error) {
    return Err({
      type: 'navigation_failed',
      url: 'page-creation',
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Check if browser is healthy (connected)
 * @param browser Browser instance or null
 * @returns true if browser is connected, false otherwise
 */
export function isBrowserHealthy(browser: Browser | null): boolean {
  if (!browser) {
    return false;
  }

  try {
    return browser.isConnected();
  } catch (error) {
    return false;
  }
}

/**
 * Close browser instance
 * @param browser Browser instance or null
 * @returns Result indicating success or error
 */
export async function closeBrowser(browser: Browser | null): Promise<Result<boolean, PlaywrightError>> {
  if (!browser) {
    return Ok(true);
  }

  try {
    // Check if already closed
    if (!browser.isConnected()) {
      return Ok(true);
    }

    await browser.close();

    return Ok(true);
  } catch (error) {
    // Even if close fails, consider it closed
    return Ok(true);
  }
}
