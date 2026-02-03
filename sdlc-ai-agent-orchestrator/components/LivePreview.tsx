"use client";

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LivePreviewProps {
  code: string;
}

const LivePreview: React.FC<LivePreviewProps> = ({ code }) => {
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [errorDetails, setErrorDetails] = useState<{ message: string; stack?: string } | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const codeKey = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      const char = code.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }, [code]);

  const handleRetry = useCallback(() => {
    setErrorDetails(null);
    setIsIframeLoading(true);
    setRetryKey(k => k + 1);
  }, []);

  const srcDoc = useMemo(() => {
    if (!code) return '';

    let cleanCode = code.trim();
    const codeBlockRegex = /```(?:jsx|tsx|javascript|typescript|js|ts)?\n([\s\S]*?)\n```/g;
    const matches = Array.from(cleanCode.matchAll(codeBlockRegex));
    if (matches.length > 0) {
      cleanCode = matches.map(m => m[1]).join('\n\n');
    } else {
      cleanCode = cleanCode.replace(/^```[\s\S]*?\n/, '').replace(/\n```$/, '').trim();
    }

    // Fixes for common LLM hallucinations
    if (cleanCode.includes('\\n') && !cleanCode.includes('\n')) {
      cleanCode = cleanCode.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }
    cleanCode = cleanCode.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    cleanCode = cleanCode.replace(/from\s+['"]lucide-react\/[^'"]+['"]/g, "from 'lucide-react'");

    const toBase64 = (str: string) => {
      try { return btoa(unescape(encodeURIComponent(str))); }
      catch (e) { return ""; }
    };

    const encodedCode = toBase64(cleanCode);

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <script src="https://cdn.tailwindcss.com"></script>
          <script type="importmap">
            {
              "imports": {
                "react": "https://esm.sh/react@18.2.0",
                "react-dom": "https://esm.sh/react-dom@18.2.0",
                "react-dom/client": "https://esm.sh/react-dom@18.2.0/client",
                "lucide-react": "https://esm.sh/lucide-react@0.460.0",
                "framer-motion": "https://esm.sh/framer-motion@11.11.11?external=react",
                "three": "https://esm.sh/three@0.165.0",
                "@react-three/fiber": "https://esm.sh/@react-three/fiber@8.16.8?external=react,react-dom",
                "@react-three/drei": "https://esm.sh/@react-three/drei@9.108.3?external=react,react-dom,@react-three/fiber"
              }
            }
          </script>
          <style>
            body { margin: 0; padding: 0; background: #020205; color: #fff; font-family: sans-serif; }
            #root { min-height: 100vh; }
            .dhara-loader { 
              display: flex; height: 100vh; align-items: center; justify-content: center; 
              background: #020205; flex-direction: column; gap: 20px;
            }
          </style>
        </head>
        <body>
          <div id="root">
            <div class="dhara-loader">
              <div style="width: 30px; height: 30px; border: 2px solid rgba(99, 102, 241, 0.2); border-top-color: #6366f1; border-radius: 50%; animation: spin 1s linear infinite;"></div>
              <div style="font-size: 9px; font-weight: 900; letter-spacing: 0.4em; color: #6366f1; text-transform: uppercase;">Synthesizing...</div>
            </div>
          </div>
          <script type="module">
            import React from 'react';
            import { createRoot } from 'react-dom/client';
            
            window.onerror = (msg, url, line, col, error) => {
              window.parent.postMessage({ type: 'RUNTIME_ERROR', error: { message: msg, stack: error?.stack } }, '*');
            };

            async function run() {
              try {
                let rawCode = decodeURIComponent(escape(atob("${encodedCode}")));
                if (!rawCode.includes('export ')) rawCode += '\\nexport default App;';

                const transformedCode = Babel.transform(rawCode, {
                  presets: ['react', 'typescript'],
                  filename: 'App.tsx'
                }).code;

                const blob = new Blob([transformedCode], { type: 'text/javascript' });
                const url = URL.createObjectURL(blob);
                const module = await import(url);
                const App = module.default || module.App;

                const root = createRoot(document.getElementById('root'));
                root.render(React.createElement(App));
                window.parent.postMessage({ type: 'RENDER_COMPLETE' }, '*');
              } catch (err) {
                window.parent.postMessage({ type: 'RUNTIME_ERROR', error: { message: err.message, stack: err.stack } }, '*');
              }
            }
            run();
          </script>
          <style> @keyframes spin { to { transform: rotate(360deg); } } </style>
        </body>
      </html>
    `;
  }, [code, retryKey]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'RUNTIME_ERROR') {
        setErrorDetails(event.data.error);
        setIsIframeLoading(false);
      } else if (event.data.type === 'RENDER_COMPLETE') {
        setIsIframeLoading(false);
        setErrorDetails(null);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="flex-1 flex flex-col relative min-h-0 bg-[#020205] rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]">
      
      {/* Studio Header (Obsidian Shell) */}
      <div className="h-14 bg-black/60 backdrop-blur-xl border-b border-white/5 flex items-center px-6 justify-between shrink-0 z-20">
        <div className="flex items-center gap-6">
          <div className="flex gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          </div>
          
          <div className="hidden lg:flex items-center bg-white/[0.03] border border-white/5 px-4 py-1.5 rounded-xl gap-3 min-w-[320px]">
            <svg className="w-3 h-3 text-indigo-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0112 3v8h4.516a10.003 10.003 0 01-3.44 9.571l-.054.09" />
            </svg>
            <span className="text-[10px] font-bold font-mono text-slate-500 tracking-widest uppercase">dhara://environment.alpha</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <AnimatePresence mode="wait">
            {!errorDetails && !isIframeLoading && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-2 px-3 py-1 bg-emerald-500/5 border border-emerald-500/20 rounded-full"
              >
                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Nominal</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleRetry}
            className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-indigo-400 transition-all active:scale-90"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 relative min-h-0 bg-[#020205]">
        {/* Synthetic Loading Overlay */}
        {isIframeLoading && !errorDetails && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020205] gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-2 border-indigo-500/10 rounded-full" />
              <div className="absolute inset-0 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 blur-xl bg-indigo-500/20 animate-pulse" />
            </div>
            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.4em] animate-pulse">Flowing Intelligence...</p>
          </div>
        )}

        {/* Runtime Exception UI */}
        {errorDetails ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#020205] p-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="max-w-xl w-full bg-red-500/[0.02] border border-red-500/20 p-8 rounded-[2rem] backdrop-blur-3xl"
            >
              <div className="flex items-center gap-5 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">System Exception</h3>
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Logic Flow Interrupted</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-5 bg-black rounded-xl border border-white/5 font-mono text-[12px] text-red-200 leading-relaxed shadow-inner">
                  {errorDetails.message}
                </div>

                <button
                  onClick={handleRetry}
                  className="w-full py-4 bg-white text-black font-black text-[10px] uppercase tracking-[0.3em] rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-[0.98] shadow-2xl"
                >
                  Force Purge & Re-Sync
                </button>
              </div>
            </motion.div>
          </div>
        ) : (
          <iframe
            key={`${retryKey}-${codeKey}`}
            srcDoc={srcDoc}
            onLoad={() => setIsIframeLoading(false)}
            className={`w-full h-full border-none bg-white transition-opacity duration-1000 ${isIframeLoading ? 'opacity-0' : 'opacity-100'}`}
            sandbox="allow-scripts allow-modals allow-forms allow-popups"
          />
        )}
      </div>
    </div>
  );
};

export default LivePreview;