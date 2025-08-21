import { GeneratedCode, CodeFile, FolderStructure, Dependencies } from '@/app/types/generation';

export abstract class AIService {
  protected apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  abstract generateCode(prompt: string): Promise<GeneratedCode>;
  
  protected parseCodeResponse(response: string): GeneratedCode {
    const files: CodeFile[] = [];
    const fileSet = new Set<string>();
    
    // Improved regex to better capture code blocks with filenames
    const codeBlockRegex = /```(?:(\S+)\n)?([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(response)) !== null) {
      const header = match[1] || '';
      let content = match[2].trim();
      
      if (!content) continue;
      
      let filePath = '';
      let language = 'text';
      
      // Check if header is a filename
      if (header.includes('.') || header.includes('/')) {
        filePath = header;
        language = this.getLanguageFromFilename(filePath);
      } else if (header) {
        // Header might be just a language
        language = header.toLowerCase();
        
        // Try to extract filename from the first line of content
        const lines = content.split('\n');
        const firstLine = lines[0];
        
        // Check if first line is a comment with filename
        if (firstLine.match(/^(\/\/|#|<!--)\s*(File:|Filename:|Path:)?\s*(.+)/i)) {
          const fileMatch = firstLine.match(/^(?:\/\/|#|<!--)\s*(?:File:|Filename:|Path:)?\s*(.+?)(?:\s*-->)?$/i);
          if (fileMatch) {
            filePath = fileMatch[1].trim();
            // Remove the comment line from content
            content = lines.slice(1).join('\n').trim();
          }
        }
      }
      
      // Generate filename based on content if still no path
      if (!filePath) {
        filePath = this.generateFilePathFromContent(content, language, fileSet.size);
      }
      
      // Clean up common issues in content
      content = this.cleanupContent(content, filePath);
      
      // Ensure unique paths
      let uniquePath = filePath;
      let counter = 1;
      while (fileSet.has(uniquePath)) {
        const ext = filePath.substring(filePath.lastIndexOf('.'));
        const base = filePath.substring(0, filePath.lastIndexOf('.'));
        uniquePath = `${base}_${counter}${ext}`;
        counter++;
      }
      
      fileSet.add(uniquePath);
      files.push({
        path: uniquePath,
        content: content,
        language: language
      });
    }
    
    // If no files were parsed, create default files
    if (files.length === 0) {
      files.push(
        {
          path: 'package.json',
          content: JSON.stringify({
            name: 'generated-app',
            version: '1.0.0',
            scripts: {
              dev: 'next dev',
              build: 'next build',
              start: 'next start'
            },
            dependencies: {
              'next': '^14.0.0',
              'react': '^18.0.0',
              'react-dom': '^18.0.0'
            }
          }, null, 2),
          language: 'json'
        },
        {
          path: 'app/page.tsx',
          content: `export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-4xl font-bold">Generated App</h1>
      <p>Your app has been generated successfully!</p>
    </div>
  );
}`,
          language: 'typescript'
        }
      );
    }
    
    return {
      files,
      structure: this.generateStructure(files),
      dependencies: this.extractDependencies(files),
      instructions: 'Generated successfully'
    };
  }
  
  private cleanupContent(content: string, filePath: string): string {
    // For package.json, remove any comments (invalid in JSON)
    if (filePath.endsWith('.json')) {
      // Remove single-line comments
      content = content.replace(/\/\/.*$/gm, '');
      // Remove multi-line comments
      content = content.replace(/\/\*[\s\S]*?\*\//g, '');
      // Remove trailing commas (invalid in JSON)
      content = content.replace(/,(\s*[}\]])/g, '$1');
      
      // Try to parse and re-stringify to ensure valid JSON
      try {
        const parsed = JSON.parse(content);
        content = JSON.stringify(parsed, null, 2);
      } catch {
        // If parsing fails, create a basic valid package.json
        if (filePath.includes('package.json')) {
          content = JSON.stringify({
            name: 'generated-app',
            version: '1.0.0',
            scripts: {
              dev: 'next dev',
              build: 'next build',
              start: 'next start'
            },
            dependencies: {
              'next': '^14.0.0',
              'react': '^18.0.0',
              'react-dom': '^18.0.0'
            }
          }, null, 2);
        }
      }
    }
    
    return content;
  }
  
  private generateFilePathFromContent(content: string, language: string, index: number): string {
    const extensionMap: Record<string, string> = {
      'typescript': '.tsx',
      'javascript': '.jsx',
      'json': '.json',
      'css': '.css',
      'html': '.html',
      'dart': '.dart',
      'yaml': '.yaml',
      'python': '.py',
      'java': '.java',
      'tsx': '.tsx',
      'jsx': '.jsx',
      'ts': '.ts',
      'js': '.js'
    };
    
    const ext = extensionMap[language] || '.txt';
    
    // Try to identify the file type from content
    if (content.includes('export default function Home') || content.includes('export default function Page')) {
      return 'app/page.tsx';
    } else if (content.includes('export default function App')) {
      return 'app/App.tsx';
    } else if (content.includes('export default function Layout')) {
      return 'app/layout.tsx';
    } else if (content.includes('"name"') && content.includes('"version"') && language === 'json') {
      return 'package.json';
    } else if (content.includes('<!DOCTYPE') || content.includes('<html')) {
      return 'index.html';
    } else if (content.includes('@tailwind') || content.includes('globals.css')) {
      return 'app/globals.css';
    } else if (content.includes('export') && content.includes('function')) {
      return `components/Component${index}${ext}`;
    } else {
      return `file_${index}${ext}`;
    }
  }
  
  private getLanguageFromFilename(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'css': 'css',
      'json': 'json',
      'dart': 'dart',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'html': 'html',
      'xml': 'xml',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'py': 'python',
      'java': 'java',
      'swift': 'swift',
      'kt': 'kotlin',
      'rb': 'ruby',
      'php': 'php',
      'go': 'go',
      'rs': 'rust',
      'sql': 'sql',
      'sh': 'bash',
      'bash': 'bash',
      'zsh': 'bash',
      'fish': 'bash'
    };
    return languageMap[ext || ''] || 'text';
  }
  
  private generateStructure(files: CodeFile[]): FolderStructure {
    const root: FolderStructure = {
      name: 'root',
      type: 'folder',
      children: []
    };
    
    const folderMap = new Map<string, FolderStructure>();
    folderMap.set('', root);
    
    const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));
    
    sortedFiles.forEach(file => {
      const parts = file.path.split('/');
      let currentPath = '';
      let currentFolder = root;
      
      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          if (!currentFolder.children) {
            currentFolder.children = [];
          }
          
          const existingFile = currentFolder.children.find(
            c => c.name === part && c.type === 'file'
          );
          
          if (!existingFile) {
            currentFolder.children.push({
              name: part,
              type: 'file'
            });
          }
        } else {
          const folderPath = currentPath ? `${currentPath}/${part}` : part;
          
          if (!folderMap.has(folderPath)) {
            const newFolder: FolderStructure = {
              name: part,
              type: 'folder',
              children: []
            };
            
            if (!currentFolder.children) {
              currentFolder.children = [];
            }
            
            currentFolder.children.push(newFolder);
            folderMap.set(folderPath, newFolder);
            currentFolder = newFolder;
          } else {
            currentFolder = folderMap.get(folderPath)!;
          }
          
          currentPath = folderPath;
        }
      });
    });
    
    return root;
  }
  
  private extractDependencies(files: CodeFile[]): Dependencies {
    const packageJson = files.find(f => 
      f.path === 'package.json' || 
      f.path.endsWith('/package.json')
    );
    
    if (packageJson) {
      try {
        // Clean content before parsing
        let content = packageJson.content;
        
        // Remove comments if any exist
        content = content.replace(/\/\/.*$/gm, '');
        content = content.replace(/\/\*[\s\S]*?\*\//g, '');
        content = content.replace(/,(\s*[}\]])/g, '$1');
        
        const parsed = JSON.parse(content);
        return {
          npm: { 
            ...(parsed.dependencies || {}), 
            ...(parsed.devDependencies || {}) 
          }
        };
      } catch (error) {
        console.warn('Could not parse package.json for dependencies, using defaults');
        return {
          npm: {
            'next': '^14.0.0',
            'react': '^18.0.0',
            'react-dom': '^18.0.0'
          }
        };
      }
    }
    
    // Check for Flutter pubspec.yaml
    const pubspec = files.find(f => 
      f.path === 'pubspec.yaml' || 
      f.path.endsWith('/pubspec.yaml')
    );
    
    if (pubspec) {
      const deps: Record<string, string> = {};
      const lines = pubspec.content.split('\n');
      let inDependencies = false;
      
      lines.forEach(line => {
        if (line.includes('dependencies:')) {
          inDependencies = true;
        } else if (inDependencies && line.match(/^\w/) && !line.includes('dev_dependencies:')) {
          inDependencies = false;
        } else if (inDependencies && line.trim().includes(':')) {
          const [name, version] = line.trim().split(':').map(s => s.trim());
          if (name && version) {
            deps[name] = version;
          }
        }
      });
      
      return { flutter: deps };
    }
    
    return {
      npm: {
        'next': '^14.0.0',
        'react': '^18.0.0',
        'react-dom': '^18.0.0'
      }
    };
  }
}