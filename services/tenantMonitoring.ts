/**
 * Tenant Monitoring & Logging Service
 * 
 * Provides comprehensive monitoring and logging for tenant operations,
 * security events, and system health tracking.
 */

import { addDoc, collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

// Log levels
export enum LogLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
  SECURITY = 'SECURITY'
}

// Log categories
export enum LogCategory {
  TENANT_OPERATION = 'TENANT_OPERATION',
  USER_OPERATION = 'USER_OPERATION',
  DATA_ACCESS = 'DATA_ACCESS',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  SECURITY_EVENT = 'SECURITY_EVENT',
  PERFORMANCE = 'PERFORMANCE',
  ERROR = 'ERROR'
}

// System log interface
export interface SystemLog {
  id?: string;
  tenantId?: string;
  userId?: string;
  userEmail?: string;
  level: LogLevel;
  category: LogCategory;
  operation: string;
  message: string;
  metadata?: Record<string, any>;
  timestamp: number;
  ipAddress?: string;
  userAgent?: string;
}

// Performance metric interface
export interface PerformanceMetric {
  id?: string;
  tenantId: string;
  metricType: 'api_response' | 'page_load' | 'database_query' | 'function_execution';
  operation: string;
  duration: number; // milliseconds
  success: boolean;
  errorMessage?: string;
  timestamp: number;
}

// Security event interface
export interface SecurityEvent {
  id?: string;
  tenantId?: string;
  userId?: string;
  eventType: 'login_attempt' | 'login_success' | 'login_failure' | 'logout' | 
              'permission_denied' | 'unauthorized_access' | 'suspicious_activity';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
  timestamp: number;
  ipAddress?: string;
}

// Tenant health metrics
export interface TenantHealthMetrics {
  tenantId: string;
  activeUsers: number;
  totalUsers: number;
  reportsSubmittedToday: number;
  tasksCreatedToday: number;
  avgResponseTime: number; // milliseconds
  errorRate: number; // percentage
  lastUpdated: number;
}

/**
 * Log a system event
 * GRACEFUL DEGRADATION: Fails silently if Firestore write fails (non-blocking)
 */
export const logSystemEvent = async (logData: Omit<SystemLog, 'timestamp' | 'id'>): Promise<void> => {
  try {
    const log: SystemLog = {
      ...logData,
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    };

    // Log to Firestore (non-blocking, fail gracefully)
    try {
      await addDoc(collection(db, 'systemLogs'), log);
    } catch (firestoreError: any) {
      // Silently fail - monitoring is optional and should never block user operations
      // Only log permission errors to console, not other errors to avoid noise
      if (firestoreError?.code === 'permission-denied') {
        console.debug('[Monitoring] System logs disabled (permission-denied)');
      }
    }

    // Also log to console for development
    const logMethod = getConsoleMethod(log.level);
    console[logMethod](`[${log.level}] [${log.category}] ${log.operation}: ${log.message}`, log.metadata);

    // For critical errors, also send to error tracking service (e.g., Sentry)
    if (log.level === LogLevel.CRITICAL || log.level === LogLevel.ERROR) {
      // TODO: Integrate with error tracking service
      console.error('CRITICAL ERROR:', log);
    }
  } catch (error) {
    // Fail silently - monitoring should never block user operations
    console.debug('Failed to log system event:', error);
  }
};

/**
 * Log a security event
 * GRACEFUL DEGRADATION: Fails silently if Firestore write fails (non-blocking)
 */
export const logSecurityEvent = async (eventData: Omit<SecurityEvent, 'timestamp' | 'id'>): Promise<void> => {
  try {
    const event: SecurityEvent = {
      ...eventData,
      timestamp: Date.now()
    };

    // Log to Firestore (non-blocking, fail gracefully)
    try {
      await addDoc(collection(db, 'securityEvents'), event);
    } catch (firestoreError: any) {
      // Silently fail - monitoring is optional and should never block user operations
      if (firestoreError?.code === 'permission-denied') {
        console.debug('[Monitoring] Security events disabled (permission-denied)');
      }
    }

    // Also log to system logs (which has its own error handling)
    await logSystemEvent({
      tenantId: eventData.tenantId,
      userId: eventData.userId,
      level: getSeverityLogLevel(eventData.severity),
      category: LogCategory.SECURITY_EVENT,
      operation: eventData.eventType,
      message: eventData.description,
      metadata: eventData.metadata
    });

    // Alert for high/critical security events
    if (event.severity === 'high' || event.severity === 'critical') {
      console.warn('🚨 SECURITY ALERT:', event);
      // TODO: Send alert to security team
    }
  } catch (error) {
    // Fail silently - monitoring should never block user operations
    console.debug('Failed to log security event:', error);
  }
};

/**
 * Track performance metric
 * GRACEFUL DEGRADATION: Fails silently if Firestore write fails (non-blocking)
 */
export const trackPerformance = async (metricData: Omit<PerformanceMetric, 'timestamp' | 'id'>): Promise<void> => {
  try {
    const metric: PerformanceMetric = {
      ...metricData,
      timestamp: Date.now()
    };

    // Log to Firestore (non-blocking, fail gracefully)
    try {
      await addDoc(collection(db, 'performanceMetrics'), metric);
    } catch (firestoreError: any) {
      // Silently fail - monitoring is optional and should never block user operations
      if (firestoreError?.code === 'permission-denied') {
        console.debug('[Monitoring] Performance metrics disabled (permission-denied)');
      }
    }

    // Log slow operations
    if (metric.duration > 3000) { // > 3 seconds
      await logSystemEvent({
        tenantId: metric.tenantId,
        level: LogLevel.WARNING,
        category: LogCategory.PERFORMANCE,
        operation: metric.operation,
        message: `Slow operation detected: ${metric.duration}ms`,
        metadata: { duration: metric.duration, success: metric.success }
      });
    }

    // Log failed operations
    if (!metric.success) {
      await logSystemEvent({
        tenantId: metric.tenantId,
        level: LogLevel.ERROR,
        category: LogCategory.PERFORMANCE,
        operation: metric.operation,
        message: `Operation failed: ${metric.errorMessage}`,
        metadata: { duration: metric.duration, error: metric.errorMessage }
      });
    }
  } catch (error) {
    // Fail silently - monitoring should never block user operations
    console.debug('Failed to track performance:', error);
  }
};

