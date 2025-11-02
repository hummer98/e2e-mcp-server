import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Logger, LogLevel } from './logger.js';

describe('Structured Logging System', () => {
  let originalStdout: typeof process.stdout.write;
  let logOutput: string[] = [];

  beforeEach(() => {
    logOutput = [];
    originalStdout = process.stdout.write;
    // Capture stdout
    process.stdout.write = jest.fn((chunk: string | Uint8Array): boolean => {
      if (typeof chunk === 'string') {
        logOutput.push(chunk);
      }
      return true;
    }) as any;
  });

  afterEach(() => {
    process.stdout.write = originalStdout;
  });

  describe('Logger', () => {
    it('should log ERROR level messages in JSON format', () => {
      const logger = new Logger({ level: LogLevel.ERROR, component: 'test' });
      logger.error('Test error', { sessionId: 'session-1', details: { code: 500 } });

      expect(logOutput.length).toBe(1);
      const log = JSON.parse(logOutput[0]);
      expect(log.level).toBe('ERROR');
      expect(log.component).toBe('test');
      expect(log.event).toBe('Test error');
      expect(log.sessionId).toBe('session-1');
      expect(log.details).toEqual({ code: 500 });
      expect(log.timestamp).toBeDefined();
    });

    it('should log WARN level messages in JSON format', () => {
      const logger = new Logger({ level: LogLevel.WARN, component: 'test' });
      logger.warn('Test warning', { sessionId: 'session-2', details: { reason: 'timeout' } });

      expect(logOutput.length).toBe(1);
      const log = JSON.parse(logOutput[0]);
      expect(log.level).toBe('WARN');
      expect(log.event).toBe('Test warning');
      expect(log.sessionId).toBe('session-2');
    });

    it('should log INFO level messages in JSON format', () => {
      const logger = new Logger({ level: LogLevel.INFO, component: 'test' });
      logger.info('Test info', { sessionId: 'session-3' });

      expect(logOutput.length).toBe(1);
      const log = JSON.parse(logOutput[0]);
      expect(log.level).toBe('INFO');
      expect(log.event).toBe('Test info');
    });

    it('should log DEBUG level messages in JSON format', () => {
      const logger = new Logger({ level: LogLevel.DEBUG, component: 'test' });
      logger.debug('Test debug', { details: { action: 'click' } });

      expect(logOutput.length).toBe(1);
      const log = JSON.parse(logOutput[0]);
      expect(log.level).toBe('DEBUG');
      expect(log.event).toBe('Test debug');
    });

    it('should respect log level filtering', () => {
      const logger = new Logger({ level: LogLevel.WARN, component: 'test' });
      logger.debug('Should not appear');
      logger.info('Should not appear');
      logger.warn('Should appear');
      logger.error('Should appear');

      expect(logOutput.length).toBe(2);
      expect(JSON.parse(logOutput[0]).level).toBe('WARN');
      expect(JSON.parse(logOutput[1]).level).toBe('ERROR');
    });

    it('should include timestamp in ISO 8601 format', () => {
      const logger = new Logger({ level: LogLevel.INFO, component: 'test' });
      logger.info('Test timestamp');

      const log = JSON.parse(logOutput[0]);
      expect(log.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should include component name in all logs', () => {
      const logger = new Logger({ level: LogLevel.INFO, component: 'session-manager' });
      logger.info('Session started');

      const log = JSON.parse(logOutput[0]);
      expect(log.component).toBe('session-manager');
    });

    it('should handle logs without sessionId', () => {
      const logger = new Logger({ level: LogLevel.INFO, component: 'test' });
      logger.info('Global event');

      const log = JSON.parse(logOutput[0]);
      expect(log.sessionId).toBeUndefined();
      expect(log.event).toBe('Global event');
    });

    it('should handle logs without details', () => {
      const logger = new Logger({ level: LogLevel.INFO, component: 'test' });
      logger.info('Simple event', { sessionId: 'session-4' });

      const log = JSON.parse(logOutput[0]);
      expect(log.details).toBeUndefined();
      expect(log.event).toBe('Simple event');
    });

    it('should serialize complex details objects', () => {
      const logger = new Logger({ level: LogLevel.ERROR, component: 'test' });
      logger.error('Complex error', {
        sessionId: 'session-5',
        details: {
          error: new Error('Test error'),
          nested: { deep: { value: 123 } },
          array: [1, 2, 3],
        },
      });

      const log = JSON.parse(logOutput[0]);
      expect(log.details).toBeDefined();
      expect(log.details.nested.deep.value).toBe(123);
      expect(log.details.array).toEqual([1, 2, 3]);
    });
  });

  describe('Log Level Priority', () => {
    it('should have correct priority order: ERROR > WARN > INFO > DEBUG', () => {
      expect(LogLevel.ERROR).toBeGreaterThan(LogLevel.WARN);
      expect(LogLevel.WARN).toBeGreaterThan(LogLevel.INFO);
      expect(LogLevel.INFO).toBeGreaterThan(LogLevel.DEBUG);
    });
  });
});
