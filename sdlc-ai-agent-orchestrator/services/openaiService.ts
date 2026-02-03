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
        temperature: 0.7,
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

  async runDesignAgent(requirements: any) {
    const sys = `You are a System & UI/UX Architect Agent. Design the architecture and wireframe structure based on requirements. 
    Output JSON with architecture (markdown), wireframes (markdown/description), and apiContracts (markdown).`;
    
    const res = await this.generate(
      `Requirements: ${JSON.stringify(requirements)}`, 
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

  async runDevelopmentAgent(design: any, requirements: any) {
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
    
    return await this.generate(
      `Project Context:
      Requirements: ${JSON.stringify(requirements)}
      Design Pattern: ${JSON.stringify(design)}
      
      Generate the complete application code now. Ensure it is a single-file React component exported as default.`,
      sys
    );
  }
}
