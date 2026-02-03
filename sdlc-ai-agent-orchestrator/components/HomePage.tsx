"use client";

import React, { Suspense, useRef, useMemo, useState, useEffect } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Points, PointMaterial, Stars, Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";

// ─── 3D Flow Particles (Optimized) ──────────────────────────────────────────
function FlowParticles() {
  const points = useRef<THREE.Points>(null!);
  const count = 4000; // Increased density
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 35;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 35;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 35;
    }
    return pos;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * 0.1;
    points.current.rotation.y = t * 0.5;
    points.current.rotation.z = t * 0.2;
  });

  return (
    <Points ref={points} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#818cf8"
        size={0.03}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.8}
      />
    </Points>
  );
}

// ─── Shooting Stars ──────────────────────────────────────────
function ShootingStars() {
  const starsCount = 40; // Increased count
  const stars = useMemo(() => {
    return Array.from({ length: starsCount }, (_, i) => ({
      id: i,
      startPos: [
        (Math.random() - 0.5) * 60, // Wider spread
        Math.random() * 30 + 10,
        (Math.random() - 0.5) * 40,
      ],
      velocity: [
        -(Math.random() * 8 + 4), // Much faster
        -(Math.random() * 6 + 3),
        -(Math.random() * 4 + 2),
      ],
      delay: Math.random() * 20,
    }));
  }, []);

  return (
    <>
      {stars.map((star) => (
        <ShootingStar key={star.id} {...star} />
      ))}
    </>
  );
}

function ShootingStar({ startPos, velocity, delay }: any) {
  const groupRef = useRef<THREE.Group>(null!);

  // Calculate orientation once
  const orientation = useMemo(() => {
    const v = new THREE.Vector3(...velocity).normalize();
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
    return quaternion;
  }, [velocity]);

  useFrame((state) => {
    if (!groupRef.current) return;

    const elapsed = state.clock.getElapsedTime();
    const cycleTime = 12; // Longer cycle for varied timing
    const localTime = (elapsed + delay) % cycleTime;

    const duration = 1.2; // Fast zip
    if (localTime < duration) {
      const progress = localTime / duration;

      // Calculate eased position
      groupRef.current.position.set(
        startPos[0] + velocity[0] * progress * 8,
        startPos[1] + velocity[1] * progress * 8,
        startPos[2] + velocity[2] * progress * 8
      );

      // Easing for opacity (fade in then out)
      const opacity = Math.sin(progress * Math.PI);
      groupRef.current.visible = true;
      groupRef.current.scale.setScalar(0.5 + progress * 0.5);

      // Apply opacity to all materials in group
      groupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          (child.material as THREE.MeshBasicMaterial).opacity = opacity * 1.5;
        }
      });
    } else {
      groupRef.current.visible = false;
    }
  });

  return (
    <group ref={groupRef} quaternion={orientation}>
      {/* The Core streak */}
      <mesh>
        <cylinderGeometry args={[0.02, 0.08, 3, 8]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Blue Glow Streak */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.2, 3.5, 8]} />
        <meshBasicMaterial
          color="#6366f1"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer Cyan Soft Glow */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.4, 4, 8]} />
        <meshBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

