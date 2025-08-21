import { NextRequest, NextResponse } from 'next/server';
import { GenerationRequest, GenerationResponse, GeneratedCode } from '@/app/types/generation';
import { PromptEnhancer } from '@/app/lib/prompt-enhancer';
import { OpenAIService } from '@/app/lib/ai-services/openai';
import { AnthropicService } from '@/app/lib/ai-services/anthropic';
import { GeminiService } from '@/app/lib/ai-services/gemini';
import { CreditManager } from '@/app/lib/credits/credit-manager';
import { auth } from '@/app/lib/firebase-admin'; // Add this import


const generationJobs = new Map<string, any>();

export async function POST(request: NextRequest) {
    try {
        const body: GenerationRequest = await request.json();
        const { prompt, model, appType = 'web', includeBackend = false } = body;

        // Get auth token
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const decodedToken = await auth.verifyIdToken(token);
        const userId = decodedToken.uid;

        // Check credits
        const creditManager = new CreditManager();
        const hasCredits = await creditManager.checkCredits(userId, model);

        if (!hasCredits) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Insufficient credits. Please upgrade your plan.'
                },
                { status: 402 } // Payment Required
            );
        }

        // Validate request
        if (!prompt || !model) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Create job ID
        const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Store initial job status
        generationJobs.set(jobId, {
            id: jobId,
            status: 'processing',
            createdAt: new Date()
        });

        // Enhance prompt
        const enhancer = new PromptEnhancer();
        const enhancedPrompt = enhancer.enhancePrompt({
            prompt,
            model,
            appType,
            includeBackend
        });

        // Generate code based on selected model
        let generatedCode: GeneratedCode;

        if (process.env.USE_MOCK_API === 'true') {
            // Mock response for testing
            generatedCode = {
                files: [
                    {
                        path: 'package.json',
                        content: JSON.stringify({
                            name: 'generated-app',
                            version: '1.0.0',
                            scripts: {
                                dev: 'next dev',
                                build: 'next build',
                                start: 'next start',
                                lint: 'next lint'
                            },
                            dependencies: {
                                'next': '^14.0.0',
                                'react': '^18.0.0',
                                'react-dom': '^18.0.0',
                                'typescript': '^5.0.0'
                            },
                            devDependencies: {
                                '@types/node': '^20.0.0',
                                '@types/react': '^18.0.0',
                                '@types/react-dom': '^18.0.0',
                                'tailwindcss': '^3.3.0',
                                'postcss': '^8.4.31',
                                'autoprefixer': '^10.4.16'
                            }
                        }, null, 2),
                        language: 'json'
                    },
                    {
                        path: 'app/page.tsx',
                        content: `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Generated App
        </h1>
        <p className="text-center text-gray-600">
          This is your AI-generated application
        </p>
      </div>
    </main>
  );
}`,
                        language: 'typescript'
                    }
                ],
                structure: {
                    name: 'app',
                    type: 'folder' as const,
                    children: []
                },
                dependencies: {
                    npm: {}
                },
                instructions: 'Mock generation successful'
            };
        } else {
            // Real API calls
            try {
                if (model === 'claude') {
                    const anthropicKey = process.env.ANTHROPIC_API_KEY;
                    if (!anthropicKey) {
                        throw new Error('Claude API key not configured');
                    }
                    const service = new AnthropicService(anthropicKey);
                    generatedCode = await service.generateCode(enhancedPrompt);

                } else if (model === 'gemini-flash' || model === 'gemini-pro') {
                    const geminiKey = process.env.GEMINI_API_KEY;
                    if (!geminiKey) {
                        throw new Error('Gemini API key not configured');
                    }
                    const service = new GeminiService(geminiKey);
                    generatedCode = await service.generateCode(
                        enhancedPrompt,
                        model === 'gemini-pro' ? 'gemini-pro' : 'gemini-flash'
                    );

                } else {
                    const openaiKey = process.env.OPENAI_API_KEY;
                    if (!openaiKey) {
                        throw new Error('OpenAI API key not configured');
                    }
                    const service = new OpenAIService(openaiKey);
                    generatedCode = await service.generateCode(
                        enhancedPrompt,
                        model === 'gpt4' ? 'gpt4' : 'gpt3.5'
                    );
                }
            } catch (apiError: any) {
                // Return the specific API error to the client
                return NextResponse.json(
                    {
                        success: false,
                        error: apiError.message || 'API generation failed'
                    },
                    { status: 500 }
                );
            }
        }

        // Update job with generated code
        generationJobs.set(jobId, {
            id: jobId,
            status: 'completed',
            code: generatedCode,
            createdAt: new Date()
        });

        const response: GenerationResponse = {
            success: true,
            data: {
                id: jobId,
                status: 'completed',
                code: generatedCode,
                estimatedTime: 30
            }
        };

        // After successful generation, deduct credits
        await creditManager.deductCredits(userId, model);

        return NextResponse.json(response);

    } catch (error) {
        console.error('Generation error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Generation failed'
            },
            { status: 500 }
        );
    }
}

// Get job status endpoint remains the same
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
        return NextResponse.json(
            { success: false, error: 'Job ID required' },
            { status: 400 }
        );
    }

    const job = generationJobs.get(jobId);
    if (!job) {
        return NextResponse.json(
            { success: false, error: 'Job not found' },
            { status: 404 }
        );
    }

    return NextResponse.json({
        success: true,
        data: job
    });
}