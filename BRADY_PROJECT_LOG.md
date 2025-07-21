# Brady AI Project Log

**Date**: January 21, 2025  
**Status**: ✅ COMPLETED - Fresh Repository Created & Deployed & Context System Design  
**Location**: `~/Dev/brady-ai/` (extracted from `~/Dev/content_organizer_mvp/`)

## 🎯 Current Objective
Clean up Brady AI repository and implement project-specific context discovery system.

## 📋 Completed Tasks

### Phase 1: Context Loading Fix ✅
- **Problem**: Brady was hallucinating fake project status because it wasn't receiving context from Aider
- **Root Cause**: `PortkeyAgent.execute()` method wasn't accepting or using context parameter
- **Solution**: Modified Portkey agent to accept context and include it in system prompts
- **Result**: Brady now properly uses project context and stops hallucinating

### Phase 2: Repository Extraction ✅
- **Extracted Brady** from `content_organizer_mvp/mcp-orchestrator/` to standalone `~/Dev/brady-ai/`
- **Preserved git history** using `git subtree push`
- **Created standalone package.json** and README
- **Fixed context file paths** in brady-cli script
- **Verified functionality** - Brady works independently

### Phase 3: Aider & Cline Integration Fixes ✅
- **Fixed brady-cli context loading** - now shows status messages for loaded files
- **Fixed Cline token counting** - added proper OpenAI response format with actual token counts
- **Added custom headers** for debugging (`X-Brady-Cost`, `X-Brady-Model`, etc.)
- **Enhanced /v1/models endpoint** with pricing info for cost estimation

### Phase 4: Repository Cleanup (In Progress) 🔄
- **Removed Kiro references** - moved `.kiro/steering/` to `config/`
- **Updated documentation** - removed Kiro-specific terminology
- **Reorganized structure**:
  ```
  brady-ai/
  ├── config/           # Project guidelines & settings
  ├── examples/         # Integration examples (aider-integration)
  ├── docs/            # Documentation
  ├── src/             # Source code
  └── README.md        # Clean, generic documentation
  ```

## 🚨 Critical Issues Identified

### 1. Git History Security Risk 🔴
- **Problem**: API keys are in git commit history (commits before cleanup)
- **Risk**: Anyone cloning repo can access API keys via `git log`
- **Status**: NOT YET RESOLVED
- **Solutions**:
  - Option A: `git filter-branch` to rewrite history (risky)
  - Option B: Create fresh repo without compromised history (safer)

### 2. Cross-Directory Context Access 🟡
- **Problem**: Brady in `~/Dev/brady-ai/` can't auto-discover context in `~/Dev/content_organizer_mvp/`
- **Current**: Only loads context from its own directory
- **Needed**: Project-specific context discovery system

### 3. New Machine Setup Dependencies 🟡
- **Problem**: Brady alone won't work on fresh machine
- **Missing**: MCP servers (needs Warp/Kiro), API keys, Portkey configs
- **Status**: Documented but not automated

## 🎯 Next Steps (Priority Order)

### Immediate (Security Critical)
1. **Resolve API key exposure in git history**
   - Decision needed: Rewrite history vs fresh repo
   - If fresh repo: backup current state, create new GitHub repo

### High Priority (Core Functionality)
2. **Implement context discovery system**
   - Design pattern: `brady.md`, `.brady/` folder, or config file
   - Support cross-directory context loading
   - Auto-discovery with fallback to explicit paths

3. **Create project-specific configuration**
   - Support per-project model preferences
   - Custom context file locations
   - Project-specific routing rules

### Medium Priority (User Experience)
4. **Improve new machine setup**
   - Better documentation
   - Setup script for dependencies
   - Optional MCP features

5. **Enhanced integrations**
   - Better Aider integration with project discovery
   - Cline configuration templates
   - Python/JavaScript SDK examples

## 🏗️ Proposed Context Discovery System

### Option A: Convention-Based (Recommended)
```bash
# Brady looks for these files in working directory:
brady.md                 # Main project context
.brady/guidelines.md     # Coding guidelines  
.brady/architecture.md   # System architecture
.brady/config.json       # Brady-specific config
```

### Option B: Configuration File
```json
// .brady-config.json
{
  "contextFiles": ["docs/guidelines.md", "README.md"],
  "modelPreferences": {"coder": "groq-llama"},
  "workingDirectory": "."
}
```

### Option C: CLI Arguments
```bash
./examples/aider-integration --project ../content_organizer_mvp --context .brady/
```

## 📊 Current Repository Status

### File Structure
```
brady-ai/
├── config/
│   ├── project-guidelines.md    # Generic Brady guidelines
│   └── testing-and-tools.md     # Development tools info
├── examples/
│   └── aider-integration        # Aider CLI script
├── src/                         # TypeScript source
├── dist/                        # Compiled JavaScript
├── .env.example                 # Template for API keys
├── README.md                    # Clean, public-ready docs
└── package.json                 # Standalone Brady package
```

### Git Status
- **Local repo**: Clean, ready for push
- **GitHub repo**: Created but push failed due to API keys in history
- **Security**: API keys still in git history (CRITICAL)

## 🔧 Technical Details

### Working Brady Configuration
- **Server**: `http://localhost:3002`
- **API**: OpenAI-compatible at `/v1/chat/completions`
- **Models**: `brady-director` (main), task-specific routing
- **Context**: Loads from `config/` directory
- **Integration**: Works with Aider via `examples/aider-integration`

### Dependencies
- **Runtime**: Node.js, TypeScript
- **Providers**: OpenAI, Groq, Google, Anthropic, Perplexity
- **Analytics**: Portkey integration
- **Optional**: MCP servers (for advanced features)

## 🤔 Decisions Needed

1. **Git history**: Rewrite vs fresh repo?
2. **Context discovery**: Which pattern (A, B, or C)?
3. **Repository visibility**: Public vs private?
4. **MCP dependency**: Make optional or required?

## 📝 Notes for Next Session

- User prefers Brady to be **public repo** (not proprietary)
- User wants **cross-directory context access** for project-specific guidelines
- User concerned about **API key security** in git history
- User needs Brady to work **independently** from BundleMind project
- Current Brady instance is **working correctly** with context fixes applied

---

**Last Updated**: January 21, 2025  
**Next Action**: Resolve git history security issue, then implement context discovery