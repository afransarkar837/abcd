import OpenAI from 'openai';
import { AIService } from './base';
import { GeneratedCode } from '@/app/types/generation';

export class OpenAIService extends AIService {
  private client: OpenAI;
  
  constructor(apiKey: string) {
    super(apiKey);
    this.client = new OpenAI({ apiKey });
  }
  
  async generateCode(prompt: string, model: 'gpt4' | 'gpt3.5' = 'gpt4'): Promise<GeneratedCode> {
    try {
      const completion = await this.client.chat.completions.create({
        model: model === 'gpt4' ? 'gpt-4o' : 'gpt-3.5-turbo', // Updated model names
        messages: [
          {
            role: 'system',
            content: 'You are an expert software developer. Generate complete, production-ready code based on the requirements. Format your response with code blocks using triple backticks and include the filename at the start of each code block.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      });
      
      const response = completion.choices[0]?.message?.content || '';
      return this.parseCodeResponse(response);
    } catch (error: any) {
      console.error('OpenAI API error:', error);
      
      // Better error handling
      if (error.status === 404) {
        throw new Error('OpenAI model not found. Make sure you have access to GPT-4 or try GPT-3.5.');
      }
      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your API key.');
      }
      if (error.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please wait a moment and try again.');
      }
      if (error.status === 400 && error.error?.message?.includes('quota')) {
        throw new Error('OpenAI API quota exceeded. Please check your billing.');
      }
      
      throw new Error(`OpenAI API error: ${error.message || 'Unknown error'}`);
    }
  }
}