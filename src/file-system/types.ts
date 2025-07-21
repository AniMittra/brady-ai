/**
 * Core types and interfaces for BradyAI File System Operations
 * Provides type safety for secure file operations
 */

export interface FileOperation {
  type: "create" | "update" | "delete" | "move" | "copy";
  path: string;
  content?: string;
  encoding?: "utf8" | "base64";
  permissions?: string;
  createDirs?: boolean;
  backup?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

export interface SecurityResult {
  valid: boolean;
  error?: string;
  securityFlags?: string[];
}

export interface ScanResult {
  safe: boolean;
  threat?: string;
  pattern?: string;
  severity?: "low" | "medium" | "high" | "critical";
}

export interface ExecutionResult {
  success: boolean;
  operationId: string;
  path: string;
  operation: FileOperation;
  duration: number;
  bytesWritten?: number;
  backupPath?: string;
  error?: string;
  timestamp: number;
}

export interface BatchResult {
  successCount: number;
  failureCount: number;
  operations: ExecutionResult[];
  totalDuration: number;
  rollbackId?: string;
}

export interface SecurityConfig {
  allowedPaths: string[];
  forbiddenPaths: string[];
  maxFileSize: number;
  allowedExtensions: string[];
  forbiddenPatterns: RegExp[];
  scanContent: boolean;
  enableBackups: boolean;
}

export interface FileSystemConfig {
  enabled: boolean;
  security: SecurityConfig;
  backup: {
    enabled: boolean;
    retentionDays: number;
    maxBackups: number;
    directory: string;
  };
  monitoring: {
    logLevel: "debug" | "info" | "warn" | "error";
    enableMetrics: boolean;
    alertOnViolations: boolean;
  };
}

export interface FileOperationLog {
  id: string;
  timestamp: number;
  agent: string;
  operation: FileOperation;
  result: "success" | "failure" | "blocked";
  duration: number;
  error?: string;
  securityFlags?: string[];
  ipAddress?: string;
  userAgent?: string;
}

export interface FileSystemMetrics {
  operationsPerHour: number;
  successRate: number;
  securityViolations: number;
  averageFileSize: number;
  topAgents: Array<{ agent: string; operations: number }>;
  topDirectories: Array<{ path: string; operations: number }>;
  lastUpdated: number;
}

export interface CodeBlock {
  language: string;
  content: string;
  filename?: string;
  startLine?: number;
  endLine?: number;
}

export interface RecoveryResult {
  action: "block" | "truncate" | "retry" | "fail";
  notify: boolean;
  maxSize?: number;
  withElevation?: boolean;
  message?: string;
}

export interface SecurityScanResult extends ScanResult {
  detectedPatterns: Array<{
    pattern: string;
    matches: number;
    severity: "low" | "medium" | "high" | "critical";
  }>;
  recommendations: string[];
}

export interface TimeRange {
  start: number;
  end: number;
}

export interface LogFilters {
  agent?: string;
  result?: "success" | "failure" | "blocked";
  timeRange?: TimeRange;
  operation?: FileOperation["type"];
}

export interface SecurityReport {
  totalOperations: number;
  blockedOperations: number;
  securityViolations: Array<{
    type: string;
    count: number;
    lastOccurrence: number;
    severity: "low" | "medium" | "high" | "critical";
  }>;
  riskScore: number;
  recommendations: string[];
  generatedAt: number;
}

export interface DashboardData {
  metrics: FileSystemMetrics;
  recentOperations: FileOperationLog[];
  securitySummary: SecurityReport;
  systemHealth: {
    status: "healthy" | "warning" | "error";
    diskUsage: number;
    memoryUsage: number;
    lastBackup: number;
  };
}

export enum FileSystemErrorType {
  SECURITY_VIOLATION = "SECURITY_VIOLATION",
  PATH_NOT_ALLOWED = "PATH_NOT_ALLOWED",
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  DISK_FULL = "DISK_FULL",
  MALICIOUS_CONTENT = "MALICIOUS_CONTENT",
  OPERATION_FAILED = "OPERATION_FAILED",
  INVALID_PATH = "INVALID_PATH",
  BACKUP_FAILED = "BACKUP_FAILED",
  ROLLBACK_FAILED = "ROLLBACK_FAILED",
}

export class FileSystemError extends Error {
  constructor(
    public type: FileSystemErrorType,
    public message: string,
    public operation: FileOperation,
    public details?: any
  ) {
    super(message);
    this.name = "FileSystemError";
  }
}
