import { spawn } from 'child_process';
import { access, constants } from 'fs/promises';
import { resolve, isAbsolute } from 'path';
import type {
  ServerStartResponse,
  ServerStatusResponse,
  ServerShutdownResponse,
  ServerRestartResponse,
  CommandError,
} from '../types/command.js';
import { Result, Ok, Err } from '../types/result.js';

/**
 * Options for command execution
 */
export interface CommandOptions {
  /**
   * Timeout in milliseconds (default: 30000)
   */
  timeout?: number;

  /**
   * Working directory for command execution
   */
  cwd?: string;
}

/**
 * Server command response type union
 */
export type ServerCommandResponse =
  | ServerStartResponse
  | ServerStatusResponse
  | ServerShutdownResponse
  | ServerRestartResponse;

/**
 * Validates command path to prevent shell injection
 * @param commandPath Path to the command
 * @returns true if valid, false otherwise
 */
async function validateCommandPath(commandPath: string): Promise<Result<string, CommandError>> {
  // Check for shell injection patterns
  const dangerousPatterns = [';', '&&', '||', '|', '>', '<', '`', '$', '\n', '\r'];
  for (const pattern of dangerousPatterns) {
    if (commandPath.includes(pattern)) {
      return Err({
        type: 'invalid_command',
        message: `Command path contains invalid character: ${pattern}`,
        command: commandPath,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Ensure absolute path
  if (!isAbsolute(commandPath)) {
    return Err({
      type: 'invalid_command',
      message: 'Command path must be absolute',
      command: commandPath,
      timestamp: new Date().toISOString(),
    });
  }

  // Resolve path to prevent path traversal
  const resolvedPath = resolve(commandPath);

  // Check if file exists and is executable
  try {
    await access(resolvedPath, constants.X_OK);
  } catch (error) {
    return Err({
      type: 'invalid_command',
      message: `Command not found or not executable: ${resolvedPath}`,
      command: commandPath,
      timestamp: new Date().toISOString(),
    });
  }

  return Ok(resolvedPath);
}

/**
 * Executes a server command and parses JSON output
 * @param commandPath Absolute path to the server command
 * @param args Command arguments (e.g., ['--start', '--port', '3000'])
 * @param options Command execution options
 * @returns Result containing parsed response or error
 */
export async function executeServerCommand(
  commandPath: string,
  args: string[],
  options: CommandOptions = {}
): Promise<Result<ServerCommandResponse, CommandError>> {
  const { timeout = 30000, cwd } = options;

  // Validate command path
  const validationResult = await validateCommandPath(commandPath);
  if (!validationResult.ok) {
    return validationResult;
  }

  const resolvedPath = validationResult.value;

  return new Promise((resolve) => {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
      resolve(
        Err({
          type: 'timeout',
          message: `Command timed out after ${timeout}ms`,
          command: commandPath,
          args,
          timeout,
          timestamp: new Date().toISOString(),
        })
      );
    }, timeout);

    let stdout = '';
    let stderr = '';
    let resolved = false;

    const child = spawn(resolvedPath, args, {
      cwd,
      signal: abortController.signal,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true, // Allow child to run independently
    });

    // Try to parse JSON output as it arrives
    const tryParseOutput = () => {
      if (resolved) return;

      const trimmed = stdout.trim();
      if (!trimmed) return;

      try {
        const response = JSON.parse(trimmed) as ServerCommandResponse;
        resolved = true;
        clearTimeout(timeoutId);

        // Detach from child process - let it run independently
        child.unref();

        resolve(Ok(response));
      } catch {
        // Not valid JSON yet, wait for more data
      }
    };

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
      tryParseOutput();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('error', (error: Error) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutId);
      resolve(
        Err({
          type: 'execution_error',
          message: error.message,
          command: commandPath,
          args,
          timestamp: new Date().toISOString(),
        })
      );
    });

    child.on('close', (exitCode: number | null) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutId);

      // Handle non-zero exit code
      if (exitCode !== 0) {
        resolve(
          Err({
            type: 'non_zero_exit',
            message: `Command exited with code ${exitCode}`,
            command: commandPath,
            args,
            exitCode: exitCode ?? -1,
            stderr,
            timestamp: new Date().toISOString(),
          })
        );
        return;
      }

      // Parse JSON output from stdout
      try {
        const response = JSON.parse(stdout.trim()) as ServerCommandResponse;
        resolve(Ok(response));
      } catch (parseError) {
        resolve(
          Err({
            type: 'invalid_json',
            message: 'Failed to parse command output as JSON',
            command: commandPath,
            args,
            stdout,
            parseError: parseError instanceof Error ? parseError.message : String(parseError),
            timestamp: new Date().toISOString(),
          })
        );
      }
    });
  });
}