/**
 * Get system logs for a tenant
 */
export const getTenantLogs = async (
  tenantId: string,
  options?: {
    level?: LogLevel;
    category?: LogCategory;
    limit?: number;
  }
): Promise<SystemLog[]> => {
  try {
    let q = query(
      collection(db, 'systemLogs'),
      where('tenantId', '==', tenantId),
      orderBy('timestamp', 'desc')
    );

    if (options?.level) {
      q = query(q, where('level', '==', options.level));
    }

    if (options?.category) {
      q = query(q, where('category', '==', options.category));
    }

    if (options?.limit) {
      q = query(q, limit(options.limit));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemLog));
  } catch (error) {
    console.error('Failed to get tenant logs:', error);
    return [];
  }
};

/**
 * Get security events for a tenant
 */
export const getTenantSecurityEvents = async (
  tenantId: string,
  options?: {
    severity?: 'low' | 'medium' | 'high' | 'critical';
    limit?: number;
  }
): Promise<SecurityEvent[]> => {
  try {
    let q = query(
      collection(db, 'securityEvents'),
      where('tenantId', '==', tenantId),
      orderBy('timestamp', 'desc')
    );

    if (options?.severity) {
      q = query(q, where('severity', '==', options.severity));
    }

    if (options?.limit) {
      q = query(q, limit(options.limit));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SecurityEvent));
  } catch (error) {
    console.error('Failed to get security events:', error);
    return [];
  }
};

/**
 * Get tenant health metrics
 */
export const getTenantHealthMetrics = async (tenantId: string): Promise<TenantHealthMetrics | null> => {
  try {
    // This would typically aggregate data from various collections
    // For now, returning a placeholder
    // TODO: Implement actual aggregation logic

    return {
      tenantId,
      activeUsers: 0,
      totalUsers: 0,
      reportsSubmittedToday: 0,
      tasksCreatedToday: 0,
      avgResponseTime: 0,
      errorRate: 0,
      lastUpdated: Date.now()
    };
  } catch (error) {
    console.error('Failed to get tenant health metrics:', error);
    return null;
  }
};

/**
 * Monitor tenant operation
 * Wraps a function with automatic logging and performance tracking
 */
export const monitorOperation = async <T>(
  operation: string,
  tenantId: string,
  fn: () => Promise<T>,
  options?: {
    logLevel?: LogLevel;
    category?: LogCategory;
  }
): Promise<T> => {
  const startTime = Date.now();
  const logLevel = options?.logLevel || LogLevel.INFO;
  const category = options?.category || LogCategory.TENANT_OPERATION;

  try {
    // Execute the operation
    const result = await fn();
    const duration = Date.now() - startTime;

    // Log success
    await logSystemEvent({
      tenantId,
      level: logLevel,
      category,
      operation,
      message: `Operation completed successfully`,
      metadata: { duration }
    });

    // Track performance
    await trackPerformance({
      tenantId,
      metricType: 'function_execution',
      operation,
      duration,
      success: true
    });

    return result;
  } catch (error: any) {
    const duration = Date.now() - startTime;

    // Log error
    await logSystemEvent({
      tenantId,
      level: LogLevel.ERROR,
      category,
      operation,
      message: `Operation failed: ${error.message}`,
      metadata: { duration, error: error.toString() }
    });

    // Track failed performance
    await trackPerformance({
      tenantId,
      metricType: 'function_execution',
      operation,
      duration,
      success: false,
      errorMessage: error.message
    });

    throw error;
  }
};

/**
 * Helper: Get console method based on log level
 */
const getConsoleMethod = (level: LogLevel): 'log' | 'warn' | 'error' => {
  switch (level) {
    case LogLevel.ERROR:
    case LogLevel.CRITICAL:
      return 'error';
    case LogLevel.WARNING:
    case LogLevel.SECURITY:
      return 'warn';
    default:
      return 'log';
  }
};

/**
 * Helper: Convert severity to log level
 */
const getSeverityLogLevel = (severity: 'low' | 'medium' | 'high' | 'critical'): LogLevel => {
  switch (severity) {
    case 'critical':
      return LogLevel.CRITICAL;
    case 'high':
      return LogLevel.ERROR;
    case 'medium':
      return LogLevel.WARNING;
    default:
      return LogLevel.INFO;
  }
};

/**
 * Initialize monitoring for tenant operations
 */
export const initializeTenantMonitoring = (tenantId: string): void => {
  console.log(`🔍 Monitoring initialized for tenant: ${tenantId}`);
  
  // Set up error handlers
  window.addEventListener('error', (event) => {
    logSystemEvent({
      tenantId,
      level: LogLevel.ERROR,
      category: LogCategory.ERROR,
      operation: 'window_error',
      message: event.message,
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.toString()
      }
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logSystemEvent({
      tenantId,
      level: LogLevel.ERROR,
      category: LogCategory.ERROR,
      operation: 'unhandled_promise_rejection',
      message: 'Unhandled promise rejection',
      metadata: {
        reason: event.reason?.toString()
      }
    });
  });

  console.log('✅ Error handlers registered for tenant monitoring');
};
