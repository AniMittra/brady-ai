import { FileSystemConfig } from "./types.js";

/**
 * Default secure configuration for BradyAI File System
 */
export const DEFAULT_FILE_SYSTEM_CONFIG: FileSystemConfig = {
  enabled: true,
  security: {
    allowedPaths: [
      "src/",
      "docs/",
      "tests/",
      ".kiro/specs/",
      "mcp-orchestrator/src/",
    ],
    forbiddenPaths: [
      "../",
      "/etc/",
      "/usr/",
      "/var/",
      "~/",
      ".env",
      "node_modules/",
      ".git/",
      ".bradyai-backups/",
    ],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedExtensions: [
      "ts", "tsx", "js", "jsx", "json", "md", "txt", "yml", "yaml",
      "css", "scss", "html", "xml", "py", "sh", "env", "gitignore",
      "svg", "png", "jpg", "jpeg", "gif", "ico", "woff", "woff2"
    ],
    forbiddenPatterns: [
      /eval\s*\(/gi,
      /exec\s*\(/gi,
      /system\s*\(/gi,
      /require\s*\(\s*['"]child_process['"]\s*\)/gi,
      /import\s+.*child_process/gi,
      /__import__\s*\(/gi,
      /subprocess\./gi,
      /os\.system/gi,
      /process\.exec/gi,
      /shell_exec/gi,
      /passthru/gi,
      /\$\{.*\}/gi, // Template literal injections
      /document\.write/gi,
      /innerHTML\s*=.*\+/gi, // Potential XSS
    ],
    scanContent: true,
    enableBackups: true,
  },
  backup: {
    enabled: true,
    retentionDays: 30,
    maxBackups: 100,
    directory: ".bradyai-backups",
  },
  monitoring: {
    logLevel: "info",
    enableMetrics: true,
    alertOnViolations: true,
  },
};

/**
 * Create a file system configuration with custom overrides
 * @param overrides Partial configuration to override defaults
 * @returns Complete FileSystemConfig
 */
export function createFileSystemConfig(overrides: Partial<FileSystemConfig> = {}): FileSystemConfig {
  return {
    ...DEFAULT_FILE_SYSTEM_CONFIG,
    ...overrides,
    security: {
      ...DEFAULT_FILE_SYSTEM_CONFIG.security,
      ...overrides.security,
    },
    backup: {
      ...DEFAULT_FILE_SYSTEM_CONFIG.backup,
      ...overrides.backup,
    },
    monitoring: {
      ...DEFAULT_FILE_SYSTEM_CONFIG.monitoring,
      ...overrides.monitoring,
    },
  };
}

/**
 * Validate file system configuration
 * @param config Configuration to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateFileSystemConfig(config: FileSystemConfig): string[] {
  const errors: string[] = [];

  // Check required fields
  if (!config.security) {
    errors.push("Security configuration is required");
    return errors;
  }

  if (!config.security.allowedPaths || config.security.allowedPaths.length === 0) {
    errors.push("At least one allowed path must be specified");
  }

  if (config.security.maxFileSize <= 0) {
    errors.push("Maximum file size must be greater than 0");
  }

  if (config.security.maxFileSize > 100 * 1024 * 1024) {
    errors.push("Maximum file size should not exceed 100MB for security reasons");
  }

  // Check backup configuration
  if (config.backup.enabled && !config.backup.directory) {
    errors.push("Backup directory must be specified when backups are enabled");
  }

  if (config.backup.retentionDays < 1 || config.backup.retentionDays > 365) {
    errors.push("Backup retention days must be between 1 and 365");
  }

  return errors;
}

/**
 * Get a development-friendly configuration (less restrictive)
 * @returns FileSystemConfig for development use
 */
export function createDevelopmentConfig(): FileSystemConfig {
  return createFileSystemConfig({
    security: {
      ...DEFAULT_FILE_SYSTEM_CONFIG.security,
      maxFileSize: 50 * 1024 * 1024, // 50MB for dev
      scanContent: false, // Disable content scanning in dev
    },
    monitoring: {
      ...DEFAULT_FILE_SYSTEM_CONFIG.monitoring,
      logLevel: "debug",
      alertOnViolations: false,
    },
  });
}

/**
 * Get a production-ready configuration (more restrictive)
 * @returns FileSystemConfig for production use
 */
export function createProductionConfig(): FileSystemConfig {
  return createFileSystemConfig({
    security: {
      ...DEFAULT_FILE_SYSTEM_CONFIG.security,
      maxFileSize: 5 * 1024 * 1024, // 5MB for production
      scanContent: true,
      forbiddenPatterns: [
        ...DEFAULT_FILE_SYSTEM_CONFIG.security.forbiddenPatterns,
        /rm\s+-rf/gi,
        /sudo/gi,
        /chmod\s+777/gi,
        /\.\.\/\.\.\//gi, // Additional path traversal protection
      ],
    },
    monitoring: {
      ...DEFAULT_FILE_SYSTEM_CONFIG.monitoring,
      logLevel: "warn",
      alertOnViolations: true,
    },
  });
}
