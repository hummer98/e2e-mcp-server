import type { Browser, Page } from 'playwright';

/**
 * Log file paths returned by server startup command
 */
export interface LogPaths {
  stdout: string;
  stderr: string;
  combined: string;
}

/**
 * Server information extracted from startup command response
 */
export interface ServerInfo {
  url: string;
  port: number;
  pid: number;
  startedAt: Date;
  logs: LogPaths;
}

/**
 * Session information stored in memory
 */
export interface SessionInfo {
  sessionId: string;
  serverInfo: ServerInfo;
  browser: Browser | null;
  page: Page | null;
  timer: NodeJS.Timeout;
  lastActivity: Date;
  createdAt: Date;
}

/**
 * Result returned by startSession tool
 */
export interface SessionStartResult {
  sessionId: string;
  url: string;
  port: number;
  pid: number;
  logs: LogPaths;
}

/**
 * Server status response
 */
export interface SessionStatus {
  status: 'running' | 'stopped' | 'unhealthy';
  url?: string;
  uptime?: number;
  healthy?: boolean;
}

/**
 * Session-related errors
 */
export type SessionError =
  | { type: 'session_not_found'; sessionId: string }
  | { type: 'server_start_failed'; reason: string; logs?: string }
  | { type: 'shutdown_failed'; reason: string };
