import { readFileSync } from 'fs';

/**
 * Error context for structured error responses
 */
export interface ErrorContext {
  sessionId: string;
  toolName: string;
  args: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Structured error response for AI agents
 */
export interface StructuredError {
  error: {
    type: string;
    message: string;
    timestamp: string; // ISO 8601
    context: ErrorContext;
  };
  screenshot?: {
    data: string; // Base64
    capturedAt: string; // ISO 8601
  };
  serverLogs?: {
    stderr: string; // Last 100 lines
    capturedAt: string; // ISO 8601
  };
}

/**
 * Options for error handling
 */
export interface ErrorHandlerOptions {
  screenshot?: string; // Base64 screenshot
  stderrPath?: string; // Path to stderr log file
  maxLogLines?: number; // Maximum log lines to include (default: 100)
}

/**
 * Determine error type from error message
 */
function determineErrorType(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('timeout')) {
    return 'timeout_error';
  }

  if (message.includes('not found') || message.includes('element')) {
    return 'element_not_found';
  }

  return 'playwright_error';
}

/**
 * Read last N lines from log file
 */
function readLastLines(filePath: string, maxLines: number): string | undefined {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.length > 0);

    if (lines.length <= maxLines) {
      return content;
    }

    // Return last N lines
    const lastLines = lines.slice(-maxLines);
    return lastLines.join('\n');
  } catch (error) {
    // Return undefined on read failure
    return undefined;
  }
}

/**
 * Handle Playwright error and create structured error response
 * @param error Original error
 * @param context Error context (sessionId, toolName, args, timestamp)
 * @param options Optional screenshot and log paths
 * @returns Structured error with debug information
 */
export async function handlePlaywrightError(
  error: Error,
  context: ErrorContext,
  options?: ErrorHandlerOptions
): Promise<StructuredError> {
  const maxLogLines = options?.maxLogLines ?? 100;

  // Build base error
  const structured: StructuredError = {
    error: {
      type: determineErrorType(error),
      message: error.message,
      timestamp: context.timestamp.toISOString(),
      context,
    },
  };

  // Add screenshot if provided
  if (options?.screenshot) {
    structured.screenshot = {
      data: options.screenshot,
      capturedAt: new Date().toISOString(),
    };
  }

  // Read server logs if path provided
  if (options?.stderrPath) {
    const logs = readLastLines(options.stderrPath, maxLogLines);
    if (logs) {
      structured.serverLogs = {
        stderr: logs,
        capturedAt: new Date().toISOString(),
      };
    }
  }

  return structured;
}
