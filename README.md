# E2E MCP Server

[![npm version](https://badge.fury.io/js/e2e-mcp-server.svg)](https://badge.fury.io/js/e2e-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)

> [日本語版READMEはこちら](./README.ja.md) / [Japanese README](./README.ja.md)

MCP (Model Context Protocol) server for E2E testing with integrated development server management and Playwright automation.

**Perfect for AI agents like Claude Code to automate browser testing workflows!**

## Overview

E2E MCP Server solves the complexity of server management when AI agents (Claude Code, ChatGPT, Gemini, etc.) execute E2E tests. Unlike traditional Playwright MCP implementations where AI agents must manage the development server state themselves, this server delegates the server process lifecycle management to the MCP layer, allowing AI agents to focus solely on test logic.

The server executes user-provided server startup commands (with dynamic port allocation and log management) and manages the returned URL and log paths as session information. All Playwright operations are exposed as MCP tools, and when errors occur, server logs and screenshots are automatically collected and provided to the AI agent.

### Key Capabilities

- **Automated E2E Session Management**: Complete automation from development server startup through test execution to server shutdown via MCP tool calls
- **Playwright as MCP Tools**: Provides main Playwright functionality as MCP tools, achieving the same operability as existing Playwright MCP
- **Automatic Debug Info Collection**: Auto-collects server logs, screenshots, and structured error details to support AI agent root cause analysis
- **Multi-Client Support**: Accessible from multiple AI clients (Claude Code, ChatGPT, Gemini) via standard MCP protocol

### Design Philosophy

- **Server Command Agnostic**: User-provided server startup commands (bash, Node.js, Python, etc.) with JSON response interface
- **Session Isolation**: One session = one development server + one browser instance, preventing state contamination
- **AI-First Error Handling**: Structured errors with screenshots and logs for AI agent self-healing capabilities
- **Cloud-Ready Architecture**: Stateless design suitable for Cloud Run and container environments

## Features

- **Integrated Server Management**: Start, monitor, and automatically shut down development servers
- **Playwright Automation**: Execute browser automation tasks via MCP tools
- **AI Agent Friendly**: Designed specifically for AI-driven E2E testing workflows
- **Error Handling**: Automatic screenshot capture and log collection on failures
- **Session Management**: Isolated browser sessions with automatic cleanup
- **Cloud Ready**: Deploy to Google Cloud Run or any container platform

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [MCP Tools](#mcp-tools)
- [Server Startup Command Interface](#server-startup-command-interface)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Deployment](#deployment)
- [Security](#security-considerations)
- [Architecture](#architecture)
- [License](#license)

## Requirements

- Node.js >= 20.0.0
- Development server startup command (Node.js, Bash, etc.)

## Installation

Install globally using npm:

```bash
npm install -g e2e-mcp-server
```

Or install as a dev dependency in your project:

```bash
npm install --save-dev e2e-mcp-server
```

## Quick Start

1. Add to your Claude Code configuration (`.mcp.json`):

```json
{
  "mcpServers": {
    "e2e-mcp": {
      "command": "npx",
      "args": ["-y", "e2e-mcp-server"]
    }
  }
}
```

2. Restart Claude Code

3. The MCP server will be automatically available with 10 powerful tools for E2E testing!

## Usage

### As MCP Server (Recommended: stdio mode)

Configure in your Claude Code `.mcp.json`:

```json
{
  "mcpServers": {
    "e2e-mcp": {
      "command": "npx",
      "args": ["-y", "e2e-mcp-server"]
    }
  }
}
```

**Claude Code will automatically start the MCP server when needed. No manual server startup required!**

### Alternative: HTTP Mode (for remote servers)

Start the HTTP server:

```bash
npm start
```

Configure in your `.mcp.json`:

```json
{
  "mcpServers": {
    "e2e-mcp-remote": {
      "type": "http",
      "url": "http://localhost:3000/message",
      "transport": {
        "type": "streamable-http"
      }
    }
  }
}
```

For development:

```bash
npm run dev
```

### Test the Server (Interactive)

Use the included test client to verify the server is working:

```bash
# Start the server in one terminal
npm start

# In another terminal, run the test client
npx tsx examples/test-client.ts

# Or run automated demo
npx tsx examples/test-client.ts --demo
```

See [examples/TEST-CLIENT.md](examples/TEST-CLIENT.md) for detailed usage.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `LOG_LEVEL` | Log level (debug/info/warn/error) | `info` |
| `SESSION_TIMEOUT` | Session timeout in milliseconds | `600000` (10 min) |
| `SERVER_COMMAND_PATH` | Allowed server startup command path (security) | - |
| `ALLOWED_HOSTS` | Comma-separated allowed navigation hosts | - |

## MCP Tools

### Session Management

#### startSession
Start a development server and create a browser session.

```json
{
  "name": "startSession",
  "arguments": {
    "commandPath": "/path/to/start-server.sh",
    "args": ["--port", "3001"]
  }
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "url": "http://localhost:3001",
  "port": 3001,
  "pid": 12345,
  "logs": {
    "stdout": "/tmp/server-stdout.log",
    "stderr": "/tmp/server-stderr.log",
    "combined": "/tmp/server-combined.log"
  }
}
```

#### stopSession
Stop a development server and close the browser session.

```json
{
  "name": "stopSession",
  "arguments": {
    "sessionId": "uuid",
    "commandPath": "/path/to/stop-server.sh",
    "args": []
  }
}
```

#### getSessionStatus
Get the status of a development server.

```json
{
  "name": "getSessionStatus",
  "arguments": {
    "sessionId": "uuid",
    "commandPath": "/path/to/status-server.sh",
    "args": []
  }
}
```

### Playwright Operations

#### navigate
Navigate to a URL in the session browser.

```json
{
  "name": "navigate",
  "arguments": {
    "sessionId": "uuid",
    "url": "http://localhost:3001/login",
    "waitUntil": "load"
  }
}
```

#### click
Click an element on the page.

```json
{
  "name": "click",
  "arguments": {
    "sessionId": "uuid",
    "selector": "#login-button",
    "timeout": 30000
  }
}
```

#### fill
Fill a text input field.

```json
{
  "name": "fill",
  "arguments": {
    "sessionId": "uuid",
    "selector": "#username",
    "value": "testuser"
  }
}
```

#### screenshot
Capture a screenshot of the current page.

```json
{
  "name": "screenshot",
  "arguments": {
    "sessionId": "uuid",
    "fullPage": false
  }
}
```

**Response:**
```json
{
  "data": "base64-encoded-image-data",
  "path": "/tmp/screenshot-123.png"
}
```

#### evaluate
Execute JavaScript in the page context.

```json
{
  "name": "evaluate",
  "arguments": {
    "sessionId": "uuid",
    "script": "document.title"
  }
}
```

#### getContent
Get the HTML content of the current page.

```json
{
  "name": "getContent",
  "arguments": {
    "sessionId": "uuid"
  }
}
```

### Log Management

#### readLogs
Read server logs from a session.

```json
{
  "name": "readLogs",
  "arguments": {
    "sessionId": "uuid",
    "logType": "combined",
    "tail": 100
  }
}
```

## Server Startup Command Interface

Your development server startup command should output JSON to stdout with the following format:

### Start Command (`--start`)

```json
{
  "status": "ready",
  "url": "http://localhost:3001",
  "port": 3001,
  "pid": 12345,
  "startedAt": "2025-01-01T00:00:00.000Z",
  "logs": {
    "stdout": "/path/to/stdout.log",
    "stderr": "/path/to/stderr.log",
    "combined": "/path/to/combined.log"
  },
  "message": "Server started successfully"
}
```

### Status Command (`--status`)

```json
{
  "status": "running",
  "url": "http://localhost:3001",
  "uptime": 12345,
  "healthy": true
}
```

### Shutdown Command (`--shutdown`)

```json
{
  "status": "stopped",
  "message": "Server stopped successfully"
}
```

### Example Implementation (Node.js)

See [examples/server-command.cjs](./examples/server-command.cjs) for a complete reference implementation.

## Development

### Clone and Setup

```bash
git clone https://github.com/hummer98/e2e-mcp-server.git
cd e2e-mcp-server
npm install
npm run build
```

### Run Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Lint

```bash
npm run lint
npm run lint:fix
```

### Local Development with Watch Mode

```bash
npm run dev
```

## Deployment

### Google Cloud Run

1. Build Docker image:
```bash
docker build -t gcr.io/PROJECT_ID/e2e-mcp-server .
```

2. Push to Container Registry:
```bash
docker push gcr.io/PROJECT_ID/e2e-mcp-server
```

3. Deploy to Cloud Run:
```bash
gcloud run deploy e2e-mcp-server \
  --image gcr.io/PROJECT_ID/e2e-mcp-server \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 3600s
```

Or use Cloud Build:
```bash
gcloud builds submit --config cloudbuild.yaml
```

### Environment Variables for Production

Set these in your Cloud Run configuration:

```bash
NODE_ENV=production
LOG_LEVEL=info
SESSION_TIMEOUT=600000
SERVER_COMMAND_PATH=/app/scripts/start-server.sh
ALLOWED_HOSTS=localhost,*.yourdomain.com
```

## Security Considerations

- **Command Injection**: Set `SERVER_COMMAND_PATH` to whitelist allowed server commands
- **SSRF Protection**: Set `ALLOWED_HOSTS` to restrict navigation targets
- **Rate Limiting**: Built-in rate limiting prevents DoS attacks
- **Authentication**: OAuth 2.1 support planned for production deployments

## Architecture

```
┌─────────────────┐
│  AI Agent       │
│  (Claude Code)  │
└────────┬────────┘
         │ MCP Protocol (stdio or HTTP)
         ↓
┌─────────────────┐
│  E2E MCP Server │
│  ┌───────────┐  │
│  │ Session   │  │
│  │ Manager   │  │
│  └─────┬─────┘  │
│        │        │
│  ┌─────┴─────┐  │
│  │Playwright │  │
│  │Browser    │  │
│  └───────────┘  │
└────────┬────────┘
         │ executes
         ↓
┌─────────────────┐
│  Dev Server     │
│  (Next.js, etc) │
└─────────────────┘
```

### Available Tools

The MCP server provides 10 powerful tools:

1. **startSession** - Start dev server and create browser session
2. **stopSession** - Stop dev server and close browser
3. **getSessionStatus** - Get server status
4. **navigate** - Navigate to URL
5. **click** - Click elements
6. **fill** - Fill form inputs
7. **screenshot** - Capture screenshots
8. **evaluate** - Execute JavaScript
9. **getContent** - Get page HTML
10. **readLogs** - Read server logs

## Publishing to npm

To publish this package to npm:

```bash
# Build the package
npm run build

# Login to npm (if not already)
npm login

# Publish (first time or updates)
npm publish

# Or publish with public access for scoped packages
npm publish --access public
```

Before publishing, make sure to:
1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Update repository URLs to your actual repository
4. Test the package locally with `npm pack`

## License

MIT

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- Issues: https://github.com/hummer98/e2e-mcp-server/issues
- Documentation: https://github.com/hummer98/e2e-mcp-server#readme
