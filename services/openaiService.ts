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
    const sys = `You are a Senior Business Analyst Agent. Extract requirements from the user prompt. 
    Output as JSON with userStories (array), scope (string), and assumptions (array).`;

    const schema = {
      type: 'object',
      properties: {
        userStories: { type: 'array', items: { type: 'string' } },
        scope: { type: 'string' },
        assumptions: { type: 'array', items: { type: 'string' } }
      },
      required: ["userStories", "scope", "assumptions"]
    };

    const res = await this.generate(`User request: ${prompt}`, sys, schema);
    return JSON.parse(res || '{}');
  }

  async runDesignAgent(requirements: any, theme?: string, feedback?: string) {
    const sys = `You are a System & UI/UX Architect Agent. Design the architecture and wireframe structure based on requirements. 
    Output JSON with architecture (markdown), wireframes (markdown/description), and apiContracts (markdown).`;

    const prompt = `Requirements: ${JSON.stringify(requirements)}${feedback ? `\n\nUser Feedback for Refinement: ${feedback}` : ''}`;
    const res = await this.generate(
      prompt,
      sys,
      {
        type: 'object',
        properties: {
          architecture: { type: 'string' },
          wireframes: { type: 'string' },
          apiContracts: { type: 'string' }
        },
        required: ["architecture", "wireframes", "apiContracts"]
      }
    );

    return JSON.parse(res || '{}');
  }

  async runDevelopmentAgent(design: any, requirements: any, prompt: string, theme?: string, feedback?: string) {
    const sys = `You are a Lead Frontend Engineer Agent. Create a high-fidelity, polished, and fully functional React application (Single File).

    ### TECHNICAL SPECIFICATION
    - LANGUAGE: React (JSX or TSX).
    - STYLING: Use Tailwind CSS classes exclusively. Focus on modern aesthetics, gradients, and subtle shadows.
    - ICONS: Use 'lucide-react'.
    - EXPORT: Ensure the main application component is the 'default' export.
    - CONTENT: All requested features in the requirements must be implemented in the UI.
    - QUALITY: The UI should feel professional, responsive, and "production-ready".
    
    ### OUTPUT FORMAT
    - Return ONLY the raw code. 
    - No markdown formatting (no \`\`\` blocks).
    - No pre-amble or post-amble text.`;

    const context = `Project Context:
      Requirements: ${JSON.stringify(requirements)}
      Design Pattern: ${JSON.stringify(design)}
      User Goal: ${prompt}
      ${feedback ? `\nUser Feedback for Refinement: ${feedback}` : ''}
      
      Generate the complete application code now. Ensure it is a single-file React component exported as default.`;

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
