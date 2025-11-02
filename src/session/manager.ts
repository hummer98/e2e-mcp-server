import { SessionStore, type SessionError } from './store.js';
import { executeServerCommand } from '../server/command.js';
import { readLogFile, type LogError, type LogReadOptions } from '../server/logs.js';
import type { ServerStartResponse, ServerShutdownResponse, ServerStatusResponse, CommandError } from '../types/command.js';
import type { SessionInfo } from '../types/session.js';
import { Result, Ok, Err } from '../types/result.js';
import { chromium } from 'playwright';

/**
 * Session manager configuration
 */
export interface SessionManagerConfig {
  /**
   * Session timeout in milliseconds (default: 600000 = 10 minutes)
   */
  sessionTimeout?: number;

  /**
   * Command execution timeout in milliseconds (default: 30000 = 30 seconds)
   */
  commandTimeout?: number;
}

/**
 * Session lifecycle manager
 * Handles session creation, deletion, and automatic timeout cleanup
 */
export class SessionManager {
  private store: SessionStore;
  private sessionTimeout: number;
  private commandTimeout: number;

  constructor(config: SessionManagerConfig = {}) {
    this.store = SessionStore.getInstance();
    this.sessionTimeout = config.sessionTimeout ?? 600000; // 10 minutes default
    this.commandTimeout = config.commandTimeout ?? 30000; // 30 seconds default
  }

  /**
   * Start a new session by executing server startup command
   * @param commandPath Path to server startup command
   * @param args Command arguments
   * @returns Result containing session info or error
   */
  async startSession(
    commandPath: string,
    args: string[]
  ): Promise<Result<SessionInfo, CommandError | SessionError>> {
    // Execute server startup command
    const commandResult = await executeServerCommand(commandPath, args, {
      timeout: this.commandTimeout,
    });

    if (!commandResult.ok) {
      return commandResult;
    }

    const response = commandResult.value as ServerStartResponse;

    // Extract server info from command response
    const serverInfo = {
      url: response.url,
      port: response.port,
      pid: response.pid,
      startedAt: new Date(response.startedAt),
      logs: response.logs,
    };

    // Create session in store
    const createResult = this.store.createSession(serverInfo);
    if (!createResult.ok) {
      // This should never happen with createSession
      return createResult as Result<SessionInfo, SessionError>;
    }

    const session = createResult.value;

    // Launch Playwright browser
    try {
      const browser = await chromium.launch({
        headless: true, // Run in headless mode
      });

      // Update session with browser instance
      const updateResult = this.store.updateSession(session.sessionId, { browser });
      if (!updateResult.ok) {
        await browser.close();
        return updateResult as Result<SessionInfo, SessionError>;
      }
    } catch (error) {
      // Failed to launch browser, clean up session
      this.store.deleteSession(session.sessionId);
      return Err({
        type: 'execution_error',
        message: `Failed to launch browser: ${error instanceof Error ? error.message : String(error)}`,
        command: 'chromium.launch',
        args: [],
        timestamp: new Date().toISOString(),
      });
    }

    // Setup timeout handler
    this.setupTimeout(session.sessionId);

    return Ok(session);
  }

  /**
   * Stop session by executing server shutdown command
   * @param sessionId Session ID
   * @param commandPath Path to server shutdown command
   * @param args Command arguments
   * @returns Result containing shutdown response or error
   */
  async stopSession(
    sessionId: string,
    commandPath: string,
    args: string[]
  ): Promise<Result<ServerShutdownResponse, CommandError | SessionError>> {
    // Get session
    const sessionResult = this.store.getSession(sessionId);
    if (!sessionResult.ok) {
      return sessionResult as Result<ServerShutdownResponse, SessionError>;
    }

    const session = sessionResult.value;

    // Clear timeout timer
    if (session.timer) {
      clearTimeout(session.timer);
    }

    // Execute shutdown command
    const commandResult = await executeServerCommand(commandPath, args, {
      timeout: this.commandTimeout,
    });

    if (!commandResult.ok) {
      return commandResult as Result<ServerShutdownResponse, CommandError>;
    }

    // Delete session from store
    this.store.deleteSession(sessionId);

    // Close browser if exists
    if (session.browser) {
      try {
        await session.browser.close();
      } catch (error) {
        console.error(`Failed to close browser for session ${sessionId}:`, error);
      }
    }

    return Ok(commandResult.value as ServerShutdownResponse);
  }

