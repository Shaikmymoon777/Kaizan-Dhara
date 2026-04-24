import { GoogleGenAI, Type } from "@google/genai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const DEFAULT_MODEL = 'gemini-3.1-pro-preview'; // Updated to match API key available models

// -----------------------------------------------------------------------------
// Grounding & Relevance Constants
// -----------------------------------------------------------------------------
const HARD_GROUNDING_RULES = `
### 🔒 HARD GROUNDING & RELEVANCE RULES (NON-NEGOTIABLE)
1. ONLY use provided User Prompt, BRD data, and Attachments.
2. STRICTLY FORBIDDEN: website suggestions, external URLs, generic external tools, or irrelevant platforms.
3. If specific data is missing from input → return "Not specified in input". DO NOT HALLUCINATE.
4. RELEVANCE CHECK: Every component/feature MUST directly support the user's core intent.
5. NO GENERIC TEMPLATES: If the prompt is "Coffee Shop", do not include "Dating App" features.
6. DOCUMENT PRIORITY: Attachments/BRD are the PRIMARY SOURCE. User prompt is supplementary context.
`;

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
            systemInstruction: systemInstruction + '\n' + HARD_GROUNDING_RULES,
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

  async runRequirementAgent(prompt: string, attachments?: any[], brdData?: any, figmaData?: any) {
    const sys = `You are a Senior Lead Business Analyst and Product Architect at a world-class technology consulting firm.
    Your goal is to produce a highly detailed, professional, and comprehensive Business Requirements Document (BRD).

    ### MANDATORY BRD SECTIONS (you MUST populate ALL of these):
    1. **Project Overview**: A clear, concise 2-3 paragraph summary of what the project is, its purpose, and the value it delivers.
    2. **Business Objectives**: Detailed strategic and tactical objectives the project aims to achieve.
    3. **Scope**: Define clear boundaries with separate In-Scope items and Out-of-Scope items as arrays.
    4. **Stakeholders**: List all key stakeholders (e.g., End Users, Admins, Product Owners, Developers, QA Team).
    5. **Functional Requirements**: Numbered list of every functional capability the system must provide. Be exhaustive — at least 10-15 items.
    6. **Non-Functional Requirements**: Performance, security, scalability, accessibility, reliability requirements.
    7. **User Stories**: At least 8-10 detailed user stories with acceptance criteria and priority levels.
    8. **Assumptions & Constraints**: Technical, business, and resource assumptions and constraints.

    ### CRITICAL RULES:
    - Keep the BRD business-oriented — NO implementation details, NO code references.
    - Every section must be substantive and professional-grade.
    - You MUST generate an array of at least 8-10 detailed user stories under the \`userStories\` key. Do NOT leave it empty.
    - The document should feel like a high-priced consulting deliverable.

    Output strictly as JSON.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        projectOverview: { type: Type.STRING, description: "2-3 paragraph executive summary of the project, its purpose, and value proposition." },
        businessObjectives: { type: Type.STRING, description: "Detailed strategic and tactical business objectives." },
        scope: {
          type: Type.OBJECT,
          properties: {
            inScope: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Features and capabilities explicitly included." },
            outOfScope: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Features and capabilities explicitly excluded." }
          },
          required: ["inScope", "outOfScope"]
        },
        stakeholders: { type: Type.ARRAY, items: { type: Type.STRING }, description: "All key stakeholders and their roles." },
        functionalRequirements: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Numbered functional capabilities. At least 10-15 items." },
        nonFunctionalRequirements: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Performance, security, scalability, accessibility requirements." },
        userStories: {
          type: Type.ARRAY,
          description: "At least 8-10 detailed user stories.",
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              story: { type: Type.STRING },
              description: { type: Type.STRING, description: "Deep dive into the story's intent and context." },
              acceptanceCriteria: { type: Type.ARRAY, items: { type: Type.STRING } },
              priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
            },
            required: ["id", "story", "acceptanceCriteria", "priority"]
          }
        },
        assumptionsAndConstraints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Technical, business, and resource assumptions and constraints." }
      },
      required: ["projectOverview", "businessObjectives", "scope", "stakeholders", "functionalRequirements", "nonFunctionalRequirements", "userStories", "assumptionsAndConstraints"]
    };

    const parts: any[] = [{ text: `
=== USER INPUT (STRICT SOURCE) ===
${prompt || "Not specified in input"}
=== END INPUT ===
` }];

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
          parts.push({ text: `
=== PRIMARY DOCUMENT (SOURCE OF TRUTH) - ${att.name} ===
${att.content}
=== END DOCUMENT ===
` });
        }
      });
    }

    const contents = [{ role: 'user', parts }];
    const res = await this.generateWithRetry(contents, sys, schema, DEFAULT_MODEL, 5, 12288);
    return this.cleanAndParseJson(res || '{}');
  }

  async runDesignAgent(requirements: any, theme?: string, feedback?: string, figmaData?: any) {
    const focusedReqs = this.buildFocusedContext(requirements);
    const sys = `You are a Principal Software Architect and Lead UI/UX Strategist.
    Translate requirements into a sophisticated, detailed technical design blueprint.
    
    ### CRITICAL FORMATTING RULES:
    1. **Mermaid Diagrams**: Provide ONLY the raw Mermaid code (e.g., "graph TD...") without markdown code blocks (no \`\`\`mermaid) inside the JSON strings.
    2. **Completeness**: Ensure every mandatory field is populated with professional, high-quality content.
    3. **Schema Compliance**: You MUST strictly adhere to the provided JSON schema.
    
    ### HLD (High-Level Design) — MANDATORY:
    1. **System Architecture Overview**: Detailed textual description of the system architecture.
    2. **Architecture Diagram**: Mermaid.js graph representing the high-level system components.
    3. **Component Diagram**: Mermaid.js diagram showing component hierarchy.
    4. **Data Flow Description**: Textual description of how data moves through the system.
    5. **External Integrations**: List of third-party services or APIs.
    6. **Technology Stack Overview**: Detailed breakdown of the recommended tech stack.
    
    ### LLD (Low-Level Design) — MANDATORY:
    1. **Detailed Component Design**: Specific implementation details for core components.
    2. **API Endpoints**: Provide at least 8-10 API endpoint contracts with method, endpoint, request schema, and response schema.
    3. **Data Models**: Detailed data model schemas and type definitions.
    4. **UI Component Structure**: Tree structure or list of UI components and their responsibilities.
    5. **Sequence Flows**: Mermaid.js sequenceDiagram showing key user interactions.
    6. **Class Diagram**: Mermaid.js classDiagram for core logic.
    
    ### Database Design — MANDATORY:
    1. **ER Diagram**: Mermaid.js erDiagram showing entities and relationships.
    2. **Tables**: Structured table definitions with names, fields (type, constraints), and relationships.
    
    ### CRITICAL MERMAID SYNTAX RULES (MUST FOLLOW):
    - NEVER use parentheses in subgraph names → "subgraph Frontend" NOT "subgraph Frontend (React)"
    - NEVER use slashes in node labels → "PostgreSQL or MongoDB" NOT "PostgreSQL/MongoDB"
    - NEVER redefine a node ID with a different label
    - Do NOT wrap diagrams in markdown code fences — output ONLY raw Mermaid syntax
    - All Mermaid diagrams MUST be valid and renderable

    Output strictly as JSON.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        hld: {
          type: Type.OBJECT,
          properties: {
            systemArchitectureOverview: { type: Type.STRING, description: "Detailed textual overview of the entire system architecture." },
            architectureDiagram: { type: Type.STRING, description: "Mermaid.js graph TD diagram of system architecture." },
            componentDiagram: { type: Type.STRING, description: "Mermaid.js graph TD showing component hierarchy." },
            dataFlowDescription: { type: Type.STRING, description: "Textual description of data flow through the system." },
            externalIntegrations: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Third-party services and integrations." },
            technologyStackOverview: { type: Type.STRING, description: "Full tech stack: frontend, backend, database, DevOps." }
          },
          required: ["systemArchitectureOverview", "architectureDiagram", "componentDiagram", "dataFlowDescription", "externalIntegrations", "technologyStackOverview"]
        },
        lld: {
          type: Type.OBJECT,
          properties: {
            detailedComponentDesign: { type: Type.STRING, description: "Exhaustive design of each module and service." },
            apiEndpoints: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  method: { type: Type.STRING },
                  endpoint: { type: Type.STRING },
                  request: { type: Type.STRING },
                  response: { type: Type.STRING }
                }
              },
              description: "At least 8-10 API contracts with method, path, request, response."
            },
            dataModels: { type: Type.STRING, description: "Detailed data model schemas with field names and types." },
            uiComponentStructure: { type: Type.STRING, description: "Frontend component hierarchy and structure." },
            sequenceFlows: { type: Type.STRING, description: "Mermaid.js sequenceDiagram of primary user flow." },
            classDiagram: { type: Type.STRING, description: "Mermaid.js classDiagram showing all classes, services, methods, and relationships." }
          },
          required: ["detailedComponentDesign", "apiEndpoints", "dataModels", "uiComponentStructure", "sequenceFlows", "classDiagram"]
        },
        databaseDesign: {
          type: Type.OBJECT,
          properties: {
            erDiagram: { type: Type.STRING, description: "Mermaid.js erDiagram showing entities, attributes, and relationships." },
            tables: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  fields: { type: Type.STRING, description: "Field names, data types, primary/foreign keys." },
                  relationships: { type: Type.STRING, description: "Relationships to other tables." }
                }
              },
              description: "Structured table definitions."
            }
          },
          required: ["erDiagram", "tables"]
        }
      },
      required: ["hld", "lld", "databaseDesign"]
    };

    const prompt = `
=== PRIMARY DOCUMENT (SOURCE OF TRUTH) ===
${JSON.stringify(focusedReqs)}
=== END DOCUMENT ===

${feedback ? `\n=== USER INPUT (STRICT SOURCE) ===\nRefinement: ${feedback}\n=== END INPUT ===` : ''}`;
    
    const res = await this.generateWithRetry(prompt, sys, schema, DEFAULT_MODEL, 5, 20480);
    return this.cleanAndParseJson(res || '{}');
  }

  async runDevelopmentAgent(design: any, requirements: any, prompt: string, theme?: string, feedback?: string, existingCode?: string | Record<string, string>, figmaData?: any) {
    const isModification = !!(feedback && existingCode);
    const focusedReqs = this.buildFocusedContext(requirements);

    const sys = isModification
      ? `You are a 10x Full-Stack Engineer performing a TARGETED CODE MODIFICATION on a full-stack project.

    ### CRITICAL RULES FOR MODIFICATION:
    1. **Targeted Edits**: Only modify the files necessary to address the user's feedback.
    2. **Multi-File Output**: Return a JSON object where keys are file paths and values are the raw complete file contents. Include ALL files that were changed. Do NOT include files that were not changed.
    3. **Frontend Constraint**: Any changes to the React frontend MUST remain within the single monolithic 'frontend/App.tsx' file. Do not create new frontend files.
    4. **Design System**: Maintain the '${theme || 'Modern Obsidian'}' theme unless the feedback asks to change it.

    Output strictly as a valid JSON object. Do not wrap it in markdown block. Do not write anything else.`
      : `You are an elite 10x Full-Stack Engineer. Your task is to build a "Production-Ready", 100% complete application (Node.js backend + React frontend).

    ### CORE MANDATE (NO LAZINESS ALLOWED):
    1. **Zero Placeholders & No Stubs**: Every single feature, section, and component defined in the requirements and design MUST be fully implemented. "TODO" comments, "..." or empty sections are STRICTLY FORBIDDEN. You must write out the FULL, exhaustive code.
    2. **Comprehensive Scope**: You MUST build a massive, multi-section, highly detailed website. Do NOT just output a shallow header, footer, and a simple dummy middle area. Immersive Hero sections, Feature grids, interactive dashboards, detailed data flows, forms, modals. Build them ALL. If you generate less than 800 lines of functional frontend code for a complex app, you have failed!
    3. **High Architectural Fidelity**: Synthesize code that is 100% accurate to the provided User Stories, accepted PRD, and Architectural Blueprints.
    4. **Functional Completeness**: Implement real application logic (state management with Zustand, event handlers, form validations) so the site actually works and feels "ready to ship".
    5. **Defensive Programming (CRITICAL)**: You MUST aggressively use optional chaining (\`?.map()\`) and fallback values (\`|| []\`) when mapping over arrays or accessing nested object properties. Data may be undefined on initial render. Never assume an array exists before mapping over it.

    ### CRITICAL ARCHITECTURE RULES:
    4. **Full-Stack JSON Map**: Generate both backend and frontend. Output a JSON object mapping file paths to string contents.
    5. **Backend Structure**: Create a standard Node.js Express backend.
    6. **CRITICAL FRONTEND RULE**: The ENTIRE React frontend application MUST be written into a single monolithic file at "frontend/App.tsx". 
       - Define all sub-components, hooks, and styles inside this file.
       - Use a sophisticated SPA (Single Page App) architecture with internal state-based navigation or routing.
       - The 'export default function App()' must be at the very bottom.
    7. **Modern Tech Stack**: Use 'lucide-react' for icons, 'framer-motion' for elite animations, 'tailwind-merge' and 'clsx' for styling.

    ### PREMIUM UI/UX DIRECTIVES (MANDATORY):
    8. **Awwwards-Level Visual Excellence**: The design MUST be visually stunning, highly modern, and absolutely premium. Avoid boring, basic, flat centered layouts. Use complex CSS grids, sophisticated typography scales, rich micro-interactions.
    9. **Rich Media & Imagery**: NEVER use solid colored placeholder boxes. You MUST integrate gorgeous placeholder images utilizing \`https://images.unsplash.com/photo-[ID]?auto=format&fit=crop&q=80\`.
    10. **Aesthetic Depth**: Heavily use advanced CSS properties (dense backdrop-blurs, glassmorphism layers, glowing decorative background orbs, deep layered shadows).
    11. **Motion & Interaction**: Implement complex \`framer-motion\` animations (staggered list reveals, scroll-linked fade-ups, layout transitions).

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
      ? `
GOAL: Perform a targeted code modification.

=== USER INPUT (STRICT SOURCE) ===
${feedback || "Not specified in input"}
=== END INPUT ===

=== EXISTING CODE TO MODIFY ===
\`\`\`tsx
${existingCodeStr}
\`\`\`
=== END EXISTING CODE ===

CONTEXT:
- Original Requirements: ${JSON.stringify(focusedReqs)}
- Original Vision: ${prompt}

INSTRUCTION: Apply ONLY the changes described in the modification request above. Return the full, complete modified file.`
      : `
GOAL: Generate a world-class ${requirements.projectTitle || 'application'} grounded in the provided context.

=== USER INPUT (STRICT SOURCE) ===
${prompt || "Not specified in input"}
${feedback ? `\nFeedback: ${feedback}` : ''}
=== END INPUT ===

=== PRIMARY DOCUMENT (SOURCE OF TRUTH) ===
${JSON.stringify(focusedReqs)}
=== END DOCUMENT ===

=== DESIGN SPEC (SOURCE OF TRUTH) ===
${JSON.stringify(design)}
=== END DESIGN ===

ACTION: Synthesize the absolute complete, high-performance Full-Stack code now. 
Every section, functional component, state management logic, design layout, and interactive element defined in the requirements and design MUST be present. YOU MUST WRITE THOUSANDS OF LINES if required. 
DO NOT skip sections. DO NOT output partial code. DO NOT just make a header and footer.
Ensure the generated application is an EXHAUSTIVE, MASSIVE, MOST ACCURATE representation of the original user vision.
Render every component with full logic. Ready for instant production-grade deployment!`;

    const responseText = await this.generateWithRetry(
      actionPrompt,
      sys,
      undefined, 
      DEFAULT_MODEL,
      5,
      60000 
    );

    if (isModification && existingCode && typeof existingCode !== 'string') {
      const parsedModifications = this.cleanAndParseJson(responseText || '{}');
      return { ...existingCode, ...parsedModifications };
    }

    return this.cleanAndParseJson(responseText || '{}');
  }

  async runDevDocsAgent(code: string | Record<string, string>, requirements: any, design: any) {
    const focusedReqs = this.buildFocusedContext(requirements);
    const codeContent = typeof code === 'string' ? code : JSON.stringify(code, null, 2);

    const sys = `You are a Senior Technical Architect and DevOps Specialist.
    Your task is to generate comprehensive development documentation for the synthesized application.

    ### MANDATORY DOCUMENTATION SECTIONS:
    1. **Tech Stack**: Complete list of technologies used in the frontend and backend.
    2. **Project Structure**: A textual or tree-like representation of the directory structure.
    3. **Setup Instructions**: Step-by-step guide to install dependencies and run the project locally.
    4. **Key Components Description**: Detailed explanation of major modules, hooks, and services.
    5. **API Integration Details**: How the frontend communicates with the backend, including base URLs and authentication if applicable.
    6. **Environment Variables**: List of required .env variables with descriptions.
    7. **Deployment Overview**: Recommended strategy for deploying to production (e.g., Vercel, Docker, AWS).

    Output strictly as JSON.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        techStack: { type: Type.STRING },
        projectStructure: { type: Type.STRING },
        setupInstructions: { type: Type.STRING },
        keyComponentsDescription: { type: Type.STRING },
        apiIntegrationDetails: { type: Type.STRING },
        environmentVariables: { type: Type.STRING },
        deploymentOverview: { type: Type.STRING }
      },
      required: ["techStack", "projectStructure", "setupInstructions", "keyComponentsDescription", "apiIntegrationDetails", "environmentVariables", "deploymentOverview"]
    };

    const promptText = `
=== REQUIREMENTS ===
${JSON.stringify(focusedReqs)}
=== DESIGN ===
${JSON.stringify(design)}
=== CODE SNIPPET (TRUNCATED) ===
${codeContent.substring(0, 10000)}
`;

    const res = await this.generateWithRetry(promptText, sys, schema, DEFAULT_MODEL, 3, 4096);
    return this.cleanAndParseJson(res || '{}');
  }

  async runTestingAgent(code: string | Record<string, string>, requirements: any, prompt: string, feedback?: string) {
    const focusedReqs = this.buildFocusedContext(requirements);
    const sys = `You are a Senior Lead QA Automation Engineer and Security Auditor. 
    Your mission is to produce comprehensive, enterprise-grade testing documentation for the application.

    ### MANDATORY TEST DOCUMENTATION SECTIONS:

    #### 4.1 Test Plan:
    - **Testing Scope**: Define exactly what is being tested and what is excluded.
    - **Testing Strategy**: Describe the testing approach (Unit, Integration, E2E, manual vs automated).
    - **Tools & Environment**: List all testing tools, frameworks, and environment configurations.
    - **Entry/Exit Criteria**: Define when testing can begin and when it is considered complete.

    #### 4.2 Test Design:
    - **Test Scenarios**: List all major test scenarios covering functional, non-functional, edge cases, and negative tests.
    - **Test Coverage**: Map test scenarios back to requirements for full traceability.

    #### 4.3 Test Cases:
    - Generate at least 10-15 detailed test cases.
    - Each test case MUST include: ID, Description, Steps (as an array of step strings), Expected Result, Actual Result (write realistic simulated results), and Status (passed/failed/pending).

    #### 4.4 Test Execution Report:
    - **Summary**: Overall testing summary with key findings.
    - **Pass/Fail Metrics**: Quantitative results (e.g., "12 passed, 2 failed, 1 pending").
    - **Defect Summary**: List of defects found with severity and impact.

    ### CRITICAL RULES:
    - Every test case MUST have steps, expectedResult, and actualResult — do NOT leave them empty.
    - Ensure traceability: requirements → test scenarios → test cases.
    - Be realistic about actual results — simulate what real testing would find.

    Output strictly as JSON.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        testPlan: {
          type: Type.OBJECT,
          properties: {
            testingScope: { type: Type.STRING, description: "What is being tested and what is excluded." },
            testingStrategy: { type: Type.STRING, description: "Testing approach: Unit, Integration, E2E, manual vs automated." },
            toolsAndEnvironment: { type: Type.STRING, description: "Testing tools, frameworks, and environment setup." },
            entryExitCriteria: { type: Type.STRING, description: "When testing begins and when it is complete." }
          },
          required: ["testingScope", "testingStrategy", "toolsAndEnvironment", "entryExitCriteria"]
        },
        testDesign: {
          type: Type.OBJECT,
          properties: {
            testScenarios: { type: Type.ARRAY, items: { type: Type.STRING }, description: "All major test scenarios." },
            testCoverage: { type: Type.STRING, description: "Requirements-to-test mapping for traceability." }
          },
          required: ["testScenarios", "testCoverage"]
        },
        testCases: {
          type: Type.ARRAY,
          description: "At least 10-15 detailed test cases.",
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              description: { type: Type.STRING },
              steps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Ordered test steps." },
              expectedResult: { type: Type.STRING },
              actualResult: { type: Type.STRING },
              status: { type: Type.STRING, enum: ["passed", "failed", "pending"] }
            },
            required: ["id", "description", "steps", "expectedResult", "actualResult", "status"]
          }
        },
        testExecutionReport: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "Overall testing summary with key findings." },
            passFailMetrics: { type: Type.STRING, description: "Quantitative pass/fail results." },
            defectSummary: { type: Type.STRING, description: "Defects found with severity and impact." }
          },
          required: ["summary", "passFailMetrics", "defectSummary"]
        }
      },
      required: ["testPlan", "testDesign", "testCases", "testExecutionReport"]
    };

    const codeContent = typeof code === 'string' ? code : JSON.stringify(code, null, 2);

    const promptText = `
=== USER INPUT (STRICT SOURCE) ===
${prompt || "Not specified in input"}
${feedback ? `\nFeedback: ${feedback}` : ''}
=== END INPUT ===

=== PRIMARY DOCUMENT (SOURCE OF TRUTH) ===
${JSON.stringify(focusedReqs)}
=== END DOCUMENT ===

=== GENERATED CODE ===
${codeContent.substring(0, 50000)}... (truncated if too long)
=== END CODE ===
`;

    const res = await this.generateWithRetry(promptText, sys, schema, DEFAULT_MODEL, 3, 8192);
    return this.cleanAndParseJson(res || '{}');
  }

  // ============================================================
  // PARALLEL VALIDATION PACK (runs concurrently with main agents)
  // ============================================================

  async runParallelReqValidation(requirements: any) {
    const sys = `You are a Senior Business Analyst performing a rapid requirements audit.
    Review the provided PRD for: completeness, ambiguity, feasibility gaps, and missing non-functional requirements.
    Be concise. Respond strictly as JSON.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
        recommendation: { type: Type.STRING }
      },
      required: ["score", "strengths", "gaps", "recommendation"]
    };

    const res = await this.generateWithRetry(
      `Requirements to validate: ${JSON.stringify(requirements)}`,
      sys, schema, DEFAULT_MODEL, 2, 4096
    );
    return this.cleanAndParseJson(res || '{}');
  }

  async runParallelDesignReview(design: any, requirements: any) {
    const sys = `You are a Principal Architect performing a rapid design peer review.
    Evaluate the design artifact against the requirements.
    Be concise. Respond strictly as JSON.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
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

  async runParallelCodeTesting(code: string | Record<string, string>, requirements: any) {
    const sys = `You are a senior code reviewer performing static analysis.
    Check for code quality, security vulnerabilities, accessibility.
    Be concise. Respond strictly as JSON.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
        issuesFound: { type: Type.ARRAY, items: { type: Type.STRING } },
        securityFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
        a11yGaps: { type: Type.ARRAY, items: { type: Type.STRING } },
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

  private buildFocusedContext(requirements: any) {
    if (!requirements) return {};
    return {
      projectOverview: requirements.projectOverview,
      businessObjectives: requirements.businessObjectives,
      functionalRequirements: (requirements.functionalRequirements || []).slice(0, 20),
      keyUserStories: (requirements.userStories || []).slice(0, 20),
      stakeholders: requirements.stakeholders
    };
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
