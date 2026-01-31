import { Project, Experiment, ExperimentStatus, Task } from '../types';

const PROJECTS_KEY = 'labnote_projects';
const EXPERIMENTS_KEY = 'labnote_experiments';
const TASKS_KEY = 'labnote_tasks';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

export const StorageService = {
  getProjects: (): Project[] => {
    const data = localStorage.getItem(PROJECTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveProject: (name: string): Project => {
    const projects = StorageService.getProjects();
    const newProject: Project = {
      id: generateId(),
      name,
      createdAt: Date.now(),
      notes: ''
    };
    localStorage.setItem(PROJECTS_KEY, JSON.stringify([...projects, newProject]));
    return newProject;
  },

  updateProject: (updatedProject: Project) => {
    const projects = StorageService.getProjects();
    const index = projects.findIndex(p => p.id === updatedProject.id);
    if (index !== -1) {
      projects[index] = updatedProject;
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    }
  },

  deleteProject: (id: string) => {
    const projects = StorageService.getProjects();
    const filtered = projects.filter(p => p.id !== id);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(filtered));
    
    // Cleanup associated experiments
    const experiments = StorageService.getExperiments();
    const filteredExp = experiments.filter(e => e.projectId !== id);
    localStorage.setItem(EXPERIMENTS_KEY, JSON.stringify(filteredExp));
  },

  getExperiments: (projectId?: string): Experiment[] => {
    const data = localStorage.getItem(EXPERIMENTS_KEY);
    let allExperiments: any[] = data ? JSON.parse(data) : [];
    
    // Migration: ensure new fields exist for old data
    allExperiments = allExperiments.map(e => ({
      ...e,
      purpose: e.purpose || (e.content ? e.content : ''), // Fallback for migration
      methods: e.methods || '',
      results: e.results || '',
      conclusion: e.conclusion || ''
    }));

    if (projectId) {
      return allExperiments
        .filter(e => e.projectId === projectId)
        .sort((a: Experiment, b: Experiment) => b.updatedAt - a.updatedAt);
    }
    return allExperiments.sort((a: Experiment, b: Experiment) => b.updatedAt - a.updatedAt);
  },

  saveExperiment: (experiment: Experiment) => {
    const experiments = StorageService.getExperiments();
    const index = experiments.findIndex(e => e.id === experiment.id);
    
    if (index >= 0) {
      experiments[index] = { ...experiment, updatedAt: Date.now() };
    } else {
      experiments.push(experiment);
    }
    
    localStorage.setItem(EXPERIMENTS_KEY, JSON.stringify(experiments));
  },

  createExperiment: (projectId: string, title: string): Experiment => {
    const newExperiment: Experiment = {
      id: generateId(),
      projectId,
      title,
      status: ExperimentStatus.IN_PROGRESS,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      // Initialized with empty strings as requested
      purpose: '',
      methods: '',
      results: '',
      conclusion: ''
    };
    StorageService.saveExperiment(newExperiment);
    return newExperiment;
  },
  
  copyExperiment: (originalId: string): Experiment | null => {
    const experiments = StorageService.getExperiments();
    const source = experiments.find(e => e.id === originalId);
    if (!source) return null;

    const newExperiment: Experiment = {
      ...source,
      id: generateId(),
      title: `${source.title} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // Insert at the beginning of the list to show up first
    experiments.unshift(newExperiment);
    localStorage.setItem(EXPERIMENTS_KEY, JSON.stringify(experiments));
    return newExperiment;
  },

  deleteExperiment: (id: string) => {
    const experiments = StorageService.getExperiments();
    const filtered = experiments.filter(e => e.id !== id);
    localStorage.setItem(EXPERIMENTS_KEY, JSON.stringify(filtered));
  },

  // Task Management
  getTasks: (): Task[] => {
    const data = localStorage.getItem(TASKS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveTasks: (tasks: Task[]) => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  },

  // --- Data Backup & Restore ---

  exportAllData: (): string => {
    const backup = {
      version: 1,
      timestamp: Date.now(),
      projects: StorageService.getProjects(),
      experiments: StorageService.getExperiments(),
      tasks: StorageService.getTasks()
    };
    return JSON.stringify(backup, null, 2);
  },

  importAllData: (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      
      // Basic validation
      if (!data.projects || !Array.isArray(data.projects)) throw new Error("Invalid Projects Data");
      if (!data.experiments || !Array.isArray(data.experiments)) throw new Error("Invalid Experiments Data");
      
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(data.projects));
      localStorage.setItem(EXPERIMENTS_KEY, JSON.stringify(data.experiments));
      localStorage.setItem(TASKS_KEY, JSON.stringify(data.tasks || []));
      
      return true;
    } catch (e) {
      console.error("Import failed:", e);
      return false;
    }
  }
};