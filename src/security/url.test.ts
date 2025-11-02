import { describe, it, expect } from '@jest/globals';
import { validateUrl } from './url.js';

describe('URL Security', () => {
  describe('validateUrl', () => {
    it('should accept valid HTTPS URL', () => {
      const result = validateUrl('https://example.com');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('https://example.com/');
      }
    });

    it('should accept valid HTTP URL', () => {
      const result = validateUrl('http://example.com');
      expect(result.ok).toBe(true);
    });

    it('should reject private IP address 127.0.0.1', () => {
      const result = validateUrl('http://127.0.0.1');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('private_ip');
      }
    });

    it('should reject private IP address localhost', () => {
      const result = validateUrl('http://localhost');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('private_ip');
      }
    });

    it('should reject private IP range 10.x.x.x', () => {
      const result = validateUrl('http://10.0.0.1');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('private_ip');
      }
    });

    it('should reject private IP range 172.16.x.x - 172.31.x.x', () => {
      const result = validateUrl('http://172.16.0.1');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('private_ip');
      }
    });

    it('should reject private IP range 192.168.x.x', () => {
      const result = validateUrl('http://192.168.1.1');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('private_ip');
      }
    });

    it('should reject link-local address 169.254.x.x', () => {
      const result = validateUrl('http://169.254.169.254');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('private_ip');
      }
    });

    it('should enforce allowed hosts when ALLOWED_HOSTS is set', () => {
      const originalEnv = process.env.ALLOWED_HOSTS;
      process.env.ALLOWED_HOSTS = 'example.com,test.com';

      const result1 = validateUrl('https://example.com/path');
      expect(result1.ok).toBe(true);

      const result2 = validateUrl('https://test.com/path');
      expect(result2.ok).toBe(true);

      const result3 = validateUrl('https://other.com/path');
      expect(result3.ok).toBe(false);
      if (!result3.ok) {
        expect(result3.error.type).toBe('host_not_allowed');
      }

      process.env.ALLOWED_HOSTS = originalEnv;
    });

    it('should support wildcard in ALLOWED_HOSTS', () => {
      const originalEnv = process.env.ALLOWED_HOSTS;
      process.env.ALLOWED_HOSTS = '*.example.com';

      const result1 = validateUrl('https://sub.example.com');
      expect(result1.ok).toBe(true);

      const result2 = validateUrl('https://deep.sub.example.com');
      expect(result2.ok).toBe(true);

      const result3 = validateUrl('https://example.com');
      expect(result3.ok).toBe(false);

      const result4 = validateUrl('https://other.com');
      expect(result4.ok).toBe(false);

      process.env.ALLOWED_HOSTS = originalEnv;
    });

    it('should allow any valid URL when ALLOWED_HOSTS is not set', () => {
      const originalEnv = process.env.ALLOWED_HOSTS;
      delete process.env.ALLOWED_HOSTS;

      const result = validateUrl('https://any-domain.com');
      expect(result.ok).toBe(true);

      process.env.ALLOWED_HOSTS = originalEnv;
    });

    it('should reject invalid URL format', () => {
      const result = validateUrl('not-a-url');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid_url');
      }
    });

    it('should reject non-HTTP(S) protocol', () => {
      const result = validateUrl('ftp://example.com');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid_protocol');
      }
    });

    it('should reject file:// protocol', () => {
      const result = validateUrl('file:///etc/passwd');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid_protocol');
      }
    });

    it('should reject javascript: protocol', () => {
      const result = validateUrl('javascript:alert(1)');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid_protocol');
      }
    });

    it('should reject data: protocol', () => {
      const result = validateUrl('data:text/html,<script>alert(1)</script>');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid_protocol');
      }
    });

    it('should reject IPv6 loopback address', () => {
      const result = validateUrl('http://[::1]');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('private_ip');
      }
    });

    it('should normalize and validate URL', () => {
      const originalEnv = process.env.ALLOWED_HOSTS;
      delete process.env.ALLOWED_HOSTS;

      const result = validateUrl('https://example.com:443/path');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toContain('example.com');
      }

      process.env.ALLOWED_HOSTS = originalEnv;
    });
  });
});
