
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, ChromaticAberration, Noise, Vignette } from '@react-three/postprocessing';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import ParticleSystem from './components/ParticleSystem';
import HandTracker from './components/HandTracker';
import UIOverlay from './components/UIOverlay';
import { AppState, HandData, ShapeType } from './types';

const INITIAL_STATE: AppState = {
  particleCount: 80000, 
  currentShape: 'GALAXY',
  animationSpeed: 0.4, 
  colorPalette: 'Cosmic',
  physicsEnabled: true,
  particleSize: 0.65, 
  glowIntensity: 0.8, 
  isCameraMirrored: true,
  showSkeleton: false,
  isGestureActive: false,
};

const SHAPES: ShapeType[] = ['GALAXY', 'CUBE', 'WAVE'];

const SceneController = ({ hands, state }: { hands: React.RefObject<HandData[]>, state: AppState }) => {
  const { camera } = useThree();
  const zoomTarget = useRef(20);
  const rotationTarget = useRef({ x: 0, y: 0 });
  const currentZoom = useRef(20);
  const currentRotation = useRef({ x: 0, y: 0 });

  useFrame((_, delta) => {
    if (!camera) return;
    
    const activeHands = hands.current || [];
    
    // Only apply camera control if gesture system is active and hands are detected
    if (state.isGestureActive && activeHands.length > 0) {
      let avgX = 0, avgY = 0;
      activeHands.forEach(h => {
        avgX += h.center.x;
        avgY += h.center.y;
      });
      avgX /= activeHands.length;
      avgY /= activeHands.length;

      // Reverted to original standard sensitivity
      rotationTarget.current.y = (avgX - 0.5) * 15.0; 
      rotationTarget.current.x = (avgY - 0.5) * 12.0;

      const hasFist = activeHands.some(h => h.isFist);
      const hasOpen = activeHands.some(h => h.isOpen);
      
      const zoomBaseSpeed = 30.0 * delta;
      
      if (hasOpen) {
        // Reverted zoom limits
        zoomTarget.current = Math.max(zoomTarget.current - zoomBaseSpeed, 5.0);
      } else if (hasFist) {
        // Reverted zoom limits
        zoomTarget.current = Math.min(zoomTarget.current + zoomBaseSpeed, 50.0);
      }

      // Reverted lerp speed for smooth control
      const LERP_VAL = 0.04;
      currentZoom.current = THREE.MathUtils.lerp(currentZoom.current, zoomTarget.current, LERP_VAL);
      currentRotation.current.x = THREE.MathUtils.lerp(currentRotation.current.x, rotationTarget.current.x, LERP_VAL);
      currentRotation.current.y = THREE.MathUtils.lerp(currentRotation.current.y, rotationTarget.current.y, LERP_VAL);

      camera.position.set(currentRotation.current.y, -currentRotation.current.x, currentZoom.current);
      camera.lookAt(0, 0, 0);
    }
  });

  return null;
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [lastGesture, setLastGesture] = useState<string>('NONE');
  const handsRef = useRef<HandData[]>([]);
  const [displayHands, setDisplayHands] = useState<HandData[]>([]);
  const isMounted = useRef(true);
  const gestureCooldownRef = useRef<number>(0);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const handleHandsUpdate = useCallback((newHands: HandData[]) => {
    if (!isMounted.current) return;
    
    // If system is stopped, do not process or display hand data
    if (!state.isGestureActive) {
      if (displayHands.length > 0) {
        handsRef.current = [];
        setDisplayHands([]);
        setLastGesture('NONE');
      }
      return;
    }

    handsRef.current = newHands;
    const now = Date.now();
    
    if (newHands.length > 0) {
      const g = newHands[0].gesture;
      
      if (g !== lastGesture) {
        setLastGesture(g);
        setDisplayHands([...newHands]);
      }

      if (now > gestureCooldownRef.current) {
        if (g === 'SWIPE_UP' || g === 'SWIPE_DOWN') {
          setState(s => {
            const change = g === 'SWIPE_UP' ? 10000 : -10000;
            const nextCount = Math.max(10000, Math.min(200000, s.particleCount + change));
            return { ...s, particleCount: nextCount };
          });
          gestureCooldownRef.current = now + 400;
        }
      }
    } else if (lastGesture !== 'NONE') {
      setLastGesture('NONE');
      setDisplayHands([]);
    }
  }, [lastGesture, state.isGestureActive, displayHands.length]);

  return (
    <div className="w-full h-screen bg-[#010101] selection:bg-blue-500/30">
      <Canvas 
        dpr={Math.min(window.devicePixelRatio, 1.5)} 
        gl={{ 
          antialias: true, 
          powerPreference: "high-performance",
          alpha: false,
          depth: true,
          stencil: false,
          precision: "highp"
        }}
      >
        <PerspectiveCamera makeDefault fov={45} position={[0, 0, 20]} />
        <color attach="background" args={['#010101']} />
        
        <SceneController hands={handsRef} state={state} />
        
        <group>
          <ParticleSystem state={state} hands={displayHands} />
        </group>
        
        <OrbitControls 
            enabled={!state.isGestureActive || displayHands.length === 0}
            enablePan={false} 
            minDistance={5} 
            maxDistance={80} 
            autoRotate={!state.isGestureActive} 
            autoRotateSpeed={0.08}
            enableDamping
            dampingFactor={0.05}
        />

        <EffectComposer enableNormalPass={false} multisampling={0}>
          <Bloom 
            intensity={state.glowIntensity} 
            luminanceThreshold={0.8} 
            mipmapBlur 
            radius={0.2} 
          />
          <Noise opacity={0.01} />
          <Vignette offset={0.3} darkness={1.1} />
          <ChromaticAberration offset={new THREE.Vector2(0.0002, 0.0002)} />
        </EffectComposer>
      </Canvas>

      <HandTracker 
        onHandsUpdate={handleHandsUpdate} 
        mirrored={state.isCameraMirrored} 
        showSkeleton={state.showSkeleton}
      />

      <UIOverlay 
        state={state} 
        setState={setState} 
        gestureName={displayHands.length > 1 ? `DUAL: ${displayHands[0].gesture}` : lastGesture} 
      />

      {!state.isGestureActive && (
          <div className="fixed bottom-32 left-1/2 -translate-x-1/2 text-center pointer-events-none">
             <div className="glass-panel px-10 py-5 rounded-full border-white/10 opacity-60">
                <p className="text-white/40 text-[13px] font-black tracking-[0.6em] uppercase font-mono text-center">AUTO DROID ACTIVE</p>
             </div>
          </div>
      )}
    </div>
  );
};

export default App;
