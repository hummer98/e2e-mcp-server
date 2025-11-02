import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

describe('MCP Server', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should export createMCPServer function', async () => {
      const { createMCPServer } = await import('./server.js');
      expect(typeof createMCPServer).toBe('function');
    });

    it('should create MCP server with tools capability', async () => {
      const { createMCPServer } = await import('./server.js');
      const server = createMCPServer();

      expect(server).toBeDefined();
      // McpServer should have registerTool method
      expect(typeof (server as McpServer).registerTool).toBe('function');
    });
  });

  describe('health check', () => {
    it('should respond with ok status', async () => {
      const { healthCheck } = await import('./server.js');
      const result = healthCheck();

      expect(result).toEqual({
        status: 'ok',
        uptime: expect.any(Number),
        memory: expect.any(Object),
      });
    });
  });
});
