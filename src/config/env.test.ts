import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('should load configuration with default values', async () => {
      const { loadConfig } = await import('./env.js');

      const config = loadConfig();

      expect(config.sessionTimeout).toBe(600000); // 10 minutes default
      expect(config.commandTimeout).toBe(30000); // 30 seconds default
      expect(config.nodeEnv).toBe('test'); // Jest sets NODE_ENV=test
      expect(config.port).toBe(3000); // Default port
    });

    it('should override defaults with environment variables', async () => {
      process.env.SESSION_TIMEOUT = '300000'; // 5 minutes
      process.env.COMMAND_TIMEOUT = '60000'; // 1 minute
      process.env.PORT = '8080';

      const { loadConfig } = await import('./env.js');
      const config = loadConfig();

      expect(config.sessionTimeout).toBe(300000);
      expect(config.commandTimeout).toBe(60000);
      expect(config.port).toBe(8080);
    });

    it('should validate SESSION_TIMEOUT is a positive number', async () => {
      process.env.SESSION_TIMEOUT = '-1000';

      const { loadConfig } = await import('./env.js');

      expect(() => loadConfig()).toThrow('SESSION_TIMEOUT must be a positive number');
    });

    it('should validate COMMAND_TIMEOUT is a positive number', async () => {
      process.env.COMMAND_TIMEOUT = '0';

      const { loadConfig } = await import('./env.js');

      expect(() => loadConfig()).toThrow('COMMAND_TIMEOUT must be a positive number');
    });

    it('should validate PORT is within valid range', async () => {
      process.env.PORT = '70000';

      const { loadConfig } = await import('./env.js');

      expect(() => loadConfig()).toThrow('PORT must be between 1 and 65535');
    });

    it('should parse ALLOWED_HOSTS as comma-separated list', async () => {
      process.env.ALLOWED_HOSTS = 'localhost,example.com,*.test.com';

      const { loadConfig } = await import('./env.js');
      const config = loadConfig();

      expect(config.allowedHosts).toEqual(['localhost', 'example.com', '*.test.com']);
    });

    it('should handle empty ALLOWED_HOSTS', async () => {
      process.env.ALLOWED_HOSTS = '';

      const { loadConfig } = await import('./env.js');
      const config = loadConfig();

      expect(config.allowedHosts).toBeUndefined();
    });

    it('should validate SERVER_COMMAND_PATH is absolute path', async () => {
      process.env.SERVER_COMMAND_PATH = 'relative/path';

      const { loadConfig } = await import('./env.js');

      expect(() => loadConfig()).toThrow('SERVER_COMMAND_PATH must be an absolute path');
    });

    it('should accept absolute SERVER_COMMAND_PATH', async () => {
      process.env.SERVER_COMMAND_PATH = '/usr/local/bin/server';

      const { loadConfig } = await import('./env.js');
      const config = loadConfig();

      expect(config.serverCommandPath).toBe('/usr/local/bin/server');
    });

    it('should detect NODE_ENV values', async () => {
      process.env.NODE_ENV = 'production';

      const { loadConfig } = await import('./env.js');
      const config = loadConfig();

      expect(config.nodeEnv).toBe('production');
      expect(config.isProduction).toBe(true);
      expect(config.isDevelopment).toBe(false);
    });

    it('should detect development mode', async () => {
      process.env.NODE_ENV = 'development';

      const { loadConfig } = await import('./env.js');
      const config = loadConfig();

      expect(config.nodeEnv).toBe('development');
      expect(config.isProduction).toBe(false);
      expect(config.isDevelopment).toBe(true);
    });
  });
});
