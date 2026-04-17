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
  // This now handles multiline imports and various path formats (@/, ./, ../)
  raw = raw.replace(/import\s+[\s\S]*?\s+from\s+['"](@\/|\.|\.\.).*?['"]\s*;?/g, '// [internal import removed]');

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
      const allKeys = Object.keys(code);
      // Filter for frontend files only (src/, frontend/, public/) and exclude backend/server code
      // Also exclude common bootstrap files that try to render to #root themselves, as LivePreview handles that.
      const keys = allKeys.filter(k => 
        (k.startsWith('src/') || k.startsWith('frontend/') || k.startsWith('public/') || !k.includes('/')) && 
        /\.(jsx|tsx|js|ts|css)$/.test(k) &&
        !k.endsWith('main.jsx') && !k.endsWith('main.tsx') && !k.endsWith('index.html')
      );

      const findKey = (suffix: string) => keys.find(k => k.endsWith(suffix));
      const entryKey = findKey('App.tsx') || findKey('App.jsx') || findKey('index.tsx') || findKey('index.jsx');
      
      const entryContent = entryKey ? (code as Record<string, string>)[entryKey] : (Object.values(code)[0] || '');
      const otherFiles = keys.filter(k => k !== entryKey);
      
      const allFiles = [...otherFiles.map(f => ({ name: f, content: (code as Record<string, string>)[f] })), { name: entryKey || 'src/App.jsx', content: entryContent }];
      
      const externalImports: string[] = [];
      const codeBodies: string[] = [];

      allFiles.forEach(file => {
         let body = file.content;
         
         // SPECIAL: Handle CSS files by injecting them into document head
         if (file.name.endsWith('.css')) {
            codeBodies.push(`// CSS FILE: ${file.name}\n(function() { const s = document.createElement('style'); s.textContent = ${JSON.stringify(body)}; document.head.appendChild(s); })();`);
            return;
         }

         // 1. Extract all external imports (those not starting with . or @/)
         const importRegex = /^import\s+[\s\S]*?\s+from\s+['"](?!\.|\.\.|@\/)[^'"]+['"]\s*;?/gm;
         const matches = body.match(importRegex);
         if (matches) {
            matches.forEach(m => externalImports.push(m.trim()));
            body = body.replace(importRegex, '');
         }

         // 2. Remove internal relative imports
         body = body.replace(/import\s+[\s\S]*?\s+from\s+['"](@\/|\.|\.\.).*?['"]\s*;?/g, '// [internal import removed]');

         // 3. Clean exports for support files and bind to window
         if (file.name !== entryKey) {
            const fileName = file.name.split('/').pop()?.split('.')[0] || 'Component';
            const safeName = fileName.replace(/[^a-zA-Z0-9]/g, '_');

            // Handle default function exports: export default function Name()
            const namedFuncRegex = /export\s+default\s+function\s+([A-Za-z0-9_]+)?\s*\(/;
            if (namedFuncRegex.test(body)) {
               const match = body.match(namedFuncRegex);
               const nameToUse = match?.[1] || safeName;
               body = body.replace(namedFuncRegex, `function ${nameToUse}(`);
               body += `\nwindow.${nameToUse} = ${nameToUse};`;
            } else if (/export\s+default\s+function\s*\(/.test(body)) {
               // Anonymous default export: export default function()
               body = body.replace(/export\s+default\s+function\s*\(/, `function ${safeName}(`);
               body += `\nwindow.${safeName} = ${safeName};`;
            } else if (/export\s+default\s+(const|let|var|class)\s+([A-Za-z0-9_]+)/.test(body)) {
               // Named variable/class default export: export default const Name =
               body = body.replace(/export\s+default\s+(const|let|var|class)\s+([A-Za-z0-9_]+)/, `$1 $2`);
               const match = body.match(/(?:const|let|var|class)\s+([A-Za-z0-9_]+)/);
               if (match?.[1]) body += `\nwindow.${match[1]} = ${match[1]};`;
            } else if (/export\s+default\s+([\w]+);?/.test(body)) {
               // Standalone default export: export default Name;
               const match = body.match(/export\s+default\s+([\w]+);?/);
               if (match?.[1]) body += `\nwindow.${match[1]} = ${match[1]};`;
               body = body.replace(/export\s+default\s+[\w]+;?/g, '// [stripped standalone export]');
            }

            // [NEW] Handle manual window assignments if found in code
            body = body.replace(/window\.([A-Za-z0-9_]+)\s*=\s*([A-Za-z0-9_]+);?/g, (m, g1, g2) => {
               if (g1 === g2) return `window.${g1} = ${g1};`;
               return m;
            });

            // Clean up remaining exports
            body = body.replace(/export\s+\{\s*[\w]+\s+as\s+default\s*\};?/g, '// [stripped brace export]');
            body = body.replace(/export\s+(function|const|let|var|class)\s+/g, '$1 ');
            body = body.replace(/export\s+\{[\s\S]*?\};?/g, '// [stripped named brace export]');
         } else {
            // Even for the entry file (App.jsx), ensure if there's a default export, it's bound as window.App
            const match = body.match(/export\s+default\s+(?:function|const|let|var|class)?\s*([A-Za-z0-9_]+)/);
            if (match?.[1]) {
               body += `\nwindow.App = ${match[1]}; \nwindow.${match[1]} = ${match[1]};`;
            }
         }

         codeBodies.push(`// FILE: ${file.name}\n${body}`);
      });

      // Deduplicate imports
      const uniqueImports = Array.from(new Set(externalImports));
      
      rawCode = uniqueImports.join('\n') + '\n\n' + codeBodies.join('\n\n');
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
          "react": "https://esm.sh/react@18.3.1",
          "react/": "https://esm.sh/react@18.3.1/",
          "react-dom": "https://esm.sh/react-dom@18.3.1?external=react",
          "react-dom/client": "https://esm.sh/react-dom@18.3.1/client?external=react",
          "lucide-react": "https://esm.sh/lucide-react@0.474.0?external=react",
          "framer-motion": "https://esm.sh/framer-motion@11.11.11?external=react",
          "clsx": "https://esm.sh/clsx@2.1.1",
          "tailwind-merge": "https://esm.sh/tailwind-merge@2.6.0",
          "recharts": "https://esm.sh/recharts@2.15.0?external=react",
          "date-fns": "https://esm.sh/date-fns@4.1.0",
          "react-router-dom": "https://esm.sh/react-router-dom@6.28.0?external=react",
          "axios": "https://esm.sh/axios@1.7.9?external=react",
          "zustand": "https://esm.sh/zustand@4.5.2?external=react",
          "zustand/middleware": "https://esm.sh/zustand@4.5.2/middleware?external=react",
          "@react-three/fiber": "https://esm.sh/@react-three/fiber@8.17.10?external=react,react-dom,three",
          "@react-three/drei": "https://esm.sh/@react-three/drei@9.117.3?external=react,react-dom,three,@react-three/fiber",
          "three": "https://esm.sh/three@0.170.0",
          "three-stdlib": "https://esm.sh/three-stdlib@2.34.0?external=three"
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

      // Global Hook Injection: Ensure hooks are available even if imports are stripped or hoisted
      window.React = React;
      window.useState = React.useState;
      window.useEffect = React.useEffect;
      window.useContext = React.useContext;
      window.useMemo = React.useMemo;
      window.useCallback = React.useCallback;
      window.useRef = React.useRef;
      window.useLayoutEffect = React.useLayoutEffect;
      
      // Global Component Guard: Fallbacks for common missing symbols
      (function() {
        const fallbacks = ['Header', 'Navbar', 'Footer', 'Hero', 'Services', 'Contact', 'Portfolio', 'Testimonials'];
        fallbacks.forEach(name => {
          if (typeof window[name] === 'undefined' || window[name] === null) {
            window[name] = function(props) {
              return React.createElement('div', { 
                className: 'p-4 bg-rose-50 border border-dashed border-rose-200 text-rose-500 text-[10px] font-mono rounded-lg mb-4',
                style: { display: 'block' }
              }, '[Symbol Missing: <' + name + ' />] - The AI skipped generating this component or used a mismatched name.');
            };
          }
        });

        // Lucide Icon Guard: Prevent crashes from hallucinated icon names
        window.__LUCIDE_ICON_PROXY__ = new Proxy({}, {
          get: (target, prop) => {
            if (typeof prop === 'string' && prop !== 'displayName' && prop !== '$$typeof' && prop !== 'default') {
              return function(props) {
                return React.createElement('span', { 
                  className: 'inline-flex items-center justify-center w-5 h-5 bg-slate-100 text-slate-400 rounded-sm text-[8px] font-bold border border-slate-200',
                  title: 'Icon "' + prop + '" missing'
                }, prop[0] || '?');
              };
            }
            return undefined;
          }
        });
      })();

      const base64Code = "${base64Code}";
      const decodedCode = new TextDecoder().decode(
        Uint8Array.from(atob(base64Code), c => c.charCodeAt(0))
      );
      
      // DEBUG: Make the final synthesized code accessible via console if needed
      window.__PREVIEW_CODE__ = decodedCode;

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

          // ADVANCED RESOLUTION: Priority order for finding the main App component
          let App = module.default || window.App || module.App;
          
          // Final fallback: Search window for ANY major components if App is still missing
          if (!App) {
             const priorities = ['App', 'Layout', 'Portfolio', 'Landing', 'Website', 'Main'];
             for (const name of priorities) {
                if (window[name]) { App = window[name]; break; }
             }
          }
          
          if (!App) {
            throw new Error("No App component found. Ensure entry file has 'export default' or define 'App' component.");
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
