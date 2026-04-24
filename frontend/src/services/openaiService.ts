import OpenAI from 'openai';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key is missing. Please check your environment variables.');
    }

    this.openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
      dangerouslyAllowBrowser: true // Only for client-side usage in a secure context
    });
  }

  private async generate(prompt: string, systemInstruction: string, schema?: any) {
    try {
      const model = 'gpt-3.5-turbo'; // Fallback to more widely available model
      console.log('Using model:', model);

      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt }
        ],
        response_format: schema ? { type: 'json_object' } : undefined,
        temperature: 0.1,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error: any) {
      console.error('OpenAI API Error:', {
        status: error.status,
        code: error.code,
        message: error.message,
        model: error?.request?.body?.model,
        url: error?.request?.url
      });
      throw new Error(`OpenAI API Error: ${error.message}`);
    }
  }

  async runRequirementAgent(prompt: string) {
    const sys = `You are a Senior Lead Business Analyst and Product Architect. 
    Your goal is to produce a highly detailed, comprehensive, and professional Product Requirements Document (PRD).
    
    ### Guidelines:
    1. **Comprehensive Depth**: Do not hold back on detail. Explore edge cases and user personas.
    2. **Professional Structure**: Organize information logically into actionable user stories with exhaustive acceptance criteria.
    3. **Holistic View**: Include data entities, technical constraints, and a clear executive vision.
    
    Output strictly as JSON.`;

    const schema = {
      type: 'object',
      properties: {
        projectTitle: { type: 'string' },
        executiveSummary: { type: 'string' },
        userStories: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, story: { type: 'string' }, description: { type: 'string' }, acceptanceCriteria: { type: 'array', items: { type: 'string' } }, priority: { type: 'string' } } } },
        scope: { type: 'string' },
        technicalConstraints: { type: 'array', items: { type: 'string' } },
        dataEntities: { type: 'array', items: { type: 'string' } }
      },
      required: ["projectTitle", "executiveSummary", "userStories", "scope", "technicalConstraints", "dataEntities"]
    };

    const res = await this.generate(`User request: ${prompt}`, sys, schema);
    return JSON.parse(res || '{}');
  }

  async runDesignAgent(requirements: any, theme?: string, feedback?: string) {
    const sys = `You are a Principal Software Architect and Lead UI/UX Strategist.
    Translate complex requirements into a sophisticated, detailed technical design blueprint.
    
    ### Requirements:
    1. **Architectural Blueprints**: Provide system architecture, state management flow, and component communication plans.
    2. **UX Strategy**: Extensive textual descriptions of the UI/UX journey and micro-interaction specifications.
    3. **Premium Design Language**: Apply the '${theme || 'Modern Obsidian'}' theme with extreme precision. 
       - Specify vibrant, harmonious color palettes, sophisticated typography, sleek dark modes, and glassmorphism effects.
    
    Output strictly as JSON.`;

    const prompt = `Requirements: ${JSON.stringify(requirements)}${feedback ? `\n\nUser Feedback for Refinement: ${feedback}` : ''}`;
    const res = await this.generate(
      prompt,
      sys,
      {
        type: 'object',
        properties: {
          architectureDiagram: { type: 'string' },
          componentStructure: { type: 'array', items: { type: 'string' } },
          wireframes: { type: 'string' },
          apiEndpoints: { type: 'array', items: { type: 'string' } },
          designSystem: { type: 'string' }
        },
        required: ["architectureDiagram", "componentStructure", "wireframes", "apiEndpoints", "designSystem"]
      }
    );

    return JSON.parse(res || '{}');
  }

  async runDevelopmentAgent(design: any, requirements: any, prompt: string, theme?: string, feedback?: string) {
    const sys = `You are an elite 10x Full-Stack Engineer. Your task is to build a "Production-Ready", 100% complete React application.

    ### CORE MANDATE:
    1. **Zero Placeholders**: Every feature, section, and component defined in the design MUST be fully implemented. "TODO" comments or empty sections are strictly forbidden.
    2. **High Architectural Fidelity**: Synthesize code that is 100% accurate to the provided User Stories and Architectural Blueprints.
    3. **Functional Completeness**: Implement real application logic (state management, event handlers, form validations) so the site is "ready to ship".
    4. **Premium UI/UX**: Create a design that is visually stunning, futuristic, and premium. Use sophisticated typography, glassmorphism, and smooth Framer Motion animations.
    
    ### CONSTRAINTS:
    - The ENTIRE application MUST be in a single monolithic file.
    - NEVER use import.meta.env or process.env.
    - Hardcode API base URL: const API_BASE = 'http://localhost:3001';
    
    ### OUTPUT FORMAT
    - Return ONLY the raw code. No markdown code blocks.`;

    const context = `Project Context:
      Requirements: ${JSON.stringify(requirements)}
      Design Pattern: ${JSON.stringify(design)}
      User Goal: ${prompt}
      ${feedback ? `\nUser Feedback for Refinement: ${feedback}` : ''}
      
      ACTION: Synthesize the absolute complete, high-performance Full-Stack code now. 
      Ensure the generated website is the MOST ACCURATE representation of the original user vision (${prompt}).
      Render every component with full logic. Ready for production.`;

    return await this.generate(context, sys);
  }

  async runTestingAgent(code: string | Record<string, string>, requirements: any, prompt: string, feedback?: string) {
    const sys = `You are a QA Engineer Agent. Review the code against requirements and generate test cases and a results report. 
    Output JSON with testCases (array), results (string), and bugReports (string).`;

    const codeContent = typeof code === 'string' ? code : JSON.stringify(code, null, 2);
    const promptText = `Code: ${codeContent}. 
      Requirements: ${JSON.stringify(requirements)} 
      User Feedback to Address: ${feedback || 'None'}`;

    const res = await this.generate(promptText, sys, {
      type: 'object',
      properties: {
        testCases: { type: 'array', items: { type: 'string' } },
        results: { type: 'string' },
        bugReports: { type: 'string' }
      },
      required: ["testCases", "results", "bugReports"]
    });

    return JSON.parse(res || '{}');
  }
}
