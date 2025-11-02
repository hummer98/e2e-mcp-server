# Requirements Document

## Project Description (Input)

### プロジェクト概要
ClaudeCodeなどのソフトウェアエンジニアAIエージェントにおいて、E2Eテストを円滑に実行させるためのModel Context Protocolサーバーを提供します。

### 解決する課題
従来のplaywright mcpはサーバー管理機能を持たないため、playwrightがアクセスすべき開発サーバーの状態管理をClaudeCode自身が行う必要があり、非常に煩雑でした。

### ソリューション
サーバーのプロセス管理をMCPサーバーに移譲することで、E2Eテスト実行に専念できるようにします。

### 主な機能

#### 1. E2Eセッション管理
- **セッション開始**: AIからの要求時にサーバー起動コマンドを実行し、サーバーを起動
- **セッション終了**: サーバー起動コマンドを`--shutdown`オプションで呼び出し
- **自動シャットダウン**: 通信が途絶えてから指定時間経過後に自動的に`--shutdown`を実行

#### 2. Playwright機能
- すべてのPlaywright機能を提供（フルスクラッチ実装）

#### 3. サーバー起動コマンド仕様
ユーザーが提供するサーバー起動コマンドに以下の仕様を要求：

**コマンドオプション:**
- `(オプションなし)` or `--start`: サーバーを起動し、規定のJSONを返却
- `--restart`: 強制的にリスタート
- `--shutdown`: サーバーをシャットダウン
- `--status`: サーバーの起動状況を返す

**レスポンス仕様:**
- JSON形式で標準出力に返却
- 終了コード: 0（成功）、非0（失敗）
- 動的ポート割り当て: サーバー起動コマンドが利用可能なポートを自動検出
- ログ情報の提供: stdout, stderr, combinedログの絶対パスを返却

**startレスポンス例:**
```json
{
  "status": "ready",
  "url": "http://localhost:3542",
  "port": 3542,
  "pid": 12345,
  "startedAt": "2025-11-02T10:30:00Z",
  "logs": {
    "stdout": "/tmp/dev-server-12345.stdout.log",
    "stderr": "/tmp/dev-server-12345.stderr.log",
    "combined": "/tmp/dev-server-12345.log"
  },
  "message": "Server started successfully on dynamically assigned port"
}
```

**statusレスポンス例:**
```json
{
  "status": "running",
  "url": "http://localhost:3542",
  "port": 3542,
  "pid": 12345,
  "startedAt": "2025-11-02T10:30:00Z",
  "uptime": 3600,
  "healthy": true,
  "logs": {
    "stdout": "/tmp/dev-server-12345.stdout.log",
    "stderr": "/tmp/dev-server-12345.stderr.log",
    "combined": "/tmp/dev-server-12345.log"
  },
  "message": "Server is running and healthy"
}
```

**shutdownレスポンス例:**
```json
{
  "status": "stopped",
  "previousPid": 12345,
  "previousPort": 3542,
  "stoppedAt": "2025-11-02T11:30:00Z",
  "uptime": 3600,
  "message": "Server stopped successfully"
}
```

**restartレスポンス例:**
```json
{
  "status": "restarted",
  "url": "http://localhost:3543",
  "port": 3543,
  "pid": 12346,
  "previousPid": 12345,
  "previousPort": 3542,
  "startedAt": "2025-11-02T10:35:00Z",
  "message": "Server restarted successfully on new port"
}
```

### 技術的決定事項
- Playwrightの統合: フルスクラッチ実装（公開されているPlaywright MCPを参考）
- ポート管理: サーバー起動コマンド側の責務
- ログ管理: AIエージェントのデバッグ効率向上のため、ログパスを返却

## Requirements

### Requirement 1: MCPサーバーの初期化とトランスポート設定
**目的:** AIエージェント開発者として、E2EテストMCPサーバーを標準的なMCPプロトコルで利用できるようにしたい。これにより、Claude Code、ChatGPT、Geminiなどの複数のAIクライアントから統一的にアクセスできる。

#### 受入基準
1. WHEN MCPサーバーが起動するとき THEN E2E-MCP-Server SHALL Streamable HTTPトランスポート（MCP SDK 1.10.0以降）を使用する
2. WHEN MCPサーバーが起動するとき THEN E2E-MCP-Server SHALL `/message`エンドポイントでJSON-RPC 2.0リクエストを受信する
3. WHEN MCPサーバーが起動するとき THEN E2E-MCP-Server SHALL ステートレス設計（`sessionIdGenerator: undefined`）で動作する
4. WHEN MCPクライアントがツール一覧を要求するとき THEN E2E-MCP-Server SHALL `tools/list`メソッドで利用可能なツールリストを返却する
5. WHEN MCPサーバーが起動するとき THEN E2E-MCP-Server SHALL `/health`エンドポイントでヘルスチェックに応答する

---

