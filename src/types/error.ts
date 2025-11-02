/**
 * Error context for structured error responses
 */
export interface ErrorContext {
  sessionId: string;
  tool: string;
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
    timestamp: string;
    context: ErrorContext;
  };
  screenshot?: {
    data: string; // Base64
    capturedAt: string;
  };
  serverLogs?: {
    stderr: string; // Last 100 lines
    capturedAt: string;
  };
}

/**
 * Log reading errors
 */
export type LogError =
  | { type: 'log_file_not_found'; path: string }
  | { type: 'log_read_failed'; path: string; reason: string };
