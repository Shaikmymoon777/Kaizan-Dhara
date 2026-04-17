import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { GeminiService } from "./services/geminiService";
import { LocalLLMService } from "./services/localLLMService";

import { AgentMessage, SDLCProject } from "./types";
import AgentCard from "./components/AgentCard";
import ChatSidebar from "./components/ChatSidebar";
import HistorySidebar from "./components/HistorySidebar";

import LivePreview from "./components/LivePreview";
import HomePage from "./components/HomePage";
import LoginScreen from "./components/LoginScreen";
import GithubDeployModal from "./components/GithubDeployModal";
import AnimatedLogo from "./components/AnimatedLogo";

import { storage } from "./utils/storage";
import ArtifactsDashboard from "./components/ArtifactsDashboard";

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
    test: true,
    arch: true,
  });
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [viewState, setViewState] = useState<ViewState>("landing");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [selectedTheme] = useState("Modern Obsidian"); // Keeping as default for agent logic
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isPreviewFullScreen, setIsPreviewFullScreen] = useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const agentService = useRef<LocalLLMService | GeminiService | null>(null);

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

  // PERSISTENCE: Restore state from localStorage
  useEffect(() => {
    const savedProject = localStorage.getItem("sdlc_active_project");
    const savedMessages = localStorage.getItem("sdlc_messages");
    
    if (savedProject) {
      try {
        setProject(JSON.parse(savedProject));
      } catch (e) {
        console.error("Failed to restore project", e);
      }
    }
    
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error("Failed to restore messages", e);
      }
    }

    const savedInput = localStorage.getItem("sdlc_input");
    if (savedInput) {
      setInput(savedInput);
    }

    const savedTabs = localStorage.getItem("sdlc_tabs");
    if (savedTabs) {
      try {
        const { active, sub } = JSON.parse(savedTabs);
        if (active) setActiveTab(active);
        if (sub) setDeliverableSubTab(sub);
      } catch (e) {}
    }
  }, []);

  // PERSISTENCE: Save tabs/input
  useEffect(() => {
    localStorage.setItem("sdlc_input", input);
  }, [input]);

  useEffect(() => {
    localStorage.setItem("sdlc_tabs", JSON.stringify({ active: activeTab, sub: deliverableSubTab }));
  }, [activeTab, deliverableSubTab]);

  // Clean up stuck isProcessing state on project restoration
  useEffect(() => {
    if (project?.isProcessing) {
      setProject(p => p ? { ...p, isProcessing: false } : null);
      addMessage("Orchestrator", "Session restored. A previous automated process was interrupted. You can resume by clicking the pending action.");
    }
    
    // If input is empty but we have a project, restore prompt to input for convenience
    if (!input && project?.prompt) {
      setInput(project.prompt);
    }
  }, [project?.id]); // Run when project ID changes (e.g. on restoration)

  // PERSISTENCE: Save state to localStorage with Quota Safety
  useEffect(() => {
    if (project) {
      try {
        localStorage.setItem("sdlc_active_project", JSON.stringify(project));
      } catch (e) {
        console.warn("Project Too Large for LocalStorage - Persistence Disabled for this session", e);
        // We don't want to crash the whole app if storage fails.
      }
    } else {
      localStorage.removeItem("sdlc_active_project");
    }
  }, [project]);

  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem("sdlc_messages", JSON.stringify(messages));
      } catch (e) {
        console.warn("Messages Too Large for LocalStorage", e);
      }
    } else {
      localStorage.removeItem("sdlc_messages");
    }
  }, [messages]);

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

        body += `<h3>Strategic Scope Boundaries</h3><p>${project.requirements.scope || ""}</p>`;
        
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
  ) => {
    if (!agentService.current) return;

    // Set processing state.
    setProject((p) =>
      p ? { ...p, isProcessing: true, waitingForApproval: false } : null,
    );

    try {
      if (isRemodify) {
        if (!project) return;
        addMessage(
          "Requirement",
          `Refining requirements with feedback: "${customPrompt}"...`,
          "thinking",
        );
      } else {
        addMessage(
          "Requirement",
          "Business Analyst Agent is analyzing scope and defining user stories...",
          "thinking",
        );
      }

      const reqs = await agentService.current.runRequirementAgent(
        customPrompt,
        attachments,
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
    } catch (error) {
      handleError(error);
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
        agentService.current.runDesignAgent(reqSnapshot, selectedTheme, feedback),
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
    } catch (error) {
      handleError(error);
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

      const existingCode = isRemodify ? project.code || undefined : undefined;
      const [design, requirements] = [project.design, project.requirements];

      // Fire main agent + parallel design reviewer concurrently
      const [code, designReview] = await Promise.all([
        agentService.current.runDevelopmentAgent(
          design, requirements, project.prompt, selectedTheme, feedback, existingCode,
        ),
        agentService.current.runParallelDesignReview(design, requirements).catch(() => null),
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
    } catch (error) {
      handleError(error);
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
        agentService.current.runTestingAgent(code, requirements, project.prompt, feedback),
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
    } catch (error) {
      handleError(error);
    }
  };

  const handleError = (error: any) => {
    console.error("SDLC Error:", error);
    const errorMessage = error?.message || "Unknown error";
    addMessage("Orchestrator", `Error: ${errorMessage}`, "error");
    setProject((p) => (p ? { ...p, isProcessing: false } : null));
  };

  // Main Flow Controls
  const handleStart = async () => {
    if (!input.trim() || project?.isProcessing) return;

    const newProject: SDLCProject = {
      id: Date.now().toString(),
      prompt: input,
      name: "Agent Project v1",
      currentStep: 0,
      isProcessing: true,
      waitingForApproval: false,
    };
    setProject(newProject);
    setMessages([]);
    setActiveTab("flow");
    setDeliverableSubTab("preview");

    if (!agentService.current) {
      addMessage("Orchestrator", "Agent service not initialized.", "error");
      return;
    }

    addMessage(
      "Orchestrator",
      `Initializing automated SDLC for: "${input}"`,
      "thinking",
    );
    await new Promise((r) => setTimeout(r, 800));

    // Start with Requirements directly
    await runRequirementPhase(input);
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
        <div className="w-[400px] border-r border-slate-800 flex flex-col bg-[#0f172a]/80 backdrop-blur-sm">
          <div className="p-8 flex flex-col gap-8">
            <section>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-4">
                Command Center
              </label>
              <div className="relative group">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!project?.isProcessing && input.trim()) handleStart();
                    }
                  }}
                  placeholder="Describe your vision (e.g., 'A professional landing page for a coffee subscription service...')"
                  className="w-full h-40 bg-slate-900/50 border border-slate-700/50 rounded-2xl p-5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none transition-all group-hover:border-slate-600 text-white placeholder-slate-600 leading-relaxed shadow-inner"
                />
                <button
                  onClick={handleStart}
                  disabled={project?.isProcessing || !input.trim()}
                  className="absolute bottom-4 right-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-xl transition-all shadow-xl shadow-indigo-600/20 font-bold text-xs flex items-center gap-2 group"
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

              {/* Theme Selector Removed */}
              {/* Attachments Display */}
              {attachments.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {attachments.map((att, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-2 py-1 text-[10px] text-indigo-400 font-bold"
                    >
                      <span className="truncate max-w-[100px]">{att.name}</span>
                      <button
                        onClick={() =>
                          setAttachments((prev) =>
                            prev.filter((_, idx) => idx !== i),
                          )
                        }
                        className="hover:text-white-500"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                Agent Pipeline
              </label>

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
                description="Synthesizes raw prompts into structured BA documentation."
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
                      className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                        msg.role === "Orchestrator"
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
                              className={`w-full text-left px-4 py-1.5 text-xs font-mono transition-colors ${
                                selectedFile === "generated_app.tsx"
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
                                  className={`w-full text-left px-4 py-1.5 text-xs font-mono transition-colors truncate ${
                                    selectedFile === filename
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

                  {deliverableSubTab === "docs" && project && (
                    <div className="flex-1 flex min-h-0">
                      <ArtifactsDashboard project={project} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
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

      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept="image/*,text/plain,application/json"
      />
      <GithubDeployModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
        projectId={project?.id || ""}
      />
    </div>
  );
};

export default App;
