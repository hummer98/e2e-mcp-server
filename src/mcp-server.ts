#!/usr/bin/env node

/**
 * E2E MCP Server - stdio transport mode
 *
 * This is the main entry point for stdio-based MCP server.
 * Used by Claude Code and other AI clients via npx command.
 *
 * Usage in .mcp.json:
 * {
 *   "mcpServers": {
 *     "e2e-mcp": {
 *       "command": "npx",
 *       "args": ["-y", "e2e-mcp-server"]
 *     }
 *   }
 * }
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from './mcp/server.js';
import { registerTool, setupToolHandlers } from './mcp/tools.js';
import { SessionManager } from './session/manager.js';
import { createLogger } from './logging/logger.js';

const logger = createLogger('mcp-server');

/**
 * Main function - starts MCP server in stdio mode
 */
async function main() {
  try {
    logger.info('Starting E2E MCP Server in stdio mode', {});

    // Create MCP server instance
    const server = createMCPServer();

    // Create session manager
    const sessionManager = new SessionManager();

    // Register all MCP tools
    registerTools(server, sessionManager);

    // Setup MCP request handlers
    setupToolHandlers(server);

    // Create stdio transport
    const transport = new StdioServerTransport();

    // Connect server to transport
    await server.connect(transport);

    logger.info('E2E MCP Server ready (stdio mode)', {});

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully', {});
      await server.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully', {});
      await server.close();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Fatal error starting MCP server', {
      details: { error: error instanceof Error ? error.message : String(error) },
    });
    process.exit(1);
  }
}

/**
 * Register all MCP tools with the server
 */