// ─── Animated Logo ──────────────────────────────────────────
// ─── Animated Logo (Refined, Fixed & Polished) ──────────────────────
function AnimatedLogo() {
  const mainPath = "M 32 28 C 32 8 2 8 2 28 S 32 48 32 28 S 62 8 62 28 S 32 48 32 28 C 58 28 80 58 120 58 H 440";

  return (
    <div className="flex items-center group cursor-pointer py-3 h-24 select-none">
      <div className="relative flex items-center">
        <svg
          width="440"
          height="80"
          viewBox="0 0 440 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          <defs>
            <linearGradient id="logo-gradient" x1="0" y1="30" x2="440" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#4f46e5" /> {/* Indigo 600 */}
              <stop offset="30%" stopColor="#06b6d4" /> {/* Cyan 500 */}
              <stop offset="70%" stopColor="#22d3ee" /> {/* Cyan 400 */}
              <stop offset="100%" stopColor="#38bdf8" /> {/* Sky 400 */}
            </linearGradient>

            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <linearGradient id="shimmer-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.8" />
              <animate attributeName="x1" from="-100%" to="100%" dur="3s" repeatCount="indefinite" />
            </linearGradient>
          </defs>

          {/* Background Path */}
          <path
            d={mainPath}
            stroke="rgba(255,255,255,0.03)"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Neon Glow Path */}
          <motion.path
            d={mainPath}
            stroke="url(#logo-gradient)"
            strokeWidth="9"
            strokeLinecap="round"
            className="blur-[8px] opacity-25"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.2, ease: "easeInOut" }}
          />

          {/* Core Drawing Path */}
          <motion.path
            d={mainPath}
            stroke="url(#logo-gradient)"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.2, ease: "easeInOut" }}
          />

          {/* Dynamic Data Packet Pulse */}
          <motion.circle
            r="3"
            fill="#fff"
            style={{ offsetPath: `path("${mainPath}")` }}
            animate={{ offsetDistance: ["0%", "100%"] }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <animate attributeName="r" values="2.5;4.5;2.5" dur="2s" repeatCount="indefinite" />
          </motion.circle>

          {/* SDLC Milestones */}
          {[
            { x: 190, label: "S" },
            { x: 270, label: "D" },
            { x: 350, label: "L" },
            { x: 430, label: "C" }
          ].map((node, i) => (
            <motion.g
              key={node.x}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2 + i * 0.2, type: "spring", stiffness: 200 }}
            >
              <circle cx={node.x} cy="58" r="6.5" fill="#0b0f1a" stroke="url(#logo-gradient)" strokeWidth="1.5" />
              <text
                x={node.x}
                y="61"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="8"
                fontWeight="900"
                className="select-none pointer-events-none tracking-tighter"
              >
                {node.label}
              </text>
              {i === 3 && (
                <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }}>
                  <circle cx={node.x + 8} cy="52" r="4.5" fill="#10b981" className="shadow-lg" />
                  <path d={`M ${node.x + 6.5} 52 l 1 1 l 2 -2`} stroke="#fff" strokeWidth="1.2" fill="none" />
                </motion.g>
              )}
            </motion.g>
          ))}
        </svg>

        {/* Brand Identity - Reverted to Text Branding */}
        <div className="absolute left-[92px] top-[4px] flex flex-col pointer-events-none">
          <motion.div
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 1 }}
            className="flex items-baseline gap-2"
          >
            <span className="text-3xl font-extralight tracking-tight text-white/80">
              Kaizen
            </span>
            <span className="text-3xl font-black tracking-tighter bg-gradient-to-r from-white via-cyan-100 to-white/60 bg-clip-text text-transparent uppercase italic">
              Dhara
            </span>
          </motion.div>

          <motion.span
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4 }}
            className="text-[9px] font-black tracking-[0.5em] text-cyan-400/70 uppercase mt-[-1px] ml-1.5 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]"
          >
            Continuous Intelligence
          </motion.span>
        </div>
      </div>
    </div>
  );
}







