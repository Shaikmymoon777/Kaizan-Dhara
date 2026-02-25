import * as webllm from '@mlc-ai/web-llm';

const ChatModule = (webllm as any).Chat || (webllm as any).ChatModule;

export class LocalLLMService {
  private chat: any;
  private initialized: boolean = false;

  constructor() {
    if (!ChatModule) {
      throw new Error("WebLLM ChatModule not available. Check the import.");
    }
    this.chat = new (webllm as any).ChatModule();
    this.initializeModel();
  }

  private async initializeModel() {
    try {
      // Set the model path and library path
      const model = "TinyLlama-1.1B-Chat-v0.4-q4f32_1-MLC";
      const modelUrl = "https://huggingface.co/mlc-ai/TinyLlama-1.1B-Chat-v0.4-q4f32_1-MLC/resolve/main/";
      const modelLibUrl = "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/TinyLlama-1.1B-Chat-v0.4/TinyLlama-1.1B-Chat-v0.4-q4f32_1-ctx4k_cs1k-webgpu.wasm";

      // Initialize the chat with progress callback
      await this.chat.setInitProgressCallback((report: { progress: number }) => {
        console.log(`Model loading: ${(report.progress * 100).toFixed(1)}%`);
      });

      // Load the model
      await this.chat.reload(model, {
        model_list: [{
          model_url: modelUrl,
          local_id: model,
          model_lib_url: modelLibUrl
        }]
      });
      this.initialized = true;
      console.log("Local LLM model loaded successfully");
    } catch (error) {
      console.error("Failed to initialize local LLM:", error);
      throw new Error("Failed to initialize local LLM model");
    }
  }

  private async ensureInitialized() {
    while (!this.initialized) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async generate(prompt: string, systemInstruction: string, schema?: any): Promise<string> {
    try {
      await this.ensureInitialized();

      // Format the prompt with system instruction
      const fullPrompt = `[INST] <<SYS>>\n${systemInstruction}\n<</SYS>>\n\n${prompt} [/INST]`;

      // Generate response
      const response = await this.chat.generate(fullPrompt);

      // If schema is provided, try to format as JSON
      if (schema) {
        try {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          return jsonMatch ? jsonMatch[0] : response;
        } catch (e) {
          console.warn("Failed to parse response as JSON:", e);
          return response;
        }
      }

      return response;
    } catch (error) {
      console.error('Error in local LLM generation:', error);
      throw new Error('Failed to generate response from local LLM');
    }
  }

  async runRequirementAgent(prompt: string, attachments?: any[]) {
    const sys = `You are a Senior Business Analyst Agent. Extract requirements from the user prompt. 
    Output as JSON with userStories (array), scope (string), and assumptions (array).`;

    const response = await this.generate(prompt, sys);
    try {
      return JSON.parse(response);
    } catch (e) {
      console.error('Failed to parse requirements response:', e);
      return { userStories: [], scope: '', assumptions: [] };
    }
  }

  async runDesignAgent(requirements: any, theme?: string, feedback?: string) {
    const sys = `You are a Senior Solutions Architect. Create a high-level design based on the requirements.
    Output JSON with architecture (markdown), wireframes (markdown/description), and apiContracts (markdown).`;

    const prompt = `Requirements: ${JSON.stringify(requirements)}${feedback ? `\n\nUser Feedback for Refinement: ${feedback}` : ''}`;
    const response = await this.generate(prompt, sys);
    try {
      return JSON.parse(response);
    } catch (e) {
      console.error('Failed to parse design response:', e);
      return { architecture: '', wireframes: '', apiContracts: '' };
    }
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

    const context = `Requirements: ${JSON.stringify(requirements)}\n\nDesign: ${JSON.stringify(design)}${feedback ? `\n\nUser Feedback: ${feedback}` : ''}`;
    const response = await this.generate(context, sys);

    // Return raw code string, not JSON
    return response;
  }

  async runTestingAgent(code: string | Record<string, string>, requirements: any, prompt: string, feedback?: string) {
    const sys = `You are a QA Engineer Agent. Review the code against requirements and generate test cases and a results report. 
    Output JSON with testCases (array), results (string), and bugReports (string).`;

    const codeContent = typeof code === 'string' ? code : JSON.stringify(code, null, 2);
    const context = `Code: ${codeContent}\n\nRequirements: ${JSON.stringify(requirements)}${feedback ? `\n\nUser Feedback: ${feedback}` : ''}`;
    const response = await this.generate(context, sys);

    try {
      return JSON.parse(response);
    } catch (e) {
      console.error('Failed to parse testing response:', e);
      return { testCases: [], results: 'Pending', bugReports: '' };
    }
  }
}

export default LocalLLMService;
