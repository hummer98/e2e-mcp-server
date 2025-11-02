import { Err, Ok, Result } from '../types/result.js';

/**
 * URL validation error types
 */
export type UrlValidationError =
  | {
      type: 'invalid_url';
      message: string;
      url: string;
    }
  | {
      type: 'invalid_protocol';
      message: string;
      url: string;
      protocol: string;
    }
  | {
      type: 'private_ip';
      message: string;
      url: string;
      hostname: string;
    }
  | {
      type: 'host_not_allowed';
      message: string;
      url: string;
      hostname: string;
      allowedHosts: string[];
    };

/**
 * Check if IP address is private or link-local
 */
function isPrivateIp(hostname: string): boolean {
  // Check for localhost
  if (hostname === 'localhost' || hostname === '::1') {
    return true;
  }

  // Check for IPv4 private ranges
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);

  if (match) {
    const [, a, b, c, d] = match.map(Number);

    // Validate octets
    if (a > 255 || b > 255 || c > 255 || d > 255) {
      return false;
    }

    // 127.0.0.0/8 (loopback)
    if (a === 127) {
      return true;
    }

    // 10.0.0.0/8 (private)
    if (a === 10) {
      return true;
    }

    // 172.16.0.0/12 (private)
    if (a === 172 && b >= 16 && b <= 31) {
      return true;
    }

    // 192.168.0.0/16 (private)
    if (a === 192 && b === 168) {
      return true;
    }

    // 169.254.0.0/16 (link-local)
    if (a === 169 && b === 254) {
      return true;
    }
  }

  // Check for IPv6 loopback in bracket notation
  if (hostname === '[::1]' || hostname.includes('::1')) {
    return true;
  }

  return false;
}

/**
 * Check if hostname matches allowed host pattern
 * Supports wildcards like *.example.com
 */
function matchesAllowedHost(hostname: string, pattern: string): boolean {
  if (pattern.startsWith('*.')) {
    const domain = pattern.slice(2);
    return hostname.endsWith('.' + domain);
  }

  return hostname === pattern;
}

/**
 * Validate URL for SSRF protection
 * @param url URL string to validate
 * @returns Result containing normalized URL or validation error
 */
export function validateUrl(url: string): Result<string, UrlValidationError> {
  // Parse URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    return Err({
      type: 'invalid_url',
      message: 'Invalid URL format',
      url,
    });
  }

  // Check protocol (only allow http and https)
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return Err({
      type: 'invalid_protocol',
      message: `Protocol ${parsedUrl.protocol} is not allowed. Only HTTP and HTTPS are permitted`,
      url,
      protocol: parsedUrl.protocol,
    });
  }

  // Check for private IP addresses
  if (isPrivateIp(parsedUrl.hostname)) {
    return Err({
      type: 'private_ip',
      message: `Access to private IP address is not allowed: ${parsedUrl.hostname}`,
      url,
      hostname: parsedUrl.hostname,
    });
  }

  // Check against ALLOWED_HOSTS if set
  const allowedHostsEnv = process.env.ALLOWED_HOSTS;
  if (allowedHostsEnv && allowedHostsEnv.trim()) {
    const allowedHosts = allowedHostsEnv.split(',').map((h) => h.trim()).filter((h) => h);

    const isAllowed = allowedHosts.some((pattern) =>
      matchesAllowedHost(parsedUrl.hostname, pattern)
    );

    if (!isAllowed) {
      return Err({
        type: 'host_not_allowed',
        message: `Hostname ${parsedUrl.hostname} is not in allowed hosts list`,
        url,
        hostname: parsedUrl.hostname,
        allowedHosts,
      });
    }
  }

  // Return normalized URL
  return Ok(parsedUrl.href);
}
