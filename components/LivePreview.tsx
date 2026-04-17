import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react';

interface LivePreviewProps {
  code: string | Record<string, string>;
}

/**
 * Pre-process AI-generated code to fix common issues before sending to Babel:
 * 1. Strip markdown fences
 * 2. Replace font-['...'] Tailwind arbitrary values that break Babel string parsing
 * 3. Ensure cn() is available
 */
function preprocessCode(raw: string): string {
  // 1. Strip markdown code fences
  const fenceRegex = /```(?:jsx|tsx|javascript|typescript|js|ts)?\n([\s\S]*?)\n```/g;
  const matches = Array.from(raw.matchAll(fenceRegex));
  if (matches.length > 0) {
    raw = matches.map(m => m[1]).join('\n\n');
  } else {
    raw = raw.replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '').trim();
  }

  // 2. Replace import.meta.env references
  raw = raw
    .replace(/import\.meta\.env\.VITE_API_BASE_URL/g, "'http://localhost:3001'")
    .replace(/import\.meta\.env\.VITE_[\w]+/g, "''")
    .replace(/import\.meta\.env/g, "({DEV:false,PROD:true,MODE:'production',BASE_URL:'/'})");

  // 3. Remove internal relative imports (they can't resolve in the sandbox)
  // Improved regex to handle leading spaces and multiple variants (@/, ./, ../, etc.)
  raw = raw.replace(/^\s*import\s+.*\s+from\s+['"](@\/|\.|\.\.).*['"]\s*;?/gm, '// [internal import removed]');

  // 4. Replace Tailwind arbitrary font family values that break Babel
  // e.g. font-['Inter'] -> font-sans  (Babel chokes on the single-quotes inside JSX strings)
  raw = raw.replace(/font-\['[^']+'\]/g, 'font-sans');
  raw = raw.replace(/font-\["[^"]+"\]/g, 'font-sans');

  // 5. Ensure cn is available — add a local polyfill only if referenced but not imported/declared
  // We use var because it allows redeclaration, avoiding "already declared" errors if the AI provides its own local version
  const hasCn = /\bcn\s*\(/.test(raw);
  const importsCn = /import\s+.*\bcn\b.*from/.test(raw);
  const declaresCn = /\b(function|const|let|var)\s+cn\b/.test(raw);
  
  if (hasCn && !importsCn && !declaresCn) {
    raw = `// cn polyfill injected by preview sandbox\nvar cn = window.cn || ((...args) => args.filter(Boolean).join(' '));\n` + raw;
  }

  // 6. Replace any remaining imports of cn/clsx/tailwind-merge with local stubs
  raw = raw.replace(/import\s+\{?\s*cn\s*\}?\s*from\s+['"][^'"]+['"]\s*;?/g, '// cn imported from sandbox polyfill');
  raw = raw.replace(/import\s+clsx\s+from\s+['"][^'"]+['"]\s*;?/g, 'var clsx = window.clsx || ((...args) => args.filter(Boolean).join(" "));');
  raw = raw.replace(/import\s+\{\s*clsx\s*\}\s+from\s+['"][^'"]+['"]\s*;?/g, 'var clsx = window.clsx || ((...args) => args.filter(Boolean).join(" "));');

  return raw;
}

const LivePreview: React.FC<LivePreviewProps> = ({ code }) => {
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [errorDetails, setErrorDetails] = useState<{ message: string; stack?: string } | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (code) {
      setIsIframeLoading(true);
      setErrorDetails(null);
      const timeout = setTimeout(() => setIsIframeLoading(false), 20000);
      return () => clearTimeout(timeout);
    }
  }, [code, retryKey]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'RENDER_COMPLETE') {
        setIsIframeLoading(false);
      }
      if (event.data?.type === 'RENDER_ERROR') {
        setIsIframeLoading(false);
        setErrorDetails({
          message: event.data.error,
          stack: event.data.stack,
        });
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

  // Show placeholder when no code
  if (
    !code ||
    (typeof code === 'string' && code.trim().length === 0) ||
    (typeof code === 'object' && Object.keys(code).length === 0)
  ) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0f172a] rounded-2xl border border-slate-800 shadow-2xl">
        <div className="w-16 h-16 bg-slate-800/50 rounded-3xl border border-slate-700 flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-slate-400">Preview will appear here</p>
        <p className="text-xs text-slate-600 mt-1">Complete the Development phase to render your application.</p>
      </div>
    );
  }

  const srcDoc = useMemo(() => {
    if (!code) return '';

    // Intelligent Multi-File Synthesis: Combine all components into one build
    let rawCode = '';
    if (typeof code === 'string') {
      rawCode = code.trim();
    } else {
      const keys = Object.keys(code);
      const findKey = (suffix: string) => keys.find(k => k.endsWith(suffix));
      const entryKey = findKey('App.tsx') || findKey('index.tsx') || findKey('App.jsx') || findKey('index.jsx');
      
      // Separate entry from support files
      const entryContent = entryKey ? (code as Record<string, string>)[entryKey] : (Object.values(code)[0] || '');
      const otherFiles = keys.filter(k => k !== entryKey);
      
      // Concatenate support files (stripping export default so they don't collision)
      const supportCode = otherFiles.map(f => {
         let content = (code as Record<string, string>)[f];
         content = content.replace(/export\s+default\s+/g, '// [stripped] export default ');
         return `// FILE: ${f}\n${content}`;
      }).join('\n\n');
      
      rawCode = supportCode + '\n\n' + '// --- ENTRY POINT ---\n' + entryContent;
    }

    // Pre-process the code before handing to Babel
    const cleanCode = preprocessCode(rawCode);

    // Safely encode to Base64 (handles Unicode)
    const toBase64 = (str: string) => {
      try {
        const bytes = new TextEncoder().encode(str);
        const binString = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
        return btoa(binString);
      } catch {
        return '';
      }
    };

    const base64Code = toBase64(cleanCode);

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script type="importmap">
      {
        "imports": {
          "react": "https://esm.sh/react@19.0.0",
          "react/": "https://esm.sh/react@19.0.0/",
          "react-dom": "https://esm.sh/react-dom@19.0.0?external=react",
          "react-dom/client": "https://esm.sh/react-dom@19.0.0/client?external=react",
          "lucide-react": "https://esm.sh/lucide-react@0.474.0?external=react",
          "framer-motion": "https://esm.sh/framer-motion@11.11.11?external=react",
          "clsx": "https://esm.sh/clsx@2.1.1",
          "tailwind-merge": "https://esm.sh/tailwind-merge@2.6.0",
          "recharts": "https://esm.sh/recharts@2.15.0?external=react",
          "date-fns": "https://esm.sh/date-fns@4.1.0",
          "react-router-dom": "https://esm.sh/react-router-dom@6.28.0?external=react",
          "axios": "https://esm.sh/axios@1.7.9?external=react",
          "zustand": "https://esm.sh/zustand@4.5.2?external=react",
          "zustand/middleware": "https://esm.sh/zustand@4.5.2/middleware?external=react"
        }
      }
    </script>
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      body { margin: 0; padding: 0; background: #ffffff; min-height: 100vh; overflow-x: hidden; font-family: system-ui, -apple-system, sans-serif; }
      #root { min-height: 100vh; }
    </style>
    <script>
      // Global error handler — reports to parent
      window.onerror = function(message, source, lineno, colno, error) {
        window.parent.postMessage({
          type: 'RENDER_ERROR',
          error: message + ' (' + source + ':' + lineno + ':' + colno + ')',
          stack: error ? error.stack : 'No stack trace'
        }, '*');
        return true;
      };
      window.addEventListener('unhandledrejection', function(e) {
        window.parent.postMessage({
          type: 'RENDER_ERROR',
          error: e.reason ? (e.reason.message || String(e.reason)) : 'Unhandled promise rejection',
          stack: e.reason && e.reason.stack ? e.reason.stack : ''
        }, '*');
      });

      window.cn = function() {
        return Array.from(arguments).filter(Boolean).join(' ');
      };
      window.clsx = window.cn;
      window.classNames = window.cn;

      // Global Fetch Interceptor to catch "Failed to fetch" and provide context
      const originalFetch = window.fetch;
      window.fetch = function(input, init) {
        const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
        return originalFetch.apply(this, arguments).catch(err => {
          if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
            const isLocal = url.includes('localhost:3001') || url.includes('127.0.0.1:3001');
            const enhancedError = new Error(
              \`Failed to fetch: \${url}. \${isLocal ? 'The backend server (port 3001) might not be running or reachable.' : 'Check your internet connection or CORS settings.'}\`
            );
            enhancedError.stack = err.stack;
            throw enhancedError;
          }
          throw err;
        });
      };

      // import.meta.env shim
      try {
        if (typeof globalThis.__import_meta_env === 'undefined') {
          globalThis.__import_meta_env = {
            VITE_API_BASE_URL: 'http://localhost:3001',
            VITE_GEMINI_API_KEY: '',
            MODE: 'production', DEV: false, PROD: true, BASE_URL: '/'
          };
        }
      } catch(e) {}

      // Tailwind custom config for arbitrary values and dark mode
      window.tailwind && (window.tailwind.config = {
        darkMode: 'class',
        theme: { extend: {} }
      });
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">
      import React from 'react';
      import { createRoot } from 'react-dom/client';

      const base64Code = "${base64Code}";
      const decodedCode = new TextDecoder().decode(
        Uint8Array.from(atob(base64Code), c => c.charCodeAt(0))
      );

      async function waitForBabel() {
        if (typeof Babel !== 'undefined') return;
        await new Promise(resolve => {
          const id = setInterval(() => {
            if (typeof Babel !== 'undefined') { clearInterval(id); resolve(); }
          }, 50);
          setTimeout(() => { clearInterval(id); resolve(); }, 5000);
        });
      }

      async function run() {
        try {
          if (!decodedCode || decodedCode.trim().length < 20) {
            throw new Error('Generated code is too short or empty.');
          }

          await waitForBabel();

          if (typeof Babel === 'undefined') {
            throw new Error('Babel failed to load. Check your network connection.');
          }

          // Transform with Babel using classic JSX runtime
          const transformed = Babel.transform(decodedCode, {
            presets: [
              ['react', { runtime: 'classic' }],
              ['typescript', { isTSX: true, allExtensions: true }]
            ],
            plugins: [],
            filename: 'app.tsx'
          }).code;

          const blob = new Blob([transformed], { type: 'text/javascript' });
          const url = URL.createObjectURL(blob);
          const module = await import(url);
          URL.revokeObjectURL(url);

          const App = module.default;
          if (!App) {
            throw new Error("No default export found in the generated code. Make sure the component uses 'export default'.");
          }

          const root = createRoot(document.getElementById('root'));
          root.render(React.createElement(App));

          window.parent.postMessage({ type: 'RENDER_COMPLETE' }, '*');
        } catch (err) {
          window.parent.postMessage({
            type: 'RENDER_ERROR',
            error: err.message || String(err),
            stack: err.stack || ''
          }, '*');
        }
      }

      run();
    </script>
  </body>
</html>`;
  }, [code, retryKey]);

  const handleOpenExternal = useCallback(() => {
    const blob = new Blob([srcDoc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }, [srcDoc]);

  return (
    <div className="flex-1 flex flex-col relative min-h-0 bg-white rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Loading overlay */}
      {isIframeLoading && !errorDetails && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0f172a] backdrop-blur-md">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></div>
            </div>
          </div>
          <p className="mt-6 text-xs font-bold text-slate-400 tracking-[0.3em] animate-pulse uppercase">
            Synthesizing Visual Interface
          </p>
        </div>
      )}

      {/* Toolbar when loaded */}
      {!errorDetails && !isIframeLoading && (
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <button
            onClick={handleRetry}
            className="p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-700 backdrop-blur-md transition-all shadow-xl"
            title="Reload Preview"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenExternal}
            className="p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-700 backdrop-blur-md transition-all shadow-xl"
            title="Open in New Tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error state */}
      {errorDetails ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0f172a] overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-rose-500/30 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
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
                  <pre className="text-[11px] font-mono text-slate-500 overflow-x-auto whitespace-pre-wrap max-h-48 p-4 bg-slate-950/50 rounded-xl">
                    {errorDetails.stack}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRetry}
                className="flex-1 py-4 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-xs transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3 h-3" />
                Re-initialize Environment
              </button>
              <button
                onClick={() => window.location.reload()}
                className="py-4 px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold text-xs transition-all"
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
