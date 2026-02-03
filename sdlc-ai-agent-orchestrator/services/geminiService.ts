
import { GoogleGenAI, Type } from "@google/genai";

export class AgentService {
  private ai: GoogleGenAI;

  constructor() {
    // Always use named parameter for apiKey
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key is missing. Please check your environment variables.');
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  private async generate(prompt: string, systemInstruction: string, schema?: any, modelOverride?: string) {
    // Guideline: Use gemini-3-flash-preview for basic tasks, gemini-3-pro-preview for complex tasks like coding.
    const model = modelOverride || 'gemini-3-flash-preview';
    const config: any = {
      systemInstruction,
      temperature: 0.1, // Lower temperature for more consistent and stable code generation
    };

    if (schema) {
      config.responseMimeType = "application/json";
      config.responseSchema = schema;
    }

    // Guideline: Use ai.models.generateContent and response.text
    const response = await this.ai.models.generateContent({
      model,
      contents: prompt,
      config,
    });

    return response.text;
  }

  async runRequirementAgent(prompt: string) {
    const sys = `You are a Senior Business Analyst Agent. Extract requirements from the user prompt. 
    Output as JSON with userStories (array), scope (string), and assumptions (array).`;
    
    const schema = {
      type: Type.OBJECT,
      properties: {
        userStories: { type: Type.ARRAY, items: { type: Type.STRING } },
        scope: { type: Type.STRING },
        assumptions: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["userStories", "scope", "assumptions"]
    };

    const res = await this.generate(`User request: ${prompt}`, sys, schema);
    return JSON.parse(res || '{}');
  }

  async runDesignAgent(requirements: any) {
    const sys = `You are a System & UI/UX Architect Agent. Design the architecture and wireframe structure based on requirements. 
    Output JSON with architecture (markdown), wireframes (markdown/description), and apiContracts (markdown).`;
    
    const schema = {
      type: Type.OBJECT,
      properties: {
        architecture: { type: Type.STRING },
        wireframes: { type: Type.STRING },
        apiContracts: { type: Type.STRING }
      },
      required: ["architecture", "wireframes", "apiContracts"]
    };

    const res = await this.generate(`Requirements: ${JSON.stringify(requirements)}`, sys, schema);
    return JSON.parse(res || '{}');
  }

  async runDevelopmentAgent(design: any, requirements: any) {
    const sys = `You are a Senior Frontend Engineer. Your task is to produce a high-fidelity, production-ready React landing page in a SINGLE FILE.

### CRITICAL RULES:
1. **NO EXPLANATION**: Output ONLY the raw source code. NO "Here is your code", NO commentary.
2. **VALID ES MODULE**: The code must be a valid ES module with standard 'import' statements.
3. **MANDATORY DEFAULT EXPORT**: You MUST have exactly one 'export default function App() { ... }'. If you don't include this, the app will show a white screen.
4. **LIBRARIES**: You MAY ONLY use 'react', 'lucide-react', 'framer-motion', 'clsx', and 'tailwind-merge'.
5. **STYLING**: Use Tailwind CSS classes exclusively. Do not write custom CSS blocks.
6. **ICONS**: Import icons from 'lucide-react' (e.g., import { Mail, Home, ChevronRight, Star } from 'lucide-react').
7. **ANIMATIONS**: Always use 'framer-motion' (motion.div, AnimatePresence) for a premium feel.
8. **ASSETS**: Use high-quality professional images from Unsplash via URL.

### UI/UX GUIDELINES:
- Aim for a premium, venture-capital-backed startup look.
- Use glassmorphism, bold typography (Inter/system-sans), and generous whitespace.
- Ensure smooth scrolling and entry animations for every section.
- Create a complete page: Hero, Features, Testimonials, Pricing, and Footer.`;
    
    // Coding task is complex, use gemini-3-pro-preview
    return await this.generate(
      `Requirements: ${JSON.stringify(requirements)}
      Design Context: ${JSON.stringify(design)}
      
      Generate the complete, self-contained React code for the application now. Ensure there is a DEFAULT EXPORT.`,
      sys,
      undefined,
      'gemini-3-pro-preview'
    );
  }

  async runTestingAgent(code: string, requirements: any) {
    const sys = `You are a QA Engineer Agent. Review the code against requirements and generate test cases and a results report. 
    Output JSON with testCases (array), results (string), and bugReports (string).`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        testCases: { type: Type.ARRAY, items: { type: Type.STRING } },
        results: { type: Type.STRING },
        bugReports: { type: Type.STRING }
      },
      required: ["testCases", "results", "bugReports"]
    };

    const res = await this.generate(`Code: ${code}. Requirements: ${JSON.stringify(requirements)}`, sys, schema);
    return JSON.parse(res || '{}');
  }
}
