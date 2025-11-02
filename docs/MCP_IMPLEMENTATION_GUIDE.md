# MCP サーバー実装ガイド

このドキュメントは、Model Context Protocol (MCP) サーバーを構築する際の実装ナレッジ、試行錯誤の記録、参照資料をまとめたものです。

## 目次

- [概要](#概要)
- [重要な技術的決定事項](#重要な技術的決定事項)
- [実装の試行錯誤と解決策](#実装の試行錯誤と解決策)
- [参照資料とサンプル](#参照資料とサンプル)
- [ベストプラクティス](#ベストプラクティス)
- [トラブルシューティング](#トラブルシューティング)

---

## 概要

### Model Context Protocol (MCP) とは

**MCP**は、Anthropic社が2024年11月に発表したAIエージェントとツール・データソースを接続するための**オープン標準規格**です。

**キーポイント**:
- **標準プロトコル**: JSON-RPC 2.0ベース
- **公式SDK**: `@modelcontextprotocol/sdk` (TypeScript, Python等)
- **業界採用**: OpenAI (ChatGPT Desktop)、Google (Gemini) が正式採用
- **トランスポート**: stdio、Streamable HTTP
- **認証**: OAuth 2.1標準

### なぜMCPを採用すべきか

1. **標準準拠**: 独自プロトコルではなく、業界標準に準拠
2. **相互運用性**: Claude Code、ChatGPT、Geminiなど複数のAIクライアントから利用可能
3. **将来性**: Anthropicが積極的にメンテナンス、OpenAI/Googleも採用
4. **公式SDKサポート**: 型安全性、ドキュメント、サンプルコードが充実

---

## 重要な技術的決定事項

### 1. トランスポート選択: Streamable HTTP vs HTTP+SSE

**結論**: **Streamable HTTPを採用** (MCP SDK 1.10.0以降)

**重要な歴史的経緯**:
- **2024年11月**: MCP発表時は`HTTP+SSE` transportを採用
- **2025年3月26日**: MCP仕様更新（2025-03-26版）で`HTTP+SSE`が非推奨となり、**Streamable HTTP**が正式採用
- **2025年4月17日**: MCP SDK 1.10.0で`StreamableHTTPServerTransport`が追加

**選択理由**:
- ✅ HTTP+SSEは近い将来完全に非推奨となる予定
- ✅ Streamable HTTPが現在の推奨トランスポート
- ✅ Cloud Run環境で動作する（stdioは使用不可）
- ✅ 単一HTTPエンドポイントで双方向通信が可能

**注意**: 古い記事やドキュメントでは`SSEServerTransport`を使用した例が多いが、**これらは既に非推奨**です。

### 2. エンドポイント命名: `/message` vs `/sse`

**結論**: **`/message`を採用** (MCP標準エンドポイント)

**理由**:
- MCP公式サンプルでは`/message`または`/mcp`を使用
- `/sse`は旧HTTP+SSE transportの名残で、Streamable HTTPでは不適切
- Claude Code、ChatGPT等のクライアントは標準的に`/message`を期待

### 3. セッション管理: ステートフル vs ステートレス

**結論**: **ステートレスサーバー** (`sessionIdGenerator: undefined`)

**理由**:
- MCPサーバー自体はステートレス（セッション管理不要）
- 実際のセッション管理はWebSocket層（Socket.IO）で行う
- Cloud Runのスケーラビリティを最大限活用

**実装例**:
```typescript
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined, // Stateless server
});
```

---

## 実装の試行錯誤と解決策

### 試行錯誤 1: SSEServerTransport から StreamableHTTPServerTransport への移行

**問題**: 初期実装で`SSEServerTransport`を使用していたが、MCP仕様更新により非推奨となった。

**試行錯誤の過程**:

1. **最初の試み**: `SSEServerTransport`をそのまま`StreamableHTTPServerTransport`に置き換え
   ```typescript
   // ❌ 間違い: コンストラクタ引数が異なる
   const transport = new StreamableHTTPServerTransport('/message', res);
   ```
   **エラー**: `Expected 1 arguments, but got 2.`

2. **次の試み**: Responseオブジェクトのみを渡す
   ```typescript
   // ❌ 間違い: オプションオブジェクトが必要
   const transport = new StreamableHTTPServerTransport(res);
   ```
   **エラー**: `Property 'sessionIdGenerator' is missing`

3. **正解**: オプションオブジェクトを渡す
   ```typescript
   // ✅ 正しい
   const transport = new StreamableHTTPServerTransport({
     sessionIdGenerator: undefined
   });
   ```

**解決策**:

**ポイント**: `StreamableHTTPServerTransport`は**リクエストごとに作成するのではなく**、サーバー起動時に1回だけ作成し、`handleRequest`メソッドで各リクエストを処理する。

**正しい実装パターン**:
```typescript
// サーバー起動時に1回だけ作成
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
});

// MCPサーバーと接続
server.connect(transport);

// Expressエンドポイント
app.post('/message', async (req, res) => {
  await transport.handleRequest(req, res, req.body);
});
```

**参考にした資料**:
- [Qiita: MCP の TypeScript SDK で Streamable HTTP transport対応の自作MCPサーバーを作って VS Code（GitHub Copilot）から使う](https://qiita.com/youtoy/items/f3d3f75e1731b1ba1b89)
- [Koyeb: Deploy Remote MCP Servers using Streamable HTTP Transport](https://www.koyeb.com/tutorials/deploy-remote-mcp-servers-to-koyeb-using-streamable-http-transport)

### 試行錯誤 2: Claude CLI からの MCP 接続

**問題**: `.mcp.json`の設定方法が不明で、Claude CLIから接続できなかった。

**試行錯誤の過程**:

1. **最初の試み**: SSE transport用の設定
   ```json
   {
     "mcpServers": {
       "line-miniapp-e2e-test": {
         "url": "https://mcp-server-xxx.run.app",
         "transport": "sse"
       }
     }
   }
   ```
   **結果**: Claude CLIがスキーマエラーを返す

2. **次の試み**: プロキシコマンド方式
   ```json
   {
     "mcpServers": {
       "line-miniapp-e2e-test": {
         "command": "npx",
         "args": ["@modelcontextprotocol/server-sse", "https://..."]
       }
     }
   }
   ```
   **結果**: `Failed to connect` エラー

3. **調査結果**: Claude CLI は `--transport http` オプションでStreamable HTTPをサポート
   ```bash
   claude mcp add --transport http line-miniapp-e2e-test https://mcp-server-xxx.run.app
   ```

**解決策**:

**Claude CLI での設定方法**:
```bash
# コマンドラインから追加
claude mcp add --transport http my-server https://your-server.com

# または .mcp.json を手動編集
{
  "mcpServers": {
    "my-server": {
      "type": "http",
      "url": "https://your-server.com"
    }
  }
}
```

**参考にした資料**:
- [Claude Code Documentation: Connect Claude Code to tools via MCP](https://docs.claude.com/en/docs/claude-code/mcp)
- Web検索: "claude cli mcp http sse streamable transport configuration 2025"

### 試行錯誤 3: TypeScript 型エラー (`StreamableHttpServerTransport` vs `StreamableHTTPServerTransport`)

**問題**: import時の型名が間違っており、TypeScriptコンパイルエラーが発生。

**エラー**:
```
error TS2724: '"@modelcontextprotocol/sdk/server/streamableHttp.js"' has no exported member named 'StreamableHttpServerTransport'.
Did you mean 'StreamableHTTPServerTransport'?
```

**原因**: 型名が`StreamableHTTPServerTransport`（HTTPが大文字）だが、`StreamableHttpServerTransport`（Httpが小文字）と誤記。

**解決策**:
```typescript
// ❌ 間違い
import { StreamableHttpServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

// ✅ 正しい（HTTPが大文字）
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
```

**教訓**: MCP SDKの型名は正確に確認する。TypeScriptのエラーメッセージに正しい型名が表示されるので、それに従う。

---

## 参照資料とサンプル

### 公式ドキュメント

1. **MCP 公式仕様**
   - URL: https://modelcontextprotocol.io/specification/2025-03-26/basic/transports
   - 内容: Streamable HTTP transportの仕様、JSON-RPC 2.0プロトコル
   - **重要**: 必ず`2025-03-26`版を参照すること（旧版は非推奨）

2. **MCP TypeScript SDK**
   - GitHub: https://github.com/modelcontextprotocol/typescript-sdk
   - npm: https://www.npmjs.com/package/@modelcontextprotocol/sdk
   - 内容: 公式SDK、サンプルコード、APIリファレンス

3. **Claude Code Documentation**
   - URL: https://docs.claude.com/en/docs/claude-code/mcp
   - 内容: Claude CodeからMCPサーバーに接続する方法

### 実践的なサンプル実装

1. **Qiita: Streamable HTTP transport対応の自作MCPサーバー**
   - URL: https://qiita.com/youtoy/items/f3d3f75e1731b1ba1b89
   - 言語: 日本語
   - 内容: 実際のStreamable HTTP実装例、VS Code（GitHub Copilot）からの利用方法
   - **おすすめ度**: ⭐⭐⭐⭐⭐ (日本語で最も詳しい)

2. **Koyeb Tutorial: Deploy Remote MCP Servers**
   - URL: https://www.koyeb.com/tutorials/deploy-remote-mcp-servers-to-koyeb-using-streamable-http-transport
   - 言語: 英語
   - 内容: Cloud環境へのデプロイ、Streamable HTTP実装
   - **おすすめ度**: ⭐⭐⭐⭐

3. **InfoQ: Claude Code Gains Support for Remote MCP Servers**
   - URL: https://www.infoq.com/news/2025/06/anthropic-claude-remote-mcp/
   - 言語: 英語
   - 内容: Streamable HTTPの背景、Claude Codeのサポート状況
   - **おすすめ度**: ⭐⭐⭐

### コミュニティリソース

1. **GitHub Issue: Support for "Streamable HTTP" Transport**
   - URL: https://github.com/modelcontextprotocol/typescript-sdk/issues/220
   - 内容: Streamable HTTP実装時の議論、FAQ
   - **役立ち度**: ⭐⭐⭐⭐

2. **LobeHub: MCP Streamable HTTP Server Example**
   - URL: https://lobehub.com/mcp/riccardo-larosa-docebo-mcp-server
   - 内容: サンプル実装、ベストプラクティス
   - **役立ち度**: ⭐⭐⭐

### 非推奨となった資料（参考のため記載）

以下の資料は**HTTP+SSE transport**に関するもので、**現在は非推奨**です。ただし、MCP全般の理解には役立ちます。

- ❌ **HTTP+SSE関連の古い記事** (2024年11月～2025年3月)
  - `SSEServerTransport`を使用したサンプル
  - `/sse`エンドポイントの実装例
  - **注意**: これらの実装は動作するが、将来的にサポートされなくなる

---

## ベストプラクティス

### 1. SDK バージョン管理

**推奨**: 最新のMCP SDKを使用する

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.20.2"
  }
}
```

**確認方法**:
```bash
npm info @modelcontextprotocol/sdk | grep version
```

**重要なバージョン履歴**:
- `1.10.0` (2025年4月17日): Streamable HTTP transport追加
- `1.20.2` (最新): 安定版、DNS rebinding protection等のセキュリティ機能

### 2. ファイル構成

**推奨ディレクトリ構造**:
```
mcp-server/
├── src/
│   ├── index.ts                 # メインエントリーポイント
│   ├── mcpServer.ts             # MCPサーバー初期化
│   ├── config.ts                # 環境変数管理
│   ├── transport/
│   │   ├── streamableHttpTransport.ts  # Streamable HTTP実装
│   │   └── streamableHttpTransport.test.ts
│   ├── tools/                   # MCPツール実装
│   │   ├── toolName.ts
│   │   └── toolName.test.ts
│   └── websocket/               # WebSocket中継層（必要に応じて）
│       ├── relay.ts
│       └── SessionManager.ts
├── package.json
├── tsconfig.json
├── Dockerfile                   # Cloud Run用
├── cloudbuild.yaml              # Cloud Build設定
└── README.md
```

### 3. エラーハンドリング

**推奨パターン**:
```typescript
app.post('/message', async (req, res) => {
  try {
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Streamable HTTP transport error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});
```

**ポイント**:
- `res.headersSent`をチェックして二重送信を防ぐ
- エラーログを詳細に記録（Cloud Loggingに統合）
- クライアントには詳細なエラー情報を返さない（セキュリティ）

### 4. ヘルスチェックエンドポイント

**必須**: Cloud Run等のコンテナ環境では必ずヘルスチェックを実装

```typescript
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});
```

**理由**:
- Cloud Runのstartup/liveness probeが使用
- ロードバランサーのヘルスチェック
- モニタリングツールからの疎通確認

### 5. テスト戦略

**推奨**: ユニットテスト + 統合テストの組み合わせ

**ユニットテスト**:
```typescript
describe('Streamable HTTP Transport', () => {
  it('should have POST /message endpoint registered', () => {
    const routes = (app._router?.stack || [])
      .filter((layer: any) => layer.route)
      .map((layer: any) => layer.route.path);

    expect(routes).toContain('/message');
  });
});
```

**統合テスト**:
```typescript
it('should handle MCP tools/list request', async () => {
  const response = await request(app)
    .post('/message')
    .send({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    });

  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty('result');
});
```

### 6. Cloud Run デプロイ設定

**推奨設定**:
```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'mcp-server'
      - '--source'
      - '.'
      - '--region'
      - 'asia-northeast1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'  # 開発環境のみ
      - '--set-env-vars'
      - 'NODE_ENV=development'
      - '--timeout'
      - '3600'  # 60分（WebSocket対応）
      - '--no-use-http2'  # WebSocket対応
      - '--min-instances'
      - '0'
      - '--max-instances'
      - '10'
```

**ポイント**:
- `--no-use-http2`: WebSocketを使用する場合は必須
- `--timeout 3600`: WebSocket接続を維持するため長めに設定
- `--allow-unauthenticated`: 開発環境のみ。本番環境ではOAuth実装が必要

---

## トラブルシューティング

### 問題 1: Claude CLI から接続できない

**症状**:
```bash
claude mcp list
# line-miniapp-e2e-test: ✗ Failed to connect
```

**原因候補**:
1. `.mcp.json`の設定形式が間違っている
2. MCPサーバーがデプロイされていない
3. エンドポイントURLが間違っている

**解決手順**:

1. **MCPサーバーのヘルスチェック**:
   ```bash
   curl https://your-mcp-server.run.app/health
   # 期待: {"status":"ok"}
   ```

2. **`.mcp.json`の確認**:
   ```json
   {
     "mcpServers": {
       "my-server": {
         "type": "http",
         "url": "https://your-mcp-server.run.app"
       }
     }
   }
   ```
   **注意**: `url`にエンドポイント（`/message`）は含めない

3. **Claude CLIの再起動**:
   ```bash
   # MCPサーバーをクリア
   claude mcp remove my-server

   # 再度追加
   claude mcp add --transport http my-server https://your-mcp-server.run.app
   ```

### 問題 2: TypeScript コンパイルエラー

**症状**:
```
error TS2724: has no exported member named 'StreamableHttpServerTransport'
```

**解決策**:
型名を`StreamableHTTPServerTransport`（HTTPが大文字）に修正

```typescript
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
```

### 問題 3: Cloud Run デプロイエラー

**症状**:
```
ERROR: (gcloud.run.deploy) INVALID_ARGUMENT: could not resolve source
```

**原因**: `--source`オプションが正しくない、またはDockerfileがない

**解決策**:

1. **ソースディレクトリを確認**:
   ```bash
   # mcp-server/ ディレクトリに移動してから実行
   gcloud run deploy mcp-server --source .
   ```

2. **Dockerfileの存在確認**:
   ```bash
   ls mcp-server/Dockerfile
   ```

3. **Cloud Build権限の確認**:
   ```bash
   gcloud projects add-iam-policy-binding PROJECT_ID \
     --member=serviceAccount:PROJECT_NUMBER@cloudbuild.gserviceaccount.com \
     --role=roles/run.admin
   ```

### 問題 4: WebSocket 接続が切断される

**症状**: LINEミニアプリからのWebSocket接続が頻繁に切断される

**原因**: Cloud RunのデフォルトHTTP/2設定がWebSocketをサポートしていない

**解決策**:
```bash
gcloud run deploy mcp-server \
  --no-use-http2 \
  --timeout 3600
```

**説明**:
- `--no-use-http2`: HTTP/1.1を使用（WebSocket対応）
- `--timeout 3600`: 60分のタイムアウト（デフォルト5分）

### 問題 5: MCP ツールが呼び出されない

**症状**: Claude Codeからツールを実行しても反応がない

**デバッグ手順**:

1. **MCPサーバーのログ確認**:
   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=mcp-server" \
     --limit 50 \
     --format json \
     --project PROJECT_ID
   ```

2. **ツール定義の確認**:
   ```bash
   # POST /message でtools/listを呼び出し
   curl -X POST https://your-mcp-server.run.app/message \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
   ```
   **期待レスポンス**:
   ```json
   {
     "jsonrpc": "2.0",
     "id": 1,
     "result": {
       "tools": [
         {
           "name": "execute_command",
           "description": "...",
           "inputSchema": {...}
         }
       ]
     }
   }
   ```

3. **Claude CLIのデバッグモード**:
   ```bash
   claude --debug "list available MCP tools"
   ```

---

## まとめ

### MCPサーバー実装の鉄則

1. ✅ **Streamable HTTPを使用** - HTTP+SSEは非推奨
2. ✅ **MCP SDK 1.10.0以降を使用** - 古いバージョンはStreamable HTTP未対応
3. ✅ **エンドポイントは`/message`** - `/sse`は旧方式
4. ✅ **ステートレスサーバー** - `sessionIdGenerator: undefined`
5. ✅ **ヘルスチェック必須** - Cloud Run環境では必ず実装
6. ✅ **WebSocket使用時は`--no-use-http2`** - Cloud Runデプロイ設定
7. ✅ **公式ドキュメントは2025-03-26版を参照** - 旧版は非推奨

### 次回の実装で最初にすべきこと

1. **MCP SDK最新版を確認**:
   ```bash
   npm info @modelcontextprotocol/sdk
   ```

2. **公式仕様を確認** (2025-03-26版):
   https://modelcontextprotocol.io/specification/2025-03-26/basic/transports

3. **Qiitaサンプルを参照**:
   https://qiita.com/youtoy/items/f3d3f75e1731b1ba1b89

4. **このガイドのベストプラクティスに従う**

### 参考になった検索キーワード

- "anthropic model context protocol streamable http 2025"
- "claude code mcp remote server configuration"
- "@modelcontextprotocol/sdk streamable http example"
- "mcp server cloud run deployment"

---

**最終更新**: 2025年11月2日
**MCP SDK バージョン**: 1.20.2
**MCP 仕様バージョン**: 2025-03-26
