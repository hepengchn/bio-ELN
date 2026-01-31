import React, { useState, useEffect, useRef } from 'react';
import { Project, Experiment, ExperimentStatus, Task } from './types';
import { StorageService } from './services/storageService';
import RichEditor from './components/RichEditor';
import { 
  Plus, FlaskConical, ChevronRight, LayoutGrid, 
  Trash2, ArrowLeft, Calendar, Search, X,
  MoreHorizontal, Copy, Check, FileDown, ClipboardList,
  Activity, BookOpen, History, ChevronLeft,
  Lock, LogIn
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

  // Task State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [taskViewMode, setTaskViewMode] = useState<'LIST' | 'WORKFLOW'>('LIST');
  const [selectedTaskDate, setSelectedTaskDate] = useState<Date>(new Date());
  
  const taskInputRef = useRef<HTMLTextAreaElement>(null);

  // UI State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [copyConfirmExp, setCopyConfirmExp] = useState<Experiment | null>(null);

  // Modal / Input States
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Experiment Modal State
  const [isNewExpModalOpen, setIsNewExpModalOpen] = useState(false);
  const [newExpTitle, setNewExpTitle] = useState('');

  // --- Effects ---
  
  // Auth Check
  useEffect(() => {
    const sessionAuth = sessionStorage.getItem('labnote_auth');
    if (sessionAuth === 'true') {
      setIsAuthenticated(true);
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

  const handleExportExperiment = (e: React.MouseEvent, exp: Experiment) => {
    e.stopPropagation();
    setActiveMenuId(null);

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
          .company-name { 
            font-family: 'SimHei', 'Heiti SC', sans-serif; 
            font-size: 10.5pt; 
            text-align: right; 
            margin-bottom: 10px; 
          }
          
          /* Table Styles */
          table { width: 100%; border-collapse: collapse; border: 1px solid #000; table-layout: fixed; }
          td { border: 1px solid #000; padding: 8px; vertical-align: middle; word-wrap: break-word; }
          
          /* First column specific styles */
          .col-label { 
            width: 120px; 
            text-align: center; 
            font-family: 'SimHei', 'Heiti SC', sans-serif; 
            font-weight: bold;
            background-color: #fff;
          }
          
          /* Content column styles */
          .col-content {
            text-align: left;
            font-family: 'SimSun', serif;
          }

          /* Images within content */
          img { max-width: 100%; height: auto; margin: 5px 0; }
          p { margin: 0 0 5px 0; }
          
          /* Footer styles using a flex-like structure for Word */
          .footer-container { margin-top: 20px; font-family: 'SimSun', serif; overflow: hidden; }
          .footer-left { float: left; }
          .footer-right { float: right; }
        </style>
      </head>
      <body>
        <h1>项目开发实验记录</h1>
        <div class="company-name">修实生物医药（南通）有限公司</div>
        
        <table>
          <colgroup>
            <col width="120" />
            <col />
          </colgroup>
          <tr>
            <td class="col-label">实验名称</td>
            <td class="col-content">${exp.title}</td>
          </tr>
          <tr>
            <td class="col-label">实验目的</td>
            <td class="col-content">${exp.purpose || ''}</td>
          </tr>
          <tr>
            <td class="col-label">实验准备</td>
            <td class="col-content" style="height: 80px;"></td>
          </tr>
          <tr>
            <td class="col-label">主要仪器</td>
            <td class="col-content" style="height: 80px;"></td>
          </tr>
          <tr>
            <td class="col-label">实验步骤</td>
            <td class="col-content" style="min-height: 150px;">${exp.methods || ''}</td>
          </tr>
          <tr>
            <td class="col-label">实验结果</td>
            <td class="col-content" style="min-height: 150px;">${exp.results || ''}</td>
          </tr>
          <tr>
            <td class="col-label">实验结论</td>
            <td class="col-content" style="min-height: 100px;">${exp.conclusion || ''}</td>
          </tr>
        </table>

        <div class="footer-container">
          <div class="footer-left">实验人：</div>
          <div class="footer-right">实验起止日期：${startDate} 至 ${endDate}</div>
        </div>
      </body>
      </html>
    `;

    // Create a Blob with Word mime type
    const blob = new Blob(['\ufeff', content], {
      type: 'application/msword'
    });
    
    // Trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // New Filename format: YYYYMMDD-Title.doc
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

    // Split by newline to support pasting multiple lines
    const lines = newTaskText.trim().split(/\n+/);
    
    // Use selectedTaskDate time combined with current time (for order)
    const now = new Date();
    const taskCreatedAt = new Date(selectedTaskDate);
    taskCreatedAt.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

    const newTasks: Task[] = lines.map(line => ({
      id: Math.random().toString(36).substr(2, 9) + Date.now(),
      text: line.trim(),
      completed: false,
      createdAt: taskCreatedAt.getTime()
    })).filter(t => t.text);

    // Add new tasks to top, but keep overall list sorted (though new are always uncompleted)
    const updatedTasks = [...newTasks, ...tasks];
    
    // Ensure sort is applied immediately
    updatedTasks.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return b.createdAt - a.createdAt;
    });

    setTasks(updatedTasks);
    StorageService.saveTasks(updatedTasks);
    setNewTaskText('');
    
    // Reset textarea height
    if (taskInputRef.current) {
      taskInputRef.current.style.height = 'auto';
    }
  };

  const handleToggleTask = (taskId: string) => {
    const updated = tasks.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    
    // Sort: Uncompleted first, then Completed. Secondary sort by date (newest first).
    updated.sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1; // completed (true) goes to bottom
      }
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
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    }).format(new Date(ts));
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

  // Helper for date comparison (Task View)
  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  };

  const changeTaskDate = (days: number) => {
    const newDate = new Date(selectedTaskDate);
    newDate.setDate(selectedTaskDate.getDate() + days);
    setSelectedTaskDate(newDate);
  };

  const handleTaskDatePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const [y, m, d] = e.target.value.split('-').map(Number);
    // Create date at local noon to avoid timezone shift issues
    const newDate = new Date(y, m - 1, d, 12, 0, 0); 
    setSelectedTaskDate(newDate);
  };

  // --- Sub-components ---

  const StatusSelector = ({ status, onChange, className = '' }: { status: ExperimentStatus, onChange: (s: ExperimentStatus) => void, className?: string }) => {
    const getStyles = (s: ExperimentStatus) => {
      switch (s) {
        case ExperimentStatus.COMPLETED: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case ExperimentStatus.IN_PROGRESS: return 'bg-indigo-100 text-indigo-700 border-indigo-200';
        case ExperimentStatus.PAUSED: return 'bg-amber-100 text-amber-700 border-amber-200';
        default: return 'bg-slate-100 text-slate-700 border-slate-200';
      }
    };

    return (
      <div className={`relative inline-block ${className}`} onClick={(e) => e.stopPropagation()}>
        <select
          value={status}
          onChange={(e) => onChange(e.target.value as ExperimentStatus)}
          className={`appearance-none cursor-pointer pl-3 pr-8 py-1 rounded-full text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 transition-all ${getStyles(status)}`}
        >
          <option value={ExperimentStatus.IN_PROGRESS}>In Progress</option>
          <option value={ExperimentStatus.PAUSED}>Paused</option>
          <option value={ExperimentStatus.COMPLETED}>Completed</option>
        </select>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60">
           <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor"><path d="M0 0h10L5 6z"/></svg>
        </div>
      </div>
    );
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
               
               {authError && (
                 <div className="text-red-500 text-xs text-center font-medium bg-red-50 py-2 rounded">
                   {authError}
                 </div>
               )}

               <button 
                 type="submit" 
                 className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
               >
                 <LogIn size={18} />
                 Unlock System
               </button>
            </form>
            <div className="mt-6 text-center text-xs text-slate-400">
              Personal Use Only
            </div>
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
           <button 
             onClick={() => setCurrentView('DASHBOARD')}
             className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
           >
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
    // Group tasks by date for Workflow view
    const groupedTasks: Record<string, Task[]> = {};
    if (taskViewMode === 'WORKFLOW') {
      [...tasks].sort((a, b) => b.createdAt - a.createdAt).forEach(task => {
        const dateKey = getLocalDateString(task.createdAt);
        if (!groupedTasks[dateKey]) groupedTasks[dateKey] = [];
        groupedTasks[dateKey].push(task);
      });
    }

    // Filter for Active List view
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
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    taskViewMode === 'LIST' 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Daily List
                </button>
                <button 
                  onClick={() => setTaskViewMode('WORKFLOW')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                    taskViewMode === 'WORKFLOW' 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <History size={14} />
                  Workflow
                </button>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
          <div className="max-w-3xl mx-auto">
            
            {taskViewMode === 'LIST' && (
              <>
                {/* Date Navigation */}
                <div className="flex items-center justify-between mb-6 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                  <button 
                    onClick={() => changeTaskDate(-1)}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  
                  <div className="flex items-center gap-2 group relative">
                    <Calendar size={18} className="text-indigo-500" />
                    <span className="font-semibold text-slate-700 text-lg">
                      {selectedTaskDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    <input 
                      type="date"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      value={getLocalDateString(selectedTaskDate)}
                      onChange={handleTaskDatePick}
                    />
                  </div>

                  <button 
                    onClick={() => changeTaskDate(1)}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
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
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddTask(e);
                        }
                      }}
                      style={{ minHeight: '52px', overflow: 'hidden' }}
                    />
                    <div className="absolute right-3 top-3 pointer-events-none opacity-50">
                       <span className="text-[10px] font-bold bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5 text-slate-500">ENTER</span>
                    </div>
                  </div>
                </form>

                <ul className="space-y-3">
                  {activeDateTasks.map(task => (
                    <li 
                      key={task.id} 
                      className={`flex items-start gap-4 p-4 rounded-xl border transition-all group shadow-sm ${
                        task.completed 
                          ? 'bg-emerald-50/50 border-emerald-100' 
                          : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-md'
                      }`}
                    >
                      <div className="pt-0.5">
                        <button
                          onClick={() => handleToggleTask(task.id)}
                          className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${
                            task.completed 
                              ? 'bg-emerald-500 border-emerald-500 text-white' 
                              : 'border-slate-300 hover:border-indigo-400 text-transparent'
                          }`}
                        >
                          <Check size={14} strokeWidth={3} />
                        </button>
                      </div>
                      <span className={`flex-1 text-base leading-relaxed break-words ${
                        task.completed ? 'text-emerald-700' : 'text-slate-700'
                      }`}>
                        {task.text}
                      </span>
                      <button 
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={16} />
                      </button>
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
                 {Object.keys(groupedTasks).length === 0 && (
                   <div className="text-center text-slate-400 py-12 flex flex-col items-center gap-2">
                     <History size={48} className="text-slate-200" />
                     <p>No task history available.</p>
                   </div>
                )}
                
                {Object.entries(groupedTasks).map(([dateStr, dayTasks]) => {
                  const dateObj = new Date(dateStr); // Note: this parses local date string correctly in most browsers for YYYY-MM-DD
                  // Use weekday short name
                  const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                  
                  return (
                    <div key={dateStr} className="flex gap-4 group">
                       {/* Left Date Column */}
                       <div className="w-24 text-right shrink-0 pt-0 relative">
                          <div className="sticky top-6">
                            <div className="font-bold text-slate-700 text-lg">{dateStr}</div>
                            <div className="text-xs text-indigo-500 font-bold uppercase tracking-wider">{weekday}</div>
                          </div>
                       </div>
                       
                       {/* Right Content Column with Line */}
                       <div className="border-l-2 border-indigo-100 pl-8 pb-8 flex-1 relative min-h-[80px]">
                          {/* Dot */}
                          <div className="absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white group-hover:scale-110 transition-transform"></div>
                          
                          {/* Merged Card */}
                          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow">
                             <ul className="space-y-3">
                                {dayTasks.map(task => (
                                   <li key={task.id} className="flex items-start gap-3">
                                      <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${task.completed ? 'bg-emerald-400' : 'bg-slate-300'}`}></div>
                                      <span className={`text-sm leading-relaxed ${task.completed ? 'text-slate-500' : 'text-slate-700'}`}>
                                        {task.text}
                                      </span>
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
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform scale-100 transition-all">
          <div className="p-6 text-center">
            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
              <Copy size={24} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Duplicate Experiment?</h3>
            <p className="text-sm text-slate-500 mb-6">
              This will create a copy of <strong>"{copyConfirmExp.title}"</strong>.
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setCopyConfirmExp(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmCopyExperiment}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
              >
                Confirm Copy
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderNewExperimentModal = () => {
    if (!isNewExpModalOpen) return null;
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-[fadeIn_0.2s_ease-out]">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
             <h3 className="font-semibold text-lg text-slate-800">New Experiment</h3>
             <button onClick={() => setIsNewExpModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
               <X size={20} />
             </button>
          </div>
          <form onSubmit={handleCreateExperiment}>
            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
              <input 
                autoFocus
                type="text" 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-800 placeholder:text-slate-400"
                placeholder="e.g., DNA Extraction Protocol V2"
                value={newExpTitle}
                onChange={(e) => setNewExpTitle(e.target.value)}
              />
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setIsNewExpModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={!newExpTitle.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderSidebar = () => (
    <aside className={`${isSidebarOpen ? 'w-64' : 'w-0'} ${COLORS.sidebar} text-slate-300 flex flex-col transition-all duration-300 overflow-hidden shrink-0 shadow-lg z-20`}>
      <div className="p-5 border-b border-slate-700/50 flex items-center gap-3">
        <div className="p-1.5 bg-indigo-500 rounded-lg text-white">
          <FlaskConical size={20} />
        </div>
        <h1 className="font-bold text-slate-100 text-lg tracking-tight">LabNote Pro</h1>
      </div>

      <div className="flex-grow overflow-y-auto py-6">
        {/* Navigation Items */}
        <div className="px-3 mb-6 space-y-2">
          {/* Today's Tasks Button */}
          <button 
            onClick={() => {
              setCurrentView('TASKS');
              setSelectedProject(null);
              setSelectedExperiment(null);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 border rounded-lg transition-all group ${
              currentView === 'TASKS' 
                ? 'bg-indigo-500 text-white border-indigo-400' 
                : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-200 border-indigo-500/30'
            }`}
          >
            <ClipboardList size={18} className={`${currentView === 'TASKS' ? 'text-white' : 'text-indigo-400 group-hover:text-indigo-300'}`} />
            <span className="text-sm font-medium">Daily Tasks</span>
            {tasks.filter(t => !t.completed).length > 0 && (
              <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                currentView === 'TASKS' ? 'bg-indigo-700 text-white' : 'bg-indigo-500 text-white'
              }`}>
                {tasks.filter(t => !t.completed).length}
              </span>
            )}
          </button>

           {/* In Progress Filter Button */}
           <button 
            onClick={() => {
              setCurrentView('IN_PROGRESS');
              setSelectedProject(null);
              setSelectedExperiment(null);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 border rounded-lg transition-all group ${
              currentView === 'IN_PROGRESS' 
                ? 'bg-amber-500/20 text-amber-200 border-amber-500/50' 
                : 'hover:bg-amber-500/10 text-slate-400 border-transparent hover:text-amber-200'
            }`}
          >
            <Activity size={18} className={`${currentView === 'IN_PROGRESS' ? 'text-amber-400' : 'text-slate-500 group-hover:text-amber-400'}`} />
            <span className="text-sm font-medium">Experiments in Progress</span>
          </button>
        </div>

        <div className="px-5 mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 flex justify-between items-center">
          Projects
          <button 
            onClick={() => setShowNewProjectInput(true)}
            className="text-slate-500 hover:text-white transition-colors p-1 hover:bg-slate-700 rounded"
          >
            <Plus size={14} />
          </button>
        </div>

        {showNewProjectInput && (
          <form onSubmit={handleCreateProject} className="px-4 mb-3">
            <input
              autoFocus
              type="text"
              className="w-full bg-slate-900 text-white text-sm rounded-md px-3 py-2 outline-none border border-indigo-500 placeholder:text-slate-600"
              placeholder="Project Name..."
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onBlur={() => !newProjectName && setShowNewProjectInput(false)}
            />
          </form>
        )}

        <ul className="space-y-1 px-2">
          {projects.map(project => (
            <li key={project.id}>
              <button
                onClick={() => {
                  setSelectedProject(project);
                  setSelectedExperiment(null);
                  setCurrentView('DASHBOARD');
                }}
                className={`w-full text-left px-3 py-2.5 text-sm font-medium rounded-lg flex items-center justify-between group transition-all ${
                  (currentView === 'DASHBOARD' || currentView === 'PROJECT_NOTES') && selectedProject?.id === project.id 
                    ? COLORS.sidebarActive
                    : `text-slate-400 ${COLORS.sidebarHover}`
                }`}
              >
                <span className="truncate">{project.name}</span>
                {(currentView === 'DASHBOARD' || currentView === 'PROJECT_NOTES') && selectedProject?.id === project.id && (
                  <Trash2 
                    size={14} 
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 transition-opacity"
                    onClick={(e) => handleDeleteProject(e, project.id)}
                  />
                )}
              </button>
            </li>
          ))}
          {projects.length === 0 && !showNewProjectInput && (
            <li className="px-5 py-8 text-center text-xs text-slate-500 italic">
              No projects yet.<br/>Click + to start.
            </li>
          )}
        </ul>
      </div>

      <div className="p-4 text-xs text-slate-500 flex justify-between items-center bg-slate-900/20">
        <span>v1.6.0</span>
        <span>Local Storage</span>
      </div>
    </aside>
  );

  const renderExperimentList = () => {
    const filteredExperiments = experiments.filter(e => 
      e.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const title = currentView === 'IN_PROGRESS' 
      ? 'Experiments In Progress' 
      : (selectedProject?.name || 'Dashboard');
    
    const subtitle = currentView === 'IN_PROGRESS'
      ? 'Showing all active experiments across projects'
      : `${experiments.length} experiment${experiments.length !== 1 && 's'} in this project`;

    return (
      <div className={`flex-1 ${COLORS.bg} flex flex-col h-full overflow-hidden`}>
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-6 shadow-sm z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                  {title}
                </h2>
                {/* Project Details Button - Only show when in a specific project */}
                {selectedProject && currentView === 'DASHBOARD' && (
                  <button 
                    onClick={() => setCurrentView('PROJECT_NOTES')}
                    className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100"
                    title="Open Project Ideas & Notes"
                  >
                    <BookOpen size={18} />
                  </button>
                )}
              </div>
              <p className="text-slate-500 text-sm mt-1">
                {subtitle}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative group">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search experiments..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-64 transition-all"
                />
              </div>

              {selectedProject && (
                <button 
                  onClick={handleOpenNewExpModal}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow active:scale-95"
                >
                  <Plus size={16} />
                  New Entry
                </button>
              )}
            </div>
          </div>
        </header>

        {/* List Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredExperiments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                 <FlaskConical size={32} className="opacity-50 text-slate-500" />
              </div>
              <p className="font-medium text-slate-500">No experiments found.</p>
              {selectedProject && <p className="text-sm text-slate-400 mt-1">Create one to get started.</p>}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredExperiments.map(exp => (
                <div 
                  key={exp.id}
                  onClick={() => {
                    setSelectedExperiment(exp);
                    // Ensure we can go back to where we came from, but for now simple switch to editor
                    setCurrentView('EDITOR');
                  }}
                  className="group relative bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors shrink-0">
                      <LayoutGrid size={18} />
                    </div>
                    
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                      <h3 className="font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors truncate text-base">
                        {exp.title}
                      </h3>
                      <span className="text-slate-300 hidden sm:inline">|</span>
                      <span className="text-xs text-slate-400 whitespace-nowrap hidden sm:flex items-center gap-1.5 font-medium">
                         <Calendar size={12} />
                         {formatDate(exp.createdAt)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 shrink-0">
                    {/* Status Dropdown in List */}
                    <StatusSelector 
                      status={exp.status} 
                      onChange={(s) => handleUpdateExperiment({ status: s }, exp.id)}
                    />

                    {/* Action Menu */}
                    <div className="relative action-menu-trigger">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === exp.id ? null : exp.id);
                        }}
                        className={`p-1.5 rounded-md transition-colors ${activeMenuId === exp.id ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                      >
                         <MoreHorizontal size={20} />
                      </button>

                      {/* Dropdown Content */}
                      {activeMenuId === exp.id && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-xl border border-slate-100 z-50 overflow-hidden animate-[fadeIn_0.1s_ease-out]">
                          <button 
                            onClick={(e) => handleCopyExperimentRequest(e, exp)}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                          >
                            <Copy size={14} className="text-indigo-500" />
                            Copy
                          </button>
                          <button 
                            onClick={(e) => handleExportExperiment(e, exp)}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                          >
                            <FileDown size={14} className="text-emerald-500" />
                            Export
                          </button>
                          <div className="h-px bg-slate-100"></div>
                          <button 
                            onClick={(e) => handleDeleteExperiment(e, exp.id)}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-400 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSectionEditor = (
    title: string, 
    content: string, 
    field: keyof Experiment,
    heightClass: string,
    headerAction?: React.ReactNode
  ) => (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col ${heightClass}`}>
      <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-200 font-semibold text-slate-700 flex items-center justify-between backdrop-blur-sm">
         <span className="text-sm uppercase tracking-wide text-slate-500 font-bold">{title}</span>
         {headerAction}
      </div>
      <div className="flex-1 overflow-hidden flex flex-col group">
        <RichEditor 
          initialContent={content}
          onChange={(newContent) => handleUpdateExperiment({ [field]: newContent })}
          className="h-full border-none rounded-none shadow-none"
          minHeight="100%"
        />
      </div>
    </div>
  );

  const renderEditor = () => {
    if (!selectedExperiment) return null;

    return (
      <div className="flex-1 bg-white flex flex-col h-full overflow-hidden">
        {/* Editor Header */}
        <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white z-10 gap-6 shadow-sm">
          <div className="flex items-center gap-4 flex-1 overflow-hidden">
            <button 
              onClick={() => {
                setSelectedExperiment(null);
                setCurrentView(selectedProject ? 'DASHBOARD' : 'IN_PROGRESS');
              }}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1 flex flex-col justify-center min-w-0">
              <input
                type="text"
                value={selectedExperiment.title}
                onChange={(e) => handleUpdateExperiment({ title: e.target.value })}
                className="text-xl font-bold text-slate-900 bg-transparent border-none outline-none focus:ring-0 p-0 w-full placeholder:text-slate-300 transition-colors"
                placeholder="Experiment Title"
              />
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium truncate max-w-[150px]">
                  {projects.find(p => p.id === selectedExperiment.projectId)?.name || 'Unknown Project'}
                </span>
                <span className="text-slate-300">•</span>
                <div className="flex items-center gap-1.5 group cursor-pointer">
                  <Calendar size={12} />
                  <input 
                    type="date"
                    value={getLocalDateString(selectedExperiment.createdAt)}
                    onChange={handleDateChange}
                    className="bg-transparent border-b border-transparent group-hover:border-slate-300 focus:border-indigo-500 outline-none text-slate-600 transition-colors cursor-pointer w-[85px]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
             <StatusSelector 
               status={selectedExperiment.status} 
               onChange={(s) => handleUpdateExperiment({ status: s })}
               className="scale-110"
             />
            
            <div className="h-8 w-px bg-slate-200"></div>

            <button 
              className="flex items-center gap-2 text-emerald-600 text-sm font-medium bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100 cursor-default"
              disabled
            >
              <Check size={16} />
              Saved
            </button>
          </div>
        </header>

        {/* Modular Editor Body */}
        <div className="flex-1 p-8 bg-slate-50/50 overflow-y-auto">
          <div className="max-w-5xl mx-auto flex flex-col gap-8 pb-16">
            {renderSectionEditor(
              '1. Experiment Purpose', 
              selectedExperiment.purpose, 
              'purpose',
              'h-[250px]'
            )}
            
            {renderSectionEditor(
              '2. Methods', 
              selectedExperiment.methods, 
              'methods',
              'h-[500px]'
            )}
            
            {renderSectionEditor(
              '3. Results', 
              selectedExperiment.results, 
              'results',
              'h-[500px]'
            )}
            
            {renderSectionEditor(
              '4. Conclusion', 
              selectedExperiment.conclusion, 
              'conclusion',
              'h-[250px]'
            )}
          </div>
        </div>
      </div>
    );
  };

  // Main Render Switch
  const renderMainContent = () => {
    switch(currentView) {
      case 'TASKS': return renderTaskPage();
      case 'PROJECT_NOTES': return renderProjectNotes();
      case 'EDITOR': return renderEditor();
      case 'IN_PROGRESS': return renderExperimentList();
      case 'DASHBOARD': 
      default:
        if (selectedProject) return renderExperimentList();
        return (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
            <div className="bg-white p-6 rounded-full shadow-sm mb-6">
              <FlaskConical size={64} className="text-indigo-200" />
            </div>
            <h2 className="text-2xl font-bold text-slate-700 tracking-tight">Welcome to LabNote Pro</h2>
            <p className="mt-2 text-slate-500">Select a project from the sidebar to begin.</p>
          </div>
        );
    }
  };

  return (
    <div className={`flex h-screen w-full ${COLORS.bg}`}>
      {renderSidebar()}
      
      {/* Toggle Sidebar Button (visible on small screens or when closed) */}
      {!isSidebarOpen && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="absolute top-4 left-4 z-50 p-2 bg-slate-800 text-white rounded shadow-lg hover:bg-slate-700 transition-colors"
        >
          <LayoutGrid size={20} />
        </button>
      )}

      {renderMainContent()}
      
      {renderNewExperimentModal()}
      {renderCopyModal()}
    </div>
  );
};

export default App;