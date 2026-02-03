
export type AgentRole = 'User' | 'Orchestrator' | 'Requirement' | 'Design' | 'Development' | 'Testing';

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
  requirements?: {
    userStories: string[];
    scope: string;
    assumptions: string[];
  };
  design?: {
    architecture: string;
    wireframes: string;
    apiContracts: string;
  };
  code?: {
    files: { [filename: string]: string };
    dependencies: { [pkg: string]: string };
  };
  tests?: {
    testCases: string[];
    results: string;
    bugReports: string;
  };
  currentStep: number;
  isProcessing: boolean;
  createdAt?: Date;
  completedAt?: Date;
  theme?: string;
}

export interface HistoryItem {
  id: string;
  prompt: string;
  name: string;
  timestamp: Date;
  project: SDLCProject;
  preview?: string; // Short preview of the project
}

export interface UserPreferences {
  theme: 'ocean' | 'sunset' | 'forest';
  historyLimit: number;
  autoSave: boolean;
}
