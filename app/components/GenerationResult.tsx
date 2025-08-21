'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCode, FiEye, FiUpload, FiSettings, FiCheck, FiAlertCircle } from 'react-icons/fi';
import CodeViewer from './code-viewer/CodeViewer';
import { GeneratedCode } from '@/app/types/generation';
import { ProjectStorage } from '@/app/lib/firebase/project-storage';
import { toast } from 'react-hot-toast';

interface GenerationResultProps {
  code: GeneratedCode;
  projectName: string;
  appType: 'web' | 'mobile';
  hasBackend: boolean;
  model: string;
}

type TabType = 'code' | 'preview' | 'deploy' | 'settings';

export default function GenerationResult({
  code,
  projectName,
  appType,
  hasBackend,
  model
}: GenerationResultProps) {
  const [activeTab, setActiveTab] = useState<TabType>('code');
  const [isSaving, setIsSaving] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const tabs = [
    { id: 'code' as TabType, label: 'Code', icon: FiCode },
    { id: 'preview' as TabType, label: 'Preview', icon: FiEye },
    { id: 'deploy' as TabType, label: 'Deploy', icon: FiUpload },
    { id: 'settings' as TabType, label: 'Settings', icon: FiSettings },
  ];

  // Generate project ID on mount
  useEffect(() => {
    const generatedId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setProjectId(generatedId);
  }, []);

  // Helper function to escape HTML
  const escapeHtml = (text: string): string => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  };

  const saveToFirebase = async () => {
    if (!projectId) {
      toast.error('Project ID not generated yet');
      return;
    }

    setIsSaving(true);
    try {
      const storage = new ProjectStorage();

      // For now, we'll use a mock user ID. In production, get from auth
      const mockUserId = 'user_' + Math.random().toString(36).substr(2, 9);

      await storage.saveProject(mockUserId, {
        name: projectName,
        description: `Generated ${appType} app using ${model}`,
        type: appType,
        status: 'completed',
        code,
        metadata: {
          model,
          totalFiles: code.files.length,
          totalScreens: code.files.filter(f => f.path.includes('page') || f.path.includes('screen')
          ).length,
          hasBackend
        },
        userId: ''
      });

      setIsSaved(true);
      toast.success('Project saved to Firebase successfully!');

    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save project. Check Firebase configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const deployProject = async () => {
    setIsDeploying(true);
    try {
      // Simulate deployment
      await new Promise(resolve => setTimeout(resolve, 3000));

      const mockUrl = `https://${projectName.toLowerCase().replace(/\s+/g, '-')}-${projectId?.slice(-6)}.vercel.app`;
      setDeploymentUrl(mockUrl);
      toast.success('Deployment successful!');

      // Update project status in Firebase if saved
      if (isSaved && projectId) {
        const storage = new ProjectStorage();
        await storage.updateProjectStatus(projectId, 'deployed', mockUrl);
      }

    } catch (error) {
      console.error('Deploy error:', error);
      toast.error('Failed to deploy project');
    } finally {
      setIsDeploying(false);
    }
  };

  // Create preview HTML without using 'this'
  // Update the createPreviewHtml function to better display content
  const createPreviewHtml = (): string => {
    // Find main component files
    const mainFile = code.files.find(f =>
      f.path === 'app/page.tsx' ||
      f.path === 'pages/index.tsx' ||
      f.path === 'app/App.tsx' ||
      f.path === 'src/App.tsx' ||
      f.path.includes('page.tsx') ||
      f.path.includes('index.tsx')
    );

    // Find any React component
    const componentFile = mainFile || code.files.find(f =>
      (f.path.endsWith('.tsx') || f.path.endsWith('.jsx')) &&
      f.content.includes('export default')
    );

    // Get content to display
    let displayContent = '';
    if (componentFile) {
      displayContent = escapeHtml(componentFile.content.substring(0, 800));
    } else {
      // Show the first code file if no component found
      const firstCodeFile = code.files.find(f =>
        !f.path.endsWith('.json') &&
        !f.path.endsWith('.md')
      );
      displayContent = firstCodeFile
        ? escapeHtml(firstCodeFile.content.substring(0, 800))
        : '// No code files found';
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName} - Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    /* Your existing styles */
    body { 
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .preview-container {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    .preview-header {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 1rem;
      padding: 2rem;
      margin-bottom: 2rem;
    }
    .code-preview {
      background: rgba(0, 0, 0, 0.8);
      border-radius: 1rem;
      padding: 2rem;
      color: #fff;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.875rem;
      overflow-x: auto;
      max-height: 400px;
      overflow-y: auto;
    }
    .code-preview pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .file-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1rem;
      margin-top: 2rem;
    }
    .file-card {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 0.5rem;
      padding: 1rem;
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: transform 0.2s;
    }
    .file-card:hover {
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <div class="preview-container">
    <div class="preview-header">
      <h1 class="text-3xl font-bold text-white mb-4">${escapeHtml(projectName)}</h1>
      <p class="text-white/80">Generated ${appType === 'web' ? 'Next.js' : 'Flutter'} Application</p>
      <div class="flex gap-4 mt-4 flex-wrap">
        <span class="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">
          ✓ ${code.files.length} Files Generated
        </span>
        <span class="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
          Model: ${model}
        </span>
        ${hasBackend ? '<span class="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full text-sm">✓ Firebase Backend</span>' : ''}
      </div>
    </div>
    
    <div class="code-preview">
      <h2 class="text-xl font-bold mb-4 text-white">
        ${componentFile ? `📄 ${escapeHtml(componentFile.path)}` : 'Generated Code Preview:'}
      </h2>
      <pre><code>${displayContent}${componentFile && componentFile.content.length > 800 ? '\n\n// ... (truncated)' : ''}</code></pre>
    </div>
    
    <div class="file-grid">
      ${code.files.slice(0, 8).map(file => `
        <div class="file-card">
          <div class="text-white font-medium mb-2">
            ${file.path.endsWith('.tsx') || file.path.endsWith('.jsx') ? '⚛️' : '📄'} ${escapeHtml(file.path.split('/').pop() || file.path)}
          </div>
          <div class="text-white/60 text-sm">${file.language}</div>
          <div class="text-white/40 text-xs mt-2">${file.content.split('\n').length} lines</div>
        </div>
      `).join('')}
    </div>
    
    ${code.files.length > 8 ? `
      <div class="text-center mt-4 text-white/60">
        And ${code.files.length - 8} more files...
      </div>
    ` : ''}
  </div>
</body>
</html>`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-7xl mx-auto p-6"
    >
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-white mb-2">Generation Complete!</h2>
        <p className="text-gray-300">
          Your {appType} application has been generated successfully with {code.files.length} files.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}

        {/* Save Button */}
        {!isSaved && (
          <button
            onClick={saveToFirebase}
            disabled={isSaving}
            className="ml-auto px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <FiUpload className="w-4 h-4" />
                <span>Save to Firebase</span>
              </>
            )}
          </button>
        )}

        {isSaved && (
          <div className="ml-auto flex items-center px-4 py-2 bg-green-500/20 text-green-400 rounded-lg">
            <FiCheck className="w-4 h-4 mr-2" />
            <span>Saved</span>
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'code' && (
          <CodeViewer
            files={code.files}
            structure={code.structure}
            projectName={projectName}
          />
        )}

        {activeTab === 'preview' && (
          <div className="glass-morphism rounded-xl overflow-hidden h-[600px]">
            <iframe
              srcDoc={createPreviewHtml()}
              className="w-full h-full"
              title="Preview"
              sandbox="allow-scripts"
            />
          </div>
        )}

        {activeTab === 'deploy' && (
          <div className="glass-morphism rounded-xl p-8">
            <h3 className="text-2xl font-bold text-white mb-4">Deploy Your Application</h3>

            {!deploymentUrl ? (
              <>
                <p className="text-gray-300 mb-6">
                  Deploy your application to the cloud with one click
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/10 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-2">Vercel Deployment</h4>
                    <p className="text-gray-400 text-sm mb-3">Best for Next.js apps</p>
                    <button
                      onClick={deployProject}
                      disabled={isDeploying || !isSaved}
                      className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-all disabled:opacity-50"
                    >
                      {!isSaved ? 'Save project first' : isDeploying ? 'Deploying...' : 'Deploy to Vercel'}
                    </button>
                  </div>

                  <div className="bg-white/10 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-2">Firebase Hosting</h4>
                    <p className="text-gray-400 text-sm mb-3">Full-stack with backend</p>
                    <button
                      onClick={deployProject}
                      disabled={isDeploying || !isSaved}
                      className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all disabled:opacity-50"
                    >
                      {!isSaved ? 'Save project first' : isDeploying ? 'Deploying...' : 'Deploy to Firebase'}
                    </button>
                  </div>
                </div>

                {!isSaved && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start">
                    <FiAlertCircle className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-yellow-300 text-sm">
                      Please save your project to Firebase before deploying.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <FiCheck className="w-6 h-6 text-green-400 mr-2" />
                  <h4 className="text-green-400 font-semibold">Deployment Successful!</h4>
                </div>
                <p className="text-white mb-4">Your app is now live at:</p>
                <a
                  href={deploymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline break-all"
                >
                  {deploymentUrl}
                </a>
              </div>
            )}

            {hasBackend && (
              <div className="mt-8 bg-white/5 rounded-lg p-6">
                <h4 className="text-white font-semibold mb-3">Firebase Services Included:</h4>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center">
                    <FiCheck className="w-4 h-4 text-green-400 mr-2" />
                    Authentication (Email/Password + Google)
                  </li>
                  <li className="flex items-center">
                    <FiCheck className="w-4 h-4 text-green-400 mr-2" />
                    Firestore Database
                  </li>
                  <li className="flex items-center">
                    <FiCheck className="w-4 h-4 text-green-400 mr-2" />
                    Cloud Storage
                  </li>
                  <li className="flex items-center">
                    <FiCheck className="w-4 h-4 text-green-400 mr-2" />
                    Cloud Functions
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="glass-morphism rounded-xl p-8">
            <h3 className="text-2xl font-bold text-white mb-6">Project Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="text-white font-medium block mb-2">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  readOnly
                />
              </div>

              <div>
                <label className="text-white font-medium block mb-2">Project ID</label>
                <input
                  type="text"
                  value={projectId || 'Generating...'}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  readOnly
                />
              </div>

              <div>
                <label className="text-white font-medium block mb-2">Application Type</label>
                <input
                  type="text"
                  value={appType === 'web' ? 'Next.js Web App' : 'Flutter Mobile App'}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20"
                  readOnly
                />
              </div>

              <div>
                <label className="text-white font-medium block mb-2">AI Model Used</label>
                <input
                  type="text"
                  value={model}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20"
                  readOnly
                />
              </div>

              <div>
                <label className="text-white font-medium block mb-2">Backend Configuration</label>
                <input
                  type="text"
                  value={hasBackend ? 'Firebase (Configured)' : 'Frontend Only'}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20"
                  readOnly
                />
              </div>

              <div>
                <label className="text-white font-medium block mb-2">Total Files Generated</label>
                <input
                  type="text"
                  value={`${code.files.length} files`}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20"
                  readOnly
                />
              </div>

              <div>
                <label className="text-white font-medium block mb-2">Save Status</label>
                <input
                  type="text"
                  value={isSaved ? 'Saved to Firebase' : 'Not saved'}
                  className={`w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 ${isSaved ? 'text-green-400' : 'text-yellow-400'
                    }`}
                  readOnly
                />
              </div>

              {deploymentUrl && (
                <div>
                  <label className="text-white font-medium block mb-2">Deployment URL</label>
                  <input
                    type="text"
                    value={deploymentUrl}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20"
                    readOnly
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}