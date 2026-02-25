"use client";

import React, { useState, Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, PerspectiveCamera, Float, Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';

interface LoginScreenProps {
    onLogin: () => void;
}

// ─── 3D Neural Flow (Left Side) ─────────────────────────────────────────────
import NeuralFlow from './NeuralFlow';

// ─── Main Screen ─────────────────────────────────────────────────────────────
const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const endpoint = isLogin ? 'http://localhost:3001/auth/login' : 'http://localhost:3001/auth/register';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Authentication failed');
            }

            // Store token
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user)); // Store basic user info

            onLogin();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-screen w-screen flex bg-[#020205] text-slate-200 overflow-hidden font-sans">

            {/* Left Side: Immersive 3D Studio Branding (Hidden on mobile) */}
            <div className="hidden lg:flex w-1/2 relative bg-black border-r border-white/5">
                <div className="absolute inset-0 z-0">
                    <Canvas>
                        <PerspectiveCamera makeDefault position={[0, 0, 5]} />
                        <Suspense fallback={null}>
                            <NeuralFlow />
                            <Float speed={2} rotationIntensity={1} floatIntensity={1}>
                                <Sphere args={[1.2, 64, 64]}>
                                    <MeshDistortMaterial
                                        color="#4f46e5"
                                        speed={3}
                                        distort={0.4}
                                        radius={1}
                                        metalness={0.8}
                                    />
                                </Sphere>
                            </Float>
                            <ambientLight intensity={0.5} />
                            <pointLight position={[10, 10, 10]} intensity={1} color="#818cf8" />
                        </Suspense>
                    </Canvas>
                </div>

                <div className="relative z-10 flex flex-col justify-end p-20 h-full w-full bg-gradient-to-t from-[#020205] via-transparent to-transparent">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1 }}
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-2xl shadow-indigo-500/40">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            </div>
                            <h1 className="text-3xl font-black tracking-tighter text-white italic">KAIZEN DHARA</h1>
                        </div>
                        <p className="text-sm text-slate-400 max-w-sm leading-relaxed uppercase tracking-[0.3em] font-bold">
                            Continuous flow from <span className="text-indigo-400">Intent</span> to <span className="text-cyan-400">Production</span>.
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Right Side: Clean Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 relative">
                {/* Background Subtle Sparkles */}
                <div className="absolute inset-0 z-0 opacity-30">
                    <Canvas>
                        <Points positions={new Float32Array(3000).map(() => (Math.random() - 0.5) * 10)} stride={3}>
                            <PointMaterial size={0.01} color="#ffffff" transparent opacity={0.5} />
                        </Points>
                    </Canvas>
                </div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-full max-w-sm relative z-10"
                >
                    <div className="mb-8">
                        <h2 className="text-4xl font-black text-white tracking-tighter mb-3">{isLogin ? 'Access Studio' : 'Initialize Identity'}</h2>
                        <p className="text-slate-500 font-medium">
                            {isLogin ? 'Enter your credentials to manage your digital empire.' : 'Create a new secure identity for your workspace.'}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold uppercase tracking-wide flex items-center gap-3">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Identity</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-white placeholder-slate-700"
                                placeholder="Username"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Security Key</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-white placeholder-slate-700"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full group bg-white text-black font-black py-4 rounded-2xl transition-all active:scale-[0.95] flex items-center justify-center gap-3 mt-4 overflow-hidden relative"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                            ) : (
                                <span className="relative z-10 flex items-center gap-2 uppercase tracking-wider text-xs">
                                    {isLogin ? 'Enter Mainframe' : 'Establish Link'}
                                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                </span>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <button
                            onClick={() => { setIsLogin(!isLogin); setError(''); }}
                            className="text-xs font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest"
                        >
                            {isLogin ? 'New User? Create Access' : 'Existing User? Login'}
                        </button>
                    </div>

                    <div className="mt-12 pt-8 border-t border-white/5 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">v2.0 Autonomous</span>
                        <div className="flex gap-4">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Systems Nominal</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default LoginScreen;
