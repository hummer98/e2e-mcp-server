import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { readLogFile, validateLogPath } from './logs.js';

describe('Server Log Reader', () => {
  const testLogDir = '/tmp/e2e-mcp-test-logs';
  const testLogFile = join(testLogDir, 'test-server.log');

  beforeEach(async () => {
    // Create test directory
    await mkdir(testLogDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup test files
    try {
      await rm(testLogDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('readLogFile', () => {
    it('should read last N lines from log file', async () => {

      // Create test log file with 10 lines
      const logContent = Array.from({ length: 10 }, (_, i) => `Log line ${i + 1}`).join('\n');
      await writeFile(testLogFile, logContent, 'utf-8');

      const result = await readLogFile(testLogFile, { lines: 5 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const lines = result.value.split('\n').filter((l) => l.length > 0);
        expect(lines).toHaveLength(5);
        expect(lines[0]).toBe('Log line 6');
        expect(lines[4]).toBe('Log line 10');
      }
    });

    it('should return all lines if file has fewer lines than requested', async () => {
      // Create test log file with 3 lines
      const logContent = 'Line 1\nLine 2\nLine 3';
      await writeFile(testLogFile, logContent, 'utf-8');

      const result = await readLogFile(testLogFile, { lines: 100 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const lines = result.value.split('\n').filter((l) => l.length > 0);
        expect(lines).toHaveLength(3);
      }
    });

    it('should prevent path traversal attacks', async () => {
      // Attempt path traversal
      const maliciousPath = '/tmp/e2e-mcp-test-logs/../../../etc/passwd';

      const result = await readLogFile(maliciousPath);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid_path');
      }
    });

    it('should handle non-existent files', async () => {
      const result = await readLogFile(join(testLogDir, 'non-existent.log'));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('file_not_found');
      }
    });

    it('should read from specific offset', async () => {
      // Create test log file
      const logContent = Array.from({ length: 20 }, (_, i) => `Log line ${i + 1}`).join('\n');
      await writeFile(testLogFile, logContent, 'utf-8');

      const result = await readLogFile(testLogFile, { lines: 5, offset: 10 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const lines = result.value.split('\n').filter((l) => l.length > 0);
        expect(lines).toHaveLength(5);
        expect(lines[0]).toBe('Log line 11');
      }
    });

    it('should default to 100 lines when no limit specified', async () => {
      // Create test log file with 150 lines
      const logContent = Array.from({ length: 150 }, (_, i) => `Log line ${i + 1}`).join('\n');
      await writeFile(testLogFile, logContent, 'utf-8');

      const result = await readLogFile(testLogFile);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const lines = result.value.split('\n').filter((l) => l.length > 0);
        expect(lines).toHaveLength(100);
        expect(lines[0]).toBe('Log line 51'); // Last 100 lines starting from line 51
      }
    });
  });

  describe('validateLogPath', () => {
    it('should accept valid log paths within allowed directory', async () => {
      const result = validateLogPath(testLogFile, testLogDir);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeTruthy();
      }
    });

    it('should reject paths outside allowed directory', async () => {
      const result = validateLogPath('/etc/passwd', testLogDir);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid_path');
      }
    });

    it('should reject paths with .. traversal', async () => {
      const maliciousPath = join(testLogDir, '../../../etc/passwd');
      const result = validateLogPath(maliciousPath, testLogDir);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid_path');
      }
    });
  });
});
