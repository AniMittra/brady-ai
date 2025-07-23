#!/usr/bin/env node

/**
 * Universal MCP Discovery Tool
 * Scans all available MCP servers and creates tool manifests for different LLMs
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

async function discoverAllMCPs() {
  const allMCPs = new Map();
  
  // 1. Scan Warp configs
  const warpPaths = [
    path.join(os.homedir(), 'Library/Application Support/dev.warp.Warp-Stable/mcp'),
    './warp-mcp-config.json'
  ];
  
  for (const configPath of warpPaths) {
    try {
      let config;
      if (configPath.endsWith('.json')) {
        if (fs.existsSync(configPath)) {
          config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }
      } else if (fs.existsSync(configPath)) {
        const files = fs.readdirSync(configPath).filter(f => f.endsWith('.json'));
        for (const file of files) {
          const content = JSON.parse(fs.readFileSync(path.join(configPath, file), 'utf-8'));
          if (content.mcpServers) config = content;
        }
      }
      
      if (config?.mcpServers) {
        for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
          allMCPs.set(name, {
            name,
            ...serverConfig,
            tools: getKnownTools(name),
            capabilities: getCapabilities(name)
          });
        }
      }
    } catch (error) {
      console.warn(`Error reading ${configPath}:`, error.message);
    }
  }
  
  return Array.from(allMCPs.values());
}

function getKnownTools(serverName) {
  const toolMap = {
    'aws-docs': ['search_aws_docs', 'get_service_info'],
    'brave': ['brave_web_search'],
    'convex-helper': ['query_database', 'update_records'],
    'fetch': ['http_get', 'http_post', 'fetch_url'],
    'firecrawl': ['scrape_url', 'crawl_website', 'extract_content'],
    'perplexity-ask': ['perplexity_search', 'ask_perplexity'],
    'playwright': ['take_screenshot', 'navigate_page', 'click_element', 'fill_form'],
    'shadcn-ui-jpisnice': ['generate_component', 'list_components'],
    'shadcn-ui-heilgar': ['create_ui_component', 'get_component_code'],
    'vision-gemini': ['describe_image', 'describe_image_from_file'],
    'vision-portkey': ['describe_image', 'describe_image_from_file'],
    'bradyai': ['execute_dev_task', 'ask_director', 'get_agent_status'],
    'mcp-installer': ['install_mcp', 'list_available_mcps']
  };
  
  return toolMap[serverName] || ['unknown_tool'];
}

function getCapabilities(serverName) {
  const capabilityMap = {
    'aws-docs': ['documentation', 'aws', 'cloud'],
    'brave': ['web_search', 'news', 'research'],
    'convex-helper': ['database', 'storage', 'queries'],
    'fetch': ['http', 'api', 'requests'],
    'firecrawl': ['web_scraping', 'content_extraction', 'crawling'],
    'perplexity-ask': ['ai_search', 'research', 'news', 'current_events'],
    'playwright': ['browser_automation', 'testing', 'screenshots', 'ui_interaction'],
    'shadcn-ui-jpisnice': ['ui_components', 'react', 'frontend'],
    'shadcn-ui-heilgar': ['ui_generation', 'components', 'design'],
    'vision-gemini': ['image_analysis', 'vision', 'ocr'],
    'vision-portkey': ['image_analysis', 'vision', 'premium'],
    'bradyai': ['orchestration', 'ai_coordination', 'task_management'],
    'mcp-installer': ['mcp_management', 'installation']
  };
  
  return capabilityMap[serverName] || ['general'];
}

async function generateLLMConfigs() {
  const mcps = await discoverAllMCPs();
  
  // Generate RovoDev config
  const rovoConfig = {
    mcpServers: {}
  };
  
  // Generate Gemini CLI config
  const geminiConfig = {
    mcp: {
      servers: {}
    }
  };
  
  // Generate tool capability manifest
  const toolManifest = {
    discovered_at: new Date().toISOString(),
    total_servers: mcps.length,
    capabilities: {},
    tools: {},
    smart_routing: {}
  };
  
  for (const mcp of mcps) {
    // RovoDev config
    rovoConfig.mcpServers[mcp.name] = {
      command: mcp.command,
      args: mcp.args,
      working_directory: mcp.working_directory,
      env: mcp.env
    };
    
    // Gemini config
    geminiConfig.mcp.servers[mcp.name] = {
      command: mcp.command,
      args: mcp.args || [],
      working_directory: mcp.working_directory,
      env: mcp.env || {}
    };
    
    // Tool manifest
    for (const capability of mcp.capabilities) {
      if (!toolManifest.capabilities[capability]) {
        toolManifest.capabilities[capability] = [];
      }
      toolManifest.capabilities[capability].push(mcp.name);
    }
    
    for (const tool of mcp.tools) {
      toolManifest.tools[tool] = mcp.name;
    }
  }
  
  // Smart routing rules
  toolManifest.smart_routing = {
    "news|current events|today": ["perplexity-ask", "brave"],
    "web search|research": ["brave", "perplexity-ask"],
    "scrape|crawl|extract": ["firecrawl"],
    "image|photo|screenshot|analyze": ["vision-gemini", "vision-portkey"],
    "ui|component|react": ["shadcn-ui-jpisnice", "shadcn-ui-heilgar"],
    "test|browser|automation": ["playwright"],
    "database|query|data": ["convex-helper"],
    "api|http|fetch": ["fetch"],
    "aws|cloud|documentation": ["aws-docs"],
    "orchestrate|complex task": ["bradyai"]
  };
  
  // Write configs
  fs.writeFileSync('mcp.json', JSON.stringify(rovoConfig, null, 2));
  fs.writeFileSync('gemini_mcp_config.json', JSON.stringify(geminiConfig, null, 2));
  fs.writeFileSync('mcp_tool_manifest.json', JSON.stringify(toolManifest, null, 2));
  
  console.log(`🔍 Discovered ${mcps.length} MCP servers`);
  console.log(`📝 Generated configs for RovoDev and Gemini CLI`);
  console.log(`🧠 Created smart routing manifest`);
  
  return { mcps, toolManifest };
}

// Run discovery
if (require.main === module) {
  generateLLMConfigs().then(({ mcps, toolManifest }) => {
    console.log('\n🚀 Available capabilities:');
    for (const [capability, servers] of Object.entries(toolManifest.capabilities)) {
      console.log(`  ${capability}: ${servers.join(', ')}`);
    }
    
    console.log('\n💡 Smart routing examples:');
    console.log('  "What\'s in the news?" → perplexity-ask, brave');
    console.log('  "Analyze this image" → vision-gemini, vision-portkey');
    console.log('  "Scrape this website" → firecrawl');
    console.log('  "Test this UI" → playwright');
  });
}

module.exports = { discoverAllMCPs, generateLLMConfigs };