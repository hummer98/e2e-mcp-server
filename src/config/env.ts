import { resolve, isAbsolute } from 'path';

/**
 * Application configuration loaded from environment variables
 */
export interface AppConfig {
  sessionTimeout: number;
  commandTimeout: number;
  port: number;
  nodeEnv: string;
  isProduction: boolean;
  isDevelopment: boolean;
  serverCommandPath?: string;
  allowedHosts?: string[];
  logLevel: string;
}

/**
 * Parse integer from environment variable
 */
function parseIntEnv(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Validate and load configuration from environment variables
 */
export function loadConfig(): AppConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Parse timeout values
  const sessionTimeout = parseIntEnv(process.env.SESSION_TIMEOUT, 600000);
  const commandTimeout = parseIntEnv(process.env.COMMAND_TIMEOUT, 30000);
  const port = parseIntEnv(process.env.PORT, 3000);

  // Validate timeouts
  if (sessionTimeout <= 0) {
    throw new Error('SESSION_TIMEOUT must be a positive number');
  }

  if (commandTimeout <= 0) {
    throw new Error('COMMAND_TIMEOUT must be a positive number');
  }

  // Validate port
  if (port < 1 || port > 65535) {
    throw new Error('PORT must be between 1 and 65535');
  }

  // Parse server command path
  let serverCommandPath: string | undefined;
  if (process.env.SERVER_COMMAND_PATH) {
    if (!isAbsolute(process.env.SERVER_COMMAND_PATH)) {
      throw new Error('SERVER_COMMAND_PATH must be an absolute path');
    }
    serverCommandPath = resolve(process.env.SERVER_COMMAND_PATH);
  }

  // Parse allowed hosts
  let allowedHosts: string[] | undefined;
  if (process.env.ALLOWED_HOSTS && process.env.ALLOWED_HOSTS.trim()) {
    allowedHosts = process.env.ALLOWED_HOSTS.split(',').map(h => h.trim()).filter(h => h);
  }

  // Log level
  const logLevel = process.env.LOG_LEVEL || 'info';

  return {
    sessionTimeout,
    commandTimeout,
    port,
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isDevelopment: nodeEnv === 'development',
    serverCommandPath,
    allowedHosts,
    logLevel,
  };
}

/**
 * Global configuration instance
 */
let configInstance: AppConfig | null = null;

/**
 * Get application configuration (singleton)
 */
export function getConfig(): AppConfig {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

/**
 * Reset configuration (for testing)
 */
export function resetConfig(): void {
  configInstance = null;
}
