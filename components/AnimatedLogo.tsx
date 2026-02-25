
import React from 'react';
import { motion } from 'framer-motion';

export default function AnimatedLogo({ className }: { className?: string }) {
    const mainPath = "M 45 30 C 25 10 5 15 5 30 S 25 50 45 30 C 65 10 85 15 85 30 C 85 45 95 58 130 58 H 340";

    return (
        <div className={`flex items-center group cursor-pointer select-none ${className || ''}`}>
            <div className="relative flex items-center origin-left">
                <svg
                    width="350"
                    height="80"
                    viewBox="0 0 350 80"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="overflow-visible"
                >
                    <defs>
                        <linearGradient id="logo-gradient" x1="0" y1="30" x2="350" y2="30" gradientUnits="userSpaceOnUse">
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
                        { x: 160, label: "S" },
                        { x: 210, label: "D" },
                        { x: 260, label: "L" },
                        { x: 310, label: "C" }
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
                        Prompt to Production
                    </motion.span>
                </div>
            </div>
        </div>
    );
}
