import express from 'express';
import { getConfig } from './config/env.js';
import { HealthMonitor } from './monitoring/health.js';
import { createLogger } from './logging/logger.js';

const config = getConfig();
const logger = createLogger('server');
const healthMonitor = new HealthMonitor();

const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  const health = healthMonitor.getHealth();
  res.json(health);
});

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'E2E MCP Server',
    version: '1.0.0',
    status: 'running',
  });
});

// Start server
const server = app.listen(config.port, () => {
  logger.info('Server started', {
    details: {
      port: config.port,
      nodeEnv: config.nodeEnv,
      sessionTimeout: config.sessionTimeout,
    },
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export { app, server };
