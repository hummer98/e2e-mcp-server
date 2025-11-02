import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { RateLimiter } from './rate-limit.js';

describe('Rate Limiter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Session Creation Rate Limit', () => {
    it('should allow requests within limit', () => {
      const limiter = new RateLimiter({ maxRequests: 10, windowMs: 60000 });

      for (let i = 0; i < 10; i++) {
        const result = limiter.checkLimit('session-create', 'client-1');
        expect(result.ok).toBe(true);
      }
    });

    it('should reject requests exceeding limit', () => {
      const limiter = new RateLimiter({ maxRequests: 10, windowMs: 60000 });

      // Use up all 10 requests
      for (let i = 0; i < 10; i++) {
        limiter.checkLimit('session-create', 'client-1');
      }

      // 11th request should be rejected
      const result = limiter.checkLimit('session-create', 'client-1');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('rate_limit_exceeded');
        expect(result.error.limit).toBe(10);
        expect(result.error.windowMs).toBe(60000);
      }
    });

    it('should reset limit after time window', () => {
      const limiter = new RateLimiter({ maxRequests: 10, windowMs: 60000 });

      // Use up all 10 requests
      for (let i = 0; i < 10; i++) {
        limiter.checkLimit('session-create', 'client-1');
      }

      // Advance time by 61 seconds
      jest.advanceTimersByTime(61000);

      // Should allow new requests
      const result = limiter.checkLimit('session-create', 'client-1');
      expect(result.ok).toBe(true);
    });

    it('should track different clients separately', () => {
      const limiter = new RateLimiter({ maxRequests: 10, windowMs: 60000 });

      // Client 1 uses up limit
      for (let i = 0; i < 10; i++) {
        limiter.checkLimit('session-create', 'client-1');
      }

      // Client 2 should still be able to make requests
      const result = limiter.checkLimit('session-create', 'client-2');
      expect(result.ok).toBe(true);
    });

    it('should track different operation types separately', () => {
      const limiter = new RateLimiter({ maxRequests: 10, windowMs: 60000 });

      // Use up session-create limit
      for (let i = 0; i < 10; i++) {
        limiter.checkLimit('session-create', 'client-1');
      }

      // Tool calls should still be allowed
      const result = limiter.checkLimit('tool-call', 'client-1');
      expect(result.ok).toBe(true);
    });

    it('should include retry-after in error', () => {
      const limiter = new RateLimiter({ maxRequests: 10, windowMs: 60000 });

      for (let i = 0; i < 10; i++) {
        limiter.checkLimit('session-create', 'client-1');
      }

      const result = limiter.checkLimit('session-create', 'client-1');
      if (!result.ok) {
        expect(result.error.retryAfter).toBeDefined();
        expect(result.error.retryAfter).toBeGreaterThan(0);
      }
    });

    it('should clean up old entries', () => {
      const limiter = new RateLimiter({ maxRequests: 10, windowMs: 60000 });

      // Make a request
      limiter.checkLimit('session-create', 'client-1');

      // Advance time past window
      jest.advanceTimersByTime(70000);

      // Make another request (should trigger cleanup)
      limiter.checkLimit('session-create', 'client-2');

      // Client 1's old entry should be cleaned up
      // This is implementation detail, but we can verify behavior
      const result = limiter.checkLimit('session-create', 'client-1');
      expect(result.ok).toBe(true);
    });
  });

  describe('Multiple Rate Limiters', () => {
    it('should support different limits for different operations', () => {
      const sessionLimiter = new RateLimiter({ maxRequests: 10, windowMs: 60000 });
      const toolLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });

      // Session creation limit: 10
      for (let i = 0; i < 10; i++) {
        const result = sessionLimiter.checkLimit('session-create', 'client-1');
        expect(result.ok).toBe(true);
      }
      const sessionResult = sessionLimiter.checkLimit('session-create', 'client-1');
      expect(sessionResult.ok).toBe(false);

      // Tool call limit: 100
      for (let i = 0; i < 100; i++) {
        const result = toolLimiter.checkLimit('tool-call', 'client-1');
        expect(result.ok).toBe(true);
      }
      const toolResult = toolLimiter.checkLimit('tool-call', 'client-1');
      expect(toolResult.ok).toBe(false);
    });
  });

  describe('Sliding Window', () => {
    it('should use sliding window algorithm', () => {
      const limiter = new RateLimiter({ maxRequests: 10, windowMs: 60000 });

      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        limiter.checkLimit('session-create', 'client-1');
      }

      // Advance time by 30 seconds (half window)
      jest.advanceTimersByTime(30000);

      // Should still be rate limited (requests haven't expired)
      const result1 = limiter.checkLimit('session-create', 'client-1');
      expect(result1.ok).toBe(false);

      // Advance another 31 seconds (total 61 seconds)
      jest.advanceTimersByTime(31000);

      // Now requests should be allowed
      const result2 = limiter.checkLimit('session-create', 'client-1');
      expect(result2.ok).toBe(true);
    });
  });
});
