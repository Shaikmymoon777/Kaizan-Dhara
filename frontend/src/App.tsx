import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Github,
  Globe,
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  Box,
  FileText,
  FileDigit,
  Download,
} from "lucide-react";
import { GeminiService } from "./services/geminiService";
import { LocalLLMService } from "./services/localLLMService";

import { type AgentMessage, SDLCProject, IAgentService } from "./types";
import { FigmaService, type FigmaSchema } from "./services/figmaService";
import AgentCard from "./components/AgentCard";
import ChatSidebar from "./components/ChatSidebar";
import HistorySidebar from "./components/HistorySidebar";
import UserStoriesLibrary from "./components/UserStoriesLibrary";

import LivePreview from "./components/LivePreview";
import HomePage from "./components/HomePage";
import LoginScreen from "./components/LoginScreen";
import GithubDeployModal from "./components/GithubDeployModal";
import AnimatedLogo from "./components/AnimatedLogo";
import FileUploadZone, { type ProcessedFile } from "./components/FileUploadZone";
import ToastNotification, { useToasts, type Toast } from "./components/ToastNotification";

import { storage } from "./utils/storage";
import mermaid from "mermaid";
import { parseDocument, mergeDocuments, type BRDStructuredData } from "./services/brdParserService";

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_CONTEXT_LENGTH = 8000;

// ── Test Case Templates ───────────────────────────────────────────────────────
const TEST_CASE_TEMPLATES: Record<string, { label: string; icon: string; prompt: string; context: string; keywords: string[] }> = {
  insurance: {
    label: "Insurance Claims System",
    icon: "🛡️",
    prompt: "Build a modern Insurance Claims Management System with claim filing forms, status tracking dashboard, document uploads, adjuster assignment views, policy lookup, claims history timeline, and analytics reporting.",
    context: "Domain: Insurance | Key entities: Claims, Policies, Adjusters, Policyholders, Documents, Payments | Workflows: Claim filing → Review → Adjuster assignment → Investigation → Settlement → Payment",
    keywords: ["claim", "policy", "adjuster", "insurance", "coverage", "premium", "deductible"],
  },
  payroll: {
    label: "Payroll Management System",
    icon: "💰",
    prompt: "Build a comprehensive Payroll Management System with employee profiles, salary configuration, attendance tracking, payslip generation, tax calculations, leave management, and compliance reporting dashboard.",
    context: "Domain: Payroll & HR | Key entities: Employees, Salary Structures, Payslips, Tax Brackets, Leave Requests, Departments | Workflows: Employee onboarding → Salary setup → Monthly processing → Tax deduction → Payslip generation → Bank disbursement",
    keywords: ["payroll", "salary", "employee", "payslip", "wage", "compensation", "attendance"],
  },
  invoice: {
    label: "Invoice Generator",
    icon: "📄",
    prompt: "Build a professional Invoice Generator with client management, itemized invoice creation, tax computation, payment tracking, recurring invoices, PDF export, and financial analytics dashboard.",
    context: "Domain: Billing & Invoicing | Key entities: Clients, Invoices, Line Items, Payments, Tax Rates, Products/Services | Workflows: Client setup → Invoice creation → Send → Payment tracking → Receipt → Reporting",
    keywords: ["invoice", "billing", "payment", "receipt", "client", "tax", "quotation"],
  },
  banking: {
    label: "Banking Dashboard",
    icon: "🏦",
    prompt: "Build a modern Banking Dashboard with account overview, transaction history, fund transfers, bill payments, spending analytics, card management, and loan/mortgage tracker.",
    context: "Domain: Digital Banking | Key entities: Accounts, Transactions, Cards, Loans, Beneficiaries, Bills | Workflows: Account overview → Transaction drill-down → Transfer initiation → OTP verification → Confirmation → Receipt",
    keywords: ["bank", "account", "transaction", "transfer", "deposit", "withdrawal", "balance"],
  },
};

// ── Smart Domain Detection ────────────────────────────────────────────────────
function detectDomainFromContent(content: string): string | null {
  const lower = content.toLowerCase();
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const [key, template] of Object.entries(TEST_CASE_TEMPLATES)) {
    const score = template.keywords.reduce((acc, kw) => {
      const regex = new RegExp(kw, 'gi');
      const matches = lower.match(regex);
      return acc + (matches ? matches.length : 0);
    }, 0);
    if (score > bestScore && score >= 2) { // Minimum 2 keyword matches
      bestScore = score;
      bestMatch = key;
    }
  }
  return bestMatch;
}

// ── Smart Prompt Builder ──────────────────────────────────────────────────────
function buildSmartPrompt(
  userInput: string,
  selectedTestCase: string | null,
  processedFiles: ProcessedFile[],
  figmaLink: string,
): string {
  const parts: string[] = [];
  const testCase = selectedTestCase ? TEST_CASE_TEMPLATES[selectedTestCase] : null;

  // 1. Extract file content (prioritized)
  const fileTexts = processedFiles
    .filter(f => f.status === 'done' && f.category !== 'image')
    .map(f => f.content)
    .join('\n\n');
  const truncatedFileContent = fileTexts.length > MAX_CONTEXT_LENGTH
    ? fileTexts.substring(0, MAX_CONTEXT_LENGTH) + '\n\n[Content truncated for context limits]'
    : fileTexts;

  // 2. Check for images (attach separately)
  const hasImages = processedFiles.some(f => f.status === 'done' && f.category === 'image');

  // 3. Smart domain detection from file content
  let detectedDomain = selectedTestCase;
  if (!detectedDomain && fileTexts.length > 0) {
    detectedDomain = detectDomainFromContent(fileTexts);
  }
  const resolvedTestCase = detectedDomain ? TEST_CASE_TEMPLATES[detectedDomain] : testCase;

  // Build the prompt
  if (truncatedFileContent) {
    parts.push(`=== UPLOADED DOCUMENT CONTENT ===\n${truncatedFileContent}`);
    parts.push('\nGenerate a production-ready web application UI based on the above document content.');
  }

  if (userInput.trim()) {
    parts.push(`\n=== USER VISION ===\n${userInput}`);
  }

  if (resolvedTestCase) {
    parts.push(`\n=== DOMAIN CONTEXT ===\n${resolvedTestCase.context}`);
    if (!truncatedFileContent && !userInput.trim()) {
      // Only use template prompt if no file or user input
      parts.unshift(resolvedTestCase.prompt);
    }
  }

  if (figmaLink) {
    parts.push(`\n=== DESIGN REFERENCE ===\nUse this design reference: ${figmaLink}`);
  }

  if (hasImages) {
    parts.push('\n[Image attachments are included for visual reference]');
  }

  return parts.join('\n') || userInput;
}

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
  fontFamily: "monospace",
});

// Sanitize AI-generated Mermaid to fix common syntax issues
const sanitizeMermaid = (chart: string): string => {
  let clean = chart.trim();
  // Strip markdown code fences like ```mermaid ... ```
  clean = clean.replace(/^```(?:mermaid)?\s*/i, '').replace(/```\s*$/, '').trim();
  // Fix subgraph names: remove parentheses and slashes
  clean = clean.replace(/subgraph\s+(.+)/g, (_match: string, name: string) => {
    return 'subgraph ' + name.replace(/[()]/g, '').replace(/\//g, '-').trim();
  });
  // Fix node labels: replace slashes with "or"
  clean = clean.replace(/\[([^\]]*\/[^\]]*)\]/g, (_match: string, label: string) => {
    return '[' + label.replace(/\//g, ' or ') + ']';
  });
  return clean;
};

// A small functional component to safely render Mermaid Markdown into SVGs
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
          // Clean up error SVGs mermaid injects into the DOM
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

type ViewState = "landing" | "login" | "studio";

