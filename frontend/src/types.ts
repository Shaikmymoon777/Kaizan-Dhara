
export type AgentRole = 'Orchestrator' | 'Requirement' | 'Design' | 'Development' | 'Testing' | 'Parallel' | 'User';

export interface AgentMessage {
  id: string;
  role: AgentRole;
  content: string;
  timestamp: Date;
  status: 'thinking' | 'done' | 'error';
}

export interface SDLCProject {
  id: string;
  prompt: string;
  name: string;
  attachments?: {
    name: string;
    type: string;
    content: string;
  }[];
  theme?: string;
  requirements?: {
    // New schema
    projectTitle?: string;
    executiveSummary?: string;
    scope?: string | { inScope: string[]; outOfScope: string[] };
    technicalConstraints?: string[];
    dataEntities?: string[];
    assumptions?: string[];
    // Rich schema (old App.tsx compatible)
    projectOverview?: string;
    businessObjectives?: string;
    stakeholders?: string[];
    functionalRequirements?: string[];
    nonFunctionalRequirements?: string[];
    assumptionsAndConstraints?: string[];
    userStories: {
      id: string;
      story: string;
      acceptanceCriteria: string[];
      priority?: string;
      description?: string;
    }[];
  };
  design?: {
    // Flat schema (new frontend)
    architectureDiagram?: string;
    componentDiagram?: string;
    erDiagram?: string;
    sequenceDiagram?: string;
    lldDiagram?: string;
    componentStructure?: string[];
    wireframes?: string;
    apiEndpoints?: string[];
    designSystem?: string;
    architecture?: string;
    apiContracts?: string;
    // Rich nested schema (old App.tsx compatible)
    hld?: {
      systemArchitectureOverview?: string;
      architectureDiagram?: string;
      componentDiagram?: string;
      dataFlowDescription?: string;
      externalIntegrations?: string[];
      technologyStackOverview?: string;
    };
    lld?: {
      detailedComponentDesign?: string;
      classDiagram?: string;
      apiEndpoints?: { method: string; endpoint: string; request: string; response: string }[];
      dataModels?: string;
      uiComponentStructure?: string;
      sequenceFlows?: string;
    };
    databaseDesign?: {
      erDiagram?: string;
      tables?: { name: string; fields: string; relationships: string }[];
    };
  };
  devDocs?: {
    techStack?: string;
    projectStructure?: string;
    setupInstructions?: string;
    keyComponentsDescription?: string;
    apiIntegrationDetails?: string;
    environmentVariables?: string;
    deploymentOverview?: string;
  };
  code?: string | Record<string, string>;
  tests?: {
    // New schema
    executiveSummary?: string;
    codeAudit?: string;
    identifiedIssues?: string[];
    results?: string;
    bugReports?: string;
    // Rich schema (old App.tsx compatible)
    testPlan?: {
      testingScope?: string;
      testingStrategy?: string;
      toolsAndEnvironment?: string;
      entryExitCriteria?: string;
    };
    testDesign?: {
      testScenarios?: string[];
      testCoverage?: string;
    };
    testExecutionReport?: {
      summary?: string;
      passFailMetrics?: string;
      defectSummary?: string;
    };
    testCases: {
      id: string;
      description: string;
      status: string;
      notes?: string;
      severity?: string;
      steps?: string[];
      expectedResult?: string;
      actualResult?: string;
    }[];
  };
  // ── Parallel Validation Pack Outputs ──────────────────────────
  reqValidation?: {
    score: number;
    strengths: string[];
    gaps: string[];
    recommendation: string;
  };
  designReview?: {
    score: number;
    architectureRisks: string[];
    recommendations: string[];
    summary: string;
  };
  codeAnalysis?: {
    score: number;
    issuesFound: string[];
    securityFlags: string[];
    a11yGaps: string[];
    summary: string;
  };
  figmaData?: any;
  // ──────────────────────────────────────────────────────────────
  currentStep: number;
  waitingForApproval?: boolean;
  isProcessing: boolean;
  completedAt?: Date;
}

export interface IAgentService {
  runRequirementAgent(prompt: string, attachments?: any[], brdData?: any, figmaData?: any): Promise<any>;
  runDesignAgent(requirements: any, theme?: string, feedback?: string, figmaData?: any): Promise<any>;
  runDevelopmentAgent(design: any, requirements: any, prompt: string, theme?: string, feedback?: string, existingCode?: string | Record<string, string>, figmaData?: any): Promise<any>;
  runTestingAgent(code: string | Record<string, string>, requirements: any, prompt: string, feedback?: string, figmaData?: any): Promise<any>;
  runParallelReqValidation(requirements: any): Promise<any>;
  runParallelDesignReview(design: any, requirements: any): Promise<any>;
  runParallelCodeTesting(code: string | Record<string, string>, requirements: any): Promise<any>;
}

export interface HistoryItem {
  id: string;
  name: string;
  prompt: string;
  timestamp: Date;
  project: SDLCProject;
}
