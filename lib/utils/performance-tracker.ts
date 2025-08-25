/**
 * Performance tracking utility using the existing logger system
 * Provides consistent timing measurements across localhost and Vercel
 */

import { createLogger, Logger } from './logger';

export class PerformanceTracker {
  private static instance: PerformanceTracker;
  private logger: Logger;
  private timers: Map<string, number> = new Map();
  private metrics: Map<string, number[]> = new Map();

  constructor() {
    this.logger = createLogger('PERF');
  }

  static getInstance(): PerformanceTracker {
    if (!PerformanceTracker.instance) {
      PerformanceTracker.instance = new PerformanceTracker();
    }
    return PerformanceTracker.instance;
  }

  /**
   * Start timing an operation
   */
  start(operation: string, metadata?: any): void {
    const startTime = Date.now();
    this.timers.set(operation, startTime);
    
    this.logger.debug(`Started: ${operation}`, metadata);
  }

  /**
   * End timing an operation and log the duration
   */
  end(operation: string, metadata?: any): number {
    const startTime = this.timers.get(operation);
    if (!startTime) {
      this.logger.warn(`No start time found for operation: ${operation}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(operation);

    // Store metric for aggregation
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(duration);

    // Log with INFO level so it shows by default
    this.logger.info(`${operation}: ${duration}ms`, metadata);

    return duration;
  }

  /**
   * Measure an async operation
   */
  async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: any
  ): Promise<T> {
    this.start(operation, metadata);
    try {
      const result = await fn();
      this.end(operation, { ...metadata, success: true });
      return result;
    } catch (error) {
      this.end(operation, { ...metadata, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Measure a sync operation
   */
  measureSync<T>(
    operation: string,
    fn: () => T,
    metadata?: any
  ): T {
    this.start(operation, metadata);
    try {
      const result = fn();
      this.end(operation, { ...metadata, success: true });
      return result;
    } catch (error) {
      this.end(operation, { ...metadata, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Get average duration for an operation
   */
  getAverage(operation: string): number | null {
    const metrics = this.metrics.get(operation);
    if (!metrics || metrics.length === 0) {
      return null;
    }
    const sum = metrics.reduce((a, b) => a + b, 0);
    return Math.round(sum / metrics.length);
  }

  /**
   * Get all metrics for an operation
   */
  getMetrics(operation: string): number[] {
    return this.metrics.get(operation) || [];
  }

  /**
   * Log a summary of all tracked operations
   */
  logSummary(): void {
    this.logger.info('=== Performance Summary ===');
    
    for (const [operation, metrics] of this.metrics.entries()) {
      if (metrics.length === 0) continue;
      
      const avg = this.getAverage(operation)!;
      const min = Math.min(...metrics);
      const max = Math.max(...metrics);
      
      this.logger.info(`${operation}: avg=${avg}ms, min=${min}ms, max=${max}ms, count=${metrics.length}`);
    }
    
    this.logger.info('=========================');
  }

  /**
   * Clear all metrics
   */
  reset(): void {
    this.timers.clear();
    this.metrics.clear();
  }
}

// Export singleton instance for convenience
export const perfTracker = PerformanceTracker.getInstance();

// Export helper functions for common operations
export function trackPerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: any
): Promise<T> {
  return perfTracker.measure(operation, fn, metadata);
}

export function trackPerformanceSync<T>(
  operation: string,
  fn: () => T,
  metadata?: any
): T {
  return perfTracker.measureSync(operation, fn, metadata);
}