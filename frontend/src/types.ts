
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
    projectOverview?: string;
    businessObjectives?: string;
    scope?: { inScope: string[]; outOfScope: string[] };
    stakeholders?: string[];
    functionalRequirements?: string[];
    nonFunctionalRequirements?: string[];
    userStories: {
      id: string;
      story: string;
      acceptanceCriteria: string[];
      priority?: string;
      description?: string;
    }[];
    assumptionsAndConstraints?: string[];
  };
  design?: {
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
      apiEndpoints?: { method: string; endpoint: string; request: string; response: string }[];
      dataModels?: string;
      uiComponentStructure?: string;
      sequenceFlows?: string;
      classDiagram?: string;
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
    testCases: {
      id: string;
      description: string;
      steps: string[];
      expectedResult: string;
      actualResult: string;
      status: string;
    }[];
    testExecutionReport?: {
      summary?: string;
      passFailMetrics?: string;
      defectSummary?: string;
    };
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

export interface HistoryItem {
  id: string;
  name: string;
  prompt: string;
  timestamp: Date;
  project: SDLCProject;
}
