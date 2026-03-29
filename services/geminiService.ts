
import { GoogleGenAI, Type } from "@google/genai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const DEFAULT_MODEL = 'gemini-3-flash-preview'; // Upgraded to latest available tier

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key is missing. Please check your environment variables.');
    }
    // Initialize the SDK directly
    this.ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }

  private async generate(contents: any, systemInstruction: string, schema?: any, modelOverride?: string, maxTokens?: number) {
    const modelName = modelOverride || DEFAULT_MODEL;

    try {
      console.log(`Forwarding request to AI Proxy for model: ${modelName}`);

      const response = await fetch('http://localhost:3001/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          contents: Array.isArray(contents) ? contents : [{ role: 'user', parts: [{ text: contents }] }],
          config: {
            systemInstruction,
            temperature: 0.1,
            maxOutputTokens: maxTokens || 16384,
            ...(schema ? { responseMimeType: "application/json", responseSchema: schema } : {})
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI Proxy Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.text;

    } catch (error: any) {
      console.error("Gemini Service Error:", error);
      throw error;
    }
  }

  private async generateWithRetry(contents: any, systemInstruction: string, schema?: any, modelOverride?: string, maxRetries = 3, maxTokens?: number) {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          const delay = Math.min(10000 * Math.pow(2, attempt - 1), 60000); // Start at 10s, up to 60s
          console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay / 1000}s delay...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        return await this.generate(contents, systemInstruction, schema, modelOverride, maxTokens);
      } catch (error: any) {
        lastError = error;
        if (error?.message?.includes('429') ||
          error?.message?.includes('RESOURCE_EXHAUSTED') ||
          error?.message?.includes('quota') ||
          error?.message?.includes('503') ||
          error?.message?.includes('overloaded') ||
          error?.message?.includes('UNAVAILABLE')) {
          console.warn(`API issue on attempt ${attempt}:`, error.message);
          if (attempt === maxRetries) {
            throw new Error('Gemini API is currently overloaded. Please try again in a few minutes.');
          }
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  async runRequirementAgent(prompt: string, attachments?: any[]) {
    const sys = `You are a Senior Lead Business Analyst and Product Architect at a world-class technology consulting firm.
    Your goal is to produce a highly detailed, professional, and comprehensive Product Requirements Document (PRD).

    ### Guidelines:
    1. **Comprehensive Depth**: Do not hold back on detail. Explore edge cases, user personas, and sophisticated business logic.
    2. **Professional Structure**: Organize information logically. Use clear, descriptive language suitable for executive stakeholders and lead engineers.
    3. **Actionable User Stories**: Provide detailed user stories with extensive acceptance criteria (functional, non-functional, and edge cases).
    4. **Holistic View**: Include data entities, technical constraints, and a clear executive vision.
    5. **High Value**: The documentation should feel like a high-priced consulting deliverable.

    Output strictly as JSON.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        projectTitle: { type: Type.STRING },
        executiveSummary: { type: Type.STRING, description: "Detailed executive vision and value proposition. Provide a thorough 2-3 paragraph summary." },
        userStories: {
          type: Type.ARRAY,
          description: "Comprehensive list of critical and supporting user stories.",
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              story: { type: Type.STRING },
              description: { type: Type.STRING, description: "Deep dive into the story's intent and context." },
              acceptanceCriteria: { type: Type.ARRAY, items: { type: Type.STRING, description: "Detailed functional and technical criteria." } },
              priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
            }
          }
        },
        scope: { type: Type.STRING, description: "Comprehensive In-Scope and Out-of-Scope definitions with detailed boundaries." },
        technicalConstraints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Detailed infrastructure, security, and performance constraints." },
        dataEntities: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Detailed list of core data objects and their primary attributes." }
      },
      required: ["projectTitle", "executiveSummary", "userStories", "scope", "technicalConstraints", "dataEntities"]
    };

    const parts: any[] = [{ text: `User request: ${prompt}` }];

    if (attachments && attachments.length > 0) {
      attachments.forEach(att => {
        if (att.content.startsWith('data:image')) {
          const base64Data = att.content.split(',')[1];
          parts.push({
            inline_data: {
              mime_type: att.type,
              data: base64Data
            }
          });
        } else {
          parts.push({ text: `Attachment - ${att.name}: ${att.content}` });
        }
      });
    }

    const contents = [{ role: 'user', parts }];
    const res = await this.generateWithRetry(contents, sys, schema, DEFAULT_MODEL, 5, 12288);
    return this.cleanAndParseJson(res || '{}');
  }

  async runDesignAgent(requirements: any, theme?: string, feedback?: string) {
    const sys = `You are a Principal Software Architect and Lead UI/UX Strategist.
    Your task is to translate complex requirements into a sophisticated, detailed technical design blueprint.
    
    ### Requirements:
    1. **Architectural Blueprints**: Provide a highly detailed Mermaid.js diagram illustrating the full system architecture, state management flow, and component communication.
    2. **UX Strategy & Wireframes**: Extensive textual descriptions of the UI/UX journey, layout hierarchy, and micro-interaction specifications.
    3. **API Ecosystem**: Formulate robust API contracts (methods, paths, request/response structures, error handling strategy).
    4. **Modular Architecture**: Detailed map of React components, their hierarchical relationships, shared state patterns, and prop-drilling prevention strategies.
    5. **Premium Design Language**: Apply the '${theme || 'Modern Obsidian'}' theme with extreme precision. 
       - Define a sophisticated design tokens library (colors, spacing, shadows, typography).
       - **CRITICAL**: The design MUST be elite. Specify vibrant, harmonious color palettes, sophisticated typography (Inter/Outfit), sleek dark modes, glassmorphism effects, dynamic micro-animations, and fluid transitions. 
       - The documentation must describe a "State-of-the-art" visual experience.

    Output strictly as JSON.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        architectureDiagram: { type: Type.STRING, description: "Comprehensive Mermaid.js graph definition" },
        componentStructure: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Detailed component hierarchy and responsibility map" },
        wireframes: { type: Type.STRING, description: "Extensive UX layout descriptions and interaction specs" },
        apiEndpoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Formal API specifications including methods and data shapes" },
        designSystem: { type: Type.STRING, description: "Comprehensive design tokens, color palette, and visual principles" }
      },
      required: ["architectureDiagram", "componentStructure", "wireframes", "apiEndpoints", "designSystem"]
    };

    const prompt = `Requirements Artifact: ${JSON.stringify(requirements)}${feedback ? `\n\nUser Feedback for Refinement: ${feedback}` : ''}`;
    const res = await this.generateWithRetry(prompt, sys, schema, DEFAULT_MODEL, 5, 12288);
    return this.cleanAndParseJson(res || '{}');
  }

  async runDevelopmentAgent(design: any, requirements: any, prompt: string, theme?: string, feedback?: string, existingCode?: string | Record<string, string>) {
    const isModification = !!(feedback && existingCode);

    const sys = isModification
      ? `You are a 10x Full-Stack Engineer performing a TARGETED CODE MODIFICATION on a full-stack project.

    ### CRITICAL RULES FOR MODIFICATION:
    1. **Targeted Edits**: Only modify the files necessary to address the user's feedback.
    2. **Multi-File Output**: Return a JSON object where keys are file paths (e.g., "frontend/App.tsx", "backend/server.js") and values are the raw complete file contents. Include ALL files that were changed. Do NOT include files that were not changed.
    3. **Frontend Constraint**: Any changes to the React frontend MUST remain within the single monolithic 'frontend/App.tsx' file. Do not create new frontend files.
    4. **Design System**: Maintain the '${theme || 'Modern Obsidian'}' theme unless the feedback asks to change it.

    Output strictly as a valid JSON object. Do not wrap it in markdown block. Do not write anything else.`
      : `You are an elite 10x Full-Stack Engineer. Your task is to build a "Production-Ready", 100% complete application (Node.js backend + React frontend).

    ### CORE MANDATE:
    1. **Zero Placeholders**: Every feature, section, and component defined in the requirements and design MUST be fully implemented. "TODO" comments or empty sections are strictly forbidden.
    2. **High Architectural Fidelity**: Synthesize code that is 100% accurate to the provided User Stories, accepted PRD, and Architectural Blueprints.
    3. **Functional Completeness**: Implement real application logic (state management, event handlers, form validations, data transformations) so the site is "ready to ship".

    ### CRITICAL ARCHITECTURE RULES:
    4. **Full-Stack JSON Map**: Generate both backend and frontend. Output a JSON object mapping file paths to string contents.
    5. **Backend Structure**: Create a standard Node.js Express backend (e.g., "backend/server.js", "backend/routes/api.js", "backend/package.json").
    6. **CRITICAL FRONTEND RULE**: The ENTIRE React frontend application MUST be written into a single monolithic file at "frontend/App.tsx". 
       - Define all sub-components, hooks, and styles inside this file.
       - Use a sophisticated SPA (Single Page App) architecture with internal state-based navigation or routing to handle all pages/views defined in the design.
       - The 'export default function App()' must be at the very bottom.
    7. **Modern Tech Stack**: Use 'lucide-react' for icons, 'framer-motion' for elite animations, 'tailwind-merge' and 'clsx' for styling.

    ### PREMIUM UI/UX DIRECTIVES (MANDATORY):
    8. **Visual Excellence**: Create a design that is visually stunning, futuristic, and premium. Use sophisticated typography, glassmorphism, advanced gradients, and micro-interactions.
    9. **Interactive Fidelity**: Every button must have a hover state, every transition must be smooth, and every user action must provide feedback. The UI should feel "alive".
    10. **Aesthetic Depth**: Use advanced CSS (backdrop-blur, layered shadows, subtle textures) to create a high-end SaaS aesthetic.

    ### ABSOLUTE CONSTRAINTS:
    11. **NEVER use import.meta.env or process.env in frontend code**. Hardcode the API base URL: \`const API_BASE = 'http://localhost:3001';\`.
    
    ### STRICT OUTPUT FORMAT:
    - Output strictly as a valid JSON object mapping file paths to their full string contents.
    - Example keys: "frontend/App.tsx", "backend/server.js".
    - Do NOT wrap in markdown code blocks. ONLY output the JSON map.
    `;

    const existingCodeStr = existingCode
      ? (typeof existingCode === 'string' ? existingCode : Object.values(existingCode).join('\n\n'))
      : null;

    const actionPrompt = isModification
      ? `USER MODIFICATION REQUEST: "${feedback}"

EXISTING CODE TO MODIFY (return the complete modified version):
\`\`\`tsx
${existingCodeStr}
\`\`\`

CONTEXT:
- Original Requirements: ${JSON.stringify(requirements)}
- Original Vision: ${prompt}

INSTRUCTION: Apply ONLY the changes described in the modification request above. Return the full, complete modified file.`
      : `CONTEXT:
      - Requirements: ${JSON.stringify(requirements)}
      - detailed Design: ${JSON.stringify(design)}
      - User Vision: ${prompt}
      ${feedback ? `- User Feedback: ${feedback}` : ''}
      
      ACTION:
      Synthesize the absolute complete, high-performance Full-Stack code now. 
      Every section, component, and interaction defined in the requirements and design MUST be present.
      Ensure the generated website is the MOST ACCURATE representation of the original user vision (${prompt}).
      Render every component with full logic. Ready for instant production-grade deployment.`;

    const responseText = await this.generateWithRetry(
      actionPrompt,
      sys,
      undefined, // Removed strict schema constraint to prevent gemini empty object hallucination
      DEFAULT_MODEL,
      5,
      60000 // Increased limit for full-stack gen
    );

    if (isModification && existingCode && typeof existingCode !== 'string') {
      const parsedModifications = this.cleanAndParseJson(responseText || '{}');
      return { ...existingCode, ...parsedModifications };
    }

    return this.cleanAndParseJson(responseText || '{}');
  }

  async runTestingAgent(code: string | Record<string, string>, requirements: any, prompt: string, feedback?: string) {
    const sys = `You are a Senior Lead QA Automation Engineer and Security Auditor. 
    Your mission is to perform an exhaustive verification of the application against the requirements and enterprise-grade quality standards.
    
    ### Tasks:
    1. **Traceability Matrix**: Exhaustively verify each user story and acceptance criterion against the implementation.
    2. **Full-Spectrum Audit**: Analyze code for performance bottlenecks, accessibility (WCAG) compliance, security vulnerabilities, and design system adherence.
    3. **Master Test Suite**: Define comprehensive test scenarios (Unit, Integration, and E2E concepts) with detailed steps and expected outcomes.
    4. **Critical Risk Report**: Identify any architectural flaws, logic errors, or potential scaling issues.

    Output strictly as JSON.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        executiveSummary: { type: Type.STRING, description: "Detailed quality assessment and risk profile." },
        testCases: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              description: { type: Type.STRING },
              status: { type: Type.STRING, enum: ["passed", "failed", "pending"] },
              severity: { type: Type.STRING, enum: ["Critical", "Major", "Minor", "None"] },
              notes: { type: Type.STRING, description: "Detailed observation or failure context." }
            }
          }
        },
        codeAudit: { type: Type.STRING, description: "Deep dive review of code architecture, security, and maintainability." },
        identifiedIssues: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Detailed list of bugs or technical debt items." }
      },
      required: ["executiveSummary", "testCases", "codeAudit", "identifiedIssues"]
    };

    const codeContent = typeof code === 'string' ? code : JSON.stringify(code, null, 2);

    const res = await this.generateWithRetry(
      `Analyzed Code: ${codeContent.substring(0, 50000)}... (truncated if too long)
      Original Requirements: ${JSON.stringify(requirements)} 
      User Focus: ${prompt}
      ${feedback ? `User Feedback: ${feedback}` : ''}`,
      sys, schema, DEFAULT_MODEL, 3, 8192);
    return this.cleanAndParseJson(res || '{}');
  }

  // ============================================================
  // PARALLEL VALIDATION PACK (runs concurrently with main agents)
  // ============================================================

  /**
   * Track 2A: Validates requirements against best practices.
   * Fires concurrently while the main Design Agent runs.
   */
  async runParallelReqValidation(requirements: any) {
    const sys = `You are a Senior Business Analyst performing a rapid requirements audit.
    Review the provided PRD for: completeness, ambiguity, feasibility gaps, and missing non-functional requirements.
    Be concise. Respond strictly as JSON.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER, description: "Quality score 0-100" },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        gaps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Missing or ambiguous areas" },
        recommendation: { type: Type.STRING, description: "One sentence summary" }
      },
      required: ["score", "strengths", "gaps", "recommendation"]
    };

    const res = await this.generateWithRetry(
      `Requirements to validate: ${JSON.stringify(requirements)}`,
      sys, schema, DEFAULT_MODEL, 2, 4096
    );
    return this.cleanAndParseJson(res || '{}');
  }

  /**
   * Track 2B: Reviews design artifacts for architectural soundness.
   * Fires concurrently while the main Development Agent runs.
   */
  async runParallelDesignReview(design: any, requirements: any) {
    const sys = `You are a Principal Architect performing a rapid design peer review.
    Evaluate the design artifact against the requirements for: architectural soundness, API coverage, component cohesion, and technical risk.
    Be concise. Respond strictly as JSON.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER, description: "Quality score 0-100" },
        architectureRisks: { type: Type.ARRAY, items: { type: Type.STRING } },
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
        summary: { type: Type.STRING }
      },
      required: ["score", "architectureRisks", "recommendations", "summary"]
    };

    const res = await this.generateWithRetry(
      `Design: ${JSON.stringify(design)}\nRequirements: ${JSON.stringify(requirements)}`,
      sys, schema, DEFAULT_MODEL, 2, 4096
    );
    return this.cleanAndParseJson(res || '{}');
  }

  /**
   * Track 2C: Static code analysis for quality & security.
   * Fires concurrently while the main Testing Agent runs.
   */
  async runParallelCodeTesting(code: string | Record<string, string>, requirements: any) {
    const sys = `You are a senior code reviewer performing static analysis.
    Check for: code quality, security vulnerabilities, accessibility gaps, performance anti-patterns, and requirement coverage.
    Be concise. Respond strictly as JSON.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER, description: "Overall code quality score 0-100" },
        issuesFound: { type: Type.ARRAY, items: { type: Type.STRING } },
        securityFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
        a11yGaps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Accessibility issues" },
        summary: { type: Type.STRING }
      },
      required: ["score", "issuesFound", "securityFlags", "a11yGaps", "summary"]
    };

    const codeStr = typeof code === 'string' ? code : JSON.stringify(code, null, 2);
    const res = await this.generateWithRetry(
      `Code (truncated): ${codeStr.substring(0, 30000)}\nRequirements: ${JSON.stringify(requirements)}`,
      sys, schema, DEFAULT_MODEL, 2, 4096
    );
    return this.cleanAndParseJson(res || '{}');
  }

  private cleanAndParseJson(text: string): any {
    if (!text) return {};
    let cleanText = text.trim();

    // 1. Remove markdown code blocks if present (robustly)
    cleanText = cleanText.replace(/```[a-zA-Z]*\n/g, '').replace(/```/g, '').trim();

    // 2. Extract strictly JSON object bounds
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    } else if (firstBrace !== -1) {
      cleanText = cleanText.substring(firstBrace);
    }

    try {
      return this.unwrapFileMap(JSON.parse(cleanText));
    } catch (parseError: any) {
      console.warn("JSON Parse Failure. Attempting repair...");
      try {
        let repairText = cleanText;
        let inString = false;
        let escaped = false;
        for (let i = 0; i < repairText.length; i++) {
          const char = repairText[i];
          if (char === '"' && !escaped) inString = !inString;
          escaped = (char === '\\' && !escaped);
        }
        if (inString) repairText += '"';
        repairText = repairText.trim();
        if (repairText.endsWith(',')) repairText = repairText.slice(0, -1);
        const stack: string[] = [];
        let stringMode = false;
        let escapeMode = false;
        for (let i = 0; i < repairText.length; i++) {
          const char = repairText[i];
          if (char === '"' && !escapeMode) stringMode = !stringMode;
          if (char === '\\' && !escapeMode) escapeMode = true; else escapeMode = false;
          if (!stringMode) {
            if (char === '{') stack.push('}');
            else if (char === '[') stack.push(']');
            else if (char === '}' || char === ']') {
              if (stack.length > 0 && stack[stack.length - 1] === char) stack.pop();
            }
          }
        }
        while (stack.length > 0) repairText += stack.pop();
        return this.unwrapFileMap(JSON.parse(repairText));
      } catch (repairError) {
        if (!cleanText.startsWith('{') && (cleanText.includes('export') || cleanText.includes('import'))) {
          return { "frontend/App.tsx": cleanText };
        }
        throw new Error(`AI generated an invalid or truncated response that could not be repaired: ${parseError.message}`);
      }
    }
  }

  private unwrapFileMap(obj: any): any {
    if (!obj) return obj;

    // If AI returned an array of objects like [{ path: "/App.tsx", content: "..." }]
    if (Array.isArray(obj)) {
      const fileMap: Record<string, string> = {};
      for (const item of obj) {
        if (item && typeof item === 'object') {
          const path = item.path || item.file || item.filename || item.name;
          const content = item.content || item.code || item.body || item.text;
          if (path && content) {
            fileMap[path.startsWith('/') ? path : '/' + path] = content;
          }
        }
      }
      if (Object.keys(fileMap).length > 0) return fileMap;
      return obj;
    }

    if (typeof obj !== 'object') return obj;

    let unwrapped = obj;
    if (obj.files && typeof obj.files === 'object') unwrapped = obj.files;
    else if (obj.code && typeof obj.code === 'object') unwrapped = obj.code;

    for (const key in unwrapped) {
      if (typeof unwrapped[key] === 'object' && unwrapped[key] !== null) {
        if (typeof unwrapped[key].content === 'string') {
          unwrapped[key] = unwrapped[key].content;
        } else if (typeof unwrapped[key].code === 'string') {
          unwrapped[key] = unwrapped[key].code;
        }
      }
    }

    return unwrapped;
  }
}
