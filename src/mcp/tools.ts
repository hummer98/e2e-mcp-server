import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * JSON Schema type definition for tool input validation
 */
export interface ToolSchema {
  type: 'object';
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

/**
 * Tool handler function type
 */
export type ToolHandler = (args: Record<string, unknown>) => Promise<{
  result?: unknown;
  error?: string;
  [key: string]: unknown;
}>;

/**
 * Internal tool registry
 */
interface ToolDefinition {
  name: string;
  description: string;
  schema: ToolSchema;
  handler: ToolHandler;
}

const toolRegistry: Map<string, ToolDefinition> = new Map();

/**
 * Validates JSON Schema structure
 * @throws Error if schema is invalid
 */
function validateSchema(schema: unknown): asserts schema is ToolSchema {
  if (typeof schema !== 'object' || schema === null) {
    throw new Error('Schema must be an object');
  }

  const s = schema as Record<string, unknown>;

  if (s.type !== 'object') {
    throw new Error('Schema must have type: "object"');
  }

  if (s.properties !== undefined && typeof s.properties !== 'object') {
    throw new Error('Schema properties must be an object');
  }

  if (s.required !== undefined && !Array.isArray(s.required)) {
    throw new Error('Schema required must be an array');
  }
}

/**
 * Registers a tool with the MCP server
 * @param _server MCP server instance (unused, kept for API compatibility)
 * @param name Tool name
 * @param description Tool description
 * @param schema JSON Schema for input validation
 * @param handler Tool execution handler
 */
export function registerTool(
  _server: McpServer,
  name: string,
  description: string,
  schema: ToolSchema,
  handler: ToolHandler
): void {
  // Validate schema structure
  validateSchema(schema);

  // Store in registry
  toolRegistry.set(name, { name, description, schema, handler });
}

/**
 * Sets up MCP request handlers for tools
 * @param server MCP server instance
 */
export function setupToolHandlers(server: McpServer): void {
  // Handle tools/list request
  server.server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools: Tool[] = Array.from(toolRegistry.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.schema as any, // Type assertion for JSON Schema compatibility
    }));

    return { tools };
  });

  // Handle tools/call request
  server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const args = request.params.arguments || {};

    const tool = toolRegistry.get(toolName);
    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const result = await tool.handler(args);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  });
}