function registerTools(server: ReturnType<typeof createMCPServer>, sessionManager: SessionManager) {
  // Tool 1: startSession
  registerTool(
    server,
    'startSession',
    'Start a development server and create a browser session for E2E testing',
    {
      type: 'object',
      properties: {
        commandPath: {
          type: 'string',
          description: 'Absolute path to the server startup command',
        },
        args: {
          type: 'array',
          description: 'Additional arguments for the server command',
          items: { type: 'string' },
        },
      },
      required: ['commandPath'],
    },
    async (args) => {
      const { commandPath, args: commandArgs } = args as {
        commandPath: string;
        args?: string[];
      };

      const result = await sessionManager.startSession(
        commandPath,
        commandArgs || ['--start']
      );

      if (result.ok) {
        return {
          result: 'success',
          sessionId: result.value.sessionId,
          url: result.value.serverInfo.url,
          port: result.value.serverInfo.port,
          pid: result.value.serverInfo.pid,
          logs: result.value.serverInfo.logs,
        };
      } else {
        return {
          error: result.error.message,
          type: result.error.type,
        };
      }
    }
  );

  // Tool 2: stopSession
  registerTool(
    server,
    'stopSession',
    'Stop the E2E session, close browser, and shutdown the development server',
    {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID to stop',
        },
        commandPath: {
          type: 'string',
          description: 'Absolute path to the server startup command',
        },
        args: {
          type: 'array',
          description: 'Shutdown arguments (default: ["--shutdown"])',
          items: { type: 'string' },
        },
      },
      required: ['sessionId', 'commandPath'],
    },
    async (args) => {
      const { sessionId, commandPath, args: commandArgs } = args as {
        sessionId: string;
        commandPath: string;
        args?: string[];
      };

      const result = await sessionManager.stopSession(
        sessionId,
        commandPath,
        commandArgs || ['--shutdown']
      );

      if (result.ok) {
        return {
          result: 'success',
          message: 'Session stopped successfully',
        };
      } else {
        return {
          error: result.error.message,
          type: result.error.type,
        };
      }
    }
  );

  // Tool 3: getSessionStatus
  registerTool(
    server,
    'getSessionStatus',
    'Get the current status of an E2E session',
    {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID to check',
        },
        commandPath: {
          type: 'string',
          description: 'Absolute path to the server startup command',
        },
        args: {
          type: 'array',
          description: 'Status arguments (default: ["--status"])',
          items: { type: 'string' },
        },
      },
      required: ['sessionId', 'commandPath'],
    },
    async (args) => {
      const { sessionId, commandPath, args: commandArgs } = args as {
        sessionId: string;
        commandPath: string;
        args?: string[];
      };

      const result = await sessionManager.getSessionStatus(
        sessionId,
        commandPath,
        commandArgs || ['--status']
      );

      if (result.ok) {
        return {
          result: 'success',
          status: result.value,
        };
      } else {
        return {
          error: result.error.message,
          type: result.error.type,
        };
      }
    }
  );

  // Tool 4: navigate
  registerTool(
    server,
    'navigate',
    'Navigate the browser to a specified URL',
    {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
        url: {
          type: 'string',
          description: 'URL to navigate to',
        },
        waitUntil: {
          type: 'string',
          description: 'Wait until event (load, domcontentloaded, networkidle)',
        },
      },
      required: ['sessionId', 'url'],
    },
    async (args) => {
      const { sessionId, url, waitUntil } = args as {
        sessionId: string;
        url: string;
        waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
      };

      const session = sessionManager.getSession(sessionId);
      if (!session.ok) {
        return {
          error: session.error.message,
          type: session.error.type,
        };
      }

      if (!session.value.browser) {
        return {
          error: 'Browser not initialized',
          type: 'browser_not_initialized',
        };
      }

      const page = await session.value.browser.newPage();
      try {
        await page.goto(url, { waitUntil: waitUntil || 'load' });
        return {
          result: 'success',
          message: `Navigated to ${url}`,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : String(error),
          type: 'navigation_failed',
        };
      }
    }
  );

  // Tool 5: click
  registerTool(
    server,
    'click',
    'Click an element on the page',
    {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
        selector: {
          type: 'string',
          description: 'CSS selector or Playwright selector',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 30000)',
        },
      },
      required: ['sessionId', 'selector'],
    },
    async (args) => {
      const { sessionId, selector, timeout } = args as {
        sessionId: string;
        selector: string;
        timeout?: number;
      };

      const session = sessionManager.getSession(sessionId);
      if (!session.ok) {
        return {
          error: session.error.message,
          type: session.error.type,
        };
      }

      if (!session.value.browser) {
        return {
          error: 'Browser not initialized',
          type: 'browser_not_initialized',
        };
      }

      const pages = session.value.browser.contexts()[0]?.pages() || [];
      if (pages.length === 0) {
        return {
          error: 'No page is open. Navigate to a URL first.',
          type: 'no_page',
        };
      }

      const page = pages[0];
      try {
        await page.click(selector, { timeout: timeout || 30000 });
        return {
          result: 'success',
          message: `Clicked element: ${selector}`,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : String(error),
          type: 'click_failed',
        };
      }
    }
  );

  // Tool 6: fill
  registerTool(
    server,
    'fill',
    'Fill an input element with text',
    {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
        selector: {
          type: 'string',
          description: 'CSS selector for the input element',
        },
        text: {
          type: 'string',
          description: 'Text to fill',
        },
      },
      required: ['sessionId', 'selector', 'text'],
    },
    async (args) => {
      const { sessionId, selector, text } = args as {
        sessionId: string;
        selector: string;
        text: string;
      };

      const session = sessionManager.getSession(sessionId);
      if (!session.ok) {
        return {
          error: session.error.message,
          type: session.error.type,
        };
      }

      if (!session.value.browser) {
        return {
          error: 'Browser not initialized',
          type: 'browser_not_initialized',
        };
      }

      const pages = session.value.browser.contexts()[0]?.pages() || [];
      if (pages.length === 0) {
        return {
          error: 'No page is open. Navigate to a URL first.',
          type: 'no_page',
        };
      }

      const page = pages[0];
      try {
        await page.fill(selector, text);
        return {
          result: 'success',
          message: `Filled element ${selector} with: ${text}`,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : String(error),
          type: 'fill_failed',
        };
      }
    }
  );

  // Tool 7: screenshot
  registerTool(
    server,
    'screenshot',
    'Capture a screenshot of the current page',
    {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
        fullPage: {
          type: 'boolean',
          description: 'Capture full page screenshot (default: false)',
        },
      },
      required: ['sessionId'],
    },
    async (args) => {
      const { sessionId, fullPage } = args as {
        sessionId: string;
        fullPage?: boolean;
      };

      const session = sessionManager.getSession(sessionId);
      if (!session.ok) {
        return {
          error: session.error.message,
          type: session.error.type,
        };
      }

      if (!session.value.browser) {
        return {
          error: 'Browser not initialized',
          type: 'browser_not_initialized',
        };
      }

      const pages = session.value.browser.contexts()[0]?.pages() || [];
      if (pages.length === 0) {
        return {
          error: 'No page is open. Navigate to a URL first.',
          type: 'no_page',
        };
      }

      const page = pages[0];
      try {
        const buffer = await page.screenshot({ fullPage: fullPage || false });
        const base64 = buffer.toString('base64');
        return {
          result: 'success',
          data: base64,
          size: buffer.length,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : String(error),
          type: 'screenshot_failed',
        };
      }
    }
  );

  // Tool 8: evaluate
  registerTool(
    server,
    'evaluate',
    'Execute JavaScript in the page context',
    {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
        script: {
          type: 'string',
          description: 'JavaScript code to execute',
        },
      },
      required: ['sessionId', 'script'],
    },
    async (args) => {
      const { sessionId, script } = args as {
        sessionId: string;
        script: string;
      };

      const session = sessionManager.getSession(sessionId);
      if (!session.ok) {
        return {
          error: session.error.message,
          type: session.error.type,
        };
      }

      if (!session.value.browser) {
        return {
          error: 'Browser not initialized',
          type: 'browser_not_initialized',
        };
      }

      const pages = session.value.browser.contexts()[0]?.pages() || [];
      if (pages.length === 0) {
        return {
          error: 'No page is open. Navigate to a URL first.',
          type: 'no_page',
        };
      }

      const page = pages[0];
      try {
        const evalResult = await page.evaluate(script);
        return {
          result: 'success',
          value: evalResult,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : String(error),
          type: 'evaluation_failed',
        };
      }
    }
  );

  // Tool 9: getContent
  registerTool(
    server,
    'getContent',
    'Get the HTML content of the current page',
    {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
      },
      required: ['sessionId'],
    },
    async (args) => {
      const { sessionId } = args as { sessionId: string };

      const session = sessionManager.getSession(sessionId);
      if (!session.ok) {
        return {
          error: session.error.message,
          type: session.error.type,
        };
      }

      if (!session.value.browser) {
        return {
          error: 'Browser not initialized',
          type: 'browser_not_initialized',
        };
      }

      const pages = session.value.browser.contexts()[0]?.pages() || [];
      if (pages.length === 0) {
        return {
          error: 'No page is open. Navigate to a URL first.',
          type: 'no_page',
        };
      }

      const page = pages[0];
      try {
        const content = await page.content();
        return {
          result: 'success',
          content,
          length: content.length,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : String(error),
          type: 'get_content_failed',
        };
      }
    }
  );

  // Tool 10: readLogs
  registerTool(
    server,
    'readLogs',
    'Read server logs from the development server',
    {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
        logType: {
          type: 'string',
          description: 'Log type (stdout, stderr, combined)',
        },
        lines: {
          type: 'number',
          description: 'Number of lines to read from the end (default: 100)',
        },
      },
      required: ['sessionId'],
    },
    async (args) => {
      const { sessionId, logType, lines } = args as {
        sessionId: string;
        logType?: 'stdout' | 'stderr' | 'combined';
        lines?: number;
      };

      const result = await sessionManager.readSessionLogs(sessionId, logType || 'combined', {
        lines: lines || 100,
      });

      if (result.ok) {
        return {
          result: 'success',
          logs: result.value,
          lineCount: result.value.split('\n').length,
        };
      } else {
        return {
          error: result.error.message,
          type: result.error.type,
        };
      }
    }
  );

  logger.info('Registered 10 MCP tools', {});
}

// Start server
main();
