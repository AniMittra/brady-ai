// Kiro IDE integration guidelines and utilities

export const KIRO_GUIDELINES = {
  gitSafety: {
    safeCommands: [
      'Always use git status before making commits',
      'Never force push to main/master branches',
      'Use descriptive commit messages',
      'Review changes before committing'
    ],
    dangerousCommands: ['git push --force', 'git reset --hard', 'git clean -fd']
  },
  codeQuality: {
    typescript: [
      'Use strict TypeScript types',
      'Avoid any types when possible',
      'Use proper error handling',
      'Follow naming conventions'
    ],
    errorHandling: [
      'Always handle async errors with try-catch',
      'Provide meaningful error messages',
      'Log errors appropriately',
      'Use proper error types'
    ]
  },
  communication: {
    clarity: [
      'Be concise and clear in responses',
      'Provide actionable feedback',
      'Explain reasoning when needed',
      'Use proper formatting'
    ]
  },
  documentation: {
    formatting: [
      'Use proper markdown formatting',
      'Include code examples',
      'Keep documentation up to date',
      'Use clear headings and structure'
    ]
  },
  workflow: {
    architecture: [
      'Follow established patterns',
      'Consider scalability',
      'Maintain separation of concerns',
      'Document architectural decisions'
    ]
  }
};

export function generateKiroContextPrompt(taskType: string, context?: string): string {
  const basePrompt = `You are working within Kiro IDE, a development environment that emphasizes:
- Code quality and TypeScript best practices
- Git safety and proper version control
- Clear communication and documentation
- Scalable architecture patterns

Task Type: ${taskType}
${context ? `Context: ${context}` : ''}

Please follow Kiro guidelines in your response.`;

  return basePrompt;
}

export function validateGitCommand(prompt: string): { valid: boolean; error?: string } {
  const dangerousCommands = KIRO_GUIDELINES.gitSafety.dangerousCommands;
  
  for (const dangerous of dangerousCommands) {
    if (prompt.toLowerCase().includes(dangerous.toLowerCase())) {
      return {
        valid: false,
        error: `Dangerous git command detected: ${dangerous}. Please use safer alternatives.`
      };
    }
  }
  
  return { valid: true };
}