import { describe, it, expect, beforeEach } from '@jest/globals';
import { HealthMonitor, MetricsCollector } from './health.js';

describe('Health Monitor', () => {
  describe('HealthMonitor', () => {
    let monitor: HealthMonitor;

    beforeEach(() => {
      monitor = new HealthMonitor();
    });

    it('should return health status with active sessions count', () => {
      const health = monitor.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.activeSessions).toBe(0);
      expect(health.timestamp).toBeDefined();
    });

    it('should include memory usage in health status', () => {
      const health = monitor.getHealth();

      expect(health.memory).toBeDefined();
      expect(health.memory.heapUsed).toBeGreaterThan(0);
      expect(health.memory.heapTotal).toBeGreaterThan(0);
      expect(health.memory.rss).toBeGreaterThan(0);
      expect(health.memory.external).toBeGreaterThanOrEqual(0);
    });

    it('should track active sessions', () => {
      monitor.incrementActiveSessions();
      monitor.incrementActiveSessions();

      const health = monitor.getHealth();
      expect(health.activeSessions).toBe(2);

      monitor.decrementActiveSessions();
      const health2 = monitor.getHealth();
      expect(health2.activeSessions).toBe(1);
    });

    it('should not allow negative active sessions', () => {
      monitor.decrementActiveSessions();

      const health = monitor.getHealth();
      expect(health.activeSessions).toBe(0);
    });

    it('should include uptime in health status', () => {
      const health = monitor.getHealth();

      expect(health.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('MetricsCollector', () => {
    let collector: MetricsCollector;

    beforeEach(() => {
      collector = new MetricsCollector();
    });

    it('should record successful tool calls', () => {
      collector.recordToolCall('navigate', true, 150);
      collector.recordToolCall('click', true, 200);

      const metrics = collector.getMetrics();

      expect(metrics.toolCalls.total).toBe(2);
      expect(metrics.toolCalls.successful).toBe(2);
      expect(metrics.toolCalls.failed).toBe(0);
      expect(metrics.toolCalls.successRate).toBe(1.0);
    });

    it('should record failed tool calls', () => {
      collector.recordToolCall('navigate', true, 150);
      collector.recordToolCall('click', false, 200);
      collector.recordToolCall('type', false, 100);

      const metrics = collector.getMetrics();

      expect(metrics.toolCalls.total).toBe(3);
      expect(metrics.toolCalls.successful).toBe(1);
      expect(metrics.toolCalls.failed).toBe(2);
      expect(metrics.toolCalls.successRate).toBeCloseTo(0.333, 2);
    });

    it('should calculate average response time', () => {
      collector.recordToolCall('navigate', true, 100);
      collector.recordToolCall('click', true, 200);
      collector.recordToolCall('type', true, 300);

      const metrics = collector.getMetrics();

      expect(metrics.toolCalls.averageResponseTime).toBe(200);
    });

    it('should track error rate', () => {
      collector.recordToolCall('navigate', true, 100);
      collector.recordToolCall('click', false, 200);
      collector.recordToolCall('type', false, 100);
      collector.recordToolCall('screenshot', true, 150);

      const metrics = collector.getMetrics();

      expect(metrics.toolCalls.errorRate).toBe(0.5);
    });

    it('should handle zero tool calls', () => {
      const metrics = collector.getMetrics();

      expect(metrics.toolCalls.total).toBe(0);
      expect(metrics.toolCalls.successful).toBe(0);
      expect(metrics.toolCalls.failed).toBe(0);
      expect(metrics.toolCalls.successRate).toBe(0);
      expect(metrics.toolCalls.averageResponseTime).toBe(0);
      expect(metrics.toolCalls.errorRate).toBe(0);
    });

    it('should track metrics by tool name', () => {
      collector.recordToolCall('navigate', true, 100);
      collector.recordToolCall('navigate', true, 200);
      collector.recordToolCall('navigate', false, 150);
      collector.recordToolCall('click', true, 50);

      const metrics = collector.getMetrics();

      expect(metrics.byTool.navigate).toBeDefined();
      expect(metrics.byTool.navigate.total).toBe(3);
      expect(metrics.byTool.navigate.successful).toBe(2);
      expect(metrics.byTool.navigate.failed).toBe(1);
      expect(metrics.byTool.navigate.averageResponseTime).toBeCloseTo(150, 0);

      expect(metrics.byTool.click).toBeDefined();
      expect(metrics.byTool.click.total).toBe(1);
      expect(metrics.byTool.click.successful).toBe(1);
    });

    it('should reset metrics', () => {
      collector.recordToolCall('navigate', true, 100);
      collector.recordToolCall('click', true, 200);

      collector.reset();

      const metrics = collector.getMetrics();
      expect(metrics.toolCalls.total).toBe(0);
      expect(Object.keys(metrics.byTool).length).toBe(0);
    });

    it('should include timestamp in metrics', () => {
      const metrics = collector.getMetrics();

      expect(metrics.timestamp).toBeDefined();
      expect(typeof metrics.timestamp).toBe('string');
    });

    it('should calculate min and max response times', () => {
      collector.recordToolCall('navigate', true, 100);
      collector.recordToolCall('click', true, 500);
      collector.recordToolCall('type', true, 200);

      const metrics = collector.getMetrics();

      expect(metrics.toolCalls.minResponseTime).toBe(100);
      expect(metrics.toolCalls.maxResponseTime).toBe(500);
    });
  });
});
