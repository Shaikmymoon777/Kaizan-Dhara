
export type AgentRole = 'Orchestrator' | 'Requirement' | 'Design' | 'Development' | 'Testing' | 'User';

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
    content: string; // Base64 or URL
  }[];
  theme?: string;
  requirements?: {
    projectTitle: string;
    executiveSummary: string;
    userStories: {
      id: string;
      story: string;
      acceptanceCriteria: string[];
      priority: string
    }[];
    scope: string;
    technicalConstraints: string[];
    dataEntities: string[];
    assumptions?: string[]; // Backward compat
  };
  design?: {
    architectureDiagram: string;
    componentStructure: string[];
    wireframes: string;
    apiEndpoints: string[];
    designSystem: string;
    // Backward compat
    architecture?: string;
    apiContracts?: string;
  };
  code?: string | Record<string, string>;
  tests?: {
    executiveSummary: string;
    testCases: {
      id: string;
      description: string;
      status: string;
      notes: string
    }[];
    codeAudit: string;
    identifiedIssues: string[];
    // Backward compat
    results?: string;
    bugReports?: string;
  };
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
