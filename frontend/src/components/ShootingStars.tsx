
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function ShootingStars() {
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
