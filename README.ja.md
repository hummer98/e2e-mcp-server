# E2E MCP Server

[![npm version](https://badge.fury.io/js/e2e-mcp-server.svg)](https://badge.fury.io/js/e2e-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)

開発サーバー管理とPlaywright自動化を統合したE2Eテスト用のMCP (Model Context Protocol) サーバー。

**Claude CodeなどのAIエージェントがブラウザテストワークフローを自動化するのに最適です！**

## 特徴

- **統合サーバー管理**: 開発サーバーの起動、監視、自動シャットダウン
- **Playwright自動化**: MCPツール経由でブラウザ自動化タスクを実行
- **AIエージェントフレンドリー**: AI駆動のE2Eテストワークフロー専用設計
- **エラーハンドリング**: 失敗時の自動スクリーンショット取得とログ収集
- **セッション管理**: 自動クリーンアップ付きの分離されたブラウザセッション
- **クラウド対応**: Google Cloud Runまたは任意のコンテナプラットフォームへのデプロイ

## 目次

- [要件](#要件)
- [インストール](#インストール)
- [クイックスタート](#クイックスタート)
- [使い方](#使い方)
- [MCPツール](#mcpツール)
- [サーバー起動コマンドインターフェース](#サーバー起動コマンドインターフェース)
- [環境変数](#環境変数)
- [開発](#開発)
- [デプロイ](#デプロイ)
- [セキュリティ](#セキュリティに関する考慮事項)
- [アーキテクチャ](#アーキテクチャ)
- [ライセンス](#ライセンス)

## 要件

- Node.js >= 20.0.0
- 開発サーバー起動コマンド (Node.js、Bashなど)

## インストール

npmを使用してグローバルインストール:

```bash
npm install -g e2e-mcp-server
```

または、プロジェクトの開発依存関係としてインストール:

```bash
npm install --save-dev e2e-mcp-server
```

## クイックスタート

1. Claude Codeの設定ファイル (`.mcp.json`) に追加:

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

2. Claude Codeを再起動

3. E2Eテスト用の10個の強力なツールが自動的に利用可能になります！

## 使い方

### MCPサーバーとして使用 (推奨: stdioモード)

Claude Codeの `.mcp.json` に設定:

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

**Claude Codeが必要に応じてMCPサーバーを自動的に起動します。手動でサーバーを起動する必要はありません！**

### 代替方法: HTTPモード (リモートサーバー用)

HTTPサーバーを起動:

```bash
npm start
```

`.mcp.json` に設定:

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

開発用:

```bash
npm run dev
```

### サーバーのテスト (インタラクティブ)

付属のテストクライアントを使用してサーバーの動作を確認:

```bash
# 1つ目のターミナルでサーバーを起動
npm start

# 別のターミナルでテストクライアントを実行
npx tsx examples/test-client.ts

# または自動デモを実行
npx tsx examples/test-client.ts --demo
```

詳細は [examples/TEST-CLIENT.md](examples/TEST-CLIENT.md) を参照してください。

## 環境変数

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `PORT` | サーバーポート | `3000` |
| `NODE_ENV` | 環境 (development/production) | `development` |
| `LOG_LEVEL` | ログレベル (debug/info/warn/error) | `info` |
| `SESSION_TIMEOUT` | セッションタイムアウト (ミリ秒) | `600000` (10分) |
| `SERVER_COMMAND_PATH` | 許可されるサーバー起動コマンドパス (セキュリティ) | - |
| `ALLOWED_HOSTS` | カンマ区切りの許可されたナビゲーションホスト | - |

## MCPツール

### セッション管理

#### startSession
開発サーバーを起動し、ブラウザセッションを作成します。

```json
{
  "name": "startSession",
  "arguments": {
    "commandPath": "/path/to/start-server.sh",
    "args": ["--port", "3001"]
  }
}
```

**レスポンス:**
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
開発サーバーを停止し、ブラウザセッションを閉じます。

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
開発サーバーのステータスを取得します。

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

### Playwright操作

#### navigate
セッションブラウザでURLに移動します。

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
ページ上の要素をクリックします。

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
テキスト入力フィールドに入力します。

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
現在のページのスクリーンショットを取得します。

```json
{
  "name": "screenshot",
  "arguments": {
    "sessionId": "uuid",
    "fullPage": false
  }
}
```

**レスポンス:**
```json
{
  "data": "base64-encoded-image-data",
  "path": "/tmp/screenshot-123.png"
}
```

#### evaluate
ページコンテキストでJavaScriptを実行します。

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
現在のページのHTMLコンテンツを取得します。

```json
{
  "name": "getContent",
  "arguments": {
    "sessionId": "uuid"
  }
}
```

### ログ管理

#### readLogs
セッションからサーバーログを読み取ります。

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

## サーバー起動コマンドインターフェース

開発サーバー起動コマンドは、以下の形式でstdoutにJSONを出力する必要があります:

### 起動コマンド (`--start`)

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

### ステータスコマンド (`--status`)

```json
{
  "status": "running",
  "url": "http://localhost:3001",
  "uptime": 12345,
  "healthy": true
}
```

### シャットダウンコマンド (`--shutdown`)

```json
{
  "status": "stopped",
  "message": "Server stopped successfully"
}
```

### 実装例 (Node.js)

完全なリファレンス実装については、[examples/server-command.cjs](./examples/server-command.cjs) を参照してください。

## 開発

### クローンとセットアップ

```bash
git clone https://github.com/hummer98/e2e-mcp-server.git
cd e2e-mcp-server
npm install
npm run build
```

### テスト実行

```bash
npm test
```

### カバレッジ付きテスト実行

```bash
npm run test:coverage
```

### Lint

```bash
npm run lint
npm run lint:fix
```

### ウォッチモードでのローカル開発

```bash
npm run dev
```

## デプロイ

### Google Cloud Run

1. Dockerイメージをビルド:
```bash
docker build -t gcr.io/PROJECT_ID/e2e-mcp-server .
```

2. Container Registryにプッシュ:
```bash
docker push gcr.io/PROJECT_ID/e2e-mcp-server
```

3. Cloud Runにデプロイ:
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

または Cloud Build を使用:
```bash
gcloud builds submit --config cloudbuild.yaml
```

### 本番環境用の環境変数

Cloud Run設定でこれらを設定:

```bash
NODE_ENV=production
LOG_LEVEL=info
SESSION_TIMEOUT=600000
SERVER_COMMAND_PATH=/app/scripts/start-server.sh
ALLOWED_HOSTS=localhost,*.yourdomain.com
```

## セキュリティに関する考慮事項

- **コマンドインジェクション**: `SERVER_COMMAND_PATH`を設定して許可されるサーバーコマンドをホワイトリスト化
- **SSRF保護**: `ALLOWED_HOSTS`を設定してナビゲーション先を制限
- **レート制限**: DoS攻撃を防ぐための組み込みレート制限
- **認証**: 本番デプロイメント向けのOAuth 2.1サポートを計画中

## アーキテクチャ

```
┌─────────────────┐
│  AIエージェント  │
│  (Claude Code)  │
└────────┬────────┘
         │ MCPプロトコル (stdio または HTTP)
         ↓
┌─────────────────┐
│  E2E MCPサーバー │
│  ┌───────────┐  │
│  │ セッション │  │
│  │ マネージャ │  │
│  └─────┬─────┘  │
│        │        │
│  ┌─────┴─────┐  │
│  │Playwright │  │
│  │ブラウザ   │  │
│  └───────────┘  │
└────────┬────────┘
         │ 実行
         ↓
┌─────────────────┐
│  開発サーバー    │
│  (Next.js等)    │
└─────────────────┘
```

### 利用可能なツール

MCPサーバーは10個の強力なツールを提供します:

1. **startSession** - 開発サーバーを起動してブラウザセッションを作成
2. **stopSession** - 開発サーバーを停止してブラウザを閉じる
3. **getSessionStatus** - サーバーステータスを取得
4. **navigate** - URLに移動
5. **click** - 要素をクリック
6. **fill** - フォーム入力に入力
7. **screenshot** - スクリーンショットを取得
8. **evaluate** - JavaScriptを実行
9. **getContent** - ページのHTMLを取得
10. **readLogs** - サーバーログを読み取り

## npmへの公開

このパッケージをnpmに公開するには:

```bash
# パッケージをビルド
npm run build

# npmにログイン (初回のみ)
npm login

# 公開 (初回または更新時)
npm publish

# またはスコープ付きパッケージの場合はpublicアクセスで公開
npm publish --access public
```

公開前に以下を確認してください:
1. `package.json`のバージョンを更新
2. `CHANGELOG.md`を更新
3. リポジトリURLを実際のリポジトリに更新
4. `npm pack`でパッケージをローカルテスト

## ライセンス

MIT

## コントリビューション

コントリビューションを歓迎します！以下の手順に従ってください:

1. リポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを開く

## サポート

- Issues: https://github.com/hummer98/e2e-mcp-server/issues
- Documentation: https://github.com/hummer98/e2e-mcp-server#readme
