import { describe, it, expect } from '@jest/globals';
import { validateCommandPath } from './command.js';

describe('Command Security', () => {
  describe('validateCommandPath', () => {
    it('should accept absolute path', () => {
      const result = validateCommandPath('/usr/local/bin/server');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('/usr/local/bin/server');
      }
    });

    it('should reject relative path', () => {
      const result = validateCommandPath('../bin/server');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('relative_path');
        if (result.error.type === 'relative_path') {
          expect(result.error.path).toBe('../bin/server');
        }
      }
    });

    it('should reject path with shell metacharacters', () => {
      const result = validateCommandPath('/bin/sh; rm -rf /');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid_characters');
      }
    });

    it('should reject path with pipe operator', () => {
      const result = validateCommandPath('/bin/cat | /bin/sh');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid_characters');
      }
    });

    it('should reject path with redirect operator', () => {
      const result = validateCommandPath('/bin/echo > /tmp/file');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid_characters');
      }
    });

    it('should reject path with command substitution', () => {
      const result = validateCommandPath('/bin/$(whoami)');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid_characters');
      }
    });

    it('should reject path with backticks', () => {
      const result = validateCommandPath('/bin/`whoami`');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid_characters');
      }
    });

    it('should accept path with allowed special characters', () => {
      const result = validateCommandPath('/usr/local/bin/my-server_v1.0');
      expect(result.ok).toBe(true);
    });

    it('should reject empty path', () => {
      const result = validateCommandPath('');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('empty_path');
      }
    });

    it('should enforce allowed paths when SERVER_COMMAND_PATH is set', () => {
      const originalEnv = process.env.SERVER_COMMAND_PATH;
      process.env.SERVER_COMMAND_PATH = '/usr/local/bin/allowed-server';

      const result1 = validateCommandPath('/usr/local/bin/allowed-server');
      expect(result1.ok).toBe(true);

      const result2 = validateCommandPath('/usr/local/bin/other-server');
      expect(result2.ok).toBe(false);
      if (!result2.ok) {
        expect(result2.error.type).toBe('path_not_allowed');
      }

      process.env.SERVER_COMMAND_PATH = originalEnv;
    });

    it('should allow any valid path when SERVER_COMMAND_PATH is not set', () => {
      const originalEnv = process.env.SERVER_COMMAND_PATH;
      delete process.env.SERVER_COMMAND_PATH;

      const result = validateCommandPath('/usr/local/bin/any-server');
      expect(result.ok).toBe(true);

      process.env.SERVER_COMMAND_PATH = originalEnv;
    });

    it('should check file existence when checkExists option is true', async () => {
      const originalEnv = process.env.SERVER_COMMAND_PATH;
      delete process.env.SERVER_COMMAND_PATH;

      const result = await validateCommandPath('/nonexistent/path', { checkExists: true });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('file_not_found');
      }

      process.env.SERVER_COMMAND_PATH = originalEnv;
    });

    it('should skip existence check when checkExists option is false', async () => {
      const originalEnv = process.env.SERVER_COMMAND_PATH;
      delete process.env.SERVER_COMMAND_PATH;

      const result = await validateCommandPath('/nonexistent/path', { checkExists: false });
      // Should pass validation (assuming path format is valid)
      expect(result.ok).toBe(true);

      process.env.SERVER_COMMAND_PATH = originalEnv;
    });

    it('should normalize path with resolve', () => {
      const originalEnv = process.env.SERVER_COMMAND_PATH;
      delete process.env.SERVER_COMMAND_PATH;

      const result = validateCommandPath('/usr/local/bin/../bin/server');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('/usr/local/bin/server');
      }

      process.env.SERVER_COMMAND_PATH = originalEnv;
    });
  });
});
