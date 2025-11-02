#!/usr/bin/env tsx

/**
 * MCP Test Client for E2E MCP Server
 *
 * This interactive test client demonstrates how to communicate with
 * E2E MCP Server using the MCP protocol over HTTP.
 *
 * Usage:
 *   # Start the E2E MCP Server first
 *   npm start
 *
 *   # In another terminal, run this test client
 *   npx tsx examples/test-client.ts
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import * as readline from 'readline';
import * as path from 'path';

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000';

interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

class MCPTestClient {
  private client: Client;
  private transport: SSEClientTransport | null = null;
  private sessionId: string | null = null;
  private rl: readline.Interface;

  constructor() {
    this.client = new Client(
      {
        name: 'e2e-mcp-test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async connect(): Promise<void> {
    console.log(`\n🔌 Connecting to E2E MCP Server at ${MCP_SERVER_URL}...`);

    try {
      this.transport = new SSEClientTransport(new URL(`${MCP_SERVER_URL}/sse`));
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

    const serverCommandPath = path.join(process.cwd(), 'examples/server-command.js');
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
          this.sessionId = sessionInfo.sessionId;

          console.log('\n✅ Session started successfully!');
          console.log(`   Session ID: ${this.sessionId}`);
          console.log(`   URL: ${sessionInfo.url}`);
          console.log(`   Port: ${sessionInfo.port}`);
          console.log(`   PID: ${sessionInfo.serverInfo.pid}`);
          console.log(`   Logs: ${sessionInfo.serverInfo.logs.combined}`);
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
          console.log(`   Data size: ${dataLength} bytes`);
          if (screenshotData.path) {
            console.log(`   Saved to: ${screenshotData.path}`);
          }
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
          const pageContent = content.text;
          const preview = pageContent.substring(0, 200);

          console.log('✅ Content retrieved!');
          console.log(`   Length: ${pageContent.length} characters`);
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
          tail: 20,
        },
      });

      if (result.content && result.content.length > 0) {
        const content = result.content[0];
        if ('text' in content) {
          console.log('✅ Logs retrieved!');
          console.log('\n--- Last 20 lines ---');
          console.log(content.text);
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

    const serverCommandPath = path.join(process.cwd(), 'examples/server-command.js');

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

    this.rl.close();
    console.log('✅ Disconnected!\n');
  }

  async runInteractiveMode(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('  E2E MCP Server - Interactive Test Client');
    console.log('='.repeat(60));

    await this.connect();
    await this.listTools();

    let running = true;

    const prompt = () => {
      this.rl.question('\nEnter command (or "help" for options): ', async (input) => {
        const command = input.trim().toLowerCase();

        try {
          switch (command) {
            case 'help':
              this.showHelp();
              break;

            case 'list':
              await this.listTools();
              break;

            case 'start':
              await this.startSession();
              break;

            case 'nav':
            case 'navigate':
              this.rl.question('Enter URL: ', async (url) => {
                await this.navigate(url.trim());
                if (running) prompt();
              });
              return;

            case 'screenshot':
            case 'ss':
              await this.screenshot();
              break;

            case 'content':
              await this.getContent();
              break;

            case 'logs':
              await this.readLogs();
              break;

            case 'stop':
              await this.stopSession();
              break;

            case 'quit':
            case 'exit':
              running = false;
              await this.disconnect();
              process.exit(0);
              return;

            case 'demo':
              await this.runDemo();
              break;

            default:
              console.log(`❌ Unknown command: ${command}`);
              this.showHelp();
          }
        } catch (error) {
          console.error('Error:', error instanceof Error ? error.message : error);
        }

        if (running) {
          prompt();
        }
      });
    };

    prompt();
  }

  showHelp(): void {
    console.log('\n📖 Available commands:');
    console.log('  list       - List available MCP tools');
    console.log('  start      - Start a new E2E test session');
    console.log('  navigate   - Navigate to a URL (requires active session)');
    console.log('  screenshot - Take a screenshot (requires active session)');
    console.log('  content    - Get page content (requires active session)');
    console.log('  logs       - Read server logs (requires active session)');
    console.log('  stop       - Stop the current session');
    console.log('  demo       - Run automated demo workflow');
    console.log('  help       - Show this help message');
    console.log('  quit       - Exit the test client');
  }

  async runDemo(): Promise<void> {
    console.log('\n🎬 Running automated demo workflow...\n');

    try {
      // Step 1: Start session
      console.log('Step 1/6: Starting session...');
      await this.startSession();
      await this.sleep(1000);

      // Step 2: Navigate
      console.log('\nStep 2/6: Navigating to server...');
      if (this.sessionId) {
        const sessionInfo = await this.getSessionInfo();
        await this.navigate(sessionInfo.url);
        await this.sleep(1000);
      }

      // Step 3: Screenshot
      console.log('\nStep 3/6: Taking screenshot...');
      await this.screenshot();
      await this.sleep(1000);

      // Step 4: Get content
      console.log('\nStep 4/6: Getting page content...');
      await this.getContent();
      await this.sleep(1000);

      // Step 5: Read logs
      console.log('\nStep 5/6: Reading server logs...');
      await this.readLogs();
      await this.sleep(1000);

      // Step 6: Stop session
      console.log('\nStep 6/6: Stopping session...');
      await this.stopSession();

      console.log('\n✅ Demo completed successfully!\n');
    } catch (error) {
      console.error('\n❌ Demo failed:', error);
    }
  }

  private async getSessionInfo(): Promise<any> {
    // This is a simplified version - in real implementation,
    // you might want to query the session info from the server
    return {
      url: 'http://localhost:3001',
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  const client = new MCPTestClient();

  try {
    const args = process.argv.slice(2);

    if (args.includes('--demo')) {
      await client.connect();
      await client.runDemo();
      await client.disconnect();
    } else {
      await client.runInteractiveMode();
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
