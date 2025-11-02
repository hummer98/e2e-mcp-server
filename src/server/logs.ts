import { readFile, access, constants } from 'fs/promises';
import { resolve } from 'path';
import { Result, Ok, Err } from '../types/result.js';

/**
 * Log read error types
 */
export type LogError =
  | {
      type: 'file_not_found';
      message: string;
      path: string;
      timestamp: string;
    }
  | {
      type: 'invalid_path';
      message: string;
      path: string;
      timestamp: string;
    }
  | {
      type: 'read_error';
      message: string;
      path: string;
      error: string;
      timestamp: string;
    };

/**
 * Options for reading log files
 */
export interface LogReadOptions {
  /**
   * Number of lines to read from the end (default: 100)
   */
  lines?: number;

  /**
   * Offset from the beginning (0-indexed)
   */
  offset?: number;
}

/**
 * Validates log file path to prevent path traversal attacks
 * @param logPath Path to the log file
 * @param allowedDir Allowed directory for log files (optional)
 * @returns Result with boolean indicating if path is valid
 */
export function validateLogPath(logPath: string, allowedDir?: string): Result<boolean, LogError> {
  // Check for path traversal patterns in original path
  if (logPath.includes('../') || logPath.includes('..\\')) {
    return Err({
      type: 'invalid_path',
      message: 'Path contains traversal sequences',
      path: logPath,
      timestamp: new Date().toISOString(),
    });
  }

  // Resolve path to absolute form
  const resolvedPath = resolve(logPath);

  // If allowedDir specified, ensure path is within that directory
  if (allowedDir) {
    const resolvedAllowedDir = resolve(allowedDir);
    // Normalize paths for comparison
    const normalizedPath = resolvedPath.replace(/\\/g, '/');
    const normalizedAllowedDir = resolvedAllowedDir.replace(/\\/g, '/');

    if (!normalizedPath.startsWith(normalizedAllowedDir)) {
      return Err({
        type: 'invalid_path',
        message: `Path is outside allowed directory: ${allowedDir}`,
        path: logPath,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return Ok(true);
}

/**
 * Reads last N lines from a log file
 * @param logPath Absolute path to the log file
 * @param options Read options
 * @returns Result containing log content or error
 */
export async function readLogFile(
  logPath: string,
  options: LogReadOptions = {}
): Promise<Result<string, LogError>> {
  const { lines = 100, offset = 0 } = options;

  // Validate path
  const validationResult = validateLogPath(logPath);
  if (!validationResult.ok) {
    return validationResult as Result<string, LogError>;
  }

  const resolvedPath = resolve(logPath);

  // Check if file exists
  try {
    await access(resolvedPath, constants.R_OK);
  } catch (error) {
    return Err({
      type: 'file_not_found',
      message: `Log file not found or not readable: ${resolvedPath}`,
      path: logPath,
      timestamp: new Date().toISOString(),
    });
  }

  // Read file content
  try {
    const content = await readFile(resolvedPath, 'utf-8');
    const allLines = content.split('\n');

    // Calculate which lines to return
    let startIndex = offset;
    let endIndex = Math.min(offset + lines, allLines.length);

    // If no offset specified, get last N lines
    if (offset === 0 && allLines.length > lines) {
      startIndex = allLines.length - lines;
      endIndex = allLines.length;
    }

    const selectedLines = allLines.slice(startIndex, endIndex);
    return Ok(selectedLines.join('\n'));
  } catch (error) {
    return Err({
      type: 'read_error',
      message: 'Failed to read log file',
      path: logPath,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
}
