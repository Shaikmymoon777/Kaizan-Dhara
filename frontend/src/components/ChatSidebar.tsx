"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentMessage } from '../types';
import { storage } from '../utils/storage';

interface ChatSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    messages: AgentMessage[];
    onSendMessage: (content: string) => void;
    isProcessing: boolean;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
    isOpen,
    onClose,
    projectId,
    messages,
    onSendMessage,
    isProcessing
}) => {
    const [inputValue, setInputValue] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [isOpen, messages]);

    const handleSend = () => {
        if (!inputValue.trim() || isProcessing) return;
        onSendMessage(inputValue);
        setInputValue('');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                    />

                    {/* Obsidian Sidebar */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full md:w-[500px] bg-[#020205] border-l border-white/10 shadow-[ -20px_0_50px_rgba(0,0,0,0.5)] z-[70] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-white/5 bg-white/[0.01]">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex flex-col">
                                    <h2 className="text-2xl font-black tracking-tighter italic uppercase text-white">
                                        Neural <span className="text-indigo-500">Modification</span>
                                    </h2>
                                    <span className="text-[9px] font-bold tracking-[0.4em] text-slate-500 uppercase mt-1">
                                        Project ID: #{projectId.slice(-6)}
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
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            {messages.map((msg, index) => (
                                <div
                                    key={msg.id}
                                    className={`flex flex-col ${msg.role === 'User' ? 'items-end' : 'items-start'} max-w-[85%] ${msg.role === 'User' ? 'ml-auto' : 'mr-auto'}`}
                                >
                                    <div className={`
                                        p-4 rounded-2xl text-xs leading-relaxed
                                        ${msg.role === 'User'
                                            ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-100 rounded-tr-none'
                                            : 'bg-white/[0.03] border border-white/10 text-slate-300 rounded-tl-none'}
                                    `}>
                                        <div className="flex items-center gap-2 mb-2 opacity-50">
                                            <span className="font-black uppercase tracking-widest text-[8px]">{msg.role}</span>
                                            <span className="text-[8px]">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-8 border-t border-white/5 bg-black/40 backdrop-blur-xl">
                            <div className="relative group">
                                <textarea
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    placeholder="Describe your modification..."
                                    className="w-full h-24 bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-xs font-medium text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all resize-none pr-12"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!inputValue.trim() || isProcessing}
                                    className={`
                                        absolute bottom-4 right-4 p-2 rounded-xl transition-all
                                        ${isProcessing || !inputValue.trim()
                                            ? 'text-slate-700 bg-white/5 cursor-not-allowed'
                                            : 'text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'}
                                    `}
                                >
                                    {isProcessing ? (
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            <p className="text-[8px] text-slate-600 mt-4 text-center tracking-widest uppercase font-bold">
                                Hit Enter to stream modifications to the pipeline
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ChatSidebar;
