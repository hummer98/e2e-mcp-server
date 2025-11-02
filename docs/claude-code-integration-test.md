# Claude Code Integration Test Guide

This guide provides step-by-step instructions for testing E2E MCP Server integration with Claude Code in a real environment.

## Prerequisites

- Claude Code installed and configured
- E2E MCP Server built and ready to run
- Node.js >= 20.0.0
- Example server command (`examples/server-command.js`)

## Test Setup

### 1. Build the Server

```bash
npm install
npm run build
```

### 2. Start the E2E MCP Server

In a terminal window, start the server:

```bash
npm start
```

Expected output:
```
Server started on port 3000
```

Verify the server is running:
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "activeSessions": 0,
  "memory": { ... },
  "uptime": 1.234,
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### 3. Configure Claude Code

Create or update your `.mcp.json` configuration file:

**For local HTTP server:**
```json
{
  "mcpServers": {
    "e2e-mcp": {
      "type": "http",
      "url": "http://localhost:3000/message",
      "transport": {
        "type": "streamable-http"
      }
    }
  }
}
```

**Location of .mcp.json:**
- macOS: `~/.config/claude-code/.mcp.json`
- Linux: `~/.config/claude-code/.mcp.json`
- Windows: `%APPDATA%\claude-code\.mcp.json`

### 4. Restart Claude Code

Restart Claude Code to load the new MCP server configuration.

## Test Scenarios

### Test 1: List Available Tools

**Objective:** Verify that Claude Code can connect to E2E MCP Server and list available tools.

**Steps:**
1. Open Claude Code
2. In the chat, ask: "What MCP tools are available?"
3. Verify that Claude Code lists the E2E MCP tools

**Expected Result:**
Claude Code should show the following tools:
- startSession
- stopSession
- getSessionStatus
- navigate
- click
- fill
- screenshot
- evaluate
- getContent
- readLogs

**Success Criteria:**
- [ ] All tools are listed
- [ ] No connection errors
- [ ] Tool descriptions are displayed

---

### Test 2: Start Development Server Session

**Objective:** Start a development server and create a browser session.

**Steps:**
1. In Claude Code, ask: "Start a new E2E test session using the example server command at `$(pwd)/examples/server-command.js`"
2. Verify that Claude Code calls the `startSession` tool
3. Check the server logs for session creation

**Expected Result:**
```json
{
  "sessionId": "uuid-here",
  "url": "http://localhost:3001",
  "port": 3001,
  "pid": 12345,
  "logs": {
    "stdout": "/tmp/e2e-mcp-logs/stdout-1234567890.log",
    "stderr": "/tmp/e2e-mcp-logs/stderr-1234567890.log",
    "combined": "/tmp/e2e-mcp-logs/combined-1234567890.log"
  }
}
```

**Success Criteria:**
- [ ] Session created successfully
- [ ] Server is running on the specified port
- [ ] Log files are created
- [ ] Session ID is returned
- [ ] Browser instance is created

**Verification:**
```bash
# Check if server is running
curl http://localhost:3001

# Check log files exist
ls /tmp/e2e-mcp-logs/
```

---

### Test 3: Playwright Operations - Navigate

**Objective:** Navigate to a URL using the session browser.

**Steps:**
1. Using the session ID from Test 2, ask: "Navigate to http://localhost:3001 in the session"
2. Verify that Claude Code calls the `navigate` tool

**Expected Result:**
Navigation completes successfully.

**Success Criteria:**
- [ ] Navigation succeeds
- [ ] No timeout errors
- [ ] Page loads completely

---

### Test 4: Playwright Operations - Click

**Objective:** Click an element on the page.

**Setup:** First navigate to a test page with a clickable button.

**Steps:**
1. Ask: "Click the button with selector '#test-button'"
2. Verify the click operation completes

**Expected Result:**
Click operation succeeds.

**Success Criteria:**
- [ ] Element is found
- [ ] Click completes without errors
- [ ] Page state changes as expected

---

### Test 5: Playwright Operations - Screenshot

**Objective:** Capture a screenshot of the current page.

**Steps:**
1. Ask: "Take a screenshot of the current page"
2. Verify that Claude Code calls the `screenshot` tool
3. Check that the screenshot data is returned

**Expected Result:**
```json
{
  "data": "base64-encoded-image-data",
  "path": "/tmp/screenshot-123.png"
}
```

**Success Criteria:**
- [ ] Screenshot is captured
- [ ] Base64 data is returned
- [ ] Image file is saved to disk
- [ ] Image is viewable

**Verification:**
Claude Code should display the screenshot or allow you to download it.

---

### Test 6: Error Handling - Element Not Found

**Objective:** Verify error handling when an element is not found.

**Steps:**
1. Ask: "Click the element with selector '#nonexistent-element'"
2. Verify error response includes screenshot and logs

**Expected Result:**
```json
{
  "type": "element_not_found",
  "selector": "#nonexistent-element",
  "screenshot": "base64-encoded-screenshot"
}
```

**Success Criteria:**
- [ ] Error is returned (not crash)
- [ ] Error includes element selector
- [ ] Screenshot of error state is included
- [ ] Error message is clear and actionable

---

### Test 7: Error Handling - Server Logs

**Objective:** Read server logs after an operation.

**Steps:**
1. Ask: "Read the combined logs from the session"
2. Verify that Claude Code calls the `readLogs` tool

**Expected Result:**
Server logs are returned with timestamps and messages.

**Success Criteria:**
- [ ] Logs are retrieved successfully
- [ ] Logs contain server startup messages
- [ ] Logs contain request history
- [ ] Log format is readable