// ─── Preloader Component ─────────────────────────────────────────
function Preloader() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#020205]"
    >
      <div className="scale-125 md:scale-150">
        <AnimatedLogo />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="mt-12 flex flex-col items-center gap-2"
      >
        <div className="h-[1px] w-48 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        <span className="text-[10px] uppercase tracking-[0.6em] text-cyan-400 font-black drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">
          System Initializing
        </span>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function HomePage({ onSignIn }: { onSignIn: () => void }) {
  const { scrollYProgress } = useScroll();
  const [isLoading, setIsLoading] = React.useState(true);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative min-h-screen bg-[#020205] text-slate-50 selection:bg-indigo-500/30 font-sans overflow-x-hidden antialiased">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <Preloader key="preloader" />
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="w-full"
          >

            {/* 3D Background Layer */}
            <div className="fixed inset-0 z-0">
              <Canvas>
                <PerspectiveCamera makeDefault position={[0, 0, 18]} fov={60} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} color="#6366f1" />

                <Suspense fallback={null}>
                  {/* Deep Space Background */}
                  <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

                  {/* Floating Particles */}
                  <Float speed={2} rotationIntensity={1} floatIntensity={1}>
                    <FlowParticles />
                  </Float>

                  {/* Magic Sparkles - Reduced count and size to avoid 'snow' effect */}
                  <Sparkles count={300} scale={20} size={1.5} speed={0.3} opacity={0.3} color="#818cf8" />

                  {/* Shooting Stars */}
                  <ShootingStars />
                </Suspense>
              </Canvas>
              <div className="absolute inset-0 bg-gradient-to-b from-[#020205]/50 via-[#020205]/80 to-[#020205]" />
            </div>

            {/* Grid Overlay */}
            <div className="fixed inset-0 z-0 opacity-20 pointer-events-none bg-[linear-gradient(rgba(99,102,241,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.05)_1px,transparent_1px)] bg-[size:80px_80px]" />

            {/* Navigation */}
            <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[96%] max-w-6xl">
              <motion.div
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="backdrop-blur-xl bg-slate-900/60 border border-slate-800/50 rounded-2xl px-6 py-4 flex items-center justify-between shadow-2xl shadow-black/20"
              >
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="flex items-center group"
                >
                  <AnimatedLogo />
                </button>

                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
                  <button onClick={() => scrollTo("platform")} className="hover:text-white transition-colors">Platform</button>
                  <button onClick={() => scrollTo("intelligence")} className="hover:text-white transition-colors">Intelligence</button>
                  <button onClick={() => scrollTo("showcase")} className="hover:text-white transition-colors">Showcase</button>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onSignIn}
                  className="bg-gradient-to-r from-indigo-600 to-cyan-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:from-indigo-500 hover:to-cyan-500 transition-all shadow-lg shadow-indigo-600/30"
                >
                  Enter Studio
                </motion.button>
              </motion.div>
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-screen flex flex-col items-center justify-center pt-32 pb-20 z-10 text-center px-6">
              <motion.div
                style={{ opacity: heroOpacity }}
                className="w-full max-w-6xl"
              >
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                  className="mb-10 inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 backdrop-blur-sm text-indigo-300 text-xs font-semibold tracking-wide"
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-400"></span>
                  </span>
                  Powered by Advanced AI Agents
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.9 }}
                  className="text-6xl sm:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tight leading-[0.9] mb-10"
                >
                  <span className="bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                    INTENT.
                  </span>
                  <br />
                  <span className="bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                    INTERFACE.
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent italic">
                    INFINITY.
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                  className="max-w-3xl mx-auto text-slate-400 text-lg sm:text-xl lg:text-2xl font-light mb-14 leading-relaxed"
                >
                  The autonomous workspace where production-grade websites are conceived through conversation and deployed through pure intelligence.
                </motion.p>

                {/* Hero CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.7 }}
                  className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20"
                >
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: "0 20px 40px -10px rgba(99,102,241,0.5)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onSignIn}
                    className="px-10 py-5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 rounded-2xl font-bold text-lg text-white shadow-2xl shadow-indigo-600/30 transition-all flex items-center gap-2"
                  >
                    Start Building Free
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-10 py-5 bg-slate-800/50 hover:bg-slate-700/50 backdrop-blur-xl rounded-2xl font-semibold text-lg border border-slate-700/50 text-white transition-all flex items-center gap-2"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Watch Demo
                  </motion.button>
                </motion.div>

                {/* Visual Demo Card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1, duration: 0.8 }}
                  className="relative group max-w-4xl mx-auto"
                >
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity" />
                  <div className="relative bg-slate-900/80 border border-slate-700/50 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl">
                    <div className="flex gap-2 mb-6">
                      <div className="w-3 h-3 rounded-full bg-red-500/60" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                      <div className="w-3 h-3 rounded-full bg-green-500/60" />
                    </div>
                    <div className="font-mono text-sm space-y-3 text-left">
                      <p className="text-indigo-400">› kaizen build --prompt "Modern SaaS landing page"</p>
                      <p className="text-slate-500">Analyzing requirements...</p>
                      <p className="text-slate-500">Generating component architecture...</p>
                      <p className="text-cyan-400 font-semibold">✓ Created: 12 Components, 3 API Routes, 5 Assets</p>
                      <p className="text-emerald-400 font-semibold mt-4 bg-emerald-500/10 px-4 py-2 inline-block rounded-lg border border-emerald-500/20">
                        ✓ Deployed: https://project-xyz.vercel.app
                      </p>
                      <div className="w-full h-40 bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 rounded-xl mt-6 border border-slate-700/30 flex items-center justify-center">
                        <div className="text-slate-600 text-xs font-semibold">Preview Window</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </section>

            {/* Platform Section */}
            <section id="platform" className="relative z-10 py-32 px-6 border-t border-slate-800/50">
              <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                  <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8 }}
                  >
                    <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-12 leading-none">
                      THE<br />EXECUTION<br />ENGINE
                    </h2>
                    <div className="space-y-10">
                      <WorkflowPoint
                        title="Prompt to Blueprint"
                        text="Natural language is transformed into complete technical specifications, dependency graphs, and API contracts in seconds."
                      />
                      <WorkflowPoint
                        title="Contextual Generation"
                        text="Production-ready Next.js code with TypeScript, optimized assets, and built-in accessibility standards."
                      />
                      <WorkflowPoint
                        title="Autonomous Deployment"
                        text="Zero-configuration deployment to global edge networks with automatic monitoring and self-healing capabilities."
                      />
                    </div>
                  </motion.div>

                  {/* Code Terminal Visual */}
                  <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8 }}
                    className="relative group"
                  >
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
                    <div className="relative bg-slate-900 border border-slate-700/50 rounded-3xl p-8 shadow-2xl overflow-hidden">
                      <div className="flex gap-2 mb-6">
                        <div className="w-3 h-3 rounded-full bg-red-500/60" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                        <div className="w-3 h-3 rounded-full bg-green-500/60" />
                      </div>
                      <div className="font-mono text-sm space-y-3">
                        <p className="text-indigo-400">› kaizen init --type "E-commerce Platform"</p>
                        <p className="text-slate-500">Mapping state machines...</p>
                        <p className="text-slate-500">Synthesizing design system...</p>
                        <p className="text-cyan-400 font-semibold">Generated: 24 Components, 8 Edge Functions</p>
                        <div className="bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20 inline-block mt-4">
                          <p className="text-emerald-400 font-semibold">✓ Live at: shop.example.com</p>
                        </div>
                        <div className="w-full h-32 bg-gradient-to-br from-indigo-500/5 to-cyan-500/5 rounded-xl mt-6 border border-slate-700/30" />
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </section>

            {/* Intelligence Section */}
            <section id="intelligence" className="relative z-10 py-32 px-6">
              <div className="max-w-7xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                  className="text-center mb-20"
                >
                  <h2 className="text-5xl sm:text-6xl font-black tracking-tight mb-6">ENGINEERED INTELLIGENCE</h2>
                  <p className="text-slate-400 max-w-2xl mx-auto text-lg sm:text-xl leading-relaxed">
                    Kaizen Dhara isn't just a builder; it's a self-evolving AI brain for your digital ecosystem.
                  </p>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <BentoCard
                    title="Self-Healing"
                    desc="AI monitors production 24/7, detecting issues and auto-deploying fixes instantly."
                    className="lg:col-span-2 lg:row-span-2"
                    icon="⚡"
                  />
                  <BentoCard
                    title="Predictive UI"
                    desc="Real-time user behavior analysis optimizes layouts automatically."
                    icon="👁️"
                  />
                  <BentoCard
                    title="Smart Logic"
                    desc="Complex business rules converted to type-safe code."
                    icon="🧠"
                  />
                  <BentoCard
                    title="Edge Native"
                    desc="Global deployment optimized for <20ms response times."
                    icon="🌐"
                  />
                  <BentoCard
                    title="Auto-Scale"
                    desc="Infrastructure scales seamlessly with traffic spikes."
                    icon="📈"
                  />
                </div>
              </div>
            </section>

            {/* Showcase Section */}
            <section id="showcase" className="relative z-10 py-32 px-6 border-t border-slate-800/50">
              <div className="max-w-7xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8"
                >
                  <div>
                    <h2 className="text-5xl sm:text-6xl font-black tracking-tight mb-4">Recent Creations</h2>
                    <p className="text-slate-400 text-lg">Sites crafted by the Dhara AI engine this week.</p>
                  </div>
                  <button className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-2">
                    View All Projects
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  <ProjectCard
                    name="WebGi Jewelry"
                    type="3D E-commerce"
                    color="from-amber-500/20 to-rose-500/20"
                    url="https://webgi-jewelry.vercel.app/"
                  />
                  <ProjectCard
                    name="Logartis"
                    type="Brand Intelligence"
                    color="from-blue-600/20 to-indigo-600/20"
                    url="https://logartis.info/"
                  />
                  <ProjectCard
                    name="Polygonjs"
                    type="Interactive 3D Engine"
                    color="from-cyan-500/20 to-emerald-500/20"
                    url="https://polygonjs.com/"
                  />
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 py-16 border-t border-slate-800/50 bg-slate-950/80 backdrop-blur-xl">
              <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="text-center md:text-left">
                    <div className="text-3xl font-black tracking-tight mb-2 uppercase">KAIZEN DHARA</div>
                    <p className="text-slate-500 text-[10px] font-black tracking-[0.2em] uppercase">Continuous Flow • Autonomous Engineering</p>
                  </div>
                  <div className="flex gap-8 text-slate-400 text-sm font-medium">
                    <a href="#" className="hover:text-white transition-colors">Twitter</a>
                    <a href="#" className="hover:text-white transition-colors">Discord</a>
                    <a href="#" className="hover:text-white transition-colors">GitHub</a>
                    <a href="#" className="hover:text-white transition-colors">Docs</a>
                  </div>
                </div>
                <div className="text-center text-slate-600 text-[10px] mt-8 uppercase font-bold tracking-widest">
                  © 2024 Kaizen Dhara AI. All rights reserved.
                </div>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



