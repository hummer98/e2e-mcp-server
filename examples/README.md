# Server Command Examples

This directory contains reference implementations for development server startup commands that integrate with E2E MCP Server.

## server-command.js

A complete Node.js implementation demonstrating all required features:

- Dynamic port allocation
- Log file management
- JSON output to stdout
- Support for --start, --status, --restart, --shutdown

### Usage

Start the server:
```bash
node examples/server-command.js --start
```

Check status:
```bash
node examples/server-command.js --status
```

Restart:
```bash
node examples/server-command.js --restart
```

Shutdown:
```bash
node examples/server-command.js --shutdown
```

### Output Format

#### Start (--start)

```json
{
  "status": "ready",
  "url": "http://localhost:3001",
  "port": 3001,
  "pid": 12345,
  "startedAt": "2025-01-01T00:00:00.000Z",
  "logs": {
    "stdout": "/tmp/e2e-mcp-logs/stdout-1234567890.log",
    "stderr": "/tmp/e2e-mcp-logs/stderr-1234567890.log",
    "combined": "/tmp/e2e-mcp-logs/combined-1234567890.log"
  },
  "message": "Server started successfully"
}
```

#### Status (--status)

```json
{
  "status": "running",
  "url": "http://localhost:3001",
  "port": 3001,
  "pid": 12345,
  "uptime": 12345,
  "healthy": true
}
```

#### Shutdown (--shutdown)

```json
{
  "status": "stopped",
  "message": "Server stopped successfully"
}
```

## Integration with E2E MCP Server

Use the server command with E2E MCP Server's `startSession` tool:

```json
{
  "name": "startSession",
  "arguments": {
    "commandPath": "/absolute/path/to/examples/server-command.js",
    "args": ["--start"]
  }
}
```

## Creating Your Own Server Command

### Requirements

1. **Output JSON to stdout** - E2E MCP Server parses stdout to extract server information
2. **Support required options** - Implement --start, --status, and --shutdown at minimum
3. **Dynamic port allocation** - Find an available port automatically
4. **Create log files** - Provide paths to stdout, stderr, and combined logs
5. **Exit codes** - Return 0 for success, non-zero for errors

### Bash Example

```bash
#!/bin/bash

case "$1" in
  --start)
    # Find available port
    PORT=$(python3 -c 'import socket; s=socket.socket(); s.bind(("", 0)); print(s.getsockname()[1]); s.close()')

    # Create log files
    LOG_DIR="/tmp/my-server-logs"
    mkdir -p "$LOG_DIR"
    TIMESTAMP=$(date +%s)
    STDOUT_LOG="$LOG_DIR/stdout-$TIMESTAMP.log"
    STDERR_LOG="$LOG_DIR/stderr-$TIMESTAMP.log"
    COMBINED_LOG="$LOG_DIR/combined-$TIMESTAMP.log"

    # Start your server
    my-dev-server --port $PORT > "$STDOUT_LOG" 2> "$STDERR_LOG" &
    PID=$!

    # Save PID for later
    echo $PID > /tmp/my-server.pid

    # Output JSON
    cat <<EOF
{
  "status": "ready",
  "url": "http://localhost:$PORT",
  "port": $PORT,
  "pid": $PID,
  "startedAt": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")",
  "logs": {
    "stdout": "$STDOUT_LOG",
    "stderr": "$STDERR_LOG",
    "combined": "$COMBINED_LOG"
  },
  "message": "Server started successfully"
}
EOF
    ;;

  --status)
    if [ -f /tmp/my-server.pid ]; then
      PID=$(cat /tmp/my-server.pid)
      if ps -p $PID > /dev/null; then
        echo '{"status":"running","healthy":true}'
      else
        echo '{"status":"stopped"}'
      fi
    else
      echo '{"status":"stopped"}'
    fi
    ;;

  --shutdown)
    if [ -f /tmp/my-server.pid ]; then
      PID=$(cat /tmp/my-server.pid)
      kill $PID
      rm /tmp/my-server.pid
      echo '{"status":"stopped","message":"Server stopped successfully"}'
    else
      echo '{"status":"stopped","message":"Server is not running"}'
    fi
    ;;
esac
```

### Python Example

```python
#!/usr/bin/env python3

import sys
import json
import socket
import subprocess
import os
from datetime import datetime

def find_available_port(start_port=3000):
    """Find an available port starting from start_port"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        return s.getsockname()[1]

def start_server():
    port = find_available_port()
    timestamp = int(datetime.now().timestamp())
    log_dir = "/tmp/my-server-logs"
    os.makedirs(log_dir, exist_ok=True)

    stdout_log = f"{log_dir}/stdout-{timestamp}.log"
    stderr_log = f"{log_dir}/stderr-{timestamp}.log"
    combined_log = f"{log_dir}/combined-{timestamp}.log"

    # Start your server process
    with open(stdout_log, 'w') as stdout_f, open(stderr_log, 'w') as stderr_f:
        proc = subprocess.Popen(
            ['my-dev-server', '--port', str(port)],
            stdout=stdout_f,
            stderr=stderr_f
        )

    # Save PID
    with open('/tmp/my-server.pid', 'w') as f:
        f.write(str(proc.pid))

    # Output JSON
    print(json.dumps({
        'status': 'ready',
        'url': f'http://localhost:{port}',
        'port': port,
        'pid': proc.pid,
        'startedAt': datetime.utcnow().isoformat() + 'Z',
        'logs': {
            'stdout': stdout_log,
            'stderr': stderr_log,
            'combined': combined_log
        },
        'message': 'Server started successfully'
    }))

def get_status():
    # Implementation similar to bash example
    pass

def shutdown_server():
    # Implementation similar to bash example
    pass

if __name__ == '__main__':
    command = sys.argv[1] if len(sys.argv) > 1 else None

    if command == '--start':
        start_server()
    elif command == '--status':
        get_status()
    elif command == '--shutdown':
        shutdown_server()
    else:
        print(json.dumps({'status': 'error', 'message': f'Unknown command: {command}'}))
        sys.exit(1)
```

## Testing Your Server Command

Test the command manually before integrating with E2E MCP Server:

```bash
# Start
node your-server-command.js --start

# Verify JSON output contains required fields
# - status: "ready"
# - url, port, pid, startedAt
# - logs.stdout, logs.stderr, logs.combined

# Check status
node your-server-command.js --status

# Verify server is responding
curl http://localhost:PORT

# Shutdown
node your-server-command.js --shutdown
```
