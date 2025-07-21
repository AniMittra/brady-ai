import * as fs from "fs/promises";
import * as path from "path";
import {
  FileOperation,
  ExecutionResult,
  BatchResult,
  FileSystemError,
  FileSystemErrorType,
} from "./types.js";

/**
 * File System Executor for BradyAI File System Operations
 * Executes validated file operations safely with backup and rollback capabilities.
 */
export class FileSystemExecutor {
  private backupDirectory = ".bradyai-backups";
  private operationCounter = 0;

  constructor(backupDir?: string) {
    if (backupDir) {
      this.backupDirectory = backupDir;
    }
  }

  /**
   * Execute a single file operation.
   * @param operation The file operation to execute.
   * @returns Promise<ExecutionResult> Result of the operation.
   */
  async executeOperation(operation: FileOperation): Promise<ExecutionResult> {
    const startTime = Date.now();
    const operationId = `op-${++this.operationCounter}-${startTime}`;

    try {
      let backupPath: string | undefined;
      let bytesWritten = 0;

      // Create backup if file exists and backup is enabled
      if (
        operation.backup !== false &&
        (await this.fileExists(operation.path))
      ) {
        backupPath = await this.createBackup(operation.path);
      }

      // Create directories if needed
      if (operation.createDirs !== false) {
        await this.ensureDirectoryExists(path.dirname(operation.path));
      }

      // Execute operation based on type
      switch (operation.type) {
        case "create":
        case "update":
          bytesWritten = await this.writeFile(
            operation.path,
            operation.content || "",
            operation.encoding,
          );
          break;
        case "delete":
          await this.deleteFile(operation.path);
          break;
        case "move":
          // Move operations would need destination path - simplified for now
          throw new FileSystemError(
            FileSystemErrorType.OPERATION_FAILED,
            "Move operation not implemented",
            operation,
          );
        case "copy":
          // Copy operations would need destination path - simplified for now
          throw new FileSystemError(
            FileSystemErrorType.OPERATION_FAILED,
            "Copy operation not implemented",
            operation,
          );
        default:
          throw new FileSystemError(
            FileSystemErrorType.OPERATION_FAILED,
            `Unknown operation type: ${String(operation.type) || "undefined"}`,
            operation,
          );
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        operationId,
        path: operation.path,
        operation,
        duration,
        bytesWritten,
        backupPath,
        timestamp: startTime,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      return {
        success: false,
        operationId,
        path: operation.path,
        operation,
        duration,
        error: errorMessage,
        timestamp: startTime,
      };
    }
  }

  /**
   * Execute multiple file operations as a batch.
   * @param operations Array of file operations to execute.
   * @returns Promise<BatchResult> Result of the batch operation.
   */
  async executeBatch(operations: FileOperation[]): Promise<BatchResult> {
    const startTime = Date.now();
    const results: ExecutionResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const operation of operations) {
      try {
        const result = await this.executeOperation(operation);
        results.push(result);

        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        failureCount++;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        results.push({
          success: false,
          operationId: `batch-error-${Date.now()}`,
          path: operation.path,
          operation,
          duration: 0,
          error: errorMessage,
          timestamp: Date.now(),
        });
      }
    }

    const totalDuration = Date.now() - startTime;

    return {
      successCount,
      failureCount,
      operations: results,
      totalDuration,
    };
  }

  /**
   * Create a backup of an existing file.
   * @param filePath Path to the file to backup.
   * @returns Promise<string> Path to the backup file.
   */
  async createBackup(filePath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFileName = `${path.basename(filePath)}.${timestamp}.backup`;
    const backupPath = path.join(this.backupDirectory, backupFileName);

    // Ensure backup directory exists
    await this.ensureDirectoryExists(this.backupDirectory);

    // Copy file to backup location
    await fs.copyFile(filePath, backupPath);

    return backupPath;
  }

  /**
   * Rollback operations using backup files.
   * @param operationId ID of the operation to rollback.
   * @returns Promise<void>
   */
  async rollback(_operationId: string): Promise<void> {
    // Implementation would track operations and their backups
    // Simplified for now
    throw new Error("Rollback not implemented yet");
  }

  /**
   * Write content to a file.
   * @param filePath Path where to write the file.
   * @param content Content to write.
   * @param encoding Encoding to use (default: utf8).
   * @returns Promise<number> Number of bytes written.
   */
  private async writeFile(
    filePath: string,
    content: string,
    encoding: "utf8" | "base64" = "utf8",
  ): Promise<number> {
    if (encoding === "base64") {
      const buffer = Buffer.from(content, "base64");
      await fs.writeFile(filePath, buffer);
      return buffer.length;
    } else {
      await fs.writeFile(filePath, content, "utf8");
      return Buffer.byteLength(content, "utf8");
    }
  }

  /**
   * Delete a file.
   * @param filePath Path to the file to delete.
   * @returns Promise<void>
   */
  private async deleteFile(filePath: string): Promise<void> {
    await fs.unlink(filePath);
  }

  /**
   * Check if a file exists.
   * @param filePath Path to check.
   * @returns Promise<boolean> True if file exists.
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure a directory exists, creating it if necessary.
   * @param dirPath Path to the directory.
   * @returns Promise<void>
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (_error) {
      // Directory might already exist, check if it's accessible
      try {
        await fs.access(dirPath);
      } catch {
        throw new Error(`Unable to create or access directory: ${dirPath}`);
      }
    }
  }
}
