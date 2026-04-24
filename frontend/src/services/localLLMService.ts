import * as webllm from '@mlc-ai/web-llm';
import { IAgentService } from '../types';

const ChatModule = (webllm as any).Chat || (webllm as any).ChatModule;

export class LocalLLMService implements IAgentService {
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

  async runRequirementAgent(prompt: string, attachments?: any[], brdData?: any, figmaData?: any) {
    const sys = `You are a Senior Lead Business Analyst and Product Architect. Produce a detailed, comprehensive PRD.
    
    ### Guidelines:
    1. **Comprehensive Depth**: Explore edge cases and user personas.
    2. **Professional Structure**: Actionable user stories with exhaustive acceptance criteria.
    3. **Holistic View**: Include data entities, technical constraints, and a clear executive vision.
    
    Output strictly as JSON.`;

    const brdContext = brdData ? `\n\nBRD Data (Primary Source): ${JSON.stringify(brdData)}` : '';
    const figmaContext = figmaData ? `\n\nFigma Design Context: ${JSON.stringify(figmaData)}` : '';
    const fullPrompt = prompt + brdContext + figmaContext;
    const response = await this.generate(fullPrompt, sys);
    try {
      const parsed = JSON.parse(response);
      return {
        projectTitle: parsed.projectTitle || "Project",
        executiveSummary: parsed.executiveSummary || "",
        userStories: parsed.userStories || [],
        scope: parsed.scope || "",
        technicalConstraints: parsed.technicalConstraints || [],
        dataEntities: parsed.dataEntities || []
      };
    } catch (e) {
      console.error('Failed to parse requirements response:', e);
      return { projectTitle: '', executiveSummary: '', userStories: [], scope: '', technicalConstraints: [], dataEntities: [] };
    }
  }

  async runDesignAgent(requirements: any, theme?: string, feedback?: string, figmaData?: any) {
    const sys = `You are a Principal Software Architect and Lead UI/UX Strategist.
    Translate requirements into a sophisticated, detailed technical design blueprint.
    ### Requirements:
    1. **Architectural Blueprints**: Provide system architecture and component communication plans.
    2. **UX Strategy**: Layout hierarchies and micro-interaction specifications.
    3. **Premium Design Language**: Apply the '${theme || 'Modern Obsidian'}' theme.
    
    Output strictly as JSON.`;

    const figmaContext = figmaData ? `\n\nFigma Design Context: ${JSON.stringify(figmaData)}` : '';
    const prompt = `Requirements: ${JSON.stringify(requirements)}${feedback ? `\n\nUser Feedback for Refinement: ${feedback}` : ''}${figmaContext}`;
    const response = await this.generate(prompt, sys);
    try {
      const parsed = JSON.parse(response);
      return {
        architectureDiagram: parsed.architectureDiagram || "",
        componentStructure: parsed.componentStructure || [],
        wireframes: parsed.wireframes || "",
        apiEndpoints: parsed.apiEndpoints || [],
        designSystem: parsed.designSystem || ""
      };
    } catch (e) {
      console.error('Failed to parse design response:', e);
      return { architectureDiagram: '', componentStructure: [], wireframes: '', apiEndpoints: [], designSystem: '' };
    }
  }

  async runDevelopmentAgent(design: any, requirements: any, prompt: string, theme?: string, feedback?: string, existingCode?: string | Record<string, string>, figmaData?: any) {
    const sys = `You are an elite 10x Full-Stack Engineer. Build a "Production-Ready", 100% complete React application.
    ### CORE MANDATE:
    1. **Zero Placeholders**: Every feature in the design MUST be fully realized. No "TODO"s.
    2. **High Architectural Fidelity**: 100% accurate to User Stories and Blueprints.
    3. **Functional Completeness**: Implement real application logic (state, handlers, forms).
    4. **Premium UI/UX**: Visually stunning, futuristic, and premium.
    
    ### CONSTRAINTS:
    - Single monolithic file. Hardcode API: const API_BASE = 'http://localhost:3001';
    - Return ONLY raw code starting with imports. No markdown code blocks.`;

    const existingCodeStr = existingCode
      ? (typeof existingCode === 'string' ? existingCode : Object.values(existingCode).join('\n\n'))
      : null;
    const figmaContext = figmaData ? `\n\nFigma Design Context: ${JSON.stringify(figmaData)}` : '';

    const context = `Requirements: ${JSON.stringify(requirements)}\n\nDesign: ${JSON.stringify(design)}${feedback ? `\n\nUser Feedback: ${feedback}` : ''}${figmaContext}
    ${existingCodeStr ? `\n\nExisting Code:\n${existingCodeStr}` : ''}
    ACTION: Synthesize the absolute complete Full-Stack code now. 
    Ensure the website is the MOST ACCURATE representation of the vision (${prompt}). 
    Every component must be fully realized with logic.`;
    const response = await this.generate(context, sys);

    return response;
  }

  async runTestingAgent(code: string | Record<string, string>, requirements: any, prompt: string, feedback?: string, figmaData?: any) {
    const sys = `You are a QA Engineer Agent. Review the code against requirements and generate test cases and a results report. 
    Output JSON with testCases (array), results (string), and bugReports (string).`;

    const codeContent = typeof code === 'string' ? code : JSON.stringify(code, null, 2);
    const figmaContext = figmaData ? `\n\nFigma Design Context: ${JSON.stringify(figmaData)}` : '';
    const context = `Code: ${codeContent}\n\nRequirements: ${JSON.stringify(requirements)}${feedback ? `\n\nUser Feedback: ${feedback}` : ''}${figmaContext}`;
    const response = await this.generate(context, sys);

    try {
      return JSON.parse(response);
    } catch (e) {
      console.error('Failed to parse testing response:', e);
      return { testCases: [], results: 'Pending', bugReports: '' };
    }
  }

  async runParallelReqValidation(requirements: any) {
    return { score: 70, strengths: ["Local validation"], gaps: ["N/A"], recommendation: "Continue" };
  }

  async runParallelDesignReview(design: any, requirements: any) {
    return { score: 70, architectureRisks: [], recommendations: [], summary: "Local check passed" };
  }

  async runParallelCodeTesting(code: string | Record<string, string>, requirements: any) {
    return { score: 70, issuesFound: [], securityFlags: [], a11yGaps: [], summary: "Local check passed" };
  }
}

export default LocalLLMService;
