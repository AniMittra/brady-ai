import * as fs from "fs/promises";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * File system utilities for the AI Development Director
 * Provides safe file operations with security validation
 */

// Security: Define allowed file extensions for editing
const ALLOWED_EXTENSIONS = new Set([
  ".js",
  ".ts",
  ".tsx",
  ".jsx",
  ".json",
  ".md",
  ".txt",
  ".css",
  ".scss",
  ".html",
  ".xml",
  ".yaml",
  ".yml",
  ".toml",
  ".env",
  ".gitignore",
  ".py",
  ".sh",
  ".sql",
  ".graphql",
  ".gql",
  ".vue",
  ".svelte",
]);

// Security: Define forbidden paths
const FORBIDDEN_PATHS = new Set([
  "node_modules",
  ".git",
  ".env.local",
  ".env.production",
  "dist",
  "build",
  ".venv",
  "__pycache__",
  ".DS_Store",
  "Thumbs.db",
]);

// Git command whitelist for security
const ALLOWED_GIT_COMMANDS = new Set([
  "status",
  "add",
  "commit",
  "diff",
  "log",
  "branch",
  "checkout",
  "reset",
]);

/**
 * Validates if a file path is safe to access
 */
export function validatePath(filePath: string): {
  valid: boolean;
  error?: string;
} {
  // Normalize the path to prevent directory traversal
  const normalizedPath = path.normalize(filePath);

  // Check for directory traversal attempts
  if (normalizedPath.includes("..")) {
    return { valid: false, error: "Directory traversal not allowed" };
  }

  // Check for absolute paths (should be relative to project root)
  if (path.isAbsolute(normalizedPath)) {
    return { valid: false, error: "Absolute paths not allowed" };
  }

  // Check for forbidden paths
  const pathParts = normalizedPath.split(path.sep);
  for (const part of pathParts) {
    if (FORBIDDEN_PATHS.has(part)) {
      return { valid: false, error: `Access to ${part} is forbidden` };
    }
  }

  return { valid: true };
}

/**
 * Validates if a file extension is allowed for editing
 */
export function validateFileExtension(filePath: string): {
  valid: boolean;
  error?: string;
} {
  const ext = path.extname(filePath).toLowerCase();

  if (!ext) {
    // Allow files without extensions (like README, Dockerfile, etc.)
    return { valid: true };
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `File type ${ext} is not allowed for editing`,
    };
  }

  return { valid: true };
}

/**
 * File metadata interface
 */
export interface FileMetadata {
  name: string;
  path: string;
  size: number;
  type: "file" | "directory";
  extension?: string;
  modified: string;
  isEditable: boolean;
}

/**
 * Read file content with validation
 */
export async function readFileContent(
  filePath: string,
): Promise<{ content: string; metadata: FileMetadata }> {
  // Validate path
  const pathValidation = validatePath(filePath);
  if (!pathValidation.valid) {
    throw new Error(pathValidation.error);
  }

  try {
    const fullPath = path.resolve(process.cwd(), filePath);
    const stats = await fs.stat(fullPath);

    if (!stats.isFile()) {
      throw new Error("Path is not a file");
    }

    const content = await fs.readFile(fullPath, "utf-8");
    const ext = path.extname(filePath);
    const extValidation = validateFileExtension(filePath);

    const metadata: FileMetadata = {
      name: path.basename(filePath),
      path: filePath,
      size: stats.size,
      type: "file",
      extension: ext || undefined,
      modified: stats.mtime.toISOString(),
      isEditable: extValidation.valid,
    };

    return { content, metadata };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Error(`File not found: ${filePath}`);
    }
    throw error;
  }
}

/**
 * Write file content with validation
 */
