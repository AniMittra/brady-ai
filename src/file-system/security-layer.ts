import { SecurityResult, SecurityConfig, ScanResult, SecurityScanResult, FileOperation } from "./types.js";

/**
 * Security Layer for BradyAI File System Operations
 * Provides path validation, content scanning, and permission checks.
 */
export class SecurityLayer {
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  /**
   * Validate file paths to prevent traversal attacks and ensure allowed paths.
   * @param path The file path to validate.
   * @returns SecurityResult indicating validation success or failure.
   */
  validatePath(path: string): SecurityResult {
    // Check for traversal attacks first
    if (path.includes("../") || path.startsWith("/")) {
      return { valid: false, error: "Path traversal detected" };
    }

    // Normalize path after traversal check
    const normalized = path.replace(/^\/+/, '').replace(/\/+$/, '');

    // Check allowed paths
    const isAllowed = this.config.allowedPaths.some((allowed) =>
      normalized.startsWith(allowed),
    );

    if (!isAllowed) {
      return { valid: false, error: "Path not in allowed directories" };
    }

    return { valid: true };
  }

  /**
   * Scan file content for malicious patterns.
   * @param content The file content to scan.
   * @returns ScanResult indicating if content is safe.
   */
  scanForMaliciousContent(content: string): SecurityScanResult {
    const detectedPatterns: Array<{ pattern: string; matches: number; severity: "low" | "medium" | "high" | "critical" }> = [];

    for (const pattern of this.config.forbiddenPatterns) {
      const matches = content.match(pattern)?.length || 0;
      if (matches > 0) {
        detectedPatterns.push({
          pattern: pattern.source,
          matches,
          severity: "high",
        });
      }
    }

    return detectedPatterns.length > 0
      ? {
          safe: false,
          threat: "Potentially malicious code detected",
          detectedPatterns,
          recommendations: detectedPatterns.map(p => `Remove pattern ${p.pattern}`),
        }
      : {
          safe: true,
          detectedPatterns,
          recommendations: [],
        };
  }

  /**
   * Check permissions for a given file operation.
   * @param operation The file operation to check.
   * @returns A boolean indicating if permission is granted.
   */
  checkPermissions(operation: FileOperation): boolean {
    // Simplified for illustration; implement proper permission logic as needed
    return true;
  }
}

