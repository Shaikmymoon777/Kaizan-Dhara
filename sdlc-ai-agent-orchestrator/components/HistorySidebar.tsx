"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HistoryItem } from '../types';
import { storage } from '../utils/storage';

interface HistorySidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectProject: (historyItem: HistoryItem) => void;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({
    isOpen,
    onClose,
    onSelectProject,
}) => {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);

    useEffect(() => {
        if (isOpen) loadHistory();
    }, [isOpen]);

    useEffect(() => {
        const fetchFiltered = async () => {
            if (searchQuery.trim()) {
                const results = await storage.history.search(searchQuery);
                setFilteredHistory(results);
            } else {
                setFilteredHistory(history);
            }
        };
        fetchFiltered();
    }, [searchQuery, history]);

    const loadHistory = async () => {
        const historyData = await storage.history.get();
        setHistory(historyData);
        setFilteredHistory(historyData);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await storage.history.delete(id);
        loadHistory();
    };

    const handleClearAll = async () => {
        if (window.confirm('Wipe all project memory? This action is irreversible.')) {
            await storage.history.clear();
            loadHistory();
        }
    };

    const formatDate = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* High-End Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60]"
                    />

                    {/* Obsidian Sidebar */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full md:w-[450px] bg-[#020205] border-l border-white/10 shadow-[ -20px_0_50px_rgba(0,0,0,0.5)] z-[70] overflow-hidden flex flex-col"
                    >
                        {/* Plasma Header */}
                        <div className="p-8 border-b border-white/5 bg-white/[0.01]">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex flex-col">
                                    <h2 className="text-2xl font-black tracking-tighter italic uppercase text-white">
                                        Archive <span className="text-indigo-500">Vault</span>
                                    </h2>
                                    <span className="text-[9px] font-bold tracking-[0.4em] text-slate-500 uppercase mt-1">
                                        Project Memory Retrieval
                                    </span>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-10 h-10 flex items-center justify-center rounded-full border border-white/10 hover:bg-white/5 transition-colors"
                                >
                                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Studio Search */}
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="SEARCH ARTIFACTS..."
                                    className="w-full px-5 py-4 pl-12 bg-white/[0.03] border border-white/10 rounded-xl text-xs font-bold tracking-widest text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                                />
                                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        {/* History Artifacts List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            {filteredHistory.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full opacity-30 grayscale">
                                    <div className="w-12 h-12 border-2 border-dashed border-slate-700 rounded-full flex items-center justify-center mb-4 animate-spin-slow">
                                        <div className="w-2 h-2 bg-slate-600 rounded-full" />
                                    </div>
                                    <p className="text-[10px] font-black tracking-widest uppercase">No Records Found</p>
                                </div>
                            ) : (
                                filteredHistory.map((item, index) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        onClick={() => {
                                            onSelectProject(item);
                                            onClose();
                                        }}
                                        className="group relative p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/40 hover:bg-white/[0.04] cursor-pointer transition-all duration-300"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="text-sm font-black tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                                                {item.name}
                                            </h3>
                                            <button
                                                onClick={(e) => handleDelete(item.id, e)}
                                                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/10 rounded-lg transition-all"
                                            >
                                                <svg className="w-4 h-4 text-red-500/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>

                                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-4 group-hover:text-slate-400 transition-colors">
                                            {item.prompt}
                                        </p>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                                                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                                                    {formatDate(item.timestamp)}
                                                </span>
                                            </div>
                                            {item.project.completedAt && (
                                                <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                                    <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                                                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">
                                                        Nominal
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>

                        {/* Vault Footer */}
                        {history.length > 0 && (
                            <div className="p-8 border-t border-white/5 bg-black">
                                <button
                                    onClick={handleClearAll}
                                    className="w-full py-4 text-[10px] font-black tracking-[0.3em] text-red-500/60 hover:text-red-500 hover:bg-red-500/5 border border-white/5 rounded-xl transition-all"
                                >
                                    PURGE VAULT CACHE
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default HistorySidebar;