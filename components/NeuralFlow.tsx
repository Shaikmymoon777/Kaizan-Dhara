
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

export default function NeuralFlow() {
    const points = useRef<THREE.Points>(null!);
    const count = 2000;

    const [positions, phase] = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const p = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 10;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
            p[i] = Math.random() * Math.PI * 2;
        }
        return [pos, p];
    }, []);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            // Create a wave-like "flow" (Dhara)
            points.current.geometry.attributes.position.array[i3 + 1] += Math.sin(t + phase[i]) * 0.002;
        }
        points.current.geometry.attributes.position.needsUpdate = true;
        points.current.rotation.y = t * 0.1;
    });

    return (
        <Points ref={points} positions={positions} stride={3}>
            <PointMaterial
                transparent
                color="#6366f1"
                size={0.03}
                sizeAttenuation={true}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </Points>
    );
}
