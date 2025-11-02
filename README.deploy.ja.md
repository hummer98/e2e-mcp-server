# デプロイガイド

## 前提条件

- 請求が有効なGoogle Cloudプロジェクト
- `gcloud` CLIのインストールと設定
- Dockerのインストール (ローカルテスト用)

## 環境変数

デプロイメント用に以下の環境変数を設定してください:

```bash
# 必須
SERVER_COMMAND_PATH=/path/to/server/command  # サーバー起動コマンドへの絶対パス

# オプション
SESSION_TIMEOUT=600000                        # セッションタイムアウト(ミリ秒) (デフォルト: 10分)
COMMAND_TIMEOUT=30000                         # コマンドタイムアウト(ミリ秒) (デフォルト: 30秒)
PORT=3000                                     # サーバーポート (デフォルト: 3000)
LOG_LEVEL=info                                # ログレベル: debug, info, warn, error (デフォルト: info)
ALLOWED_HOSTS=example.com,*.test.com          # ナビゲーション許可ホストのカンマ区切りリスト
```

## ローカルDockerビルドとテスト

Dockerイメージをビルド:

```bash
docker build -t e2e-mcp-server .
```

ローカルでコンテナを実行:

```bash
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  e2e-mcp-server
```

ヘルスエンドポイントをテスト:

```bash
curl http://localhost:3000/health
```

## Google Cloud Runへのデプロイ

### 1. Google Cloudプロジェクトのセットアップ

```bash
# プロジェクトIDを設定
export PROJECT_ID=your-project-id
gcloud config set project $PROJECT_ID

# 必要なAPIを有効化
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### 2. Cloud Buildを使用してビルドとデプロイ

```bash
# Cloud Buildにビルドを送信
gcloud builds submit --config cloudbuild.yaml

# またはカスタムリージョンでデプロイ
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_REGION=asia-northeast1
```

### 3. 環境変数を設定 (必要に応じて)

```bash
gcloud run services update e2e-mcp-server \
  --region us-central1 \
  --set-env-vars "SESSION_TIMEOUT=600000,ALLOWED_HOSTS=*.example.com"
```

### 4. カスタムドメインの設定 (オプション)

```bash
gcloud run domain-mappings create \
  --service e2e-mcp-server \
  --domain mcp.example.com \
  --region us-central1
```

## Cloud Run設定

サービスは以下の設定で構成されます:

- **メモリ**: 2 GiB
- **CPU**: 2
- **タイムアウト**: 3600秒 (1時間)
- **並行性**: インスタンスあたり10件の同時リクエスト
- **最大インスタンス数**: 5
- **最小インスタンス数**: 0 (アイドル時にゼロにスケール)

## セキュリティに関する考慮事項

1. **認証**: デフォルトでは、サービスは未認証アクセスを許可します。本番環境の場合:
   ```bash
   gcloud run services update e2e-mcp-server \
     --region us-central1 \
     --no-allow-unauthenticated
   ```

2. **VPCアクセス**: 内部サービスにアクセスする場合、VPC Connectorを設定:
   ```bash
   gcloud run services update e2e-mcp-server \
     --region us-central1 \
     --vpc-connector your-connector-name
   ```

3. **シークレット管理**: 機密データにはSecret Managerを使用:
   ```bash
   gcloud run services update e2e-mcp-server \
     --region us-central1 \
     --set-secrets "SERVER_COMMAND_PATH=server-command-path:latest"
   ```

## モニタリングとロギング

### ログの表示

```bash
gcloud run services logs read e2e-mcp-server \
  --region us-central1 \
  --limit 50
```

### メトリクスの監視

Cloud Consoleにアクセス:
- メトリクス: `https://console.cloud.google.com/run/detail/REGION/e2e-mcp-server/metrics`
- ログ: `https://console.cloud.google.com/run/detail/REGION/e2e-mcp-server/logs`

## ヘルスチェック

サービスは以下を返す`/health`エンドポイントを公開しています:

```json
{
  "status": "healthy",
  "activeSessions": 0,
  "memory": {
    "heapUsed": 12345678,
    "heapTotal": 23456789,
    "rss": 34567890,
    "external": 1234567
  },
  "uptime": 123.45,
  "timestamp": "2025-11-02T12:00:00.000Z"
}
```

## ロールバック

以前のバージョンにロールバックする必要がある場合:

```bash
# リビジョンを一覧表示
gcloud run revisions list --service e2e-mcp-server --region us-central1

# 特定のリビジョンに更新
gcloud run services update-traffic e2e-mcp-server \
  --region us-central1 \
  --to-revisions REVISION_NAME=100
```

## コスト最適化

1. **最小インスタンス数を削減**: アイドル時にゼロにスケールするには0に設定
2. **メモリとCPUを調整**: 低い値から始めて、必要に応じてスケールアップ
3. **リクエストタイムアウトを設定**: より低いタイムアウトで高速な障害検出
4. **Cloud Schedulerを使用**: インスタンスをウォームに保つ代わりに定期的なヘルスチェックに使用

## トラブルシューティング

### コンテナの起動に失敗

ログを確認:
```bash
gcloud run services logs read e2e-mcp-server --region us-central1 --limit 100
```

### メモリ不足エラー

メモリ割り当てを増やす:
```bash
gcloud run services update e2e-mcp-server \
  --region us-central1 \
  --memory 4Gi
```

### タイムアウトエラー

タイムアウトを増やすか、サーバーコマンドを最適化:
```bash
gcloud run services update e2e-mcp-server \
  --region us-central1 \
  --timeout 3600
```