### Requirement 2: サーバー起動コマンドのインターフェース定義
**目的:** AIエージェント開発者として、自分のプロジェクトの開発サーバーをE2E-MCPサーバーに統合できるようにしたい。そのために、標準化されたコマンドインターフェースを提供する必要がある。

**注意:** このRequirementは、**エンドユーザーが提供すべき「サーバー起動コマンド」の仕様**を定義するものであり、E2E-MCPサーバー自体の実装要件ではない。

#### 受入基準
1. WHEN エンドユーザーがサーバー起動コマンドを実装するとき THEN Server-Startup-Command SHALL `--start`オプション（またはオプションなし）でサーバーを起動し、JSON形式のレスポンスを標準出力に返却する
2. WHEN サーバー起動コマンドが`--start`で実行されるとき AND サーバーが起動成功した場合 THEN Server-Startup-Command SHALL 以下のフィールドを含むJSONを返却する: `status`（"ready"）、`url`、`port`、`pid`、`startedAt`、`logs`（stdout, stderr, combined）、`message`
3. WHEN サーバー起動コマンドが`--start`で実行されるとき AND サーバーが既に起動中の場合 THEN Server-Startup-Command SHALL `status`が"already_running"のJSONレスポンスを返却し、終了コード0で終了する
4. WHEN サーバー起動コマンドが`--restart`で実行されるとき THEN Server-Startup-Command SHALL 既存プロセスを停止してから新しいプロセスを起動し、新しいポート情報を返却する
5. WHEN サーバー起動コマンドが`--status`で実行されるとき THEN Server-Startup-Command SHALL サーバーの状態（running/stopped/unhealthy）、URL、PID、ヘルスチェック結果を返却する
6. WHEN サーバー起動コマンドが`--shutdown`で実行されるとき THEN Server-Startup-Command SHALL サーバーをグレースフルシャットダウンし、`status`が"stopped"のJSONを返却する
7. WHEN サーバー起動コマンドが起動処理を実行するとき THEN Server-Startup-Command SHALL 利用可能なポートを自動検出し、動的に割り当てる
8. WHEN サーバー起動コマンドがログファイルを作成するとき THEN Server-Startup-Command SHALL stdout、stderr、combinedログの絶対パスをレスポンスの`logs`フィールドに含める
9. WHEN サーバー起動コマンドが成功するとき THEN Server-Startup-Command SHALL 終了コード0を返却する
10. WHEN サーバー起動コマンドが失敗するとき THEN Server-Startup-Command SHALL 終了コード非0を返却し、`status`が"error"、`error`フィールド、`message`フィールドを含むJSONを返却する
11. WHEN サーバー起動コマンドがタイムアウト制限内に応答すべきとき THEN Server-Startup-Command SHALL `--start`は30秒以内、`--restart`は40秒以内、`--status`は5秒以内、`--shutdown`は15秒以内に応答する

---

### Requirement 3: E2Eセッション管理（サーバーライフサイクル制御）
**目的:** AIエージェントとして、E2Eテスト実行前に開発サーバーを自動起動し、テスト完了後に自動停止できるようにしたい。これにより、手動でのサーバー管理作業を削減できる。

#### 受入基準
1. WHEN AIエージェントがE2Eセッション開始を要求するとき THEN E2E-MCP-Server SHALL ユーザー提供のサーバー起動コマンドを`--start`オプションで実行する
2. WHEN サーバー起動コマンドが成功レスポンスを返すとき THEN E2E-MCP-Server SHALL レスポンスからURL、ポート、PID、ログパスを抽出し、セッション情報として保存する
3. WHEN サーバー起動コマンドがタイムアウトまたはエラーを返すとき THEN E2E-MCP-Server SHALL AIエージェントにエラーメッセージとログパスを返却する
4. WHEN AIエージェントがE2Eセッション終了を要求するとき THEN E2E-MCP-Server SHALL サーバー起動コマンドを`--shutdown`オプションで実行する
5. WHEN E2Eセッションへの通信が指定時間（デフォルト10分）途絶えるとき THEN E2E-MCP-Server SHALL 自動的にサーバー起動コマンドを`--shutdown`オプションで実行する
6. WHEN AIエージェントがセッション状態確認を要求するとき THEN E2E-MCP-Server SHALL サーバー起動コマンドを`--status`オプションで実行し、結果を返却する
7. WHEN AIエージェントがサーバー再起動を要求するとき THEN E2E-MCP-Server SHALL サーバー起動コマンドを`--restart`オプションで実行する

---

### Requirement 4: Playwright機能の統合
**目的:** AIエージェントとして、標準的なPlaywright E2E操作をMCPツールとして実行できるようにしたい。これにより、既存のPlaywright MCPと同等の機能を、サーバー管理機能と統合して利用できる。

