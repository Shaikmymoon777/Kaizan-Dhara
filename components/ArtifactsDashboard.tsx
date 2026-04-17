import React, { useState } from "react";
import { CheckCircle2, AlertCircle, LayoutTemplate, FileText, Code2, Beaker, ShieldAlert, Activity, Check, Target, ChevronDown, Maximize2, X } from "lucide-react";
import { SDLCProject } from "../types";
import MermaidDiagram from "./MermaidDiagram";
import { motion, AnimatePresence } from "framer-motion";

type TabId = "req" | "design" | "qa";

interface ArtifactsDashboardProps {
  project: SDLCProject;
}

/**
 * Automatically converts long text blocks into structured points.
 */
const BulletizedText: React.FC<{ text: string; className?: string; pointColor?: string }> = ({ 
  text, 
  className = "text-slate-300", 
  pointColor = "bg-cyan-500/40" 
}) => {
  if (!text) return null;
  
  const points = text.split(/(?<=\.)\s+|\n\n+/).filter(p => p.trim().length > 5);
  
  if (points.length <= 1 && text.length < 150) {
    return <p className={`${className} leading-relaxed`}>{text}</p>;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {points.map((point, idx) => (
        <div key={idx} className="flex gap-4 group/pt transition-all duration-300 items-start">
          <div className={`w-1.5 h-1.5 rounded-full ${pointColor} mt-2.5 flex-shrink-0 group-hover/pt:scale-125 transition-all shadow-sm`} />
          <p className="leading-relaxed opacity-90 group-hover:opacity-100 transition-opacity">
            {point.trim()}
          </p>
        </div>
      ))}
    </div>
  );
};

const CollapsibleSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  badge?: string;
  colorClass?: string;
}> = ({ title, icon, children, isOpen, onToggle, badge, colorClass = "text-cyan-400" }) => {
  return (
    <div className="bg-[#0d1424] rounded-[2rem] border border-slate-800/80 overflow-hidden shadow-xl transition-all duration-300 hover:border-slate-700/50">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-8 py-5 bg-[#111a2e]/50 hover:bg-[#111a2e] transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 ${colorClass}`}>
            {icon}
          </div>
          <div className="text-left">
            <h4 className="text-[13px] font-black text-white uppercase tracking-wider">{title}</h4>
            {badge && <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{badge}</span>}
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform duration-500 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
          >
            <div className="p-8 border-t border-slate-800/40 bg-[#0d1424]/30">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ArtifactsDashboard: React.FC<ArtifactsDashboardProps> = ({ project }) => {
  const [activeTab, setActiveTab] = useState<TabId>("req");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    req_vision: true,
    design_system: true,
    qa_audit: true
  });
  const [modalDiagram, setModalDiagram] = useState<{ title: string; chart: string } | null>(null);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode; color: string }[] = [
    { id: "req", label: "Requirements", icon: <FileText className="w-4 h-4" />, color: "text-cyan-400 bg-cyan-400/10" },
    { id: "design", label: "Architecture", icon: <LayoutTemplate className="w-4 h-4" />, color: "text-fuchsia-400 bg-fuchsia-400/10" },
    { id: "qa", label: "Verification", icon: <Beaker className="w-4 h-4" />, color: "text-emerald-400 bg-emerald-400/10" }
  ];

  return (
    <div className="flex-1 flex flex-col h-full animate-in fade-in slide-in-from-left-4 duration-500 font-sans overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 px-2 gap-4 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
            Project Artifacts
          </h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Structured Strategic Output</p>
        </div>

        <div className="flex gap-1.5 p-1 bg-slate-900/80 border border-slate-800/80 rounded-2xl backdrop-blur-md shadow-2xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all duration-300 uppercase tracking-wider ${
                activeTab === tab.id 
                  ? `${tab.color} shadow-lg shadow-black/40 ring-1 ring-white/5 scale-[1.02]` 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <div className={activeTab === tab.id ? 'opacity-100 scale-110' : 'opacity-70 transition-transform'}>{tab.icon}</div>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0 bg-[#090e1a]/80 border border-slate-800/60 rounded-[3rem] backdrop-blur-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-10 space-y-6">
            <AnimatePresence mode="wait">
              {activeTab === "req" && (
                <motion.div
                  key="req"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {!project?.requirements ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-600 space-y-4">
                      <Activity className="w-12 h-12 animate-pulse" />
                      <p className="text-sm font-bold uppercase tracking-widest">Awaiting Requirements Logic...</p>
                    </div>
                  ) : (
                    <>
                      <CollapsibleSection
                        title="Strategic Vision"
                        icon={<Target className="w-4 h-4" />}
                        isOpen={!!expandedSections.req_vision}
                        onToggle={() => toggleSection("req_vision")}
                        badge="Executive Summary"
                        colorClass="text-cyan-400"
                      >
                        <BulletizedText 
                          text={project.requirements.executiveSummary} 
                          className="text-[15px] text-slate-200 text-left font-medium leading-[1.8]" 
                        />
                      </CollapsibleSection>

                      <CollapsibleSection
                        title="Functional Decomposition"
                        icon={<FileText className="w-4 h-4" />}
                        isOpen={!!expandedSections.req_stories}
                        onToggle={() => toggleSection("req_stories")}
                        badge={`${(project.requirements.userStories || []).length} USER STORIES`}
                        colorClass="text-indigo-400"
                      >
                        <div className="grid grid-cols-1 gap-6">
                          {(Array.isArray(project.requirements.userStories) ? project.requirements.userStories : []).map((s: any, i: number) => (
                            <div key={i} className="bg-slate-900/40 rounded-3xl border border-slate-800/80 p-6 space-y-6">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-500 font-mono">SPEC-{s.id || String(i+1).padStart(3, '0')}</span>
                                {s.priority && (
                                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                                    s.priority === 'High' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-slate-800 text-slate-400'
                                  }`}>{s.priority}</span>
                                )}
                              </div>
                              <div className="space-y-6">
                                <BulletizedText 
                                  text={typeof s === "string" ? s : s.story} 
                                  className="text-[14px] text-slate-100 font-bold"
                                />
                                {Array.isArray(s.acceptanceCriteria) && s.acceptanceCriteria.length > 0 && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-4 border-t border-slate-800/40">
                                    {s.acceptanceCriteria.map((ac: string, j: number) => (
                                      <div key={j} className="flex gap-2 items-start p-2.5 bg-slate-950/40 rounded-xl border border-slate-800/50">
                                        <Check className="w-3 h-3 text-cyan-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-[12px] text-slate-400 leading-snug">{ac}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleSection>

                      <CollapsibleSection
                        title="Project Governance"
                        icon={<Activity className="w-4 h-4" />}
                        isOpen={!!expandedSections.req_governance}
                        onToggle={() => toggleSection("req_governance")}
                        badge="Scope & Constraints"
                        colorClass="text-fuchsia-400"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="p-6 bg-slate-900/60 rounded-3xl border border-slate-800/60">
                            <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">In-Scope Boundaries</h5>
                            <BulletizedText text={project.requirements.scope} pointColor="bg-indigo-500/40" className="text-[13px]" />
                          </div>
                          <div className="p-6 bg-slate-900/60 rounded-3xl border border-slate-800/60">
                            <h5 className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest mb-4 text-right">Technical Constraints</h5>
                            <div className="space-y-3">
                              {Array.isArray(project.requirements.technicalConstraints) && project.requirements.technicalConstraints.map((tc: string, k: number) => (
                                <div key={k} className="flex gap-3 items-center text-[12px] text-slate-400 justify-end">
                                  {tc}
                                  <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-500/50" />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CollapsibleSection>
                    </>
                  )}
                </motion.div>
              )}

              {activeTab === "design" && (
                <motion.div
                  key="design"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {!project?.design ? (
                     <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-600 space-y-4">
                      <LayoutTemplate className="w-12 h-12 animate-pulse" />
                      <p className="text-sm font-bold uppercase tracking-widest">Rendering Blueprints...</p>
                    </div>
                  ) : (
                    <>
                      <CollapsibleSection
                        title="Design System"
                        icon={<Activity className="w-4 h-4" />}
                        isOpen={!!expandedSections.design_system}
                        onToggle={() => toggleSection("design_system")}
                        badge="Visual Identity"
                        colorClass="text-fuchsia-400"
                      >
                        <BulletizedText text={project.design.designSystem} pointColor="bg-fuchsia-500/40" className="text-[14px]" />
                      </CollapsibleSection>

                      <CollapsibleSection
                        title="Architecture Logic"
                        icon={<LayoutTemplate className="w-4 h-4" />}
                        isOpen={!!expandedSections.design_architecture}
                        onToggle={() => toggleSection("design_architecture")}
                        badge="Mermaid Schematics"
                        colorClass="text-indigo-400"
                      >
                        <div className="grid grid-cols-1 gap-8">
                          {[
                            { title: "System Workflow", chart: project.design.architectureDiagram },
                            { title: "Logic Components", chart: project.design.componentDiagram },
                            { title: "Data Relationships", chart: project.design.erDiagram }
                          ].map((diag, idx) => diag.chart && (
                            <div key={idx} className="space-y-3 relative group">
                              <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{diag.title}</h5>
                              <div className="bg-[#010409] p-8 rounded-[2rem] border border-slate-800/80 overflow-hidden shadow-2xl relative">
                                <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => setModalDiagram({ title: diag.title, chart: diag.chart })}
                                    className="p-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg backdrop-blur-md transition-all border border-slate-600 shadow-xl"
                                  >
                                    <Maximize2 className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="pointer-events-none origin-top scale-[0.85]">
                                  <MermaidDiagram chart={diag.chart} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleSection>

                      <CollapsibleSection
                        title="Technical Specs"
                        icon={<Code2 className="w-4 h-4" />}
                        isOpen={!!expandedSections.design_specs}
                        onToggle={() => toggleSection("design_specs")}
                        badge="API & Interaction"
                        colorClass="text-cyan-400"
                      >
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                           <div className="space-y-4">
                              <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">End-point structures</h5>
                              <div className="grid grid-cols-1 gap-2">
                                {Array.isArray(project.design.apiEndpoints) && project.design.apiEndpoints.map((ep: string, k: number) => (
                                  <div key={k} className="flex items-center gap-4 p-3 bg-slate-900/60 rounded-xl border border-slate-800/60 font-mono">
                                    <div className="text-[9px] font-black text-fuchsia-500 opacity-60">API-{k+1}</div>
                                    <div className="text-[12px] text-slate-300 truncate">{ep}</div>
                                  </div>
                                ))}
                              </div>
                           </div>
                           <div className="p-6 bg-slate-950/60 rounded-3xl border border-slate-800/80">
                             <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">UX Blueprint</h5>
                             <BulletizedText text={project.design.wireframes} pointColor="bg-indigo-500/40" className="text-[13px] text-slate-400" />
                           </div>
                        </div>
                      </CollapsibleSection>
                    </>
                  )}
                </motion.div>
              )}

              {activeTab === "qa" && (
                <motion.div
                  key="qa"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {!project?.tests ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-600 space-y-4">
                      <Beaker className="w-12 h-12 animate-pulse" />
                      <p className="text-sm font-bold uppercase tracking-widest">Running Verification Pack...</p>
                    </div>
                  ) : (
                    <>
                      <CollapsibleSection
                        title="Verification Audit"
                        icon={<ShieldAlert className="w-4 h-4" />}
                        isOpen={!!expandedSections.qa_audit}
                        onToggle={() => toggleSection("qa_audit")}
                        badge="Senior QA Review"
                        colorClass="text-emerald-400"
                      >
                         <BulletizedText text={project.tests.executiveSummary} pointColor="bg-emerald-500/40" className="text-[14px]" />
                      </CollapsibleSection>

                      <CollapsibleSection
                        title="Traceability Matrix"
                        icon={<CheckCircle2 className="w-4 h-4" />}
                        isOpen={!!expandedSections.qa_matrix}
                        onToggle={() => toggleSection("qa_matrix")}
                        badge={`${(project.tests.testCases || []).length} VALIDATION NODES`}
                        colorClass="text-cyan-400"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           {(Array.isArray(project.tests.testCases) ? project.tests.testCases : []).map((tc: any, i: number) => (
                              <div key={i} className="flex gap-4 p-5 bg-slate-900/30 rounded-3xl border border-slate-800/60">
                                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                   tc.status === 'passed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                 }`}>
                                   {tc.status === 'passed' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                 </div>
                                 <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                       <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">CASE-{i+1}</span>
                                       <div className={`w-1 h-1 rounded-full ${tc.status === 'passed' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                    </div>
                                    <p className="text-[13px] font-bold text-slate-200 leading-snug">{tc.description}</p>
                                 </div>
                              </div>
                           ))}
                        </div>
                      </CollapsibleSection>

                      <CollapsibleSection
                        title="Architectural Source Audit"
                        icon={<Activity className="w-4 h-4" />}
                        isOpen={!!expandedSections.qa_source}
                        onToggle={() => toggleSection("qa_source")}
                        badge="Technical Debt Analysis"
                        colorClass="text-indigo-400"
                      >
                         <div className="p-8 bg-[#010409] rounded-3xl border border-slate-800/80">
                           <BulletizedText text={project.tests.codeAudit} pointColor="bg-emerald-300/30" className="text-[12px] text-slate-500 font-mono" />
                         </div>
                      </CollapsibleSection>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Focus Modal for Diagrams */}
      <AnimatePresence>
        {modalDiagram && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-6xl h-full max-h-[90vh] bg-[#010409] rounded-[3rem] border border-slate-800 shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-8 border-b border-slate-800 bg-slate-900/20">
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-wider">{modalDiagram.title}</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Focus Analysis View</p>
                </div>
                <button
                  onClick={() => setModalDiagram(null)}
                  className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl transition-all border border-slate-600 shadow-xl"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-12 flex justify-center custom-scrollbar">
                <div className="w-full max-w-4xl">
                  <MermaidDiagram chart={modalDiagram.chart} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ArtifactsDashboard;
