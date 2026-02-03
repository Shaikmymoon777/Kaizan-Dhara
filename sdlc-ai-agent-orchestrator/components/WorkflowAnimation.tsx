"use client";

import React, { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Float, MeshDistortMaterial, PointMaterial } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";

interface WorkflowAnimationProps {
    currentStep: number;
}

// ─── Data Flow Particles (Three.js) ─────────────────────────────────────────
function DataParticles({ currentStep }: { currentStep: number }) {
    const pointsRef = useRef<THREE.Points>(null!);
    const count = 500;

    // Create a subtle 3D path for particles to follow
    const curve = useMemo(() => {
        return new THREE.CatmullRomCurve3([
            new THREE.Vector3(-10, 0, 0),
            new THREE.Vector3(-6, 1, 0),
            new THREE.Vector3(-2, -1, 0),
            new THREE.Vector3(2, 1, 0),
            new THREE.Vector3(6, -1, 0),
            new THREE.Vector3(10, 0, 0),
        ]);
    }, []);

    const particles = useMemo(() => {
        const positions = new Float32Array(count * 3);
        const offsets = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            offsets[i] = Math.random();
        }
        return { positions, offsets };
    }, []);

    useFrame((state) => {
        const time = state.clock.getElapsedTime() * 0.1;
        const posAttribute = pointsRef.current.geometry.attributes.position;

        for (let i = 0; i < count; i++) {
            // Move particles along the curve based on time + their individual offset
            const t = (time + particles.offsets[i]) % 1;
            const point = curve.getPoint(t);
            posAttribute.setXYZ(i, point.x, point.y + Math.sin(time * 10 + i) * 0.1, point.z);
        }
        posAttribute.needsUpdate = true;
    });

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={particles.positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <PointMaterial
                transparent
                color="#6366f1"
                size={0.05}
                sizeAttenuation={true}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                opacity={0.4}
            />
        </points>
    );
}

// ─── 3D Node Artifact ──────────────────────────────────────────────────────
function NodeArtifact({ position, active, color }: { position: [number, number, number]; active: boolean; color: string }) {
    return (
        <Float speed={active ? 4 : 1} rotationIntensity={active ? 2 : 0.5} floatIntensity={active ? 2 : 0.5}>
            <mesh position={position}>
                <sphereGeometry args={[active ? 0.6 : 0.3, 32, 32]} />
                {active ? (
                    <MeshDistortMaterial
                        color={color}
                        speed={4}
                        distort={0.4}
                        radius={1}
                        metalness={0.8}
                        roughness={0.2}
                        emissive={color}
                        emissiveIntensity={2}
                    />
                ) : (
                    <meshStandardMaterial
                        color="#1e293b"
                        metalness={0.9}
                        roughness={0.1}
                        transparent
                        opacity={0.5}
                    />
                )}
            </mesh>
        </Float>
    );
}

// ─── Main Workflow Component ───────────────────────────────────────────────
export default function WorkflowAnimation({ currentStep }: WorkflowAnimationProps) {
    const steps = [
        { id: 1, label: "Prompt", name: "Semantic Input", color: "#6366f1", pos: [-10, 0, 0] },
        { id: 2, label: "Reqs", name: "Logic Synthesis", color: "#818cf8", pos: [-6, 1, 0] },
        { id: 3, label: "Design", name: "Visual Weaving", color: "#a5b4fc", pos: [-2, -1, 0] },
        { id: 4, label: "Dev", name: "Neural Coding", color: "#06b6d4", pos: [2, 1, 0] },
        { id: 5, label: "Testing", name: "Autonomous QA", color: "#22d3ee", pos: [6, -1, 0] },
        { id: 6, label: "Deploy", name: "Edge Pipeline", color: "#10b981", pos: [10, 0, 0] },
    ];

    return (
        <div className="w-full h-full flex flex-col items-center justify-center py-4 relative">

            {/* 3D DHARA PIPELINE CANVAS */}
            <div className="w-full h-64 relative z-10 cursor-grab active:cursor-grabbing">
                <Canvas>
                    <PerspectiveCamera makeDefault position={[0, 0, 12]} />
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1.5} color="#4f46e5" />

                    <Suspense fallback={null}>
                        <DataParticles currentStep={currentStep} />

                        {steps.map((step) => (
                            <NodeArtifact
                                key={step.id}
                                position={step.pos as [number, number, number]}
                                active={currentStep === step.id}
                                color={step.color}
                            />
                        ))}

                        {/* The Connecting Spline (Ghost Path) */}
                        <mesh>
                            <tubeGeometry args={[new THREE.CatmullRomCurve3(steps.map(s => new THREE.Vector3(...s.pos))), 64, 0.02, 8, false]} />
                            <meshBasicMaterial color="#ffffff" transparent opacity={0.05} />
                        </mesh>
                    </Suspense>
                </Canvas>

                {/* Floating Labels Overlay (2D) */}
                <div className="absolute inset-0 pointer-events-none flex justify-between items-center px-4">
                    {steps.map((step) => (
                        <div
                            key={step.id}
                            className={`flex flex-col items-center transition-all duration-700 ${currentStep === step.id ? 'opacity-100' : 'opacity-20'}`}
                            style={{ width: '120px' }}
                        >
                            <span className="text-[10px] font-black tracking-[0.3em] uppercase italic text-white mb-20">
                                {step.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* LIVE TELEMETRY STATUS (Bottom) */}
            <div className="mt-6 w-full max-w-2xl px-4 relative z-20">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: -10, filter: "blur(10px)" }}
                        className="flex items-center gap-6 bg-white/[0.03] border border-white/10 p-4 rounded-2xl backdrop-blur-3xl shadow-2xl"
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400">Flow Status</span>
                                <span className="text-xs font-black text-white italic tracking-tight uppercase">{steps[Math.max(0, Math.min(steps.length - 1, currentStep - 1))].name}</span>
                            </div>
                        </div>

                        <div className="w-px h-8 bg-white/10" />

                        <p className="text-[11px] font-medium text-slate-400 italic">
                            {currentStep === 1 && "Semantic mapping of user intent..."}
                            {currentStep === 2 && "Synthesizing logical dependencies and constraints..."}
                            {currentStep === 3 && "Weaving design tokens into autonomous UI layers..."}
                            {currentStep === 4 && "Compiling neural code blocks and edge logic..."}
                            {currentStep === 5 && "Initiating self-healing validation swarm..."}
                            {currentStep === 6 && "Synchronizing artifact with global edge infrastructure..."}
                        </p>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Progress Counter */}
            <div className="mt-4 text-[9px] font-bold tracking-[0.5em] text-slate-600 uppercase">
                Step {currentStep} <span className="mx-2">/</span> 06
            </div>
        </div>
    );
}
