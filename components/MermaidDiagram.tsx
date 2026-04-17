import React, { useState, useEffect, useRef } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
  fontFamily: "monospace",
});

const sanitizeMermaid = (chart: string): string => {
  if (!chart) return '';
  let clean = chart.trim();
  
  // 1. More aggressive stripping of ALL markdown fences and noise
  clean = clean.replace(/```(?:mermaid)?\n?/gi, '');
  clean = clean.replace(/```/g, '');
  
  // 2. Remove leading/trailing non-mermaid garbage (sometimes AI adds descriptions)
  const diagramStarters = ['graph ', 'sequenceDiagram', 'erDiagram', 'gantt', 'classDiagram', 'stateDiagram', 'pie', 'journey', 'C4Context'];
  let firstIndex = -1;
  for (const starter of diagramStarters) {
    const idx = clean.indexOf(starter);
    if (idx !== -1 && (firstIndex === -1 || idx < firstIndex)) {
      firstIndex = idx;
    }
  }
  if (firstIndex !== -1) {
    clean = clean.substring(firstIndex);
  }

  // 3. Fix common syntax errors
  clean = clean.replace(/subgraph\s+(.+)/g, (_match: string, name: string) => {
    return 'subgraph ' + name.replace(/[()\[\]{}]/g, '').replace(/\//g, '-').trim();
  });
  clean = clean.replace(/\[([^\]]*\/[^\]]*)\]/g, (_match: string, label: string) => {
    return '[' + label.replace(/\//g, ' or ') + ']';
  });
  
  return clean.trim();
};

const MermaidDiagram = ({ chart, title }: { chart: string; title?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (containerRef.current && chart) {
      setRenderError(null);
      const diagramId = `mermaid-${Math.random().toString(36).substring(7)}`;
      const sanitized = sanitizeMermaid(chart);
      mermaid
        .render(diagramId, sanitized)
        .then((result) => {
          if (containerRef.current) {
            containerRef.current.innerHTML = result.svg;
          }
        })
        .catch((e) => {
          console.error("Mermaid Render Error", e);
          setRenderError(e?.message || 'Unknown render error');
          const errSvg = document.getElementById(diagramId);
          if (errSvg) errSvg.remove();
        });
    }
  }, [chart]);

  if (renderError) {
    return (
      <div className="p-3 rounded-xl bg-slate-950 border border-rose-900/30">
        {title && <span className="block font-bold text-rose-400 mb-2 uppercase tracking-tighter text-[11px]">{title} — Render Error</span>}
        <pre className="text-[10px] text-slate-500 leading-relaxed whitespace-pre-wrap overflow-x-auto">{chart}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-container flex justify-center py-4 overflow-x-auto"
    />
  );
};

export default MermaidDiagram;