#### 受入基準
1. WHEN AIエージェントがブラウザナビゲーションを要求するとき THEN E2E-MCP-Server SHALL Playwrightを使用して指定URLに移動する
2. WHEN AIエージェントが要素クリックを要求するとき THEN E2E-MCP-Server SHALL Playwrightセレクタで要素を特定し、クリック操作を実行する
3. WHEN AIエージェントがテキスト入力を要求するとき THEN E2E-MCP-Server SHALL Playwrightを使用して指定要素にテキストを入力する
4. WHEN AIエージェントがスクリーンショット取得を要求するとき THEN E2E-MCP-Server SHALL Playwrightでスクリーンショットを撮影し、画像データまたはパスを返却する
5. WHEN AIエージェントが要素の存在確認を要求するとき THEN E2E-MCP-Server SHALL Playwrightセレクタで要素の存在を検証し、結果を返却する
6. WHEN AIエージェントがページコンテンツ取得を要求するとき THEN E2E-MCP-Server SHALL Playwrightで現在のページのHTML/テキストコンテンツを返却する
7. WHEN AIエージェントがJavaScript実行を要求するとき THEN E2E-MCP-Server SHALL Playwrightの`evaluate`機能でスクリプトを実行し、結果を返却する
8. WHEN AIエージェントが待機操作を要求するとき THEN E2E-MCP-Server SHALL Playwrightのwaitメソッド（waitForSelector, waitForLoadStateなど）を実行する
9. WHEN Playwright操作がエラーになるとき THEN E2E-MCP-Server SHALL エラー詳細、スクリーンショット、サーバーログパス（セッション情報から取得）をAIエージェントに返却する

---

### Requirement 5: エラーハンドリングとデバッグ支援
**目的:** AIエージェントとして、E2Eテスト失敗時に根本原因を特定できる情報を取得したい。サーバーログ、スクリーンショット、エラー詳細を自動的に収集することで、デバッグ効率を向上させる。

#### 受入基準
1. WHEN サーバー起動が失敗するとき THEN E2E-MCP-Server SHALL サーバー起動コマンドのstderrログを読み取り、エラー原因をAIエージェントに返却する
2. WHEN Playwright操作が失敗するとき THEN E2E-MCP-Server SHALL 失敗時のスクリーンショットを自動撮影し、画像パスを返却する
3. WHEN E2Eテスト中にサーバーエラーが発生するとき THEN E2E-MCP-Server SHALL セッション情報に保存されたサーバーログパス（stderr）を読み取り、最新のエラーログをAIエージェントに提供する
4. WHEN MCPツール実行がタイムアウトするとき THEN E2E-MCP-Server SHALL タイムアウト時点のサーバー状態（`--status`の結果）とログを返却する
5. WHEN AIエージェントがログ全文取得を要求するとき THEN E2E-MCP-Server SHALL セッション情報に保存されたログパス（stdout, stderr, combined）からログ全文を読み取り返却する
6. WHEN 複数のエラーが連続発生するとき THEN E2E-MCP-Server SHALL 各エラーの発生時刻、種別、詳細を構造化してAIエージェントに返却する

---

### Requirement 6: MCP設定とデプロイメント
**目的:** AIエージェント開発者として、E2E-MCPサーバーを簡単にセットアップし、Claude Code等のAIクライアントから接続できるようにしたい。

#### 受入基準
1. WHEN Claude Code等のAIクライアントがローカル接続を行うとき THEN エンドユーザー SHALL `.mcp.json`に`command`と`args`を記述することでE2E-MCPサーバーにstdio経由で接続できる（主要な使用方法）
2. WHEN E2E-MCPサーバーがstdioモードで起動するとき THEN E2E-MCP-Server SHALL MCP SDK 1.10.0以降のStdioServerTransportを使用し、標準入出力でJSON-RPC 2.0通信を行う
3. WHEN E2E-MCPサーバーがCloud Run等のコンテナ環境にデプロイされるとき THEN E2E-MCP-Server SHALL HTTP/SSEモードで起動し、環境変数でサーバー起動コマンドのパスを設定可能にする（オプション）
4. WHEN E2E-MCPサーバーがHTTPモードで起動するとき THEN エンドユーザー SHALL `.mcp.json`に`type: "http"`とサーバーURLを記述することで接続できる（オプション）
5. WHEN E2E-MCPサーバーがデプロイされるとき THEN E2E-MCP-Server SHALL 自動シャットダウンのタイムアウト時間を環境変数で設定可能にする
6. WHEN E2E-MCPサーバーがデプロイされるとき THEN E2E-MCP-Server SHALL READMEに以下を記載する: サーバー起動コマンドの実装例、`.mcp.json`設定例（stdioとHTTP両方）、環境変数の説明
7. WHEN E2E-MCPサーバーが本番環境にデプロイされるとき THEN E2E-MCP-Server SHALL OAuth 2.1認証をサポートする（開発環境では認証なし可）
