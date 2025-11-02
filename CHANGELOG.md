# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-XX

### Added

#### Core Features
- **stdio Transport Support** - Primary transport mode for local development with Claude Code
- **HTTP Transport Support** - Optional transport for remote server deployments
- **Session Management** - Isolated browser sessions with automatic cleanup
- **10 Powerful MCP Tools**:
  - `startSession` - Start development server and create browser session
  - `stopSession` - Stop development server and close browser
  - `getSessionStatus` - Get server status and health check
  - `navigate` - Navigate to URLs with configurable wait conditions
  - `click` - Click elements with timeout support
  - `fill` - Fill form inputs with text
  - `screenshot` - Capture full-page or viewport screenshots
  - `evaluate` - Execute JavaScript in page context
  - `getContent` - Get HTML content of current page
  - `readLogs` - Read server logs (stdout, stderr, or combined)

#### Development Server Integration
- **Automated Server Lifecycle Management**
  - JSON-based command interface for start/status/shutdown
  - Process isolation with detached spawning
  - Immediate JSON response detection for non-blocking startup
  - Automatic log file management

#### Browser Automation
- **Playwright Integration**
  - Chromium browser support with headless mode
  - Automatic browser initialization per session
  - Page navigation with wait conditions
  - Element interaction (click, fill)
  - Screenshot capture with base64 encoding
  - JavaScript evaluation in page context
  - HTML content extraction

#### Security
- **Command Injection Protection** - Validates command paths and prevents shell injection
- **Path Traversal Prevention** - Resolves absolute paths securely
- **SSRF Protection** - Optional host allowlist for navigation targets
- **Rate Limiting** - Built-in protection against DoS attacks

#### Developer Experience
- **TypeScript Support** - Full type definitions included
- **Result Type Pattern** - Rust-inspired error handling with `Ok`/`Err`
- **Comprehensive Logging** - Structured logs with Winston
- **Test Coverage** - Unit and integration tests with Jest
- **Example Implementations**:
  - `examples/server-command.cjs` - Reference server command implementation
  - `examples/test-client-stdio.ts` - stdio test client
  - `examples/test-client.ts` - HTTP test client

#### Deployment
- **Docker Support** - Production-ready Dockerfile
- **Google Cloud Run** - Cloud Build configuration included
- **Environment Variables** - Configurable timeout, logging, security settings

### Technical Highlights

#### Architecture Decisions
- Custom tool registry implementation to preserve JSON Schema metadata
- Low-level MCP SDK request handlers for tools/list and tools/call
- Detached process spawning with `child.unref()` for independent servers
- CommonJS compatibility via `.cjs` extension for server commands

#### Bug Fixes During Development
- Fixed JSON Schema stripping issue in MCP SDK tool registration
- Resolved ESM/CommonJS compatibility for server-command script
- Fixed command execution timeout with detached process handling
- Added missing Playwright browser initialization

### Dependencies

#### Runtime
- `@modelcontextprotocol/sdk` ^1.20.2
- `playwright` ^1.40.0
- `express` ^4.18.2
- `uuid` ^9.0.1
- `zod` ^4.1.12

#### Development
- `typescript` ^5.3.3
- `jest` ^29.7.0
- `ts-jest` ^29.1.1
- `eslint` ^8.56.0
- `tsx` ^4.7.0

### Documentation
- Comprehensive README.md with usage examples
- Inline JSDoc comments for all public APIs
- Architecture diagrams
- Server command interface specification
- Claude Code integration guide

---

## Release Notes

### What's New in 1.0.0

E2E MCP Server is an MCP (Model Context Protocol) server designed specifically for AI agents like Claude Code to automate end-to-end browser testing workflows. This initial release provides:

1. **Zero-Config Local Development** - Just add to `.mcp.json` and start testing
2. **Integrated Server Management** - Automatically start/stop your dev servers
3. **Full Browser Automation** - Navigate, click, fill forms, capture screenshots
4. **Production Ready** - Deploy to Cloud Run or any container platform

Perfect for:
- Automated E2E testing workflows
- Visual regression testing
- Browser automation tasks
- AI-driven testing scenarios

### Breaking Changes
- None (initial release)

### Upgrade Guide
- None (initial release)

---

[1.0.0]: https://github.com/hummer98/e2e-mcp-server/releases/tag/v1.0.0
