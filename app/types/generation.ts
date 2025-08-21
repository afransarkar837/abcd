export interface GenerationRequest {
  prompt: string;
  model: 'claude' | 'gpt4' | 'gpt3.5' | 'gemini-flash' | 'gemini-pro';
  appType: 'web' | 'mobile';
  includeBackend: boolean;
}

// Rest of the types remain the same...

export interface GenerationResponse {
  success: boolean;
  data?: {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
    code?: GeneratedCode;
    error?: string;
    estimatedTime?: number;
  };
  error?: string;
}

export interface GeneratedCode {
  files: CodeFile[];
  structure: FolderStructure;
  dependencies: Dependencies;
  instructions: string;
}

export interface CodeFile {
  path: string;
  content: string;
  language: string;
}

export interface FolderStructure {
  name: string;
  type: 'folder' | 'file';
  children?: FolderStructure[];
}

export interface Dependencies {
  npm?: Record<string, string>;
  flutter?: Record<string, string>;
}

export interface ProjectConfig {
  name: string;
  type: 'nextjs' | 'flutter';
  features: string[];
  backend: boolean;
}