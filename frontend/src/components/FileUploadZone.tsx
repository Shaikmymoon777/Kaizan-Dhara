import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ProcessedFile {
  name: string;
  type: string;
  category: 'document' | 'image' | 'code' | 'design' | 'unknown';
  content: string;       // extracted text or base64
  size: number;
  status: 'processing' | 'done' | 'error';
  error?: string;
}

interface FileUploadZoneProps {
  files: ProcessedFile[];
  onFilesChange: (files: ProcessedFile[]) => void;
  disabled?: boolean;
}

// ── Category Helpers ──────────────────────────────────────────────────────────
const FILE_CATEGORIES: Record<string, ProcessedFile['category']> = {
  'application/pdf': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'text/plain': 'document',
  'application/json': 'code',
  'application/zip': 'code',
  'application/x-zip-compressed': 'code',
  'text/html': 'code',
  'text/css': 'code',
};

const getCategory = (file: File): ProcessedFile['category'] => {
  if (file.type.startsWith('image/')) return 'image';
  if (FILE_CATEGORIES[file.type]) return FILE_CATEGORIES[file.type];
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'go', 'rs'].includes(ext)) return 'code';
  if (['pdf', 'docx', 'doc', 'txt', 'md'].includes(ext)) return 'document';
  if (['fig', 'sketch', 'xd'].includes(ext)) return 'design';
  return 'unknown';
};

const CATEGORY_CONFIG: Record<ProcessedFile['category'], { icon: string; color: string; label: string }> = {
  document: { icon: '📄', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', label: 'Document' },
  image:    { icon: '🖼️', color: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20', label: 'Image' },
  code:     { icon: '💻', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Code' },
  design:   { icon: '🎨', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', label: 'Design' },
  unknown:  { icon: '📎', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', label: 'File' },
};

// ── File Processing ───────────────────────────────────────────────────────────
async function extractPdfText(file: File): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    // Set the worker source — try multiple CDN paths for reliability
    const version = pdfjsLib.version;
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ').trim();
      if (pageText) pages.push(pageText);
    }
    const fullText = pages.join('\n\n').trim();
    if (!fullText) {
      throw new Error('PDF contained no extractable text (might be scanned/image-based)');
    }
    return fullText;
  } catch (err) {
    console.warn('PDF text extraction failed:', err);
    // NEVER fall back to file.text() for binary PDFs — it returns garbage
    throw new Error(`Could not extract text from PDF "${file.name}": ${(err as Error).message}`);
  }
}

async function extractDocxText(file: File): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value?.trim();
    if (!text) {
      throw new Error('DOCX contained no extractable text');
    }
    return text;
  } catch (err) {
    console.warn('DOCX text extraction failed:', err);
    // NEVER fall back to file.text() for binary DOCX — it returns garbage
    throw new Error(`Could not extract text from DOCX "${file.name}": ${(err as Error).message}`);
  }
}

async function processFile(file: File): Promise<ProcessedFile> {
  const base: Pick<ProcessedFile, 'name' | 'type' | 'size' | 'category'> = {
    name: file.name,
    type: file.type,
    size: file.size,
    category: getCategory(file),
  };

  // Size guard
  if (file.size > MAX_FILE_SIZE) {
    return { ...base, content: '', status: 'error', error: `File exceeds 5MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)` };
  }

  try {
    let content: string;

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      content = await extractPdfText(file);
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.endsWith('.docx')
    ) {
      content = await extractDocxText(file);
    } else if (file.type.startsWith('image/')) {
      content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } else {
      // Text / code / everything else
      content = await file.text();
    }

    return { ...base, content, status: 'done' };
  } catch (err: any) {
    return { ...base, content: '', status: 'error', error: err?.message || 'Processing failed' };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
const FileUploadZone: React.FC<FileUploadZoneProps> = ({ files, onFilesChange, disabled }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    const newFiles = Array.from(fileList);

    // Immediately add file entries in "processing" state
    const placeholders: ProcessedFile[] = newFiles.map(f => ({
      name: f.name,
      type: f.type,
      size: f.size,
      category: getCategory(f),
      content: '',
      status: 'processing' as const,
    }));
    onFilesChange([...files, ...placeholders]);

    // Process each file asynchronously
    const processed = await Promise.all(newFiles.map(processFile));

    onFilesChange([
      ...files,
      ...processed,
    ]);
  }, [files, onFilesChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [disabled, handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <motion.div
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        animate={{
          borderColor: isDragOver ? 'rgba(99, 102, 241, 0.7)' : 'rgba(51, 65, 85, 0.3)',
          backgroundColor: isDragOver ? 'rgba(99, 102, 241, 0.05)' : 'rgba(15, 23, 42, 0.3)',
        }}
        className={`relative rounded-2xl border-2 border-dashed p-5 cursor-pointer transition-all group ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {/* Hover/Drag Glow */}
        <div className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 blur-lg transition-opacity ${isDragOver ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`} />

        <div className="relative z-10 flex flex-col items-center gap-2 text-center">
          <motion.div
            animate={{ y: isDragOver ? -4 : 0, scale: isDragOver ? 1.1 : 1 }}
            className="w-10 h-10 rounded-xl bg-slate-800/50 border border-slate-700 flex items-center justify-center text-slate-500 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </motion.div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 group-hover:text-slate-300 transition-colors">
              {isDragOver ? 'Drop files here' : 'Drag & drop or click to browse'}
            </p>
            <p className="text-[9px] text-slate-600 mt-0.5">
              PDF, DOCX, TXT, Images, Code, ZIP — Max 5MB each
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
          accept="image/*,.pdf,.txt,.docx,.doc,.zip,.json,.tsx,.jsx,.ts,.js,.html,.css,.md"
        />
      </motion.div>

      {/* File List */}
      <AnimatePresence mode="popLayout">
        {files.map((f, i) => {
          const cfg = CATEGORY_CONFIG[f.category];
          return (
            <motion.div
              key={`${f.name}-${i}`}
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              className="flex items-center gap-2.5 bg-slate-900/50 border border-slate-800/50 rounded-xl px-3 py-2"
            >
              {/* Category Badge */}
              <span className="text-base flex-shrink-0">{cfg.icon}</span>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-slate-300 truncate">{f.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  <span className="text-[9px] text-slate-600">{formatSize(f.size)}</span>
                </div>
              </div>

              {/* Status */}
              {f.status === 'processing' && (
                <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin flex-shrink-0" />
              )}
              {f.status === 'error' && (
                <span className="text-[9px] text-rose-400 font-bold flex-shrink-0" title={f.error}>⚠</span>
              )}
              {f.status === 'done' && (
                <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              )}

              {/* Remove */}
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                className="text-slate-600 hover:text-rose-400 transition-colors flex-shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default FileUploadZone;
export { MAX_FILE_SIZE };
