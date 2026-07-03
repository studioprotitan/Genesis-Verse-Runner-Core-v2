import React, { useEffect, useRef, useState } from 'react';import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  PointLight,
  Color3,
  StandardMaterial,
  CreateCylinder,
  CreateSphere,
  CreateBox,
  TransformNode,
  DynamicTexture,
  Mesh
} from '@babylonjs/core';

import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders/glTF";


import '@babylonjs/inspector';
import { GameState, Lane, ObstacleType, ObstacleData, PlayerState, WeaponType, CollectibleData } from '../types';

// Helper to safely trigger device haptic/vibration feedback
const triggerVibration = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignore errors on devices/browsers that don't support or block vibration
    }
  }
};

const primaryGlbUrl = '/jump-sequence.glb';
const fallbackGlbUrl = '/jump-sequence.glb';
const jumpGlbUrl = '/jump-sequence.glb';

interface GameCanvasProps {
  gameState: GameState;
  selectedGear: {
    visorColor: string;
    armorColor: string;
    chestColor: string;
    hasShield: boolean;
    hasJetpack: boolean;
    weaponType: WeaponType;
  };
  onStatsUpdate: (stats: PlayerState) => void;
  onGameOver: () => void;
}

export default function GameCanvas({
  gameState,
  selectedGear,
  onStatsUpdate,
  onGameOver
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const [inspectorVisible, setInspectorVisible] = useState<boolean>(false);
  const [isBurstActive, setIsBurstActive] = useState<boolean>(false);
  const isMutedRef = useRef<boolean>(false);

  const toggleInspector = () => {
    if (!sceneRef.current) return;
    const isVisible = !inspectorVisible;
    setInspectorVisible(isVisible);
    if (isVisible) {
      sceneRef.current.debugLayer.show({ overlay: true });
    } else {
      sceneRef.current.debugLayer.hide();
    }
  };

  // Sound effects generator
  const playSynthSFX = (type: 'jump' | 'slide' | 'collect' | 'damage' | 'speed_boost' | 'slam' | 'plasma_slash' | 'ion_shoot' | 'no_ammo' | 'scan_sweep') => {
    if (isMutedRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'jump') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'slide') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'collect') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      } else if (type === 'damage') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'speed_boost') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else if (type === 'plasma_slash') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(450, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.14, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'ion_shoot') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(950, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      } else if (type === 'no_ammo') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'scan_sweep') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.45);
        osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.9);
        
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(320, ctx.currentTime);
        osc2.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.5);
        
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        gain2.gain.setValueAtTime(0.06, ctx.currentTime);
        gain2.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.9);
        
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.9);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.9);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.9);
      } else if (type === 'slam') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);
        
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(300, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.25);
        
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        gain2.gain.setValueAtTime(0.12, ctx.currentTime);
        gain2.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      // Audio block safety
    }
  };

  useEffect(() => {
    if (!canvasRef.current || gameState !== GameState.PLAYING) return;

    // 1. Engine & Scene Setup with dynamic Graphics Calibration
    const savedQuality = localStorage.getItem('cyber_runner_graphics_quality') || 'balanced';
    const antialias = savedQuality !== 'low';
    const engine = new Engine(canvasRef.current, antialias);
    
    if (savedQuality === 'low') {
      engine.setHardwareScalingLevel(1.5); // renders at 0.66x resolution for super smooth performance
    } else if (savedQuality === 'high') {
      engine.setHardwareScalingLevel(0.8); // 1.25x super-sampling for premium sharpness
    } else {
      engine.setHardwareScalingLevel(1.0); // crisp native resolution
    }

    const scene = new Scene(engine);
    sceneRef.current = scene;

    scene.clearColor = new Color3(0.015, 0.02, 0.035).toColor4(1);

    // 2. Camera tracking
    const camera = new ArcRotateCamera('gameCamera', -Math.PI / 2, Math.PI / 2.3, 5.5, new Vector3(0, 1.2, 0), scene);
    camera.lowerRadiusLimit = 4.5;
    camera.upperRadiusLimit = 8.5;
    camera.lowerBetaLimit = 1.0;
    camera.upperBetaLimit = 1.5;
    const baseFov = camera.fov;

    // 3. Cyber Lights
    const hemiLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.55;
    hemiLight.groundColor = new Color3(0.05, 0.08, 0.15);

    const fillLight = new PointLight('fillLight', new Vector3(-2.5, 1.5, -2.0), scene);
    fillLight.intensity = 0.65;
    fillLight.diffuse = Color3.FromHexString(selectedGear.chestColor);

    const keyLight = new PointLight('keyLight', new Vector3(2.5, 3.0, 2.0), scene);
    keyLight.intensity = 0.7;
    keyLight.diffuse = Color3.FromHexString(selectedGear.visorColor);

    // --- 3.5. PROCEDURAL DYNAMIC SKYBOX SETUP ---
    const skybox = CreateSphere('skybox', { diameter: 350, segments: 24 }, scene);
    skybox.infiniteDistance = true;
    skybox.isPickable = false;
    
    const skyboxMat = new StandardMaterial('skyboxMat', scene);
    skyboxMat.disableLighting = true;
    skyboxMat.backFaceCulling = false; // View from the inside
    skyboxMat.disableDepthWrite = true;
    
    const skyboxTexture = new DynamicTexture('skyboxTex', { width: 512, height: 256 }, scene, false);
    skyboxMat.emissiveTexture = skyboxTexture;
    skybox.material = skyboxMat;

    // Depth-based color palettes representing Abyssum depths
    const PALETTES = [
      { threshold: 0, top: '#050a1e', bottom: '#1f0426' },       // 0m: Neon Violet Deep Blue
      { threshold: 400, top: '#0a0518', bottom: '#ff007f' },     // 400m: Hot Pink Synthwave
      { threshold: 1000, top: '#020d1a', bottom: '#00ffff' },    // 1000m: Electric Aqua / Deep Oceanic Depth
      { threshold: 1800, top: '#051405', bottom: '#39ff14' },    // 1800m: Tox-Green Cyber Matrix
      { threshold: 3000, top: '#1a0000', bottom: '#ff2a00' },    // 3000m: Volcanic Core / Inferno Orange-Red
      { threshold: 5000, top: '#080808', bottom: '#ffd700' },    // 5000m: Golden Cybernetic Singularity
    ];

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 };
    };

    const rgbToHex = (r: number, g: number, b: number) => {
      return "#" + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1);
    };

    const getInterpolatedColor = (dist: number) => {
      let lower = PALETTES[0];
      let upper = PALETTES[PALETTES.length - 1];
      
      for (let i = 0; i < PALETTES.length - 1; i++) {
        if (dist >= PALETTES[i].threshold && dist < PALETTES[i+1].threshold) {
          lower = PALETTES[i];
          upper = PALETTES[i+1];
          break;
        }
      }
      
      const range = upper.threshold - lower.threshold;
      const factor = range === 0 ? 0 : Math.min(1, Math.max(0, (dist - lower.threshold) / range));
      
      const c1Top = hexToRgb(lower.top);
      const c2Top = hexToRgb(upper.top);
      const c1Bottom = hexToRgb(lower.bottom);
      const c2Bottom = hexToRgb(upper.bottom);
      
      const topColor = rgbToHex(
        c1Top.r + (c2Top.r - c1Top.r) * factor,
        c1Top.g + (c2Top.g - c1Top.g) * factor,
        c1Top.b + (c2Top.b - c1Top.b) * factor
      );
      
      const bottomColor = rgbToHex(
        c1Bottom.r + (c2Bottom.r - c1Bottom.r) * factor,
        c1Bottom.g + (c2Bottom.g - c1Bottom.g) * factor,
        c1Bottom.b + (c2Bottom.b - c1Bottom.b) * factor
      );
      
      return { top: topColor, bottom: bottomColor };
    };

    const updateSkybox = (dist: number) => {
      const { top, bottom } = getInterpolatedColor(dist);
      const ctx = skyboxTexture.getContext();
      if (!ctx) return;
      
      // Draw background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, top);
      grad.addColorStop(0.5, bottom);
      grad.addColorStop(1.0, top); // wrap-around gradient for smooth sphere poles mapping
      
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 256);
      
      // Draw subtle holographic depth metrics / grid
      ctx.strokeStyle = bottom + "15"; // very faint
      ctx.lineWidth = 1;
      
      // Draw horizontal grid lines (depth bars)
      for (let y = 16; y < 256; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }
      
      // Draw vertical grid lines
      for (let x = 0; x < 512; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 256);
        ctx.stroke();
      }

      // Dynamic distance label indicator printed directly on skybox texture for visual HUD feedback!
      ctx.fillStyle = bottom + "65";
      ctx.font = "bold 9px monospace";
      ctx.fillText(`DEPTH: ${Math.floor(dist)}M / MAX_ABYSS_SYS`, 15, 30);
      ctx.fillText(`ATMOSPHERE_LEVEL: ${Math.floor(dist / 1000) + 1}`, 15, 45);

      // Faint cyber grid details
      ctx.fillStyle = bottom + "35";
      ctx.fillRect(15, 55, 120, 2);

      skyboxTexture.update();

      // Dynamically adapt clearColor and ambient ground colors for atmospheric consistency!
      const topColor3 = Color3.FromHexString(top);
      const bottomColor3 = Color3.FromHexString(bottom);
      
      scene.clearColor = topColor3.toColor4(1);
      if (hemiLight) {
        hemiLight.groundColor = bottomColor3.scale(0.35); // dynamic ground glow ambience
        hemiLight.diffuse = topColor3.scale(0.8); // dynamic ambient glow
      }
    };

    // Initialize skybox
    updateSkybox(0);
    let lastSkyboxUpdateDist = 0;

    // 4. Custom Materials Setup
    const metalBodyMat = new StandardMaterial('metalBodyMat', scene);
    metalBodyMat.diffuseColor = Color3.FromHexString(selectedGear.armorColor);
    metalBodyMat.specularColor = new Color3(0.6, 0.6, 0.8);

    const neonVisorMat = new StandardMaterial('neonVisorMat', scene);
    neonVisorMat.emissiveColor = Color3.FromHexString(selectedGear.visorColor);

    const chestEmissiveMat = new StandardMaterial('chestEmissiveMat', scene);
    chestEmissiveMat.emissiveColor = Color3.FromHexString(selectedGear.chestColor);

    const metalDullMat = new StandardMaterial('metalDullMat', scene);
    metalDullMat.diffuseColor = new Color3(0.2, 0.2, 0.22);

    // 5. Build Runner Highway Planes (The Track)
    const laneWidth = 2.0;
    const trackLength = 160.0;

    const trackMat = new StandardMaterial('trackMat', scene);
    trackMat.diffuseColor = new Color3(0.03, 0.04, 0.07);
    trackMat.emissiveColor = new Color3(0.01, 0.015, 0.025);

    const trackLeft = CreateBox('trackLeft', { width: laneWidth, height: 0.1, depth: trackLength }, scene);
    trackLeft.position.set(-laneWidth, -0.05, trackLength / 2 - 10);
    trackLeft.material = trackMat;

    const trackCenter = CreateBox('trackCenter', { width: laneWidth, height: 0.1, depth: trackLength }, scene);
    trackCenter.position.set(0, -0.05, trackLength / 2 - 10);
    trackCenter.material = trackMat;

    const trackRight = CreateBox('trackRight', { width: laneWidth, height: 0.1, depth: trackLength }, scene);
    trackRight.position.set(laneWidth, -0.05, trackLength / 2 - 10);
    trackRight.material = trackMat;

    // High contrast neon borders
    const borderL = CreateBox('borderL', { width: 0.08, height: 0.15, depth: trackLength }, scene);
    borderL.position.set(-laneWidth * 1.5, 0.02, trackLength / 2 - 10);
    const borderMat = new StandardMaterial('borderMat', scene);
    borderMat.emissiveColor = new Color3(0.95, 0.49, 0.15); // Neon tactical orange
    borderL.material = borderMat;

    const borderR = borderL.clone('borderR');
    borderR.position.x = laneWidth * 1.5;

    // --- 5.5. PARTICLE-BASED SPEED-SCALING CYBER ACID RAIN WEATHER SYSTEM ---
    const savedQualityForRain = localStorage.getItem('cyber_runner_graphics_quality') || 'balanced';
    const rainCount = savedQualityForRain === 'low' ? 45 : savedQualityForRain === 'high' ? 260 : 140;
    const rainParticles: {
      mesh: Mesh;
      speedY: number;
    }[] = [];

    const rainMat = new StandardMaterial('rainMat', scene);
    // Vibrant glowing acid green color matching high contrast cyberpunk theme
    rainMat.diffuseColor = new Color3(0.0, 1.0, 0.4);
    rainMat.emissiveColor = new Color3(0.1, 0.9, 0.35);
    rainMat.disableLighting = true; // Emits its own neon light, looks ultra modern
    rainMat.alpha = 0.5;

    for (let i = 0; i < rainCount; i++) {
      // Cylinder representing streaking rain lines
      const rainDrop = CreateCylinder('rainDrop', { height: 0.7, diameter: 0.02, tessellation: 4 }, scene);
      rainDrop.material = rainMat;

      // Spread drops across lanes and forward down track
      const rx = (Math.random() - 0.5) * 14;  // covering track plus surrounding areas
      const ry = Math.random() * 8 + 0.2;     // fall range up to 8 units high
      const rz = Math.random() * 80 - 15;     // Z range covering around runner and far ahead

      rainDrop.position.set(rx, ry, rz);

      rainParticles.push({
        mesh: rainDrop,
        speedY: 11 + Math.random() * 5, // fall speed 11-16 m/s
      });
    }

    // 6. Character Base Skeleton & Setup
    let characterRoot = new TransformNode('charRoot', scene);
    characterRoot.position.set(0, 0.08, 0);

    // High-poly procedural torso components
    const coreBody = CreateCylinder('coreBody', { height: 1.4, diameterTop: 0.48, diameterBottom: 0.35, tessellation: 48 }, scene);
    coreBody.position.y = 0.75;
    coreBody.material = metalBodyMat;
    coreBody.parent = characterRoot;

    const headVisor = CreateSphere('headVisor', { diameter: 0.48, segments: 48 }, scene);
    headVisor.position.y = 1.6;
    headVisor.material = neonVisorMat;
    headVisor.parent = characterRoot;

    const chestPlate = CreateBox('chestPlate', { width: 0.45, height: 0.45, depth: 0.25 }, scene);
    chestPlate.position.set(0, 0.9, 0.18);
    chestPlate.material = chestEmissiveMat;
    chestPlate.parent = characterRoot;

    const armL = CreateCylinder('armL', { height: 0.8, diameter: 0.18, tessellation: 36 }, scene);
    armL.position.set(-0.38, 0.95, 0);
    armL.material = metalDullMat;
    armL.parent = characterRoot;

    const armR = armL.clone('armR');
    armR.position.x = 0.38;
    armR.parent = characterRoot;

    const legL = CreateCylinder('legL', { height: 0.8, diameter: 0.2, tessellation: 36 }, scene);
    legL.position.set(-0.22, 0.35, 0);
    legL.material = metalDullMat;
    legL.parent = characterRoot;

    const legR = legL.clone('legR');
    legR.position.x = 0.22;
    legR.parent = characterRoot;

    // Translucent shield
    const hexForceField = CreateSphere('hexForceField', { diameter: 2.1, segments: 64 }, scene);
    hexForceField.position.y = 0.9;
    const shieldMat = new StandardMaterial('shieldMat', scene);
    shieldMat.diffuseColor = new Color3(0.1, 0.8, 1.0);
    shieldMat.emissiveColor = new Color3(0.15, 0.9, 1.0);
    shieldMat.alpha = 0.22;
    hexForceField.material = shieldMat;
    hexForceField.parent = characterRoot;
    hexForceField.isVisible = selectedGear.hasShield;

    // GLTF Loading and Animation Setup
    let hasLoadedGltf = false;
    let loadedRoot: any = null;
    let isTemporarilyStaggered = false;
    const loadedAnims: {
      idle?: any;
      running?: any;
      jumping?: any;
      sliding?: any;
      stagger?: any;
      dead?: any;
    } = {};

    let currentAnimState: 'IDLE' | 'RUNNING' | 'JUMPING' | 'SLIDING' | 'STAGGER' | 'DEAD' = 'RUNNING';

    const playLoadedAnim = (state: typeof currentAnimState) => {
      if (currentAnimState === state) return;
      
      const prevAnim = loadedAnims[currentAnimState.toLowerCase() as keyof typeof loadedAnims];
      let nextAnim = loadedAnims[state.toLowerCase() as keyof typeof loadedAnims];
      
      if (!nextAnim) {
        if (state === 'JUMPING' || state === 'SLIDING' || state === 'STAGGER') {
          nextAnim = loadedAnims.running || loadedAnims.idle;
        } else if (state === 'DEAD') {
          nextAnim = loadedAnims.stagger || loadedAnims.idle;
        }
      }
      
      currentAnimState = state;
      
      if (nextAnim) {
        const loop = (state !== 'JUMPING' && state !== 'STAGGER' && state !== 'DEAD');
        
        if (prevAnim && prevAnim !== nextAnim) {
          let progress = 0;
          const blendTime = 0.12; // 120ms
          nextAnim.play(loop);
          nextAnim.weight = 0.01;
          
          const observer = scene.onBeforeRenderObservable.add(() => {
            progress += engine.getDeltaTime() / 1000;
            const ratio = Math.min(1.0, progress / blendTime);
            prevAnim.weight = 1.0 - ratio;
            nextAnim.weight = ratio;
            if (ratio >= 1.0) {
              prevAnim.stop();
              scene.onBeforeRenderObservable.remove(observer);
            }
          });
        } else {
          nextAnim.play(loop);
          nextAnim.weight = 1.0;
        }
      }
    };

    const loadGltfModel = (url: string): Promise<any> => {
      const lastSlash = url.lastIndexOf('/');
      const rootUrl = lastSlash !== -1 ? url.substring(0, lastSlash + 1) : '';
      const fileName = lastSlash !== -1 ? url.substring(lastSlash + 1) : url;
      return SceneLoader.ImportMeshAsync('', rootUrl, fileName, scene);
    };

    // Load character model
    loadGltfModel(primaryGlbUrl)
      .catch((err) => {
        console.warn(`Failed to load primary jog glTF (${primaryGlbUrl}), trying fallback idle glTF (${fallbackGlbUrl}):`, err);
        return loadGltfModel(fallbackGlbUrl);
      })
      .then((result) => {
        console.log('GLTF character model loaded successfully in GameCanvas:', result);
        const glbRoot = result.meshes[0];
        glbRoot.parent = characterRoot;
        glbRoot.position = Vector3.Zero();
        glbRoot.scaling = new Vector3(1, 1, 1);

        // Apply customization colors immediately to loaded meshes in actual game
        result.meshes.forEach((mesh: any) => {
          if (mesh && mesh.material) {
            const mat = mesh.material;
            const name = mat.name.toLowerCase();
            const meshName = mesh.name.toLowerCase();

            if (name.includes('visor') || name.includes('eye') || name.includes('glass') || name.includes('glow') || name.includes('light') || name.includes('emit') || name.includes('neon') ||
                meshName.includes('visor') || meshName.includes('eye') || meshName.includes('glow') || meshName.includes('glass')) {
              if ((mat as any).emissiveColor) (mat as any).emissiveColor = Color3.FromHexString(selectedGear.visorColor);
              if ((mat as any).diffuseColor) (mat as any).diffuseColor = Color3.FromHexString(selectedGear.visorColor);
              if ((mat as any).albedoColor) (mat as any).albedoColor = Color3.FromHexString(selectedGear.visorColor);
            }
            else if (name.includes('chest') || name.includes('reactor') || name.includes('core') || name.includes('heart') ||
                     meshName.includes('chest') || meshName.includes('reactor') || meshName.includes('core')) {
              if ((mat as any).emissiveColor) (mat as any).emissiveColor = Color3.FromHexString(selectedGear.chestColor);
              if ((mat as any).diffuseColor) (mat as any).diffuseColor = Color3.FromHexString(selectedGear.chestColor);
              if ((mat as any).albedoColor) (mat as any).albedoColor = Color3.FromHexString(selectedGear.chestColor);
            }
            else if (name.includes('body') || name.includes('armor') || name.includes('suit') || name.includes('metal') || name.includes('skin') || name.includes('base') || name.includes('plate') || name.includes('chassis') ||
                     meshName.includes('body') || meshName.includes('armor') || meshName.includes('suit') || meshName.includes('torso') || meshName.includes('chestplate')) {
              if ((mat as any).diffuseColor) (mat as any).diffuseColor = Color3.FromHexString(selectedGear.armorColor);
              if ((mat as any).albedoColor) (mat as any).albedoColor = Color3.FromHexString(selectedGear.armorColor);
            }
          }
        });

        // Reparent hexForceField
        if (hexForceField) {
          hexForceField.parent = glbRoot;
        }

        // Dispose procedural skeleton meshes since GLTF loaded successfully
        if (coreBody) coreBody.dispose();
        if (headVisor) headVisor.dispose();
        if (chestPlate) chestPlate.dispose();
        if (armL) armL.dispose();
        if (armR) armR.dispose();
        if (legL) legL.dispose();
        if (legR) legR.dispose();

        loadedRoot = glbRoot;
        hasLoadedGltf = true;

        // Store animation groups
        const animGroups = result.animationGroups;
        animGroups.forEach((g: any) => {
          g.stop();
          g.weight = 0.0;
        });

        const findAnim = (keywords: string[]) => {
          return animGroups.find((g: any) => {
            const n = g.name.toLowerCase();
            return keywords.some((kw: string) => n.includes(kw));
          });
        };

        loadedAnims.idle = findAnim(['cst-ert-idle-a', 'idle', 'hero']);
        loadedAnims.running = findAnim(['cst-ert-jog-fwd-a', 'jog', 'walk', 'run', 'walk_fwd', 'jog_fwd']);
        loadedAnims.jumping = findAnim(['cst-ert-jump-start-a', 'cst-ert-jump-apex', 'jump-start', 'jump-apex', 'jump', 'leap', 'air']);
        loadedAnims.sliding = findAnim(['slide', 'crouch']);
        loadedAnims.stagger = findAnim(['damage', 'stagger', 'hit', 'pain']);
        loadedAnims.dead = findAnim(['crash', 'dead', 'die', 'collapse']);

        // Fallback for running animation if no explicit keyword matched
        if (!loadedAnims.running && animGroups.length > 0) {
          loadedAnims.running = animGroups[0];
        }

        // Set initial running animation
        if (loadedAnims.running) {
          loadedAnims.running.play(true);
          loadedAnims.running.weight = 1.0;
          currentAnimState = 'RUNNING';
        } else if (loadedAnims.idle) {
          loadedAnims.idle.play(true);
          loadedAnims.idle.weight = 1.0;
          currentAnimState = 'IDLE';
        }
        
        // Re-attach weapon mesh to the newly loaded glTF root
        if (typeof updateWeaponMesh === 'function' && playerStats) {
          updateWeaponMesh(playerStats.activeWeapon || WeaponType.NONE);
        }
      })
      .catch((err) => {
        console.warn('Failed to load any character glTF. Falling back to high-detail procedural meshes:', err);
      });

    // 7. Dynamic Obstacles Spawning & Pooling
    const activeObstacles: { mesh: Mesh; data: ObstacleData }[] = [];
    const activeCollectibles: { mesh: Mesh; data: CollectibleData }[] = [];

    const obstacleMaterials: Record<ObstacleType, StandardMaterial> = {
      [ObstacleType.WALL]: new StandardMaterial('wallMat', scene),
      [ObstacleType.SPIKE_ROCK]: new StandardMaterial('spikeMat', scene),
      [ObstacleType.DRONE]: new StandardMaterial('droneMat', scene),
      [ObstacleType.LOW_BARRIER]: new StandardMaterial('barrierMat', scene),
    };

    obstacleMaterials[ObstacleType.WALL].diffuseColor = new Color3(0.8, 0.1, 0.1);
    obstacleMaterials[ObstacleType.WALL].emissiveColor = new Color3(0.4, 0.05, 0.05);

    obstacleMaterials[ObstacleType.SPIKE_ROCK].diffuseColor = new Color3(0.4, 0.3, 0.3);
    obstacleMaterials[ObstacleType.SPIKE_ROCK].emissiveColor = new Color3(0.2, 0.05, 0.0);

    obstacleMaterials[ObstacleType.DRONE].diffuseColor = new Color3(0.1, 0.8, 0.8);
    obstacleMaterials[ObstacleType.DRONE].emissiveColor = new Color3(0.0, 0.4, 0.4);

    obstacleMaterials[ObstacleType.LOW_BARRIER].diffuseColor = new Color3(0.8, 0.8, 0.1);
    obstacleMaterials[ObstacleType.LOW_BARRIER].emissiveColor = new Color3(0.4, 0.4, 0.05);

    const coinMat = new StandardMaterial('coinMat', scene);
    coinMat.emissiveColor = new Color3(0.95, 0.65, 0.0);

    const energyMat = new StandardMaterial('energyMat', scene);
    energyMat.emissiveColor = new Color3(0.1, 0.95, 0.1);

    const burstMat = new StandardMaterial('burstMat', scene);
    burstMat.diffuseColor = new Color3(0.9, 0.1, 0.95);
    burstMat.emissiveColor = new Color3(0.75, 0.05, 0.9);
    burstMat.specularColor = new Color3(1.0, 1.0, 1.0);

    const powerupBladeMat = new StandardMaterial('powerupBladeMat', scene);
    powerupBladeMat.diffuseColor = new Color3(1.0, 0.35, 0.0);
    powerupBladeMat.emissiveColor = new Color3(0.95, 0.3, 0.0);
    powerupBladeMat.specularColor = new Color3(1.0, 1.0, 1.0);

    const powerupBlasterMat = new StandardMaterial('powerupBlasterMat', scene);
    powerupBlasterMat.diffuseColor = new Color3(0.0, 0.85, 1.0);
    powerupBlasterMat.emissiveColor = new Color3(0.0, 0.75, 0.95);
    powerupBlasterMat.specularColor = new Color3(1.0, 1.0, 1.0);

    const shieldPowerupMat = new StandardMaterial('shieldPowerupMat', scene);
    shieldPowerupMat.diffuseColor = new Color3(0.0, 0.6, 1.0);
    shieldPowerupMat.emissiveColor = new Color3(0.1, 0.8, 1.0);
    shieldPowerupMat.specularColor = new Color3(1.0, 1.0, 1.0);

    const scanMaterial = new StandardMaterial('scanMat', scene);
    scanMaterial.diffuseColor = new Color3(1.0, 0.15, 0.15);
    scanMaterial.emissiveColor = new Color3(1.0, 0.15, 0.15);
    scanMaterial.wireframe = true;
    scanMaterial.disableDepthWrite = true;
    scanMaterial.depthFunction = Engine.ALWAYS;
    scanMaterial.backFaceCulling = false;

    const spawnObstacle = (zPosition: number) => {
      const typeList = Object.values(ObstacleType);
      const chosenType = typeList[Math.floor(Math.random() * typeList.length)];
      const chosenLane = [Lane.LEFT, Lane.CENTER, Lane.RIGHT][Math.floor(Math.random() * 3)];

      let mesh: Mesh;
      if (chosenType === ObstacleType.WALL) {
        mesh = CreateBox('wall', { width: laneWidth, height: 2.2, depth: 0.5 }, scene);
        mesh.position.set(chosenLane * laneWidth, 1.1, zPosition);
      } else if (chosenType === ObstacleType.SPIKE_ROCK) {
        mesh = CreateCylinder('spike', { height: 1.2, diameterTop: 0, diameterBottom: 0.8, tessellation: 8 }, scene);
        mesh.position.set(chosenLane * laneWidth, 0.6, zPosition);
      } else if (chosenType === ObstacleType.DRONE) {
        mesh = CreateSphere('drone', { diameter: 0.6, segments: 12 }, scene);
        mesh.position.set(chosenLane * laneWidth, 1.6, zPosition);
      } else {
        mesh = CreateBox('barrier', { width: laneWidth, height: 0.5, depth: 0.4 }, scene);
        mesh.position.set(chosenLane * laneWidth, 0.25, zPosition);
      }

      mesh.material = obstacleMaterials[chosenType];
      activeObstacles.push({
        mesh,
        data: {
          id: Math.random().toString(),
          type: chosenType,
          lane: chosenLane,
          zPosition,
          hasBeenPassed: false
        }
      });
    };

    const spawnCollectible = (zPosition: number) => {
      const rand = Math.random();
      let type: 'COIN' | 'ENERGY_CELL' | 'SHIELD_POWERUP' | 'VELOCITY_BURST' | 'POWERUP_PLASMA_BLADE' | 'POWERUP_ION_BLASTER';
      if (rand < 0.44) {
        type = 'COIN';
      } else if (rand < 0.58) {
        type = 'ENERGY_CELL';
      } else if (rand < 0.70) {
        type = 'SHIELD_POWERUP';
      } else if (rand < 0.82) {
        type = 'VELOCITY_BURST';
      } else if (rand < 0.91) {
        type = 'POWERUP_PLASMA_BLADE';
      } else {
        type = 'POWERUP_ION_BLASTER';
      }
      
      const chosenLane = [Lane.LEFT, Lane.CENTER, Lane.RIGHT][Math.floor(Math.random() * 3)];
      
      let mesh: Mesh;
      if (type === 'COIN') {
        mesh = CreateCylinder('coin', { height: 0.08, diameter: 0.4, tessellation: 12 }, scene);
        mesh.rotation.x = Math.PI / 2;
        mesh.position.set(chosenLane * laneWidth, 0.6, zPosition);
        mesh.material = coinMat;
      } else if (type === 'ENERGY_CELL') {
        mesh = CreateBox('energy', { width: 0.3, height: 0.4, depth: 0.3 }, scene);
        mesh.position.set(chosenLane * laneWidth, 0.6, zPosition);
        mesh.material = energyMat;
      } else if (type === 'SHIELD_POWERUP') {
        // Floating cyber shield star / emblem
        mesh = CreateSphere('shield_powerup_base', { diameter: 0.35, segments: 12 }, scene);
        const ring = CreateCylinder('shield_powerup_ring', { height: 0.06, diameter: 0.6, tessellation: 6 }, scene);
        ring.parent = mesh;
        ring.rotation.x = Math.PI / 2;
        ring.material = shieldPowerupMat;
        mesh.position.set(chosenLane * laneWidth, 0.65, zPosition);
        mesh.material = shieldPowerupMat;
      } else if (type === 'VELOCITY_BURST') {
        // High-velocity dual bicone core with custom outer halo ring
        mesh = CreateCylinder('velocity_burst', { height: 0.5, diameterTop: 0, diameterBottom: 0.35, tessellation: 6 }, scene);
        const ring = CreateCylinder('burstRing', { height: 0.06, diameter: 0.55, tessellation: 8 }, scene);
        ring.parent = mesh;
        ring.material = burstMat;
        mesh.position.set(chosenLane * laneWidth, 0.7, zPosition);
        mesh.material = burstMat;
      } else if (type === 'POWERUP_PLASMA_BLADE') {
        // Floating double-bladed crystal core for Plasma Blade power-up
        mesh = CreateSphere('powerup_blade_base', { diameter: 0.35, segments: 12 }, scene);
        const bladePart1 = CreateBox('bladePart1', { width: 0.12, height: 0.75, depth: 0.12 }, scene);
        bladePart1.parent = mesh;
        bladePart1.position.y = 0.22;
        bladePart1.material = powerupBladeMat;
        const bladePart2 = CreateBox('bladePart2', { width: 0.12, height: 0.75, depth: 0.12 }, scene);
        bladePart2.parent = mesh;
        bladePart2.position.y = -0.22;
        bladePart2.material = powerupBladeMat;
        mesh.position.set(chosenLane * laneWidth, 0.65, zPosition);
        mesh.material = powerupBladeMat;
      } else {
        // Twin-barrel device for Ion Blaster power-up
        mesh = CreateSphere('powerup_blaster_base', { diameter: 0.35, segments: 12 }, scene);
        const barrel1 = CreateCylinder('barrel1', { height: 0.6, diameter: 0.1, tessellation: 8 }, scene);
        barrel1.parent = mesh;
        barrel1.position.x = -0.12;
        barrel1.rotation.x = Math.PI / 2;
        barrel1.material = powerupBlasterMat;
        const barrel2 = CreateCylinder('barrel2', { height: 0.6, diameter: 0.1, tessellation: 8 }, scene);
        barrel2.parent = mesh;
        barrel2.position.x = 0.12;
        barrel2.rotation.x = Math.PI / 2;
        barrel2.material = powerupBlasterMat;
        mesh.position.set(chosenLane * laneWidth, 0.65, zPosition);
        mesh.material = powerupBlasterMat;
      }

      activeCollectibles.push({
        mesh,
        data: {
          id: Math.random().toString(),
          type,
          lane: chosenLane,
          zPosition,
          hasBeenCollected: false
        }
      });
    };

    // Pre-populate some obstacles and collectibles far out
    for (let i = 25; i < 150; i += 22) {
      if (Math.random() > 0.3) spawnObstacle(i);
      if (Math.random() > 0.4) spawnCollectible(i + 10);
    }

    // 8. Game Run-Loop variables & Logic
    const playerStats: PlayerState = {
      distance: 0,
      speed: 15.0, // standard forward m/s speed
      health: 100,
      maxHealth: 100,
      energy: 100,
      maxEnergy: 100,
      shieldActive: selectedGear.hasShield,
      shieldRemaining: selectedGear.hasShield ? 100 : 0,
      score: 0,
      coins: 0,
      multiplier: 1,
      currentLane: Lane.CENTER,
      targetLaneX: 0,
      xPosition: 0,
      isJumping: false,
      isSliding: false,
      activeWeapon: selectedGear.weaponType,
      weaponCharges: selectedGear.weaponType !== WeaponType.NONE ? 5 : 0,
      bonusScore: 0,
      destroyCombo: 0,
      maxDestroyCombo: 0,
      enemyScanActive: false,
      enemyScanDurationRemaining: 0,
      enemyScanCooldownRemaining: 0,
      proximityLogs: []
    };

    let currentWeaponMesh: Mesh | null = null;

    const updateWeaponMesh = (type: WeaponType) => {
      if (currentWeaponMesh) {
        currentWeaponMesh.dispose();
        currentWeaponMesh = null;
      }

      if (type === WeaponType.NONE) return;

      if (type === WeaponType.PLASMA_BLADE) {
        const parentNode = (hasLoadedGltf && loadedRoot) ? loadedRoot : (armR || characterRoot);
        const bladeContainer = CreateBox('plasma_blade_container', { size: 0.01 }, scene);
        bladeContainer.parent = parentNode;
        
        if (parentNode === armR) {
          bladeContainer.position.set(0, -0.4, 0.1);
          bladeContainer.rotation.set(Math.PI / 2, 0, 0);
        } else {
          bladeContainer.position.set(0.4, 0.8, 0.2);
          bladeContainer.rotation.set(0.3, 0.2, -0.2);
        }

        const hilt = CreateCylinder('hilt', { height: 0.22, diameter: 0.06 }, scene);
        hilt.parent = bladeContainer;
        hilt.rotation.x = Math.PI / 2;
        const hiltMat = new StandardMaterial('hiltMat', scene);
        hiltMat.diffuseColor = new Color3(0.2, 0.2, 0.25);
        hilt.material = hiltMat;

        const blade = CreateBox('blade', { width: 0.07, height: 1.0, depth: 0.03 }, scene);
        blade.parent = bladeContainer;
        blade.position.z = 0.55;
        blade.rotation.x = Math.PI / 2;
        
        const bladeGlowMat = new StandardMaterial('bladeGlowMat', scene);
        bladeGlowMat.diffuseColor = new Color3(1.0, 0.35, 0.0);
        bladeGlowMat.emissiveColor = new Color3(0.95, 0.3, 0.0);
        bladeGlowMat.specularColor = new Color3(1.0, 1.0, 1.0);
        blade.material = bladeGlowMat;

        currentWeaponMesh = bladeContainer;
      } else if (type === WeaponType.BLASTER) {
        const parentNode = (hasLoadedGltf && loadedRoot) ? loadedRoot : (armR || characterRoot);
        const blasterContainer = CreateBox('blaster_container', { size: 0.01 }, scene);
        blasterContainer.parent = parentNode;

        if (parentNode === armR) {
          blasterContainer.position.set(0, -0.4, 0.1);
          blasterContainer.rotation.set(Math.PI / 2, 0, 0);
        } else {
          blasterContainer.position.set(0.4, 0.8, 0.2);
          blasterContainer.rotation.set(0.1, 0, 0);
        }

        const body = CreateBox('blaster_body', { width: 0.12, height: 0.16, depth: 0.35 }, scene);
        body.parent = blasterContainer;
        body.position.z = 0.08;
        const bodyMat = new StandardMaterial('blasterBodyMat', scene);
        bodyMat.diffuseColor = new Color3(0.25, 0.25, 0.3);
        body.material = bodyMat;

        const barrelL = CreateCylinder('barrelL', { height: 0.28, diameter: 0.04 }, scene);
        barrelL.parent = blasterContainer;
        barrelL.position.set(-0.03, 0.02, 0.32);
        barrelL.rotation.x = Math.PI / 2;
        const barrelMat = new StandardMaterial('blasterBarrelMat', scene);
        barrelMat.diffuseColor = new Color3(0.0, 0.85, 1.0);
        barrelMat.emissiveColor = new Color3(0.0, 0.75, 0.95);
        barrelL.material = barrelMat;

        const barrelR = barrelL.clone('barrelR');
        barrelR.parent = blasterContainer;
        barrelR.position.x = 0.03;

        currentWeaponMesh = blasterContainer;
      }
    };

    updateWeaponMesh(playerStats.activeWeapon || WeaponType.NONE);

    let isBurstActiveLocal = false;
    let burstTimer = 0.0;
    const burstDuration = 3.5;

    let scanActive = false;
    let scanTimer = 0.0;
    let scanCooldownTimer = 0.0;
    const scanDurationMax = 5.0;
    const scanCooldownMax = 18.0;

    const triggerEnemyScan = () => {
      if (gameState !== GameState.PLAYING) return;
      if (scanActive) return;
      if (scanCooldownTimer > 0) {
        playSynthSFX('no_ammo');
        return;
      }
      if (playerStats.energy < 25.0) {
        playSynthSFX('no_ammo');
        return;
      }

      playerStats.energy -= 25.0;
      scanActive = true;
      scanTimer = scanDurationMax;
      scanCooldownTimer = scanCooldownMax;

      playerStats.enemyScanActive = true;
      playerStats.enemyScanDurationRemaining = scanTimer;
      playerStats.enemyScanCooldownRemaining = scanCooldownTimer;

      playSynthSFX('scan_sweep');
      triggerVibration([100, 50, 100]);
    };

    let laneTransitionSpeed = 0.15;
    let jumpTime = 0;
    const jumpDuration = 0.8;
    let slideTime = 0;
    const slideDuration = 0.7;

    let lastAttackTime = 0;
    const attackCooldown = 0.35; // 350ms cooldown
    const activeProjectiles: { mesh: Mesh; lane: Lane; speedZ: number; damageDealt: boolean; hitAny: boolean }[] = [];
    const activeSlashWaves: { mesh: Mesh; speedZ: number; timeAlive: number; hitAny: boolean }[] = [];

    const activateWeapon = () => {
      if (gameState !== GameState.PLAYING) return;
      if (!playerStats.activeWeapon || playerStats.activeWeapon === WeaponType.NONE) return;
      
      const now = time;
      if (now - lastAttackTime < attackCooldown) return;
      
      if (playerStats.weaponCharges === undefined || playerStats.weaponCharges <= 0) {
        playSynthSFX('no_ammo');
        return;
      }

      lastAttackTime = now;
      playerStats.weaponCharges--;

      if (currentWeaponMesh) {
        const originalZ = currentWeaponMesh.position.z;
        const originalRotX = currentWeaponMesh.rotation.x;
        
        let swingProgress = 0;
        const animObserver = scene.onBeforeRenderObservable.add(() => {
          const frameDt = engine.getDeltaTime() / 1000;
          swingProgress += frameDt;
          if (swingProgress < 0.1) {
            if (playerStats.activeWeapon === WeaponType.PLASMA_BLADE) {
              currentWeaponMesh!.rotation.x = originalRotX + swingProgress * 15;
            } else {
              currentWeaponMesh!.position.z = originalZ - 0.15;
            }
          } else if (swingProgress < 0.3) {
            if (playerStats.activeWeapon === WeaponType.PLASMA_BLADE) {
              currentWeaponMesh!.rotation.x += (originalRotX - currentWeaponMesh!.rotation.x) * 0.2;
            } else {
              currentWeaponMesh!.position.z += (originalZ - currentWeaponMesh!.position.z) * 0.2;
            }
          } else {
            if (currentWeaponMesh) {
              currentWeaponMesh!.position.z = originalZ;
              currentWeaponMesh!.rotation.x = originalRotX;
            }
            scene.onBeforeRenderObservable.remove(animObserver);
          }
        });
      }

      if (playerStats.activeWeapon === WeaponType.PLASMA_BLADE) {
        playSynthSFX('plasma_slash');

        const slashWave = CreateCylinder('slashWave', { height: 0.05, diameter: 1.8, tessellation: 24, subdivisions: 1 }, scene);
        slashWave.scaling.set(1, 0.05, 0.45);
        slashWave.position.set(playerStats.xPosition, characterRoot.position.y + 0.4, 0.8);
        slashWave.rotation.set(0, 0, Math.PI / 4);
        
        const slashMat = new StandardMaterial('slashWaveMat', scene);
        slashMat.diffuseColor = new Color3(1.0, 0.3, 0.0);
        slashMat.emissiveColor = new Color3(1.0, 0.25, 0.0);
        slashMat.alpha = 0.85;
        slashWave.material = slashMat;

        activeSlashWaves.push({
          mesh: slashWave,
          speedZ: 28.0,
          timeAlive: 0,
          hitAny: false
        });

      } else if (playerStats.activeWeapon === WeaponType.BLASTER) {
        playSynthSFX('ion_shoot');

        const muzzleFlash = CreateSphere('muzzle', { diameter: 0.3 }, scene);
        muzzleFlash.position.set(playerStats.xPosition + 0.4, characterRoot.position.y + 0.8, 0.6);
        const flashMat = new StandardMaterial('flashMat', scene);
        flashMat.emissiveColor = new Color3(0.0, 1.0, 1.0);
        muzzleFlash.material = flashMat;
        let flashTime = 0;
        const flashObs = scene.onBeforeRenderObservable.add(() => {
          flashTime += engine.getDeltaTime() / 1000;
          muzzleFlash.scaling.addInPlace(new Vector3(0.15, 0.15, 0.15));
          if (flashTime >= 0.08) {
            muzzleFlash.dispose();
            scene.onBeforeRenderObservable.remove(flashObs);
          }
        });

        const proj = CreateCylinder('ion_projectile', { height: 0.6, diameter: 0.08, tessellation: 6 }, scene);
        proj.rotation.x = Math.PI / 2;
        proj.position.set(playerStats.xPosition, characterRoot.position.y + 0.75, 0.7);
        
        const projMat = new StandardMaterial('projMat', scene);
        projMat.diffuseColor = new Color3(0.0, 0.9, 1.0);
        projMat.emissiveColor = new Color3(0.0, 0.85, 1.0);
        proj.material = projMat;

        activeProjectiles.push({
          mesh: proj,
          lane: playerStats.currentLane,
          speedZ: 65.0,
          damageDealt: false,
          hitAny: false
        });
      }
    };

    // Keyboard Action handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') {
        if (playerStats.currentLane === Lane.CENTER) {
          playerStats.currentLane = Lane.LEFT;
        } else if (playerStats.currentLane === Lane.RIGHT) {
          playerStats.currentLane = Lane.CENTER;
        }
      } else if (k === 'arrowright' || k === 'd') {
        if (playerStats.currentLane === Lane.CENTER) {
          playerStats.currentLane = Lane.RIGHT;
        } else if (playerStats.currentLane === Lane.LEFT) {
          playerStats.currentLane = Lane.CENTER;
        }
      } else if ((k === 'arrowup' || k === 'w' || k === ' ') && !playerStats.isJumping && !playerStats.isSliding) {
        playerStats.isJumping = true;
        jumpTime = 0;
        playSynthSFX('jump');
      } else if ((k === 'arrowdown' || k === 's') && !playerStats.isSliding && !playerStats.isJumping) {
        playerStats.isSliding = true;
        slideTime = 0;
        playSynthSFX('slide');
      } else if (k === 'f' || k === 'e') {
        activateWeapon();
      } else if (k === 'q' || k === 'r') {
        triggerEnemyScan();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const handlePointerDown = (e: PointerEvent) => {
      if (gameState !== GameState.PLAYING) return;
      if ((e.target as HTMLElement).closest('button')) return;
      activateWeapon();
    };
    window.addEventListener('pointerdown', handlePointerDown);

    const handleScanTrigger = () => {
      triggerEnemyScan();
    };
    window.addEventListener('cyber-runner-trigger-scan', handleScanTrigger);

    let time = 0;
    scene.onBeforeRenderObservable.add(() => {
      const dt = engine.getDeltaTime() / 1000;
      time += dt;

      // Update Enemy Scan ability state
      if (scanActive) {
        scanTimer -= dt;
        playerStats.enemyScanActive = true;
        playerStats.enemyScanDurationRemaining = Math.max(0, scanTimer);
        
        // Continuous moderate energy drain while active (5% energy per second)
        playerStats.energy = Math.max(0, playerStats.energy - dt * 5.0);
        
        if (scanTimer <= 0) {
          scanActive = false;
          playerStats.enemyScanActive = false;
          playerStats.enemyScanDurationRemaining = 0;
          playSynthSFX('no_ammo');
        }
      } else {
        playerStats.enemyScanActive = false;
        playerStats.enemyScanDurationRemaining = 0;
      }

      if (scanCooldownTimer > 0) {
        scanCooldownTimer -= dt;
        playerStats.enemyScanCooldownRemaining = Math.max(0, scanCooldownTimer);
      } else {
        playerStats.enemyScanCooldownRemaining = 0;
      }

      // --- UPDATE PROCEDURAL SKYBOX ATMOSPHERE ---
      if (Math.abs(playerStats.distance - lastSkyboxUpdateDist) >= 2.0) {
        lastSkyboxUpdateDist = playerStats.distance;
        updateSkybox(playerStats.distance);
      }

      // Exponential speed scaling based on player's distance
      const distanceFactor = playerStats.distance / 1000;
      const baseSpeed = 15.0 * Math.exp(distanceFactor * 0.22);

      if (isBurstActiveLocal) {
        burstTimer -= dt;
        if (burstTimer <= 0) {
          isBurstActiveLocal = false;
          setIsBurstActive(false);
        }
        playerStats.speed = baseSpeed + 30.0; // Flat massive speed boost on top of current base speed
        playerStats.isBurstActive = true;
        playerStats.burstTimeRemaining = burstTimer;
      } else {
        playerStats.speed = baseSpeed;
        playerStats.isBurstActive = false;
        playerStats.burstTimeRemaining = 0;
      }

      // Camera FOV shake and target rumble during Velocity Burst
      if (isBurstActiveLocal) {
        const shakeFrequency = 60.0; // high frequency vibration
        const shakeAmplitude = 0.018; // fov oscillations
        const fovExpansion = 0.18; // warp speed perspective zoom
        camera.fov = baseFov + fovExpansion + Math.sin(time * shakeFrequency) * shakeAmplitude;
        
        camera.target.x = (Math.random() - 0.5) * 0.06;
        camera.target.y = 1.2 + (Math.random() - 0.5) * 0.06;
      } else {
        // Smoothly ease camera back to default settings
        camera.fov += (baseFov - camera.fov) * 0.12;
        camera.target.x += (0 - camera.target.x) * 0.12;
        camera.target.y += (1.2 - camera.target.y) * 0.12;
      }

      // --- 5.5. UPDATE CYBER ACID RAIN PARTICLES ---
      const currentSpeed = playerStats.speed;
      const avgFallSpeed = 13.5;
      const rainFallAngle = Math.atan2(-currentSpeed, -avgFallSpeed);

      // Scale rain density / visibility with speed (faster runner = denser rain feel)
      rainMat.alpha = 0.3 + (currentSpeed / 25.0) * 0.45;

      rainParticles.forEach((p) => {
        // Move downward on Y and backward on Z relative to player speed
        p.mesh.position.y -= p.speedY * dt;
        p.mesh.position.z -= currentSpeed * dt;

        // Dynamic pitch rotation based on relative forward wind speed
        p.mesh.rotation.x = rainFallAngle;

        // Scale length with speed to emphasize warp-speed acceleration streak
        const streakScale = 1.0 + (currentSpeed / 15.0) * 0.8;
        p.mesh.scaling.y = streakScale;

        // Recycle particle if it passes behind user or hits the road
        if (p.mesh.position.y < 0.05 || p.mesh.position.z < -10.0) {
          p.mesh.position.y = Math.random() * 6 + 7.0; // spawn high up
          p.mesh.position.z = Math.random() * 50 + 25.0; // spawn far ahead down the track
          p.mesh.position.x = (Math.random() - 0.5) * 14; // random horizontal offset
          p.speedY = 11 + Math.random() * 5; // randomize new fall velocity
        }
      });

      // Travel distance
      const frameDist = playerStats.speed * dt;
      playerStats.distance += frameDist;
      playerStats.score = Math.floor(playerStats.distance * 1.5) + playerStats.coins * 50 + (playerStats.bonusScore || 0);

      // Linear lane interpolation
      playerStats.targetLaneX = playerStats.currentLane * laneWidth;
      playerStats.xPosition += (playerStats.targetLaneX - playerStats.xPosition) * laneTransitionSpeed;

      // Handle jump height calculation
      let jumpY = 0.0;
      if (playerStats.isJumping) {
        jumpTime += dt;
        const progress = jumpTime / jumpDuration;
        if (progress >= 1.0) {
          playerStats.isJumping = false;
        } else {
          // Parabolic jump arc
          jumpY = Math.sin(progress * Math.PI) * 1.45;
        }
      }

      // Handle slide height scaling
      if (playerStats.isSliding) {
        slideTime += dt;
        if (slideTime >= slideDuration) {
          playerStats.isSliding = false;
          if (!hasLoadedGltf) {
            coreBody.scaling.y = 1.0;
            coreBody.position.y = 0.75;
            headVisor.position.y = 1.6;
          }

          if (hasLoadedGltf && loadedRoot) {
            loadedRoot.scaling.y = 1.0;
            loadedRoot.position.y = 0;
          }
        } else {
          if (!hasLoadedGltf) {
            coreBody.scaling.y = 0.5;
            coreBody.position.y = 0.35;
            headVisor.position.y = 0.8;
          }
        }
      }

      // Position character root mesh
      characterRoot.position.set(playerStats.xPosition, jumpY + 0.08, 0);

      // 9. Synchronize model animations / Swings
      if (hasLoadedGltf) {
        if (playerStats.health <= 0) {
          playLoadedAnim('DEAD');
        } else if (isTemporarilyStaggered) {
          playLoadedAnim('STAGGER');
        } else if (playerStats.isJumping) {
          playLoadedAnim('JUMPING');
        } else if (playerStats.isSliding) {
          playLoadedAnim('SLIDING');
          if (!loadedAnims.sliding && loadedRoot) {
            loadedRoot.scaling.y = 0.55;
            loadedRoot.position.y = -0.3;
          }
        } else {
          playLoadedAnim('RUNNING');
        }
      } else {
        if (!playerStats.isJumping && !playerStats.isSliding) {
          const runCycle = (playerStats.distance * 0.45);
          armL.rotation.x = Math.sin(runCycle) * 0.85;
          armR.rotation.x = -Math.sin(runCycle) * 0.85;
          legL.rotation.x = -Math.sin(runCycle) * 0.85;
          legR.rotation.x = Math.sin(runCycle) * 0.85;
        } else if (playerStats.isJumping) {
          armL.rotation.x = -0.5;
          armR.rotation.x = -0.5;
          legL.rotation.x = 0.3;
          legR.rotation.x = 0.3;
        } else if (playerStats.isSliding) {
          armL.rotation.x = 1.2;
          armR.rotation.x = 1.2;
          legL.rotation.x = -1.0;
          legR.rotation.x = -1.0;
        }
      }

      // Slowly decay energy bar
      playerStats.energy = Math.max(0, playerStats.energy - dt * 2.5);

      // Slowly decay shield charge level and update 3D mesh transparency
      if (playerStats.shieldActive) {
        playerStats.shieldRemaining = Math.max(0, (playerStats.shieldRemaining || 100) - dt * 1.5);
        hexForceField.isVisible = true;
        if (hexForceField.material) {
          (hexForceField.material as StandardMaterial).alpha = 0.05 + 0.17 * (playerStats.shieldRemaining / 100);
        }
        if (playerStats.shieldRemaining <= 0) {
          playerStats.shieldActive = false;
          hexForceField.isVisible = false;
        }
      } else {
        hexForceField.isVisible = false;
      }

      // Weapon sway/bobbing matching running cadence
      if (currentWeaponMesh && playerStats.activeWeapon !== WeaponType.NONE) {
        const swayCycle = playerStats.distance * 0.45;
        if (playerStats.activeWeapon === WeaponType.PLASMA_BLADE) {
          currentWeaponMesh.rotation.z = Math.sin(swayCycle) * 0.08;
        } else {
          currentWeaponMesh.position.y = (hasLoadedGltf ? 0.8 : -0.4) + Math.cos(swayCycle) * 0.03;
        }
      }

      // Move and update weapon projectiles (Ion Blaster)
      for (let i = activeProjectiles.length - 1; i >= 0; i--) {
        const proj = activeProjectiles[i];
        proj.mesh.position.z += proj.speedZ * dt;

        let hitObstacle = false;
        activeObstacles.forEach((obs) => {
          if (obs.data.hasBeenPassed || hitObstacle) return;
          
          const isSameLane = obs.data.lane === proj.lane;
          const zDist = Math.abs(obs.mesh.position.z - proj.mesh.position.z);
          
          if (isSameLane && zDist < 1.4) {
            obs.data.hasBeenPassed = true;
            hitObstacle = true;
            proj.hitAny = true;
            obs.mesh.scaling.set(0.01, 0.01, 0.01);
            playSynthSFX('slam');
            triggerVibration(30);
            
            playerStats.obstaclesDestroyed = (playerStats.obstaclesDestroyed || 0) + 1;
            playerStats.destroyCombo = (playerStats.destroyCombo || 0) + 1;
            if (playerStats.destroyCombo > (playerStats.maxDestroyCombo || 0)) {
              playerStats.maxDestroyCombo = playerStats.destroyCombo;
            }
            const comboMult = Math.min(10, 1 + Math.floor(playerStats.destroyCombo / 3));
            const pts = 150 * comboMult;
            playerStats.bonusScore = (playerStats.bonusScore || 0) + pts;

            // Neon explosion visual effect
            const exp = CreateSphere('ion_exp', { diameter: 0.5 }, scene);
            exp.position.copyFrom(obs.mesh.position);
            const expMat = new StandardMaterial('expMat', scene);
            expMat.emissiveColor = new Color3(0, 0.9, 1);
            exp.material = expMat;
            let expTime = 0;
            const expObs = scene.onBeforeRenderObservable.add(() => {
              const frameDt = engine.getDeltaTime() / 1000;
              expTime += frameDt;
              exp.scaling.addInPlace(new Vector3(0.25, 0.25, 0.25));
              expMat.alpha = Math.max(0, 1 - expTime * 5);
              if (expTime >= 0.2) {
                exp.dispose();
                scene.onBeforeRenderObservable.remove(expObs);
              }
            });

            // Burst shards
            for (let j = 0; j < 8; j++) {
              const shard = CreateBox('shard', { size: 0.15 }, scene);
              shard.position.copyFrom(obs.mesh.position);
              shard.material = obs.mesh.material;
              const vel = new Vector3(
                (Math.random() - 0.5) * 8,
                Math.random() * 5 + 2,
                Math.random() * 6 + 4
              );
              const sObs = scene.onBeforeRenderObservable.add(() => {
                const frameDt = engine.getDeltaTime() / 1000;
                shard.position.addInPlace(vel.scale(frameDt));
                vel.y -= 9.81 * frameDt;
                shard.rotation.x += 0.15;
                if (shard.position.y < -0.5 || shard.position.z < -10) {
                  shard.dispose();
                  scene.onBeforeRenderObservable.remove(sObs);
                }
              });
            }
          }
        });

        if (hitObstacle || proj.mesh.position.z > 100.0) {
          if (!proj.hitAny) {
            playerStats.destroyCombo = 0;
          }
          proj.mesh.dispose();
          activeProjectiles.splice(i, 1);
        }
      }

      // Move and update weapon slash waves (Plasma Blade)
      for (let i = activeSlashWaves.length - 1; i >= 0; i--) {
        const wave = activeSlashWaves[i];
        wave.timeAlive += dt;
        wave.mesh.position.z += wave.speedZ * dt;
        
        wave.mesh.scaling.x += dt * 4.5;
        wave.mesh.scaling.z += dt * 1.5;
        if (wave.mesh.material) {
          (wave.mesh.material as StandardMaterial).alpha = Math.max(0, 0.85 - (wave.timeAlive / 0.35) * 0.85);
        }

        activeObstacles.forEach((obs) => {
          if (obs.data.hasBeenPassed) return;
          const isNearZ = Math.abs(obs.mesh.position.z - wave.mesh.position.z) < 1.4;
          const isCloseX = Math.abs(obs.mesh.position.x - wave.mesh.position.x) < 2.5;
          
          if (isNearZ && isCloseX) {
            wave.hitAny = true;
            obs.data.hasBeenPassed = true;
            obs.mesh.scaling.set(0.01, 0.01, 0.01);
            playSynthSFX('slam');
            triggerVibration(40);
            
            playerStats.obstaclesDestroyed = (playerStats.obstaclesDestroyed || 0) + 1;
            playerStats.destroyCombo = (playerStats.destroyCombo || 0) + 1;
            if (playerStats.destroyCombo > (playerStats.maxDestroyCombo || 0)) {
              playerStats.maxDestroyCombo = playerStats.destroyCombo;
            }
            const comboMult = Math.min(10, 1 + Math.floor(playerStats.destroyCombo / 3));
            const pts = 150 * comboMult;
            playerStats.bonusScore = (playerStats.bonusScore || 0) + pts;

            for (let j = 0; j < 8; j++) {
              const shard = CreateBox('shard', { size: 0.15 }, scene);
              shard.position.copyFrom(obs.mesh.position);
              shard.material = obs.mesh.material;
              const vel = new Vector3(
                (Math.random() - 0.5) * 8,
                Math.random() * 5 + 2,
                Math.random() * 6 + 4
              );
              const sObs = scene.onBeforeRenderObservable.add(() => {
                const frameDt = engine.getDeltaTime() / 1000;
                shard.position.addInPlace(vel.scale(frameDt));
                vel.y -= 9.81 * frameDt;
                shard.rotation.x += 0.15;
                if (shard.position.y < -0.5 || shard.position.z < -10) {
                  shard.dispose();
                  scene.onBeforeRenderObservable.remove(sObs);
                }
              });
            }
          }
        });

        if (wave.timeAlive >= 0.35) {
          if (!wave.hitAny) {
            playerStats.destroyCombo = 0;
          }
          wave.mesh.dispose();
          activeSlashWaves.splice(i, 1);
        }
      }

      // Rotate coins and collectibles
      activeCollectibles.forEach((col) => {
        col.mesh.rotation.y += dt * 3.0;
      });

      // Move obstacles and collectibles closer to player
      activeObstacles.forEach((obs) => {
        obs.mesh.position.z -= frameDist;
        obs.data.zPosition = obs.mesh.position.z;

        // Proximity close-call / near-miss detection when obstacle passes player position (Z <= 0.3)
        if (!obs.data.proximityChecked && obs.mesh.position.z <= 0.3) {
          obs.data.proximityChecked = true;

          if (!obs.data.hasBeenPassed) {
            const laneDiff = Math.abs(obs.data.lane - playerStats.currentLane);
            if (laneDiff <= 1) {
              const logId = Math.random().toString(36).substring(2, 9);
              const isSameLane = laneDiff === 0;
              const points = isSameLane ? 250 : 75; // 250 for perfect dodge, 75 for side-graze
              
              let dodgeType: 'GRAZE' | 'PERFECT_DODGE' | 'ELEVATION_EVASION' | 'SLIDE_EVASION' = 'GRAZE';
              if (isSameLane) {
                if (obs.data.type === ObstacleType.WALL || obs.data.type === ObstacleType.DRONE) {
                  dodgeType = 'SLIDE_EVASION';
                } else if (obs.data.type === ObstacleType.LOW_BARRIER || obs.data.type === ObstacleType.SPIKE_ROCK) {
                  dodgeType = 'ELEVATION_EVASION';
                } else {
                  dodgeType = 'PERFECT_DODGE';
                }
              }

              const newLog = {
                id: logId,
                type: dodgeType,
                points,
                obstacleType: obs.data.type,
                distance: isSameLane ? 0.3 : 1.8,
                timestamp: Date.now()
              };

              playerStats.proximityLogs = [newLog, ...(playerStats.proximityLogs || [])].slice(0, 5);
              playerStats.bonusScore = (playerStats.bonusScore || 0) + points;

              triggerVibration(55);
              
              // Simple sound cue for positive gameplay loop!
              try {
                // Play a brief high-pitched blip to satisfy the ear
                const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioCtx && !isMutedRef.current) {
                  const ctx = new AudioCtx();
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.type = 'sine';
                  osc.frequency.setValueAtTime(1200, ctx.currentTime);
                  osc.frequency.linearRampToValueAtTime(1600, ctx.currentTime + 0.08);
                  gain.gain.setValueAtTime(0.04, ctx.currentTime);
                  gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.08);
                  osc.connect(gain);
                  gain.connect(ctx.destination);
                  osc.start();
                  osc.stop(ctx.currentTime + 0.08);
                }
              } catch (e) {
                // AudioContext fallback safety
              }
            }
          }
        }

        // Apply Enemy Scan wireframe overlay dynamically
        if (scanActive) {
          if (obs.mesh.material !== scanMaterial) {
            if (!(obs.mesh as any).originalMaterial) {
              (obs.mesh as any).originalMaterial = obs.mesh.material;
            }
            obs.mesh.material = scanMaterial;
          }
        } else {
          if ((obs.mesh as any).originalMaterial && obs.mesh.material === scanMaterial) {
            obs.mesh.material = (obs.mesh as any).originalMaterial;
          }
        }
      });

      activeCollectibles.forEach((col) => {
        col.mesh.position.z -= frameDist;
        col.data.zPosition = col.mesh.position.z;
      });

      // Spawn new far elements procedurally as we run
      // Exponential spawn frequency scaling: frequency of obstacles increases exponentially with distance
      const baseSpawnChance = 1.3;
      const spawnFactor = Math.min(4.5, baseSpawnChance * Math.exp(distanceFactor * 0.18));
      const spawnChance = dt * spawnFactor;
      if (Math.random() < spawnChance) {
        // Spawn distance is proportional to current speed so obstacles spawn ahead relative to runner's reaction time
        const farZ = 100.0 + playerStats.speed * 2.2;
        if (Math.random() > 0.35) spawnObstacle(farZ);
        if (Math.random() > 0.3) spawnCollectible(farZ + 12);
      }

      // Cleanup elements passed behind player (Z < -5)
      for (let i = activeObstacles.length - 1; i >= 0; i--) {
        const obs = activeObstacles[i];
        if (obs.mesh.position.z < -5.0) {
          obs.mesh.dispose();
          activeObstacles.splice(i, 1);
        }
      }

      for (let i = activeCollectibles.length - 1; i >= 0; i--) {
        const col = activeCollectibles[i];
        if (col.mesh.position.z < -5.0) {
          col.mesh.dispose();
          activeCollectibles.splice(i, 1);
        }
      }

      // 10. Direct Collision Detections (AABB box check overlap)
      const playerRadius = 0.42;
      const playerZ = 0.0;

      activeObstacles.forEach((obs) => {
        if (obs.data.hasBeenPassed) return;

        // Check lane matching and Z distance overlap
        const isSameLane = obs.data.lane === playerStats.currentLane;
        const zDist = Math.abs(obs.mesh.position.z - playerZ);

        if (isSameLane && zDist < 0.65) {
          let hasCollision = false;

          if (obs.data.type === ObstacleType.WALL) {
            // High wall: collides unless sliding
            if (!playerStats.isSliding) hasCollision = true;
          } else if (obs.data.type === ObstacleType.LOW_BARRIER) {
            // Low barrier: collides unless jumping
            if (!playerStats.isJumping) hasCollision = true;
          } else if (obs.data.type === ObstacleType.SPIKE_ROCK) {
            // Ground spikes: collides unless jumping
            if (!playerStats.isJumping) hasCollision = true;
          } else if (obs.data.type === ObstacleType.DRONE) {
            // Floating drone: collides unless sliding
            if (!playerStats.isSliding) hasCollision = true;
          }

          if (hasCollision) {
            obs.data.hasBeenPassed = true;

            if (isBurstActiveLocal) {
              // Destroy obstacle satisfyingly
              playSynthSFX('slam');
              triggerVibration(60);
              playerStats.obstaclesDestroyed = (playerStats.obstaclesDestroyed || 0) + 1;
              playerStats.destroyCombo = (playerStats.destroyCombo || 0) + 1;
              if (playerStats.destroyCombo > (playerStats.maxDestroyCombo || 0)) {
                playerStats.maxDestroyCombo = playerStats.destroyCombo;
              }
              const comboMult = Math.min(10, 1 + Math.floor(playerStats.destroyCombo / 3));
              const pts = 250 * comboMult;
              playerStats.bonusScore = (playerStats.bonusScore || 0) + pts;
              
              // Shrink / hide mesh instantly
              obs.mesh.scaling.set(0.01, 0.01, 0.01);
              
              // Spawn procedural physical shards that burst outwards with actual gravity & velocity
              for (let j = 0; j < 12; j++) {
                const shard = CreateBox('shard', { size: 0.15 }, scene);
                shard.position.copyFrom(obs.mesh.position);
                shard.material = obs.mesh.material;
                const vel = new Vector3(
                  (Math.random() - 0.5) * 8,
                  Math.random() * 6 + 2.5,
                  Math.random() * 8 + 5
                );
                
                // Animate physical shards
                const sObs = scene.onBeforeRenderObservable.add(() => {
                  const frameDt = engine.getDeltaTime() / 1000;
                  shard.position.addInPlace(vel.scale(frameDt));
                  vel.y -= 9.81 * frameDt; // gravity drop
                  shard.rotation.x += 0.15;
                  shard.rotation.y += 0.15;
                  if (shard.position.y < -0.5 || shard.position.z < -10) {
                    shard.dispose();
                    scene.onBeforeRenderObservable.remove(sObs);
                  }
                });
              }
            } else {
              // Normal damage behavior
              playSynthSFX('damage');
              playerStats.destroyCombo = 0;

              if (playerStats.shieldActive) {
                triggerVibration(100);
                playerStats.shieldRemaining = Math.max(0, (playerStats.shieldRemaining || 100) - 45);
                if (playerStats.shieldRemaining <= 0) {
                  playerStats.shieldActive = false;
                  hexForceField.isVisible = false;
                }
              } else {
                triggerVibration([150, 80, 150]);
                playerStats.health = Math.max(0, playerStats.health - 25);
                isTemporarilyStaggered = true;
                
                // Simple flash visual feedback
                let duration = 0;
                const flash = setInterval(() => {
                  if (!hasLoadedGltf && coreBody) {
                    coreBody.material = (duration % 2 === 0) ? chestEmissiveMat : metalBodyMat;
                  }
                  duration++;
                  if (duration >= 6) {
                    clearInterval(flash);
                    if (!hasLoadedGltf && coreBody) {
                      coreBody.material = metalBodyMat;
                    }
                    isTemporarilyStaggered = false;
                  }
                }, 80);
              }

              if (playerStats.health <= 0) {
                onGameOver();
              }
            }
          }
        }
      });

      // Collectibles overlap checking
      activeCollectibles.forEach((col) => {
        if (col.data.hasBeenCollected) return;

        const isSameLane = col.data.lane === playerStats.currentLane;
        const zDist = Math.abs(col.mesh.position.z - playerZ);

        if (isSameLane && zDist < 0.8) {
          col.data.hasBeenCollected = true;
          col.mesh.dispose();
          playSynthSFX('collect');

          if (col.data.type === 'COIN') {
            playerStats.coins += 1;
            playerStats.score += 50;
          } else if (col.data.type === 'ENERGY_CELL') {
            // Fill energy
            playerStats.energy = Math.min(playerStats.maxEnergy, playerStats.energy + 30);
          } else if (col.data.type === 'SHIELD_POWERUP') {
            playerStats.shieldActive = true;
            playerStats.shieldRemaining = 100;
            hexForceField.isVisible = true;
            if (hexForceField.material) {
              (hexForceField.material as StandardMaterial).alpha = 0.22;
            }
            playSynthSFX('speed_boost');
            playerStats.bonusScore = (playerStats.bonusScore || 0) + 150;
          } else if (col.data.type === 'VELOCITY_BURST') {
            isBurstActiveLocal = true;
            burstTimer = burstDuration;
            setIsBurstActive(true);
            triggerVibration([80, 50, 80]);
            playSynthSFX('speed_boost');
            playerStats.multiplier = Math.min(10, playerStats.multiplier + 1);
          } else if (col.data.type === 'POWERUP_PLASMA_BLADE') {
            playerStats.activeWeapon = WeaponType.PLASMA_BLADE;
            playerStats.weaponCharges = Math.min(10, (playerStats.weaponCharges || 0) + 5);
            updateWeaponMesh(WeaponType.PLASMA_BLADE);
            playSynthSFX('collect');
            playerStats.bonusScore = (playerStats.bonusScore || 0) + 100;
          } else if (col.data.type === 'POWERUP_ION_BLASTER') {
            playerStats.activeWeapon = WeaponType.BLASTER;
            playerStats.weaponCharges = Math.min(10, (playerStats.weaponCharges || 0) + 5);
            updateWeaponMesh(WeaponType.BLASTER);
            playSynthSFX('collect');
            playerStats.bonusScore = (playerStats.bonusScore || 0) + 100;
          }
        }
      });

      // Forward live stats update to React state
      onStatsUpdate({ ...playerStats });
    });

    engine.runRenderLoop(() => {
      scene.render();
    });

    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('cyber-runner-trigger-scan', handleScanTrigger);
      sceneRef.current = null;
      engine.dispose();
    };
  }, [gameState]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Self-contained CSS keyframe animation for horizontal warp streaks */}
      <style>{`
        @keyframes speedStreak {
          0% {
            transform: translateX(100vw);
          }
          100% {
            transform: translateX(-150vw);
          }
        }
        .animate-speed-streak {
          animation-name: speedStreak;
        }
      `}</style>

      {/* Real-time horizontal motion blur filter definition */}
      <svg className="absolute w-0 h-0 pointer-events-none" style={{ visibility: 'hidden' }}>
        <defs>
          <filter id="motion-blur-filter">
            <feGaussianBlur stdDeviation="16 0" />
          </filter>
        </defs>
      </svg>

      {/* High-velocity horizontal speed warp lines */}
      {isBurstActive && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden opacity-85">
          {/* Neon violet warp vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(217,70,239,0.18)_100%)] animate-pulse" />
          
          {/* Flowing speed streaks */}
          <div className="absolute inset-0">
            {Array.from({ length: 28 }).map((_, i) => {
              const top = Math.random() * 100;
              const left = Math.random() * 80;
              const width = 120 + Math.random() * 240;
              const duration = 0.15 + Math.random() * 0.25;
              const delay = Math.random() * 0.4;
              const opacity = 0.3 + Math.random() * 0.5;
              return (
                <div
                  key={i}
                  className="absolute h-[1px] bg-gradient-to-r from-transparent via-fuchsia-400 to-transparent animate-speed-streak"
                  style={{
                    top: `${top}%`,
                    left: `${left}%`,
                    width: `${width}px`,
                    opacity: opacity,
                    animationDuration: `${duration}s`,
                    animationDelay: `${delay}s`,
                    animationIterationCount: 'infinite',
                    animationTimingFunction: 'linear',
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Main 3D Babylon rendering Canvas */}
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block outline-none transition-all duration-150" 
        style={isBurstActive ? { filter: 'url(#motion-blur-filter)' } : undefined}
      />

      {/* Development Debug Inspector Overlay Toggle Button */}
      <button
        onClick={toggleInspector}
        className="absolute top-4 right-4 z-20 px-3 py-1.5 bg-black/70 hover:bg-black/90 border border-[#F27D26]/40 hover:border-[#F27D26] rounded text-[10px] font-mono tracking-wider text-[#F27D26] uppercase select-none transition-all duration-150 flex items-center gap-1.5 cursor-pointer shadow-lg"
        title="Toggle Babylon.js Inspector to debug glTF meshes & skeleton"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${inspectorVisible ? 'bg-green-500 animate-ping' : 'bg-[#F27D26]'}`} />
        {inspectorVisible ? 'Close Inspector' : 'Debug Inspector'}
      </button>
    </div>
  );
}
