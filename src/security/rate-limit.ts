import { Err, Ok, Result } from '../types/result.js';

/**
 * Rate limit error
 */
export interface RateLimitError {
  type: 'rate_limit_exceeded';
  message: string;
  limit: number;
  windowMs: number;
  retryAfter: number; // milliseconds
}

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  maxRequests: number; // Maximum requests per window
  windowMs: number; // Time window in milliseconds
}

/**
 * Request tracking entry
 */
interface RequestEntry {
  timestamp: number;
}

/**
 * Rate limiter using sliding window algorithm
 */
export class RateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly requests: Map<string, RequestEntry[]>;

  constructor(config: RateLimiterConfig) {
    this.maxRequests = config.maxRequests;
    this.windowMs = config.windowMs;
    this.requests = new Map();
  }

  /**
   * Get rate limit key for operation and client
   */
  private getKey(operationType: string, clientId: string): string {
    return `${operationType}:${clientId}`;
  }

  /**
   * Clean up expired entries for a key
   */
  private cleanupExpired(key: string, now: number): void {
    const entries = this.requests.get(key);
    if (!entries) return;

    const windowStart = now - this.windowMs;
    const validEntries = entries.filter((entry) => entry.timestamp > windowStart);

    if (validEntries.length === 0) {
      this.requests.delete(key);
    } else {
      this.requests.set(key, validEntries);
    }
  }

  /**
   * Check if request is within rate limit
   * @param operationType Type of operation (e.g., 'session-create', 'tool-call')
   * @param clientId Client identifier
   * @returns Result indicating if request is allowed or rate limit error
   */
  checkLimit(operationType: string, clientId: string): Result<void, RateLimitError> {
    const key = this.getKey(operationType, clientId);
    const now = Date.now();

    // Clean up expired entries
    this.cleanupExpired(key, now);

    // Get current entries
    const entries = this.requests.get(key) || [];
    const windowStart = now - this.windowMs;

    // Count requests in current window
    const requestsInWindow = entries.filter((entry) => entry.timestamp > windowStart);

    if (requestsInWindow.length >= this.maxRequests) {
      // Calculate retry-after time (time until oldest request expires)
      const oldestTimestamp = requestsInWindow[0]?.timestamp || now;
      const retryAfter = Math.max(0, oldestTimestamp + this.windowMs - now);

      return Err({
        type: 'rate_limit_exceeded',
        message: `Rate limit exceeded: ${this.maxRequests} requests per ${this.windowMs}ms`,
        limit: this.maxRequests,
        windowMs: this.windowMs,
        retryAfter,
      });
    }

    // Add new entry
    entries.push({ timestamp: now });
    this.requests.set(key, entries);

    return Ok(undefined);
  }

  /**
   * Reset rate limit for a specific key (for testing)
   */
  reset(operationType: string, clientId: string): void {
    const key = this.getKey(operationType, clientId);
    this.requests.delete(key);
  }

  /**
   * Clear all rate limit data (for testing)
   */
  clear(): void {
    this.requests.clear();
  }
}
