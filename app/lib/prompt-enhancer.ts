import { GenerationRequest, ProjectConfig } from '@/app/types/generation';

export class PromptEnhancer {
  private baseRequirements = {
    web: [
      'Use Next.js 14 with App Router',
      'Use TypeScript for type safety',
      'Use Tailwind CSS for styling',
      'Implement responsive design for mobile, tablet, and desktop',
      'Follow React best practices and hooks patterns',
      'Include proper error handling and loading states',
      'Add meaningful comments and documentation',
      'Use modern ES6+ JavaScript features',
      'Implement SEO best practices with proper meta tags',
      'Ensure accessibility with proper ARIA labels',
      'Structure components in a modular, reusable way'
    ],
    mobile: [
      'Use Flutter with latest stable version',
      'Implement Material Design 3 principles',
      'Create responsive layouts for different screen sizes',
      'Use proper state management (Provider or Riverpod)',
      'Implement proper navigation patterns',
      'Add error handling and loading states',
      'Include comprehensive comments',
      'Follow Flutter best practices and conventions',
      'Implement platform-specific designs for iOS and Android',
      'Use async/await for asynchronous operations'
    ]
  };

  private backendRequirements = [
    'Integrate Firebase for backend services',
    'Implement Firebase Authentication with email/password and Google Sign-In',
    'Use Firestore for database with proper security rules',
    'Implement Firebase Storage for file uploads if needed',
    'Add proper error handling for all Firebase operations',
    'Include offline persistence support',
    'Implement proper data validation'
  ];

  enhancePrompt(request: GenerationRequest): string {
    const { prompt, appType, includeBackend } = request;
    
    let enhancedPrompt = `Create a ${appType === 'web' ? 'Next.js web application' : 'Flutter mobile application'} with the following requirements:\n\n`;
    
    // Add user's original prompt
    enhancedPrompt += `MAIN REQUIREMENT:\n${prompt}\n\n`;
    
    // Add technical requirements
    enhancedPrompt += `TECHNICAL REQUIREMENTS:\n`;
    const requirements = this.baseRequirements[appType];
    requirements.forEach(req => {
      enhancedPrompt += `- ${req}\n`;
    });
    
    // Add backend requirements if needed
    if (includeBackend) {
      enhancedPrompt += `\nBACKEND REQUIREMENTS:\n`;
      this.backendRequirements.forEach(req => {
        enhancedPrompt += `- ${req}\n`;
      });
    }
    
    // Add structure requirements
    enhancedPrompt += `\nPROJECT STRUCTURE:\n`;
    enhancedPrompt += `- Organize code in a clean, scalable folder structure\n`;
    enhancedPrompt += `- Separate concerns (components, utils, services, types)\n`;
    enhancedPrompt += `- Include all necessary configuration files\n`;
    
    // Add output format requirements
    enhancedPrompt += `\nOUTPUT FORMAT:\n`;
    enhancedPrompt += `- Provide complete, production-ready code\n`;
    enhancedPrompt += `- Include all necessary files for a working application\n`;
    enhancedPrompt += `- No placeholders or TODO comments - implement all features\n`;
    enhancedPrompt += `- Include package.json with all dependencies\n`;
    
    return enhancedPrompt;
  }

  extractProjectConfig(prompt: string): ProjectConfig {
    const config: ProjectConfig = {
      name: this.extractProjectName(prompt),
      type: 'nextjs',
      features: this.extractFeatures(prompt),
      backend: false
    };
    
    return config;
  }

  private extractProjectName(prompt: string): string {
    // Try to extract app name from prompt
    const nameMatch = prompt.match(/(?:create|build|make)\s+(?:a\s+)?(\w+\s+\w+|\w+)\s+(?:app|application|system|platform)/i);
    if (nameMatch) {
      return nameMatch[1].toLowerCase().replace(/\s+/g, '-');
    }
    return 'my-app';
  }

  private extractFeatures(prompt: string): string[] {
    const features: string[] = [];
    const featureKeywords = {
      auth: /auth|login|sign|user\s+management/i,
      database: /database|data|storage|crud/i,
      realtime: /real-?time|live|websocket/i,
      payments: /payment|stripe|billing|subscription/i,
      analytics: /analytics|dashboard|charts|metrics/i,
      search: /search|filter|query/i,
      api: /api|rest|graphql|endpoint/i,
      responsive: /responsive|mobile|tablet/i
    };
    
    Object.entries(featureKeywords).forEach(([feature, regex]) => {
      if (regex.test(prompt)) {
        features.push(feature);
      }
    });
    
    return features;
  }
}