  /**
   * Get session by ID
   * @param sessionId Session ID
   * @returns Result containing session info or error
   */
  getSession(sessionId: string): Result<SessionInfo, SessionError> {
    return this.store.getSession(sessionId);
  }

  /**
   * Get session status by executing server status command
   * @param sessionId Session ID
   * @param commandPath Path to server status command
   * @param args Command arguments
   * @returns Result containing status response or error
   */
  async getSessionStatus(
    sessionId: string,
    commandPath: string,
    args: string[]
  ): Promise<Result<ServerStatusResponse, CommandError | SessionError>> {
    // Get session to verify it exists
    const sessionResult = this.store.getSession(sessionId);
    if (!sessionResult.ok) {
      return sessionResult as Result<ServerStatusResponse, SessionError>;
    }

    // Execute status command
    const commandResult = await executeServerCommand(commandPath, args, {
      timeout: this.commandTimeout,
    });

    if (!commandResult.ok) {
      return commandResult as Result<ServerStatusResponse, CommandError>;
    }

    // Update session activity (resets timeout timer)
    this.updateSessionActivity(sessionId);

    return Ok(commandResult.value as ServerStatusResponse);
  }

  /**
   * Update session activity (resets timeout)
   * @param sessionId Session ID
   */
  updateSessionActivity(sessionId: string): Result<SessionInfo, SessionError> {
    const sessionResult = this.store.getSession(sessionId);
    if (!sessionResult.ok) {
      return sessionResult;
    }

    // Reset timeout
    if (sessionResult.value.timer) {
      clearTimeout(sessionResult.value.timer);
    }
    this.setupTimeout(sessionId);

    // Update last activity
    return this.store.updateSession(sessionId, {});
  }

  /**
   * Get all active sessions
   * @returns Array of session info
   */
  getAllSessions(): SessionInfo[] {
    return this.store.getAllSessions();
  }

  /**
   * Read logs from session
   * @param sessionId Session ID
   * @param logType Type of log to read ('stdout' | 'stderr' | 'combined')
   * @param options Log read options
   * @returns Result containing log content or error
   */
  async readSessionLogs(
    sessionId: string,
    logType: 'stdout' | 'stderr' | 'combined',
    options?: LogReadOptions
  ): Promise<Result<string, SessionError | LogError>> {
    // Get session to verify it exists
    const sessionResult = this.store.getSession(sessionId);
    if (!sessionResult.ok) {
      return sessionResult as Result<string, SessionError>;
    }

    const session = sessionResult.value;

    // Get log path based on type
    const logPath = session.serverInfo.logs[logType];

    // Read log file
    const logResult = await readLogFile(logPath, options);
    if (!logResult.ok) {
      return logResult as Result<string, LogError>;
    }

    // Update session activity (resets timeout timer)
    this.updateSessionActivity(sessionId);

    return Ok(logResult.value);
  }

  /**
   * Setup timeout handler for session
   * @param sessionId Session ID
   */
  private setupTimeout(sessionId: string): void {
    const timer = setTimeout(async () => {
      console.log(`Session ${sessionId} timed out, cleaning up...`);
      await this.cleanupSession(sessionId);
    }, this.sessionTimeout);

    // Update session with timer
    this.store.updateSession(sessionId, { timer });
  }

  /**
   * Cleanup session (called on timeout)
   * @param sessionId Session ID
   */
  private async cleanupSession(sessionId: string): Promise<void> {
    const sessionResult = this.store.getSession(sessionId);
    if (!sessionResult.ok) {
      return; // Already deleted
    }

    const session = sessionResult.value;

    // Close browser if exists
    if (session.browser) {
      try {
        await session.browser.close();
      } catch (error) {
        console.error(`Failed to close browser during cleanup for session ${sessionId}:`, error);
      }
    }

    // Delete session
    this.store.deleteSession(sessionId);
  }

  /**
   * Cleanup all sessions and timers
   */
  async cleanup(): Promise<void> {
    const sessions = this.store.getAllSessions();

    for (const session of sessions) {
      // Clear timeout timer
      if (session.timer) {
        clearTimeout(session.timer);
      }

      // Close browser if exists
      if (session.browser) {
        try {
          await session.browser.close();
        } catch (error) {
          console.error(`Failed to close browser during cleanup for session ${session.sessionId}:`, error);
        }
      }
    }

    // Clear store
    this.store.clear();
  }
}
