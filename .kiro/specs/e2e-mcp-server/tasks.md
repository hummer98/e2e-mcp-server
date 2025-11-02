# Implementation Plan

## Phase 1: プロジェクト基盤とMCPプロトコル層

- [x] 1. TypeScriptプロジェクトのセットアップと依存関係管理
- [x] 1.1 プロジェクト初期化と基本設定
  - TypeScript 5.x、Node.js 20.x LTSプロジェクトを初期化
  - tsconfig.jsonで厳格な型チェックとESModules設定
  - package.jsonに必須依存関係を追加（MCP SDK 1.20.2、Playwright 1.40、Express等）
  - 開発用依存関係を追加（Jest、ts-node、型定義ファイル）
  - _Requirements: 6.6_

- [x] 1.2 ディレクトリ構造と型定義の作成
  - src/ディレクトリ配下にコンポーネント別フォルダを作成
  - 共通型定義ファイル（Result型、エラー型、SessionInfo等）を作成
  - 環境変数管理用の設定ファイルを作成
  - _Requirements: All requirements_

- [x] 2. MCPプロトコル層の実装
- [x] 2.1 Streamable HTTPトランスポートの設定
  - StreamableHTTPServerTransportをステートレス設定で初期化
  - Expressサーバーで/messageエンドポイントを実装
  - /healthエンドポイントでヘルスチェック機能を実装
  - エラーハンドリングとロギングを追加
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 2.2 MCPツール登録システムの実装
  - MCP Serverインスタンスを作成し、tools capabilityを有効化
  - ツール登録ヘルパー関数を実装（JSON Schema検証含む）
  - tools/listメソッドでツール一覧を返却する機能を実装
  - ツール実行時の入力検証とエラーハンドリングを実装
  - _Requirements: 1.4_

## Phase 2: サーバーライフサイクル管理層

- [x] 3. サーバー起動コマンド実行機能の実装
- [x] 3.1 コマンド実行基盤の構築
  - child_process.spawnを使用したコマンド実行機能を実装
  - stdoutストリームをバッファリングし、プロセス終了時にJSONパースする機能を実装
  - タイムアウト制御（AbortController使用）を実装
  - シェルインジェクション防止のためのパス検証を実装
  - _Requirements: 3.1, 3.3_

- [x] 3.2 サーバー起動コマンドの各オプション実装
  - --startオプションでサーバー起動し、ServerStartResponseをパースする機能を実装
  - --statusオプションでサーバー状態を取得する機能を実装
  - --shutdownオプションでサーバーをグレースフルシャットダウンする機能を実装
  - --restartオプションでサーバー再起動（shutdown→start）を実装
  - _Requirements: 3.4, 3.6, 3.7_

- [x] 3.3 コマンド実行エラーハンドリング
  - 非0終了コード、タイムアウト、無効JSONの各エラーケースを処理
  - CommandError型で構造化エラーを返却
  - stderrログをエラーレスポンスに含める機能を実装
  - _Requirements: 3.3, 5.1_

- [x] 3.4 ログファイル読み取り機能
  - SessionInfo.logsパスからログファイルを読み取る機能を実装
  - 最新N行（デフォルト100行）を取得する機能を実装
  - パストラバーサル攻撃防止のためのパス検証を実装
  - _Requirements: 5.3, 5.5_

## Phase 3: セッション管理層

- [x] 4. セッション管理機能の実装
- [x] 4.1 セッションストアとセッション情報管理
  - メモリ内Map（sessionId -> SessionInfo）でセッション情報を管理する機能を実装
  - UUID v4でセッションIDを生成する機能を実装
  - セッション作成・取得・削除の基本操作を実装
  - _Requirements: 3.2_

- [x] 4.2 startSessionツールの実装 (SessionManager.startSessionとして実装済み)
  - サーバー起動コマンドを--startオプションで実行
  - レスポンスからURL、ポート、PID、ログパスを抽出してSessionInfoに保存
  - Playwrightブラウザインスタンスを起動してSessionInfoに保存
  - 自動シャットダウンタイマー（デフォルト10分）を開始
  - AIエージェントにsessionIdとURLを返却
  - _Requirements: 3.1, 3.2_

- [x] 4.3 endSessionツールの実装 (SessionManager.stopSessionとして実装済み)
  - Playwrightブラウザインスタンスをクローズ
  - サーバー起動コマンドを--shutdownオプションで実行
  - 自動シャットダウンタイマーをキャンセル
  - SessionInfoをMapから削除
  - _Requirements: 3.4_

- [x] 4.4 自動シャットダウンタイマーの実装
  - ツール呼び出し時にタイマーをリセットする機能を実装
  - タイムアウト時にendSessionと同じ処理（ブラウザクローズ、サーバーシャットダウン、SessionInfo削除）を実行
  - 環境変数でタイムアウト時間を設定可能にする
  - _Requirements: 3.5, 6.2_

