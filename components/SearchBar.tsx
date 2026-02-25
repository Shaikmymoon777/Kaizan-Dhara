"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface SearchBarProps {
    onAttach?: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onAttach }) => {
    const [query, setQuery] = useState('');

    return (
        <div className="relative group w-72 hidden lg:block">
            {/* Ambient Background Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition duration-700 pointer-events-none" />

            <div className="relative flex items-center">
                {/* Search Icon / Neural Node */}
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <svg
                        className={`h-3.5 w-3.5 transition-colors duration-500 ${query ? 'text-indigo-400' : 'text-slate-600 group-focus-within:text-indigo-400'
                            }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                </div>

                {/* The Input Field (Obsidian Glass) */}
                <input
                    type="text"
                    className={`
                        block w-full pl-11 pr-12 py-2 
                        bg-white/[0.02] backdrop-blur-2xl
                        border border-white/10 rounded-xl
                        text-[11px] font-bold tracking-wider text-slate-200
                        placeholder:text-slate-600 placeholder:font-black placeholder:italic placeholder:tracking-[0.2em] placeholder:uppercase
                        focus:outline-none focus:bg-white/[0.05] focus:border-indigo-500/40 focus:ring-0
                        transition-all duration-500 shadow-2xl
                    `}
                    placeholder="Query Core..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />

                {/* Attachment Button */}
                <div className="absolute right-3 flex items-center gap-2">
                    <button
                        onClick={onAttach}
                        className="text-slate-600 hover:text-indigo-400 transition-colors tooltip"
                        title="Attach Document"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                    </button>
                    <kbd className="px-1.5 py-0.5 rounded border border-white/5 bg-black/40 text-[9px] font-black text-slate-700 tracking-tighter uppercase italic">
                        ⌘K
                    </kbd>
                </div>
            </div>

            {/* Scanning Focus Line */}
            <motion.div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[1px] bg-indigo-500/50 w-0 group-focus-within:w-full transition-all duration-700"
            />
        </div>
    );
};

export default SearchBar;
