/**
 * Log levels with priority order
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Log level string representation
 */
type LogLevelString = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/**
 * Structured log entry
 */
export interface LogEntry {
  timestamp: string; // ISO 8601
  level: LogLevelString;
  component: string;
  event: string;
  sessionId?: string;
  details?: Record<string, unknown>;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  component: string;
}

/**
 * Log context for individual log entries
 */
export interface LogContext {
  sessionId?: string;
  details?: Record<string, unknown>;
}

/**
 * Structured logger for JSON output
 */
export class Logger {
  private readonly level: LogLevel;
  private readonly component: string;

  constructor(config: LoggerConfig) {
    this.level = config.level;
    this.component = config.component;
  }

  /**
   * Log ERROR level message
   */
  error(event: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, 'ERROR', event, context);
  }

  /**
   * Log WARN level message
   */
  warn(event: string, context?: LogContext): void {
    this.log(LogLevel.WARN, 'WARN', event, context);
  }

  /**
   * Log INFO level message
   */
  info(event: string, context?: LogContext): void {
    this.log(LogLevel.INFO, 'INFO', event, context);
  }

  /**
   * Log DEBUG level message
   */
  debug(event: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, 'DEBUG', event, context);
  }

  /**
   * Internal log method
   */
  private log(
    level: LogLevel,
    levelString: LogLevelString,
    event: string,
    context?: LogContext
  ): void {
    // Check if log level is enabled
    if (level < this.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: levelString,
      component: this.component,
      event,
    };

    // Add optional fields
    if (context?.sessionId) {
      entry.sessionId = context.sessionId;
    }

    if (context?.details) {
      entry.details = this.serializeDetails(context.details);
    }

    // Output to stdout as JSON
    process.stdout.write(JSON.stringify(entry) + '\n');
  }

  /**
   * Serialize details object, handling Error objects
   */
  private serializeDetails(details: Record<string, unknown>): Record<string, unknown> {
    const serialized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(details)) {
      if (value instanceof Error) {
        serialized[key] = {
          message: value.message,
          stack: value.stack,
          name: value.name,
        };
      } else {
        serialized[key] = value;
      }
    }

    return serialized;
  }
}

/**
 * Create logger instance from environment variable
 */
export function createLogger(component: string): Logger {
  const logLevelEnv = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
  const level =
    logLevelEnv === 'DEBUG'
      ? LogLevel.DEBUG
      : logLevelEnv === 'WARN'
        ? LogLevel.WARN
        : logLevelEnv === 'ERROR'
          ? LogLevel.ERROR
          : LogLevel.INFO;

  return new Logger({ level, component });
}
