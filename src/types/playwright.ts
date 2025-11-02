/**
 * Screenshot result with base64 encoded data
 */
export interface ScreenshotResult {
  data: string; // Base64 encoded
  path?: string; // Optional temporary file path
}

/**
 * Playwright operation errors
 */
export type PlaywrightError =
  | { type: 'timeout'; selector?: string; timeout: number; screenshot?: string }
  | { type: 'element_not_found'; selector: string; screenshot?: string }
  | { type: 'navigation_failed'; url: string; reason: string }
  | { type: 'script_error'; script: string; error: string };
