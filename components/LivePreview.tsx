import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { ExternalLink, Maximize2, RefreshCw, AlertTriangle } from 'lucide-react';

interface LivePreviewProps {
  code: string | Record<string, string>;
}

const LivePreview: React.FC<LivePreviewProps> = ({ code }) => {
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [errorDetails, setErrorDetails] = useState<{ message: string; stack?: string } | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (code) {
      setIsIframeLoading(true);
      setErrorDetails(null);
    }
  }, [code]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'RENDER_COMPLETE') {
        setIsIframeLoading(false);
      }
      if (event.data?.type === 'RENDER_ERROR') {
        setIsIframeLoading(false);
        setErrorDetails({
          message: event.data.error,
          stack: event.data.stack
        });
        console.error("Sandbox Runtime Error:", event.data.error, event.data.stack);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleRetry = useCallback(() => {
    setRetryKey(prev => prev + 1);
    setIsIframeLoading(true);
    setErrorDetails(null);
  }, []);

  const srcDoc = useMemo(() => {
    if (!code) return '';

    let cleanCode = '';
    if (typeof code === 'string') {
      cleanCode = code.trim();
    } else {
      // Priority for entry point
      cleanCode = code['App.tsx'] || code['index.tsx'] || Object.values(code)[0] || '';
      // Strip relative imports for simplest functional preview (hallucination mitigation)
      cleanCode = cleanCode.replace(/import\s+.*\s+from\s+['"]\.\/.*['"]/g, '// Internal import omitted for preview');
    }

    // Robust code cleaning: Handle potential markdown wrappers
    const codeBlockRegex = /```(?:jsx|tsx|javascript|typescript|js|ts)?\n([\s\S]*?)\n```/g;
    const matches = Array.from(cleanCode.matchAll(codeBlockRegex));

    if (matches.length > 0) {
      cleanCode = matches.map(m => m[1]).join('\n\n');
    } else {
      cleanCode = cleanCode
        .replace(/^```[a-z]*\n/i, '')
        .replace(/\n```$/, '')
        .trim();
    }

    // Safely encode unicode string to Base64
    const toBase64 = (str: string) => {
      try {
        const bytes = new TextEncoder().encode(str);
        const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
        return btoa(binString);
      } catch (e) {
        return "";
      }
    };

    const base64Code = toBase64(cleanCode);

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <script type="importmap">
            {
              "imports": {
                "react": "https://esm.sh/react@19.0.0",
                "react/": "https://esm.sh/react@19.0.0/",
                "react-dom": "https://esm.sh/react-dom@19.0.0",
                "react-dom/client": "https://esm.sh/react-dom@19.0.0/client",
                "lucide-react": "https://esm.sh/lucide-react@0.460.0?external=react",
                "framer-motion": "https://esm.sh/framer-motion@11.11.11?external=react",
                "clsx": "https://esm.sh/clsx@2.1.1",
                "tailwind-merge": "https://esm.sh/tailwind-merge@2.5.4"
              }
            }
          </script>
          <style>
            body { margin: 0; padding: 0; background: #ffffff; min-height: 100vh; overflow-x: hidden; }
            #root { min-height: 100vh; }
            body.loading { overflow: hidden; }
          </style>
          <script>
            window.onerror = function(message, source, lineno, colno, error) {
              window.parent.postMessage({ 
                type: 'RENDER_ERROR', 
                error: message,
                stack: error ? error.stack : 'No stack trace available'
              }, '*');
            };
          </script>
        </head>
        <body class="loading">
          <div id="root"></div>
          <script type="module">
            import React from 'react';
            import { createRoot } from 'react-dom/client';
            
            const base64Code = "${base64Code}";
            const decodedCode = new TextDecoder().decode(Uint8Array.from(atob(base64Code), c => c.charCodeAt(0)));

            async function run() {
              try {
                if (!decodedCode || decodedCode.trim().length < 20) {
                  throw new Error("Generated code is too short or invalid.");
                }

                if (typeof Babel === 'undefined') {
                   await new Promise(resolve => {
                     const check = setInterval(() => {
                       if (typeof Babel !== 'undefined') {
                         clearInterval(check);
                         resolve();
                       }
                     }, 50);
                   });
                }

                // CRITICAL FIX: Use 'classic' runtime to avoid 'react/jsx-runtime' errors
                const transformed = Babel.transform(decodedCode, {
                  presets: [
                    ['react', { runtime: 'classic' }], 
                    ['typescript', { isTSX: true, allExtensions: true }]
                  ],
                  filename: 'app.tsx'
                }).code;
                
                const blob = new Blob([transformed], { type: 'text/javascript' });
                const url = URL.createObjectURL(blob);
                const module = await import(url);
                
                if (!module.default) {
                  throw new Error("Critical Error: The code was generated without a 'export default'. This usually happens when the model is cut off or hallucinates formatting.");
                }

                const App = module.default;
                const root = createRoot(document.getElementById('root'));
                
                document.body.classList.remove('loading');
                root.render(React.createElement(App));
                
                window.parent.postMessage({ type: 'RENDER_COMPLETE' }, '*');
              } catch (err) {
                window.parent.postMessage({ 
                  type: 'RENDER_ERROR', 
                  error: err.message,
                  stack: err.stack 
                }, '*');
              }
            }
            run();
          </script>
        </body>
      </html>
    `;
  }, [code, retryKey]);

  const handleOpenExternal = useCallback(() => {
    const blob = new Blob([srcDoc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    // We don't revoke immediately to allow the tab to load, 
    // but in a real app we might want to manage this better.
  }, [srcDoc]);

  return (
    <div className="flex-1 flex flex-col relative min-h-0 bg-white rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {isIframeLoading && !errorDetails && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0f172a] backdrop-blur-md">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></div>
            </div>
          </div>
          <p className="mt-6 text-xs font-bold text-slate-400 tracking-[0.3em] animate-pulse uppercase">Synthesizing Visual Interface</p>
        </div>
      )}

      {/* Floating Actions */}
      {!errorDetails && !isIframeLoading && (
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <button
            onClick={handleOpenExternal}
            className="p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-700 backdrop-blur-md transition-all shadow-xl group"
            title="Open in New Tab"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="absolute right-full mr-2 px-2 py-1 bg-slate-900 text-[10px] font-bold text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-800">
              OPEN IN NEW TAB
            </span>
          </button>
        </div>
      )}

      {errorDetails ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0f172a] overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-rose-500/30 rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Interface Synthesis Failed</h2>
                <p className="text-slate-400 text-xs font-medium">The generated logic encountered a runtime conflict.</p>
              </div>
            </div>

            <div className="bg-black/40 rounded-2xl border border-slate-800 p-5 mb-8">
              <div className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
                Runtime Exception
              </div>
              <p className="text-sm font-semibold text-slate-200 mb-4 leading-relaxed">{errorDetails.message}</p>

              {errorDetails.stack && (
                <div className="mt-4">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Stack Analysis</div>
                  <pre className="text-[11px] font-mono text-slate-500 overflow-x-auto whitespace-pre-wrap max-h-48 p-4 bg-slate-950/50 rounded-xl scrollbar-thin scrollbar-thumb-slate-800">
                    {errorDetails.stack}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRetry}
                className="flex-1 py-4 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-xs transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
              >
                Re-initialize Environment
              </button>
              <button
                onClick={() => window.location.reload()}
                className="py-4 px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold text-xs transition-all active:scale-[0.98]"
              >
                Full System Reset
              </button>
            </div>
          </div>
        </div>
      ) : (
        <iframe
          key={retryKey}
          title="Live Preview"
          srcDoc={srcDoc}
          className="flex-1 w-full h-full border-none bg-white"
          sandbox="allow-scripts allow-modals allow-popups allow-forms allow-same-origin"
        />
      )}
    </div>
  );
};

export default LivePreview;
