/**
 * Kiro File Loader - Dynamically loads steering docs from .kiro/steering/
 * 
 * This ensures all agents pull from the same source files, so you only
 * need to update guidelines in one place: .kiro/steering/
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export interface KiroSteeringFiles {
  agentBehavior: string;
  tech: string;
  product: string;
  structure: string;
  gitBestPractices: string;
}

/**
 * Load all Kiro steering documents from .kiro/steering/
 */
export function loadKiroSteeringFiles(): KiroSteeringFiles {
  const steeringPath = join(process.cwd(), '..', '.kiro', 'steering');
  
  try {
    return {
      agentBehavior: readFileSync(join(steeringPath, 'kiro-agent-behavior.md'), 'utf-8'),
      tech: readFileSync(join(steeringPath, 'tech.md'), 'utf-8'),
      product: readFileSync(join(steeringPath, 'product.md'), 'utf-8'),
      structure: readFileSync(join(steeringPath, 'structure.md'), 'utf-8'),
      gitBestPractices: readFileSync(join(steeringPath, 'git-best-practices.md'), 'utf-8'),
    };
  } catch (error) {
    console.warn('⚠️  Could not load Kiro steering files, using fallback guidelines');
    return getFallbackGuidelines();
  }
}

/**
 * Extract key guidelines from the loaded steering files
 */
export function extractGuidelines(steeringFiles: KiroSteeringFiles): {
  gitSafety: string[];
  codeQuality: string[];
  documentation: string[];
  workflow: string[];
  communication: string[];
} {
  const guidelines = {
    gitSafety: [] as string[],
    codeQuality: [] as string[],
    documentation: [] as string[],
    workflow: [] as string[],
    communication: [] as string[]
  };

  // Extract git safety rules from git-best-practices.md
  const gitSection = steeringFiles.gitBestPractices;
  if (gitSection.includes('NEVER Use Relative Path Prefixes')) {
    guidelines.gitSafety.push('NEVER use ./ prefixes in git commands');
    guidelines.gitSafety.push('Use git add . or git add filename (without ./)');
    guidelines.gitSafety.push('Run git status before any commit');
    guidelines.gitSafety.push('Follow conventional commit format: type: description');
  }

  // Extract code quality from tech.md and agent-behavior.md
  const techSection = steeringFiles.tech;
  const behaviorSection = steeringFiles.agentBehavior;
  
  if (techSection.includes('TypeScript')) {
    guidelines.codeQuality.push('Maintain TypeScript strict mode compliance');
    guidelines.codeQuality.push('Add proper TypeScript types for new code');
  }
  
  if (techSection.includes('React')) {
    guidelines.codeQuality.push('Use functional React components with hooks');
    guidelines.codeQuality.push('Implement proper error boundaries');
  }

  if (behaviorSection.includes('Code Quality Standards')) {
    guidelines.codeQuality.push('Follow existing code patterns and conventions');
    guidelines.codeQuality.push('Use proper error handling and logging');
  }

  // Extract documentation standards
  if (behaviorSection.includes('Documentation Standards')) {
    guidelines.documentation.push('Keep documentation up-to-date with code changes');
    guidelines.documentation.push('Use consistent formatting across all documents');
    guidelines.documentation.push('Include clear examples and usage instructions');
    guidelines.documentation.push('Maintain PRD and technical documentation accuracy');
  }

  // Extract workflow guidelines
  if (behaviorSection.includes('Development Workflow')) {
    guidelines.workflow.push('Create feature branches for significant changes');
    guidelines.workflow.push('Test changes thoroughly before committing');
    guidelines.workflow.push('Follow the existing project structure');
    guidelines.workflow.push('Respect existing architectural decisions');
  }

  // Extract communication guidelines
  if (behaviorSection.includes('Communication Style')) {
    guidelines.communication.push('Be clear and concise in commit messages');
    guidelines.communication.push('Use conventional commit format: type: description');
    guidelines.communication.push('Explain complex changes in commit body');
    guidelines.communication.push('Reference issues or specs when relevant');
  }

  return guidelines;
}

/**
 * Generate dynamic system prompt from live steering files
 */
export function generateDynamicKiroPrompt(taskType: string): string {
  const steeringFiles = loadKiroSteeringFiles();
  const guidelines = extractGuidelines(steeringFiles);
  
  let prompt = `You are an AI assistant following Kiro IDE behavioral guidelines loaded from .kiro/steering/ files.

CRITICAL GIT SAFETY (from git-best-practices.md):
${guidelines.gitSafety.map(g => `- ${g}`).join('\n')}

CODE QUALITY STANDARDS (from tech.md & kiro-agent-behavior.md):
${guidelines.codeQuality.map(g => `- ${g}`).join('\n')}

DOCUMENTATION STANDARDS (from kiro-agent-behavior.md):
${guidelines.documentation.map(g => `- ${g}`).join('\n')}

WORKFLOW GUIDELINES (from kiro-agent-behavior.md):
${guidelines.workflow.map(g => `- ${g}`).join('\n')}

COMMUNICATION STYLE (from kiro-agent-behavior.md):
${guidelines.communication.map(g => `- ${g}`).join('\n')}`;

  // Add task-specific focus
  switch (taskType.toLowerCase()) {
    case 'debug':
    case 'fix':
      prompt += `\n\nDEBUGGING FOCUS:
- Use defensive programming practices
- Provide clear error messages and recovery steps
- Log important operations for debugging
- Test fixes thoroughly before committing`;
      break;
      
    case 'document':
    case 'documentation':
      prompt += `\n\nDOCUMENTATION FOCUS:
- Maintain consistent formatting across all documents
- Include clear examples and usage instructions
- Keep documentation synchronized with code changes
- Follow markdown standards and proper table alignment`;
      break;
      
    case 'architecture':
    case 'refactor':
      prompt += `\n\nARCHITECTURE FOCUS:
- Respect existing architectural decisions
- Design minimal, focused solutions
- Create feature branches for significant changes
- Document architectural changes thoroughly`;
      break;
  }

  return prompt;
}

/**
 * Fallback guidelines if steering files can't be loaded
 */
function getFallbackGuidelines(): KiroSteeringFiles {
  return {
    agentBehavior: `# Fallback Kiro Agent Behavior
## Core Principles
- Git Safety First: Never use ./ prefixes
- Code Quality Standards: TypeScript strict mode
- Documentation Standards: Keep docs up-to-date
- Development Workflow: Feature branches, proper testing`,
    
    tech: `# Fallback Tech Standards
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Convex for backend/database`,
    
    product: `# Fallback Product Guidelines
- User-Centric Design
- Intelligent Organization
- Flexible Bundling
- Scalable Architecture`,
    
    structure: `# Fallback Structure Guidelines
- Follow existing project structure
- Respect directory organization
- Use proper file naming conventions`,
    
    gitBestPractices: `# Fallback Git Best Practices
- NEVER use ./ prefixes in git commands
- Use git add . or git add filename
- Run git status before commits
- Follow conventional commit format`
  };
}