# Deployment Guide

## Prerequisites

- Google Cloud Project with billing enabled
- `gcloud` CLI installed and configured
- Docker installed (for local testing)

## Environment Variables

Configure the following environment variables for your deployment:

```bash
# Required
SERVER_COMMAND_PATH=/path/to/server/command  # Absolute path to server startup command

# Optional
SESSION_TIMEOUT=600000                        # Session timeout in ms (default: 10 minutes)
COMMAND_TIMEOUT=30000                         # Command timeout in ms (default: 30 seconds)
PORT=3000                                     # Server port (default: 3000)
LOG_LEVEL=info                                # Log level: debug, info, warn, error (default: info)
ALLOWED_HOSTS=example.com,*.test.com          # Comma-separated list of allowed hosts for navigation
```

## Local Docker Build and Test

Build the Docker image:

```bash
docker build -t e2e-mcp-server .
```

Run the container locally:

```bash
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  e2e-mcp-server
```

Test the health endpoint:

```bash
curl http://localhost:3000/health
```

## Deploy to Google Cloud Run

### 1. Set up Google Cloud Project

```bash
# Set your project ID
export PROJECT_ID=your-project-id
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### 2. Build and Deploy using Cloud Build

```bash
# Submit build to Cloud Build
gcloud builds submit --config cloudbuild.yaml

# Or deploy with custom region
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_REGION=asia-northeast1
```

### 3. Configure Environment Variables (if needed)

```bash
gcloud run services update e2e-mcp-server \
  --region us-central1 \
  --set-env-vars "SESSION_TIMEOUT=600000,ALLOWED_HOSTS=*.example.com"
```

### 4. Set up Custom Domain (optional)

```bash
gcloud run domain-mappings create \
  --service e2e-mcp-server \
  --domain mcp.example.com \
  --region us-central1
```

## Cloud Run Configuration

The service is configured with:

- **Memory**: 2 GiB
- **CPU**: 2
- **Timeout**: 3600 seconds (1 hour)
- **Concurrency**: 10 concurrent requests per instance
- **Max instances**: 5
- **Min instances**: 0 (scales to zero when idle)

## Security Considerations

1. **Authentication**: By default, the service allows unauthenticated access. For production:
   ```bash
   gcloud run services update e2e-mcp-server \
     --region us-central1 \
     --no-allow-unauthenticated
   ```

2. **VPC Access**: For accessing internal services, configure VPC Connector:
   ```bash
   gcloud run services update e2e-mcp-server \
     --region us-central1 \
     --vpc-connector your-connector-name
   ```

3. **Secrets Management**: Use Secret Manager for sensitive data:
   ```bash
   gcloud run services update e2e-mcp-server \
     --region us-central1 \
     --set-secrets "SERVER_COMMAND_PATH=server-command-path:latest"
   ```

## Monitoring and Logging

### View Logs

```bash
gcloud run services logs read e2e-mcp-server \
  --region us-central1 \
  --limit 50
```

### Monitor Metrics

Access Cloud Console:
- Metrics: `https://console.cloud.google.com/run/detail/REGION/e2e-mcp-server/metrics`
- Logs: `https://console.cloud.google.com/run/detail/REGION/e2e-mcp-server/logs`

## Health Checks

The service exposes a `/health` endpoint that returns:

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

## Rollback

If you need to rollback to a previous version:

```bash
# List revisions
gcloud run revisions list --service e2e-mcp-server --region us-central1

# Update to specific revision
gcloud run services update-traffic e2e-mcp-server \
  --region us-central1 \
  --to-revisions REVISION_NAME=100
```

## Cost Optimization

1. **Reduce min instances**: Set to 0 to scale to zero when idle
2. **Adjust memory and CPU**: Start with lower values and scale up as needed
3. **Set request timeout**: Lower timeout for faster failure detection
4. **Use Cloud Scheduler**: For periodic health checks instead of keeping instances warm

## Troubleshooting

### Container fails to start

Check the logs:
```bash
gcloud run services logs read e2e-mcp-server --region us-central1 --limit 100
```

### Out of memory errors

Increase memory allocation:
```bash
gcloud run services update e2e-mcp-server \
  --region us-central1 \
  --memory 4Gi
```

### Timeout errors

Increase timeout or optimize your server command:
```bash
gcloud run services update e2e-mcp-server \
  --region us-central1 \
  --timeout 3600
```