export async function writeFileContent(
  filePath: string,
  content: string,
): Promise<FileMetadata> {
  // Validate path
  const pathValidation = validatePath(filePath);
  if (!pathValidation.valid) {
    throw new Error(pathValidation.error);
  }

  // Validate file extension
  const extValidation = validateFileExtension(filePath);
  if (!extValidation.valid) {
    throw new Error(extValidation.error);
  }

  try {
    const fullPath = path.resolve(process.cwd(), filePath);

    // Create directory if it doesn't exist
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(fullPath, content, "utf-8");

    // Get file stats
    const stats = await fs.stat(fullPath);
    const ext = path.extname(filePath);

    const metadata: FileMetadata = {
      name: path.basename(filePath),
      path: filePath,
      size: stats.size,
      type: "file",
      extension: ext || undefined,
      modified: stats.mtime.toISOString(),
      isEditable: true,
    };

    return metadata;
  } catch (error) {
    throw new Error(
      `Failed to write file: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * List directory contents with metadata
 */
export async function listDirectory(
  dirPath: string = ".",
  fileTypeFilter?: string,
): Promise<FileMetadata[]> {
  // Validate path
  const pathValidation = validatePath(dirPath);
  if (!pathValidation.valid) {
    throw new Error(pathValidation.error);
  }

  try {
    const fullPath = path.resolve(process.cwd(), dirPath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });

    const results: FileMetadata[] = [];

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      const fullEntryPath = path.join(fullPath, entry.name);

      // Skip forbidden paths
      if (FORBIDDEN_PATHS.has(entry.name)) {
        continue;
      }

      try {
        const stats = await fs.stat(fullEntryPath);
        const ext = path.extname(entry.name);
        const extValidation = validateFileExtension(entry.name);

        // Apply file type filter if specified
        if (fileTypeFilter && ext !== fileTypeFilter) {
          continue;
        }

        const metadata: FileMetadata = {
          name: entry.name,
          path: entryPath,
          size: stats.size,
          type: entry.isDirectory() ? "directory" : "file",
          extension: ext || undefined,
          modified: stats.mtime.toISOString(),
          isEditable: entry.isFile() && extValidation.valid,
        };

        results.push(metadata);
      } catch (_error) {
        // Skip entries that can't be accessed
        continue;
      }
    }

    // Sort: directories first, then files, alphabetically
    results.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return results;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Error(`Directory not found: ${dirPath}`);
    }
    throw error;
  }
}

/**
 * Git command validation and execution
 */
export interface GitCommandResult {
  success: boolean;
  output: string;
  error?: string;
  command: string;
}

/**
 * Validates git command for security
 */
function validateGitCommand(
  command: string,
  args: string[],
): { valid: boolean; error?: string } {
  // Check if command is in whitelist
  if (!ALLOWED_GIT_COMMANDS.has(command)) {
    return { valid: false, error: `Git command '${command}' is not allowed` };
  }

  // Check for forbidden patterns in arguments
  for (const arg of args) {
    // Check for ./ prefixes (forbidden by git guidelines)
    if (arg.startsWith("./")) {
      return {
        valid: false,
        error: `Invalid path prefix './' in argument: ${arg}. Use '${arg.substring(2)}' instead.`,
      };
    }

    // Check for forbidden paths
    const pathParts = arg.split("/");
    for (const part of pathParts) {
      if (FORBIDDEN_PATHS.has(part)) {
        return {
          valid: false,
          error: `Cannot operate on forbidden path: ${part}`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Execute git command with safety validation
 */
export async function executeGitCommand(
  command: string,
  args: string[] = [],
): Promise<GitCommandResult> {
  // Validate command
  const validation = validateGitCommand(command, args);
  if (!validation.valid) {
    return {
      success: false,
      output: "",
      error: validation.error,
      command: `git ${command} ${args.join(" ")}`,
    };
  }

  const fullCommand = `git ${command} ${args.join(" ")}`.trim();

  try {
    const { stdout, stderr } = await execAsync(fullCommand, {
      cwd: process.cwd(),
      timeout: 30000, // 30 second timeout
    });

    return {
      success: true,
      output: stdout || stderr,
      command: fullCommand,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      output: "",
      error: errorMessage,
      command: fullCommand,
    };
  }
}
