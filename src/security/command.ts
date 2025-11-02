import { resolve, isAbsolute } from 'path';
import { existsSync, accessSync, constants } from 'fs';
import { Err, Ok, Result } from '../types/result.js';

/**
 * Command validation error types
 */
export type CommandValidationError =
  | {
      type: 'relative_path';
      message: string;
      path: string;
    }
  | {
      type: 'invalid_characters';
      message: string;
      path: string;
      invalidChars: string[];
    }
  | {
      type: 'empty_path';
      message: string;
    }
  | {
      type: 'path_not_allowed';
      message: string;
      path: string;
      allowedPath: string;
    }
  | {
      type: 'file_not_found';
      message: string;
      path: string;
    }
  | {
      type: 'not_executable';
      message: string;
      path: string;
    };

/**
 * Validation options
 */
export interface ValidationOptions {
  checkExists?: boolean; // Check if file exists (default: false)
  checkExecutable?: boolean; // Check if file is executable (default: false)
}

/**
 * Dangerous shell metacharacters that could enable command injection
 */
const DANGEROUS_CHARS = [';', '|', '&', '$', '`', '(', ')', '<', '>', '\n', '\r'];

/**
 * Validate command path for security
 * @param path Command path to validate
 * @param options Validation options
 * @returns Result containing normalized path or validation error
 */
export function validateCommandPath(
  path: string,
  options?: ValidationOptions
): Result<string, CommandValidationError> {
  // Check for empty path
  if (!path || path.trim().length === 0) {
    return Err({
      type: 'empty_path',
      message: 'Command path cannot be empty',
    });
  }

  // Check for dangerous shell metacharacters
  const foundDangerousChars = DANGEROUS_CHARS.filter((char) => path.includes(char));
  if (foundDangerousChars.length > 0) {
    return Err({
      type: 'invalid_characters',
      message: `Command path contains dangerous characters: ${foundDangerousChars.join(', ')}`,
      path,
      invalidChars: foundDangerousChars,
    });
  }

  // Check if path is absolute
  if (!isAbsolute(path)) {
    return Err({
      type: 'relative_path',
      message: 'Command path must be absolute',
      path,
    });
  }

  // Normalize path (resolve . and ..)
  const normalizedPath = resolve(path);

  // Check against SERVER_COMMAND_PATH allowlist if set
  const allowedPath = process.env.SERVER_COMMAND_PATH;
  if (allowedPath && normalizedPath !== resolve(allowedPath)) {
    return Err({
      type: 'path_not_allowed',
      message: `Command path not allowed. Only ${allowedPath} is permitted`,
      path: normalizedPath,
      allowedPath,
    });
  }

  // Optional: Check if file exists
  if (options?.checkExists) {
    if (!existsSync(normalizedPath)) {
      return Err({
        type: 'file_not_found',
        message: `Command file not found: ${normalizedPath}`,
        path: normalizedPath,
      });
    }

    // Optional: Check if file is executable
    if (options?.checkExecutable) {
      try {
        accessSync(normalizedPath, constants.X_OK);
      } catch {
        return Err({
          type: 'not_executable',
          message: `Command file is not executable: ${normalizedPath}`,
          path: normalizedPath,
        });
      }
    }
  }

  return Ok(normalizedPath);
}
