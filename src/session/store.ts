import { randomUUID } from 'crypto';
import type { SessionInfo, ServerInfo } from '../types/session.js';
import type { Browser, Page } from 'playwright';
import { Result, Ok, Err } from '../types/result.js';

/**
 * Session error types
 */
export type SessionError =
  | {
      type: 'session_not_found';
      message: string;
      sessionId: string;
      timestamp: string;
    }
  | {
      type: 'browser_not_initialized';
      message: string;
      sessionId: string;
    };

/**
 * Partial session update type
 */
export type SessionUpdate = {
  browser?: Browser | null;
  page?: Page | null;
  timer?: NodeJS.Timeout;
};

/**
 * In-memory session store (singleton)
 */
export class SessionStore {
  private static instance: SessionStore;
  private sessions: Map<string, SessionInfo>;

  private constructor() {
    this.sessions = new Map();
  }

  /**
   * Get singleton instance of SessionStore
   */
  static getInstance(): SessionStore {
    if (!SessionStore.instance) {
      SessionStore.instance = new SessionStore();
    }
    return SessionStore.instance;
  }

  /**
   * Create a new session
   * @param serverInfo Server information from startup command
   * @returns Result containing created session info
   */
  createSession(serverInfo: ServerInfo): Result<SessionInfo, never> {
    const sessionId = randomUUID();
    const now = new Date();

    const sessionInfo: SessionInfo = {
      sessionId,
      serverInfo,
      browser: null,
      page: null,
      timer: undefined as any, // Will be set by timeout handler
      lastActivity: now,
      createdAt: now,
    };

    this.sessions.set(sessionId, sessionInfo);

    return Ok(sessionInfo);
  }

  /**
   * Get session by ID
   * @param sessionId Session ID
   * @returns Result containing session info or error
   */
  getSession(sessionId: string): Result<SessionInfo, SessionError> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return Err({
        type: 'session_not_found',
        message: `Session not found: ${sessionId}`,
        sessionId,
        timestamp: new Date().toISOString(),
      });
    }

    return Ok(session);
  }

  /**
   * Update session information
   * @param sessionId Session ID
   * @param updates Partial updates to apply
   * @returns Result containing updated session info
   */
  updateSession(sessionId: string, updates: SessionUpdate): Result<SessionInfo, SessionError> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return Err({
        type: 'session_not_found',
        message: `Session not found: ${sessionId}`,
        sessionId,
        timestamp: new Date().toISOString(),
      });
    }

    // Apply updates
    const updatedSession: SessionInfo = {
      ...session,
      ...updates,
      lastActivity: new Date(), // Always update last activity
    };

    this.sessions.set(sessionId, updatedSession);

    return Ok(updatedSession);
  }

  /**
   * Delete session by ID
   * @param sessionId Session ID
   * @returns Result indicating success or error
   */
  deleteSession(sessionId: string): Result<boolean, SessionError> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return Err({
        type: 'session_not_found',
        message: `Session not found: ${sessionId}`,
        sessionId,
        timestamp: new Date().toISOString(),
      });
    }

    this.sessions.delete(sessionId);

    return Ok(true);
  }

  /**
   * Get all active sessions
   * @returns Array of all session info
   */
  getAllSessions(): SessionInfo[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clear all sessions (for testing)
   */
  clear(): void {
    this.sessions.clear();
  }

  /**
   * Get number of active sessions
   */
  size(): number {
    return this.sessions.size;
  }
}
