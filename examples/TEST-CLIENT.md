# MCP Test Client User Guide

The MCP Test Client is an interactive command-line tool for testing the E2E MCP Server. It allows you to manually execute MCP tools and verify the server's behavior.

## Quick Start

### 1. Start the E2E MCP Server

In one terminal:
```bash
npm start
```

Expected output:
```
Server started on port 3000
```

### 2. Run the Test Client

In another terminal:

**Interactive Mode:**
```bash
npx tsx examples/test-client.ts
```

**Demo Mode (Automated):**
```bash
npx tsx examples/test-client.ts --demo
```

## Interactive Mode

### Available Commands

| Command | Description | Requires Session |
|---------|-------------|------------------|
| `list` | List all available MCP tools | No |
| `start` | Start a new E2E test session | No |
| `navigate` | Navigate to a URL | Yes |
| `screenshot` | Capture a screenshot | Yes |
| `content` | Get current page HTML content | Yes |
| `logs` | Read server logs | Yes |
| `stop` | Stop the current session | Yes |
| `demo` | Run automated demo workflow | No |
| `help` | Show help message | No |
| `quit` | Exit the test client | No |

### Example Session

```
$ npx tsx examples/test-client.ts

============================================================
  E2E MCP Server - Interactive Test Client
============================================================

🔌 Connecting to E2E MCP Server at http://localhost:3000...
✅ Connected successfully!

📋 Listing available tools...

✅ Found 10 tools:

1. startSession
2. stopSession
3. getSessionStatus
4. navigate
5. click
6. fill
7. screenshot
8. evaluate
9. getContent
10. readLogs

Enter command (or "help" for options): start

🚀 Starting a new E2E test session...
   Using server command: /path/to/examples/server-command.js

✅ Session started successfully!
   Session ID: abc-123-def-456
   URL: http://localhost:3001
   Port: 3001
   PID: 12345
   Logs: /tmp/e2e-mcp-logs/combined-1234567890.log

Enter command (or "help" for options): navigate
Enter URL: http://localhost:3001

🌐 Navigating to http://localhost:3001...
✅ Navigation successful!

Enter command (or "help" for options): screenshot

📸 Taking screenshot...
✅ Screenshot captured!
   Data size: 45678 bytes
   Saved to: /tmp/screenshot-123.png

Enter command (or "help" for options): content

📄 Getting page content...
✅ Content retrieved!
   Length: 523 characters
   Preview: <!DOCTYPE html><html><head><title>E2E Test Server</title></head><body>...

Enter command (or "help" for options): logs

📋 Reading server logs...
✅ Logs retrieved!

--- Last 20 lines ---
[2025-01-01T00:00:00.000Z] Server started at http://localhost:3001
[2025-01-01T00:00:01.000Z] GET /
[2025-01-01T00:00:02.000Z] GET /
--- End of logs ---

Enter command (or "help" for options): stop

🛑 Stopping session...
✅ Session stopped successfully!

Enter command (or "help" for options): quit

👋 Disconnecting from MCP server...
✅ Disconnected!
```

## Demo Mode

The demo mode runs an automated workflow that demonstrates all major features:

```bash
npx tsx examples/test-client.ts --demo
```

### Demo Workflow

1. **Start Session** - Creates a new E2E test session
2. **Navigate** - Navigates to the test server URL
3. **Screenshot** - Captures a screenshot of the page
4. **Get Content** - Retrieves the HTML content
5. **Read Logs** - Displays server logs
6. **Stop Session** - Cleans up the session

Expected output:
```
🎬 Running automated demo workflow...

Step 1/6: Starting session...
✅ Session started successfully!

Step 2/6: Navigating to server...
✅ Navigation successful!

Step 3/6: Taking screenshot...
✅ Screenshot captured!

Step 4/6: Getting page content...
✅ Content retrieved!

Step 5/6: Reading server logs...
✅ Logs retrieved!

Step 6/6: Stopping session...
✅ Session stopped successfully!

✅ Demo completed successfully!
```

## Testing Scenarios

### Test 1: Basic Session Management

```
start      # Create session
stop       # Cleanup session
```

**Success Criteria:**
- Session ID is returned
- Server process starts on available port
- Log files are created
- Session cleans up completely

### Test 2: Playwright Navigation

```
start
navigate   # Enter: http://localhost:3001
content    # Verify page loaded
stop
```

**Success Criteria:**
- Navigation completes without timeout
- Page content is retrieved
- No errors in logs

### Test 3: Screenshot Capture

```
start
navigate   # Enter: http://localhost:3001
screenshot # Capture current page
stop
```

**Success Criteria:**
- Screenshot data is returned (base64)
- Image file is saved
- Data size is reasonable (> 0 bytes)

### Test 4: Error Handling

```
start
screenshot # Try screenshot before navigation
```

**Expected Result:**
Should handle gracefully, possibly with error or blank screenshot

### Test 5: Log Management

```
start
navigate   # Generate some activity
logs       # Read logs
stop
```

**Success Criteria:**
- Logs contain server startup messages
- Logs show navigation requests
- Log format is readable with timestamps

## Advanced Usage

### Custom Server URL

```bash
MCP_SERVER_URL=http://localhost:8080 npx tsx examples/test-client.ts
```

### Testing Error Cases

1. **Start without server running:**
   ```bash
   # Don't start the MCP server
   npx tsx examples/test-client.ts
   ```
   Expected: Connection error

2. **Navigate without session:**
   ```
   navigate  # Without calling 'start' first
   ```
   Expected: "No active session" error

3. **Invalid URL navigation:**
   ```
   start
   navigate  # Enter: invalid-url
   ```
   Expected: Navigation error with details

## Troubleshooting

### Issue: "Connection failed"

**Cause:** MCP Server is not running or wrong URL

**Solution:**
1. Verify server is running: `curl http://localhost:3000/health`
2. Check MCP_SERVER_URL environment variable
3. Review server logs for errors

### Issue: "Failed to start session"

**Possible Causes:**
- Server command path is incorrect
- Server command is not executable
- Port is already in use

**Solution:**
1. Verify server command exists: `ls -l examples/server-command.js`
2. Check execute permissions: `chmod +x examples/server-command.js`
3. Use absolute path in server command

### Issue: "Navigation timeout"

**Possible Causes:**
- Target URL is not responding
- Network issues
- Server not fully started

**Solution:**
1. Wait a few seconds after starting session
2. Verify server is accessible: `curl http://localhost:3001`
3. Check server logs for errors

### Issue: Test client hangs

**Solution:**
1. Press Ctrl+C to exit
2. Manually stop server: `pkill -f server-command.js`
3. Clear state: `rm /tmp/e2e-mcp-server-state.json`
4. Restart MCP server

## Integration with CI/CD

You can use the test client in automated testing pipelines:

```bash
#!/bin/bash

# Start MCP server in background
npm start &
MCP_PID=$!

# Wait for server to be ready
sleep 2

# Run demo mode
npx tsx examples/test-client.ts --demo

EXIT_CODE=$?

# Cleanup
kill $MCP_PID

exit $EXIT_CODE
```

## Next Steps

After verifying the test client works:

1. Test all MCP tools manually
2. Document any issues found
3. Test with real development servers (Next.js, etc.)
4. Proceed to Claude Code integration testing
5. Deploy to Cloud Run and test remotely

## Related Documentation

- [README.md](../README.md) - Project overview
- [claude-code-integration-test.md](../docs/claude-code-integration-test.md) - Claude Code testing guide
- [server-command.js](./server-command.js) - Reference server command implementation