- [x] 4.5 getSessionStatusツールの実装
  - サーバー起動コマンドを--statusオプションで実行
  - ServerStatusResponseをAIエージェントに返却
  - **実装**: src/session/manager.ts getSessionStatus()（3テスト成功）
  - _Requirements: 3.6_

## Phase 4: Playwright統合層

- [x] 5. Playwright基本操作の実装
- [x] 5.1 ブラウザとページ管理機能
  - SessionInfo.browserからPageインスタンスを作成・再利用する機能を実装
  - ブラウザクラッシュ検知（browser.isConnected()）を実装
  - Pageインスタンスの状態管理を実装
  - **実装**: src/playwright/browser.ts（12テスト成功）
  - _Requirements: 4.1-4.9_

- [x] 5.2 navigateツールの実装
  - SessionInfoからBrowserインスタンスを取得
  - 新しいPageを作成（または既存Page再利用）
  - page.goto()で指定URLにナビゲート（waitUntilオプション対応）
  - ナビゲーション失敗時のエラーハンドリングを実装
  - **実装**: src/playwright/navigate.ts（8テスト成功）
  - _Requirements: 4.1_

- [x] 5.3 要素操作ツールの実装（click, type, waitForSelector）
  - clickツール: page.click()でセレクタ指定要素をクリック
  - typeツール: page.fill()でテキスト入力
  - waitForSelectorツール: page.waitForSelector()で要素待機
  - タイムアウトオプション（デフォルト30秒）を実装
  - **実装**: src/playwright/actions.ts（11テスト成功）
  - _Requirements: 4.2, 4.3, 4.8_

- [x] 5.4 スクリーンショットツールの実装
  - page.screenshot()でスクリーンショットを撮影
  - Base64エンコードでAIエージェントに返却
  - fullPageオプションを実装
  - **実装**: src/playwright/screenshot.ts（6テスト成功）
  - _Requirements: 4.4_

- [x] 5.5 コンテンツ取得とJavaScript実行ツールの実装
  - getContentツール: page.content()でHTML取得
  - evaluateツール: page.evaluate()でJavaScript実行
  - getElementText/getElementAttributeツール: テキスト・属性取得
  - evaluateOnSelectorツール: 要素に対するJavaScript実行
  - **実装**: src/playwright/content.ts（12テスト成功）
  - _Requirements: 4.5, 4.6, 4.7_

## Phase 5: エラーハンドリングとデバッグ支援

- [ ] 6. 統合エラーハンドリングシステムの実装
- [ ] 6.1 Playwrightエラー時の自動スクリーンショット撮影
  - TimeoutError、ElementNotFoundError等のPlaywrightエラーをキャッチ
  - エラー発生時に自動的にpage.screenshot()を実行
  - StructuredError型でエラー詳細とスクリーンショットを返却
  - _Requirements: 4.9, 5.2_

- [x] 6.2 サーバーログ自動読み取り機能
  - Playwrightエラー時にSessionInfo.logs.stderrを読み取り
  - 最新100行をStructuredErrorに含める
  - ログ読み取り失敗時でもエラー本体は返却
  - **実装完了**: `src/errors/handler.ts`でログ自動読み取り実装
  - _Requirements: 5.1, 5.3_

- [x] 6.3 構造化エラーレスポンスの実装
  - エラー種別（User Error、System Error、Playwright Error、Business Logic Error）を判定
  - エラーコンテキスト（sessionId、toolName、args、timestamp）を付加
  - StructuredError型でAIエージェントに返却
  - **実装完了**: `src/errors/handler.ts`で構造化エラー実装、8件のテスト合格
  - _Requirements: 5.6_

- [x] 6.4 readServerLogsツールの実装
  - SessionInfo.logsパスから指定ログタイプ（stdout/stderr/combined）を読み取り
  - 最新N行（デフォルト100行）を返却
  - パストラバーサル検証を実装
  - **実装**: src/session/manager.ts readSessionLogs()（3テスト成功）
  - _Requirements: 5.4, 5.5_

## Phase 6: セキュリティとバリデーション

- [ ] 7. セキュリティ対策の実装
- [x] 7.1 コマンドインジェクション防止
  - サーバー起動コマンドパスの絶対パス検証を実装
  - 環境変数SERVER_COMMAND_PATHで許可パスを制限
  - パス存在確認と実行権限確認を実装
  - **実装完了**: `src/security/command.ts`でコマンド検証、14件のテスト合格
  - _Requirements: 6.1_