const App: React.FC = () => {
  const [input, setInput] = useState("");
  const [project, setProject] = useState<SDLCProject | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [activeTab, setActiveTab] = useState<"flow" | "output">("flow");
  const [deliverableSubTab, setDeliverableSubTab] = useState<
    "docs" | "code" | "preview"
  >("preview");
  const [selectedArtifact, setSelectedArtifact] = useState<
    "all" | "req" | "design" | "test"
  >("all");
  const [expandedDocs, setExpandedDocs] = useState({
    req: true,
    design: true,
    devdocs: true,
    test: true,
    arch: true,
  });
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [viewState, setViewState] = useState<ViewState>("landing");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const selectedTheme = "Modern Obsidian";
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isPreviewFullScreen, setIsPreviewFullScreen] = useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── New Feature State ────────────────────────────────────────────────────
  const [selectedTestCase, setSelectedTestCase] = useState<string | null>(null);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [figmaLink, setFigmaLink] = useState("");
  const [figmaData, setFigmaData] = useState<FigmaSchema | null>(null);
  const [isFetchingFigma, setIsFetchingFigma] = useState(false);
  const { toasts, addToast, removeToast } = useToasts();

  // BRD parsing state
  const [brdData, setBrdData] = useState<BRDStructuredData | null>(null);
  const [showBRDPreview, setShowBRDPreview] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const agentService = useRef<IAgentService | null>(null);

  // Check for API key and initialize appropriate service
  useEffect(() => {
    // Check for auth token
    const token = localStorage.getItem("token");
    if (token) {
      setViewState("studio");
    }

    inputRef.current?.focus();

    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (geminiApiKey) {
      setHasApiKey(true);
      try {
        agentService.current = new GeminiService();
        console.log("Using Gemini API");
      } catch (error) {
        console.error(
          "Failed to initialize Gemini, falling back to local LLM:",
          error,
        );
        agentService.current = new LocalLLMService();
      }
    } else {
      setHasApiKey(false);
      console.warn(
        "No API key found. Please configure VITE_GEMINI_API_KEY in .env file.",
      );
      // Do not initialize a service, let it be null. handleStart will check for this.
    }
  }, []);

  const addMessage = (
    role: any,
    content: string,
    status: "thinking" | "done" | "error" = "done",
  ) => {
    const newMessage: AgentMessage = {
      id: Math.random().toString(36).substr(2, 9),
      role,
      content,
      timestamp: new Date(),
      status,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleSendMessage = async (content: string) => {
    addMessage("User", content);
    setInput(content); // Sync for visibility

    if (project) {
      if (project.currentStep >= 1 && project.currentStep <= 4) {
        addMessage(
          "Orchestrator",
          "Propagating modifications to the active agent thread...",
          "thinking",
        );
        await handleRemodify(content);
      } else if (project.currentStep === 5) {
        addMessage(
          "Orchestrator",
          "Project is complete. Re-triggering Development to apply refinements...",
          "thinking",
        );
        // If finished, we typically want to refine the code/design
        await runDevelopmentPhase(true, content);
      } else {
        addMessage(
          "Orchestrator",
          "Project is not in a modifiable state.",
          "error",
        );
      }
    } else {
      addMessage(
        "Orchestrator",
        "Initialize a project first to use neural modifications.",
      );
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Parse BRD/LLD/HLD documents whenever the file list changes
  useEffect(() => {
    const docFiles = processedFiles.filter(
      f => f.status === 'done' && f.category === 'document' && f.content.trim().length > 0
    );

    if (docFiles.length === 0) {
      setBrdData(null);
      return;
    }

    const parsed = docFiles.map(f => parseDocument(f.content, f.name));
    const merged = parsed.length > 1 ? mergeDocuments(parsed) : parsed[0];
    setBrdData(merged);

    if (merged.isValid) {
      addToast({
        type: 'info',
        title: `${merged.documentType} Document Parsed`,
        message: `Extracted ${merged.functional_requirements.length} functional requirements, ${merged.user_flows.length} user flows from "${docFiles.map(f => f.name).join(', ')}".`,
        duration: 6000,
      });
    }
  }, [processedFiles]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFetchFigma = async () => {
    if (!figmaLink) return;
    setIsFetchingFigma(true);
    try {
      addMessage("Orchestrator", `Connecting to Figma API to extract design tokens and hierarchy for "${figmaLink}"...`, "thinking");
      const data = await FigmaService.fetchFile(figmaLink);
      setFigmaData(data);
      addMessage("Orchestrator", `Successfully extracted ${data.pages.length} pages and design theme from Figma: "${data.name}"`);
      addToast({
        type: 'info',
        title: 'Figma Design Linked',
        message: `Extracted ${data.pages.length} pages and design tokens.`,
        duration: 5000,
      });
    } catch (err: any) {
      addMessage("Orchestrator", `Figma Error: ${err.message}`, "error");
      addToast({
        type: 'error',
        title: 'Figma Error',
        message: err.message,
      });
    } finally {
      setIsFetchingFigma(false);
    }
  };

  // Helper function to add delays between API calls
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const handleLogout = () => {
    localStorage.removeItem("token");
    setViewState("landing");
    handleNewChat();
  };

  const handleNewChat = () => {
    setProject(null);
    setMessages([]);
    setInput("");
    setAttachments([]);
    setProcessedFiles([]);
    setSelectedTestCase(null);
    setFigmaLink("");
    setBrdData(null);
    setShowBRDPreview(false);
    setDeliverableSubTab("preview");
    setActiveTab("flow");
  };

  const downloadProjectZip = async () => {
    if (!project || !project.code) return;

    try {
      // Lazy load JSZip to avoid heavy bundle on startup
      const JSZip = (await import("jszip")).default;
      const { saveAs } = await import("file-saver");

      const zip = new JSZip();

      // Add code files
      if (typeof project.code === "string") {
        zip.file("App.tsx", project.code);
      } else {
        Object.entries(project.code).forEach(([path, content]) => {
          zip.file(path, content);
        });
      }

      // Add artifacts
      if (project.requirements) {
        zip.file(
          "artifacts/requirements.json",
          JSON.stringify(project.requirements, null, 2),
        );
      }
      if (project.design) {
        zip.file(
          "artifacts/design.json",
          JSON.stringify(project.design, null, 2),
        );
      }
      if (project.tests) {
        zip.file(
          "artifacts/testing_report.json",
          JSON.stringify(project.tests, null, 2),
        );
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(
        content,
        `${project.name.replace(/\s+/g, "_").toLowerCase()}_bundle.zip`,
      );

      addMessage(
        "Orchestrator",
        "Project artifacts successfully bundled and downloaded as ZIP.",
      );
    } catch (error) {
      console.error("Zip generation error:", error);
      addMessage(
        "Orchestrator",
        "Failed to generate ZIP bundle. Please check your connection.",
        "error",
      );
    }
  };

  const downloadProjectWordDocs = async () => {
    if (!project) return;
    try {
      const { saveAs } = await import("file-saver");

      const header = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Project Documentation</title>
        <style>
          body { font-family: 'Segoe UI', Calibri, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: auto; padding: 40px; }
          h1 { color: #4f46e5; border-bottom: 3px solid #4f46e5; padding-bottom: 15px; font-size: 28pt; }
          h2 { color: #0891b2; margin-top: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; font-size: 20pt; }
          h3 { color: #334155; margin-top: 25px; font-size: 16pt; border-left: 4px solid #4f46e5; padding-left: 15px; }
          p { margin-bottom: 15px; text-align: justify; }
          .executive-summary { background: #f8fafc; padding: 25px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 25px 0; font-style: italic; color: #475569; }
          .priority-high { background: #fef2f2; color: #b91c1c; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 9pt; }
          .priority-medium { background: #fffbeb; color: #b45309; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 9pt; }
          .priority-low { background: #f0fdf4; color: #15803d; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 9pt; }
          table { width: 100%; border-collapse: collapse; margin: 25px 0; border-radius: 8px; overflow: hidden; }
          th { background-color: #f1f5f9; color: #475569; font-weight: bold; text-transform: uppercase; font-size: 9pt; letter-spacing: 0.05em; border: 1px solid #e2e8f0; padding: 12px; }
          td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; vertical-align: top; font-size: 10pt; }
          code { font-family: 'Consolas', monospace; background: #f1f5f9; padding: 2px 5px; border-radius: 4px; color: #be185d; }
          .footer { font-size: 9pt; color: #94a3b8; text-align: center; margin-top: 80px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        </style>
        </head><body>
      `;

      let body = `<h1>${project.requirements?.projectTitle || project.name}</h1>`;
      body += `<p><strong>Vision:</strong> Orchestrated Architecture & Product Strategy</p>`;

      if (project.requirements) {
        body += `<h2>1. Requirement Specification (PRD)</h2>`;
        body += `<div class="executive-summary"><strong>Executive Vision:</strong><br/>${project.requirements.executiveSummary || ""}</div>`;

        body += `<h3>User Stories & Business Value</h3>`;
        body += `<table><tr><th width="10%">ID</th><th width="30%">Story</th><th width="35%">Detailed Description</th><th width="15%">Priority</th></tr>`;
        (project.requirements.userStories || []).forEach((s: any) => {
          body += `<tr>
            <td><strong>#${s.id || ""}</strong></td>
            <td>${s.story || ""}</td>
            <td>${s.description || ""}
                <div style="margin-top: 8px; font-size: 9pt; color: #64748b;"><strong>Acceptance Criteria:</strong>
                <ul>${(s.acceptanceCriteria || []).map((ac: string) => `<li>${ac}</li>`).join("")}</ul></div>
            </td>
            <td><span class="priority-${(s.priority || "low").toLowerCase()}">${s.priority || ""}</span></td>
          </tr>`;
        });
        body += `</table>`;

        const scopeVal = project.requirements.scope;
        const scopeText = typeof scopeVal === 'string' ? scopeVal : scopeVal ? JSON.stringify(scopeVal) : "";
        body += `<h3>Strategic Scope Boundaries</h3><p>${scopeText}</p>`;

        body += `<h3>Technical & Security Constraints</h3><ul>`;
        (project.requirements.technicalConstraints || []).forEach((tc: string) => body += `<li>${tc}</li>`);
        body += `</ul>`;

        body += `<h3>Data Architecture Entities</h3><ul>`;
        (project.requirements.dataEntities || []).forEach((de: string) => body += `<li>${de}</li>`);
        body += `</ul>`;
      }

      if (project.design) {
        body += `<br clear=all style='mso-break-type:section-break'>`;
        body += `<h2>2. System Design Blueprint</h2>`;
        body += `<h3>Visual Identity & Design Tokens</h3><p>${project.design.designSystem || ""}</p>`;
        body += `<h3>Modular Component Hierarchy</h3><ul>`;
        (project.design.componentStructure || []).forEach((c: string) => body += `<li>${c}</li>`);
        body += `</ul>`;
        body += `<h3>UX Wireframe & Interaction Specs</h3><div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; font-family: 'Consolas', monospace; font-size: 9pt; color: #334155; white-space: pre-wrap;">${project.design.wireframes || ""}</div>`;

        body += `<h3>API Ecosystem Contracts</h3><table><tr><th>Planned Interface Definitions</th></tr>`;
        (project.design.apiEndpoints || []).forEach((ae: string) => body += `<tr><td><code>${ae}</code></td></tr>`);
        body += `</table>`;
      }

      if (project.tests) {
        body += `<br clear=all style='mso-break-type:section-break'>`;
        body += `<h2>3. Quality Assurance & Verification</h2>`;
        body += `<div class="executive-summary">${project.tests.executiveSummary || ""}</div>`;

        body += `<h3>Traceability Matrix & Test Results</h3>`;
        body += `<table><tr><th>ID</th><th>Verification Scenario</th><th>Severity</th><th>Status</th><th>Notes</th></tr>`;
        (project.tests.testCases || []).forEach((tc: any) => {
          body += `<tr>
            <td><strong>${tc.id || ""}</strong></td>
            <td>${tc.description || ""}</td>
            <td><strong>${tc.severity || "Minor"}</strong></td>
            <td style="color: ${tc.status === "passed" ? "#15803d" : "#b91c1c"}; font-weight: bold;">${(tc.status || "").toUpperCase()}</td>
            <td>${tc.notes || ""}</td>
          </tr>`;
        });
        body += `</table>`;

        body += `<h3>Senior Code Review Audit</h3><p>${project.tests.codeAudit || ""}</p>`;
      }

      body += `<div class="footer">Generated via Kaizen Dhara Intelligence Engine on ${new Date().toLocaleDateString()}<br/>All Rights Reserved</div></body></html>`;

      const blob = new Blob(['\ufeff', header + body], {
        type: 'application/msword'
      });

      saveAs(blob, `${project.name.replace(/\s+/g, "_").toLowerCase()}_report.doc`);

      addMessage("Orchestrator", "Professional-grade MS Word project documentation successfully exported.");
    } catch (error) {
      console.error("Word export error:", error);
      addMessage("Orchestrator", "Failed to generate Word documentation. Interface export interrupted.", "error");
    }
  };

  const downloadSectionAsMd = async (e: React.MouseEvent, section: "req" | "design" | "devdocs" | "test" | "arch") => {
    e.stopPropagation();
    if (!project) return;
    try {
      const { saveAs } = await import("file-saver");
      let content = "";
      let filename = "";
      const r = project.requirements as any;
      const d = project.design as any;
      const t = project.tests as any;

      if (section === "req" && r) {
        filename = `${project.name.replace(/\s+/g, "_").toLowerCase()}_requirements.md`;
        content += `# ${project.name} - Requirements\n\n`;
        if (r.projectOverview || r.executiveSummary) content += `## Overview\n${r.projectOverview || r.executiveSummary}\n\n`;
        if (r.businessObjectives) content += `## Business Objectives\n${r.businessObjectives}\n\n`;
        const scopeObj = typeof r.scope === 'object' && r.scope !== null ? r.scope : null;
        if (scopeObj) {
          content += `## Scope\n### In Scope\n${(scopeObj.inScope || []).map((s: string) => `- ${s}`).join('\n')}\n### Out Of Scope\n${(scopeObj.outOfScope || []).map((s: string) => `- ${s}`).join('\n')}\n\n`;
        } else if (r.scope) {
          content += `## Scope\n${r.scope}\n\n`;
        }
        content += `## User Stories\n`;
        (r.userStories || []).forEach((s: any) => {
          content += `### #${s.id} ${s.story}\n`;
          (s.acceptanceCriteria || []).forEach((ac: string) => content += `- ${ac}\n`);
          content += `\n`;
        });
      } else if (section === "design" && d) {
        filename = `${project.name.replace(/\s+/g, "_").toLowerCase()}_design.md`;
        const stack = d.hld?.technologyStackOverview || d.designSystem || "";
        const integrations = (d.hld?.externalIntegrations || []).join(', ');
        if (stack) content += `## Tech Stack\n${stack}\n\nIntegrations: ${integrations}\n\n`;
        const dataModels = d.lld?.dataModels || d.wireframes || "";
        if (dataModels) content += `## Data Models\n\`\`\`\n${dataModels}\n\`\`\`\n\n`;
        const endpoints = d.lld?.apiEndpoints || d.apiEndpoints || [];
        if (endpoints.length) {
          content += `## API Endpoints\n`;
          endpoints.forEach((ep: any) => {
            if (typeof ep === 'string') content += `- ${ep}\n`;
            else content += `- **${ep.method}**: \`${ep.endpoint}\`\n`;
          });
        }
      } else if (section === "devdocs" && project.devDocs) {
        filename = `${project.name.replace(/\s+/g, "_").toLowerCase()}_devdocs.md`;
        const dd = project.devDocs;
        content += `# Development Documentation\n\n`;
        if (dd.techStack) content += `## Tech Stack\n${dd.techStack}\n\n`;
        if (dd.projectStructure) content += `## Structure\n\`\`\`\n${dd.projectStructure}\n\`\`\`\n\n`;
        if (dd.setupInstructions) content += `## Setup Instructions\n${dd.setupInstructions}\n\n`;
        if (dd.environmentVariables) content += `## Env Variables\n${dd.environmentVariables}\n\n`;
        if (dd.deploymentOverview) content += `## Deployment\n${dd.deploymentOverview}\n\n`;
      } else if (section === "test" && t) {
        filename = `${project.name.replace(/\s+/g, "_").toLowerCase()}_verification.md`;
        if (t.testPlan) content += `## Test Plan\n**Scope:** ${t.testPlan.testingScope}\n**Strategy:** ${t.testPlan.testingStrategy}\n\n`;
        if (t.testExecutionReport) content += `## Execution Report\n${t.testExecutionReport.summary}\n\n`;
        if (t.executiveSummary) content += `## Summary\n${t.executiveSummary}\n\n`;
        content += `## Test Cases\n`;
        (t.testCases || []).forEach((tc: any) => {
          content += `### [${tc.status?.toUpperCase() || "PENDING"}] ${tc.id}\n${tc.description}\n`;
          if (tc.expectedResult) content += `Expected: ${tc.expectedResult}\nActual: ${tc.actualResult}\n`;
          content += `\n`;
        });
      } else if (section === "arch" && d) {
        filename = `${project.name.replace(/\s+/g, "_").toLowerCase()}_architecture.md`;
        const compDiag = d.hld?.componentDiagram || d.componentDiagram;
        const erDiag = d.databaseDesign?.erDiagram || d.erDiagram;
        const seqDiag = d.lld?.sequenceFlows || d.sequenceDiagram;
        if (compDiag) content += `## Component Diagram\n\`\`\`mermaid\n${compDiag}\n\`\`\`\n\n`;
        if (erDiag) content += `## ER Diagram\n\`\`\`mermaid\n${erDiag}\n\`\`\`\n\n`;
        if (seqDiag) content += `## Sequence Diagram\n\`\`\`mermaid\n${seqDiag}\n\`\`\`\n\n`;
      }

      if (!content) { addMessage("Orchestrator", "Artifact content is empty.", "error"); return; }
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, filename);
      addMessage("Orchestrator", `Downloaded ${filename}`);
    } catch (error) {
      addMessage("Orchestrator", "Failed to download artifact.", "error");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type,
            content: event.target?.result as string,
          },
        ]);
      };
      if (file.type.startsWith("image/")) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  // Phase Runner Functions
  const runRequirementPhase = async (
    customPrompt: string,
    isRemodify = false,
    fileAttachments?: any[],
    activeBrdData?: BRDStructuredData | null,
  ) => {
    if (!agentService.current) return;

    // Set processing state.
    setProject((p) =>
      p ? { ...p, isProcessing: true, waitingForApproval: false } : null,
    );

    const effectiveBrdData = activeBrdData !== undefined ? activeBrdData : brdData;

    try {
      if (isRemodify) {
        if (!project) return;
        addMessage(
          "Requirement",
          `Refining requirements with feedback: "${customPrompt}"...`,
          "thinking",
        );
      } else if (effectiveBrdData?.isValid) {
        addMessage(
          "Requirement",
          `BRD Document Mode — Extracting requirements from "${effectiveBrdData.sourceFiles.join(', ')}" (${effectiveBrdData.functional_requirements.length} FRs, ${effectiveBrdData.user_flows.length} user flows). No hallucination mode active.`,
          "thinking",
        );
      } else {
        addMessage(
          "Requirement",
          "Business Analyst Agent is analyzing scope and defining user stories...",
          "thinking",
        );
      }

      // Use directly passed attachments (avoids stale React state)
      const effectiveAttachments = fileAttachments ?? attachments;
      const reqs = await agentService.current.runRequirementAgent(
        customPrompt,
        effectiveAttachments,
        effectiveBrdData,
        figmaData,
      );

      setProject((p) => {
        if (!p) return null;
        return {
          ...p,
          requirements: reqs,
          currentStep: 1,
          isProcessing: false,
          waitingForApproval: true,
        };
      });

      addMessage(
        "Requirement",
        `Scope ${isRemodify ? "updated" : "defined"}. Extracted ${reqs.userStories?.length || 0} user stories. waiting for approval.`,
      );

      // Toast notification
      addToast({
        type: 'agent-complete',
        title: 'Task Complete',
        agentName: 'Requirement',
        message: `📋 Extracted ${reqs.userStories?.length || 0} user stories and acceptance criteria.`,
        action: { label: '✅ Approve & Continue', onClick: () => handleApproveStep() },
        secondaryAction: { label: '✏️ Edit', onClick: () => { setActiveTab('flow'); } },
      });
    } catch (error) {
      handleError(error, 'Requirement');
    }
  };

  const runDesignPhase = async (isRemodify = false, feedback?: string) => {
    if (!agentService.current || !project || !project.requirements) return;

    setProject((p) =>
      p ? { ...p, isProcessing: true, waitingForApproval: false } : null,
    );

    try {
      addMessage(
        "Design",
        isRemodify
          ? `Refining design with feedback: "${feedback}"...`
          : "Architect Agent is mapping system flow and drafting wireframes...",
        "thinking",
      );
      addMessage(
        "Parallel",
        "Parallel Validation Pack ▶ Auditing requirements document concurrently...",
        "thinking",
      );

      // Fire main agent + parallel validator concurrently
      const reqSnapshot = project.requirements;
      const [design, reqValidation] = await Promise.all([
        agentService.current.runDesignAgent(reqSnapshot, selectedTheme, feedback, figmaData),
        agentService.current.runParallelReqValidation(reqSnapshot).catch(() => null),
      ]);

      setProject((p) =>
        p
          ? {
            ...p,
            design,
            reqValidation: reqValidation ?? p.reqValidation,
            currentStep: 2,
            isProcessing: false,
            waitingForApproval: true,
          }
          : null,
      );
      addMessage(
        "Design",
        `Architecture and design blueprints are ${isRemodify ? "updated" : "complete"}. Waiting for approval.`,
      );
      if (reqValidation) {
        addMessage(
          "Parallel",
          `✅ Req Validation complete — Score: ${reqValidation.score}/100. ${reqValidation.recommendation}`,
        );
      }

      addToast({
        type: 'agent-complete',
        title: 'Task Complete',
        agentName: 'Design',
        message: `🎨 Architecture blueprints, wireframes, and design system ready for review.`,
        action: { label: '✅ Approve & Continue', onClick: () => handleApproveStep() },
        secondaryAction: { label: '✏️ Edit', onClick: () => { setActiveTab('flow'); } },
      });
    } catch (error) {
      handleError(error, 'Design');
    }
  };

  const runDevelopmentPhase = async (isRemodify = false, feedback?: string) => {
    if (
      !agentService.current ||
      !project ||
      !project.design ||
      !project.requirements
    )
      return;

    setProject((p) =>
      p ? { ...p, isProcessing: true, waitingForApproval: false } : null,
    );

    try {
      addMessage(
        "Development",
        isRemodify
          ? `Refining implementation with feedback...`
          : "Engineer Agent is synthesizing the modular React + Tailwind application...",
        "thinking",
      );
      addMessage(
        "Parallel",
        "Parallel Validation Pack ▶ Reviewing design architecture concurrently...",
        "thinking",
      );

      const [code, designReview] = await Promise.all([
        agentService.current.runDevelopmentAgent(
          project.design,
          project.requirements,
          project.prompt,
          selectedTheme,
          feedback,
          project.code || undefined,
          figmaData
        ),
        agentService.current.runParallelDesignReview(project.design, project.requirements).catch(() => null),
      ]);

      setProject((p) =>
        p
          ? {
            ...p,
            code,
            designReview: designReview ?? p.designReview,
            currentStep: 3,
            isProcessing: false,
            waitingForApproval: true,
          }
          : null,
      );
      addMessage(
        "Development",
        `Source code synthesis ${isRemodify ? "updated" : "complete"}. Multi-file architecture is ready for validation.`,
      );
      if (designReview) {
        addMessage(
          "Parallel",
          `✅ Design Review complete — Score: ${designReview.score}/100. ${designReview.summary}`,
        );
      }

      addToast({
        type: 'agent-complete',
        title: 'Task Complete',
        agentName: 'Development',
        message: `⚙️ Full-stack source code synthesized. Multi-file architecture ready.`,
        action: { label: '✅ Approve & Continue', onClick: () => handleApproveStep() },
        secondaryAction: { label: '✏️ Edit', onClick: () => { setActiveTab('flow'); } },
      });
    } catch (error) {
      handleError(error, 'Development');
    }
  };

  const runTestingPhase = async (isRemodify = false, feedback?: string) => {
    if (
      !agentService.current ||
      !project ||
      !project.code ||
      !project.requirements
    )
      return;

    setProject((p) =>
      p ? { ...p, isProcessing: true, waitingForApproval: false } : null,
    );

    try {
      addMessage(
        "Testing",
        "QA Agent is executing verification suite and auditing UX parity...",
        "thinking",
      );
      addMessage(
        "Parallel",
        "Parallel Validation Pack ▶ Running static code analysis concurrently...",
        "thinking",
      );

      // Fire main QA agent + parallel code analyser concurrently
      const [code, requirements] = [project.code, project.requirements];
      const [tests, codeAnalysis] = await Promise.all([
        agentService.current.runTestingAgent(code, requirements, project.prompt, feedback, figmaData),
        agentService.current.runParallelCodeTesting(code, requirements).catch(() => null),
      ]);

      setProject((p) =>
        p
          ? {
            ...p,
            tests,
            codeAnalysis: codeAnalysis ?? p.codeAnalysis,
            currentStep: 4,
            isProcessing: false,
            waitingForApproval: true,
          }
          : null,
      );
      addMessage(
        "Testing",
        "Verification complete. All tests passed. Waiting for final approval.",
      );
      if (codeAnalysis) {
        addMessage(
          "Parallel",
          `✅ Code Analysis complete — Score: ${codeAnalysis.score}/100. ${codeAnalysis.summary}`,
        );
      }

      addToast({
        type: 'agent-complete',
        title: 'Task Complete',
        agentName: 'Testing',
        message: `✅ Verification suite executed. Final approval pending.`,
        action: { label: '✅ Approve & Finish', onClick: () => handleApproveStep() },
        secondaryAction: { label: '✏️ Edit', onClick: () => { setActiveTab('flow'); } },
      });
    } catch (error) {
      handleError(error, 'Testing');
    }
  };

  const handleError = (error: any, agentName?: string) => {
    console.error("SDLC Error:", error);
    const errorMessage = error?.message || "Unknown error";
    addMessage("Orchestrator", `Error: ${errorMessage}`, "error");
    setProject((p) => (p ? { ...p, isProcessing: false } : null));

    // Error toast with retry option
    addToast({
      type: 'error',
      title: agentName ? `${agentName} Agent Failed` : 'Pipeline Error',
      message: `${errorMessage.substring(0, 120)}${errorMessage.length > 120 ? '...' : ''}`,
      agentName: agentName,
      duration: 12000,
      action: {
        label: '🔄 Retry',
        onClick: () => {
          if (project?.currentStep === 1) runRequirementPhase(project.prompt);
          else if (project?.currentStep === 2) runDesignPhase();
          else if (project?.currentStep === 3) runDevelopmentPhase();
          else if (project?.currentStep === 4) runTestingPhase();
        }
      },
    });
  };

  // Main Flow Controls
  const handleStart = async () => {
    // Guard: prevent double-submit
    if (project?.isProcessing) return;

    // Must have at least one input source
    const hasInput = input.trim().length > 0;
    const hasFiles = processedFiles.some(f => f.status === 'done');
    const hasTestCase = !!selectedTestCase;
    if (!hasInput && !hasFiles && !hasTestCase) return;

    // Build the smart prompt
    const enrichedPrompt = buildSmartPrompt(input, selectedTestCase, processedFiles, figmaLink);

    // Convert ALL processed files (text + image) as attachments for the service
    const fileAttachments = processedFiles
      .filter(f => f.status === 'done')
      .map(f => ({ name: f.name, type: f.type, content: f.content }));
    // Merge with any legacy attachments
    const allAttachments = [...attachments, ...fileAttachments];
    setAttachments(allAttachments);

    const newProject: SDLCProject = {
      id: Date.now().toString(),
      prompt: enrichedPrompt,
      name: selectedTestCase
        ? TEST_CASE_TEMPLATES[selectedTestCase].label
        : "Agent Project v1",
      currentStep: 1,
      isProcessing: true,
      waitingForApproval: false,
    };
    setProject(newProject);
    setMessages([]);
    setActiveTab("flow");
    setDeliverableSubTab("preview");

    if (!agentService.current) {
      addMessage("Orchestrator", "Agent service not initialized.", "error");
      addToast({ type: 'error', title: 'Service Error', message: 'Agent service not initialized. Check your API key.' });
      return;
    }

    // BRD Validation gate: if a document was uploaded but extraction failed, warn the user
    const hasDocuments = processedFiles.some(f => f.status === 'done' && f.category === 'document');
    if (hasDocuments && brdData && !brdData.isValid) {
      addToast({
        type: 'error',
        title: 'BRD Validation Failed',
        message: brdData.validationError || 'Insufficient structured data extracted from document.',
        duration: 10000,
      });
      // Allow proceeding — fall back to generic mode
    }

    const displayPrompt = input.trim() || (selectedTestCase ? TEST_CASE_TEMPLATES[selectedTestCase].label : 'File-based generation');
    const brdLabel = brdData?.isValid ? ` [BRD: ${brdData.documentType}, ${brdData.functional_requirements.length} FRs]` : '';
    addMessage(
      "Orchestrator",
      `Initializing automated SDLC for: "${displayPrompt}"${brdLabel}`,
      "thinking",
    );

    addToast({
      type: 'info',
      title: 'Pipeline Started',
      message: brdData?.isValid
        ? `BRD mode active — generating from "${brdData.sourceFiles.join(', ')}" with strict no-hallucination rules.`
        : `SDLC pipeline initialized. Starting requirements analysis...`,
      duration: 5000,
    });

    await new Promise((r) => setTimeout(r, 800));

    // Capture brdData snapshot to pass directly (avoid stale closure)
    const activeBrdData = brdData?.isValid ? brdData : null;

    // Start with Requirements — pass attachments and BRD data directly
    await runRequirementPhase(enrichedPrompt, false, allAttachments, activeBrdData);
  };

  // Correction to handleApprove ensuring correct flow
  const handleApproveStep = async () => {
    if (!project) return;

    if (project.currentStep === 1) {
      await runDesignPhase();
    } else if (project.currentStep === 2) {
      await runDevelopmentPhase();
    } else if (project.currentStep === 3) {
      await runTestingPhase();
    } else if (project.currentStep === 4) {
      await finishProject();
    }
  };

  const handleRemodify = async (feedback: string) => {
    if (!project) return;
    setInput(feedback); // Sync to main input box

    if (project.currentStep === 1) {
      await runRequirementPhase(
        project.prompt + `\nRefinement: ${feedback}`,
        true,
      );
    } else if (project.currentStep === 2) {
      await runDesignPhase(true, feedback);
    } else if (project.currentStep === 3) {
      await runDevelopmentPhase(true, feedback);
    } else if (project.currentStep === 4) {
      await runTestingPhase(true, feedback);
    }
  };

  const navigateToDeliverable = (tab: "docs" | "code" | "preview") => {
    setActiveTab("output");
    setDeliverableSubTab(tab);
  };

  const saveOrUpdateProject = async () => {
    if (!project) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const payload = {
      ...project,
      requirements: project.requirements
        ? typeof project.requirements === "string"
          ? project.requirements
          : JSON.stringify(project.requirements)
        : undefined,
      design: project.design
        ? typeof project.design === "string"
          ? project.design
          : JSON.stringify(project.design)
        : undefined,
      code: project.code,
      tests: project.tests
        ? typeof project.tests === "string"
          ? project.tests
          : JSON.stringify(project.tests)
        : undefined,
    };

    try {
      const isTempId = /^\d+$/.test(project.id);
      let url = "http://localhost:3001/api/projects";
      let method = "POST";

      if (!isTempId) {
        url = `http://localhost:3001/api/projects/${project.id}`;
        method = "PUT";
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Verify if it's a transient 401 or a real session expiry
          addMessage("Orchestrator", "Session validation issue. Attempting to continue...", "error");
          // If we have a project in memory, don't kill it immediately unless we absolutely have to.
          // handleLogout(); - Commented out to prevent forceful redirect during long-running tasks.
          throw new Error("Unauthorized: Session is invalid or expired. Please re-login in a new tab if issues persist.");
        }
        const errorText = await response.text();
        throw new Error(
          `Failed to save project: ${response.status} ${response.statusText} - ${errorText.substring(0, 100)}`,
        );
      }

      if (isTempId) {
        const savedProject = await response.json();
        setProject((p) => (p ? { ...p, id: savedProject.id } : null));
        return savedProject.id;
      }
      return project.id;
    } catch (err) {
      console.error("Failed to save", err);
      addMessage(
        "Orchestrator",
        "Failed to save project state to backend.",
        "error",
      );
      throw err;
    }
  };

  const handleDeployClick = async () => {
    if (!project) return;

    if (project.currentStep < 5) {
      alert(
        "Please complete the entire workflow (Requirements -> Design -> Development -> Testing) before deploying.",
      );
      return;
    }

    try {
      await saveOrUpdateProject();
      setIsDeployModalOpen(true);
    } catch (e: any) {
      console.error("Deploy click failed:", e);
      alert(
        `Deployment blocked: Could not save project. ${e.message || "Please check console"}`,
      );
    }
  };

  const finishProject = async () => {
    if (!project) return;

    setProject((p) =>
      p
        ? {
          ...p,
          isProcessing: false,
          currentStep: 5,
          waitingForApproval: false,
          theme: selectedTheme,
          attachments,
        }
        : null,
    );
    addMessage(
      "Orchestrator",
      "Workflow complete. The application is now live in the Deliverables tab.",
    );

    // Auto-switch to preview
    setTimeout(() => setActiveTab("output"), 1000);

    // Save to Backend
    await saveOrUpdateProject();
  };

  if (viewState === "landing") {
    return <HomePage onSignIn={() => setViewState("login")} />;
  }

  if (viewState === "login") {
    return <LoginScreen onLogin={() => setViewState("studio")} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a] text-slate-200">
      {/* Navbar */}
      <header className="h-16 border-b border-slate-800 px-8 flex items-center justify-between bg-[#1e293b]/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div
            onClick={() => setIsHistoryOpen(true)}
            className="cursor-pointer scale-90 -ml-4"
          >
            <AnimatedLogo />
          </div>
        </div>



        <div className="flex items-center gap-4">
          <div className="flex gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab("flow")}
              className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === "flow" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
            >
              Agent Workspace
            </button>
            <button
              onClick={() => setActiveTab("output")}
              className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === "output" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
            >
              Product Delivery
            </button>
          </div>

          <div className="h-8 w-[1px] bg-slate-800/50 mx-2" />

          {/* Global Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleNewChat}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all tooltip"
              title="New Chat / Reset Session"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4v16m8-8H4"
                ></path>
              </svg>
            </button>

            <button
              onClick={handleLogout}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:text-white hover:bg-rose-500 transition-all tooltip"
              title="Logout"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                ></path>
              </svg>
            </button>

            <button
              onClick={() => setIsHistoryOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all tooltip"
              title="Project History"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
            </button>

            <button
              onClick={() => setIsSidebarOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all"
              title="Open Chat"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                ></path>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar: Control Panel */}
        <div className="w-[400px] border-r border-slate-800 flex flex-col bg-[#0f172a]/80 backdrop-blur-sm overflow-y-auto">
          <div className="p-6 flex flex-col gap-5">
            <section>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3">
                Command Center
              </label>

              {/* ── Test Case Picklist ─────────────────────────────── */}
              <div className="mb-3">
                <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest block mb-1.5">
                  Quick Start Template
                </label>
                <div className="relative">
                  <select
                    value={selectedTestCase || ''}
                    onChange={(e) => {
                      const val = e.target.value || null;
                      setSelectedTestCase(val);
                      if (val && TEST_CASE_TEMPLATES[val]) {
                        setInput(TEST_CASE_TEMPLATES[val].prompt);
                      }
                    }}
                    disabled={project?.isProcessing}
                    className="w-full bg-slate-900/70 border border-slate-700/50 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-300 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all hover:border-slate-600 disabled:opacity-50"
                  >
                    <option value="">— Select a domain or write custom —</option>
                    {Object.entries(TEST_CASE_TEMPLATES).map(([key, t]) => (
                      <option key={key} value={key}>
                        {t.icon} {t.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {selectedTestCase && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[9px] text-indigo-400">
                    <span className="text-base">{TEST_CASE_TEMPLATES[selectedTestCase].icon}</span>
                    <span className="font-bold uppercase tracking-wider">Domain: {TEST_CASE_TEMPLATES[selectedTestCase].label}</span>
                  </div>
                )}
              </div>

              {/* ── Prompt Textarea ────────────────────────────────── */}
              <div className="relative group">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleStart();
                    }
                  }}
                  placeholder="Describe your vision (e.g., 'A professional landing page for a coffee subscription service...')"
                  className="w-full h-28 bg-slate-900/50 border border-slate-700/50 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none transition-all group-hover:border-slate-600 text-white placeholder-slate-600 leading-relaxed shadow-inner"
                />
                <button
                  onClick={handleStart}
                  disabled={project?.isProcessing || (!input.trim() && !selectedTestCase && processedFiles.filter(f => f.status === 'done').length === 0)}
                  className="absolute bottom-3 right-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-xl transition-all shadow-xl shadow-indigo-600/20 font-bold text-xs flex items-center gap-2 group"
                >
                  <span>
                    {project?.isProcessing ? "Synthesizing..." : "Execute"}
                  </span>
                  {!project?.isProcessing && (
                    <svg
                      className="w-4 h-4 transition-transform group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      ></path>
                    </svg>
                  )}
                </button>
              </div>

              {/* ── Figma Link Input ───────────────────────────────── */}
              <div className="mt-2">
                <div className="relative">
                  <input
                    type="text"
                    value={figmaLink}
                    onChange={(e) => setFigmaLink(e.target.value)}
                    placeholder="Paste Figma link (optional)"
                    className="w-full bg-slate-900/40 border border-slate-800/50 rounded-xl px-4 py-2 text-[11px] text-slate-400 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all"
                  />
                  {figmaLink && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">🎨 Design Ref</span>
                  )}
                </div>
              </div>

              {/* ── File Upload Zone ───────────────────────────────── */}
              <div className="mt-3">
                <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest block mb-1.5">
                  Attachments
                </label>
                <FileUploadZone
                  files={processedFiles}
                  onFilesChange={setProcessedFiles}
                  disabled={project?.isProcessing}
                />

                {/* FIGMA INTEGRATION SECTION */}
                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden group mt-4">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/5 blur-[60px] rounded-full -z-10 group-hover:bg-fuchsia-500/10 transition-colors" />
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-fuchsia-600/20 text-fuchsia-400 flex items-center justify-center">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">Figma Design Integration</h3>
                      <p className="text-[10px] text-slate-500">Enable design-driven generation from file link</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="https://www.figma.com/file/xxxx/Design-Name"
                        value={figmaLink}
                        onChange={(e) => setFigmaLink(e.target.value)}
                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:border-fuchsia-500/50 outline-none transition-all placeholder:text-slate-700"
                      />
                      {figmaData && (
                        <div className="absolute right-3 top-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleFetchFigma}
                      disabled={!figmaLink || isFetchingFigma}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 rounded-xl transition-all border border-slate-700 flex items-center gap-2 group/btn"
                    >
                      {isFetchingFigma ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span className="text-xs font-bold">Link</span>
                        </>
                      )}
                    </button>
                  </div>

                  {figmaData && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <div className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5">
                        <Box className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] font-medium text-emerald-400">{figmaData.name}</span>
                      </div>
                      <div className="px-2 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-1.5">
                        <FileText className="w-3 h-3 text-indigo-400" />
                        <span className="text-[10px] font-medium text-indigo-400">{figmaData.pages.length} Pages</span>
                      </div>
                      {figmaData.theme.fonts.length > 0 && (
                        <div className="px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center gap-1.5">
                          <span className="text-[10px] font-medium text-amber-400">{figmaData.theme.fonts[0]} + {figmaData.theme.fonts.length - 1} Fonts</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Smart domain detection indicator */}
                {processedFiles.some(f => f.status === 'done' && f.category !== 'image') && !selectedTestCase && (() => {
                  const fileText = processedFiles.filter(f => f.status === 'done' && f.category !== 'image').map(f => f.content).join(' ');
                  const detected = detectDomainFromContent(fileText);
                  if (detected) {
                    return (
                      <div className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                        <span className="text-base">{TEST_CASE_TEMPLATES[detected].icon}</span>
                        <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider">Auto-detected: {TEST_CASE_TEMPLATES[detected].label}</span>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* BRD Parsed Badge + Preview */}
                {brdData && (
                  <div className={`mt-2 rounded-xl border overflow-hidden transition-all ${brdData.isValid
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-rose-500/5 border-rose-500/20'
                    }`}>
                    <button
                      onClick={() => setShowBRDPreview(v => !v)}
                      className="w-full flex items-center justify-between px-3 py-2 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{brdData.isValid ? '📋' : '⚠️'}</span>
                        <div>
                          <span className={`text-[9px] font-black uppercase tracking-wider ${brdData.isValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {brdData.isValid ? `Generated from ${brdData.documentType} Document` : 'BRD Parse Warning'}
                          </span>
                          <p className="text-[8px] text-slate-500 mt-0.5">
                            {brdData.isValid
                              ? `${brdData.functional_requirements.length} FRs · ${brdData.user_flows.length} Flows · ${brdData.modules.length} Modules`
                              : brdData.validationError?.substring(0, 60) + '…'
                            }
                          </p>
                        </div>
                      </div>
                      <svg className={`w-3 h-3 text-slate-500 transition-transform ${showBRDPreview ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showBRDPreview && brdData.isValid && (
                      <div className="px-3 pb-3 space-y-2 border-t border-emerald-500/10">
                        <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold mt-2">Extracted Requirements Preview</p>

                        {brdData.functional_requirements.length > 0 && (
                          <div>
                            <p className="text-[8px] font-bold text-cyan-400 mb-1">Functional ({brdData.functional_requirements.length})</p>
                            <div className="space-y-0.5 max-h-32 overflow-y-auto pr-1">
                              {brdData.functional_requirements.map((fr, i) => (
                                <p key={i} className="text-[8px] text-slate-400 leading-relaxed">
                                  <span className="text-cyan-600 font-mono">FR-{i + 1}</span> {fr.length > 80 ? fr.substring(0, 80) + '…' : fr}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        {brdData.user_flows.length > 0 && (
                          <div>
                            <p className="text-[8px] font-bold text-fuchsia-400 mb-1">User Flows ({brdData.user_flows.length})</p>
                            <div className="space-y-0.5 max-h-20 overflow-y-auto pr-1">
                              {brdData.user_flows.map((uf, i) => (
                                <p key={i} className="text-[8px] text-slate-400 leading-relaxed">
                                  <span className="text-fuchsia-600 font-mono">UF-{i + 1}</span> {uf.length > 80 ? uf.substring(0, 80) + '…' : uf}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        {brdData.entities.length > 0 && (
                          <div>
                            <p className="text-[8px] font-bold text-amber-400 mb-1">Entities ({brdData.entities.length})</p>
                            <div className="flex flex-wrap gap-1">
                              {brdData.entities.slice(0, 8).map((e, i) => (
                                <span key={i} className="text-[7px] px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-amber-400">{e.length > 20 ? e.substring(0, 20) + '…' : e}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                Agent Pipeline
              </label>

              {/* Agent Status Summary Bar */}
              {project && project.currentStep > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/50 rounded-xl border border-slate-800/50 mb-1">
                  {[
                    { step: 1, name: 'REQ', color: 'cyan' },
                    { step: 2, name: 'DES', color: 'fuchsia' },
                    { step: 3, name: 'DEV', color: 'amber' },
                    { step: 4, name: 'QA', color: 'emerald' },
                  ].map((agent) => {
                    const isRunning = project.currentStep === agent.step && project.isProcessing;
                    const isWaiting = project.currentStep < agent.step;
                    const isDone = project.currentStep > agent.step || (project.currentStep === agent.step && !project.isProcessing);
                    const isActive = project.currentStep === agent.step;
                    return (
                      <div key={agent.step} className="flex items-center gap-1 flex-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-yellow-400 animate-pulse' :
                            isDone && !isActive ? 'bg-emerald-500' :
                              isWaiting ? 'bg-blue-500/40' :
                                isActive ? 'bg-indigo-400 animate-pulse' : 'bg-slate-700'
                          }`} />
                        <span className={`text-[8px] font-black uppercase tracking-widest ${isRunning ? 'text-yellow-400' :
                            isDone && !isActive ? 'text-emerald-500' :
                              isWaiting ? 'text-blue-400/50' :
                                isActive ? 'text-indigo-400' : 'text-slate-600'
                          }`}>
                          {agent.name}
                        </span>
                        {agent.step < 4 && <div className={`flex-1 h-[1px] mx-1 ${isDone && !isActive ? 'bg-emerald-500/30' : 'bg-slate-800'}`} />}
                      </div>
                    );
                  })}
                </div>
              )}

              <AgentCard
                role="Requirement"
                isActive={project?.currentStep === 1}
                status={
                  project?.currentStep === 1
                    ? "processing"
                    : project?.currentStep && project.currentStep > 1
                      ? "done"
                      : "idle"
                }
                description={brdData?.isValid
                  ? `BRD Mode — ${brdData.functional_requirements.length} FRs extracted from ${brdData.documentType}. Strict no-hallucination mode.`
                  : "Synthesizes raw prompts into structured BA documentation."
                }
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    ></path>
                  </svg>
                }
                isWaitingForApproval={
                  project?.currentStep === 1 && project?.waitingForApproval
                }
                onApprove={handleApproveStep}
                onRemodify={handleRemodify}
                onClick={() => navigateToDeliverable("docs")}
              />

              <AgentCard
                role="Design"
                isActive={project?.currentStep === 2}
                status={
                  project?.currentStep === 2
                    ? "processing"
                    : project?.currentStep && project.currentStep > 2
                      ? "done"
                      : "idle"
                }
                description="Drafts UI/UX wireframes and system component hierarchy."
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                    ></path>
                  </svg>
                }
                isWaitingForApproval={
                  project?.currentStep === 2 && project?.waitingForApproval
                }
                onApprove={handleApproveStep}
                onRemodify={handleRemodify}
                onClick={() => {
                  if (project?.requirements) navigateToDeliverable("docs");
                }}
              />

              <AgentCard
                role="Development"
                isActive={project?.currentStep === 3}
                status={
                  project?.currentStep === 3
                    ? "processing"
                    : project?.currentStep && project.currentStep > 3
                      ? "done"
                      : "idle"
                }
                description="Lead engineer producing high-fidelity React implementation."
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    ></path>
                  </svg>
                }
                isWaitingForApproval={
                  project?.currentStep === 3 && project?.waitingForApproval
                }
                onApprove={handleApproveStep}
                onRemodify={handleRemodify}
                onClick={() => {
                  if (project?.code) navigateToDeliverable("code");
                }}
              />

              <AgentCard
                role="Testing"
                isActive={project?.currentStep === 4}
                status={
                  project?.currentStep === 4
                    ? "processing"
                    : project?.currentStep && project.currentStep > 4
                      ? "done"
                      : "idle"
                }
                description="QA specialist verifying build stability and performance."
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                }
                isWaitingForApproval={
                  project?.currentStep === 4 && project?.waitingForApproval
                }
                onApprove={handleApproveStep}
                onRemodify={handleRemodify}
                onClick={() => {
                  if (project?.tests) navigateToDeliverable("preview");
                }}
              />
            </section>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 bg-[#0b1120] relative flex flex-col min-w-0">
          {activeTab === "flow" ? (
            <div className="flex-1 overflow-y-auto p-12">
              <div className="max-w-3xl mx-auto space-y-8">
                {messages.length === 0 && (
                  <div className="h-[60vh] flex flex-col items-center justify-center text-center opacity-50">
                    <div className="w-24 h-24 bg-slate-800/50 rounded-3xl border border-slate-700 flex items-center justify-center mb-8">
                      <svg
                        className="w-12 h-12 text-slate-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                        ></path>
                      </svg>
                    </div>
                    <h2 className="text-xl font-medium text-slate-300">
                      Ready for Synthesis
                    </h2>
                    <p className="text-slate-500 text-sm max-w-sm mt-2 leading-relaxed">
                      Agent logs will appear here in real-time as the automated
                      workflow proceeds.
                    </p>
                  </div>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700"
                  >
                    <div
                      className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${msg.role === "Orchestrator"
                          ? "bg-indigo-600 text-white"
                          : msg.role === "Requirement"
                            ? "bg-cyan-600 text-white"
                            : msg.role === "Design"
                              ? "bg-fuchsia-600 text-white"
                              : msg.role === "Development"
                                ? "bg-amber-600 text-white"
                                : msg.role === "Parallel"
                                  ? "bg-violet-600 text-white"
                                  : "bg-emerald-600 text-white"
                        }`}
                    >
                      <span className="text-[10px] font-black uppercase">
                        {msg.role.slice(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1 bg-slate-900/40 border border-slate-800/50 rounded-3xl p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                          {msg.role} Agent
                        </span>
                        <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                        <span className="text-[10px] text-slate-600 font-mono">
                          {msg.timestamp.toLocaleTimeString()}
                        </span>
                        {msg.status === "thinking" && (
                          <div className="flex gap-1 ml-auto">
                            <div className="w-1.5 h-1.5 bg-indigo-500/50 rounded-full animate-pulse"></div>
                            <div className="w-1.5 h-1.5 bg-indigo-500/50 rounded-full animate-pulse delay-75"></div>
                            <div className="w-1.5 h-1.5 bg-indigo-500/50 rounded-full animate-pulse delay-150"></div>
                          </div>
                        )}
                      </div>
                      <p className="text-[13px] leading-relaxed text-slate-400 font-medium whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </div>
          ) : !project ? (
            <div className="flex-1 flex items-center justify-center text-center text-slate-600">
              <div>
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl border border-slate-800 bg-slate-900/50 flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-500">No project active</p>
                <p className="text-xs text-slate-700 mt-1">Start a project from the command center to view artifacts.</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col p-8 lg:p-12 overflow-hidden min-h-0">
              <div className="max-w-7xl mx-auto w-full h-full flex flex-col gap-6">
                {/* Workspace Controls */}
                <div className="flex items-center justify-between bg-slate-900/50 p-1 rounded-2xl border border-slate-800 w-fit">
                  <button
                    onClick={() => setDeliverableSubTab("preview")}
                    className={`px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${deliverableSubTab === "preview" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    Interactive Preview
                  </button>
                  <button
                    onClick={() => setDeliverableSubTab("code")}
                    className={`px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${deliverableSubTab === "code" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    Production Source
                  </button>
                  <button
                    onClick={() => setDeliverableSubTab("docs")}
                    className={`px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${deliverableSubTab === "docs" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    Project Artifacts
                  </button>
                  <button
                    onClick={downloadProjectZip}
                    disabled={!project || project.isProcessing}
                    className="ml-4 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl transition-all disabled:opacity-50"
                    title="Download Project ZIP"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      ></path>
                    </svg>
                  </button>
                  <button
                    onClick={downloadProjectWordDocs}
                    disabled={!project || project.isProcessing}
                    className="ml-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                    title="Export to Word (.doc)"
                  >
                    <FileText className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest hidden lg:inline">Report</span>
                  </button>
                  <button
                    onClick={handleDeployClick}
                    disabled={!project || project.isProcessing}
                    className={`ml-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center ${project && project.currentStep < 5 ? "opacity-50 cursor-not-allowed" : ""}`}
                    title={
                      project?.currentStep === 5
                        ? "Deploy to GitHub"
                        : "Complete all stages to deploy"
                    }
                  >
                    <Github className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="ml-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl transition-all"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      ></path>
                    </svg>
                  </button>
                </div>

                {/* Viewport Area */}
                <div className="flex-1 flex flex-col min-h-0 relative">
                  {deliverableSubTab === "preview" && (
                    <div
                      className={`flex-1 flex flex-col min-h-0 animate-in fade-in zoom-in-95 duration-500 ${isPreviewFullScreen ? "fixed inset-0 z-[100] bg-black p-4" : ""}`}
                    >
                      {isPreviewFullScreen && (
                        <button
                          onClick={() => setIsPreviewFullScreen(false)}
                          className="absolute top-8 right-8 z-[110] bg-slate-900/80 p-2 rounded-full text-white hover:bg-slate-800 transition-all border border-slate-700 shadow-2xl"
                        >
                          <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M6 18L18 6M6 6l12 12"
                            ></path>
                          </svg>
                        </button>
                      )}
                      <div className="flex-1 flex flex-col relative">
                        {(() => {
                          let previewCode = "";
                          const rawCode = project?.code;

                          if (!rawCode) return <LivePreview code="" />;

                          let codeMap: Record<string, string> = {};

                          if (typeof rawCode === "object") {
                            codeMap = rawCode as Record<string, string>;
                          } else if (typeof rawCode === "string") {
                            const trimmed = rawCode.trim();
                            if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
                              try {
                                codeMap = JSON.parse(trimmed);
                              } catch (e) {
                                // Not JSON, treat as raw code
                                previewCode = trimmed;
                              }
                            } else {
                              previewCode = trimmed;
                            }
                          }

                          if (Object.keys(codeMap).length > 0) {
                            // Extract just the frontend React code for the Live Preview iframe
                            // Try common key patterns in priority order
                            const findByKey = (...suffixes: string[]) =>
                              suffixes.reduce<string | undefined>((found, s) =>
                                found ?? Object.entries(codeMap).find(([k]) => k.toLowerCase().endsWith(s.toLowerCase()))?.[1]
                                , undefined);

                            previewCode =
                              codeMap["frontend/App.tsx"] ||
                              codeMap["/frontend/App.tsx"] ||
                              codeMap["src/App.tsx"] ||
                              codeMap["/src/App.tsx"] ||
                              codeMap["App.tsx"] ||
                              findByKey("App.tsx", "app.tsx", "index.tsx", "index.jsx", "App.jsx") ||
                              // Any .tsx/.jsx file that has an export default
                              Object.values(codeMap).find(
                                (c: any) =>
                                  typeof c === "string" &&
                                  (c.includes("export default") || c.includes("export const App") || c.includes("window.App ="))
                              ) ||
                              // Any .tsx/.jsx file
                              Object.entries(codeMap).find(([k]) =>
                                k.endsWith(".tsx") || k.endsWith(".jsx")
                              )?.[1] ||
                              Object.values(codeMap).find(c => typeof c === "string") ||
                              "";
                          }

                          return <LivePreview code={previewCode} />;
                        })()}
                        {!isPreviewFullScreen && (
                          <button
                            onClick={() => setIsPreviewFullScreen(true)}
                            className="absolute bottom-4 right-4 bg-slate-900/80 p-2 rounded-lg text-slate-400 hover:text-white transition-all border border-slate-700"
                            title="Full Screen Preview"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                              ></path>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {deliverableSubTab === "code" && (
                    <div className="flex-1 flex bg-[#010409] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-right-4 duration-500">
                      {/* Left Sidebar: File Explorer */}
                      <div className="w-64 border-r border-slate-800 bg-[#0d1117] flex flex-col">
                        <div className="h-12 border-b border-slate-800 flex items-center px-4 bg-slate-900/30">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Explorer
                          </span>
                        </div>
                        <div className="flex-1 overflow-y-auto py-2">
                          {typeof project?.code === "string" ? (
                            <button
                              onClick={() =>
                                setSelectedFile("generated_app.tsx")
                              }
                              className={`w-full text-left px-4 py-1.5 text-xs font-mono transition-colors ${selectedFile === "generated_app.tsx"
                                  ? "bg-indigo-500/10 text-indigo-400 border-l-2 border-indigo-500"
                                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-l-2 border-transparent"
                                }`}
                            >
                              <div className="flex items-center gap-2">
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                                generated_app.tsx
                              </div>
                            </button>
                          ) : project?.code &&
                            Object.keys(project.code).length > 0 ? (
                            Object.keys(project.code)
                              .sort()
                              .map((filename) => (
                                <button
                                  key={filename}
                                  onClick={() => setSelectedFile(filename)}
                                  className={`w-full text-left px-4 py-1.5 text-xs font-mono transition-colors truncate ${selectedFile === filename
                                      ? "bg-indigo-500/10 text-indigo-400 border-l-2 border-indigo-500"
                                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-l-2 border-transparent"
                                    }`}
                                  title={filename}
                                >
                                  <div className="flex items-center gap-2">
                                    <svg
                                      className="w-3.5 h-3.5 flex-shrink-0"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                      />
                                    </svg>
                                    <span className="truncate">
                                      {filename.split("/").pop() || filename}
                                    </span>
                                  </div>
                                </button>
                              ))
                          ) : (
                            <div className="px-4 py-4 text-xs text-rose-400/80 italic text-center">
                              <svg
                                className="w-8 h-8 mx-auto mb-2 text-rose-500/50"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                ></path>
                              </svg>
                              AI failed to generate valid code files. Please
                              refine your prompt and try again.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Content: Editor */}
                      <div className="flex-1 flex flex-col min-w-0">
                        <div className="h-12 border-b border-slate-800 flex items-center justify-between px-6 bg-[#0d1117]">
                          <div className="flex items-center gap-2 max-w-[70%]">
                            <span className="text-[10px] font-bold text-slate-400 tracking-widest truncate">
                              {selectedFile || "Select a file"}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              if (project?.code) {
                                let codeToCopy = "";
                                if (typeof project.code === "string") {
                                  codeToCopy = project.code;
                                } else if (
                                  selectedFile &&
                                  project.code[selectedFile]
                                ) {
                                  codeToCopy = project.code[selectedFile];
                                }
                                if (codeToCopy)
                                  navigator.clipboard.writeText(codeToCopy);
                              }
                            }}
                            disabled={!selectedFile || !project?.code}
                            className="text-[10px] font-bold text-slate-400 hover:text-white transition-colors bg-slate-800 px-3 py-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            COPY SOURCE
                          </button>
                        </div>
                        <div className="flex-1 p-6 font-mono text-[13px] overflow-auto whitespace-pre leading-relaxed text-indigo-300/90 selection:bg-indigo-500/30">
                          {typeof project?.code === "string"
                            ? project.code
                            : project?.code && selectedFile
                              ? project.code[selectedFile]
                              : "// Code is currently being authored..."}
                        </div>
                      </div>
                    </div>
                  )}

                  {deliverableSubTab === "docs" && (
                    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-left-4 duration-500">
                      {/* Artifact Filter Bar */}
                      <div className="flex items-center justify-between mb-6 px-2">
                        <h2 className="text-xl font-bold text-slate-200 tracking-tight">
                          Project Documentation
                        </h2>
                      </div>

                      <div className="flex-1 flex flex-col gap-10 overflow-y-auto pr-4 pb-12 max-w-5xl mx-auto w-full">
                        {/* PARALLEL VALIDATION SCORES — shown if any validation is available */}
                        {(project?.reqValidation || project?.designReview || project?.codeAnalysis) && (
                          <div className="col-span-full mb-2">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                              <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Parallel Validation Pack Results</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              {project?.reqValidation && (
                                <div className={`p-4 rounded-2xl border ${(project.reqValidation.score ?? 0) >= 80 ? 'bg-emerald-950/30 border-emerald-900/50' : (project.reqValidation.score ?? 0) >= 60 ? 'bg-amber-950/30 border-amber-900/50' : 'bg-rose-950/30 border-rose-900/50'}`}>
                                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Req Quality</div>
                                  <div className={`text-2xl font-black mb-1 ${(project.reqValidation.score ?? 0) >= 80 ? 'text-emerald-400' : (project.reqValidation.score ?? 0) >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>{project.reqValidation.score ?? '--'}<span className="text-sm font-medium">/100</span></div>
                                  <div className="text-[10px] text-slate-400 leading-relaxed">{project.reqValidation.recommendation}</div>
                                  {(project.reqValidation.gaps ?? []).length > 0 && (
                                    <div className="mt-2 space-y-0.5">
                                      {(project.reqValidation.gaps ?? []).slice(0, 3).map((g, i) => (
                                        <div key={i} className="text-[9px] text-amber-400/80">⚠ {g}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                              {project?.designReview && (
                                <div className={`p-4 rounded-2xl border ${(project.designReview.score ?? 0) >= 80 ? 'bg-emerald-950/30 border-emerald-900/50' : (project.designReview.score ?? 0) >= 60 ? 'bg-amber-950/30 border-amber-900/50' : 'bg-rose-950/30 border-rose-900/50'}`}>
                                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Design Review</div>
                                  <div className={`text-2xl font-black mb-1 ${(project.designReview.score ?? 0) >= 80 ? 'text-emerald-400' : (project.designReview.score ?? 0) >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>{project.designReview.score ?? '--'}<span className="text-sm font-medium">/100</span></div>
                                  <div className="text-[10px] text-slate-400 leading-relaxed">{project.designReview.summary}</div>
                                  {(project.designReview.architectureRisks ?? []).length > 0 && (
                                    <div className="mt-2 space-y-0.5">
                                      {(project.designReview.architectureRisks ?? []).slice(0, 3).map((r, i) => (
                                        <div key={i} className="text-[9px] text-amber-400/80">⚠ {r}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                              {project?.codeAnalysis && (
                                <div className={`p-4 rounded-2xl border ${(project.codeAnalysis.score ?? 0) >= 80 ? 'bg-emerald-950/30 border-emerald-900/50' : (project.codeAnalysis.score ?? 0) >= 60 ? 'bg-amber-950/30 border-amber-900/50' : 'bg-rose-950/30 border-rose-900/50'}`}>
                                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Code Analysis</div>
                                  <div className={`text-2xl font-black mb-1 ${(project.codeAnalysis.score ?? 0) >= 80 ? 'text-emerald-400' : (project.codeAnalysis.score ?? 0) >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>{project.codeAnalysis.score ?? '--'}<span className="text-sm font-medium">/100</span></div>
                                  <div className="text-[10px] text-slate-400 leading-relaxed">{project.codeAnalysis.summary}</div>
                                  {(project.codeAnalysis.securityFlags ?? []).length > 0 && (
                                    <div className="mt-2 space-y-0.5">
                                      {(project.codeAnalysis.securityFlags ?? []).slice(0, 3).map((f, i) => (
                                        <div key={i} className="text-[9px] text-rose-400/80">🔒 {f}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="space-y-8">
                          {/* REQUIREMENT SPEC */}
                          <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
                            <div onClick={() => setExpandedDocs((prev) => ({ ...prev, req: !prev.req }))} className="w-full flex items-center justify-between mb-6 group cursor-pointer outline-none">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-500 flex items-center justify-center">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                </div>
                                <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest group-hover:text-white transition-colors">Requirement Spec</h3>
                              </div>
                              <div className="flex items-center gap-4 text-slate-500 group-hover:text-slate-300 transition-colors">
                                <button onClick={(e) => downloadSectionAsMd(e, "req")} className="w-7 h-7 flex items-center justify-center rounded bg-slate-800/80 hover:bg-indigo-600 hover:text-white transition-all outline-none" title="Download as .md"><Download className="w-4 h-4" /></button>
                                {expandedDocs.req ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>}
                              </div>
                            </div>
                            {expandedDocs.req && (
                              <div className="mt-4">
                                {project?.requirements ? (
                                  <div className="space-y-6">
                                    {(() => {
                                      const r = project.requirements as any;
                                      const overview = r.projectOverview || r.executiveSummary;
                                      const scopeObj = typeof r.scope === 'object' && r.scope !== null ? r.scope : null;
                                      const scopeStr = typeof r.scope === 'string' ? r.scope : null;
                                      return (<>
                                        {overview && <div><h4 className="text-[11px] font-bold text-slate-500 uppercase mb-3 text-cyan-400">Project Overview</h4><div className="text-xs text-slate-400 leading-relaxed bg-slate-800/30 p-4 rounded-xl border border-slate-800/50">{overview}</div></div>}
                                        {r.businessObjectives && <div><h4 className="text-[11px] font-bold text-slate-500 uppercase mb-3 text-cyan-400">Business Objectives</h4><div className="text-xs text-slate-400 leading-relaxed bg-slate-800/30 p-4 rounded-xl border border-slate-800/50">{r.businessObjectives}</div></div>}
                                        {(scopeObj || scopeStr) && (
                                          <div className="grid grid-cols-2 gap-4">
                                            {scopeObj ? (<>
                                              {scopeObj.inScope && <div className="p-4 bg-slate-950 rounded-2xl border border-emerald-900/50 text-[11px] text-slate-500 leading-relaxed"><span className="block font-bold text-emerald-400 mb-2 uppercase tracking-tighter">In Scope</span><ul className="list-disc pl-4 space-y-1">{scopeObj.inScope.map((item: string, k: number) => <li key={k}>{item}</li>)}</ul></div>}
                                              {scopeObj.outOfScope && <div className="p-4 bg-slate-950 rounded-2xl border border-rose-900/50 text-[11px] text-slate-500 leading-relaxed"><span className="block font-bold text-rose-400 mb-2 uppercase tracking-tighter">Out of Scope</span><ul className="list-disc pl-4 space-y-1">{scopeObj.outOfScope.map((item: string, k: number) => <li key={k}>{item}</li>)}</ul></div>}
                                            </>) : <div className="col-span-2 p-4 bg-slate-950 rounded-2xl border border-slate-800/50 text-[11px] text-slate-500 leading-relaxed"><span className="block font-bold text-slate-400 mb-2 uppercase tracking-tighter">Scope</span>{scopeStr}</div>}
                                          </div>
                                        )}
                                        {r.stakeholders && r.stakeholders.length > 0 && <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/50 text-[11px] text-slate-500"><span className="block font-bold text-slate-400 mb-2 uppercase tracking-tighter">Stakeholders</span><ul className="list-disc pl-4 space-y-1">{r.stakeholders.map((s: string, k: number) => <li key={k}>{s}</li>)}</ul></div>}
                                        <div className="grid grid-cols-2 gap-4">
                                          {r.functionalRequirements && r.functionalRequirements.length > 0 && <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/50 text-[11px] text-slate-500"><span className="block font-bold text-slate-400 mb-2 uppercase tracking-tighter">Functional Requirements</span><ul className="list-disc pl-4 space-y-1">{r.functionalRequirements.map((item: string, k: number) => <li key={k}>{item}</li>)}</ul></div>}
                                          {r.nonFunctionalRequirements && r.nonFunctionalRequirements.length > 0 && <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/50 text-[11px] text-slate-500"><span className="block font-bold text-slate-400 mb-2 uppercase tracking-tighter">Non-Functional Requirements</span><ul className="list-disc pl-4 space-y-1">{r.nonFunctionalRequirements.map((item: string, k: number) => <li key={k}>{item}</li>)}</ul></div>}
                                          {r.technicalConstraints && r.technicalConstraints.length > 0 && !r.nonFunctionalRequirements && <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/50 text-[11px] text-slate-500"><span className="block font-bold text-slate-400 mb-2 uppercase tracking-tighter">Technical Constraints</span><ul className="list-disc pl-4 space-y-1">{r.technicalConstraints.map((tc: string, k: number) => <li key={k}>{tc}</li>)}</ul></div>}
                                        </div>
                                        <div><h4 className="text-[11px] font-bold text-slate-500 uppercase mb-3">User Stories & Acceptance Criteria</h4>
                                          <ul className="space-y-4">{(Array.isArray(r.userStories) ? r.userStories : []).map((s: any, i: number) => (
                                            <li key={i} className="text-xs text-slate-400 bg-slate-800/30 p-3 rounded-xl border border-slate-800/50">
                                              <div className="flex gap-2 mb-1.5">
                                                <span className="text-cyan-500 font-mono font-bold">#{s.id || i + 1}</span>
                                                <span className="font-medium text-slate-200">{typeof s === "string" ? s : s.story}</span>
                                                {s.priority && <span className={`ml-auto text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${s.priority === "High" ? "bg-rose-500/20 text-rose-400" : "bg-slate-700 text-slate-400"}`}>{s.priority}</span>}
                                              </div>
                                              {s.description && <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">{s.description}</p>}
                                              {Array.isArray(s.acceptanceCriteria) && s.acceptanceCriteria.length > 0 && <ul className="pl-8 mt-2 space-y-1 list-disc marker:text-slate-600">{s.acceptanceCriteria.map((ac: string, j: number) => <li key={j} className="text-slate-500">{ac}</li>)}</ul>}
                                            </li>
                                          ))}</ul>
                                        </div>
                                        {(r.assumptionsAndConstraints || r.assumptions) && (r.assumptionsAndConstraints || r.assumptions).length > 0 && <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/50 text-[11px] text-slate-500"><span className="block font-bold text-slate-400 mb-2 uppercase tracking-tighter">Assumptions & Constraints</span><ul className="list-disc pl-4 space-y-1">{(r.assumptionsAndConstraints || r.assumptions).map((tc: string, k: number) => <li key={k}>{tc}</li>)}</ul></div>}
                                      </>);
                                    })()}
                                  </div>
                                ) : <p className="text-xs text-slate-600 italic">Documentation generation in progress...</p>}
                              </div>
                            )}
                          </section>

                          {/* DESIGN SPECIFICATION */}
                          <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
                            <div onClick={() => setExpandedDocs((prev) => ({ ...prev, design: !prev.design }))} className="w-full flex items-center justify-between mb-6 group cursor-pointer outline-none">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-fuchsia-600/20 text-fuchsia-500 flex items-center justify-center">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path></svg>
                                </div>
                                <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest group-hover:text-white transition-colors">System Design</h3>
                              </div>
                              <div className="flex items-center gap-4 text-slate-500 group-hover:text-slate-300 transition-colors">
                                <button onClick={(e) => downloadSectionAsMd(e, "design")} className="w-7 h-7 flex items-center justify-center rounded bg-slate-800/80 hover:bg-indigo-600 hover:text-white transition-all outline-none" title="Download as .md"><Download className="w-4 h-4" /></button>
                                {expandedDocs.design ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>}
                              </div>
                            </div>
                            {expandedDocs.design && (
                              <div className="mt-4">
                                {project?.design ? (
                                  <div className="space-y-6">
                                    {(() => {
                                      const d = project.design as any;
                                      const stack = d.hld?.technologyStackOverview || d.designSystem;
                                      const integrations = d.hld?.externalIntegrations || [];
                                      const dataModels = d.lld?.dataModels || d.wireframes;
                                      const endpoints: any[] = d.lld?.apiEndpoints || d.apiEndpoints || [];
                                      return (<>
                                        {(stack || integrations.length > 0) && <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/50"><span className="block font-bold text-slate-400 mb-2 uppercase tracking-tighter text-[11px]">Technology Stack & Integrations</span><div className="text-[11px] text-slate-500 leading-relaxed">{stack && <><strong>Stack:</strong> {stack}<br /><br /></>}{integrations.length > 0 && <><strong>Integrations:</strong> {integrations.join(', ')}</>}</div></div>}
                                        {dataModels && <div><h4 className="text-[11px] font-bold text-slate-500 uppercase mb-3">Data Models</h4><div className="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed bg-slate-800/20 p-4 rounded-xl border border-slate-800/50 font-mono">{dataModels}</div></div>}
                                        {endpoints.length > 0 && <div><h4 className="text-[11px] font-bold text-slate-500 uppercase mb-3">API Contracts</h4><div className="space-y-2">{endpoints.map((ep: any, k: number) => (
                                          <div key={k} className="text-[10px] font-mono bg-emerald-950/30 px-3 py-2 rounded-lg border border-emerald-900/50">
                                            {typeof ep === 'string' ? <span className="text-emerald-400">{ep}</span> : <><strong className="text-emerald-400 mr-2">{ep.method}</strong><span className="text-slate-300">{ep.endpoint}</span></>}
                                          </div>
                                        ))}</div></div>}
                                      </>);
                                    })()}
                                  </div>
                                ) : <p className="text-xs text-slate-600 italic">Design blueprints pending...</p>}
                              </div>
                            )}
                          </section>

                          {/* DEVELOPMENT DOCUMENTATION */}
                          <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
                            <div onClick={() => setExpandedDocs((prev) => ({ ...prev, devdocs: !prev.devdocs }))} className="w-full flex items-center justify-between mb-6 group cursor-pointer outline-none">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-orange-600/20 text-orange-500 flex items-center justify-center">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                                </div>
                                <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest group-hover:text-white transition-colors">Development Documentation</h3>
                              </div>
                              <div className="flex items-center gap-4 text-slate-500 group-hover:text-slate-300 transition-colors">
                                <button onClick={(e) => downloadSectionAsMd(e, "devdocs")} className="w-7 h-7 flex items-center justify-center rounded bg-slate-800/80 hover:bg-orange-600 hover:text-white transition-all outline-none" title="Download as .md"><Download className="w-4 h-4" /></button>
                                {expandedDocs.devdocs ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>}
                              </div>
                            </div>
                            {expandedDocs.devdocs && (
                              <div className="mt-4">
                                {project?.devDocs ? (
                                  <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                      {project.devDocs.techStack && <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/50 text-[11px] text-slate-500 leading-relaxed"><span className="block font-bold text-orange-400 mb-2 uppercase tracking-tighter">Technology Stack</span>{project.devDocs.techStack}</div>}
                                      {project.devDocs.projectStructure && <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/50 text-[11px] text-slate-500 leading-relaxed max-h-48 overflow-y-auto"><span className="block font-bold text-orange-400 mb-2 uppercase tracking-tighter">Project Structure</span><pre className="text-[10px] font-mono leading-tight">{project.devDocs.projectStructure}</pre></div>}
                                    </div>
                                    {project.devDocs.setupInstructions && <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/50 text-[11px] text-slate-400 font-mono whitespace-pre-wrap leading-relaxed"><span className="block font-bold text-orange-400 mb-2 uppercase tracking-tighter font-sans">Setup Instructions</span>{project.devDocs.setupInstructions}</div>}
                                    {project.devDocs.deploymentOverview && <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/50 text-[11px] text-slate-400 leading-relaxed"><span className="block font-bold text-slate-400 mb-2 uppercase tracking-tighter">Deployment & Environment</span>{project.devDocs.environmentVariables && <><strong>Environment Variables:</strong> {project.devDocs.environmentVariables}<br /><br /></>}<strong>Deployment Overview:</strong> {project.devDocs.deploymentOverview}</div>}
                                  </div>
                                ) : <p className="text-xs text-slate-600 italic">Development documentation generation in progress...</p>}
                              </div>
                            )}
                          </section>

                          {/* VERIFICATION REPORT */}
                          <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
                            <div onClick={() => setExpandedDocs((prev) => ({ ...prev, test: !prev.test }))} className="w-full flex items-center justify-between mb-6 group cursor-pointer outline-none">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-500 flex items-center justify-center">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                </div>
                                <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest group-hover:text-white transition-colors">Verification Report</h3>
                              </div>
                              <div className="flex items-center gap-4 text-slate-500 group-hover:text-slate-300 transition-colors">
                                <button onClick={(e) => downloadSectionAsMd(e, "test")} className="w-7 h-7 flex items-center justify-center rounded bg-slate-800/80 hover:bg-indigo-600 hover:text-white transition-all outline-none" title="Download as .md"><Download className="w-4 h-4" /></button>
                                {expandedDocs.test ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>}
                              </div>
                            </div>
                            {expandedDocs.test && (
                              <div className="mt-4">
                                {project?.tests ? (
                                  <div className="space-y-6">
                                    {(() => {
                                      const t = project.tests as any;
                                      return (<>
                                        {t.testPlan && <div className="p-4 bg-emerald-950/20 rounded-xl border border-emerald-900/30"><div className="text-[10px] font-bold text-emerald-500 uppercase mb-2">Test Plan Overview</div><div className="text-xs text-slate-400 space-y-2">{t.testPlan.testingScope && <div><strong className="text-slate-300">Scope:</strong> {t.testPlan.testingScope}</div>}{t.testPlan.testingStrategy && <div><strong className="text-slate-300">Strategy:</strong> {t.testPlan.testingStrategy}</div>}{t.testPlan.toolsAndEnvironment && <div><strong className="text-slate-300">Tools:</strong> {t.testPlan.toolsAndEnvironment}</div>}{t.testPlan.entryExitCriteria && <div><strong className="text-slate-300">Entry/Exit:</strong> {t.testPlan.entryExitCriteria}</div>}</div></div>}
                                        {t.executiveSummary && !t.testPlan && <div className="p-4 bg-emerald-950/20 rounded-xl border border-emerald-900/30"><div className="text-[10px] font-bold text-emerald-500 uppercase mb-1">Executive Summary</div><div className="text-sm font-medium text-emerald-300">{t.executiveSummary}</div></div>}
                                        {t.testExecutionReport && <div className="flex gap-4"><div className="flex-1 bg-slate-800/50 p-3 rounded-xl border border-slate-800/50"><div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Test Summary</div><div className="text-xs font-medium text-slate-300">{t.testExecutionReport.summary}</div></div><div className="flex-1 bg-slate-800/50 p-3 rounded-xl border border-slate-800/50"><div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Metrics & Defects</div><div className="text-xs font-medium text-slate-300">{t.testExecutionReport.passFailMetrics}{t.testExecutionReport.defectSummary && <><br /><br />{t.testExecutionReport.defectSummary}</>}</div></div></div>}
                                        {t.testDesign && <div><h4 className="text-[11px] font-bold text-slate-500 uppercase mb-2">Coverage & Scenarios</h4><div className="text-[11px] text-slate-400 p-3 bg-slate-950 rounded-xl border border-slate-800/50 whitespace-pre-wrap"><strong>Coverage:</strong> {t.testDesign.testCoverage}<br /><br /><strong>Scenarios:</strong><br /><ul className="list-disc pl-4 space-y-1 mt-1">{(t.testDesign.testScenarios || []).map((s: string, k: number) => <li key={k}>{s}</li>)}</ul></div></div>}
                                        {t.codeAudit && !t.testDesign && <div><h4 className="text-[11px] font-bold text-slate-500 uppercase mb-2">Code Quality Audit</h4><div className="text-[11px] text-slate-400 p-3 bg-slate-950 rounded-xl border border-slate-800/50 whitespace-pre-wrap">{t.codeAudit}</div></div>}
                                        <div><h4 className="text-[11px] font-bold text-slate-500 uppercase mb-3">Detailed Test Cases</h4>
                                          <ul className="space-y-4">{(Array.isArray(t.testCases) ? t.testCases : []).map((tc: any, i: number) => (
                                            <li key={i} className="flex items-start gap-4 text-[13px] text-slate-400 bg-slate-800/20 p-4 rounded-2xl border border-slate-800/50">
                                              <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0 ${tc.status === "passed" ? "bg-emerald-500/20 text-emerald-500" : tc.status === "failed" ? "bg-rose-500/20 text-rose-500" : "bg-amber-500/20 text-amber-500"}`}>
                                                {tc.status === "passed" ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                              </div>
                                              <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                  <span className="font-mono font-bold text-slate-500 text-[10px]">ID: {tc.id || i + 1}</span>
                                                  {tc.severity && <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${tc.severity === 'Critical' ? 'bg-rose-500 text-white' : tc.severity === 'Major' ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-400'}`}>{tc.severity}</span>}
                                                  <span className={`ml-auto text-[10px] font-bold uppercase ${tc.status === 'passed' ? 'text-emerald-500' : tc.status === 'failed' ? 'text-rose-500' : 'text-amber-500'}`}>{tc.status}</span>
                                                </div>
                                                <p className="font-black text-slate-200 leading-relaxed mb-2">{tc.description}</p>
                                                {tc.steps && tc.steps.length > 0 && <div className="text-[11px] text-slate-400 mb-2"><strong>Steps:</strong><ol className="list-decimal pl-4 space-y-0.5 mt-1">{tc.steps.map((st: string, idx: number) => <li key={idx}>{st}</li>)}</ol></div>}
                                                {(tc.expectedResult || tc.actualResult) && <div className="grid grid-cols-2 gap-2 mt-3"><div className="p-2 bg-slate-950/50 rounded flex flex-col gap-1 border border-slate-800/50"><span className="text-[9px] uppercase font-bold text-slate-500">Expected</span><span className="text-[11px] text-slate-300">{tc.expectedResult}</span></div><div className="p-2 bg-slate-950/50 rounded flex flex-col gap-1 border border-slate-800/50"><span className="text-[9px] uppercase font-bold text-slate-500">Actual</span><span className="text-[11px] text-slate-300">{tc.actualResult}</span></div></div>}
                                                {tc.notes && !tc.expectedResult && <div className="p-3 bg-slate-950/50 rounded-xl text-[11px] text-slate-500 border border-slate-800/50"><strong>Note:</strong> {tc.notes}</div>}
                                              </div>
                                            </li>
                                          ))}</ul>
                                        </div>
                                      </>);
                                    })()}
                                  </div>
                                ) : <p className="text-xs text-slate-600 italic">QA cycle pending...</p>}
                              </div>
                            )}
                          </section>
                        </div>

                        <div className="space-y-8">
                          <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 h-fit">
                            <div onClick={() => setExpandedDocs((prev) => ({ ...prev, arch: !prev.arch }))} className="w-full flex items-center justify-between mb-6 group cursor-pointer outline-none">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-fuchsia-600/20 text-fuchsia-500 flex items-center justify-center">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                                </div>
                                <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest group-hover:text-white transition-colors">Architectural Design</h3>
                              </div>
                              <div className="flex items-center gap-4 text-slate-500 group-hover:text-slate-300 transition-colors">
                                <button onClick={(e) => downloadSectionAsMd(e, "arch")} className="w-7 h-7 flex items-center justify-center rounded bg-slate-800/80 hover:bg-indigo-600 hover:text-white transition-all outline-none" title="Download as .md"><Download className="w-4 h-4" /></button>
                                {expandedDocs.arch ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>}
                              </div>
                            </div>
                            {expandedDocs.arch && (
                              <div className="mt-4">
                                {project?.design ? (
                                  <div className="space-y-4">
                                    {(() => {
                                      const d = project.design as any;
                                      const sysArch = d.hld?.systemArchitectureOverview;
                                      const archDiag = d.hld?.architectureDiagram || d.architectureDiagram;
                                      const compDiag = d.hld?.componentDiagram || d.componentDiagram;
                                      const erDiag = d.databaseDesign?.erDiagram || d.erDiagram;
                                      const seqDiag = d.lld?.sequenceFlows || d.sequenceDiagram;
                                      const lldDiag = d.lld?.classDiagram || d.lldDiagram;
                                      return (<>
                                        {sysArch && <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/50 text-[11px] text-slate-400 leading-relaxed font-mono whitespace-pre-wrap"><span className="block font-bold text-slate-300 mb-2 uppercase tracking-tight font-sans">System Architecture Overview</span>{sysArch}</div>}
                                        {archDiag && <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/50"><span className="block font-bold text-slate-300 mb-2 uppercase tracking-tight font-sans text-[11px]">Architecture Diagram</span><MermaidDiagram chart={archDiag} title="System Architecture" /></div>}
                                        {compDiag && <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/50"><span className="block font-bold text-cyan-400 mb-3 uppercase tracking-tighter text-[11px]">HLD — Component Hierarchy</span><MermaidDiagram chart={compDiag} title="Component Hierarchy" /></div>}
                                        {erDiag && <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/50"><span className="block font-bold text-emerald-400 mb-3 uppercase tracking-tighter text-[11px]">ER Diagram — Data Entities</span><MermaidDiagram chart={erDiag} title="ER Diagram" /></div>}
                                        {seqDiag && <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/50"><span className="block font-bold text-amber-400 mb-3 uppercase tracking-tighter text-[11px]">Sequence Diagram — User Flow</span><MermaidDiagram chart={seqDiag} title="Sequence Diagram" /></div>}
                                        {lldDiag && <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/50"><span className="block font-bold text-rose-400 mb-3 uppercase tracking-tighter text-[11px]">LLD — Low Level Details</span><MermaidDiagram chart={lldDiag} title="Low Level Design" /></div>}
                                        {d.architecture && <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/50 font-mono text-[10px] text-slate-500 leading-relaxed whitespace-pre-wrap italic">{d.architecture}</div>}
                                      </>);
                                    })()}
                                  </div>
                                ) : <p className="text-xs text-slate-600 italic">Architect is mapping system entities...</p>}
                              </div>
                            )}
                          </section>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: User Stories Library */}
        {project?.requirements?.userStories && project.requirements.userStories.length > 0 && (
          <UserStoriesLibrary stories={project.requirements.userStories} />
        )}
      </main>

      {/* Status Bar */}
      <footer className="h-8 border-t border-slate-800 bg-[#0f172a] px-8 flex items-center justify-between text-[10px] text-slate-600 font-medium">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div
              className={`w-1.5 h-1.5 rounded-full ${hasApiKey ? "bg-emerald-500" : "bg-red-500"}`}
            ></div>
            <span>GATEWAY: {hasApiKey ? "ACTIVE" : "OFFLINE"}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              ></path>
            </svg>
            <span>MODEL: GEMINI-3-FLASH</span>
          </div>
        </div>
        <div className="flex items-center gap-6 uppercase tracking-widest">
          <span>
            {project
              ? `PROJECT_IDENTIFIER: ${project.id}`
              : "ORCHESTRATOR_IDLE"}
          </span>
          <span className="text-slate-700">VERSION_2.5.0-STABLE</span>
        </div>
      </footer>

      <ChatSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        projectId={project?.id || "INIT"}
        messages={messages}
        onSendMessage={handleSendMessage}
        isProcessing={project?.isProcessing || false}
      />

      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectProject={(item) => {
          setProject(item.project);
          setActiveTab("output");
          setDeliverableSubTab("preview");
        }}
      />

      <ToastNotification toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default App;
