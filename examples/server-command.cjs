#!/usr/bin/env node

/**
 * Reference implementation of a development server startup command
 * for E2E MCP Server integration.
 *
 * This script demonstrates how to implement a server command that:
 * - Supports --start, --restart, --status, --shutdown options
 * - Allocates ports dynamically
 * - Creates and manages log files
 * - Outputs JSON responses to stdout
 *
 * Usage:
 *   node server-command.js --start
 *   node server-command.js --status
 *   node server-command.js --restart
 *   node server-command.js --shutdown
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const STATE_FILE = path.join(os.tmpdir(), 'e2e-mcp-server-state.json');
const LOG_DIR = path.join(os.tmpdir(), 'e2e-mcp-logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Find an available port
 */
function findAvailablePort(startPort = 3000) {
  return new Promise((resolve, reject) => {
    const server = http.createServer();

    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(findAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Load server state from file
 */
function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    const content = fs.readFileSync(STATE_FILE, 'utf8');
    return JSON.parse(content);
  }
  return null;
}

/**
 * Save server state to file
 */
function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Delete server state file
 */
function clearState() {
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
  }
}

/**
 * Create log file paths
 */
function createLogPaths(timestamp) {
  return {
    stdout: path.join(LOG_DIR, `stdout-${timestamp}.log`),
    stderr: path.join(LOG_DIR, `stderr-${timestamp}.log`),
    combined: path.join(LOG_DIR, `combined-${timestamp}.log`)
  };
}

/**
 * Write to log files
 */
function writeLog(logs, message, isError = false) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;

  fs.appendFileSync(logs.combined, logEntry);

  if (isError) {
    fs.appendFileSync(logs.stderr, logEntry);
  } else {
    fs.appendFileSync(logs.stdout, logEntry);
  }
}

/**
 * Start the development server
 */
async function startServer() {
  const state = loadState();

  if (state && state.server) {
    // Server already running
    console.log(JSON.stringify({
      status: 'error',
      message: 'Server is already running',
      existingServer: {
        url: state.url,
        port: state.port,
        pid: state.pid
      }
    }));
    process.exit(1);
  }

  const port = await findAvailablePort(3001);
  const timestamp = Date.now();
  const logs = createLogPaths(timestamp);

  // Create log files
  fs.writeFileSync(logs.stdout, '');
  fs.writeFileSync(logs.stderr, '');
  fs.writeFileSync(logs.combined, '');

  // Create HTTP server
  const server = http.createServer((req, res) => {
    writeLog(logs, `${req.method} ${req.url}`);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'E2E Test Server',
      timestamp: new Date().toISOString(),
      path: req.url
    }));
  });

  server.listen(port, () => {
    const startedAt = new Date().toISOString();
    const url = `http://localhost:${port}`;

    writeLog(logs, `Server started at ${url}`);

    const serverState = {
      url,
      port,
      pid: process.pid,
      startedAt,
      logs,
      server: true
    };

    saveState(serverState);

    // Output JSON to stdout (for E2E MCP Server)
    console.log(JSON.stringify({
      status: 'ready',
      url,
      port,
      pid: process.pid,
      startedAt,
      logs,
      message: 'Server started successfully'
    }));

    // Keep process alive
    process.on('SIGTERM', async () => {
      writeLog(logs, 'Received SIGTERM, shutting down gracefully');
      server.close(() => {
        clearState();
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      writeLog(logs, 'Received SIGINT, shutting down gracefully');
      server.close(() => {
        clearState();
        process.exit(0);
      });
    });
  });

  server.on('error', (err) => {
    writeLog(logs, `Server error: ${err.message}`, true);

    console.log(JSON.stringify({
      status: 'error',
      message: `Failed to start server: ${err.message}`,
      error: err.message
    }));

    process.exit(1);
  });
}

/**
 * Get server status
 */
function getStatus() {
  const state = loadState();

  if (!state || !state.server) {
    console.log(JSON.stringify({
      status: 'stopped',
      message: 'Server is not running'
    }));
    return;
  }

  const uptime = Date.now() - new Date(state.startedAt).getTime();

  // Check if server is actually responsive
  http.get(state.url, (res) => {
    const healthy = res.statusCode === 200;

    console.log(JSON.stringify({
      status: healthy ? 'running' : 'unhealthy',
      url: state.url,
      port: state.port,
      pid: state.pid,
      uptime,
      healthy
    }));
  }).on('error', () => {
    console.log(JSON.stringify({
      status: 'stopped',
      message: 'Server process exists but is not responsive',
      uptime
    }));

    // Clean up stale state
    clearState();
  });
}

/**
 * Restart the server
 */
async function restartServer() {
  const state = loadState();

  if (state && state.server) {
    // Stop existing server
    try {
      process.kill(state.pid, 'SIGTERM');

      // Wait for server to stop
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      // Process might already be dead
      console.error('Warning: Could not kill existing process:', err.message);
    }

    clearState();
  }

  // Start new server
  await startServer();
}

/**
 * Shutdown the server
 */
function shutdownServer() {
  const state = loadState();

  if (!state || !state.server) {
    console.log(JSON.stringify({
      status: 'stopped',
      message: 'Server is not running'
    }));
    return;
  }

  try {
    writeLog(state.logs, 'Shutting down server');
    process.kill(state.pid, 'SIGTERM');

    clearState();

    console.log(JSON.stringify({
      status: 'stopped',
      message: 'Server stopped successfully'
    }));
  } catch (err) {
    console.log(JSON.stringify({
      status: 'error',
      message: `Failed to stop server: ${err.message}`,
      error: err.message
    }));

    // Clean up state anyway
    clearState();
    process.exit(1);
  }
}

/**
 * Main entry point
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case '--start':
      startServer().catch(err => {
        console.error(JSON.stringify({
          status: 'error',
          message: err.message
        }));
        process.exit(1);
      });
      break;

    case '--status':
      getStatus();
      break;

    case '--restart':
      restartServer().catch(err => {
        console.error(JSON.stringify({
          status: 'error',
          message: err.message
        }));
        process.exit(1);
      });
      break;

    case '--shutdown':
      shutdownServer();
      break;

    default:
      console.error(JSON.stringify({
        status: 'error',
        message: `Unknown command: ${command}`,
        usage: 'node server-command.js [--start|--status|--restart|--shutdown]'
      }));
      process.exit(1);
  }
}

main();
