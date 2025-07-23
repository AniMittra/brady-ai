#!/usr/bin/env node

// Script to discover all MCP servers from Warp's actual configuration
const fs = require('fs');
const path = require('path');
const os = require('os');

async function discoverWarpMCPs() {
  console.log('🔍 Discovering MCP servers from Warp...');
  
  // Common Warp config locations
  const warpConfigPaths = [
    path.join(os.homedir(), 'Library/Application Support/dev.warp.Warp-Stable/mcp'),
    path.join(os.homedir(), 'Library/Application Support/dev.warp.Warp/mcp'),
    path.join(os.homedir(), '.config/warp/mcp'),
    path.join(os.homedir(), '.warp/mcp'),
  ];
  
  for (const configPath of warpConfigPaths) {
    try {
      if (fs.existsSync(configPath)) {
        console.log(`📁 Found Warp MCP directory: ${configPath}`);
        const files = fs.readdirSync(configPath);
        console.log(`📄 Files found:`, files.slice(0, 10)); // Show first 10
        
        // Look for config files
        const configFiles = files.filter(f => f.endsWith('.json') && !f.endsWith('.log'));
        if (configFiles.length > 0) {
          console.log(`⚙️ Config files:`, configFiles);
        }
      }
    } catch (error) {
      console.log(`❌ Cannot access ${configPath}:`, error.message);
    }
  }
  
  // Try to find Warp's main config
  const warpMainConfigs = [
    path.join(os.homedir(), 'Library/Application Support/dev.warp.Warp-Stable/user_preferences.json'),
    path.join(os.homedir(), 'Library/Application Support/dev.warp.Warp-Stable/settings.json'),
    path.join(os.homedir(), 'Library/Application Support/dev.warp.Warp-Stable/mcp_config.json'),
  ];
  
  for (const configFile of warpMainConfigs) {
    try {
      if (fs.existsSync(configFile)) {
        console.log(`📋 Found Warp config: ${configFile}`);
        const content = fs.readFileSync(configFile, 'utf-8');
        if (content.includes('mcp') || content.includes('MCP')) {
          console.log(`🎯 Contains MCP references!`);
          // Don't log full content as it might be large
        }
      }
    } catch (error) {
      console.log(`❌ Cannot read ${configFile}:`, error.message);
    }
  }
}

discoverWarpMCPs();