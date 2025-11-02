# MCPテストクライアント ユーザーガイド

MCPテストクライアントは、E2E MCP Serverをテストするためのインタラクティブなコマンドラインツールです。MCPツールを手動で実行し、サーバーの動作を検証できます。

## クイックスタート

### 1. E2E MCP Serverを起動

ターミナルで:
```bash
npm start
```

期待される出力:
```
Server started on port 3000
```

### 2. テストクライアントを実行

別のターミナルで:

**インタラクティブモード:**
```bash
npx tsx examples/test-client.ts
```

**デモモード (自動実行):**
```bash
npx tsx examples/test-client.ts --demo
```

## インタラクティブモード

### 利用可能なコマンド

| コマンド | 説明 | セッション必須 |
|---------|-------------|------------------|
| `list` | 利用可能なMCPツールを一覧表示 | No |
| `start` | 新しいE2Eテストセッションを開始 | No |
| `navigate` | URLに移動 | Yes |
| `screenshot` | スクリーンショットを取得 | Yes |
| `content` | 現在のページのHTMLコンテンツを取得 | Yes |
| `logs` | サーバーログを読み取り | Yes |
| `stop` | 現在のセッションを停止 | Yes |
| `demo` | 自動デモワークフローを実行 | No |
| `help` | ヘルプメッセージを表示 | No |
| `quit` | テストクライアントを終了 | No |

### 使用例

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

## デモモード

デモモードは、すべての主要機能を示す自動化されたワークフローを実行します:

```bash
npx tsx examples/test-client.ts --demo
```

### デモワークフロー

1. **セッション開始** - 新しいE2Eテストセッションを作成
2. **ナビゲーション** - テストサーバーURLに移動
3. **スクリーンショット** - ページのスクリーンショットを取得
4. **コンテンツ取得** - HTMLコンテンツを取得
5. **ログ読み取り** - サーバーログを表示
6. **セッション停止** - セッションをクリーンアップ

期待される出力:
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

## テストシナリオ

### テスト1: 基本的なセッション管理

```
start      # セッション作成
stop       # セッションのクリーンアップ
```

**成功条件:**
- セッションIDが返される
- サーバープロセスが利用可能なポートで起動する
- ログファイルが作成される
- セッションが完全にクリーンアップされる

### テスト2: Playwrightナビゲーション

```
start
navigate   # 入力: http://localhost:3001
content    # ページが読み込まれたことを確認
stop
```

**成功条件:**
- タイムアウトせずにナビゲーションが完了する
- ページコンテンツが取得される
- ログにエラーがない

### テスト3: スクリーンショット取得

```
start
navigate   # 入力: http://localhost:3001
screenshot # 現在のページをキャプチャ
stop
```

**成功条件:**
- スクリーンショットデータが返される (base64)
- 画像ファイルが保存される
- データサイズが妥当 (> 0バイト)

### テスト4: エラーハンドリング

```
start
screenshot # ナビゲーション前にスクリーンショットを試す
```

**期待される結果:**
エラーまたは空白のスクリーンショットで適切に処理される

### テスト5: ログ管理

```
start
navigate   # アクティビティを生成
logs       # ログを読み取り
stop
```

**成功条件:**
- ログにサーバー起動メッセージが含まれる
- ログにナビゲーションリクエストが表示される
- ログ形式がタイムスタンプ付きで読みやすい

## 高度な使い方

### カスタムサーバーURL

```bash
MCP_SERVER_URL=http://localhost:8080 npx tsx examples/test-client.ts
```

### エラーケースのテスト

1. **サーバーを起動せずに開始:**
   ```bash
   # MCPサーバーを起動しない
   npx tsx examples/test-client.ts
   ```
   期待: 接続エラー

2. **セッションなしでナビゲート:**
   ```
   navigate  # 'start'を先に呼ばずに
   ```
   期待: "No active session" エラー

3. **無効なURLへのナビゲーション:**
   ```
   start
   navigate  # 入力: invalid-url
   ```
   期待: 詳細を含むナビゲーションエラー

## トラブルシューティング

### 問題: "Connection failed"

**原因:** MCPサーバーが起動していないか、URLが間違っている

**解決方法:**
1. サーバーが起動していることを確認: `curl http://localhost:3000/health`
2. MCP_SERVER_URL環境変数を確認
3. サーバーログでエラーを確認

### 問題: "Failed to start session"

**考えられる原因:**
- サーバーコマンドパスが正しくない
- サーバーコマンドが実行可能でない
- ポートが既に使用中

**解決方法:**
1. サーバーコマンドが存在することを確認: `ls -l examples/server-command.js`
2. 実行権限を確認: `chmod +x examples/server-command.js`
3. サーバーコマンドで絶対パスを使用

### 問題: "Navigation timeout"

**考えられる原因:**
- ターゲットURLが応答していない
- ネットワークの問題
- サーバーが完全に起動していない

**解決方法:**
1. セッション開始後、数秒待つ
2. サーバーがアクセス可能か確認: `curl http://localhost:3001`
3. サーバーログでエラーを確認

### 問題: テストクライアントがハング

**解決方法:**
1. Ctrl+Cを押して終了
2. 手動でサーバーを停止: `pkill -f server-command.js`
3. 状態をクリア: `rm /tmp/e2e-mcp-server-state.json`
4. MCPサーバーを再起動

## CI/CDとの統合

自動化されたテストパイプラインでテストクライアントを使用できます:

```bash
#!/bin/bash

# MCPサーバーをバックグラウンドで起動
npm start &
MCP_PID=$!

# サーバーの準備完了を待つ
sleep 2

# デモモードを実行
npx tsx examples/test-client.ts --demo

EXIT_CODE=$?

# クリーンアップ
kill $MCP_PID

exit $EXIT_CODE
```

## 次のステップ

テストクライアントが動作することを確認した後:

1. すべてのMCPツールを手動でテスト
2. 見つかった問題を文書化
3. 実際の開発サーバー(Next.jsなど)でテスト
4. Claude Code統合テストに進む
5. Cloud Runにデプロイしてリモートテスト

## 関連ドキュメント

- [README.md](../README.md) - プロジェクト概要
- [claude-code-integration-test.md](../docs/claude-code-integration-test.md) - Claude Codeテストガイド
- [server-command.js](./server-command.js) - リファレンスサーバーコマンド実装
