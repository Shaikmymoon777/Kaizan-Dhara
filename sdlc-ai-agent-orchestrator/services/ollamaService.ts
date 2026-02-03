export class AgentService {
    private backendUrl: string;
    private defaultModel: string | null = null;

    constructor() {
        // Pointing to Python Backend (FastAPI) which runs on 8000
        this.backendUrl = 'http://localhost:8000';
    }

    private async ensureModel() {
        // For this hybrid approach, we trust the backend to handle models
        return 'hybrid-model';
    }

    private async generate(prompt: string, systemInstruction: string, schema?: any, modelOverride?: string, role: string = 'Orchestrator', onStream?: (chunk: string) => void) {
        const messages = [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt }
        ];

        const body: any = {
            role, // Added role for backend routing
            model: modelOverride, // Support model override if provided
            messages,
            stream: !!onStream,
            options: {
                temperature: 0.1
            }
        };

        if (schema) {
            body.format = 'json';
            messages[0].content += `\n\nOUTPUT MUST BE STRICT JSON MATCHING THIS SCHEMA:\n${JSON.stringify(schema, null, 2)}`;
        }

        try {
            const response = await fetch(`${this.backendUrl}/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`Backend error: ${response.statusText}`);
            }

            if (onStream && response.body) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullResponse = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    fullResponse += chunk;
                    onStream(chunk);
                }

                // Final flush
                const lastChunk = decoder.decode();
                if (lastChunk) {
                    fullResponse += lastChunk;
                    onStream(lastChunk);
                }

                return fullResponse;
            } else {
                const data = await response.json();
                // Expecting backend to return { response: string } or similar
                if (data.response) {
                    return data.response;
                }
                return JSON.stringify(data);
            }

        } catch (error) {
            console.error('Generation Error:', error);
            throw error;
        }
    }

    // Helper to extract JSON from response with aggressive recovery
    private parseJSON(response: string) {
        if (!response) return null;

        let parsed: any = null;

        try {
            // 1. Try direct parse first
            parsed = JSON.parse(response);
        } catch (e) {
            // 2. Locate the JSON object if there's conversational text
            let clean = response.trim();
            const start = clean.indexOf('{');
            const end = clean.lastIndexOf('}');

            if (start !== -1 && end !== -1) {
                const potentialJson = clean.substring(start, end + 1);
                try {
                    parsed = JSON.parse(potentialJson);
                } catch (innerE) {
                    console.warn("Partial JSON extraction failed, moving to safeguard...");
                }
            }
        }

        // If we successfully parsed JSON with files, we're done
        if (parsed && parsed.files) {
            return parsed;
        }

        // If we got a parsed result but no files, return it as-is (might be requirements/design)
        if (parsed) {
            return parsed;
        }

        // 4. SAFEGUARD: If JSON failed, extract the code directly via non-greedy regex
        // This handles cases where the model cuts off or includes conversational text around the JSON block
        const codeMatch = response.match(/"src\/App\.tsx":\s*"(.*?)"\s*,?\s*"dependencies"/s) ||
            response.match(/```(?:tsx|jsx|typescript|javascript)?\n([\s\S]*?)```/);

        if (codeMatch && codeMatch[1]) {
            console.log("Safe-extracted code from malformed/incomplete response.");
            let extractedCode = codeMatch[1];

            // If it looks escaped (has literal \n), try to unescape it safely
            if (extractedCode.includes('\\n')) {
                try {
                    extractedCode = JSON.parse(`"${extractedCode}"`);
                } catch (e) {
                    // Fallback to manual unescape if JSON.parse fails
                    extractedCode = extractedCode
                        .replace(/\\n/g, '\n')
                        .replace(/\\"/g, '"')
                        .replace(/\\\\/g, '\\');
                }
            }

            return {
                files: {
                    "src/App.tsx": extractedCode
                },
                dependencies: {
                    "lucide-react": "^0.460.0",
                    "framer-motion": "^11.11.11",
                    "clsx": "^2.1.1",
                    "tailwind-merge": "^2.5.4"
                }
            };
        }

        console.error("Failed to parse or recover JSON response.");
        return null;
    }

    async runNamingAgent(prompt: string) {
        const sys = `You are a Project Manager Agent. Given a user prompt for a software project, generate a short, professional, and catchy name for the project (2-4 words).
    Output ONLY the name. No quotes, no preamble, no markdown.`;

        try {
            const res = await this.generate(`Project idea: ${prompt}`, sys, undefined, undefined, 'Orchestrator');
            return res.replace(/"/g, '').trim() || 'Agent Project v1';
        } catch (error) {
            return 'Agent Project v1';
        }
    }

    async runRequirementAgent(prompt: string, onStream?: (chunk: string) => void) {
        const sys = `You are a Senior Business Analyst Agent. Extract requirements from the user prompt.
    Output as JSON with userStories (array of strings), scope (string), and assumptions (array of strings).
    IMPORTANT: Return RAW JSON only. Do not format with Markdown. Do not include any conversational text. Start response with '{'.
    CRITICAL: Do NOT use triple quotes ("""). Use standard double quotes (") for all strings.
    ESCAPE ALL newlines within strings as \\n.`;

        const schema = {
            userStories: ["story 1", "story 2"],
            scope: "project scope description",
            assumptions: ["assumption 1"]
        };

        // Pass 'Requirement' role
        const res = await this.generate(`User request: ${prompt}`, sys, schema, undefined, 'Requirement', onStream);

        const parsed = this.parseJSON(res || '{}');
        if (parsed) return parsed;

        return { userStories: [], scope: "Failed to parse requirements", assumptions: [] };
    }

    async runDesignAgent(requirements: any, onStream?: (chunk: string) => void) {
        const sys = `You are a System & UI/UX Architect Agent. Design the architecture and wireframe structure based on requirements.
    Output JSON with architecture (markdown string), wireframes (markdown/description string), and apiContracts (markdown string).
    IMPORTANT: Return RAW JSON only. Do not format with Markdown. Do not include any conversational text. Start response with '{'.
    CRITICAL: Do NOT use triple quotes ("""). Use standard double quotes (") for all strings.
    ESCAPE ALL newlines within strings as \\n.`;

        const schema = {
            architecture: "markdown...",
            wireframes: "markdown...",
            apiContracts: "markdown..."
        };

        // Pass 'Design' role
        const res = await this.generate(`Requirements: ${JSON.stringify(requirements)}`, sys, schema, undefined, 'Design', onStream);

        const parsed = this.parseJSON(res || '{}');
        if (parsed) return parsed;

        return { architecture: "", wireframes: "", apiContracts: "" };
    }

    async runDevelopmentAgent(design: any, requirements: any, theme: string = 'ocean', onStream?: (chunk: string) => void) {
        const sys = `You are a Senior Frontend Engineer & UI Masterclass Expert. 
    You are generating a COMPLETE, production-ready React website.
    Your goal is to generate a beautiful, responsive, single-file React application following the '${theme}' aesthetic.

    CRITICAL RENDER RULES (DO NOT VIOLATE):
    1. The output MUST be valid React code.
    2. The final file MUST export a default React component named App.
    3. App MUST be a function component.
    4. Do NOT include explanations, markdown (except the code block), comments outside code, or text outside the code block.
    5. Do NOT generate HTML files, CSS files, or separate files.
    6. ALL logic, styles, and components MUST be inside the App file.
    7. Do NOT use ReactDOM.createRoot or render calls.
    8. Do NOT reference files, imports, or assets that do not exist.
    9. Do NOT leave placeholders or TODOs.
    10. The code MUST run without runtime errors.
    11. **NO EXPLANATION**: Output ONLY the raw source code. NO "Here is your code", NO commentary.

    ARCHITECTURE RULES:
    - App is the root component.
    - All sub-components are declared ABOVE App.
    - Inline styles or Tailwind-style classes only (no external CSS).
    - Use only standard React APIs.
    - Use "classic" React runtime (import React from 'react').
    - LIBRARIES: Use ONLY: react, lucide-react, framer-motion, clsx, tailwind-merge.

    THEME GUIDELINES (${theme}):
    ${theme === 'ocean' ? '- Primary: Indigo/Cyan, Neutrals: Slate. Vibe: Professional, Tech, Deep Space.' :
                theme === 'sunset' ? '- Primary: Orange/Rose, Neutrals: Zinc. Vibe: Energetic, Warm, Modern.' :
                    '- Primary: Emerald/Teal, Neutrals: Stone. Vibe: Natural, Growth, Clean.'}

    ### DESIGN PROTOCOL (LUXE-PRO):
    1. **Color Tokens**: Use #0f172a (main bg), #1e293b (section bg), Indigo-600 (accent), and Slate-500 (text-muted).
    2. **Layout Architecture**: Header (h-16, backdrop-blur-md, border-b border-slate-800, sticky top-0), Containers (Rounded-3xl, bg-slate-900/50, border border-slate-800, p-8).
    3. **Animations**: 
       - Shimmers: Use \`bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer\`.
       - Pulses: Subtle \`w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse\`.
       - Native Support: \`fade-in\`, \`zoom-in\`, and \`slide-in-from-bottom-4\` are natively supported utility classes. Use them for entry transitions.
    4. **Typography**: Large, tight tracking (tracking-tight), font-bold, tracking-tighter for headings.
    5. **Glassmorphism**: Combine \`backdrop-blur-xl\` with \`bg-slate-900/40\` and \`border-slate-800/50\`.
    6. **Micro-interactions**: Subtle \`hover:scale-[1.02]\` and \`active:scale-[0.98]\` on all buttons/cards.

    FINAL SAFETY CHECK (MANDATORY):
    Before outputting, verify that:
    - App is exported as \`export default function App() {}\`
    - No syntax errors exist
    - No missing imports exist
    - The code can render immediately

    TASK:
    Generate the complete premium UI React project for the '${theme}' theme now.
    Wrap your final code in triple backticks: \`\`\`tsx ... \`\`\``;

        const res = await this.generate(
            `Requirements: ${JSON.stringify(requirements).slice(0, 1000)}\nDesign Context: ${JSON.stringify(design).slice(0, 1000)}\nTarget Theme: ${theme}`,
            sys,
            undefined,
            undefined,
            'Development',
            onStream
        );

        // Manual Extraction of Code Block
        const codeMatch = (res || "").match(/```(?:tsx|jsx|typescript|javascript|ts|js)?\n([\s\S]*?)\n```/);
        const code = codeMatch ? codeMatch[1] : (res || "").trim();

        if (code && code.length > 50) {
            return {
                files: { "src/App.tsx": code },
                dependencies: {
                    "lucide-react": "^0.460.0",
                    "framer-motion": "^11.11.11",
                    "clsx": "^2.1.1",
                    "tailwind-merge": "^2.5.4"
                }
            };
        }

        return {
            files: {
                "src/App.tsx": `// Error: Failed to extract valid React code from response.\n/*\n${(res || "").slice(0, 500)}\n*/`
            },
            dependencies: {}
        };
    }

    async runModificationAgent(existingCode: string, modificationRequest: string, requirements: any, theme: string = 'ocean', onStream?: (chunk: string) => void) {
        const sys = `You are a Senior Frontend Engineer & UI/UX Expert. Your goal is to MODIFY an existing React application based on a new request.
    
    CRITICAL RENDER RULES (DO NOT VIOLATE):
    1. The output MUST be valid React code.
    2. The final file MUST export a default React component named App (\`export default function App() {}\`).
    3. App MUST be a function component.
    4. Do NOT include explanations, commentary, or text outside the code block.
    5. ALL logic, styles, and components MUST be inside the App file.
    
    MODIFICATION RULES:
    1. **PRESERVE**: Keep the core functionality and styling of the existing code unless asked to change it.
    2. **ENHANCE**: Apply the requested modifications precisely.
    3. **SINGLE FILE**: Output the complete updated code in "src/App.tsx".
    4. **NO BACKSLASHES**: Never use a backslash (\\) at the end of a line.

    Wrap your final code in triple backticks: \`\`\`tsx ... \`\`\``;

        const res = await this.generate(
            `Existing Code: ${existingCode.slice(0, 5000)}\nRequest: ${modificationRequest}\nTheme: ${theme}`,
            sys,
            undefined,
            undefined,
            'Modification',
            onStream
        );

        // Manual Extraction of Code Block
        const codeMatch = (res || "").match(/```(?:tsx|jsx|typescript|javascript|ts|js)?\n([\s\S]*?)\n```/);
        const code = codeMatch ? codeMatch[1] : (res || "").trim();

        if (code && code.length > 50) {
            return {
                files: { "src/App.tsx": code },
                dependencies: {
                    "lucide-react": "^0.460.0",
                    "framer-motion": "^11.11.11",
                    "clsx": "^2.1.1",
                    "tailwind-merge": "^2.5.4"
                }
            };
        }

        return {
            files: {
                "src/App.tsx": `// Error: Failed to extract valid React code from response.\n/*\n${(res || "").slice(0, 500)}\n*/`
            },
            dependencies: {}
        };
    }

    async runTestingAgent(code: string, requirements: any, onStream?: (chunk: string) => void) {
        const sys = `You are a QA Engineer Agent. Review the code against requirements and generate test cases and a results report.
    Output JSON with testCases (array of strings), results (string), and bugReports (string).`;

        const schema = {
            testCases: ["test 1"],
            results: "summary",
            bugReports: "none"
        };

        // Pass 'Testing' role
        const res = await this.generate(`Code: ${code.substring(0, 2000)}... (truncated). Requirements: ${JSON.stringify(requirements)}`, sys, schema, undefined, 'Testing', onStream);

        const parsed = this.parseJSON(res || '{}');
        if (parsed) return parsed;

        return { testCases: [], results: "Error parsing test results", bugReports: "" };
    }
}