- [x] 7.2 SSRF対策とURL検証
  - navigateツールでURL許可リスト（環境変数ALLOWED_HOSTS）を実装
  - プライベートIPレンジへのアクセスをブロック
  - URL解析後のホスト・IPチェックを実装
  - **実装完了**: `src/security/url.ts`でURL検証、18件のテスト合格
  - _Requirements: 6.1, 6.2_

- [x] 7.3 レート制限とDoS対策
  - セッション作成のレート制限（10回/分）を実装
  - ツール呼び出しのレート制限（100回/分）を実装
  - Cloud Run並行実行数制限を設定
  - **実装完了**: `src/security/rate-limit.ts`でレート制限、9件のテスト合格
  - _Requirements: 6.2_

## Phase 7: ロギングとモニタリング

- [ ] 8. 構造化ロギングとヘルスモニタリング
- [x] 8.1 構造化ロギングシステムの実装
  - JSON形式でログ出力（timestamp、level、component、event、sessionId、details）
  - ログレベル（ERROR、WARN、INFO、DEBUG）別のロギングを実装
  - Cloud Logging統合のための標準出力ログ出力を実装
  - _Requirements: All requirements (observability)_
  - **実装完了**: `src/logging/logger.ts`でLogger実装、11件のテスト合格

- [x] 8.2 ヘルスチェックとメトリクス収集
  - /healthエンドポイントでアクティブセッション数、メモリ使用量を返却
  - ツール呼び出し成功率、平均レスポンス時間、エラー発生率のメトリクスを収集
  - **実装完了**: `src/monitoring/health.ts`でヘルスモニターとメトリクス収集、14件のテスト合格
  - _Requirements: 1.5_

## Phase 8: 環境変数管理とデプロイ準備

- [ ] 9. 環境変数管理とデプロイ設定
- [x] 9.1 環境変数設定機能の実装
  - SERVER_COMMAND_PATH、SESSION_TIMEOUT、ALLOWED_HOSTS等の環境変数を読み込み
  - 環境変数のバリデーションとデフォルト値設定を実装
  - NODE_ENVによる開発環境/本番環境の切り替えを実装
  - **実装完了**: `src/config/env.ts`で設定管理、11件のテスト合格
  - _Requirements: 6.1, 6.2_

- [x] 9.2 Dockerfileとデプロイ設定の作成
  - Node.js 20.x LTSベースのDockerfileを作成
  - Playwright依存ライブラリのインストールを含める
  - Cloud Run用のcloudbuild.yamlを作成（--no-use-http2、タイムアウト3600秒等）
  - **実装完了**: `Dockerfile`、`cloudbuild.yaml`、`README.deploy.md`を作成
  - _Requirements: 6.1, 6.6_

## Phase 9: テスト実装

- [ ] 10. ユニットテストの実装
- [x] 10.1 ServerCommandExecutorのユニットテスト
  - spawn実行とstdoutパース、タイムアウト制御のテストを実装
  - 非0終了コード、タイムアウト、無効JSONエラーケースのテストを実装
  - **既存実装**: `src/server/command.test.ts`でカバー済み
  - _Requirements: 3.1-3.7_

- [x] 10.2 SessionManagerのユニットテスト
  - startSession成功時のSessionInfo保存とタイマー起動をテスト
  - endSessionでBrowser.close()、サーバーシャットダウン、SessionInfo削除をテスト
  - **既存実装**: `src/session/manager.test.ts`でカバー済み
  - _Requirements: 3.1-3.7_

- [x] 10.3 PlaywrightOrchestratorのユニットテスト
  - page.click()呼び出しとTimeoutError時の自動スクリーンショット撮影をテスト
  - navigate、screenshot、evaluate各ツールの正常系をテスト
  - **既存実装**: `src/playwright/*.test.ts`でカバー済み（49件のテスト）
  - _Requirements: 4.1-4.9_

- [x] 11. 統合テストの実装
- [x] 11.1 E2Eセッション全体フローのテスト
  - startSession → navigate → click → screenshot → endSession のシーケンスをテスト
  - モックサーバー起動コマンドを使用
  - **実装完了**: `src/integration/e2e-flow.test.ts` (4テストケース)
    - 完全なE2Eフロー（セッション開始→ページナビゲーション→インタラクション→スクリーンショット→セッション停止）
    - 複数ページインタラクションのテスト
    - セッション状態の維持テスト
    - 並行セッション処理テスト
  - _Requirements: 3.1-3.7, 4.1-4.9_

- [x] 11.2 エラーハンドリング統合テスト
  - Playwright操作失敗時のログ・スクリーンショット自動収集をテスト
  - 自動シャットダウンタイマーのタイムアウト動作をテスト
  - **既存実装**: `src/errors/handler.test.ts`と`src/session/manager.test.ts`でカバー済み
  - _Requirements: 5.1-5.6_

