/**
 * Memory usage information
 */
export interface MemoryUsage {
  heapUsed: number; // bytes
  heapTotal: number; // bytes
  rss: number; // bytes
  external: number; // bytes
}

/**
 * Health status response
 */
export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  activeSessions: number;
  memory: MemoryUsage;
  uptime: number; // seconds
  timestamp: string; // ISO 8601
}

/**
 * Tool call metrics
 */
export interface ToolMetrics {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
  errorRate: number;
  averageResponseTime: number; // milliseconds
  minResponseTime?: number; // milliseconds
  maxResponseTime?: number; // milliseconds
}

/**
 * Metrics by tool name
 */
export interface ToolMetricsByName {
  [toolName: string]: ToolMetrics;
}

/**
 * Metrics response
 */
export interface Metrics {
  toolCalls: ToolMetrics;
  byTool: ToolMetricsByName;
  timestamp: string; // ISO 8601
}

/**
 * Health monitor for tracking server health
 */
export class HealthMonitor {
  private activeSessions: number = 0;
  private readonly startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Increment active sessions count
   */
  incrementActiveSessions(): void {
    this.activeSessions++;
  }

  /**
   * Decrement active sessions count
   */
  decrementActiveSessions(): void {
    this.activeSessions = Math.max(0, this.activeSessions - 1);
  }

  /**
   * Get current health status
   */
  getHealth(): HealthStatus {
    const memUsage = process.memoryUsage();

    return {
      status: 'healthy',
      activeSessions: this.activeSessions,
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
        external: memUsage.external,
      },
      uptime: (Date.now() - this.startTime) / 1000, // Convert to seconds
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Tool call record
 */
interface ToolCallRecord {
  toolName: string;
  success: boolean;
  responseTime: number; // milliseconds
}

/**
 * Metrics collector for tracking tool call metrics
 */
export class MetricsCollector {
  private readonly records: ToolCallRecord[] = [];

  /**
   * Record a tool call
   * @param toolName Name of the tool
   * @param success Whether the call succeeded
   * @param responseTime Response time in milliseconds
   */
  recordToolCall(toolName: string, success: boolean, responseTime: number): void {
    this.records.push({ toolName, success, responseTime });
  }

  /**
   * Calculate metrics for a set of records
   */
  private calculateMetrics(records: ToolCallRecord[]): ToolMetrics {
    if (records.length === 0) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        successRate: 0,
        errorRate: 0,
        averageResponseTime: 0,
      };
    }

    const successful = records.filter((r) => r.success).length;
    const failed = records.length - successful;
    const responseTimes = records.map((r) => r.responseTime);

    return {
      total: records.length,
      successful,
      failed,
      successRate: successful / records.length,
      errorRate: failed / records.length,
      averageResponseTime:
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
    };
  }

  /**
   * Get current metrics
   */
  getMetrics(): Metrics {
    // Calculate overall metrics
    const toolCalls = this.calculateMetrics(this.records);

    // Calculate metrics by tool name
    const byTool: ToolMetricsByName = {};
    const toolNames = [...new Set(this.records.map((r) => r.toolName))];

    for (const toolName of toolNames) {
      const toolRecords = this.records.filter((r) => r.toolName === toolName);
      byTool[toolName] = this.calculateMetrics(toolRecords);
    }

    return {
      toolCalls,
      byTool,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.records.length = 0;
  }
}