// ─── UI Components ───────────────────────────────────────────────────────────

function WorkflowPoint({ title, text }: { title: string; text: string }) {
  return (
    <div className="group">
      <h3 className="text-xl sm:text-2xl font-bold mb-3 flex items-center gap-4 text-white group-hover:text-indigo-400 transition-colors">
        <span className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-cyan-500 rounded-full group-hover:h-8 transition-all" />
        {title}
      </h3>
      <p className="text-slate-400 leading-relaxed pl-5">{text}</p>
    </div>
  );
}

function BentoCard({
  title,
  desc,
  className = "",
  icon
}: {
  title: string;
  desc: string;
  className?: string;
  icon: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -8 }}
      transition={{ duration: 0.3 }}
      className={`p-8 rounded-3xl border border-slate-800/50 bg-slate-900/30 backdrop-blur-xl hover:border-indigo-500/30 hover:bg-slate-900/50 transition-all group relative overflow-hidden ${className}`}
    >
      <div className="text-5xl mb-5 filter grayscale group-hover:grayscale-0 transition-all">{icon}</div>
      <h4 className="text-xl font-bold mb-3 text-white">{title}</h4>
      <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
      <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl group-hover:bg-indigo-600/20 transition-all" />
    </motion.div>
  );
}

function ProjectCard({
  name,
  type,
  color,
  url
}: {
  name: string;
  type: string;
  color: string;
  url: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group cursor-pointer"
      onClick={() => window.open(url, '_blank')}
    >
      <div className={`aspect-[4/5] rounded-[2rem] bg-gradient-to-br ${color} border border-white/5 relative overflow-hidden mb-6 transition-all duration-500 group-hover:border-indigo-500/50 group-hover:shadow-[0_0_60px_-15px_rgba(99,102,241,0.6)] group-hover:-translate-y-2`}>
        {/* Shimmer Background Fallback */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

        {/* Live Website Preview (Scaled) */}
        <div className="absolute inset-0 w-[200%] h-[200%] origin-top-left scale-[0.5] pointer-events-none opacity-40 group-hover:opacity-100 transition-all duration-1000 grayscale-[0.3] group-hover:grayscale-0">
          <iframe
            src={url}
            className="w-full h-full border-none"
            title={name}
            scrolling="no"
            loading="lazy"
          />
        </div>

        {/* Luxe Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent mix-blend-multiply transition-opacity group-hover:opacity-40" />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
          <div className="px-8 py-3.5 bg-white text-slate-950 rounded-2xl font-black text-sm shadow-[0_20px_40px_-10px_rgba(255,255,255,0.3)] transform scale-90 group-hover:scale-100 transition-transform tracking-tight">
            EXPLORE PROJECT
          </div>
        </div>
      </div>
      <h4 className="text-3xl font-black mb-1.5 tracking-tighter text-white group-hover:text-indigo-300 transition-all uppercase leading-none">{name}</h4>
      <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] opacity-70 group-hover:opacity-100 transition-opacity">{type}</p>
    </motion.div>
  );
}
