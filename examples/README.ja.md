# サーバーコマンドの実装例

このディレクトリには、E2E MCP Serverと連携する開発サーバー起動コマンドのリファレンス実装が含まれています。

## server-command.js

すべての必須機能を実装したNode.jsの完全な実装例:

- 動的ポート割り当て
- ログファイル管理
- stdoutへのJSON出力
- --start, --status, --restart, --shutdownのサポート

### 使い方

サーバーを起動:
```bash
node examples/server-command.js --start
```

ステータス確認:
```bash
node examples/server-command.js --status
```

再起動:
```bash
node examples/server-command.js --restart
```

シャットダウン:
```bash
node examples/server-command.js --shutdown
```

### 出力形式

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

## E2E MCP Serverとの連携

E2E MCP Serverの`startSession`ツールでサーバーコマンドを使用します:

```json
{
  "name": "startSession",
  "arguments": {
    "commandPath": "/absolute/path/to/examples/server-command.js",
    "args": ["--start"]
  }
}
```

## 独自のサーバーコマンドを作成する

### 要件

1. **stdoutにJSONを出力** - E2E MCP Serverはstdoutをパースしてサーバー情報を取得します
2. **必須オプションのサポート** - 最低限 --start, --status, --shutdownを実装してください
3. **動的ポート割り当て** - 利用可能なポートを自動的に見つけます
4. **ログファイルの作成** - stdout、stderr、combinedログへのパスを提供します
5. **終了コード** - 成功時は0、エラー時は0以外を返します

### Bashの例

```bash
#!/bin/bash

case "$1" in
  --start)
    # 利用可能なポートを検索
    PORT=$(python3 -c 'import socket; s=socket.socket(); s.bind(("", 0)); print(s.getsockname()[1]); s.close()')

    # ログファイルを作成
    LOG_DIR="/tmp/my-server-logs"
    mkdir -p "$LOG_DIR"
    TIMESTAMP=$(date +%s)
    STDOUT_LOG="$LOG_DIR/stdout-$TIMESTAMP.log"
    STDERR_LOG="$LOG_DIR/stderr-$TIMESTAMP.log"
    COMBINED_LOG="$LOG_DIR/combined-$TIMESTAMP.log"

    # サーバーを起動
    my-dev-server --port $PORT > "$STDOUT_LOG" 2> "$STDERR_LOG" &
    PID=$!

    # PIDを保存
    echo $PID > /tmp/my-server.pid

    # JSONを出力
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

### Pythonの例

```python
#!/usr/bin/env python3

import sys
import json
import socket
import subprocess
import os
from datetime import datetime

def find_available_port(start_port=3000):
    """start_portから利用可能なポートを検索"""
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

    # サーバープロセスを起動
    with open(stdout_log, 'w') as stdout_f, open(stderr_log, 'w') as stderr_f:
        proc = subprocess.Popen(
            ['my-dev-server', '--port', str(port)],
            stdout=stdout_f,
            stderr=stderr_f
        )

    # PIDを保存
    with open('/tmp/my-server.pid', 'w') as f:
        f.write(str(proc.pid))

    # JSONを出力
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
    # Bashの例と同様の実装
    pass

def shutdown_server():
    # Bashの例と同様の実装
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

## サーバーコマンドのテスト

E2E MCP Serverと統合する前に、コマンドを手動でテストしてください:

```bash
# 起動
node your-server-command.js --start

# JSON出力に必須フィールドが含まれていることを確認
# - status: "ready"
# - url, port, pid, startedAt
# - logs.stdout, logs.stderr, logs.combined

# ステータス確認
node your-server-command.js --status

# サーバーが応答することを確認
curl http://localhost:PORT

# シャットダウン
node your-server-command.js --shutdown
```
