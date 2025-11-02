import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { handlePlaywrightError, ErrorContext } from './handler.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('Error Handler', () => {
  const testLogDir = '/tmp/test-error-handler';
  const testStderrPath = join(testLogDir, 'stderr.log');

  beforeEach(() => {
    // Create test log directory
    try {
      mkdirSync(testLogDir, { recursive: true });
    } catch {
      // Ignore if exists
    }
  });

  afterEach(() => {
    // Cleanup test files
    try {
      rmSync(testLogDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('handlePlaywrightError', () => {
    it('should create structured error with error details', async () => {
      const context: ErrorContext = {
        sessionId: 'session-123',
        toolName: 'navigate',
        args: { url: 'https://example.com' },
        timestamp: new Date('2025-11-02T10:00:00Z'),
      };

      const error = new Error('Navigation failed');
      const result = await handlePlaywrightError(error, context);

      expect(result.error.type).toBe('playwright_error');
      expect(result.error.message).toBe('Navigation failed');
      expect(result.error.timestamp).toBe('2025-11-02T10:00:00.000Z');
      expect(result.error.context).toEqual(context);
    });

    it('should include screenshot when provided', async () => {
      const context: ErrorContext = {
        sessionId: 'session-123',
        toolName: 'click',
        args: { selector: '#button' },
        timestamp: new Date('2025-11-02T10:00:00Z'),
      };

      const screenshot = Buffer.from('fake-image-data').toString('base64');
      const error = new Error('Element not found');

      const result = await handlePlaywrightError(error, context, { screenshot });

      expect(result.screenshot).toBeDefined();
      expect(result.screenshot?.data).toBe(screenshot);
      expect(result.screenshot?.capturedAt).toBeDefined();
    });

    it('should read server logs when stderrPath is provided', async () => {
      // Write test log file
      const logContent = Array.from({ length: 150 }, (_, i) => `Log line ${i + 1}`).join('\n');
      writeFileSync(testStderrPath, logContent);

      const context: ErrorContext = {
        sessionId: 'session-123',
        toolName: 'click',
        args: { selector: '#button' },
        timestamp: new Date('2025-11-02T10:00:00Z'),
      };

      const error = new Error('Click failed');
      const result = await handlePlaywrightError(error, context, { stderrPath: testStderrPath });

      expect(result.serverLogs).toBeDefined();
      expect(result.serverLogs?.stderr).toContain('Log line 51'); // Should include last 100 lines
      expect(result.serverLogs?.stderr).toContain('Log line 150');
      expect(result.serverLogs?.stderr).not.toContain('Log line 50'); // First 50 lines should be excluded
      expect(result.serverLogs?.capturedAt).toBeDefined();
    });

    it('should handle log read failure gracefully', async () => {
      const context: ErrorContext = {
        sessionId: 'session-123',
        toolName: 'navigate',
        args: { url: 'https://example.com' },
        timestamp: new Date('2025-11-02T10:00:00Z'),
      };

      const error = new Error('Navigation failed');
      // Provide non-existent log path
      const result = await handlePlaywrightError(error, context, {
        stderrPath: '/nonexistent/path/stderr.log',
      });

      // Should still return error, just without server logs
      expect(result.error.message).toBe('Navigation failed');
      expect(result.serverLogs).toBeUndefined();
    });

    it('should include both screenshot and logs when provided', async () => {
      const logContent = 'Error line 1\nError line 2\nError line 3';
      writeFileSync(testStderrPath, logContent);

      const context: ErrorContext = {
        sessionId: 'session-123',
        toolName: 'type',
        args: { selector: '#input', text: 'test' },
        timestamp: new Date('2025-11-02T10:00:00Z'),
      };

      const screenshot = Buffer.from('screenshot-data').toString('base64');
      const error = new Error('Type failed');

      const result = await handlePlaywrightError(error, context, {
        screenshot,
        stderrPath: testStderrPath,
      });

      expect(result.screenshot?.data).toBe(screenshot);
      expect(result.serverLogs?.stderr).toBe(logContent);
    });

    it('should determine error type from error message', async () => {
      const context: ErrorContext = {
        sessionId: 'session-123',
        toolName: 'navigate',
        args: {},
        timestamp: new Date(),
      };

      // Timeout error
      const timeoutResult = await handlePlaywrightError(
        new Error('Timeout 30000ms exceeded'),
        context
      );
      expect(timeoutResult.error.type).toBe('timeout_error');

      // Element not found error
      const notFoundResult = await handlePlaywrightError(
        new Error('Element not found: #button'),
        context
      );
      expect(notFoundResult.error.type).toBe('element_not_found');

      // Generic playwright error
      const genericResult = await handlePlaywrightError(
        new Error('Something went wrong'),
        context
      );
      expect(genericResult.error.type).toBe('playwright_error');
    });

    it('should limit server logs to 100 lines by default', async () => {
      const logLines = Array.from({ length: 200 }, (_, i) => `Line ${i + 1}`);
      writeFileSync(testStderrPath, logLines.join('\n'));

      const context: ErrorContext = {
        sessionId: 'session-123',
        toolName: 'click',
        args: {},
        timestamp: new Date(),
      };

      const result = await handlePlaywrightError(new Error('Test'), context, {
        stderrPath: testStderrPath,
      });

      const returnedLines = result.serverLogs?.stderr.split('\n').filter((l) => l.length > 0);
      expect(returnedLines?.length).toBe(100);
      expect(returnedLines?.[0]).toBe('Line 101'); // Should start from line 101
      expect(returnedLines?.[99]).toBe('Line 200');
    });

    it('should include all context fields in error', async () => {
      const context: ErrorContext = {
        sessionId: 'test-session-id',
        toolName: 'executeScript',
        args: { script: '() => 1 + 1' },
        timestamp: new Date('2025-11-02T15:30:00Z'),
      };

      const result = await handlePlaywrightError(new Error('Script error'), context);

      expect(result.error.context.sessionId).toBe('test-session-id');
      expect(result.error.context.toolName).toBe('executeScript');
      expect(result.error.context.args).toEqual({ script: '() => 1 + 1' });
      expect(result.error.context.timestamp).toEqual(context.timestamp);
    });
  });
});
