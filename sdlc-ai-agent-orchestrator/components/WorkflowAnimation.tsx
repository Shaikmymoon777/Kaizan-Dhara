"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WorkflowAnimationProps {
    currentStep: number;
}

const WorkflowAnimation: React.FC<WorkflowAnimationProps> = ({ currentStep }) => {
    const steps = [
        { id: 1, name: 'Semantic Input', label: 'Prompt', color: '#6366f1' },
        { id: 2, name: 'Logic Synthesis', label: 'Requirements', color: '#818cf8' },
        { id: 3, name: 'Interface Weaving', label: 'Design', color: '#a5b4fc' },
        { id: 4, name: 'Neural Coding', label: 'Development', color: '#06b6d4' },
        { id: 5, name: 'Autonomous QA', label: 'Testing', color: '#22d3ee' },
        { id: 6, name: 'Edge Deployment', label: 'Production', color: '#10b981' },
    ];

    return (
        <div className="w-full max-w-5xl mx-auto py-4">
            <div className="relative">
                {/* DHARA PIPELINE TRACK (The Laser Line) */}
                <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/5 -translate-y-1/2">
                    <motion.div
                        className="h-full bg-gradient-to-r from-transparent via-indigo-500 to-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.8)]"
                        initial={{ width: "0%" }}
                        animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                        transition={{ duration: 1, ease: "easeInOut" }}
                    />
                </div>

                {/* NEURAL NODES */}
                <div className="relative flex justify-between items-center">
                    {steps.map((step, index) => {
                        const isActive = currentStep === step.id;
                        const isCompleted = currentStep > step.id;

                        return (
                            <div key={step.id} className="relative flex flex-col items-center group">
                                {/* Node Artifact */}
                                <motion.div
                                    animate={{
                                        scale: isActive ? 1.2 : 1,
                                        borderColor: isActive ? step.color : isCompleted ? step.color : 'rgba(255,255,255,0.1)',
                                    }}
                                    className={`
                                        relative w-12 h-12 rounded-xl border flex items-center justify-center
                                        bg-[#020205] backdrop-blur-3xl z-10 transition-all duration-500
                                        ${isActive ? 'shadow-[0_0_25px_rgba(99,102,241,0.3)]' : ''}
                                    `}
                                >
                                    {/* Inner Pulse Ring */}
                                    {isActive && (
                                        <motion.div 
                                            className="absolute inset-0 rounded-xl border border-indigo-400"
                                            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                                            transition={{ repeat: Infinity, duration: 2 }}
                                        />
                                    )}

                                    {/* Status Indicator Core */}
                                    <div className={`
                                        w-2 h-2 rounded-full transition-all duration-500
                                        ${isActive ? 'bg-white scale-125 shadow-[0_0_10px_#fff]' : isCompleted ? 'bg-indigo-500' : 'bg-white/10'}
                                    `} />

                                    {/* Scanning Line (Only Active) */}
                                    {isActive && (
                                        <div className="absolute inset-0 overflow-hidden rounded-xl">
                                            <div className="w-full h-[1px] bg-indigo-400/50 animate-scan" />
                                        </div>
                                    )}
                                </motion.div>

                                {/* Metadata Labels */}
                                <div className="absolute top-16 whitespace-nowrap flex flex-col items-center">
                                    <span className={`
                                        text-[9px] font-black tracking-[0.3em] uppercase italic transition-colors duration-500
                                        ${isActive ? 'text-white' : isCompleted ? 'text-indigo-400' : 'text-slate-600'}
                                    `}>
                                        {step.label}
                                    </span>
                                    <span className={`
                                        text-[8px] font-bold tracking-tight mt-1 transition-opacity duration-500
                                        ${isActive ? 'opacity-100 text-slate-400' : 'opacity-0'}
                                    `}>
                                        {step.name}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* LIVE SYSTEM TELEMETRY */}
            <div className="mt-20 flex justify-center h-10">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-4 bg-white/[0.02] border border-white/5 px-6 py-2 rounded-full backdrop-blur-2xl"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                                Status: Flowing
                            </span>
                        </div>
                        <div className="w-px h-3 bg-white/10" />
                        <span className="text-[10px] font-bold text-slate-300 tracking-tight italic">
                            {currentStep === 1 && "Semantic mapping of user intent..."}
                            {currentStep === 2 && "Synthesizing logical dependencies..."}
                            {currentStep === 3 && "Weaving design tokens into UI layers..."}
                            {currentStep === 4 && "Compiling neural code blocks..."}
                            {currentStep === 5 && "Running autonomous validation swarm..."}
                            {currentStep === 6 && "Synchronizing with edge infrastructure..."}
                        </span>
                    </motion.div>
                </AnimatePresence>
            </div>

            <style>{`
                @keyframes scan {
                    0% { transform: translateY(-5px); }
                    100% { transform: translateY(50px); }
                }
                .animate-scan {
                    animation: scan 2s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default WorkflowAnimation;