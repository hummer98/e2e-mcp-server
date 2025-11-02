import type { LogPaths } from './session.js';

/**
 * Server startup command response (--start)
 */
export interface ServerStartResponse {
  status: 'ready' | 'already_running';
  url: string;
  port: number;
  pid: number;
  startedAt: string; // ISO 8601
  logs: LogPaths;
  message: string;
}

/**
 * Server restart command response (--restart)
 */
export interface ServerRestartResponse {
  status: 'restarted' | 'started';
  url: string;
  port: number;
  pid: number;
  previousPid?: number;
  previousPort?: number;
  startedAt: string;
  message: string;
}

/**
 * Server status command response (--status)
 */
export interface ServerStatusResponse {
  status: 'running' | 'stopped' | 'unhealthy';
  url?: string;
  port?: number;
  pid?: number;
  startedAt?: string;
  uptime?: number;
  healthy?: boolean;
  logs?: LogPaths;
  message: string;
}

/**
 * Server shutdown command response (--shutdown)
 */
export interface ServerShutdownResponse {
  status: 'stopped' | 'already_stopped' | 'force_stopped';
  previousPid?: number;
  previousPort?: number;
  stoppedAt?: string;
  uptime?: number;
  message: string;
}

/**
 * Command execution errors
 */
export type CommandError =
  | {
      type: 'timeout';
      message: string;
      command: string;
      args?: string[];
      timeout: number;
      timestamp: string;
    }
  | {
      type: 'non_zero_exit';
      message: string;
      command: string;
      args?: string[];
      exitCode: number;
      stderr: string;
      timestamp: string;
    }
  | {
      type: 'invalid_json';
      message: string;
      command: string;
      args?: string[];
      stdout: string;
      parseError: string;
      timestamp: string;
    }
  | {
      type: 'invalid_command';
      message: string;
      command: string;
      timestamp: string;
    }
  | {
      type: 'execution_error';
      message: string;
      command: string;
      args?: string[];
      timestamp: string;
    };
