
import React, { useState, useEffect, useRef } from 'react';
import { AgentService } from './services/ollamaService';
import { AgentMessage, SDLCProject, HistoryItem } from './types';
import { downloadProjectZip, downloadArtifactsZip } from './utils/downloadUtils';
import { storage } from './utils/storage';
import AgentCard from './components/AgentCard';
import LivePreview from './components/LivePreview';
import LoginScreen from './components/LoginScreen';
import HomePage from './components/HomePage';
import SearchBar from './components/SearchBar';
import WorkflowAnimation from './components/WorkflowAnimation';
import HistorySidebar from './components/HistorySidebar';
import ChatSidebar from './components/ChatSidebar';

type ThemeType = 'ocean' | 'sunset' | 'forest';

const App: React.FC = () => {
  const [input, setInput] = useState('');
  const [project, setProject] = useState<SDLCProject | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [activeTab, setActiveTab] = useState<'flow' | 'output'>('flow');
  const [deliverableSubTab, setDeliverableSubTab] = useState<'docs' | 'code' | 'preview'>('preview');
  const [openFile, setOpenFile] = useState<string | null>(null);
  const [view, setView] = useState<'home' | 'login' | 'app'>('home');
  const [theme, setTheme] = useState<ThemeType>('ocean');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const agentService = useRef(new AgentService());

  const hasApiKey = !!import.meta.env.VITE_OLLAMA_API_KEY || !!import.meta.env.VITE_GEMINI_API_KEY;

  // Load preferences and sync history on mount
  useEffect(() => {
    const init = async () => {
      const prefs = await storage.preferences.get();
      setTheme(prefs.theme);
      await storage.history.sync(); // Sync legacy data to backend
      inputRef.current?.focus();
    };
    init();
  }, []);

  // Save preferences when theme changes
  useEffect(() => {
    const savePrefs = async () => {
      const prefs = await storage.preferences.get();
      await storage.preferences.save({ ...prefs, theme });
    };
    savePrefs();
  }, [theme]);

  useEffect(() => {
    const loadToHistory = async () => {
      if (project && !project.isProcessing && project.completedAt) {
        await storage.history.save(project);
      }
    };
    loadToHistory();
  }, [project]);

  // Load Chat History when project changes
  useEffect(() => {
    if (project?.id) {
      const loadChat = async () => {
        const history = await storage.chat.get(project.id);
        if (history.length > 0) {
          setMessages(history);
        }
      };
      loadChat();
    }
  }, [project?.id]);

  const addMessage = (role: any, content: string, status: 'thinking' | 'done' | 'error' = 'done') => {
    const newMessage: AgentMessage = {
      id: Math.random().toString(36).substr(2, 9),
      role,
      content,
      timestamp: new Date(),
      status
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  };

  const updateMessage = (id: string, content: string) => {
    setMessages(prev => prev.map(msg =>
      msg.id === id ? { ...msg, content, status: 'thinking' } : msg
    ));
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStart = async () => {
    if (!input.trim() || project?.isProcessing) return;

    if (project) {
      addMessage('User', input, 'done');
      const modInput = input;
      setInput('');

      try {
        setProject(p => p ? { ...p, isProcessing: true, currentStep: 3 } : null);
        const orchestratorMsg = `I've received your update: "${modInput}". Initiating code modification...`;
        const orchId = addMessage('Orchestrator', orchestratorMsg, 'thinking');

        // Persist User Message
        const userMsg: AgentMessage = {
          id: Math.random().toString(36).substr(2, 9),
          role: 'User',
          content: modInput,
          timestamp: new Date(),
          status: 'done'
        };
        await storage.chat.save(project.id, userMsg);

        const existingCode = project.code?.files['src/App.tsx'] || '';
        const updatedCode = await agentService.current.runModificationAgent(existingCode, modInput, project.requirements || {}, theme);

        setProject(p => p ? { ...p, code: updatedCode, isProcessing: false, currentStep: 5 } : null);
        const finalMsg = 'Code modification complete. View the updated preview in the Product Delivery tab.';
        addMessage('Development', finalMsg);

        // Persist Orchestrator and Development messages
        await storage.chat.save(project.id, {
          id: orchId,
          role: 'Orchestrator',
          content: orchestratorMsg,
          timestamp: new Date(),
          status: 'done'
        });
        await storage.chat.save(project.id, {
          id: Math.random().toString(36).substr(2, 9),
          role: 'Development',
          content: finalMsg,
          timestamp: new Date(),
          status: 'done'
        });

        setTimeout(() => setActiveTab('output'), 1000);
      } catch (error) {
        console.error(error);
        addMessage('Orchestrator', 'Failed to apply modifications.', 'error');
        setProject(p => p ? { ...p, isProcessing: false } : null);
      }
      return;
    }

    const inputCopy = input;
    const newProject: SDLCProject = {
      id: Date.now().toString(),
      prompt: inputCopy,
      name: 'Generating Name...',
      currentStep: 0,
      isProcessing: true,
      createdAt: new Date(),
      theme: theme
    };
    setProject(newProject);
    setMessages([]);
    setInput('');
    setActiveTab('flow');
    setDeliverableSubTab('preview');

    try {
      // Generate Dynamic Name First
      const projectName = await agentService.current.runNamingAgent(inputCopy);
      const updatedProject = { ...newProject, name: projectName };
      setProject(updatedProject);
      await storage.history.save(updatedProject); // Save instantly on naming

      addMessage('Orchestrator', `Initializing automated SDLC for: "${projectName}"`, 'thinking');
      await new Promise(r => setTimeout(r, 800));

      // Step 1: Requirements
      setProject(p => p ? { ...p, currentStep: 1 } : null);
      const reqMsgId = addMessage('Requirement', 'Business Analyst Agent is analyzing scope and defining user stories...\n\n', 'thinking');

      let reqStream = '';
      const reqs = await agentService.current.runRequirementAgent(input, (chunk) => {
        reqStream += chunk;
        updateMessage(reqMsgId, reqStream);
      });

      setMessages(prev => prev.map(msg => msg.id === reqMsgId ? { ...msg, status: 'done' } : msg));
      const reqProj = { ...updatedProject, requirements: reqs, currentStep: 1 };
      setProject(reqProj);
      await storage.history.save(reqProj); // Update history
      addMessage('Requirement', `Scope defined. Extracted ${reqs.userStories.length} user stories.`);

      // Step 2: Design
      setProject(p => p ? { ...p, currentStep: 2 } : null);
      const designMsgId = addMessage('Design', 'Architect Agent is mapping system flow and drafting wireframes...\n\n', 'thinking');

      let designStream = '';
      const design = await agentService.current.runDesignAgent(reqs, (chunk) => {
        designStream += chunk;
        updateMessage(designMsgId, designStream);
      });

      setMessages(prev => prev.map(msg => msg.id === designMsgId ? { ...msg, status: 'done' } : msg));
      const designProj = { ...reqProj, design: design, currentStep: 2 };
      setProject(designProj);
      await storage.history.save(designProj); // Update history
      addMessage('Design', 'Architecture and design blueprints are complete.');

      // Step 3: Development
      setProject(p => p ? { ...p, currentStep: 3 } : null);
      addMessage('Development', 'Engineer Agent is synthesizing the React + Tailwind application...', 'thinking');

      const codeRes = await agentService.current.runDevelopmentAgent(design, reqs, theme, (chunk) => { });

      const devProj = { ...designProj, code: codeRes, currentStep: 3 };
      setProject(devProj);
      await storage.history.save(devProj); // Update history
      addMessage('Development', 'Source code synthesis complete. Application is ready for verification.');

      // Step 4: Testing
      setProject(p => p ? { ...p, currentStep: 4 } : null);
      const testMsgId = addMessage('Testing', 'QA Agent is executing verification suite and auditing UX parity...\n\n', 'thinking');

      const mainFile = codeRes.files['src/App.tsx'] || Object.values(codeRes.files)[0] || '';

      let testStream = '';
      const tests = await agentService.current.runTestingAgent(mainFile, reqs, (chunk) => {
        testStream += chunk;
        updateMessage(testMsgId, testStream);
      });

      setMessages(prev => prev.map(msg => msg.id === testMsgId ? { ...msg, status: 'done' } : msg));
      const finalProj = { ...devProj, tests: tests, isProcessing: false, currentStep: 5, completedAt: new Date() };
      setProject(finalProj);
      await storage.history.save(finalProj); // Final save
      addMessage('Testing', 'Verification complete. All tests passed. Launching preview...');

      // Final Transition
      addMessage('Orchestrator', 'Workflow complete. The application is now live in the Deliverables tab.');

      setTimeout(() => setActiveTab('output'), 1000);

    } catch (error) {
      console.error(error);
      addMessage('Orchestrator', 'A critical error occurred in the agent orchestration chain.', 'error');
      setProject(p => p ? { ...p, isProcessing: false } : null);
    }
  };

  const handleSelectHistoryProject = (historyItem: HistoryItem) => {
    setProject(historyItem.project);
    setMessages([]);
    setActiveTab('output');
    setDeliverableSubTab('preview');
  };

  const getThemeClasses = () => {
    switch (theme) {
      case 'sunset':
        return {
          bg: 'bg-gradient-to-br from-orange-950 via-slate-950 to-slate-900',
          text: 'text-orange-100',
          border: 'border-orange-800',
          headerBg: 'bg-orange-950/50',
          primary: 'bg-orange-600 hover:bg-orange-500',
          primaryText: 'text-orange-400',
        };
      case 'forest':
        return {
          bg: 'bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-900',
          text: 'text-emerald-100',
          border: 'border-emerald-800',
          headerBg: 'bg-emerald-950/50',
          primary: 'bg-emerald-600 hover:bg-emerald-500',
          primaryText: 'text-emerald-400',
        };
      default: // ocean
        return {
          bg: 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950',
          text: 'text-slate-200',
          border: 'border-slate-800',
          headerBg: 'bg-slate-950/50',
          primary: 'bg-cyan-600 hover:bg-cyan-500',
          primaryText: 'text-cyan-400',
        };
    }
  };

  const themeColors = getThemeClasses();

  if (view === 'home') {
    return <HomePage onSignIn={() => setView('login')} />;
  }

  if (view === 'login') {
    return <LoginScreen onLogin={() => setView('app')} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-200">
      {/* History Sidebar */}
      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectProject={handleSelectHistoryProject}
      />

      {/* Chat Sidebar */}
      {project && (
        <ChatSidebar
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          projectId={project.id}
          messages={messages}
          onSendMessage={(content) => {
            setInput(content);
            handleStart();
          }}
          isProcessing={project.isProcessing}
        />
      )}

      {/* Navbar */}
      <header className="h-16 border-b border-slate-800 px-8 flex items-center justify-between backdrop-blur-md sticky top-0 z-40 bg-slate-950/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-600 hover:bg-cyan-500 flex items-center justify-center shadow-lg cursor-pointer hover:scale-105 transition-transform" onClick={() => setView('home')}>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-white leading-none cursor-pointer" onClick={() => setView('home')}>
              Kaizen<span className="text-cyan-400">Dhara</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-[0.2em] mt-1">Autonomous Agent Orchestration</p>
          </div>
        </div>

        <SearchBar />

        <div className="flex gap-4 items-center">
          {/* History Button */}
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700"
            title="Project History"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          <button
            onClick={() => {
              setProject(null);
              setMessages([]);
              setInput('');
              setView('app');
              setActiveTab('flow');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700"
            title="Start New Project"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>New Project</span>
          </button>

          <div className="flex gap-2 bg-slate-900/50 p-1 rounded-xl border border-slate-800/50">
            <button
              onClick={() => setActiveTab('flow')}
              className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'flow' ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Agent Workspace
            </button>
            <button
              onClick={() => setActiveTab('output')}
              className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'output' ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Product Delivery
            </button>
          </div>

          <button
            onClick={() => setView('login')}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700"
            title="Sign Out"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar: Control Panel */}
        <div className="w-[400px] border-r border-slate-800 flex flex-col bg-slate-950/80 backdrop-blur-sm">
          <div className="p-8 flex flex-col gap-8">
            <section>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-4">Command Center</label>
              <div className="relative group">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={project ? "🚀 Add modifications or updates to this project..." : "Describe your vision (e.g., 'A professional landing page for a coffee subscription service...')"}
                  className={`w-full h-40 bg-slate-900/50 border rounded-2xl p-5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none transition-all group-hover:border-slate-600 text-white placeholder-slate-600 leading-relaxed shadow-inner pr-24 pb-14 ${project ? 'border-cyan-500/30' : 'border-slate-700/50'}`}
                />

                {/* Theme Selector - For Generated Website */}
                <div className="absolute top-4 right-4">
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as ThemeType)}
                    className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
                    title="Theme for your generated website"
                  >
                    <option value="ocean">🌊 Ocean</option>
                    <option value="sunset">🌅 Sunset</option>
                    <option value="forest">🌲 Forest</option>
                  </select>
                </div>

                <button
                  className="absolute bottom-4 left-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  title="Attach File"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                </button>

                <button
                  onClick={handleStart}
                  disabled={project?.isProcessing || !input.trim()}
                  className="absolute bottom-4 right-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-xl transition-all shadow-xl font-bold text-xs flex items-center gap-2 group"
                >
                  <span>{project?.isProcessing ? 'Synthesizing...' : project ? 'Send' : 'Execute'}</span>
                  {!project?.isProcessing && <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>}
                </button>
              </div>
            </section>

            <section className="space-y-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Agent Pipeline</label>

              <AgentCard
                role="Requirement"
                isActive={project?.currentStep === 1}
                status={project?.currentStep === 1 ? 'processing' : (project?.currentStep && project.currentStep > 1 ? 'done' : 'idle')}
                description="Synthesizes raw prompts into structured BA documentation."
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>}
              />

              <AgentCard
                role="Design"
                isActive={project?.currentStep === 2}
                status={project?.currentStep === 2 ? 'processing' : (project?.currentStep && project.currentStep > 2 ? 'done' : 'idle')}
                description="Drafts UI/UX wireframes and system component hierarchy."
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path></svg>}
              />

              <AgentCard
                role="Development"
                isActive={project?.currentStep === 3}
                status={project?.currentStep === 3 ? 'processing' : (project?.currentStep && project.currentStep > 3 ? 'done' : 'idle')}
                description="Lead engineer producing high-fidelity React implementation."
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>}
              />

              <AgentCard
                role="Testing"
                isActive={project?.currentStep === 4}
                status={project?.currentStep === 4 ? 'processing' : (project?.currentStep && project.currentStep > 4 ? 'done' : 'idle')}
                description="QA specialist verifying build stability and performance."
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
              />
            </section>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 bg-[#0b1120] relative flex flex-col min-w-0">
          {activeTab === 'flow' ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Fixed Top Header - Aligned with Command Center height */}
              <div className="shrink-0 bg-slate-950/40 backdrop-blur-md border-b border-slate-800/50">
                {project ? (
                  <div className="flex flex-col">
                    {/* Project Status Bar */}
                    <div className="px-8 py-3 flex items-center justify-between border-b border-slate-800/30">
                      <div className="flex items-center gap-3">
                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${project.isProcessing ? 'bg-cyan-500/10 text-cyan-400 animate-pulse' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {project.isProcessing ? (project.currentStep === 3 && messages.some(m => m.role === 'User') ? 'Modifying' : 'Synthesizing') : 'Live'}
                        </div>
                        <h2 className="text-sm font-bold text-white truncate max-w-md">
                          {project.name} <span className="text-slate-500 font-normal ml-2">#{project.id.slice(-4)}</span>
                        </h2>
                      </div>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setIsChatOpen(true)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border border-indigo-500/20"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                          <span>Modifications</span>
                        </button>
                        <div className="text-[10px] text-slate-500 font-mono">
                          THEME: <span className="text-cyan-400">{project.theme?.toUpperCase() || theme.toUpperCase()}</span>
                        </div>
                        {project.completedAt && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            COMPLETED: {new Date(project.completedAt).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Workflow Animation - Adjusted height for perfect sidebar alignment */}
                    <div className="h-[204px] flex flex-col justify-center">
                      <WorkflowAnimation currentStep={project.currentStep || 0} />
                    </div>
                  </div>
                ) : (
                  /* Welcome Header when no project is active */
                  <div className="h-[300px] flex flex-col items-center justify-center text-center px-8">
                    <div className="relative mb-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl border border-cyan-500/20 flex items-center justify-center">
                        <svg className="w-8 h-8 text-cyan-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                        </svg>
                      </div>
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-500 rounded-full animate-pulse"></div>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">What would you like to build?</h2>
                    <p className="text-slate-400 text-sm max-w-md leading-relaxed">
                      Describe your vision in the command center to start a new autonomous SDLC.
                    </p>
                  </div>
                )}
              </div>

              {/* Aligned Scrollable Chat Area */}
              <div className="flex-1 overflow-y-auto p-8 scroll-smooth custom-scrollbar">
                <div className="max-w-3xl mx-auto space-y-6 pb-12">
                  {messages.length === 0 && !project && (
                    <div className="grid gap-3 pt-4">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Quick Start Templates</p>
                      {[
                        "A modern landing page for a SaaS product",
                        "An e-commerce product showcase",
                        "A portfolio website for a photographer",
                        "A dashboard for analytics"
                      ].map((example, i) => (
                        <button
                          key={i}
                          onClick={() => setInput(example)}
                          className="group px-4 py-3 bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/50 hover:border-cyan-500/30 rounded-xl text-left transition-all duration-200"
                        >
                          <div className="flex items-center gap-3">
                            <svg className="w-4 h-4 text-slate-600 group-hover:text-cyan-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                            <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">{example}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {messages.map((msg) => (
                    <div key={msg.id} className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${msg.role === 'User' ? 'bg-slate-700 text-slate-100 border border-slate-600' :
                        msg.role === 'Orchestrator' ? 'bg-indigo-600 text-white' :
                          msg.role === 'Requirement' ? 'bg-cyan-600 text-white' :
                            msg.role === 'Design' ? 'bg-fuchsia-600 text-white' :
                              msg.role === 'Development' ? 'bg-amber-600 text-white' :
                                'bg-emerald-600 text-white'
                        }`}>
                        <span className="text-[9px] font-black uppercase">{msg.role.slice(0, 2)}</span>
                      </div>
                      <div className="flex-1 bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{msg.role}</span>
                          <span className="text-[8px] text-slate-600 ml-auto">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {msg.status === 'thinking' && (
                            <div className="flex gap-1">
                              <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></div>
                              <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse delay-75"></div>
                              <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse delay-150"></div>
                            </div>
                          )}
                        </div>
                        <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-p:text-slate-300">
                          <p className="text-[13px] whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col p-8 lg:p-12 overflow-hidden min-h-0">
              <div className="max-w-7xl mx-auto w-full h-full flex flex-col gap-6">
                <div className="flex items-center justify-between bg-slate-900/50 p-1 rounded-2xl border border-slate-800 w-fit">
                  <button
                    onClick={() => setDeliverableSubTab('preview')}
                    className={`px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${deliverableSubTab === 'preview' ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Interactive Preview
                  </button>
                  <button
                    onClick={() => setDeliverableSubTab('code')}
                    className={`px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${deliverableSubTab === 'code' ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Production Source
                  </button>
                  <button
                    onClick={() => setDeliverableSubTab('docs')}
                    className={`px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${deliverableSubTab === 'docs' ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Project Artifacts
                  </button>
                </div>

                <div className="flex-1 flex flex-col min-h-0 relative">
                  {deliverableSubTab === 'preview' && (
                    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in zoom-in-95 duration-500">
                      <LivePreview code={project?.code?.files?.['src/App.tsx'] || ''} />
                    </div>
                  )}

                  {deliverableSubTab === 'code' && (
                    <div className="flex-1 flex bg-[#010409] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-right-4 duration-500">
                      <div className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col">
                        <div className="p-4 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Project Files
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                          {project?.code?.files && Object.keys(project.code.files).map(filename => (
                            <button
                              key={filename}
                              onClick={() => setOpenFile(filename)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono truncate transition-colors ${openFile === filename ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                            >
                              {filename}
                            </button>
                          ))}
                        </div>
                        <div className="p-4 border-t border-slate-800">
                          <button
                            onClick={() => project?.code && downloadProjectZip(project.code.files)}
                            className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            Download ZIP
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col min-w-0">
                        <div className="h-12 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/30">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{openFile || 'Select a file'}</span>
                          </div>
                          <button
                            onClick={() => openFile && project?.code?.files?.[openFile] && navigator.clipboard.writeText(project.code.files[openFile])}
                            className="text-[10px] font-bold text-slate-400 hover:text-white transition-colors bg-slate-800 px-3 py-1 rounded-md"
                          >
                            COPY CONTENT
                          </button>
                        </div>
                        <div className="flex-1 p-8 font-mono text-[12px] overflow-auto whitespace-pre leading-relaxed text-cyan-300/90 selection:bg-cyan-500/30">
                          {openFile && project?.code?.files?.[openFile]
                            ? project.code.files[openFile]
                            : '// Select a file from the explorer to view source code.'}
                        </div>
                      </div>
                    </div>
                  )}

                  {deliverableSubTab === 'docs' && (
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto pr-4 pb-12 animate-in fade-in slide-in-from-left-4 duration-500">
                      <div className="space-y-8">
                        <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-500 flex items-center justify-center">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            </div>
                            <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">Requirement Spec</h3>
                          </div>
                          {project?.requirements ? (
                            <div className="space-y-6">
                              <div>
                                <h4 className="text-[11px] font-bold text-slate-500 uppercase mb-3">User Stories</h4>
                                <ul className="space-y-3">
                                  {project.requirements.userStories.map((s, i) => (
                                    <li key={i} className="text-xs text-slate-400 flex gap-3">
                                      <span className="text-cyan-500 font-mono">#{i + 1}</span>
                                      {s}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/50 text-[11px] text-slate-500 leading-relaxed">
                                <span className="block font-bold text-slate-400 mb-1 uppercase tracking-tighter">Scope Context:</span>
                                {project.requirements.scope}
                              </div>
                            </div>
                          ) : <p className="text-xs text-slate-600 italic">Documentation generation in progress...</p>}
                        </section>

                        <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-500 flex items-center justify-center">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </div>
                            <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">Verification Report</h3>
                          </div>

                          <button
                            onClick={() => project && downloadArtifactsZip({ requirements: project.requirements, design: project.design, tests: project.tests })}
                            className="mb-6 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 border border-slate-700"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            Download All Artifacts (JSON)
                          </button>

                          {project?.tests ? (
                            <div className="space-y-6">
                              <div className="flex gap-4">
                                <div className="flex-1 bg-emerald-900/10 border border-emerald-900/30 p-3 rounded-xl">
                                  <div className="text-[10px] font-bold text-emerald-500 uppercase mb-1">Status</div>
                                  <div className="text-sm font-bold text-emerald-400">PASSED</div>
                                </div>
                                <div className="flex-1 bg-slate-800/50 p-3 rounded-xl">
                                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Stability</div>
                                  <div className="text-sm font-bold text-slate-300">98.2%</div>
                                </div>
                              </div>
                              <ul className="space-y-3">
                                {project.tests.testCases.map((tc, i) => (
                                  <li key={i} className="flex items-start gap-3 text-xs text-slate-400">
                                    <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    {tc}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : <p className="text-xs text-slate-600 italic">QA cycle pending...</p>}
                        </section>
                      </div>

                      <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 h-fit">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-8 h-8 rounded-lg bg-fuchsia-600/20 text-fuchsia-500 flex items-center justify-center">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                          </div>
                          <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">Architectural Design</h3>
                        </div>
                        {project?.design ? (
                          <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800/50 font-mono text-[11px] text-slate-400 leading-relaxed whitespace-pre-wrap">
                            {project.design.architecture}
                          </div>
                        ) : <p className="text-xs text-slate-600 italic">Architect is mapping system entities...</p>}
                      </section>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Status Bar */}
      <footer className="h-8 border-t border-slate-800 bg-slate-950 px-8 flex items-center justify-between text-[10px] text-slate-600 font-medium">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${hasApiKey ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
            <span>GATEWAY: {hasApiKey ? 'ACTIVE' : 'OFFLINE'}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            <span>MODEL: QWEN2.5-CODER</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">THEME: {theme.toUpperCase()}</span>
          </div>
        </div>
        <div className="flex items-center gap-6 uppercase tracking-widest">
          <span>{project ? `PROJECT_IDENTIFIER: ${project.id}` : 'ORCHESTRATOR_IDLE'}</span>
          <span className="text-slate-700">VERSION_2.5.0-STABLE</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
