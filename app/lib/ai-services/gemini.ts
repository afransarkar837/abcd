import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIService } from './base';
import { GeneratedCode } from '@/app/types/generation';

export class GeminiService extends AIService {
  private client: GoogleGenerativeAI;
  
  constructor(apiKey: string) {
    super(apiKey);
    this.client = new GoogleGenerativeAI(apiKey);
  }
  
  async generateCode(prompt: string, model: 'gemini-pro' | 'gemini-flash' = 'gemini-flash'): Promise<GeneratedCode> {
    try {
      // Use Gemini 1.5 Flash for faster responses or Gemini 1.5 Pro for better quality
      const modelName = model === 'gemini-pro' ? 'gemini-1.5-pro' : 'gemini-1.5-flash';
      const generativeModel = this.client.getGenerativeModel({ model: modelName });
      
      const systemPrompt = `You are an expert software developer. Generate complete, production-ready code based on the requirements. 
      Format your response with code blocks using triple backticks and include the filename at the start of each code block.
      Example format:
      \`\`\`package.json
      {
        "name": "app",
        ...
      }
      \`\`\`
      
      \`\`\`app/page.tsx
      export default function Page() {
        ...
      }
      \`\`\`
      
      Now generate code for: ${prompt}`;
      
      const result = await generativeModel.generateContent(systemPrompt);
      const response = result.response.text();
      
      return this.parseCodeResponse(response);
    } catch (error: any) {
      console.error('Gemini API error:', error);
      
      // Better error handling
      if (error.status === 400) {
        throw new Error('Invalid Gemini API request. Please check your prompt.');
      }
      if (error.status === 401 || error.status === 403) {
        throw new Error('Invalid Gemini API key or insufficient permissions.');
      }
      if (error.status === 429) {
        throw new Error('Gemini API rate limit exceeded. Please wait a moment and try again.');
      }
      if (error.message?.includes('SAFETY')) {
        throw new Error('Gemini API blocked the request due to safety filters. Try rephrasing your prompt.');
      }
      
      throw new Error(`Gemini API error: ${error.message || 'Unknown error'}`);
    }
  }
}