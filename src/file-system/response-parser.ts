import { FileOperation, ValidationResult, CodeBlock } from "./types.js";

/**
 * Response Parser for BradyAI File System Operations
 * Extracts file operations from AI model responses and validates them.
 */
export class ResponseParser {
  private codeBlockRegex = /```(\w+)?\s*(?:(?:file|path|filename):\s*([^\n]+)\s*)?\n([\s\S]*?)```/gi;
  private fileOperationRegex = /(?:create|write|save|update)\s+(?:file|to)\s+([^\s]+)/gi;

  /**
   * Parse file operations from AI response text.
   * @param response The AI response text to parse.
   * @returns Array of file operations found.
   */
  parseFileOperations(response: string): FileOperation[] {
    const operations: FileOperation[] = [];
    const codeBlocks = this.extractCodeBlocks(response);

    // Extract operations from code blocks
    for (const block of codeBlocks) {
      if (block.filename) {
        operations.push({
          type: "create",
          path: block.filename,
          content: block.content,
          encoding: "utf8",
          createDirs: true,
        });
      }
    }

    // Extract operations from natural language instructions
    const matches = [...response.matchAll(this.fileOperationRegex)];
    for (const match of matches) {
      const path = match[1];
      if (path) {
        operations.push({
          type: "create",
          path: path,
          content: "", // Will need to be filled from context
          encoding: "utf8",
          createDirs: true,
        });
      }
    }

    return operations;
  }

  /**
   * Extract code blocks from response text.
   * @param response The response text to extract from.
   * @returns Array of code blocks found.
   */
  extractCodeBlocks(response: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    const matches = [...response.matchAll(this.codeBlockRegex)];

    for (const match of matches) {
      const [, language, filename, content] = match;
      blocks.push({
        language: language || "text",
        content: content.trim(),
        filename: filename?.trim(),
      });
    }

    return blocks;
  }

  /**
   * Validate parsed file operations.
   * @param operations Array of file operations to validate.
   * @returns Validation result.
   */
  validateOperations(operations: FileOperation[]): ValidationResult {
    const warnings: string[] = [];

    for (const operation of operations) {
      // Check for empty paths
      if (!operation.path || operation.path.trim() === "") {
        return { valid: false, error: "Empty file path detected" };
      }

      // Check for missing content in create operations
      if (operation.type === "create" && (!operation.content || operation.content.trim() === "")) {
        warnings.push(`Create operation for ${operation.path} has empty content`);
      }

      // Check for reasonable file extensions
      const ext = operation.path.split('.').pop();
      if (ext && !this.isValidExtension(ext)) {
        warnings.push(`Unusual file extension detected: ${ext}`);
      }
    }

    return { valid: true, warnings };
  }

  /**
   * Check if file extension is commonly allowed.
   * @param extension The file extension to check.
   * @returns Boolean indicating if extension is valid.
   */
  private isValidExtension(extension: string): boolean {
    const allowedExtensions = [
      'ts', 'tsx', 'js', 'jsx', 'json', 'md', 'txt', 'yml', 'yaml',
      'css', 'scss', 'html', 'xml', 'py', 'sh', 'env', 'gitignore'
    ];
    return allowedExtensions.includes(extension.toLowerCase());
  }
}
