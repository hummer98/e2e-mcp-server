import { describe, it, expect, beforeEach } from '@jest/globals';
import { createMCPServer } from './server.js';
import { registerTool } from './tools.js';

describe('MCP Tools Registration', () => {
  let server: ReturnType<typeof createMCPServer>;

  beforeEach(() => {
    server = createMCPServer();
  });

  it('should register a tool with name, description, and schema', () => {
    const toolName = 'testTool';
    const description = 'Test tool description';
    const schema = {
      type: 'object' as const,
      properties: {
        param1: { type: 'string' as const },
      },
      required: ['param1'],
    };

    const handler = async (args: Record<string, unknown>) => {
      return { result: `Executed with ${args.param1}` };
    };

    // Should not throw
    expect(() => {
      registerTool(server, toolName, description, schema, handler);
    }).not.toThrow();
  });

  it('should validate tool schema structure', () => {
    const toolName = 'invalidTool';
    const description = 'Invalid tool';
    const invalidSchema = {
      // Missing 'type' property
      properties: {},
    };

    const handler = async () => ({ result: 'test' });

    // Should throw validation error
    expect(() => {
      registerTool(server, toolName, description, invalidSchema as never, handler);
    }).toThrow();
  });
});
