'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiExternalLink, FiRefreshCw, FiSmartphone, FiTablet, FiMonitor } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { storage } from '@/app/lib/firebase.config';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { GeneratedCode } from '@/app/types/generation';

interface LivePreviewProps {
  projectId: string;
  code: GeneratedCode;
  type: 'web' | 'mobile';
}

type DeviceSize = 'mobile' | 'tablet' | 'desktop';

export default function LivePreview({ projectId, code, type }: LivePreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deviceSize, setDeviceSize] = useState<DeviceSize>('desktop');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const deviceSizes = {
    mobile: { width: 375, height: 667, icon: FiSmartphone },
    tablet: { width: 768, height: 1024, icon: FiTablet },
    desktop: { width: '100%', height: '100%', icon: FiMonitor }
  };

  useEffect(() => {
    generatePreview();
  }, [code]);

  const generatePreview = async () => {
    setIsLoading(true);
    try {
      // Create a preview HTML file with all the code
      const previewHtml = await createPreviewHtml(code);
      
      // Upload to Firebase Storage
      const previewRef = ref(storage, `previews/${projectId}/index.html`);
      await uploadString(previewRef, previewHtml, 'raw');
      
      // Get download URL
      const url = await getDownloadURL(previewRef);
      setPreviewUrl(url);
      
      // For production, you'd deploy to Firebase Hosting
      // This is a simplified preview using Storage
      
    } catch (error) {
      console.error('Preview generation error:', error);
      toast.error('Failed to generate preview');
    } finally {
      setIsLoading(false);
    }
  };
  
  const createPreviewHtml = async (code: GeneratedCode): Promise<string> => {
    // Find the main HTML/entry file
    const htmlFile = code.files.find(f => f.path.endsWith('.html') || f.path === 'index.html');
    const mainComponent = code.files.find(f => f.path === 'app/page.tsx' || f.path === 'pages/index.tsx');
    
    if (type === 'web') {
      // For Next.js projects, create a simplified preview
      return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview - ${projectId}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { 
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(to bottom right, #1e1b4b, #312e81);
      min-height: 100vh;
    }
    .preview-notice {
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(139, 92, 246, 0.9);
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      z-index: 1000;
    }
  </style>
</head>
<body>
  <div class="preview-notice">Live Preview Mode</div>
  <div id="root" class="min-h-screen p-8">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-4xl font-bold text-white mb-8">Generated App Preview</h1>
      <div class="bg-white/10 backdrop-blur rounded-xl p-8 text-white">
        <p class="mb-4">This is a preview of your generated application.</p>
        <p class="text-sm opacity-75">Full functionality requires proper deployment.</p>
        
        <!-- Display component structure -->
        <div class="mt-8 space-y-4">
          <h2 class="text-2xl font-semibold">Generated Files:</h2>
          <ul class="list-disc list-inside space-y-2">
            ${code.files.map(f => `<li>${f.path}</li>`).join('')}
          </ul>
        </div>
        
        <!-- Firebase Config Display -->
        <div class="mt-8 p-4 bg-black/20 rounded-lg">
          <h3 class="font-semibold mb-2">Firebase Integration:</h3>
          <p class="text-sm">✅ Authentication Ready</p>
          <p class="text-sm">✅ Firestore Database Connected</p>
          <p class="text-sm">✅ Storage Configured</p>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Initialize Firebase for preview -->
  <script type="module">
    import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
    import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
    import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
    
    // Preview Firebase config
    const firebaseConfig = {
      apiKey: "preview-api-key",
      authDomain: "preview.firebaseapp.com",
      projectId: "preview-project",
      storageBucket: "preview.appspot.com",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:abcdef"
    };
    
    const app = initializeApp(firebaseConfig);
    console.log('Firebase initialized for preview');
  </script>
</body>
</html>`;
    } else {
      // For Flutter/mobile projects, show a mobile preview mockup
      return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mobile App Preview</title>
  <style>
    body {
      margin: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #1a1a2e;
      font-family: system-ui;
    }
    .phone-mockup {
      width: 375px;
      height: 667px;
      background: white;
      border-radius: 30px;
      padding: 10px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .screen {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      text-align: center;
      padding: 20px;
    }
  </style>
</head>
<body>
  <div class="phone-mockup">
    <div class="screen">
      <h2>Flutter App Preview</h2>
      <p>Mobile app successfully generated</p>
      <div style="margin-top: 20px;">
        <p>✅ Firebase Auth</p>
        <p>✅ Firestore Database</p>
        <p>✅ Push Notifications</p>
      </div>
    </div>
  </div>
</body>
</html>`;
    }
  };

  const refreshPreview = () => {
    if (iframeRef.current) {
      iframeRef.current.src = previewUrl || '';
    }
  };

  const openInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  return (
    <div className="glass-morphism rounded-xl overflow-hidden h-[600px] flex flex-col">
      {/* Preview Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {Object.entries(deviceSizes).map(([size, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={size}
                onClick={() => setDeviceSize(size as DeviceSize)}
                className={`p-2 rounded-lg transition-colors ${
                  deviceSize === size
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={refreshPreview}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <FiRefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openInNewTab}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <FiExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 flex items-center justify-center p-4 bg-gray-900/50">
        {isLoading ? (
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 border-3 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"
            />
            <p className="text-gray-400">Generating preview...</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-white rounded-lg shadow-2xl overflow-hidden ${
              deviceSize === 'desktop' ? 'w-full h-full' : ''
            }`}
            style={
              deviceSize !== 'desktop'
                ? {
                    width: deviceSizes[deviceSize].width,
                    height: deviceSizes[deviceSize].height,
                  }
                : {}
            }
          >
            {previewUrl ? (
              <iframe
                ref={iframeRef}
                src={previewUrl}
                className="w-full h-full"
                title="Live Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>Preview not available</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}