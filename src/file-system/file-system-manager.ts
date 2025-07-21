import { FileSystemConfig, FileOperation, ExecutionResult, BatchResult, FileSystemError, FileSystemErrorType } from "./types.js";
import { SecurityLayer } from "./security-layer.js";
import { ResponseParser } from "./response-parser.js";
import { FileSystemExecutor } from "./executor.js";

/**
 * FileSystemManager for BradyAI
 * Main class that coordinates file system operations with security and monitoring.
 */
export class FileSystemManager {
  private config: FileSystemConfig;
  private security: SecurityLayer;
  private parser: ResponseParser;
  private executor: FileSystemExecutor;

  constructor(config: FileSystemConfig) {
    this.config = config;
    this.security = new SecurityLayer(config.security);
    this.parser = new ResponseParser();
    this.executor = new FileSystemExecutor(config.backup.directory);
  }

  /**
   * Process an AI response and execute any file operations found.
   * @param response The AI response text to process.
   * @param agentName Name of the agent that generated the response.
   * @returns Promise<BatchResult> Result of processing the response.
   */
  async processResponse(response: string, agentName: string = "unknown"): Promise<BatchResult> {
    if (!this.config.enabled) {
      return {
        successCount: 0,
        failureCount: 0,
        operations: [],
        totalDuration: 0,
      };
    }

    try {
      // Parse file operations from response
      const operations = this.parser.parseFileOperations(response);

      if (operations.length === 0) {
        return {
          successCount: 0,
          failureCount: 0,
          operations: [],
          totalDuration: 0,
        };
      }

      // Validate operations
      const validationResult = this.parser.validateOperations(operations);
      if (!validationResult.valid) {
        throw new FileSystemError(
          FileSystemErrorType.OPERATION_FAILED,
          validationResult.error || "Validation failed",
          operations[0]
        );
      }

      // Security validation for each operation
      const secureOperations: FileOperation[] = [];
      for (const operation of operations) {
        const pathValidation = this.security.validatePath(operation.path);
        if (!pathValidation.valid) {
          throw new FileSystemError(
            FileSystemErrorType.SECURITY_VIOLATION,
            pathValidation.error || "Security validation failed",
            operation
          );
        }

        // Content scanning for create/update operations
        if ((operation.type === "create" || operation.type === "update") && operation.content) {
          const contentScan = this.security.scanForMaliciousContent(operation.content);
          if (!contentScan.safe) {
            throw new FileSystemError(
              FileSystemErrorType.MALICIOUS_CONTENT,
              contentScan.threat || "Malicious content detected",
              operation
            );
          }
        }

        // Check file size limits
        if (operation.content && Buffer.byteLength(operation.content, 'utf8') > this.config.security.maxFileSize) {
          throw new FileSystemError(
            FileSystemErrorType.FILE_TOO_LARGE,
            `File size exceeds limit of ${this.config.security.maxFileSize} bytes`,
            operation
          );
        }

        secureOperations.push(operation);
      }

      // Execute validated operations
      return await this.executor.executeBatch(secureOperations);

    } catch (error) {
      // Log security violations and errors
      if (error instanceof FileSystemError) {
        await this.logSecurityViolation(error, agentName);
      }

      // Return failure result
      return {
        successCount: 0,
        failureCount: 1,
        operations: [{
          success: false,
          operationId: `error-${Date.now()}`,
          path: "unknown",
          operation: { type: "create", path: "unknown" },
          duration: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
        }],
        totalDuration: 0,
      };
    }
  }

  /**
   * Execute a single validated file operation.
   * @param operation The file operation to execute.
   * @returns Promise<ExecutionResult> Result of the operation.
   */
  async executeOperation(operation: FileOperation): Promise<ExecutionResult> {
    if (!this.config.enabled) {
      throw new FileSystemError(
        FileSystemErrorType.OPERATION_FAILED,
        "File system operations are disabled",
        operation
      );
    }

    // Security validation
    const pathValidation = this.security.validatePath(operation.path);
    if (!pathValidation.valid) {
      throw new FileSystemError(
        FileSystemErrorType.SECURITY_VIOLATION,
        pathValidation.error || "Security validation failed",
        operation
      );
    }

    // Content scanning for create/update operations
    if ((operation.type === "create" || operation.type === "update") && operation.content) {
      const contentScan = this.security.scanForMaliciousContent(operation.content);
      if (!contentScan.safe) {
        throw new FileSystemError(
          FileSystemErrorType.MALICIOUS_CONTENT,
          contentScan.threat || "Malicious content detected",
          operation
        );
      }
    }

    // Execute the operation
    return await this.executor.executeOperation(operation);
  }

  /**
   * Get current configuration.
   * @returns FileSystemConfig Current configuration.
   */
  getConfig(): FileSystemConfig {
    return { ...this.config };
  }

  /**
   * Update configuration.
   * @param newConfig New configuration to apply.
   */
  updateConfig(newConfig: Partial<FileSystemConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.security = new SecurityLayer(this.config.security);
  }

  /**
   * Log security violations for monitoring.
   * @param error The security error to log.
   * @param agentName Name of the agent that triggered the violation.
   */
  private async logSecurityViolation(error: FileSystemError, agentName: string): Promise<void> {
    // In a real implementation, this would log to a proper monitoring system
    console.error(`[SECURITY VIOLATION] Agent: ${agentName}, Error: ${error.type}, Message: ${error.message}`);
    
    if (this.config.monitoring.alertOnViolations) {
      // Would trigger alerts in a real system
      console.warn(`[ALERT] Security violation detected for agent ${agentName}`);
    }
  }

  /**
   * Create a backup of a file.
   * @param filePath Path to the file to backup.
   * @returns Promise<string> Path to the backup file.
   */
  async createBackup(filePath: string): Promise<string> {
    return await this.executor.createBackup(filePath);
  }
}
