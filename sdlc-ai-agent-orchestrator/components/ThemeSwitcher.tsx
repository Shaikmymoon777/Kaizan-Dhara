"use client";

import React from 'react';
import { motion } from 'framer-motion';

export type Theme = 'default' | 'cosmic' | 'nature';

interface ThemeSwitcherProps {
    currentTheme: Theme;
    onThemeChange: (theme: Theme) => void;
}

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ currentTheme, onThemeChange }) => {
    const themes = [
      { id: 'default', color: '#6366f1', label: 'Obsidian' },
      { id: 'cosmic', color: '#d946ef', label: 'Nebula' },
      { id: 'nature', color: '#10b981', label: 'Veridian' },
    ] as const;

    return (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl">
            {/* Theme Label */}
            <span className="text-[9px] font-black tracking-[0.3em] text-slate-600 uppercase italic ml-2 mr-1">
                Environment
            </span>

            <div className="flex gap-1">
                {themes.map((theme) => (
                    <button
                        key={theme.id}
                        onClick={() => onThemeChange(theme.id as Theme)}
                        className="relative group p-1.5 outline-none"
                        title={`${theme.label} Protocol`}
                    >
                        {/* The Node Artifact */}
                        <div 
                            className={`
                                relative w-3.5 h-3.5 rounded-full transition-all duration-500
                                ${currentTheme === theme.id 
                                    ? 'scale-110 shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
                                    : 'opacity-20 grayscale hover:opacity-50 hover:grayscale-0'
                                }
                            `}
                            style={{ 
                                backgroundColor: currentTheme === theme.id ? theme.color : '#475569',
                                border: currentTheme === theme.id ? `1.5px solid white` : '1.5px solid transparent'
                            }}
                        />

                        {/* Active Glow Ring */}
                        {currentTheme === theme.id && (
                            <motion.div 
                                layoutId="activeGlow"
                                className="absolute inset-0 rounded-full border border-white/20"
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                            />
                        )}

                        {/* Hover Tooltip - Studio Style */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-2 py-1 bg-black border border-white/10 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                            <span className="text-[8px] font-black tracking-widest text-white uppercase italic">
                                {theme.label} Mode
                            </span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ThemeSwitcher;