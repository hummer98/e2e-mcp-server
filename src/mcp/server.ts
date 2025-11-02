import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';

/**
 * Create MCP Server instance with tools capability
 */
export function createMCPServer(): McpServer {
  const server = new McpServer(
    {
      name: 'e2e-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  return server;
}

/**
 * Create Streamable HTTP transport (stateless)
 */
export function createTransport(): StreamableHTTPServerTransport {
  return new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Stateless
  });
}

/**
 * Handle MCP message endpoint
 */
export async function handleMessage(
  transport: StreamableHTTPServerTransport,
  req: Request,
  res: Response
): Promise<void> {
  try {
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Streamable HTTP transport error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

/**
 * Health check endpoint response
 */
export function healthCheck(): { status: string; uptime: number; memory: NodeJS.MemoryUsage } {
  return {
    status: 'ok',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };
}
