export enum ExperimentStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED'
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  notes?: string; // For Experiment Ideas, Overall Progress, Problems
}

export interface Experiment {
  id: string;
  projectId: string;
  title: string;
  status: ExperimentStatus;
  createdAt: number;
  updatedAt: number;
  // Modular content sections
  purpose: string;
  methods: string;
  results: string;
  conclusion: string;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}