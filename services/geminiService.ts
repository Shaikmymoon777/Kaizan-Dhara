
import { GoogleGenAI, Type } from "@google/genai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

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
    const modelName = modelOverride || 'gemini-2.5-flash';

    // Configure generation config
    const config: any = {
      temperature: 0.1, // Lower for more predictable JSON
      maxOutputTokens: maxTokens || 8192, // Prevent massive, truncated outputs
    };

    if (schema) {
      config.responseMimeType = "application/json";
      config.responseSchema = schema;
    }

    try {
      console.log(`Generating content with model: ${modelName}`);

      const response = await this.ai.models.generateContent({
        model: modelName,
        contents: Array.isArray(contents) ? contents : [{ role: 'user', parts: [{ text: contents }] }],
        config: {
          systemInstruction,
          ...config
        }
      });

      console.log('Gemini Response Keys:', Object.keys(response || {}));
      return response.text;

    } catch (error: any) {
      console.error("Gemini SDK Error:", error);
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
    const sys = `You are a Lead Business Analyst at a top-tier tech consulting firm. 
    Your goal is to produce a concise, professional PRD.
    
    ### Guidelines:
    1. **Brevity is Key**: Keep descriptions extremely punchy. Do not exceed 2000 total words.
    2. **Structured Output**: Use the provided schema strictly.
    3. **User Stories**: Stick to the standard format. Acceptance criteria must be actionable and brief.
    4. **Technical Constraints**: Focus on core requirements only.
    
    Output strictly as JSON.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        projectTitle: { type: Type.STRING },
        executiveSummary: { type: Type.STRING, description: "High-level overview of the vision. Max 3 sentences." },
        userStories: {
          type: Type.ARRAY,
          description: "List of top 5-7 most critical user stories.",
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              story: { type: Type.STRING },
              acceptanceCriteria: { type: Type.ARRAY, items: { type: Type.STRING, description: "Max 3 criteria per story." } },
              priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
            }
          }
        },
        scope: { type: Type.STRING, description: "Detailed In-Scope and Out-of-Scope definitions." },
        technicalConstraints: { type: Type.ARRAY, items: { type: Type.STRING } },
        dataEntities: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of core data objects." }
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
    const res = await this.generateWithRetry(contents, sys, schema, 'gemini-2.5-flash', 5, 8192);
    return this.cleanAndParseJson(res || '{}');
  }

  async runDesignAgent(requirements: any, theme?: string, feedback?: string) {
    const sys = `You are a Principal Software Architect and UI/UX Designer.
    Your task is to translate requirements into a concrete technical design and visual guide.
    
    ### Requirements:
    1. **System Architecture**: Provide a Mermaid.js diagram code string illustrating the component hierarchy and data flow.
    2. **Wireframes**: Detailed textual descriptions of the UI layout (Header, Hero, Features, etc.) and interactions.
    3. **API Contracts**: Define key API endpoints (method, path, body) even if mocked on the frontend.
    4. **Component Strategy**: List the React components to be built, their props, and state responsibilities.
    5. **Visual Theme**: Apply the '${theme || 'Modern Obsidian'}' strictly. Define color palette (Tailwind classes) and typography.

    Output strictly as JSON.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        architectureDiagram: { type: Type.STRING, description: "Mermaid.js graph definition" },
        componentStructure: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of components to build" },
        wireframes: { type: Type.STRING, description: "Detailed layout descriptions" },
        apiEndpoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of planned API endpoints like 'POST /api/login'" },
        designSystem: { type: Type.STRING, description: "Color palette and typography rules" }
      },
      required: ["architectureDiagram", "componentStructure", "wireframes", "apiEndpoints", "designSystem"]
    };

    const prompt = `Requirements Artifact: ${JSON.stringify(requirements)}${feedback ? `\n\nUser Feedback for Refinement: ${feedback}` : ''}`;
    const res = await this.generateWithRetry(prompt, sys, schema, 'gemini-2.5-flash', 5, 8192);
    return this.cleanAndParseJson(res || '{}');
  }

  async runDevelopmentAgent(design: any, requirements: any, prompt: string, theme?: string, feedback?: string, existingCode?: string | Record<string, string>) {
    const isModification = !!(feedback && existingCode);

    const sys = isModification
      ? `You are a 10x Senior Frontend Engineer performing a TARGETED CODE MODIFICATION.

    ### CRITICAL RULES FOR MODIFICATION:
    1. **Minimal Change Principle**: You MUST preserve as much of the existing code as possible. Only modify the sections that are directly relevant to the user's feedback.
    2. **Single File Output**: Return the COMPLETE modified file as a single file. Do not truncate.
    3. **Keep Architecture**: Do NOT restructure or rename components unless explicitly asked.
    4. **Design System**: Maintain the '${theme || 'Modern Obsidian'}' theme unless the feedback asks to change it.
    5. **Imports**: Keep all existing imports. Only add new ones if needed for new functionality.

    ### STRICT OUTPUT FORMAT:
    - Output ONLY the raw, complete React code.
    - NO markdown code blocks, NO intro/outro text.
    - MUST retain 'import React, { ... } from "react";'
    - MUST retain 'export default function App() { ... }'`
      : `You are a 10x Senior Frontend Engineer. Your task is to build a "Production-Ready" React application in a SINGLE FILE (for preview purposes).
    
    ### CRITICAL ARCHITECTURE RULES:
    1. **Single File Structure**: Although strictly one file, you MUST structure it as if it were multiple files. 
       - Define all sub-components (Header, Hero, Pricing, Footer, etc.) first as separate, named constants.
       - The 'export default function App()' must be at the very bottom, composing these sub-components.
    2. **State Management**: Use 'useState' and 'useEffect' effectively. Lift state up to 'App' where necessary.
    3. **Design System**: Use the '${theme || 'Modern Obsidian'}' theme.
       - Use 'lucide-react' for icons.
       - Use 'framer-motion' for sophisticated animations (staggered children, scroll reveal).
       - Use 'clsx' and 'tailwind-merge' for class handling.
    4. **Responsiveness**: EVERY element must be mobile-responsive (use md: lg: xl: prefixes).
    5. **Mock Data**: Create realistic mock data constants (products, users, stats) at the top of the file.
    
    ### STRICT OUTPUT FORMAT:
    - Output ONLY the raw code. No markdown code blocks (unless the tool handles it, but raw is safer).
    - NO intro/outro text.
    - MUST include 'import React, { ... } from "react";'
    - MUST include 'export default function App() { ... }'`;

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
      Generate the complete, high-performance React code now. Ensure it renders perfectly without additional setup.`;

    // Use gemini-2.5-flash for speed and reliability in generation
    return await this.generateWithRetry(
      actionPrompt,
      sys,
      undefined, // No JSON schema, we want raw code text
      'gemini-2.5-flash', // Flash is 1M context, good for code
      5,
      30000 // High token limit for full code generation
    );
  }

  async runTestingAgent(code: string | Record<string, string>, requirements: any, prompt: string, feedback?: string) {
    const sys = `You are a Lead QA Engineer. 
    Your job is to rigorously verify the generated application against the original requirements and industry best practices.
    
    ### Tasks:
    1. **Requirement Verification**: Check each user story from the requirements against the provided code.
    2. **Code Quality Audit**: Analyze the code for performance issues, accessibility (a11y) gaps, and clean code patterns.
    3. **Test Suite Generation**: Define specific test cases (Manual or Automated concept).
    4. **Bug Reporting**: Identify any logic errors, missing responsive classes, or potential runtime crashes.

    Output strictly as JSON.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        executiveSummary: { type: Type.STRING, description: "Overall quality assessment (Pass/Fail/Needs Work)." },
        testCases: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              description: { type: Type.STRING },
              status: { type: Type.STRING, enum: ["passed", "failed", "pending"] },
              notes: { type: Type.STRING }
            }
          }
        },
        codeAudit: { type: Type.STRING, description: "Detailed review of code structure and quality." },
        identifiedIssues: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["executiveSummary", "testCases", "codeAudit", "identifiedIssues"]
    };

    const codeContent = typeof code === 'string' ? code : JSON.stringify(code, null, 2);

    const res = await this.generateWithRetry(
      `Analyzed Code: ${codeContent.substring(0, 50000)}... (truncated if too long)
      Original Requirements: ${JSON.stringify(requirements)} 
      User Focus: ${prompt}
      ${feedback ? `User Feedback: ${feedback}` : ''}`,
      sys, schema, 'gemini-2.5-flash', 3, 8192);
    return this.cleanAndParseJson(res || '{}');
  }

  private cleanAndParseJson(text: string): any {
    let cleanText = text.trim();

    // 1. Remove markdown code blocks
    cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      // 2. Locate the first '{' and last '}'
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanText = cleanText.substring(firstBrace, lastBrace + 1);
      }

      return JSON.parse(cleanText);
    } catch (parseError: any) {
      console.error("Initial JSON Parse Failure. Attempting aggressive repair...");

      try {
        let repairText = cleanText;

        // A. Handle unterminated strings: check if we are in a string
        // Simple parity check for quotes (ignoring escaped ones for this heuristic)
        const quoteCount = (repairText.match(/"/g) || []).length;
        if (quoteCount % 2 !== 0) {
          repairText += '"';
        }

        // B. Remove trailing commas which are common in LLM truncation
        repairText = repairText.replace(/,\s*([\}\]])/g, '$1');
        repairText = repairText.replace(/,$/, '');

        // C. Close open arrays and objects
        const openBraces = (repairText.match(/\{/g) || []).length;
        const closeBraces = (repairText.match(/\}/g) || []).length;
        const openBrackets = (repairText.match(/\[/g) || []).length;
        const closeBrackets = (repairText.match(/\]/g) || []).length;

        if (openBrackets > closeBrackets) repairText += ']'.repeat(openBrackets - closeBrackets);
        if (openBraces > closeBraces) repairText += '}'.repeat(openBraces - closeBraces);

        return JSON.parse(repairText);
      } catch (repairError: any) {
        console.error("Aggressive JSON repair failed:", repairError.message);

        // Final fallback: return a partial object if we can at least find the project title
        try {
          const titleMatch = cleanText.match(/"projectTitle":\s*"([^"]+)"/);
          if (titleMatch) {
            return {
              projectTitle: titleMatch[1],
              executiveSummary: "Detailed generation was interrupted due to size constraints. Please try refining with a more specific prompt.",
              userStories: [],
              scope: "Truncated",
              technicalConstraints: ["React"],
              dataEntities: []
            };
          }
        } catch (f) { /* ignore */ }

        throw new Error(`AI generated an invalid or truncated response that could not be repaired: ${parseError.message}`);
      }
    }
  }
}
