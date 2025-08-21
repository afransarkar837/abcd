'use client';

import { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FiCopy, FiDownload, FiCheck, FiFile, FiFolder, FiChevronRight, FiChevronDown } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { CodeFile, FolderStructure } from '@/app/types/generation';

interface CodeViewerProps {
  files: CodeFile[];
  structure: FolderStructure;
  projectName?: string;
}

export default function CodeViewer({ files, structure, projectName = 'generated-app' }: CodeViewerProps) {
  const [selectedFile, setSelectedFile] = useState<CodeFile | null>(null);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (files.length > 0 && !selectedFile) {
      setSelectedFile(files[0]);
    }
  }, [files, selectedFile]);

  const copyToClipboard = async (content: string, fileName: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedFile(fileName);
      toast.success(`Copied ${fileName} to clipboard`);
      setTimeout(() => setCopiedFile(null), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const downloadProject = async () => {
    const zip = new JSZip();
    
    // Add all files to zip
    files.forEach(file => {
      zip.file(file.path, file.content);
    });

    // Add Firebase config for generated apps
    const firebaseConfig = generateFirebaseConfig();
    zip.file('firebase.json', JSON.stringify(firebaseConfig, null, 2));
    zip.file('.firebaserc', JSON.stringify({ projects: { default: projectName } }, null, 2));

    // Generate and download zip
    try {
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `${projectName}.zip`);
      toast.success('Project downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download project');
    }
  };

  const generateFirebaseConfig = () => {
    return {
      hosting: {
        public: "out",
        ignore: ["firebase.json", "**/.*", "**/node_modules/**"],
        rewrites: [{ source: "**", destination: "/index.html" }]
      },
      firestore: {
        rules: "firestore.rules",
        indexes: "firestore.indexes.json"
      },
      functions: {
        source: "functions"
      },
      storage: {
        rules: "storage.rules"
      }
    };
  };

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  // Fixed renderFileTree with unique keys
  const renderFileTree = (node: FolderStructure, path: string = '', index: number = 0, parentKey: string = '') => {
    const fullPath = path ? `${path}/${node.name}` : node.name;
    const isExpanded = expandedFolders.has(fullPath);
    
    // Create a unique key using parent key, node name, type, and index
    const uniqueKey = `${parentKey}_${node.name}_${node.type}_${index}`;

    if (node.type === 'file') {
      // Find the matching file - be more specific in matching
      const file = files.find(f => {
        const filePath = f.path;
        const fileName = filePath.split('/').pop();
        return fileName === node.name || f.path === fullPath || f.path.endsWith(`/${node.name}`);
      });
      
      const isSelected = selectedFile?.path === file?.path;

      return (
        <motion.div
          key={uniqueKey}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`flex items-center px-3 py-1.5 cursor-pointer hover:bg-white/10 rounded transition-colors ${
            isSelected ? 'bg-purple-600/20 text-purple-300' : 'text-gray-300'
          }`}
          onClick={() => file && setSelectedFile(file)}
        >
          <FiFile className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="text-sm truncate" title={node.name}>{node.name}</span>
        </motion.div>
      );
    }

    // For folders
    return (
      <div key={uniqueKey}>
        <motion.div
          className="flex items-center px-3 py-1.5 cursor-pointer hover:bg-white/10 rounded transition-colors text-gray-300"
          onClick={() => toggleFolder(fullPath)}
        >
          {isExpanded ? (
            <FiChevronDown className="w-4 h-4 mr-1" />
          ) : (
            <FiChevronRight className="w-4 h-4 mr-1" />
          )}
          <FiFolder className="w-4 h-4 mr-2 text-yellow-400" />
          <span className="text-sm font-medium">{node.name}</span>
        </motion.div>
        
        <AnimatePresence>
          {isExpanded && node.children && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="ml-4"
            >
              {node.children.map((child, childIndex) => 
                renderFileTree(child, fullPath, childIndex, uniqueKey)
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const filteredFiles = files.filter(file => 
    file.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="glass-morphism rounded-xl overflow-hidden h-[600px] flex">
      {/* File Explorer Sidebar */}
      <div className="w-64 border-r border-white/10 flex flex-col">
        {/* Search Bar */}
        <div className="p-3 border-b border-white/10">
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-white/10 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        {/* File Tree */}
        <div className="flex-1 overflow-y-auto p-2">
          {searchQuery ? (
            <div className="space-y-1">
              {filteredFiles.map((file, idx) => (
                <motion.div
                  key={`search_${file.path}_${idx}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`flex items-center px-3 py-1.5 cursor-pointer hover:bg-white/10 rounded transition-colors ${
                    selectedFile?.path === file.path ? 'bg-purple-600/20 text-purple-300' : 'text-gray-300'
                  }`}
                  onClick={() => setSelectedFile(file)}
                >
                  <FiFile className="w-4 h-4 mr-2" />
                  <span className="text-sm truncate" title={file.path}>{file.path}</span>
                </motion.div>
              ))}
            </div>
          ) : (
            renderFileTree(structure, '', 0, 'root')
          )}
        </div>

        {/* Download Button */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={downloadProject}
            className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center space-x-2 text-sm font-medium"
          >
            <FiDownload className="w-4 h-4" />
            <span>Download Project</span>
          </button>
        </div>
      </div>

      {/* Code Display Area */}
      <div className="flex-1 flex flex-col">
        {selectedFile ? (
          <>
            {/* File Header */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FiFile className="w-4 h-4 text-gray-400" />
                <span className="text-white font-medium" title={selectedFile.path}>
                  {selectedFile.path}
                </span>
                <span className="text-xs text-gray-400 px-2 py-1 bg-white/10 rounded">
                  {selectedFile.language}
                </span>
              </div>
              
              <button
                onClick={() => copyToClipboard(selectedFile.content, selectedFile.path)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                title="Copy to clipboard"
              >
                {copiedFile === selectedFile.path ? (
                  <FiCheck className="w-4 h-4 text-green-400" />
                ) : (
                  <FiCopy className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Code Content */}
            <div className="flex-1 overflow-auto">
              <SyntaxHighlighter
                language={selectedFile.language}
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  background: 'transparent',
                  fontSize: '0.875rem',
                  minHeight: '100%'
                }}
                showLineNumbers
                wrapLines
                wrapLongLines
              >
                {selectedFile.content}
              </SyntaxHighlighter>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <FiFile className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a file to view its content</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}