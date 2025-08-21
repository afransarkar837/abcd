import Anthropic from '@anthropic-ai/sdk';
import { AIService } from './base';
import { GeneratedCode } from '@/app/types/generation';

export class AnthropicService extends AIService {
  private client: Anthropic;

  constructor(apiKey: string) {
    super(apiKey);
    this.client = new Anthropic({ apiKey });
  }

  async generateCode(prompt: string): Promise<GeneratedCode> {
    try {
      const completion = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022', // This is still the latest, warning is just informational
        max_tokens: 4000,
        temperature: 0.7,
        system: `You are an expert software developer. Generate complete, production-ready code based on the requirements. 
        
IMPORTANT RULES:
1. Format each code block with the filename on the first line after the backticks
2. Use this format: \`\`\`filename.ext
3. For package.json, provide valid JSON without any comments
4. Include proper file paths like: app/page.tsx, components/Header.tsx, etc.
5. Make sure all code is complete and functional

Example format:
\`\`\`package.json
{
  "name": "app",
  "version": "1.0.0"
}
\`\`\`

\`\`\`app/page.tsx
export default function Page() {
  return <div>Hello</div>
}
\`\`\``,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const response = completion.content[0]?.type === 'text'
        ? completion.content[0].text
        : '';

      return this.parseCodeResponse(response);
    } catch (error: any) {
      console.error('Anthropic API error:', error);

      if (error.status === 400 && error.error?.message?.includes('credit balance')) {
        throw new Error('Insufficient Claude API credits. Please add credits to your Anthropic account.');
      }
      if (error.status === 401) {
        throw new Error('Invalid Claude API key. Please check your API key.');
      }
      if (error.status === 429) {
        throw new Error('Claude API rate limit exceeded. Please wait a moment and try again.');
      }

      throw new Error(`Claude API error: ${error.message || 'Unknown error'}`);
    }
  }
}