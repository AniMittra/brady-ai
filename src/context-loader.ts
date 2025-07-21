import * as fs from 'fs';
import * as path from 'path';

export interface ProjectContext {
  overview: string;
  contextFiles: string[];
  modelPreferences: Record<string, string>;
  instructions: string[];
}

export class ContextLoader {
  private workingDirectory: string;

  constructor(workingDirectory: string = process.cwd()) {
    this.workingDirectory = workingDirectory;
  }

  /**
   * Discover and load project context from brady.md file
   */
  async loadProjectContext(): Promise<ProjectContext | null> {
    const bradyFile = path.join(this.workingDirectory, 'brady.md');
    
    if (!fs.existsSync(bradyFile)) {
      console.log('[ContextLoader] No brady.md found in', this.workingDirectory);
      return null;
    }

    try {
      const content = fs.readFileSync(bradyFile, 'utf-8');
      return this.parseBradyFile(content);
    } catch (error) {
      console.error('[ContextLoader] Error reading brady.md:', error);
      return null;
    }
  }

  /**
   * Parse brady.md file and extract context information
   */
  private parseBradyFile(content: string): ProjectContext {
    const context: ProjectContext = {
      overview: '',
      contextFiles: [],
      modelPreferences: {},
      instructions: []
    };

    const lines = content.split('\n');
    let currentSection = '';

    for (const line of lines) {
      const trimmed = line.trim();

      // Detect sections
      if (trimmed.startsWith('## ')) {
        currentSection = trimmed.toLowerCase();
        continue;
      }

      // Parse based on current section
      switch (currentSection) {
        case '## project overview':
          if (trimmed && !trimmed.startsWith('#')) {
            context.overview += trimmed + ' ';
          }
          break;

        case '## context files':
          // Look for markdown links or file paths
          const fileMatch = trimmed.match(/`([^`]+)`|^\- (.+)$/);
          if (fileMatch) {
            const filePath = fileMatch[1] || fileMatch[2];
            if (filePath && !filePath.startsWith('#')) {
              context.contextFiles.push(filePath);
            }
          }
          break;

        case '## model preferences':
          // Parse preference lines like "- **Coder tasks**: Use fast models"
          const prefMatch = trimmed.match(/\*\*([^*]+)\*\*:\s*(.+)/);
          if (prefMatch) {
            context.modelPreferences[prefMatch[1].toLowerCase()] = prefMatch[2];
          }
          break;

        case '## project-specific instructions':
          if (trimmed.startsWith('- ')) {
            context.instructions.push(trimmed.substring(2));
          }
          break;
      }
    }

    return context;
  }

  /**
   * Load all context files referenced in brady.md
   */
  async loadContextFiles(contextFiles: string[]): Promise<Record<string, string>> {
    const loadedFiles: Record<string, string> = {};

    for (const filePath of contextFiles) {
      try {
        const fullPath = path.resolve(this.workingDirectory, filePath);
        
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          loadedFiles[filePath] = content;
          console.log(`[ContextLoader] Loaded: ${filePath}`);
        } else {
          console.warn(`[ContextLoader] File not found: ${filePath}`);
        }
      } catch (error) {
        console.error(`[ContextLoader] Error loading ${filePath}:`, error);
      }
    }

    return loadedFiles;
  }

  /**
   * Generate a comprehensive context string for Brady
   */
  async generateContextString(): Promise<string> {
    const projectContext = await this.loadProjectContext();
    
    if (!projectContext) {
      return 'No project context found. Working in generic mode.';
    }

    const contextFiles = await this.loadContextFiles(projectContext.contextFiles);
    
    let contextString = `# Project Context\n\n`;
    
    if (projectContext.overview) {
      contextString += `## Overview\n${projectContext.overview.trim()}\n\n`;
    }

    if (Object.keys(projectContext.modelPreferences).length > 0) {
      contextString += `## Model Preferences\n`;
      for (const [task, preference] of Object.entries(projectContext.modelPreferences)) {
        contextString += `- **${task}**: ${preference}\n`;
      }
      contextString += '\n';
    }

    if (projectContext.instructions.length > 0) {
      contextString += `## Project Instructions\n`;
      for (const instruction of projectContext.instructions) {
        contextString += `- ${instruction}\n`;
      }
      contextString += '\n';
    }

    if (Object.keys(contextFiles).length > 0) {
      contextString += `## Referenced Files\n\n`;
      for (const [filePath, content] of Object.entries(contextFiles)) {
        contextString += `### ${filePath}\n\`\`\`\n${content.substring(0, 2000)}${content.length > 2000 ? '\n... (truncated)' : ''}\n\`\`\`\n\n`;
      }
    }

    return contextString;
  }
}