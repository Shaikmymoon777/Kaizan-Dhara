import React, { useState } from 'react';
import { BookOpen, FileText, X, ChevronRight, ChevronLeft } from 'lucide-react';

export interface UserStory {
  id: string | number;
  story: string;
  description?: string;
  priority?: string;
  acceptanceCriteria?: string[];
}

interface UserStoriesLibraryProps {
  stories: UserStory[];
}

const UserStoriesLibrary: React.FC<UserStoriesLibraryProps> = ({ stories }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!stories || stories.length === 0) {
    return null;
  }

  return (
    <div className={`relative flex-shrink-0 bg-[#0f172a] flex flex-col h-full transition-all duration-300 z-20 ${isOpen ? 'w-[380px] border-l border-slate-800' : 'w-0 border-l-0'}`}>
      
      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -left-10 top-1/2 -translate-y-1/2 w-10 h-16 bg-[#0f172a] border border-slate-800 border-r-0 rounded-l-2xl flex items-center justify-center text-slate-400 hover:text-white shadow-[-8px_0_20px_-5px_rgba(0,0,0,0.5)] z-50 outline-none transition-colors"
        title={isOpen ? "Close Library" : "Open Library"}
      >
        {isOpen ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
      </button>

      <div className={`flex-1 flex flex-col min-w-[380px] overflow-hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
        <div className="h-16 flex-shrink-0 border-b border-slate-800 flex items-center justify-between px-6 bg-[#0f172a]/95 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <BookOpen className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-200 tracking-tight">User Stories Library</h2>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-0.5">
                Generated Content
              </p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Stories styled like notifications */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-gradient-to-b from-[#0f172a] to-[#0b1120]">
          {stories.map((story, idx) => {
            let priorityColor = "bg-slate-500";
            if (story.priority === "High" || story.priority === "Critical") priorityColor = "bg-rose-500";
            else if (story.priority === "Medium") priorityColor = "bg-amber-500";
            else if (story.priority === "Low") priorityColor = "bg-emerald-500";
            else priorityColor = "bg-indigo-500";

            return (
              <div
                key={story.id || idx}
                className="relative p-4 rounded-3xl bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 shadow-lg flex gap-4 overflow-hidden group hover:bg-slate-800/60 transition-all cursor-pointer hover:border-slate-600"
              >
                {/* Priority edge indicator */}
                <div className={`absolute top-0 left-0 w-1.5 h-full opacity-70 ${priorityColor}`}></div>
                
                {/* Icon Box */}
                <div className="w-12 h-12 rounded-[1rem] bg-black/50 flex items-center justify-center flex-shrink-0 border border-white/5 shadow-inner">
                  <FileText className="w-5 h-5 text-indigo-400 opacity-80" />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0 py-0.5">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-slate-200 text-[13px] truncate pr-2 group-hover:text-white transition-colors">
                      {story.story}
                    </h4>
                    <span className="text-[10px] font-bold text-slate-500 flex-shrink-0 mt-0.5">
                      #{story.id || idx + 1}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-medium">
                    {story.description || "No detailed description provided for this user story."}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default UserStoriesLibrary;