---

### Test 8: Session Cleanup - Stop Session

**Objective:** Stop a development server and close the browser session.

**Steps:**
1. Ask: "Stop the E2E test session"
2. Verify that Claude Code calls the `stopSession` tool
3. Check that server process is terminated

**Expected Result:**
```json
{
  "status": "stopped",
  "message": "Server stopped successfully"
}
```

**Success Criteria:**
- [ ] Session is removed
- [ ] Server process is terminated
- [ ] Browser is closed
- [ ] Logs confirm shutdown

**Verification:**
```bash
# Server should not respond
curl http://localhost:3001
# Expected: Connection refused

# Session should not exist
# Ask Claude: "Get the status of the session"
# Expected: Session not found error
```

---

### Test 9: Multiple Concurrent Sessions

**Objective:** Verify that multiple sessions can run concurrently.

**Steps:**
1. Start two sessions with different ports
2. Perform operations in both sessions
3. Verify sessions are isolated
4. Stop both sessions

**Success Criteria:**
- [ ] Both sessions start successfully
- [ ] Different ports are allocated
- [ ] Operations in one session don't affect the other
- [ ] Both sessions can be stopped independently

---

### Test 10: Session Timeout

**Objective:** Verify automatic session cleanup after timeout period.

**Setup:** Configure SESSION_TIMEOUT to a short duration (e.g., 60 seconds) for testing.

**Steps:**
1. Start a session
2. Wait for timeout period without any activity
3. Verify session is automatically cleaned up

**Expected Result:**
Session is automatically removed after timeout.

**Success Criteria:**
- [ ] Session is active initially
- [ ] After timeout, session is removed
- [ ] Server process is terminated
- [ ] Browser is closed
- [ ] Logs show timeout cleanup

---

## Complete E2E Workflow Test

**Objective:** Execute a complete E2E test workflow from start to finish.

**Steps:**

1. **Start Session**
   ```
   Ask Claude: "Start an E2E test session using examples/server-command.js"
   ```

2. **Navigate to Test Page**
   ```
   Ask Claude: "Navigate to http://localhost:[PORT]"
   ```

3. **Interact with Page**
   ```
   Ask Claude: "Fill the input with selector '#username' with value 'testuser'"
   Ask Claude: "Click the button with selector '#submit'"
   ```

4. **Verify State**
   ```
   Ask Claude: "Get the page content"
   Ask Claude: "Take a screenshot"
   ```

5. **Check Logs**
   ```
   Ask Claude: "Read the server logs to verify the form submission"
   ```

6. **Cleanup**
   ```
   Ask Claude: "Stop the E2E test session"
   ```

**Success Criteria:**
- [ ] All steps complete without errors
- [ ] Page interactions work as expected
- [ ] Screenshots capture correct state
- [ ] Logs show all operations
- [ ] Session cleans up properly

---

## Troubleshooting

### Issue: Claude Code cannot connect to MCP server

**Solutions:**
1. Verify E2E MCP Server is running: `curl http://localhost:3000/health`
2. Check `.mcp.json` configuration is correct
3. Restart Claude Code
4. Check server logs for connection errors

### Issue: startSession fails with command not found

**Solutions:**
1. Verify the command path is absolute: `$(pwd)/examples/server-command.js`
2. Ensure the file has execute permissions: `chmod +x examples/server-command.js`
3. Check the command exists: `ls -l examples/server-command.js`

### Issue: Playwright operations timeout

**Solutions:**
1. Increase timeout values in tool arguments
2. Verify the target page is loaded
3. Check browser console for JavaScript errors
4. Use `getContent` to inspect current page state

### Issue: Session not cleaning up

**Solutions:**
1. Manually stop the session: Call `stopSession` tool
2. Kill the server process: `pkill -f server-command.js`
3. Clear state file: `rm /tmp/e2e-mcp-server-state.json`
4. Restart E2E MCP Server

---

## Test Results Template

Use this template to record your test results:

```markdown
# E2E MCP Server - Claude Code Integration Test Results

**Date:** YYYY-MM-DD
**Tester:** Your Name
**Environment:**
- OS: macOS/Linux/Windows
- Node.js: v20.x.x
- Claude Code: vX.X.X

## Test Results

| Test | Status | Notes |
|------|--------|-------|
| Test 1: List Tools | ✅ / ❌ | |
| Test 2: Start Session | ✅ / ❌ | |
| Test 3: Navigate | ✅ / ❌ | |
| Test 4: Click | ✅ / ❌ | |
| Test 5: Screenshot | ✅ / ❌ | |
| Test 6: Error Handling | ✅ / ❌ | |
| Test 7: Read Logs | ✅ / ❌ | |
| Test 8: Stop Session | ✅ / ❌ | |
| Test 9: Concurrent Sessions | ✅ / ❌ | |
| Test 10: Session Timeout | ✅ / ❌ | |
| Complete E2E Workflow | ✅ / ❌ | |

## Issues Found

1. [Issue description]
   - **Severity:** Critical / High / Medium / Low
   - **Steps to reproduce:**
   - **Expected result:**
   - **Actual result:**

## Overall Assessment

- **Total Tests:** 11
- **Passed:** X
- **Failed:** Y
- **Pass Rate:** Z%

## Recommendations

[Any recommendations for improvements]
```

---

## Next Steps

After completing these tests:

1. Document any issues found
2. Create bug reports for failures
3. Update documentation based on findings
4. Consider additional edge cases
5. Proceed to Test 13.2 (Real Development Server Testing)