- [x] 11.3 MCP Protocol準拠テスト
  - /messageエンドポイントへのJSON-RPC 2.0リクエストで正しいレスポンスが返ることをテスト
  - tools/listメソッドで全ツールが返却されることをテスト
  - **既存実装**: `src/mcp/server.test.ts`と`src/mcp/tools.test.ts`でカバー済み
  - _Requirements: 1.1-1.5_

## Phase 10: ドキュメント作成

- [x] 12. ユーザー向けドキュメントの作成
- [x] 12.1 READMEの作成
  - プロジェクト概要と主要機能を記載
  - サーバー起動コマンドの実装例（Node.js、Bash）を提供
  - 環境変数の説明を記載
  - .mcp.json設定例を記載
  - **実装完了**: `README.md`
    - プロジェクト概要、機能一覧
    - MCPツールのAPI仕様
    - サーバー起動コマンドインターフェース
    - デプロイ手順（Cloud Run）
    - セキュリティ考慮事項
  - _Requirements: 6.4_

- [x] 12.2 サーバー起動コマンドのリファレンス実装
  - Node.jsによるサーバー起動コマンドのサンプルを作成
  - 動的ポート割り当て、ログファイル作成、JSON出力の実装例を提供
  - --start/--restart/--status/--shutdownの全オプションを実装
  - **実装完了**: `examples/server-command.js`
    - 動的ポート割り当て
    - ログファイル管理（stdout, stderr, combined）
    - JSON形式の標準出力
    - 全オプション実装（--start, --status, --restart, --shutdown）
    - Bash/Python実装例も`examples/README.md`に記載
  - _Requirements: Requirement 2全体（参考実装）_

## Phase 11: E2Eテスト（実環境検証）

- [x] 13. stdioトランスポート実装とリファクタリング
- [x] 13.1 stdioトランスポートの実装
  - StdioServerTransportを使用したMCPサーバーエントリポイントを作成
  - package.jsonにbinエントリポイントを追加（npxコマンドで実行可能に）
  - stdin/stdout経由でJSON-RPC 2.0メッセージを送受信
  - 10個のMCPツールを登録（startSession, stopSession, getSessionStatus, navigate, click, fill, screenshot, evaluate, getContent, readLogs）
  - **実装完了**: `src/mcp-server.ts`
  - **動作確認**: `echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/mcp-server.js` で10個のツールが正常に返却されることを確認
  - _Requirements: 6.1, 6.2_

- [x] 13.2 既存HTTPモードをオプションに変更
  - 既存のsrc/index.ts（HTTPモード）はそのまま維持
  - stdio/HTTP両モードが独立して動作可能
  - _Requirements: 6.3, 6.4_

- [x] 13.3 .mcp.json設定例とドキュメント更新
  - README.mdにstdio設定例（主要）とHTTP設定例（オプション）を記載
  - .mcp.json.exampleをstdio設定に変更
  - **更新完了**: `README.md`, `.mcp.json.example`
  - _Requirements: 6.4_

- [ ] 14. 実環境でのE2Eテスト
- [x] 14.1 Claude Code統合テスト（HTTPモード）
  - .mcp.jsonにE2E-MCPサーバーを設定（HTTPモード）
  - Claude Codeから実際にstartSession → Playwright操作 → endSessionを実行
  - エラーレスポンス（スクリーンショット、ログ含む）の確認
  - **テストガイド作成完了**: `docs/claude-code-integration-test.md`
    - セットアップ手順（.mcp.json設定）
    - 10個のテストシナリオ（ツール一覧、セッション開始、Playwright操作、エラーハンドリング、セッションクリーンアップ等）
    - 完全なE2Eワークフローテスト
    - トラブルシューティングガイド
    - テスト結果記録テンプレート
  - _Requirements: 6.3_

- [ ] 14.2 Claude Code統合テスト（stdioモード）
  - .mcp.jsonにstdio設定でE2E-MCPサーバーを設定
  - Claude Codeから`npx e2e-mcp-server`で起動確認
  - 同様のテストシナリオを実行してstdioモードの動作確認
  - _Requirements: 6.1, 6.3_

- [ ] 14.3 実開発サーバーでのテスト
  - Next.js等の実開発サーバー起動コマンドを作成
  - ログパス取得、ポート動的割り当ての動作確認
  - 自動シャットダウンの動作確認（10分アイドル）
  - _Requirements: 3.1-3.7_

- [ ] 14.4 Cloud Runデプロイとテスト
  - Cloud RunにE2E-MCPサーバーをデプロイ（HTTPモード）
  - ヘルスチェック、ログ出力（Cloud Logging）の確認
  - リモートMCPサーバーとしてClaude Codeから接続テスト
  - _Requirements: 6.1, 6.2, 6.6_
