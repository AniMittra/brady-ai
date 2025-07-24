import * as fs from 'fs';
import * as path from 'path';

export interface MCPServer {
  name: string;
  command?: string;
  args?: string[];
  working_directory?: string;
  env?: Record<string, string>;
  endpoint?: string;
  tools?: string[];
}

export interface ProjectContext {
  overview: string;
  contextFiles: string[];
  modelPreferences: Record<string, string>;
  instructions: string[];
  mcpServers: MCPServer[];
  availableTools: string[];
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
    
    // Start with MCP discovery
    const mcpServers = await this.discoverMCPServers();
    const availableTools: string[] = [];
    
    // Query each MCP server for tools
    for (const server of mcpServers) {
      const tools = await this.queryMCPTools(server);
      availableTools.push(...tools);
      server.tools = tools;
    }
    
    if (!fs.existsSync(bradyFile)) {
      console.log('[ContextLoader] No brady.md found in', this.workingDirectory);
      // Return MCP context even without brady.md
      return {
        overview: 'No project context file found. Working in generic mode.',
        contextFiles: [],
        modelPreferences: {},
        instructions: [],
        mcpServers,
        availableTools,
      };
    }

    try {
      const content = fs.readFileSync(bradyFile, 'utf-8');
      const context = this.parseBradyFile(content);
      // Add MCP discovery to parsed context
      context.mcpServers = mcpServers;
      context.availableTools = availableTools;
      return context;
    } catch (error) {
      console.error('[ContextLoader] Error reading brady.md:', error);
      return {
        overview: 'Error loading project context.',
        contextFiles: [],
        modelPreferences: {},
        instructions: [],
        mcpServers,
        availableTools,
      };
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
      instructions: [],
      mcpServers: [], // Will be populated by loadProjectContext
      availableTools: [], // Will be populated by loadProjectContext
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
   * Discover available MCP servers from multiple sources
   */
  async discoverMCPServers(): Promise<MCPServer[]> {
    const servers: MCPServer[] = [];
    
    // 1. Check Warp MCP config (local)
    try {
      const warpConfig = path.join(this.workingDirectory, 'warp-mcp-config.json');
      if (fs.existsSync(warpConfig)) {
        const content = JSON.parse(fs.readFileSync(warpConfig, 'utf-8'));
        if (content.mcpServers) {
          for (const [name, config] of Object.entries(content.mcpServers as any)) {
            const mcpConfig = config as any;
            servers.push({
              name,
              command: mcpConfig.command,
              args: mcpConfig.args,
              working_directory: mcpConfig.working_directory,
              env: mcpConfig.env,
            });
          }
          console.log(`[ContextLoader] Found ${Object.keys(content.mcpServers).length} MCP servers in local Warp config`);
        }
      }
    } catch (error) {
      console.warn('[ContextLoader] Error reading local Warp MCP config:', error);
    }

    // 1b. Check Warp's actual config locations and running processes
    try {
      const warpConfigPaths = [
        path.join(require('os').homedir(), 'Library/Application Support/dev.warp.Warp-Stable/mcp'),
        path.join(require('os').homedir(), 'Library/Application Support/dev.warp.Warp/mcp'),
        path.join(require('os').homedir(), 'Library/Application Support/Kiro/User/globalStorage/kiro.kiroagent'),
      ];
      
      for (const configPath of warpConfigPaths) {
        if (fs.existsSync(configPath)) {
          const files = fs.readdirSync(configPath);
          const configFiles = files.filter(f => f.endsWith('.json') && !f.endsWith('.log'));
          
          for (const configFile of configFiles) {
            try {
              const fullPath = path.join(configPath, configFile);
              const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
              if (content.mcpServers) {
                for (const [name, config] of Object.entries(content.mcpServers as any)) {
                  const mcpConfig = config as any;
                  // Avoid duplicates
                  if (!servers.find(s => s.name === name)) {
                    servers.push({
                      name,
                      command: mcpConfig.command,
                      args: mcpConfig.args,
                      working_directory: mcpConfig.working_directory,
                      env: mcpConfig.env,
                    });
                  }
                }
                console.log(`[ContextLoader] Found additional MCP servers in ${configFile}`);
              }
            } catch (error) {
              // Skip invalid config files
            }
          }
        }
      }
    } catch (error) {
      console.warn('[ContextLoader] Error scanning Warp config directories:', error);
    }

    // 1c. Scan for running MCP processes (HTTP endpoints)
    try {
      const runningMCPs = await this.scanForRunningMCPs();
      for (const mcp of runningMCPs) {
        if (!servers.find(s => s.name === mcp.name)) {
          servers.push(mcp);
        }
      }
      if (runningMCPs.length > 0) {
        console.log(`[ContextLoader] Found ${runningMCPs.length} running MCP processes`);
      }
    } catch (error) {
      console.warn('[ContextLoader] Error scanning for running MCPs:', error);
    }

    // 2. Check generic MCP configs
    const mcpConfigFiles = ['mcp.json', 'brady-mcp.json', '.mcp.json'];
    for (const configFile of mcpConfigFiles) {
      try {
        const configPath = path.join(this.workingDirectory, configFile);
        if (fs.existsSync(configPath)) {
          const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          if (content.servers) {
            for (const [name, config] of Object.entries(content.servers as any)) {
              const mcpConfig = config as any;
              servers.push({
                name,
                endpoint: mcpConfig.endpoint,
                command: mcpConfig.command,
                args: mcpConfig.args,
                working_directory: mcpConfig.working_directory,
                env: mcpConfig.env,
              });
            }
            console.log(`[ContextLoader] Found MCP servers in ${configFile}`);
          }
        }
      } catch (error) {
        console.warn(`[ContextLoader] Error reading ${configFile}:`, error);
      }
    }

    // 3. Check environment variables for MCP endpoints
    const mcpEndpoints = process.env.MCP_SERVERS?.split(',') || [];
    mcpEndpoints.forEach((endpoint, index) => {
      if (endpoint.trim()) {
        servers.push({
          name: `env-mcp-${index}`,
          endpoint: endpoint.trim(),
          command: undefined,
        });
      }
    });

    return servers;
  }

  /**
   * Scan for running MCP processes on common ports
   */
  private async scanForRunningMCPs(): Promise<MCPServer[]> {
    const runningServers: MCPServer[] = [];
    const commonPorts = [3000, 3001, 3434, 8000, 8080, 9000];
    
    for (const port of commonPorts) {
      try {
        // Try to detect MCP servers by making a simple request
        const { default: fetch } = await import('node-fetch');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);
        
        const response = await fetch(`http://localhost:${port}/health`, { 
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          runningServers.push({
            name: `mcp-port-${port}`,
            endpoint: `http://localhost:${port}`,
            command: undefined,
          });
        }
      } catch (error) {
        // Port not responding or not MCP - continue
      }
    }
    
    return runningServers;
  }

  /**
   * Query MCP server for available tools
   */
  async queryMCPTools(server: MCPServer): Promise<string[]> {
    // This would need actual MCP client implementation
    // For now, return expected tools based on server name
    const knownTools: Record<string, string[]> = {
      'vision-gemini': ['describe_image', 'describe_image_from_file'],
      'vision-portkey': ['describe_image', 'describe_image_from_file'],
      'brave': ['brave_web_search'],
      'bradyai': ['execute_dev_task', 'ask_director', 'get_agent_status'],
    };

    return knownTools[server.name] || [];
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

    // Add MCP tools information
    if (projectContext.mcpServers.length > 0) {
      contextString += `## Available MCP Tools\n\n`;
      contextString += `Brady has access to ${projectContext.availableTools.length} MCP tools across ${projectContext.mcpServers.length} servers:\n\n`;
      
      for (const server of projectContext.mcpServers) {
        contextString += `### ${server.name}\n`;
        if (server.tools && server.tools.length > 0) {
          contextString += `Tools: ${server.tools.join(', ')}\n`;
        }
        contextString += `Command: ${server.command}${server.args ? ' ' + server.args.join(' ') : ''}\n\n`;
      }
      
      contextString += `**Available Tools**: ${projectContext.availableTools.join(', ')}\n\n`;
      contextString += `**IMPORTANT**: Always prefer MCP tools over built-in alternatives when available.\n\n`;
    }

    return contextString;
  }
}