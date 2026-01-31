import React, { useState, useEffect, useRef } from 'react';
import { Project, Experiment, ExperimentStatus, Task, GitHubConfig } from './types';
import { StorageService } from './services/storageService';
import { GitHubService } from './services/githubService';
import RichEditor from './components/RichEditor';
import { 
  Plus, FlaskConical, ChevronRight, LayoutGrid, 
  Trash2, ArrowLeft, Calendar, Search, X,
  MoreHorizontal, Copy, Check, FileDown, ClipboardList,
  Activity, BookOpen, History, ChevronLeft,
  Lock, LogIn, Download, UploadCloud, Github, Settings, RefreshCw
} from 'lucide-react';

// --- Color Constants & Styles ---
const COLORS = {
  primary: 'indigo',
  sidebar: 'bg-slate-800',
  sidebarHover: 'hover:bg-slate-700',
  sidebarActive: 'bg-indigo-500/20 text-indigo-200 border-r-2 border-indigo-400',
  bg: 'bg-slate-50',
};

type AppView = 'DASHBOARD' | 'EDITOR' | 'TASKS' | 'PROJECT_NOTES' | 'IN_PROGRESS';

const App = () => {
  // --- Auth State ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // --- App State ---
  const [currentView, setCurrentView] = useState<AppView>('DASHBOARD');
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Task State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [taskViewMode, setTaskViewMode] = useState<'LIST' | 'WORKFLOW'>('LIST');
  const [selectedTaskDate, setSelectedTaskDate] = useState<Date>(new Date());
  
  const taskInputRef = useRef<HTMLTextAreaElement>(null);
  const fileImportRef = useRef<HTMLInputElement>(null);

  // UI State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [copyConfirmExp, setCopyConfirmExp] = useState<Experiment | null>(null);

  // Modal / Input States
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  
  // New Experiment Modal State
  const [isNewExpModalOpen, setIsNewExpModalOpen] = useState(false);
  const [newExpTitle, setNewExpTitle] = useState('');

  // --- GitHub State ---
  const [showSettings, setShowSettings] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [ghConfig, setGhConfig] = useState<GitHubConfig>({
    token: '',
    owner: '',
    repo: '',
    branch: 'main',
    path: 'labnote_data.json'
  });

  // --- Effects ---
  
  // Auth Check
  useEffect(() => {
    const sessionAuth = sessionStorage.getItem('labnote_auth');
    if (sessionAuth === 'true') {
      setIsAuthenticated(true);
    }
    
    // Load GitHub Config
    const savedGhConfig = localStorage.getItem('labnote_gh_config');
    if (savedGhConfig) {
      setGhConfig(JSON.parse(savedGhConfig));
    }
  }, []);

  // Data Load
  useEffect(() => {
    if (isAuthenticated) {
      const loadedProjects = StorageService.getProjects();
      setProjects(loadedProjects);
      
      const loadedTasks = StorageService.getTasks();
      setTasks(loadedTasks);
    }
  }, [isAuthenticated]);

  // Handle Loading Experiments based on Context
  useEffect(() => {
    if (!isAuthenticated) return;
    
    if (currentView === 'DASHBOARD' && selectedProject) {
      const loadedExperiments = StorageService.getExperiments(selectedProject.id);
      setExperiments(loadedExperiments);
    } else if (currentView === 'IN_PROGRESS') {
      const allExperiments = StorageService.getExperiments();
      setExperiments(allExperiments.filter(e => e.status === ExperimentStatus.IN_PROGRESS));
      setSelectedProject(null); // Clear selected project when in global view
    } else {
      // Keep experiments state if just entering editor, otherwise clear if no context
      if (currentView !== 'EDITOR') {
        // Optional: clear experiments if navigating away?
      }
    }
    setActiveMenuId(null);
  }, [selectedProject, currentView, isAuthenticated]);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeMenuId && !(event.target as Element).closest('.action-menu-trigger')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuId]);

  // --- Handlers ---

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '1211') {
      setIsAuthenticated(true);
      setAuthError('');
      sessionStorage.setItem('labnote_auth', 'true');
    } else {
      setAuthError('Incorrect Password');
      setPasswordInput('');
    }
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const newProject = StorageService.saveProject(newProjectName);
    setProjects([...projects, newProject]);
    setNewProjectName('');
    setShowNewProjectInput(false);
    setSelectedProject(newProject);
    setCurrentView('DASHBOARD');
  };

  const handleUpdateProjectNotes = (notes: string) => {
    if (selectedProject) {
      const updated = { ...selectedProject, notes };
      StorageService.updateProject(updated);
      setSelectedProject(updated);
      setProjects(projects.map(p => p.id === updated.id ? updated : p));
    }
  };

  const handleDeleteProject = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure? This will delete all experiments within this project.')) {
      StorageService.deleteProject(projectId);
      setProjects(projects.filter(p => p.id !== projectId));
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
        setSelectedExperiment(null);
        setCurrentView('DASHBOARD'); // Reset view
      }
    }
  };

  const handleOpenNewExpModal = () => {
    if (!selectedProject) return;
    setNewExpTitle('');
    setIsNewExpModalOpen(true);
  };

  const handleCreateExperiment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newExpTitle.trim()) return;
    
    const newExp = StorageService.createExperiment(selectedProject.id, newExpTitle.trim());
    setExperiments([newExp, ...experiments]);
    setSelectedExperiment(newExp);
    setCurrentView('EDITOR');
    setIsNewExpModalOpen(false);
  };

  const handleDeleteExperiment = (e: React.MouseEvent, expId: string) => {
    e.stopPropagation();
    setActiveMenuId(null);
    if (confirm('Delete this experiment record?')) {
      StorageService.deleteExperiment(expId);
      setExperiments(experiments.filter(ex => ex.id !== expId));
      if (selectedExperiment?.id === expId) {
        setSelectedExperiment(null);
        setCurrentView('DASHBOARD');
      }
    }
  };

  const handleUpdateExperiment = (updates: Partial<Experiment>, expId: string = selectedExperiment?.id || '') => {
    if (!expId) return;
    
    // Find current exp to merge
    const current = experiments.find(e => e.id === expId);
    if (!current) return;

    const updated = { ...current, ...updates };
    StorageService.saveExperiment(updated);
    
    // Update local list
    setExperiments(experiments.map(e => e.id === updated.id ? updated : e));
    
    // Update selected if match
    if (selectedExperiment?.id === updated.id) {
      setSelectedExperiment(updated);
    }
  };

  const handleCopyExperimentRequest = (e: React.MouseEvent, exp: Experiment) => {
    e.stopPropagation();
    setActiveMenuId(null);
    setCopyConfirmExp(exp);
  };

  const confirmCopyExperiment = () => {
    if (!copyConfirmExp) return;
    const newExp = StorageService.copyExperiment(copyConfirmExp.id);
    if (newExp) {
      setExperiments([newExp, ...experiments]);
    }
    setCopyConfirmExp(null);
  };

  // --- Data Backup & Restore Handlers ---

  const handleBackupData = () => {
    const dataStr = StorageService.exportAllData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `LabNote_Backup_${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRestoreClick = () => {
    if (confirm('Importing data will OVERWRITE all current projects and experiments. Continue?')) {
      fileImportRef.current?.click();
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = StorageService.importAllData(content);
      if (success) {
        alert('Data restored successfully! The page will reload.');
        window.location.reload();
      } else {
        alert('Failed to import data. Invalid file format.');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  // --- GitHub Sync Handlers ---

  const saveGhConfig = () => {
    localStorage.setItem('labnote_gh_config', JSON.stringify(ghConfig));
    setShowSettings(false);
  };

  const handleSyncToGitHub = async () => {
    if (!ghConfig.token || !ghConfig.repo) {
      setShowSettings(true);
      return;
    }
    
    setIsSyncing(true);
    try {
      // 1. Get current SHA if exists
      const existing = await GitHubService.getFile(ghConfig);
      
      // 2. Prepare content
      const content = StorageService.exportAllData();
      
      // 3. Upload
      await GitHubService.saveFile(ghConfig, content, existing?.sha);
      
      alert('Success: Data saved to GitHub repository!');
    } catch (e: any) {
      alert(`Error syncing to GitHub: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLoadFromGitHub = async () => {
    if (!ghConfig.token || !ghConfig.repo) {
      setShowSettings(true);
      return;
    }

    if (!confirm('This will replace your LOCAL data with data from GitHub. Continue?')) return;

    setIsSyncing(true);
    try {
      const result = await GitHubService.getFile(ghConfig);
      if (!result) {
        alert('File not found in repository.');
        return;
      }
      
      const success = StorageService.importAllData(result.content);
      if (success) {
        alert('Data loaded from GitHub successfully! Reloading...');
        window.location.reload();
      } else {
        alert('Failed to parse data from GitHub.');
      }
    } catch (e: any) {
      alert(`Error loading from GitHub: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportExperiment = (e: React.MouseEvent, exp: Experiment) => {
    e.stopPropagation();
    setActiveMenuId(null);
    // ... (Existing export logic preserved, abbreviated for clarity but logic remains)
    // Date formatter YYYY-MM-DD for display
    const formatDateISO = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    // Date formatter YYYYMMDD for filename
    const formatDateFilename = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}${m}${d}`;
    };

    const expDate = new Date(exp.createdAt);
    const startDate = formatDateISO(expDate);
    const endDate = formatDateISO(new Date());
    const datePrefix = formatDateFilename(expDate);

    const content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${exp.title}</title>
        <style>
          body { font-family: 'SimSun', 'Songti SC', serif; font-size: 10.5pt; line-height: 1.5; color: #000; }
          h1 { font-family: 'SimHei', 'Heiti SC', sans-serif; font-size: 18pt; text-align: center; margin: 20px 0 10px 0; font-weight: bold; }
          .company-name { font-family: 'SimHei', 'Heiti SC', sans-serif; font-size: 10.5pt; text-align: right; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; border: 1px solid #000; table-layout: fixed; }
          td { border: 1px solid #000; padding: 8px; vertical-align: middle; word-wrap: break-word; }
          .col-label { width: 120px; text-align: center; font-family: 'SimHei', 'Heiti SC', sans-serif; font-weight: bold; background-color: #fff; }
          .col-content { text-align: left; font-family: 'SimSun', serif; }
          img { max-width: 100%; height: auto; margin: 5px 0; }
          p { margin: 0 0 5px 0; }
          .footer-container { margin-top: 20px; font-family: 'SimSun', serif; overflow: hidden; }
          .footer-left { float: left; }
          .footer-right { float: right; }
        </style>
      </head>
      <body>
        <h1>项目开发实验记录</h1>
        <div class="company-name">修实生物医药（南通）有限公司</div>
        <table>
          <colgroup><col width="120" /><col /></colgroup>
          <tr><td class="col-label">实验名称</td><td class="col-content">${exp.title}</td></tr>
          <tr><td class="col-label">实验目的</td><td class="col-content">${exp.purpose || ''}</td></tr>
          <tr><td class="col-label">实验准备</td><td class="col-content" style="height: 80px;"></td></tr>
          <tr><td class="col-label">主要仪器</td><td class="col-content" style="height: 80px;"></td></tr>
          <tr><td class="col-label">实验步骤</td><td class="col-content" style="min-height: 150px;">${exp.methods || ''}</td></tr>
          <tr><td class="col-label">实验结果</td><td class="col-content" style="min-height: 150px;">${exp.results || ''}</td></tr>
          <tr><td class="col-label">实验结论</td><td class="col-content" style="min-height: 100px;">${exp.conclusion || ''}</td></tr>
        </table>
        <div class="footer-container">
          <div class="footer-left">实验人：</div>
          <div class="footer-right">实验起止日期：${startDate} 至 ${endDate}</div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${datePrefix}-${exp.title.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_').substring(0, 50)}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Task Handlers
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const lines = newTaskText.trim().split(/\n+/);
    const now = new Date();
    const taskCreatedAt = new Date(selectedTaskDate);
    taskCreatedAt.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

    const newTasks: Task[] = lines.map(line => ({
      id: Math.random().toString(36).substr(2, 9) + Date.now(),
      text: line.trim(),
      completed: false,
      createdAt: taskCreatedAt.getTime()
    })).filter(t => t.text);

    const updatedTasks = [...newTasks, ...tasks];
    updatedTasks.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return b.createdAt - a.createdAt;
    });

    setTasks(updatedTasks);
    StorageService.saveTasks(updatedTasks);
    setNewTaskText('');
    
    if (taskInputRef.current) taskInputRef.current.style.height = 'auto';
  };

  const handleToggleTask = (taskId: string) => {
    const updated = tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
    updated.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1; // completed (true) goes to bottom
      return b.createdAt - a.createdAt;
    });
    setTasks(updated);
    StorageService.saveTasks(updated);
  };

  const handleDeleteTask = (taskId: string) => {
    const updated = tasks.filter(t => t.id !== taskId);
    setTasks(updated);
    StorageService.saveTasks(updated);
  };

  const formatDate = (ts: number) => {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(ts));
  };
  
  const getLocalDateString = (ts: number | Date) => {
    const date = typeof ts === 'object' ? ts : new Date(ts);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const [y, m, d] = e.target.value.split('-').map(Number);
    const newDate = new Date(y, m - 1, d, 12, 0, 0);
    handleUpdateExperiment({ createdAt: newDate.getTime() });
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  };

  const changeTaskDate = (days: number) => {
    const newDate = new Date(selectedTaskDate);
    newDate.setDate(selectedTaskDate.getDate() + days);
    setSelectedTaskDate(newDate);
  };

  const handleTaskDatePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const [y, m, d] = e.target.value.split('-').map(Number);
    const newDate = new Date(y, m - 1, d, 12, 0, 0); 
    setSelectedTaskDate(newDate);
  };

  // --- Login Screen ---
  if (!isAuthenticated) {
    return (
      <div className="h-screen w-full bg-slate-900 flex items-center justify-center p-4">
         <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
            <div className="flex justify-center mb-6">
               <div className="bg-indigo-100 p-3 rounded-full">
                 <Lock className="text-indigo-600 w-8 h-8" />
               </div>
            </div>
            <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">LabNote Pro</h1>
            <p className="text-center text-slate-500 text-sm mb-6">Secure Access Required</p>
            <form onSubmit={handleLogin} className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input 
                    type="password" 
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-center tracking-widest text-lg"
                    placeholder="••••"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    autoFocus
                  />
               </div>
               {authError && <div className="text-red-500 text-xs text-center font-medium bg-red-50 py-2 rounded">{authError}</div>}
               <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                 <LogIn size={18} /> Unlock System
               </button>
            </form>
         </div>
      </div>
    );
  }

  // --- Render Sections ---

  const renderProjectNotes = () => {
    if (!selectedProject) return null;
    return (
      <div className="flex-1 bg-white flex flex-col h-full overflow-hidden">
        <header className="px-8 py-6 border-b border-slate-200 flex items-center gap-4 bg-white z-10">
           <button onClick={() => setCurrentView('DASHBOARD')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
             <ArrowLeft size={20} />
           </button>
           <div>
             <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Project Notes: {selectedProject.name}</h2>
             <p className="text-slate-500 text-sm mt-1">Experiment ideas, overall progress, and issues.</p>
           </div>
           <div className="ml-auto">
             <span className="flex items-center gap-2 text-emerald-600 text-sm font-medium bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100">
                <Check size={16} /> Saved
             </span>
           </div>
        </header>
        <div className="flex-1 p-8 bg-slate-50/50 overflow-y-auto">
          <div className="max-w-4xl mx-auto h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200">
             <RichEditor 
               initialContent={selectedProject.notes || ''}
               onChange={handleUpdateProjectNotes}
               className="h-full border-none rounded-none shadow-none"
               minHeight="100%"
             />
          </div>
        </div>
      </div>
    );
  };

  const renderTaskPage = () => {
    const groupedTasks: Record<string, Task[]> = {};
    if (taskViewMode === 'WORKFLOW') {
      [...tasks].sort((a, b) => b.createdAt - a.createdAt).forEach(task => {
        const dateKey = getLocalDateString(task.createdAt);
        if (!groupedTasks[dateKey]) groupedTasks[dateKey] = [];
        groupedTasks[dateKey].push(task);
      });
    }
    const activeDateTasks = tasks.filter(t => isSameDay(new Date(t.createdAt), selectedTaskDate));

    return (
      <div className="flex-1 bg-white flex flex-col h-full overflow-hidden">
        <header className="px-8 py-6 border-b border-slate-200 bg-white z-10">
          <div className="flex items-center justify-between mb-4">
             <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                  <ClipboardList className="text-indigo-600" />
                  Task Management
                </h2>
                <p className="text-slate-500 text-sm mt-1">Track your daily research activities.</p>
             </div>
             <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => setTaskViewMode('LIST')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${taskViewMode === 'LIST' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Daily List
                </button>
                <button 
                  onClick={() => setTaskViewMode('WORKFLOW')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${taskViewMode === 'WORKFLOW' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <History size={14} /> Workflow
                </button>
             </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
          <div className="max-w-3xl mx-auto">
            {taskViewMode === 'LIST' && (
              <>
                <div className="flex items-center justify-between mb-6 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                  <button onClick={() => changeTaskDate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors"><ChevronLeft size={20} /></button>
                  <div className="flex items-center gap-2 group relative">
                    <Calendar size={18} className="text-indigo-500" />
                    <span className="font-semibold text-slate-700 text-lg">
                      {selectedTaskDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    <input type="date" className="absolute inset-0 opacity-0 cursor-pointer" value={getLocalDateString(selectedTaskDate)} onChange={handleTaskDatePick} />
                  </div>
                  <button onClick={() => changeTaskDate(1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors"><ChevronRight size={20} /></button>
                </div>
                <form onSubmit={handleAddTask} className="mb-6 group">
                  <div className="relative">
                    <textarea
                      ref={taskInputRef}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none shadow-sm text-base bg-white placeholder:text-slate-400"
                      placeholder={`Add a new task for ${selectedTaskDate.toLocaleDateString()}...`}
                      rows={1}
                      value={newTaskText}
                      onChange={(e) => {
                        setNewTaskText(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddTask(e); }
                      }}
                      style={{ minHeight: '52px', overflow: 'hidden' }}
                    />
                  </div>
                </form>
                <ul className="space-y-3">
                  {activeDateTasks.map(task => (
                    <li key={task.id} className={`flex items-start gap-4 p-4 rounded-xl border transition-all group shadow-sm ${task.completed ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-md'}`}>
                      <div className="pt-0.5">
                        <button onClick={() => handleToggleTask(task.id)} className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-indigo-400 text-transparent'}`}>
                          <Check size={14} strokeWidth={3} />
                        </button>
                      </div>
                      <span className={`flex-1 text-base leading-relaxed break-words ${task.completed ? 'text-emerald-700' : 'text-slate-700'}`}>{task.text}</span>
                      <button onClick={() => handleDeleteTask(task.id)} className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                    </li>
                  ))}
                  {activeDateTasks.length === 0 && (
                     <div className="text-center text-slate-400 py-12 flex flex-col items-center gap-2">
                       <ClipboardList size={48} className="text-slate-200" />
                       <p>No tasks for this date.</p>
                     </div>
                  )}
                </ul>
              </>
            )}

            {taskViewMode === 'WORKFLOW' && (
              <div className="py-4">
                 {Object.keys(groupedTasks).length === 0 && <div className="text-center text-slate-400 py-12 flex flex-col items-center gap-2"><History size={48} className="text-slate-200" /><p>No task history available.</p></div>}
                {Object.entries(groupedTasks).map(([dateStr, dayTasks]) => {
                  const dateObj = new Date(dateStr);
                  const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                  return (
                    <div key={dateStr} className="flex gap-4 group">
                       <div className="w-24 text-right shrink-0 pt-0 relative">
                          <div className="sticky top-6">
                            <div className="font-bold text-slate-700 text-lg">{dateStr}</div>
                            <div className="text-xs text-indigo-500 font-bold uppercase tracking-wider">{weekday}</div>
                          </div>
                       </div>
                       <div className="border-l-2 border-indigo-100 pl-8 pb-8 flex-1 relative min-h-[80px]">
                          <div className="absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white group-hover:scale-110 transition-transform"></div>
                          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow">
                             <ul className="space-y-3">
                                {dayTasks.map(task => (
                                   <li key={task.id} className="flex items-start gap-3">
                                      <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${task.completed ? 'bg-emerald-400' : 'bg-slate-300'}`}></div>
                                      <span className={`text-sm leading-relaxed ${task.completed ? 'text-slate-500' : 'text-slate-700'}`}>{task.text}</span>
                                   </li>
                                ))}
                             </ul>
                          </div>
                       </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCopyModal = () => {
    if (!copyConfirmExp) return null;
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
           <h3 className="text-lg font-bold text-slate-800 mb-2">Duplicate Experiment?</h3>
           <p className="text-slate-600 mb-6">Create a copy of "{copyConfirmExp.title}"?</p>
           <div className="flex justify-end gap-3">
             <button onClick={() => setCopyConfirmExp(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
             <button onClick={confirmCopyExperiment} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Duplicate</button>
           </div>
        </div>
      </div>
    );
  };

  const renderGitHubModal = () => {
    if (!showSettings) return null;
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
           <div className="bg-slate-900 p-6">
             <div className="flex items-center gap-2 text-white mb-2">
               <Github size={24} />
               <h3 className="text-lg font-bold">GitHub Sync Settings</h3>
             </div>
             <p className="text-slate-400 text-sm">Sync your data directly to a private GitHub repository.</p>
           </div>
           
           <div className="p-6 space-y-4">
             <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Personal Access Token (PAT)</label>
               <input 
                 type="password" 
                 value={ghConfig.token}
                 onChange={(e) => setGhConfig({...ghConfig,token: e.target.value})}
                 className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                 placeholder="ghp_xxxxxxxxxxxx"
               />
               <p className="text-[10px] text-slate-400 mt-1">Requires 'repo' scope.</p>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Owner (User/Org)</label>
                  <input 
                    type="text" 
                    value={ghConfig.owner}
                    onChange={(e) => setGhConfig({...ghConfig, owner: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="e.g. johndoe"
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Repository</label>
                  <input 
                    type="text" 
                    value={ghConfig.repo}
                    onChange={(e) => setGhConfig({...ghConfig, repo: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="e.g. lab-notes"
                  />
               </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Branch</label>
                  <input 
                    type="text" 
                    value={ghConfig.branch}
                    onChange={(e) => setGhConfig({...ghConfig, branch: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Filename</label>
                  <input 
                    type="text" 
                    value={ghConfig.path}
                    onChange={(e) => setGhConfig({...ghConfig, path: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
             </div>
             
             <div className="flex justify-end gap-3 mt-6">
               <button onClick={() => setShowSettings(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium">Cancel</button>
               <button onClick={saveGhConfig} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">Save Configuration</button>
             </div>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex h-screen ${COLORS.bg}`}>
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 flex-shrink-0 z-20`}>
        <div className="p-4 flex items-center gap-3 border-b border-slate-800 h-16">
          <FlaskConical className={`text-indigo-400 shrink-0 ${isSidebarOpen ? 'w-8 h-8' : 'w-8 h-8 mx-auto'}`} />
          {isSidebarOpen && <h1 className="font-bold text-xl text-white tracking-wide">LabNote Pro</h1>}
        </div>

        <div className="flex-1 overflow-y-auto py-6 space-y-8">
           {/* Section 1: Dashboard & Tasks */}
           <div className="px-3 space-y-1">
             <button onClick={() => { setCurrentView('DASHBOARD'); setSelectedProject(null); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${currentView === 'DASHBOARD' && !selectedProject ? COLORS.sidebarActive : 'hover:bg-slate-800 text-slate-400'}`}>
                <LayoutGrid size={20} className="shrink-0" />
                {isSidebarOpen && <span className="font-medium">Dashboard</span>}
             </button>
             <button onClick={() => { setCurrentView('IN_PROGRESS'); setSelectedProject(null); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${currentView === 'IN_PROGRESS' ? COLORS.sidebarActive : 'hover:bg-slate-800 text-slate-400'}`}>
                <Activity size={20} className="shrink-0" />
                {isSidebarOpen && <span className="font-medium">In Progress</span>}
             </button>
             <button onClick={() => { setCurrentView('TASKS'); setSelectedProject(null); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${currentView === 'TASKS' ? COLORS.sidebarActive : 'hover:bg-slate-800 text-slate-400'}`}>
                <ClipboardList size={20} className="shrink-0" />
                {isSidebarOpen && <span className="font-medium">Tasks</span>}
             </button>
           </div>

           {/* Section 2: Projects */}
           <div className="px-3">
             {isSidebarOpen && (
               <div className="flex items-center justify-between px-3 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                 <span>Projects</span>
                 <button onClick={() => setShowNewProjectInput(true)} className="hover:text-indigo-400 transition-colors"><Plus size={14} /></button>
               </div>
             )}
             
             {showNewProjectInput && isSidebarOpen && (
               <form onSubmit={handleCreateProject} className="px-2 mb-2">
                 <input autoFocus type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="Project Name..." className="w-full bg-slate-800 border border-indigo-500 rounded px-2 py-1.5 text-sm text-white focus:outline-none placeholder:text-slate-600" onBlur={() => setShowNewProjectInput(false)} />
               </form>
             )}

             <div className="space-y-0.5">
               {projects.map(p => (
                 <div key={p.id} className="group relative">
                   <button onClick={() => { setSelectedProject(p); setCurrentView('DASHBOARD'); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm ${selectedProject?.id === p.id ? COLORS.sidebarActive : 'hover:bg-slate-800 text-slate-400'}`}>
                      <BookOpen size={18} className="shrink-0" />
                      {isSidebarOpen && <span className="truncate">{p.name}</span>}
                   </button>
                 </div>
               ))}
             </div>
           </div>
        </div>

        {/* Bottom Actions: Sync & Settings */}
        <div className="p-3 border-t border-slate-800 space-y-2">
           {/* Cloud Sync Buttons */}
           {isSidebarOpen ? (
             <div className="bg-slate-800 rounded-lg p-2 space-y-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                   <span>Data Sync</span>
                   {isSyncing && <RefreshCw size={10} className="animate-spin text-indigo-400"/>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <button 
                     onClick={handleSyncToGitHub}
                     disabled={isSyncing}
                     className="flex flex-col items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-md transition-colors text-xs gap-1"
                   >
                     <UploadCloud size={14} />
                     Save to Cloud
                   </button>
                   <button 
                     onClick={handleLoadFromGitHub}
                     disabled={isSyncing}
                     className="flex flex-col items-center justify-center bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-md transition-colors text-xs gap-1"
                   >
                     <Download size={14} />
                     Load from Cloud
                   </button>
                </div>
                <div className="flex gap-1 pt-1">
                   <button onClick={handleBackupData} title="Export JSON" className="flex-1 py-1 text-slate-500 hover:text-slate-300 text-xs bg-slate-800/50 rounded flex justify-center"><FileDown size={12} /></button>
                   <button onClick={handleRestoreClick} title="Import JSON" className="flex-1 py-1 text-slate-500 hover:text-slate-300 text-xs bg-slate-800/50 rounded flex justify-center"><UploadCloud size={12} /></button>
                </div>
             </div>
           ) : (
             <div className="flex flex-col items-center gap-2">
                <button onClick={handleSyncToGitHub} title="Save to GitHub" className="p-2 hover:bg-indigo-600 rounded-lg text-slate-400 hover:text-white transition-all"><UploadCloud size={20}/></button>
             </div>
           )}

           <button 
             onClick={() => setShowSettings(true)}
             className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors ${!isSidebarOpen && 'justify-center'}`}
           >
              <Settings size={20} className="shrink-0" />
              {isSidebarOpen && <span className="font-medium text-sm">Settings</span>}
           </button>
           <input type="file" ref={fileImportRef} className="hidden" accept=".json" onChange={handleFileImport} />
        </div>
      </div>

      {/* Main Content Area */}
      {currentView === 'PROJECT_NOTES' ? renderProjectNotes() : 
       currentView === 'TASKS' ? renderTaskPage() :
       currentView === 'EDITOR' && selectedExperiment ? (
         // EDITOR VIEW
         <div className="flex-1 bg-white flex flex-col overflow-hidden">
            {/* Header */}
            <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white z-10">
               <div className="flex items-center gap-4">
                  <button onClick={() => setCurrentView('DASHBOARD')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                    <ArrowLeft size={20} />
                  </button>
                  <div className="h-8 w-px bg-slate-200"></div>
                  <div>
                     <input 
                       type="text" 
                       value={selectedExperiment.title}
                       onChange={(e) => handleUpdateExperiment({ title: e.target.value })}
                       className="text-xl font-bold text-slate-800 bg-transparent outline-none focus:bg-slate-50 px-2 -ml-2 rounded"
                     />
                     <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400 font-mono">{selectedExperiment.id}</span>
                        <div className="h-3 w-px bg-slate-300"></div>
                        <span className="text-xs text-slate-500">Created: {formatDate(selectedExperiment.createdAt)}</span>
                     </div>
                  </div>
               </div>
               
               <div className="flex items-center gap-3">
                  <select 
                    value={selectedExperiment.status}
                    onChange={(e) => handleUpdateExperiment({ status: e.target.value as ExperimentStatus })}
                    className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border cursor-pointer outline-none focus:ring-2 focus:ring-offset-1 ${
                       selectedExperiment.status === ExperimentStatus.COMPLETED ? 'bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-emerald-500' :
                       selectedExperiment.status === ExperimentStatus.PAUSED ? 'bg-amber-50 text-amber-700 border-amber-200 focus:ring-amber-500' :
                       'bg-indigo-50 text-indigo-700 border-indigo-200 focus:ring-indigo-500'
                    }`}
                  >
                    <option value={ExperimentStatus.IN_PROGRESS}>In Progress</option>
                    <option value={ExperimentStatus.PAUSED}>Paused</option>
                    <option value={ExperimentStatus.COMPLETED}>Completed</option>
                  </select>
                  <button 
                     onClick={(e) => handleExportExperiment(e, selectedExperiment)}
                     className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                     <FileDown size={16} /> Export Word
                  </button>
               </div>
            </header>

            {/* Editor Container */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
               <div className="max-w-4xl mx-auto space-y-6 pb-20">
                  
                  {/* Purpose */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                     <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-semibold text-slate-700 text-sm uppercase tracking-wide">Experiment Purpose</div>
                     <RichEditor 
                        initialContent={selectedExperiment.purpose} 
                        onChange={(val) => handleUpdateExperiment({ purpose: val })}
                        className="border-none shadow-none rounded-none"
                        minHeight="120px"
                     />
                  </div>

                  {/* Methods */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                     <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-semibold text-slate-700 text-sm uppercase tracking-wide">Methods & Procedure</div>
                     <RichEditor 
                        initialContent={selectedExperiment.methods} 
                        onChange={(val) => handleUpdateExperiment({ methods: val })}
                        className="border-none shadow-none rounded-none"
                        minHeight="250px"
                     />
                  </div>

                  {/* Results */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                     <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-semibold text-slate-700 text-sm uppercase tracking-wide">Results & Data</div>
                     <RichEditor 
                        initialContent={selectedExperiment.results} 
                        onChange={(val) => handleUpdateExperiment({ results: val })}
                        className="border-none shadow-none rounded-none"
                        minHeight="250px"
                     />
                  </div>

                  {/* Conclusion */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                     <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-semibold text-slate-700 text-sm uppercase tracking-wide">Conclusion</div>
                     <RichEditor 
                        initialContent={selectedExperiment.conclusion} 
                        onChange={(val) => handleUpdateExperiment({ conclusion: val })}
                        className="border-none shadow-none rounded-none"
                        minHeight="120px"
                     />
                  </div>

               </div>
            </div>
         </div>
       ) : (
         // DASHBOARD VIEW
         <div className="flex-1 bg-slate-50 flex flex-col h-full overflow-hidden">
            <header className="px-8 py-8">
              <div className="flex items-center justify-between mb-2">
                 <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                       {selectedProject ? selectedProject.name : (currentView === 'IN_PROGRESS' ? 'Active Experiments' : 'Dashboard')}
                    </h1>
                    <p className="text-slate-500 mt-1">
                      {selectedProject ? 'Manage your experiments and findings.' : 'Overview of all your research activities.'}
                    </p>
                 </div>
                 
                 <div className="flex items-center gap-3">
                    {selectedProject && (
                       <button onClick={() => setCurrentView('PROJECT_NOTES')} className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                          <BookOpen size={18} className="text-indigo-500" /> Project Notes
                       </button>
                    )}
                    {selectedProject && (
                      <>
                        <button onClick={(e) => handleDeleteProject(e, selectedProject.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete Project"><Trash2 size={20} /></button>
                        <button onClick={handleOpenNewExpModal} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-200 transition-all hover:scale-105 active:scale-95">
                           <Plus size={20} /> New Experiment
                        </button>
                      </>
                    )}
                 </div>
              </div>

              {/* Search Bar */}
              <div className="relative mt-6">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                 <input 
                   type="text" 
                   placeholder="Search experiments..." 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm text-slate-700 placeholder:text-slate-400"
                 />
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-8 pb-10">
               {experiments.length === 0 ? (
                 <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50">
                    <FlaskConical size={48} className="mb-4 text-slate-300" />
                    <p className="text-lg font-medium text-slate-500">No experiments found.</p>
                    {selectedProject && <p className="text-sm">Click "New Experiment" to start.</p>}
                 </div>
               ) : (
                 <div className="grid grid-cols-1 gap-4">
                    {experiments
                      .filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(exp => (
                      <div 
                        key={exp.id} 
                        className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group relative flex items-center justify-between"
                        onClick={() => { setSelectedExperiment(exp); setCurrentView('EDITOR'); }}
                      >
                         <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                              exp.status === ExperimentStatus.COMPLETED ? 'bg-emerald-100 text-emerald-600' :
                              exp.status === ExperimentStatus.PAUSED ? 'bg-amber-100 text-amber-600' :
                              'bg-indigo-100 text-indigo-600'
                            }`}>
                              {exp.status === ExperimentStatus.COMPLETED ? <Check size={20} /> : <FlaskConical size={20} />}
                            </div>
                            <div>
                               <h3 className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">{exp.title}</h3>
                               <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                  <span>Updated: {formatDate(exp.updatedAt)}</span>
                                  {/* Show project name if in global view */}
                                  {!selectedProject && (
                                    <>
                                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                      <span className="text-indigo-500 font-medium">
                                        {projects.find(p => p.id === exp.projectId)?.name}
                                      </span>
                                    </>
                                  )}
                               </div>
                            </div>
                         </div>
                         
                         <div className="flex items-center gap-4">
                             <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                exp.status === ExperimentStatus.COMPLETED ? 'bg-emerald-50 text-emerald-700' :
                                exp.status === ExperimentStatus.PAUSED ? 'bg-amber-50 text-amber-700' :
                                'bg-indigo-50 text-indigo-700'
                             }`}>
                               {exp.status === ExperimentStatus.IN_PROGRESS ? 'In Progress' : exp.status}
                             </span>

                             <div className="relative action-menu-trigger" onClick={(e) => e.stopPropagation()}>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === exp.id ? null : exp.id); }}
                                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                   <MoreHorizontal size={20} />
                                </button>
                                
                                {activeMenuId === exp.id && (
                                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-20 animate-[fadeIn_0.1s_ease-out]">
                                     <button onClick={(e) => handleCopyExperimentRequest(e, exp)} className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2">
                                        <Copy size={16} /> Duplicate
                                     </button>
                                     <button onClick={(e) => handleExportExperiment(e, exp)} className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2">
                                        <FileDown size={16} /> Export Word
                                     </button>
                                     <div className="h-px bg-slate-100 my-1"></div>
                                     <button onClick={(e) => handleDeleteExperiment(e, exp.id)} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                        <Trash2 size={16} /> Delete
                                     </button>
                                  </div>
                                )}
                             </div>
                         </div>
                      </div>
                    ))}
                 </div>
               )}
            </div>
         </div>
       )
      }

      {/* Modals */}
      {isNewExpModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md transform transition-all scale-100">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-slate-800">New Experiment</h3>
               <button onClick={() => setIsNewExpModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
             </div>
             <form onSubmit={handleCreateExperiment}>
               <div className="mb-6">
                 <label className="block text-sm font-medium text-slate-700 mb-2">Experiment Title</label>
                 <input 
                   autoFocus
                   type="text" 
                   value={newExpTitle}
                   onChange={(e) => setNewExpTitle(e.target.value)}
                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                   placeholder="e.g. PCR Optimization for Gene X"
                 />
               </div>
               <div className="flex gap-3">
                 <button type="button" onClick={() => setIsNewExpModalOpen(false)} className="flex-1 px-4 py-3 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                 <button type="submit" className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-200 transition-all">Create Experiment</button>
               </div>
             </form>
          </div>
        </div>
      )}

      {renderCopyModal()}
      {renderGitHubModal()}

    </div>
  );
};

export default App;