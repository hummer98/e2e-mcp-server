#!/usr/bin/env tsx

/**
 * MCP Test Client for E2E MCP Server (stdio mode)
 *
 * This test client demonstrates how to communicate with
 * E2E MCP Server using the MCP protocol over stdio.
 *
 * Usage:
 *   npx tsx examples/test-client-stdio.ts
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as path from 'path';

interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

class MCPTestClientStdio {
  private client: Client;
  private transport: StdioClientTransport | null = null;
  private sessionId: string | null = null;

  constructor() {
    this.client = new Client(
      {
        name: 'e2e-mcp-test-client-stdio',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );
  }

  async connect(): Promise<void> {
    console.log('\n🔌 Starting E2E MCP Server in stdio mode...');

    try {
      // Create stdio transport with command and args
      const serverPath = path.join(process.cwd(), 'dist/mcp-server.js');
      this.transport = new StdioClientTransport({
        command: 'node',
        args: [serverPath],
      });

      await this.client.connect(this.transport);

      console.log('✅ Connected successfully!\n');
    } catch (error) {
      console.error('❌ Connection failed:', error);
      throw error;
    }
  }

  async listTools(): Promise<MCPTool[]> {
    console.log('\n📋 Listing available tools...');

    const response = await this.client.listTools();
    const tools = response.tools as MCPTool[];

    console.log(`\n✅ Found ${tools.length} tools:\n`);
    tools.forEach((tool, index) => {
      console.log(`${index + 1}. ${tool.name}`);
      if (tool.description) {
        console.log(`   ${tool.description}`);
      }
    });

    return tools;
  }

  async startSession(): Promise<void> {
    console.log('\n🚀 Starting a new E2E test session...');

    const serverCommandPath = path.join(process.cwd(), 'examples/server-command.cjs');
    console.log(`   Using server command: ${serverCommandPath}`);

    try {
      const result = await this.client.callTool({
        name: 'startSession',
        arguments: {
          commandPath: serverCommandPath,
          args: ['--start'],
        },
      });

      if (result.content && result.content.length > 0) {
        const content = result.content[0];
        if ('text' in content) {
          const sessionInfo = JSON.parse(content.text);

          // Debug: print full response
          console.log('\n📋 Full response:', JSON.stringify(sessionInfo, null, 2));

          this.sessionId = sessionInfo.sessionId;

          console.log('\n✅ Session started successfully!');
          console.log(`   Session ID: ${this.sessionId}`);
          console.log(`   URL: ${sessionInfo.url}`);
          console.log(`   Port: ${sessionInfo.port}`);
          console.log(`   PID: ${sessionInfo.pid}`);
          console.log(`   Logs: ${sessionInfo.logs}`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to start session:', error);
      throw error;
    }
  }

  async navigate(url: string): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No active session. Please start a session first.');
    }

    console.log(`\n🌐 Navigating to ${url}...`);

    try {
      const result = await this.client.callTool({
        name: 'navigate',
        arguments: {
          sessionId: this.sessionId,
          url,
          waitUntil: 'load',
        },
      });

      console.log('✅ Navigation successful!');
      if (result.content && result.content.length > 0) {
        const content = result.content[0];
        if ('text' in content) {
          console.log(`   Response: ${content.text}`);
        }
      }
    } catch (error) {
      console.error('❌ Navigation failed:', error);
      throw error;
    }
  }

  async screenshot(): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No active session. Please start a session first.');
    }

    console.log('\n📸 Taking screenshot...');

    try {
      const result = await this.client.callTool({
        name: 'screenshot',
        arguments: {
          sessionId: this.sessionId,
          fullPage: false,
        },
      });

      if (result.content && result.content.length > 0) {
        const content = result.content[0];
        if ('text' in content) {
          const screenshotData = JSON.parse(content.text);
          const dataLength = screenshotData.data?.length || 0;

          console.log('✅ Screenshot captured!');
          console.log(`   Data size: ${dataLength} bytes (base64)`);
          console.log(`   Actual size: ~${Math.round(dataLength * 0.75)} bytes`);
        }
      }
    } catch (error) {
      console.error('❌ Screenshot failed:', error);
      throw error;
    }
  }

  async getContent(): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No active session. Please start a session first.');
    }

    console.log('\n📄 Getting page content...');

    try {
      const result = await this.client.callTool({
        name: 'getContent',
        arguments: {
          sessionId: this.sessionId,
        },
      });

      if (result.content && result.content.length > 0) {
        const content = result.content[0];
        if ('text' in content) {
          const parsedContent = JSON.parse(content.text);
          const pageContent = parsedContent.content || '';
          const preview = pageContent.substring(0, 200);

          console.log('✅ Content retrieved!');
          console.log(`   Length: ${parsedContent.length} characters`);
          console.log(`   Preview: ${preview}...`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to get content:', error);
      throw error;
    }
  }

  async readLogs(): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No active session. Please start a session first.');
    }

    console.log('\n📋 Reading server logs...');

    try {
      const result = await this.client.callTool({
        name: 'readLogs',
        arguments: {
          sessionId: this.sessionId,
          logType: 'combined',
          lines: 20,
        },
      });

      if (result.content && result.content.length > 0) {
        const content = result.content[0];
        if ('text' in content) {
          const logsData = JSON.parse(content.text);
          console.log('✅ Logs retrieved!');
          console.log(`   Line count: ${logsData.lineCount}`);
          console.log('\n--- Last 20 lines ---');
          console.log(logsData.logs);
          console.log('--- End of logs ---\n');
        }
      }
    } catch (error) {
      console.error('❌ Failed to read logs:', error);
      throw error;
    }
  }

  async stopSession(): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No active session. Please start a session first.');
    }

    console.log('\n🛑 Stopping session...');

    const serverCommandPath = path.join(process.cwd(), 'examples/server-command.cjs');

    try {
      const result = await this.client.callTool({
        name: 'stopSession',
        arguments: {
          sessionId: this.sessionId,
          commandPath: serverCommandPath,
          args: ['--shutdown'],
        },
      });

      console.log('✅ Session stopped successfully!');
      if (result.content && result.content.length > 0) {
        const content = result.content[0];
        if ('text' in content) {
          console.log(`   Response: ${content.text}`);
        }
      }

      this.sessionId = null;
    } catch (error) {
      console.error('❌ Failed to stop session:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    console.log('\n👋 Disconnecting from MCP server...');

    if (this.transport) {
      await this.transport.close();
    }

    console.log('✅ Disconnected!\n');
  }

  async runDemo(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('  E2E MCP Server - stdio Test Demo');
    console.log('='.repeat(60));

    try {
      // Connect
      await this.connect();
      await this.sleep(500);

      // List tools
      await this.listTools();
      await this.sleep(500);

      // Step 1: Start session
      console.log('\n📍 Step 1/6: Starting session...');
      await this.startSession();
      await this.sleep(1000);

      // Step 2: Navigate
      console.log('\n📍 Step 2/6: Navigating to server...');
      // Get URL from session (assuming server-command.js returns http://localhost:3001)
      await this.navigate('http://localhost:3001');
      await this.sleep(1000);

      // Step 3: Screenshot
      console.log('\n📍 Step 3/6: Taking screenshot...');
      await this.screenshot();
      await this.sleep(1000);

      // Step 4: Get content
      console.log('\n📍 Step 4/6: Getting page content...');
      await this.getContent();
      await this.sleep(1000);

      // Step 5: Read logs
      console.log('\n📍 Step 5/6: Reading server logs...');
      await this.readLogs();
      await this.sleep(1000);

      // Step 6: Stop session
      console.log('\n📍 Step 6/6: Stopping session...');
      await this.stopSession();

      console.log('\n🎉 Demo completed successfully!\n');
    } catch (error) {
      console.error('\n❌ Demo failed:', error);
    } finally {
      await this.disconnect();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  const client = new MCPTestClientStdio();

  try {
    await client.runDemo();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
