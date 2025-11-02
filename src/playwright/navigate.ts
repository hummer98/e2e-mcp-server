import type { Page } from 'playwright';
import { SessionStore, type SessionError } from '../session/store.js';
import { getOrCreatePage, isBrowserHealthy } from './browser.js';
import { Result, Ok, Err } from '../types/result.js';
import type { PlaywrightError } from '../types/playwright.js';

/**
 * Navigation options for page.goto()
 */
export interface NavigationOptions {
  /**
   * When to consider navigation succeeded (default: 'load')
   * - 'load': when load event is fired
   * - 'domcontentloaded': when DOMContentLoaded event is fired
   * - 'networkidle': when there are no network connections for at least 500ms
   */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';

  /**
   * Maximum navigation time in milliseconds (default: 30000)
   */
  timeout?: number;

  /**
   * Referer header value
   */
  referer?: string;
}

/**
 * Navigate to URL using existing page
 * @param page Playwright page instance
 * @param url Target URL
 * @param options Navigation options
 * @returns Result containing response or error
 */
export async function navigateToUrl(
  page: Page,
  url: string,
  options: NavigationOptions = {}
): Promise<Result<void, PlaywrightError>> {
  try {
    await page.goto(url, {
      waitUntil: options.waitUntil ?? 'load',
      timeout: options.timeout ?? 30000,
      referer: options.referer,
    });

    return Ok(undefined);
  } catch (error) {
    return Err({
      type: 'navigation_failed',
      url,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Navigate to URL using session browser
 * Creates or reuses page from session, then navigates to URL
 * @param sessionId Session ID
 * @param url Target URL
 * @param options Navigation options
 * @returns Result containing page instance or error
 */
export async function navigateWithSession(
  sessionId: string,
  url: string,
  options: NavigationOptions = {}
): Promise<Result<Page, SessionError | PlaywrightError>> {
  const store = SessionStore.getInstance();

  // Get session
  const sessionResult = store.getSession(sessionId);
  if (!sessionResult.ok) {
    return sessionResult as Result<Page, SessionError>;
  }

  const session = sessionResult.value;

  // Check browser health
  if (!session.browser || !isBrowserHealthy(session.browser)) {
    return Err({
      type: 'browser_not_initialized',
      sessionId,
      message: 'Browser is not initialized or unhealthy',
    });
  }

  // Get or create page
  const pageResult = await getOrCreatePage(session.browser, session.page);
  if (!pageResult.ok) {
    return pageResult;
  }

  const page = pageResult.value;

  // Update session with page
  store.updateSession(sessionId, { page });

  // Navigate to URL
  const navResult = await navigateToUrl(page, url, options);
  if (!navResult.ok) {
    return navResult as Result<Page, PlaywrightError>;
  }

  return Ok(page);
}
