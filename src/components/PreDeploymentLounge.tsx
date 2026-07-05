import React, { useEffect, useRef, useState } from 'react';
import {
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
  CreateTorus,
  TransformNode,
  VertexData,
  Mesh,
  SceneLoader,
  Texture,
  Animation
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cpu, Shield, Zap, Terminal, ChevronRight, Play, RefreshCw, 
  Settings, Layers, Radio, CheckCircle, Database, HelpCircle, 
  Sparkles, Eye, Volume2, VolumeX, Swords, Compass, Bookmark
} from 'lucide-react';
import AbyssumAudioController from './AbyssumAudioController';

const modelGlbUrl = '/jog-fwd-variants.glb';

export interface DailyMission {
  id: string;
  type: 'DESTROY_OBSTACLES' | 'TRAVEL_DISTANCE' | 'COLLECT_COINS' | 'REACH_SCORE' | 'MAX_COMBO';
  target: number;
  description: string;
  rewardColor: string;
  rewardName: string;
  dateStr: string;
  completed: boolean;
}

const MISSION_TEMPLATES: Omit<DailyMission, 'id' | 'dateStr' | 'completed'>[] = [
  { type: 'DESTROY_OBSTACLES', target: 20, description: 'Destroy 20 obstacles in a single run', rewardColor: '#F59E0B', rewardName: 'Amber Fusion' },
  { type: 'DESTROY_OBSTACLES', target: 35, description: 'Destroy 35 obstacles in a single run', rewardColor: '#F59E0B', rewardName: 'Amber Fusion' },
  { type: 'DESTROY_OBSTACLES', target: 50, description: 'Destroy 50 obstacles in a single run', rewardColor: '#F59E0B', rewardName: 'Amber Fusion' },
  { type: 'TRAVEL_DISTANCE', target: 400, description: 'Travel 400 meters in a single run', rewardColor: '#8B5CF6', rewardName: 'Hyper Violet' },
  { type: 'TRAVEL_DISTANCE', target: 600, description: 'Travel 600 meters in a single run', rewardColor: '#8B5CF6', rewardName: 'Hyper Violet' },
  { type: 'COLLECT_COINS', target: 30, description: 'Collect 30 core coins in a single run', rewardColor: '#10B981', rewardName: 'Emerald Matrix' },
  { type: 'COLLECT_COINS', target: 50, description: 'Collect 50 core coins in a single run', rewardColor: '#10B981', rewardName: 'Emerald Matrix' },
  { type: 'REACH_SCORE', target: 5000, description: 'Reach a score of 5,000 points in a single run', rewardColor: '#3B82F6', rewardName: 'Electric Cobalt' },
  { type: 'REACH_SCORE', target: 10000, description: 'Reach a score of 10,000 points in a single run', rewardColor: '#3B82F6', rewardName: 'Electric Cobalt' },
  { type: 'MAX_COMBO', target: 4, description: 'Achieve a 4x destruction combo', rewardColor: '#FFFFFF', rewardName: 'Supernova White' },
  { type: 'MAX_COMBO', target: 7, description: 'Achieve a 7x destruction combo', rewardColor: '#FFFFFF', rewardName: 'Supernova White' }
];

const ALL_VISORS = [
  { hex: '#00FFFF', name: 'Tactical Cyan', type: 'base', mission: 'Unlocked by default' },
  { hex: '#EF4444', name: 'Rage Red', type: 'base', mission: 'Unlocked by default' },
  { hex: '#22C55E', name: 'Safe Green', type: 'base', mission: 'Unlocked by default' },
  { hex: '#EAB308', name: 'Warn Yellow', type: 'base', mission: 'Unlocked by default' },
  { hex: '#EC4899', name: 'Neon Pink', type: 'base', mission: 'Unlocked by default' },
  // Special rewards
  { hex: '#F59E0B', name: 'Amber Fusion', type: 'reward', mission: 'Destroy up to 50 obstacles' },
  { hex: '#8B5CF6', name: 'Hyper Violet', type: 'reward', mission: 'Travel up to 600 meters' },
  { hex: '#10B981', name: 'Emerald Matrix', type: 'reward', mission: 'Collect up to 50 coins' },
  { hex: '#3B82F6', name: 'Electric Cobalt', type: 'reward', mission: 'Reach up to 10,000 pts' },
  { hex: '#FFFFFF', name: 'Supernova White', type: 'reward', mission: 'Achieve up to 7x Combo' }
];

export interface SavedLoadout {
  name: string;
  visorColor: string;
  weaponType: 'PLASMA_BLADE' | 'BLASTER' | 'NONE';
  armorColor?: string;
  chestColor?: string;
  hasShield?: boolean;
  hasJetpack?: boolean;
}

interface PreDeploymentLoungeProps {
  onStartGame: (selectedGear: any) => void;
  savedHighScore?: number;
  onDisconnect?: () => void;
  onStartRailExtraction?: () => void;
}

const getWebGLInfo = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return { vendor: 'Generic', renderer: 'Software Rasterizer' };
    const dbgRenderInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbgRenderInfo) {
      const vendor = gl.getParameter(dbgRenderInfo.UNMASKED_VENDOR_WEBGL);
      const renderer = gl.getParameter(dbgRenderInfo.UNMASKED_RENDERER_WEBGL);
      return { vendor: vendor || 'Generic GPU Vendor', renderer: renderer || 'Generic WebGL Renderer' };
    }
    return { vendor: 'Standard', renderer: 'WebGL Generic' };
  } catch (e) {
    return { vendor: 'Unknown', renderer: 'Browser Default' };
  }
};

export default function PreDeploymentLounge({ onStartGame, savedHighScore = 0, onDisconnect, onStartRailExtraction }: PreDeploymentLoungeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const meshesRef = useRef<{
    characterRoot?: TransformNode;
    coreBody?: Mesh;
    headVisor?: Mesh;
    chestPlate?: Mesh;
    armL?: Mesh;
    armR?: Mesh;
    legL?: Mesh;
    legR?: Mesh;
    hudRing?: Mesh;
    protectionShieldHull?: Mesh;
    hexForceField?: Mesh;
    jetpack?: Mesh;
  }>({});

  const loadedGltfRootRef = useRef<any>(null);
  const hasLoadedGltfRef = useRef<boolean>(false);
  const loadedGltfMeshesRef = useRef<any[]>([]);
  const isGltfLoadingRef = useRef<boolean>(false);

  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadingStep, setLoadingStep] = useState<string>('Booting core terminal...');
  const [animationMode, setAnimationMode] = useState<'IDLE' | 'JOGGING'>('IDLE');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // HMI Custom Head Asset loading state
  const [headGltfUrl, setHeadGltfUrl] = useState('');
  const [isHeadLoading, setIsHeadLoading] = useState(false);
  const [headLoadError, setHeadLoadError] = useState<string | null>(null);
  const [headLoadedSuccess, setHeadLoadedSuccess] = useState(false);
  const loadedCustomHeadRef = useRef<any>(null);

  const [testKeyPressed, setTestKeyPressed] = useState<string | null>(null);
  const [testActionName, setTestActionName] = useState<string | null>(null);

  const animationModeRef = useRef<'IDLE' | 'JOGGING'>('IDLE');
  const loadedAnimsRef = useRef<{
    idleAnim?: any;
    jogAnim?: any;
    jumpStartAnim?: any;
    jumpApexAnim?: any;
    jumpPrelandAnim?: any;
    jumpRecoveryAnim?: any;
    slidingAnim?: any;
    staggerAnim?: any;
    deadAnim?: any;
    jogLeftAnim?: any;
    jogRightAnim?: any;
    allGroups?: any[];
  }>({});

  useEffect(() => {
    animationModeRef.current = animationMode;
  }, [animationMode]);

  // Daily Mission states
  const [currentMission, setCurrentMission] = useState<DailyMission | null>(null);
  const [unlockedVisorColors, setUnlockedVisorColors] = useState<string[]>(['#00FFFF', '#EF4444', '#22C55E', '#EAB308', '#EC4899']);
  const [completedNotification, setCompletedNotification] = useState<{
    show: boolean;
    rewardColor: string;
    rewardName: string;
    description: string;
    valueAchieved: number;
    metricLabel: string;
  } | null>(null);

  // Character customizable gear state
  const [gear, setGear] = useState({
    visorColor: '#00FFFF', // Cyan
    armorColor: '#3F3F46', // Zinc Dull Metal
    chestColor: '#F27D26', // Orange Emissive
    hasShield: true,
    hasJetpack: false,
    weaponType: 'PLASMA_BLADE' as 'PLASMA_BLADE' | 'BLASTER' | 'NONE'
  });

  // Saved loadout presets
  const [loadouts, setLoadouts] = useState<SavedLoadout[]>(() => {
    const saved = localStorage.getItem('cyber_runner_saved_loadouts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fall back to default if parsing errors
      }
    }
    return [
      { name: 'Strike Spec', visorColor: '#00FFFF', weaponType: 'PLASMA_BLADE', armorColor: '#3F3F46', chestColor: '#F27D26', hasShield: true, hasJetpack: false },
      { name: 'Heavy Gunner', visorColor: '#EF4444', weaponType: 'BLASTER', armorColor: '#450A0A', chestColor: '#F43F5E', hasShield: true, hasJetpack: false },
      { name: 'Swift Infiltrator', visorColor: '#22C55E', weaponType: 'NONE', armorColor: '#14532D', chestColor: '#10B981', hasShield: true, hasJetpack: true }
    ];
  });

  // Calibration states
  const [activeTab, setActiveTab] = useState<'gear' | 'calibration'>('gear');
  const [calibrationState, setCalibrationState] = useState<'idle' | 'testing_webgl' | 'testing_cpu' | 'testing_latency' | 'completed'>('idle');
  const [calibrationLog, setCalibrationLog] = useState<string[]>([]);
  const [webglInfo, setWebglInfo] = useState<{ vendor: string, renderer: string }>({ vendor: '', renderer: '' });
  const [detectedMetrics, setDetectedMetrics] = useState({ fps: 60, singleThreadMs: 0, score: 0, quality: 'balanced' as 'low' | 'balanced' | 'high' });
  const [selectedQuality, setSelectedQuality] = useState<'low' | 'balanced' | 'high'>(() => {
    return (localStorage.getItem('cyber_runner_graphics_quality') as any) || 'balanced';
  });

  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [calibrationLog]);

  const runDiagnostics = async () => {
    if (calibrationState !== 'idle' && calibrationState !== 'completed') return;
    
    playUISfx('boot');
    setCalibrationLog([]);
    
    // Phase 1: WebGL Diagnostic
    setCalibrationState('testing_webgl');
    setCalibrationLog(prev => [...prev, '⚡ INITIATING HARDWARE INTERROGATION SEQUENCE...']);
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const info = getWebGLInfo();
    setWebglInfo(info);
    setCalibrationLog(prev => [
      ...prev,
      `✔ WEBGL CONTEXT CREATED IN COGNITIVE CORE`,
      `🖥 GPU VENDOR: ${info.vendor}`,
      `⚙ RENDERER: ${info.renderer}`,
      `🗲 VERTEX_ATTRIBS_LIMIT VALIDATED: 16+`,
      `⚡ CONTEXT DETECTED: WEBGL2 RECONSTRUCTION ACTIVE`
    ]);
    
    playUISfx('toggle');
    
    // Phase 2: CPU Stress / Speed Calculation
    await new Promise(resolve => setTimeout(resolve, 800));
    setCalibrationState('testing_cpu');
    setCalibrationLog(prev => [...prev, '🖲 RUNNING ALGORITHMIC PATHFINDING SOLVER (CPU LOAD)...']);
    
    const startTime = performance.now();
    let count = 0;
    for (let i = 0; i < 6000000; i++) {
      count += Math.sin(i) * Math.cos(i);
    }
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    setCalibrationLog(prev => [
      ...prev,
      `✔ SOLVER METRICS RETRIEVED IN ${duration.toFixed(1)}ms`,
      `⚡ INTEL_LOGIC_INDEX: ${(6000000 / duration / 100).toFixed(0)} FLOPS/UNIT`,
      `⚙ PARALLEL_STREAMING_SPS: 4-WAY CORRELATION ESTABLISHED`
    ]);
    playUISfx('toggle');

    // Phase 3: Frame Rate / Frame Latency Test
    await new Promise(resolve => setTimeout(resolve, 800));
    setCalibrationState('testing_latency');
    setCalibrationLog(prev => [...prev, '☇ BENCHMARKING REFRESH RATE & ANIMATION LATENCY...']);
    
    const frameTimes: number[] = [];
    let frameCount = 0;
    const maxFrames = 25;
    
    await new Promise<void>((resolveFrame) => {
      let lastFrameTime = performance.now();
      const tick = () => {
        const now = performance.now();
        frameTimes.push(now - lastFrameTime);
        lastFrameTime = now;
        frameCount++;
        
        if (frameCount < maxFrames) {
          requestAnimationFrame(tick);
        } else {
          resolveFrame();
        }
      };
      requestAnimationFrame(tick);
    });
    
    const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    const estimatedFps = Math.min(120, Math.round(1000 / avgFrameTime));
    const stdDev = Math.sqrt(frameTimes.map(x => Math.pow(x - avgFrameTime, 2)).reduce((a, b) => a + b, 0) / frameTimes.length);
    
    setCalibrationLog(prev => [
      ...prev,
      `✔ AVERAGE FRAME DELAY: ${avgFrameTime.toFixed(1)}ms (VARIANCE: ${stdDev.toFixed(2)}ms)`,
      `☇ REFRESH CAPABILITY: ~${estimatedFps}Hz REGISTERED`,
      `⚡ BUFFER LATENCY: ${Math.max(1, Math.round(avgFrameTime * 0.7))}ms (COGNITIVE EXTRACTOR ACTIVE)`
    ]);
    playUISfx('toggle');
    
    // Phase 4: Scoring and Suggesting settings
    await new Promise(resolve => setTimeout(resolve, 800));
    setCalibrationState('completed');
    
    const isSlow = duration > 140 || estimatedFps < 45;
    const isHigh = duration < 65 && estimatedFps >= 55;
    
    let suggestedQuality: 'low' | 'balanced' | 'high' = 'balanced';
    if (isSlow) {
      suggestedQuality = 'low';
    } else if (isHigh) {
      suggestedQuality = 'high';
    }
    
    const efficiencyScore = Math.round(100000 / (duration * (stdDev + 1) * (1000 / estimatedFps)));
    
    setDetectedMetrics({
      fps: estimatedFps,
      singleThreadMs: duration,
      score: efficiencyScore,
      quality: suggestedQuality
    });
    
    localStorage.setItem('cyber_runner_graphics_quality', suggestedQuality);
    setSelectedQuality(suggestedQuality);
    
    setCalibrationLog(prev => [
      ...prev,
      `★ AUTO-CALIBRATION CONCLUDED ★`,
      `★ HARDWARE PERFORMANCE SCORE: ${efficiencyScore} POINTS`,
      `⚙ SUGGESTED PROTOCOL: ${suggestedQuality.toUpperCase()}`
    ]);
    playUISfx('mission_complete');
  };

  // Sound generator
  const playUISfx = (type: 'click' | 'toggle' | 'boot' | 'launch' | 'mission_complete') => {
    if (isMuted) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'toggle') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(350, ctx.currentTime);
        osc.frequency.setValueAtTime(500, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'boot') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.6);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } else if (type === 'launch') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'mission_complete') {
        osc.type = 'sine';
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.1);
        osc.frequency.setValueAtTime(659.25, now + 0.2);
        osc.frequency.setValueAtTime(880, now + 0.3);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.6);
        osc.start();
        osc.stop(now + 0.6);
      }
    } catch (e) {
      // Audio context block safety
    }
  };

  const playCurrentAnimation = () => {
    if (!loadedAnimsRef.current.allGroups) return;
    loadedAnimsRef.current.allGroups.forEach(g => {
      g.stop();
      g.weight = 0;
    });
    const mode = animationModeRef.current;
    if (mode === 'IDLE' && loadedAnimsRef.current.idleAnim) {
      loadedAnimsRef.current.idleAnim.weight = 1.0;
      loadedAnimsRef.current.idleAnim.play(true);
    } else if (mode === 'JOGGING' && loadedAnimsRef.current.jogAnim) {
      loadedAnimsRef.current.jogAnim.weight = 1.0;
      loadedAnimsRef.current.jogAnim.play(true);
    }
  };

  const loadGltfModel = (targetScene: Scene, targetRoot: TransformNode) => {
    if (hasLoadedGltfRef.current || isGltfLoadingRef.current) return;
    isGltfLoadingRef.current = true;

    // 1. Keep procedural mesh placeholders hidden during loading to only show the glTF model
    if (meshesRef.current.coreBody) meshesRef.current.coreBody.isVisible = false;
    if (meshesRef.current.headVisor) meshesRef.current.headVisor.isVisible = false;
    if (meshesRef.current.chestPlate) meshesRef.current.chestPlate.isVisible = false;
    if (meshesRef.current.armL) meshesRef.current.armL.isVisible = false;
    if (meshesRef.current.armR) meshesRef.current.armR.isVisible = false;
    if (meshesRef.current.legL) meshesRef.current.legL.isVisible = false;
    if (meshesRef.current.legR) meshesRef.current.legR.isVisible = false;
    if (meshesRef.current.jetpack) meshesRef.current.jetpack.isVisible = gear.hasJetpack;

    const targetModelUrl = modelGlbUrl;
    const lastSlash = targetModelUrl.lastIndexOf('/');
    const rootUrl = lastSlash !== -1 ? targetModelUrl.substring(0, lastSlash + 1) : '';
    const fileName = lastSlash !== -1 ? targetModelUrl.substring(lastSlash + 1) : targetModelUrl;

    return SceneLoader.ImportMeshAsync('', rootUrl, fileName, targetScene)
      .then((result) => {
        console.log(`GLTF model (jog-fwd-variants.glb) loaded successfully in Pre-deployment Viewer:`, result);
        const loadedRoot = result.meshes[0];
        loadedRoot.parent = targetRoot;
        loadedRoot.scaling = new Vector3(1, 1, 1);
        loadedRoot.position = Vector3.Zero();

        // Save reference to dispose later
        loadedGltfRootRef.current = loadedRoot;
        hasLoadedGltfRef.current = true;
        loadedGltfMeshesRef.current = result.meshes;
        isGltfLoadingRef.current = false;

        // Hide procedural components to use glTF model, while keeping attachments bound to actual state
        if (meshesRef.current.coreBody) meshesRef.current.coreBody.isVisible = false;
        if (meshesRef.current.headVisor) meshesRef.current.headVisor.isVisible = false;
        if (meshesRef.current.chestPlate) meshesRef.current.chestPlate.isVisible = false;
        if (meshesRef.current.armL) meshesRef.current.armL.isVisible = false;
        if (meshesRef.current.armR) meshesRef.current.armR.isVisible = false;
        if (meshesRef.current.legL) meshesRef.current.legL.isVisible = false;
        if (meshesRef.current.legR) meshesRef.current.legR.isVisible = false;
        if (meshesRef.current.jetpack) meshesRef.current.jetpack.isVisible = gear.hasJetpack;
        if (meshesRef.current.protectionShieldHull) meshesRef.current.protectionShieldHull.isVisible = gear.hasShield;

        // Apply customization colors immediately to loaded meshes
        result.meshes.forEach((mesh) => {
          if (mesh && mesh.material) {
            const mat = mesh.material;
            const name = mat.name.toLowerCase();
            const meshName = mesh.name.toLowerCase();

            if (name.includes('visor') || name.includes('eye') || name.includes('glass') || name.includes('glow') || name.includes('light') || name.includes('emit') || name.includes('neon') ||
                meshName.includes('visor') || meshName.includes('eye') || meshName.includes('glow') || meshName.includes('glass')) {
              if ((mat as any).emissiveColor) (mat as any).emissiveColor = Color3.FromHexString(gear.visorColor);
              if ((mat as any).diffuseColor) (mat as any).diffuseColor = Color3.FromHexString(gear.visorColor);
              if ((mat as any).albedoColor) (mat as any).albedoColor = Color3.FromHexString(gear.visorColor);
            }
            else if (name.includes('chest') || name.includes('reactor') || name.includes('core') || name.includes('heart') ||
                     meshName.includes('chest') || meshName.includes('reactor') || meshName.includes('core')) {
              if ((mat as any).emissiveColor) (mat as any).emissiveColor = Color3.FromHexString(gear.chestColor);
              if ((mat as any).diffuseColor) (mat as any).diffuseColor = Color3.FromHexString(gear.chestColor);
              if ((mat as any).albedoColor) (mat as any).albedoColor = Color3.FromHexString(gear.chestColor);
            }
            else if (name.includes('body') || name.includes('armor') || name.includes('suit') || name.includes('metal') || name.includes('skin') || name.includes('base') || name.includes('plate') || name.includes('chassis') ||
                     meshName.includes('body') || meshName.includes('armor') || meshName.includes('suit') || meshName.includes('torso') || meshName.includes('chestplate')) {
              if ((mat as any).diffuseColor) (mat as any).diffuseColor = Color3.FromHexString(gear.armorColor);
              if ((mat as any).albedoColor) (mat as any).albedoColor = Color3.FromHexString(gear.armorColor);
            }
          }
        });

        // Extract Animations
        const animGroups = result.animationGroups;
        animGroups.forEach(g => g.stop());

        const JOG_ANIM = "cst-ert-jog-fwd-a";
        const IDLE_ANIM = "cst-ert-idle-a";
        const JUMP_START = "cst-ert-jump-start-a";
        const JUMP_APEX = "cst-ert-jump-apex-a";
        const JUMP_PRELAND = "cst-ert-jump-preland-a";
        const JUMP_RECOVERY = "cst-ert-jump-recovery-a";
        const SLIDING_ANIM = "cst-ert-jog-fwd-downhill-a";
        const STAGGER_ANIM = "cst-ert-jog-fwd-pivot-180-a";
        const DEAD_ANIM = "cst-ert-jog-fwd-stop-a";
        const JOG_LEFT_ANIM = "cst-ert-jog-fwd-circle-left-a";
        const JOG_RIGHT_ANIM = "cst-ert-jog-fwd-circle-right-a";

        const idle = animGroups.find(g => g.name === IDLE_ANIM);
        const jog = animGroups.find(g => g.name === JOG_ANIM);
        const jumpStart = animGroups.find(g => g.name === JUMP_START);
        const jumpApex = animGroups.find(g => g.name === JUMP_APEX);
        const jumpPreland = animGroups.find(g => g.name === JUMP_PRELAND);
        const jumpRecovery = animGroups.find(g => g.name === JUMP_RECOVERY);
        const sliding = animGroups.find(g => g.name === SLIDING_ANIM);
        const stagger = animGroups.find(g => g.name === STAGGER_ANIM);
        const dead = animGroups.find(g => g.name === DEAD_ANIM);
        const jogLeft = animGroups.find(g => g.name === JOG_LEFT_ANIM);
        const jogRight = animGroups.find(g => g.name === JOG_RIGHT_ANIM);

        loadedAnimsRef.current = {
          idleAnim: idle || animGroups[0],
          jogAnim: jog || animGroups[1] || animGroups[0],
          jumpStartAnim: jumpStart,
          jumpApexAnim: jumpApex,
          jumpPrelandAnim: jumpPreland,
          jumpRecoveryAnim: jumpRecovery,
          slidingAnim: sliding,
          staggerAnim: stagger,
          deadAnim: dead,
          jogLeftAnim: jogLeft,
          jogRightAnim: jogRight,
          allGroups: animGroups
        };

        // Start initial animation based on current mode
        playCurrentAnimation();
      })
      .catch((err) => {
        console.warn(`Could not load GLTF model (${targetModelUrl}). Running ultra-beautiful procedural render:`, err);
        isGltfLoadingRef.current = false;
      });
  };

  const handleLoadCustomHead = (targetScene: Scene | null, targetRoot: TransformNode | undefined) => {
    if (!headGltfUrl.trim() || !targetScene || !targetRoot || isHeadLoading) return;
    setIsHeadLoading(true);
    setHeadLoadError(null);
    setHeadLoadedSuccess(false);

    // Play visualizer boot sound
    playUISfx('toggle');

    // Dispose previous custom head if any
    if (loadedCustomHeadRef.current) {
      loadedCustomHeadRef.current.dispose();
      loadedCustomHeadRef.current = null;
    }

    let processedUrl = headGltfUrl.trim();
    if (processedUrl.startsWith('/public/')) {
      processedUrl = processedUrl.replace('/public/', '/');
    } else if (processedUrl.startsWith('public/')) {
      processedUrl = processedUrl.replace('public/', '/');
    }

    const lastSlash = processedUrl.lastIndexOf('/');
    const rootUrl = lastSlash !== -1 ? processedUrl.substring(0, lastSlash + 1) : '';
    const fileName = lastSlash !== -1 ? processedUrl.substring(lastSlash + 1) : processedUrl;

    SceneLoader.ImportMeshAsync('', rootUrl, fileName, targetScene)
      .then((result) => {
        setIsHeadLoading(false);
        setHeadLoadedSuccess(true);
        playUISfx('boot');

        const loadedRoot = result.meshes[0];
        loadedCustomHeadRef.current = loadedRoot;

        // Position & Scale the loaded Head model elegantly to sit on the neck
        loadedRoot.parent = targetRoot;
        loadedRoot.position = new Vector3(0, 1.6, 0);
        loadedRoot.scaling = new Vector3(1.2, 1.2, 1.2);

        // Hide procedural sphere headVisor placeholder
        if (meshesRef.current.headVisor) {
          meshesRef.current.headVisor.isVisible = false;
        }

        // Apply colors to the custom head meshes if applicable
        result.meshes.forEach((mesh) => {
          if (mesh && mesh.material) {
            const mat = mesh.material;
            const name = mat.name.toLowerCase();
            const meshName = mesh.name.toLowerCase();
            if (name.includes('visor') || name.includes('eye') || name.includes('glass') || name.includes('glow') || name.includes('light') || name.includes('emit') || name.includes('neon') ||
                meshName.includes('visor') || meshName.includes('eye') || meshName.includes('glow') || meshName.includes('glass')) {
              if ((mat as any).emissiveColor) (mat as any).emissiveColor = Color3.FromHexString(gear.visorColor);
              if ((mat as any).diffuseColor) (mat as any).diffuseColor = Color3.FromHexString(gear.visorColor);
            }
          }
        });
      })
      .catch((err) => {
        console.error(err);
        setIsHeadLoading(false);
        setHeadLoadError('Failed to resolve or parse GLTF path. Check filename or connection.');
        playUISfx('toggle');

        // Re-enable procedural head if custom load fails and full model hasn't loaded
        if (meshesRef.current.headVisor && !hasLoadedGltfRef.current) {
          meshesRef.current.headVisor.isVisible = true;
        }
      });
  };

  // Loading steps Simulation
  useEffect(() => {
    const steps = [
      { text: 'Accessing tactical database...', duration: 400, prg: 20 },
      { text: 'Calibrating character telemetry...', duration: 500, prg: 45 },
      { text: 'Scanning for local assets (jog-fwd-variants.glb)...', duration: 600, prg: 70 },
      { text: 'Mounting holograph visualizer...', duration: 400, prg: 100 }
    ];

    let currentStep = 0;
    const runSteps = () => {
      if (currentStep < steps.length) {
        setLoadingStep(steps[currentStep].text);
        setLoadingProgress(steps[currentStep].prg);
        setTimeout(() => {
          currentStep++;
          runSteps();
        }, steps[currentStep].duration);
      } else {
        setIsLoading(false);
        playUISfx('boot');
      }
    };

    runSteps();
  }, []);

  // Daily Mission system initialization
  useEffect(() => {
    // 1. Load unlocked visors
    const savedUnlocked = localStorage.getItem('cyber_runner_unlocked_visors');
    let unlockedList = ['#00FFFF', '#EF4444', '#22C55E', '#EAB308', '#EC4899'];
    if (savedUnlocked) {
      try {
        const parsed = JSON.parse(savedUnlocked);
        if (Array.isArray(parsed)) {
          unlockedList = Array.from(new Set([...unlockedList, ...parsed]));
        }
      } catch (e) {
        // Safe check
      }
    }
    setUnlockedVisorColors(unlockedList);

    // 2. Generate or load Daily Mission based on current date
    const todayStr = new Date().toISOString().split('T')[0];
    const savedMission = localStorage.getItem('cyber_runner_daily_mission');
    let activeMission: DailyMission;

    const generateNewMission = (dateStr: string): DailyMission => {
      const randIndex = Math.floor(Math.random() * MISSION_TEMPLATES.length);
      const template = MISSION_TEMPLATES[randIndex];
      const newMission: DailyMission = {
        id: Math.random().toString(),
        ...template,
        dateStr,
        completed: false
      };
      localStorage.setItem('cyber_runner_daily_mission', JSON.stringify(newMission));
      return newMission;
    };

    if (savedMission) {
      try {
        const parsed = JSON.parse(savedMission);
        if (parsed && parsed.dateStr === todayStr) {
          activeMission = parsed;
        } else {
          activeMission = generateNewMission(todayStr);
        }
      } catch (e) {
        activeMission = generateNewMission(todayStr);
      }
    } else {
      activeMission = generateNewMission(todayStr);
    }
    
    setCurrentMission(activeMission);

    // 3. Inspect last run results if any
    const lastRunStr = localStorage.getItem('cyber_runner_last_run');
    if (lastRunStr) {
      try {
        const lastRun = JSON.parse(lastRunStr);
        if (lastRun && !activeMission.completed) {
          let valueAchieved = 0;
          let metricLabel = '';

          switch (activeMission.type) {
            case 'DESTROY_OBSTACLES':
              valueAchieved = lastRun.obstaclesDestroyed || 0;
              metricLabel = 'obstacles destroyed';
              break;
            case 'TRAVEL_DISTANCE':
              valueAchieved = lastRun.distance || 0;
              metricLabel = 'meters traveled';
              break;
            case 'COLLECT_COINS':
              valueAchieved = lastRun.coins || 0;
              metricLabel = 'coins collected';
              break;
            case 'REACH_SCORE':
              valueAchieved = lastRun.score || 0;
              metricLabel = 'points reached';
              break;
            case 'MAX_COMBO':
              valueAchieved = lastRun.maxDestroyCombo || 0;
              metricLabel = 'max destruction combo';
              break;
          }

          if (valueAchieved >= activeMission.target) {
            activeMission.completed = true;
            localStorage.setItem('cyber_runner_daily_mission', JSON.stringify(activeMission));
            
            const updatedUnlocked = Array.from(new Set([...unlockedList, activeMission.rewardColor]));
            localStorage.setItem('cyber_runner_unlocked_visors', JSON.stringify(updatedUnlocked));
            setUnlockedVisorColors(updatedUnlocked);

            setCompletedNotification({
              show: true,
              rewardColor: activeMission.rewardColor,
              rewardName: activeMission.rewardName,
              description: activeMission.description,
              valueAchieved: Math.floor(valueAchieved),
              metricLabel
            });

            // Auto-select reward color
            setGear(prev => ({ ...prev, visorColor: activeMission.rewardColor }));

            setTimeout(() => {
              playUISfx('mission_complete');
            }, 800);
          }
        }
      } catch (e) {
        // Safe check
      } finally {
        localStorage.removeItem('cyber_runner_last_run');
      }
    }
  }, []);

  const handleForceNewMission = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const randIndex = Math.floor(Math.random() * MISSION_TEMPLATES.length);
    const template = MISSION_TEMPLATES[randIndex];
    const newMission: DailyMission = {
      id: Math.random().toString(),
      ...template,
      dateStr: todayStr,
      completed: false
    };
    localStorage.setItem('cyber_runner_daily_mission', JSON.stringify(newMission));
    setCurrentMission(newMission);
    playUISfx('click');
  };

  // Set up 3D Scene
  useEffect(() => {
    if (isLoading || !canvasRef.current) return;

    // 1. Engine & Scene Setup
    const engine = new Engine(canvasRef.current, true);
    engineRef.current = engine;
    const scene = new Scene(engine);
    sceneRef.current = scene;

    scene.clearColor = new Color3(0.015, 0.02, 0.035).toColor4(1);

    // 2. Beautiful Camera Layout
    const camera = new ArcRotateCamera('loungeCamera', -Math.PI / 2.5, Math.PI / 2.2, 4.5, new Vector3(0, 0.9, 0), scene);
    camera.attachControl(canvasRef.current, true);
    camera.lowerRadiusLimit = 2.5;
    camera.upperRadiusLimit = 7.0;
    camera.lowerBetaLimit = 0.5;
    camera.upperBetaLimit = Math.PI / 1.8;

    // 3. Cybernetic Lights Configuration
    const hemiLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.65;
    hemiLight.groundColor = new Color3(0.05, 0.08, 0.15);
    hemiLight.diffuse = new Color3(0.8, 0.9, 1.0);

    const keyLight = new PointLight('keyLight', new Vector3(2.5, 3.0, 2.0), scene);
    keyLight.intensity = 0.8;
    keyLight.diffuse = new Color3(1.0, 0.6, 0.3); // Warm sun accent

    const fillLight = new PointLight('fillLight', new Vector3(-2.5, 1.5, -2.0), scene);
    fillLight.intensity = 0.6;
    fillLight.diffuse = new Color3(0.1, 0.7, 1.0); // Cool neon backfill

    // 4. Materials setup
    const metalBodyMat = new StandardMaterial('metalBodyMat', scene);
    metalBodyMat.diffuseColor = Color3.FromHexString(gear.armorColor);
    metalBodyMat.specularColor = new Color3(0.8, 0.8, 1.0);
    metalBodyMat.roughness = 0.15;

    const neonVisorMat = new StandardMaterial('neonVisorMat', scene);
    neonVisorMat.emissiveColor = Color3.FromHexString(gear.visorColor);
    neonVisorMat.diffuseColor = Color3.FromHexString(gear.visorColor);

    const chestEmissiveMat = new StandardMaterial('chestEmissiveMat', scene);
    chestEmissiveMat.emissiveColor = Color3.FromHexString(gear.chestColor);

    const metalDullMat = new StandardMaterial('metalDullMat', scene);
    metalDullMat.diffuseColor = new Color3(0.2, 0.2, 0.22);
    metalDullMat.specularColor = new Color3(0.3, 0.3, 0.3);

    const gridPlatformMat = new StandardMaterial('platformMat', scene);
    gridPlatformMat.diffuseColor = new Color3(0.05, 0.08, 0.12);
    gridPlatformMat.emissiveColor = new Color3(0.01, 0.03, 0.06);

    // 5. Interactive Platform Base Ring
    const baseGrid = CreateCylinder('baseGrid', { height: 0.06, diameter: 2.8, tessellation: 48 }, scene);
    baseGrid.position.y = -0.03;
    baseGrid.material = gridPlatformMat;

    const edgeRing = CreateTorus('edgeRing', { diameter: 2.8, thickness: 0.04, tessellation: 64 }, scene);
    edgeRing.position.y = 0.01;
    const ringMat = new StandardMaterial('ringMat', scene);
    ringMat.emissiveColor = new Color3(0.95, 0.49, 0.15); // Tactical orange glow ring
    ringMat.alpha = 0.8;
    edgeRing.material = ringMat;

    // 6. Character Base Skeleton & Node Structure
    const characterRoot = new TransformNode('charRoot', scene);
    characterRoot.position.y = 0.08;
    meshesRef.current.characterRoot = characterRoot;

    // High-poly procedural torso components
    const coreBody = CreateCylinder('coreBody', { 
      height: 1.4, 
      diameterTop: 0.48, 
      diameterBottom: 0.35,
      tessellation: 48,
      subdivisions: 4
    }, scene);
    coreBody.position.y = 0.75;
    coreBody.material = metalBodyMat;
    coreBody.parent = characterRoot;
    coreBody.isVisible = !hasLoadedGltfRef.current;
    meshesRef.current.coreBody = coreBody;

    // High-poly visor (head)
    const headVisor = CreateSphere('headVisor', { diameter: 0.48, segments: 48 }, scene);
    headVisor.position.y = 1.6;
    headVisor.material = neonVisorMat;
    headVisor.parent = characterRoot;
    headVisor.isVisible = !hasLoadedGltfRef.current && !loadedCustomHeadRef.current;
    meshesRef.current.headVisor = headVisor;

    // Beveled Chest Plate
    const chestPlate = CreateBox('chestPlate', { width: 0.45, height: 0.45, depth: 0.25 }, scene);
    chestPlate.position.set(0, 0.9, 0.18);
    chestPlate.material = chestEmissiveMat;
    chestPlate.parent = characterRoot;
    chestPlate.isVisible = !hasLoadedGltfRef.current;
    meshesRef.current.chestPlate = chestPlate;

    // Arms
    const armL = CreateCylinder('armL', { height: 0.8, diameter: 0.18, tessellation: 36 }, scene);
    armL.position.set(-0.38, 0.95, 0);
    armL.material = metalDullMat;
    armL.parent = characterRoot;
    armL.isVisible = !hasLoadedGltfRef.current;
    meshesRef.current.armL = armL;

    const armR = armL.clone('armR');
    armR.position.x = 0.38;
    armR.parent = characterRoot;
    armR.isVisible = !hasLoadedGltfRef.current;
    meshesRef.current.armR = armR;

    // Legs
    const legL = CreateCylinder('legL', { height: 0.8, diameter: 0.2, tessellation: 36 }, scene);
    legL.position.set(-0.22, 0.35, 0);
    legL.material = metalDullMat;
    legL.parent = characterRoot;
    legL.isVisible = !hasLoadedGltfRef.current;
    meshesRef.current.legL = legL;

    const legR = legL.clone('legR');
    legR.position.x = 0.22;
    legR.parent = characterRoot;
    legR.isVisible = !hasLoadedGltfRef.current;
    meshesRef.current.legR = legR;

    // HUD Indicator above head
    const hudRing = CreateCylinder('hudRing', { height: 0.05, diameter: 0.9, tessellation: 64 }, scene);
    hudRing.position.y = 2.15;
    const hudRingMat = new StandardMaterial('hudMat', scene);
    hudRingMat.emissiveColor = Color3.FromHexString(gear.chestColor);
    hudRingMat.alpha = 0.45;
    hudRing.material = hudRingMat;
    hudRing.parent = characterRoot;
    hudRing.isVisible = false;
    meshesRef.current.hudRing = hudRing;

    // Translucent protective sphere shield
    const protectionShieldHull = CreateSphere('protectionShieldHull', { diameter: 2.1, segments: 64 }, scene);
    protectionShieldHull.position.y = 0.9;
    const protectionShieldHullMat = new StandardMaterial('shieldMat', scene);
    protectionShieldHullMat.diffuseColor = new Color3(0.1, 0.8, 1.0);
    protectionShieldHullMat.emissiveColor = new Color3(0.15, 0.9, 1.0);
    protectionShieldHullMat.alpha = 0.22;
    protectionShieldHull.material = protectionShieldHullMat;
    protectionShieldHull.parent = characterRoot;
    protectionShieldHull.isVisible = false;
    meshesRef.current.protectionShieldHull = protectionShieldHull;

    // Jetpack backpack block
    const jetpack = CreateBox('jetpack', { width: 0.3, height: 0.5, depth: 0.25 }, scene);
    jetpack.position.set(0, 0.9, -0.22);
    const jetpackMat = new StandardMaterial('jetpackMat', scene);
    jetpackMat.diffuseColor = new Color3(0.2, 0.2, 0.25);
    jetpack.material = jetpackMat;
    jetpack.parent = characterRoot;
    jetpack.isVisible = false;
    meshesRef.current.jetpack = jetpack;

    // 7. Render Loop with Procedural swing / walk animations
    let time = 0;
    scene.onBeforeRenderObservable.add(() => {
      time += engine.getDeltaTime() / 1000;

      // Rotate edge platform ring slowly
      edgeRing.rotation.y = time * 0.15;
      hudRing.rotation.y = -time * 0.35;

      // Float the HUD ring above head
      hudRing.position.y = 2.15 + Math.sin(time * 2.0) * 0.04;

      if (loadedCustomHeadRef.current) {
        if (!hasLoadedGltfRef.current) {
          loadedCustomHeadRef.current.rotation.x = headVisor.rotation.x;
          loadedCustomHeadRef.current.rotation.y = headVisor.rotation.y;
        } else {
          loadedCustomHeadRef.current.rotation.x = Math.sin(time * 1.5) * 0.02;
          loadedCustomHeadRef.current.rotation.y = Math.cos(time * 0.5) * 0.03;
        }
      }

      if (!hasLoadedGltfRef.current) {
        // Run procedural skeleton cycle based on selection
        if (animationModeRef.current === 'IDLE') {
          // Slow dynamic breathing
          characterRoot.position.y = Math.sin(time * 1.5) * 0.02 + 0.08;
          headVisor.rotation.x = Math.sin(time * 1.5) * 0.03;
          headVisor.rotation.y = Math.cos(time * 0.5) * 0.05;

          armL.rotation.x = Math.sin(time * 1.5) * 0.08;
          armL.rotation.z = -0.1 + Math.sin(time * 0.5) * 0.02;

          armR.rotation.x = -Math.sin(time * 1.5) * 0.08;
          armR.rotation.z = 0.1 - Math.sin(time * 0.5) * 0.02;

          legL.rotation.x = 0;
          legL.rotation.z = -0.05;
          legR.rotation.x = 0;
          legR.rotation.z = 0.05;
        } else {
          // Energetic Jog cycle
          characterRoot.position.y = Math.abs(Math.sin(time * 4)) * 0.1 + 0.06;
          headVisor.rotation.x = 0.1 + Math.sin(time * 4) * 0.03;

          armL.rotation.x = -Math.sin(time * 4) * 0.55;
          armL.rotation.z = -0.15;
          armR.rotation.x = Math.sin(time * 4) * 0.55;
          armR.rotation.z = 0.15;

          legL.rotation.x = Math.sin(time * 4) * 0.5;
          legL.rotation.z = -0.02;
          legR.rotation.x = -Math.sin(time * 4) * 0.5;
          legR.rotation.z = 0.02;
        }
      } else {
        // Even with 3D model, can rotate base or bob slightly if desired, or let animation group execute
        if (animationModeRef.current === 'JOGGING' && !loadedAnimsRef.current.jogAnim) {
          characterRoot.position.y = Math.abs(Math.sin(time * 4)) * 0.08 + 0.08;
          characterRoot.rotation.x = 0.1; // Forward lean
        } else {
          characterRoot.position.y = 0.08;
          characterRoot.rotation.x = 0;
        }
      }
    });

    engine.runRenderLoop(() => {
      scene.render();
    });

    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.dispose();
    };
  }, [isLoading]);

  // Synchronize dynamic customizations
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    const vMat = scene.getMaterialByName('neonVisorMat') as StandardMaterial;
    if (vMat) {
      vMat.emissiveColor = Color3.FromHexString(gear.visorColor);
      vMat.diffuseColor = Color3.FromHexString(gear.visorColor);
    }

    const cMat = scene.getMaterialByName('chestEmissiveMat') as StandardMaterial;
    if (cMat) {
      cMat.emissiveColor = Color3.FromHexString(gear.chestColor);
    }

    const bMat = scene.getMaterialByName('metalBodyMat') as StandardMaterial;
    if (bMat) {
      bMat.diffuseColor = Color3.FromHexString(gear.armorColor);
    }

    // Apply colors to the loaded GLTF model materials
    if (loadedGltfMeshesRef.current && loadedGltfMeshesRef.current.length > 0) {
      loadedGltfMeshesRef.current.forEach((mesh) => {
        if (mesh && mesh.material) {
          const mat = mesh.material;
          const name = mat.name.toLowerCase();
          const meshName = mesh.name.toLowerCase();

          // Visor / Glow mapping
          if (name.includes('visor') || name.includes('eye') || name.includes('glass') || name.includes('glow') || name.includes('light') || name.includes('emit') || name.includes('neon') ||
              meshName.includes('visor') || meshName.includes('eye') || meshName.includes('glow') || meshName.includes('glass')) {
            if ((mat as any).emissiveColor) (mat as any).emissiveColor = Color3.FromHexString(gear.visorColor);
            if ((mat as any).diffuseColor) (mat as any).diffuseColor = Color3.FromHexString(gear.visorColor);
            if ((mat as any).albedoColor) (mat as any).albedoColor = Color3.FromHexString(gear.visorColor);
          }
          // Chest / Reactor Core mapping
          else if (name.includes('chest') || name.includes('reactor') || name.includes('core') || name.includes('heart') ||
                   meshName.includes('chest') || meshName.includes('reactor') || meshName.includes('core')) {
            if ((mat as any).emissiveColor) (mat as any).emissiveColor = Color3.FromHexString(gear.chestColor);
            if ((mat as any).diffuseColor) (mat as any).diffuseColor = Color3.FromHexString(gear.chestColor);
            if ((mat as any).albedoColor) (mat as any).albedoColor = Color3.FromHexString(gear.chestColor);
          }
          // Armor Plate mapping
          else if (name.includes('body') || name.includes('armor') || name.includes('suit') || name.includes('metal') || name.includes('skin') || name.includes('base') || name.includes('plate') || name.includes('chassis') ||
                   meshName.includes('body') || meshName.includes('armor') || meshName.includes('suit') || meshName.includes('torso') || meshName.includes('chestplate')) {
            if ((mat as any).diffuseColor) (mat as any).diffuseColor = Color3.FromHexString(gear.armorColor);
            if ((mat as any).albedoColor) (mat as any).albedoColor = Color3.FromHexString(gear.armorColor);
          }
        }
      });
    }

    if (meshesRef.current.protectionShieldHull) {
      meshesRef.current.protectionShieldHull.isVisible = gear.hasShield;
    }
    if (meshesRef.current.jetpack) {
      meshesRef.current.jetpack.isVisible = gear.hasJetpack;
    }
  }, [gear]);

  // Automatically load initial GLTF model on startup once loading is complete
  useEffect(() => {
    if (isLoading || !sceneRef.current || !meshesRef.current.characterRoot) return;
    loadGltfModel(sceneRef.current, meshesRef.current.characterRoot);
  }, [isLoading]);

  // Handle animation mode changes smoothly without reloading the 3D model meshes
  useEffect(() => {
    playCurrentAnimation();
  }, [animationMode]);

  const resumeDefaultAnimation = () => {
    setTestKeyPressed(null);
    setTestActionName(null);
    if (!loadedAnimsRef.current.allGroups) return;
    
    // Stop all groups
    loadedAnimsRef.current.allGroups.forEach(g => {
      g.stop();
      g.weight = 0;
    });

    // Play default
    const mode = animationModeRef.current;
    if (mode === 'IDLE' && loadedAnimsRef.current.idleAnim) {
      loadedAnimsRef.current.idleAnim.weight = 1.0;
      loadedAnimsRef.current.idleAnim.play(true);
    } else if (mode === 'JOGGING' && loadedAnimsRef.current.jogAnim) {
      loadedAnimsRef.current.jogAnim.weight = 1.0;
      loadedAnimsRef.current.jogAnim.play(true);
    }
  };

  const playTestAnimation = (anim: any, actionName: string, loop: boolean = false) => {
    if (!anim || !loadedAnimsRef.current.allGroups) return;
    
    // Stop other groups
    loadedAnimsRef.current.allGroups.forEach(g => {
      if (g !== anim) {
        g.stop();
        g.weight = 0;
      }
    });

    anim.weight = 1.0;
    anim.play(loop);
    setTestActionName(actionName);

    // If it's a one-shot, restore default on end
    if (!loop) {
      const onEnd = () => {
        if (animationModeRef.current === 'JOGGING') {
          resumeDefaultAnimation();
        }
      };
      if (anim.onAnimationEndObservable) {
        anim.onAnimationEndObservable.addOnce(onEnd);
      } else if (anim.onAnimationGroupEndObservable) {
        anim.onAnimationGroupEndObservable.addOnce(onEnd);
      }
    }
  };

  // Listen to keyboard testing when in JOGGING mode
  useEffect(() => {
    if (animationMode !== 'JOGGING' || isLoading) {
      setTestKeyPressed(null);
      setTestActionName(null);
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (e.repeat) return; // avoid repeats

      if (k === 'w' || k === 'arrowup' || k === ' ') {
        setTestKeyPressed(e.key === ' ' ? 'SPACE' : e.key.toUpperCase());
        playTestAnimation(loadedAnimsRef.current.jumpStartAnim || loadedAnimsRef.current.jogAnim, 'cst-ert-jump-start-a', false);
        if (k === ' ') e.preventDefault();
      } else if (k === 's' || k === 'arrowdown') {
        setTestKeyPressed(e.key.toUpperCase());
        playTestAnimation(loadedAnimsRef.current.slidingAnim || loadedAnimsRef.current.jogAnim, 'cst-ert-jog-fwd-downhill-a', true);
        if (k === 'arrowdown') e.preventDefault();
      } else if (k === 'a' || k === 'arrowleft') {
        setTestKeyPressed(e.key.toUpperCase());
        playTestAnimation(loadedAnimsRef.current.jogLeftAnim || loadedAnimsRef.current.jogAnim, 'cst-ert-jog-fwd-circle-left-a', true);
      } else if (k === 'd' || k === 'arrowright') {
        setTestKeyPressed(e.key.toUpperCase());
        playTestAnimation(loadedAnimsRef.current.jogRightAnim || loadedAnimsRef.current.jogAnim, 'cst-ert-jog-fwd-circle-right-a', true);
      } else if (k === 'q' || k === 'r') {
        setTestKeyPressed(e.key.toUpperCase());
        playTestAnimation(loadedAnimsRef.current.staggerAnim || loadedAnimsRef.current.jogAnim, 'cst-ert-jog-fwd-pivot-180-a', false);
      } else if (k === 'f' || k === 'e') {
        setTestKeyPressed(e.key.toUpperCase());
        playTestAnimation(loadedAnimsRef.current.staggerAnim || loadedAnimsRef.current.jogAnim, 'cst-ert-jog-fwd-pivot-180-a', false);
      } else if (k === 'x' || k === 'escape') {
        setTestKeyPressed(e.key.toUpperCase());
        playTestAnimation(loadedAnimsRef.current.deadAnim || loadedAnimsRef.current.jogAnim, 'cst-ert-jog-fwd-stop-a', false);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const currentKey = e.key === ' ' ? 'SPACE' : e.key.toUpperCase();
      
      if (testKeyPressed === currentKey || ['w', 'arrowup', ' ', 's', 'arrowdown', 'a', 'arrowleft', 'd', 'arrowright'].includes(k)) {
        resumeDefaultAnimation();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [animationMode, testKeyPressed, isLoading]);

  return (
    <div className="relative w-full h-screen bg-[#030712] text-zinc-100 flex flex-col md:flex-row overflow-hidden">
      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[#030712] flex flex-col items-center justify-center p-6 border-4 border-zinc-900"
          >
            <div className="w-full max-w-md p-6 bg-black/60 border border-zinc-800 rounded-lg relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#F27D26] to-transparent animate-pulse" />
              <div className="flex items-center gap-3 mb-6">
                <Cpu className="text-[#F27D26] w-6 h-6 animate-spin" />
                <div>
                  <h2 className="text-sm font-mono tracking-wider text-[#F27D26] uppercase">SYSTEM LOADING</h2>
                  <p className="text-xs text-zinc-500 font-mono">CYBERNETIC_PLATFORM_V4.0</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-400 animate-pulse">{loadingStep}</span>
                  <span className="text-[#F27D26] font-bold">{loadingProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-850">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-orange-600 to-[#F27D26]" 
                    initial={{ width: '0%' }}
                    animate={{ width: `${loadingProgress}%` }}
                    transition={{ ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT: Cyber Control Panel */}
      <div className="w-full md:w-96 h-full bg-zinc-950 border-r border-zinc-850 flex flex-col z-10 overflow-hidden">
        {/* Terminal Header */}
        <div className="p-5 border-b border-zinc-850 bg-black/50 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F27D26] animate-ping" />
              <h1 className="text-sm font-bold tracking-wider font-mono text-[#F27D26] uppercase">PILOT LOUNGE</h1>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">LAUNCH_SEQUENCE_READY</p>
          </div>
          <div className="flex items-center gap-2">
            {onDisconnect && (
              <button 
                onClick={() => {
                  playUISfx('toggle');
                  onDisconnect();
                }}
                className="px-2 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:text-[#F27D26] text-zinc-400 font-mono text-[9px] uppercase tracking-wider rounded transition cursor-pointer"
                title="Disconnect neural link"
              >
                Disconnect
              </button>
            )}
            <button 
              onClick={() => {
                setIsMuted(!isMuted);
                playUISfx('toggle');
              }}
              className="p-1.5 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 rounded text-zinc-400 hover:text-white transition cursor-pointer"
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          </div>
        </div>

        {/* Saved Stats */}
        <div className="p-4 mx-4 mt-4 bg-zinc-900/60 border border-zinc-800/80 rounded flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="text-[#F27D26] w-4 h-4" />
            <span className="text-xs font-mono text-zinc-400 uppercase">Personal Best:</span>
          </div>
          <span className="text-sm font-mono font-bold text-white tracking-wider">{savedHighScore} pts</span>
        </div>

        {/* Daily Mission Panel */}
        {currentMission && (
          <div className="mx-4 mt-4 p-4 bg-zinc-900/45 border border-zinc-850 rounded relative overflow-hidden backdrop-blur-sm">
            {/* Ambient orange/emerald scanline */}
            <div className={`absolute top-0 left-0 h-[2px] ${currentMission.completed ? 'bg-emerald-500 animate-pulse' : 'bg-[#F27D26]'} w-full`} />
            
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-1.5">
                <Terminal size={12} className={currentMission.completed ? 'text-emerald-400 animate-pulse' : 'text-[#F27D26]'} />
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-zinc-400">DAILY CHALLENGE</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleForceNewMission}
                  className="p-1 hover:bg-zinc-800 rounded transition text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  title="Generate a new random challenge"
                >
                  <RefreshCw size={10} className="hover:rotate-180 transition-transform duration-300" />
                </button>
                {currentMission.completed ? (
                  <span className="px-1.5 py-0.5 bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-[8px] font-mono uppercase font-bold rounded animate-pulse">
                    COMPLETE
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 bg-orange-950/80 border border-orange-500/30 text-[#F27D26] text-[8px] font-mono uppercase font-bold rounded">
                    ACTIVE
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs font-mono font-medium text-white mb-2">{currentMission.description}</p>
            
            <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 border-t border-zinc-800/80 pt-2">
              <span className="flex items-center gap-1 text-zinc-500">
                Reward: 
                <span 
                  className="font-bold underline"
                  style={{ color: currentMission.rewardColor }}
                >
                  {currentMission.rewardName}
                </span>
              </span>
              <span className="text-[9px] text-zinc-500 font-bold">
                Visor Tint
              </span>
            </div>
          </div>
        )}

        {/* Abyssum Ambient Audio Sync Controller */}
        <div className="mx-4 mt-4">
          <AbyssumAudioController />
        </div>

        {/* Customize Panel tabs */}
        <div className="px-5 pt-4 flex gap-2 border-b border-zinc-900 bg-zinc-950/25">
          <button
            onClick={() => {
              setActiveTab('gear');
              playUISfx('click');
            }}
            className={`flex-1 pb-2.5 pt-1.5 border-b-2 text-center font-mono text-[10px] tracking-widest uppercase transition-all duration-200 cursor-pointer ${
              activeTab === 'gear'
                ? 'border-[#F27D26] text-white font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            ⚙ Gear Customize
          </button>
          <button
            onClick={() => {
              setActiveTab('calibration');
              playUISfx('click');
            }}
            className={`flex-1 pb-2.5 pt-1.5 border-b-2 text-center font-mono text-[10px] tracking-widest uppercase transition-all duration-200 cursor-pointer ${
              activeTab === 'calibration'
                ? 'border-[#F27D26] text-white font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            ⚡ Auto-Calibration
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-6">
          {activeTab === 'gear' ? (
            <>
              {/* Section 1: Customize Gear */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                  <Settings size={14} className="text-[#F27D26]" />
                  <h2 className="text-xs font-bold tracking-wider font-mono text-zinc-400 uppercase">TELEMETRY ACCESS</h2>
                </div>

                {/* Armor Color */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase">Armor Shell Plating</label>
                  <div className="flex gap-2">
                    {[
                      { hex: '#3F3F46', name: 'Titanium' },
                      { hex: '#1E293B', name: 'Cyber Blue' },
                      { hex: '#450A0A', name: 'Crimson' },
                      { hex: '#14532D', name: 'Matrix Green' },
                      { hex: '#1E1B4B', name: 'Void Purple' }
                    ].map((color) => (
                      <button
                        key={color.hex}
                        onClick={() => {
                          setGear({ ...gear, armorColor: color.hex });
                          playUISfx('click');
                        }}
                        className={`w-6 h-6 rounded border transition-all ${
                          gear.armorColor === color.hex 
                            ? 'border-[#F27D26] scale-110 shadow-[0_0_8px_rgba(242,125,38,0.3)]' 
                            : 'border-transparent opacity-60 hover:opacity-100 cursor-pointer'
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Visor Color */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase block">HUD Visor Emissive</label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_VISORS.map((color) => {
                      const isUnlocked = color.type === 'base' || unlockedVisorColors.includes(color.hex);
                      const isSelected = gear.visorColor === color.hex;
                      
                      return (
                        <button
                          key={color.hex}
                          onClick={() => {
                            if (isUnlocked) {
                              setGear({ ...gear, visorColor: color.hex });
                              playUISfx('click');
                            } else {
                              playUISfx('toggle');
                            }
                          }}
                          className={`w-6 h-6 rounded border relative transition-all flex items-center justify-center ${
                            isSelected 
                              ? 'border-[#F27D26] scale-110 shadow-[0_0_8px_rgba(242,125,38,0.45)] z-10' 
                              : isUnlocked
                                ? 'border-transparent opacity-75 hover:opacity-100 cursor-pointer'
                                : 'border-zinc-900 bg-zinc-950 opacity-40 cursor-not-allowed'
                          }`}
                          style={{ backgroundColor: isUnlocked ? color.hex : '#18181B' }}
                          title={`${color.name} ${isUnlocked ? '' : `(LOCKED: ${color.mission})`}`}
                        >
                          {!isUnlocked && (
                            <span className="text-[8px] font-bold text-zinc-600">🔒</span>
                          )}
                          {isUnlocked && color.type === 'reward' && (
                            <span className="absolute -top-1 -right-1 text-[8px] text-[#F27D26] animate-pulse font-bold">★</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* HMI Custom Head GLTF/GLB Loader */}
                <div className="space-y-2 border-t border-zinc-850 pt-3">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase flex items-center gap-1">
                    <Cpu size={11} className="text-[#F27D26]" />
                    HMI Head Node (glTF/GLB Loader)
                  </label>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="text" 
                      placeholder="Enter head .gltf / .glb URL (e.g. /public/idle.glb)..." 
                      value={headGltfUrl}
                      onChange={(e) => setHeadGltfUrl(e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-800 text-[9px] font-mono px-2 py-1.5 text-zinc-300 rounded focus:outline-none focus:border-[#F27D26]"
                    />
                    <button 
                      onClick={() => handleLoadCustomHead(sceneRef.current, meshesRef.current.characterRoot)}
                      disabled={isHeadLoading}
                      className="px-3 py-1.5 bg-zinc-900 hover:bg-[#F27D26]/20 border border-zinc-700 hover:border-[#F27D26] text-[9px] font-mono text-[#F27D26] font-bold uppercase rounded cursor-pointer transition flex items-center gap-1.5"
                    >
                      {isHeadLoading ? <RefreshCw className="w-3 h-3 animate-spin text-[#F27D26]" /> : 'Load Node'}
                    </button>
                  </div>
                  {headLoadError && (
                    <div className="text-[8px] font-mono text-rose-500 leading-tight">{headLoadError}</div>
                  )}
                  {headLoadedSuccess && (
                    <div className="text-[8px] font-mono text-emerald-400 leading-tight">✔ HMI HEAD NODE LOADED & SYNCED</div>
                  )}
                </div>

                {/* Chest Core Color */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase">Chest Reactor Core</label>
                  <div className="flex gap-2">
                    {[
                      { hex: '#F27D26', name: 'Standard Orange' },
                      { hex: '#A855F7', name: 'Void Purple' },
                      { hex: '#06B6D4', name: 'Hydro Cyan' },
                      { hex: '#10B981', name: 'Bio Green' },
                      { hex: '#F43F5E', name: 'Thermal Red' }
                    ].map((color) => (
                      <button
                        key={color.hex}
                        onClick={() => {
                          setGear({ ...gear, chestColor: color.hex });
                          playUISfx('click');
                        }}
                        className={`w-6 h-6 rounded border transition-all ${
                          gear.chestColor === color.hex 
                            ? 'border-[#F27D26] scale-110 shadow-[0_0_8px_rgba(242,125,38,0.3)]' 
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 2: Force Fields & Systems */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                  <Layers size={14} className="text-[#F27D26]" />
                  <h2 className="text-xs font-bold tracking-wider font-mono text-zinc-400 uppercase">SHIELD / SUBSYSTEMS</h2>
                </div>

                <div className="space-y-3">
                  {/* Force Shield */}
                  <button
                    onClick={() => {
                      setGear({ ...gear, hasShield: !gear.hasShield });
                      playUISfx('toggle');
                    }}
                    className="w-full flex items-center justify-between p-2.5 bg-zinc-900 border border-zinc-800 rounded text-left transition hover:border-zinc-700"
                  >
                    <div className="flex items-center gap-2.5">
                      <Shield size={14} className={gear.hasShield ? 'text-cyan-400' : 'text-zinc-500'} />
                      <span className="text-xs font-mono uppercase tracking-wide">Dynamic Force Shield</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 ${gear.hasShield ? 'bg-cyan-500' : 'bg-zinc-700'}`}>
                      <div className={`bg-white w-3 h-3 rounded-full shadow transition-transform duration-200 transform ${gear.hasShield ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </button>

                  {/* Jetpack */}
                  <button
                    onClick={() => {
                      setGear({ ...gear, hasJetpack: !gear.hasJetpack });
                      playUISfx('toggle');
                    }}
                    className="w-full flex items-center justify-between p-2.5 bg-zinc-900 border border-zinc-800 rounded text-left transition hover:border-zinc-700"
                  >
                    <div className="flex items-center gap-2.5">
                      <Zap size={14} className={gear.hasJetpack ? 'text-amber-400' : 'text-zinc-500'} />
                      <span className="text-xs font-mono uppercase tracking-wide">Backpack Jetpack Booster</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 ${gear.hasJetpack ? 'bg-amber-500' : 'bg-zinc-700'}`}>
                      <div className={`bg-white w-3 h-3 rounded-full shadow transition-transform duration-200 transform ${gear.hasJetpack ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </button>
                </div>
              </div>

              {/* Section 3: Weapon Selection */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                  <Swords size={14} className="text-[#F27D26]" />
                  <h2 className="text-xs font-bold tracking-wider font-mono text-zinc-400 uppercase">WEAPONRY SYSTEM</h2>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: 'NONE', label: 'None' },
                    { type: 'PLASMA_BLADE', label: 'Plasma Blade' },
                    { type: 'BLASTER', label: 'Blaster Pistol' }
                  ].map((wpn) => (
                    <button
                      key={wpn.type}
                      onClick={() => {
                        setGear({ ...gear, weaponType: wpn.type as any });
                        playUISfx('click');
                      }}
                      className={`py-2 px-1 border rounded text-[10px] font-mono uppercase text-center transition ${
                        gear.weaponType === wpn.type 
                          ? 'border-[#F27D26] bg-[#F27D26]/10 text-white font-bold' 
                          : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                      }`}
                    >
                      {wpn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 4: Saved Loadout Slots */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                  <Bookmark size={14} className="text-[#F27D26]" />
                  <h2 className="text-xs font-bold tracking-wider font-mono text-zinc-400 uppercase">SAVED LOADOUTS</h2>
                </div>

                <div className="space-y-3">
                  {loadouts.map((loadout, index) => {
                    const isSelected = gear.visorColor === loadout.visorColor && gear.weaponType === loadout.weaponType;
                    const visorInfo = ALL_VISORS.find(v => v.hex === loadout.visorColor) || { name: 'Unknown' };
                    const weaponName = loadout.weaponType === 'PLASMA_BLADE' ? 'Plasma Blade' : loadout.weaponType === 'BLASTER' ? 'Blaster Pistol' : 'None';
                    
                    return (
                      <div 
                        key={index} 
                        className={`p-3 bg-zinc-900/40 border rounded-lg transition-all flex flex-col gap-2 relative group ${
                          isSelected 
                            ? 'border-emerald-500 bg-emerald-950/5' 
                            : 'border-zinc-850 hover:border-zinc-700'
                        }`}
                      >
                        {/* Slot Header with renaming input and action buttons */}
                        <div className="flex justify-between items-center gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] font-bold text-zinc-500 font-mono">#{index + 1}</span>
                            <input
                              type="text"
                              value={loadout.name}
                              onChange={(e) => {
                                const newLoadouts = [...loadouts];
                                newLoadouts[index] = { ...loadout, name: e.target.value };
                                setLoadouts(newLoadouts);
                                localStorage.setItem('cyber_runner_saved_loadouts', JSON.stringify(newLoadouts));
                              }}
                              className="bg-transparent border-b border-transparent hover:border-zinc-800 focus:border-[#F27D26] focus:outline-none text-[11px] font-black text-zinc-200 tracking-wider font-mono max-w-[125px] truncate py-0.5"
                              placeholder="Unnamed Loadout"
                              title="Click to rename loadout slot"
                            />
                          </div>
                          
                          <div className="flex gap-1">
                            {/* Save Button */}
                            <button
                              onClick={() => {
                                const newLoadouts = [...loadouts];
                                newLoadouts[index] = {
                                  ...loadout,
                                  visorColor: gear.visorColor,
                                  weaponType: gear.weaponType,
                                  armorColor: gear.armorColor,
                                  chestColor: gear.chestColor,
                                  hasShield: gear.hasShield,
                                  hasJetpack: gear.hasJetpack
                                };
                                setLoadouts(newLoadouts);
                                localStorage.setItem('cyber_runner_saved_loadouts', JSON.stringify(newLoadouts));
                                playUISfx('toggle');
                              }}
                              className="px-1.5 py-0.5 bg-zinc-800 hover:bg-[#F27D26] hover:text-black border border-zinc-700 hover:border-transparent text-[8px] font-bold tracking-widest uppercase rounded transition duration-150 cursor-pointer"
                              title="Save current configuration to this loadout slot"
                            >
                              💾 Save
                            </button>
                            {/* Equip Button */}
                            <button
                              onClick={() => {
                                setGear({
                                  visorColor: loadout.visorColor,
                                  weaponType: loadout.weaponType,
                                  armorColor: loadout.armorColor || gear.armorColor,
                                  chestColor: loadout.chestColor || gear.chestColor,
                                  hasShield: loadout.hasShield !== undefined ? loadout.hasShield : gear.hasShield,
                                  hasJetpack: loadout.hasJetpack !== undefined ? loadout.hasJetpack : gear.hasJetpack
                                });
                                playUISfx('click');
                              }}
                              className={`px-1.5 py-0.5 text-[8px] font-bold tracking-widest uppercase rounded transition duration-150 cursor-pointer ${
                                isSelected 
                                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 cursor-default'
                                  : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300'
                              }`}
                              title="Equip this loadout"
                            >
                              {isSelected ? '✓ Active' : '⚙ Load'}
                            </button>
                          </div>
                        </div>

                        {/* Visual summary of the saved state */}
                        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-[9px] font-mono text-zinc-400 bg-zinc-950/50 px-2.5 py-1.5 rounded border border-zinc-900/60">
                          {/* Visor preview */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-500 uppercase text-[8px]">Visor:</span>
                            <div className="flex items-center gap-1">
                              <span className="w-2.5 h-2.5 rounded-full border border-zinc-800" style={{ backgroundColor: loadout.visorColor }} />
                              <span className="text-zinc-300 font-bold max-w-[65px] truncate">{visorInfo.name}</span>
                            </div>
                          </div>
                          
                          {/* Weapon type */}
                          <div className="flex items-center gap-1.5 border-l border-zinc-850 pl-3">
                            <span className="text-zinc-500 uppercase text-[8px]">Wpn:</span>
                            <span className="text-amber-400 font-bold">{weaponName}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-5 font-mono">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                <Cpu size={14} className="text-[#F27D26]" />
                <h2 className="text-xs font-bold tracking-wider uppercase text-zinc-400">HARDWARE OPTIMIZER</h2>
              </div>

              {/* Status Indicator Panel */}
              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded relative overflow-hidden">
                <div className="absolute top-0 right-0 px-2 py-0.5 bg-zinc-800 text-[8px] font-bold tracking-wider text-zinc-400 rounded-bl border-l border-b border-zinc-700">
                  SYS_CONF
                </div>
                
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Active Graphics Protocol</span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-sm font-extrabold tracking-wider uppercase ${
                    selectedQuality === 'high' ? 'text-cyan-400' :
                    selectedQuality === 'balanced' ? 'text-amber-400' : 'text-zinc-400'
                  }`}>
                    {selectedQuality} Quality
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {(['low', 'balanced', 'high'] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setSelectedQuality(q);
                        localStorage.setItem('cyber_runner_graphics_quality', q);
                        playUISfx('click');
                      }}
                      className={`py-1.5 px-1 border rounded text-[9px] font-bold uppercase text-center transition cursor-pointer ${
                        selectedQuality === q
                          ? q === 'high' ? 'border-cyan-500 bg-cyan-950/20 text-cyan-300' :
                            q === 'balanced' ? 'border-amber-500 bg-amber-950/20 text-amber-300' :
                            'border-zinc-500 bg-zinc-800/40 text-zinc-300'
                          : 'border-zinc-800 bg-zinc-950/40 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hardware Device Profile */}
              <div className="p-3 bg-zinc-950 border border-zinc-900 rounded space-y-1 text-[9px]">
                <div className="text-zinc-500 uppercase tracking-wider mb-1 font-bold">DEVICE_SIGNATURE:</div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">BROWSER_ENV:</span>
                  <span className="text-zinc-300 font-bold truncate max-w-[180px]">{navigator.userAgent.split(' ')[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">CPU_THREADS:</span>
                  <span className="text-zinc-300 font-bold">{navigator.hardwareConcurrency || 'UNKNOWN'} UNITS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">GPU_VENDOR:</span>
                  <span className="text-[#F27D26] font-bold truncate max-w-[180px]">{webglInfo.vendor || 'STANDARD_DRIVER'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">RENDERER:</span>
                  <span className="text-[#F27D26] font-bold truncate max-w-[180px]">{webglInfo.renderer || 'GPU RASTERIZER'}</span>
                </div>
              </div>

              {/* Real-time terminal diagnostic logs */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Calibration Terminal logs</span>
                <div className="h-32 bg-black border border-zinc-900 rounded p-2.5 overflow-y-auto font-mono text-[9px] space-y-1">
                  {calibrationLog.length === 0 ? (
                    <div className="text-zinc-600 italic">Core diagnostic idle. Awaiting neural link...</div>
                  ) : (
                    calibrationLog.map((log, index) => (
                      <div 
                        key={index} 
                        className={`${
                          log.startsWith('✔') ? 'text-emerald-400 font-bold' :
                          log.startsWith('★') ? 'text-cyan-400 font-extrabold' :
                          log.startsWith('⚡') || log.startsWith('☇') ? 'text-[#F27D26]' : 'text-zinc-400'
                        }`}
                      >
                        {log}
                      </div>
                    ))
                  )}
                  {/* Anchor for automatic scroll */}
                  <div ref={logEndRef} />
                </div>
              </div>

              {/* Diagnostic Progress bar */}
              {calibrationState !== 'idle' && calibrationState !== 'completed' && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[8px] text-zinc-500 uppercase font-bold tracking-widest">
                    <span>Interrogating core hardware...</span>
                    <span>{
                      calibrationState === 'testing_webgl' ? '25%' :
                      calibrationState === 'testing_cpu' ? '50%' :
                      calibrationState === 'testing_latency' ? '75%' : '0%'
                    }</span>
                  </div>
                  <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden border border-zinc-850">
                    <motion.div 
                      className="h-full bg-[#F27D26]" 
                      initial={{ width: '0%' }}
                      animate={{ 
                        width: 
                          calibrationState === 'testing_webgl' ? '25%' :
                          calibrationState === 'testing_cpu' ? '50%' :
                          calibrationState === 'testing_latency' ? '75%' : '0%'
                      }}
                      transition={{ ease: 'easeInOut', duration: 0.3 }}
                    />
                  </div>
                </div>
              )}

              {/* Run Test Button */}
              <button
                onClick={runDiagnostics}
                disabled={calibrationState !== 'idle' && calibrationState !== 'completed'}
                className={`w-full py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-bold tracking-widest uppercase rounded flex items-center justify-center gap-2 transition cursor-pointer ${
                  (calibrationState !== 'idle' && calibrationState !== 'completed') ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                <Cpu size={12} className="text-[#F27D26]" />
                {calibrationState === 'idle' ? 'Run Hardware Calibration' :
                 calibrationState === 'completed' ? 'Recalibrate Hardware' : 'Calibrating...'}
              </button>
            </div>
          )}
        </div>

        {/* Launch Button Action */}
        <div className="p-5 border-t border-zinc-850 bg-black/50 space-y-2">
          <button
            onClick={() => {
              playUISfx('launch');
              onStartGame(gear);
            }}
            className="w-full py-2.5 bg-gradient-to-r from-orange-600 to-[#F27D26] hover:from-orange-500 hover:to-orange-600 border border-orange-500 hover:border-orange-400 text-white font-bold font-mono text-xs tracking-wider uppercase rounded shadow-lg flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(242,125,38,0.45)] transition cursor-pointer"
          >
            <Play size={14} fill="currentColor" />
            Launch Runner Mission
            <ChevronRight size={14} />
          </button>

          {onStartRailExtraction && (
            <button
              onClick={() => {
                playUISfx('boot');
                onStartRailExtraction();
              }}
              className="w-full py-2 bg-gradient-to-r from-pink-950 to-rose-800 hover:from-pink-900 hover:to-rose-700 border border-pink-500/40 hover:border-pink-400 text-pink-100 hover:text-white font-bold font-mono text-[11px] tracking-widest uppercase rounded shadow-md flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(244,63,94,0.35)] transition cursor-pointer"
            >
              <Radio size={13} className="animate-pulse text-pink-400" />
              Tactical Rail Extraction
              <ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>

      {/* RIGHT: Immersive 3D Viewer Area */}
      <div className="flex-1 relative flex flex-col min-h-0">
        {/* Hologram visualizer grid overlay */}
        <div className="absolute inset-0 z-0 bg-radial-gradient from-transparent to-[#030712] opacity-80 pointer-events-none" />
        
        {/* Babylon 3D Canvas */}
        <canvas ref={canvasRef} className="w-full h-full outline-none z-0" />

        {/* Neural Input Tester Overlay */}
        {animationMode === 'JOGGING' && (
          <div className="absolute top-5 left-5 z-20 pointer-events-none font-mono flex flex-col gap-2 max-w-xs md:max-w-md bg-black/85 border border-zinc-800/80 p-4 rounded-lg backdrop-blur-md shadow-2xl">
            <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-2 mb-1">
              <Cpu size={14} className="text-[#F27D26] animate-pulse" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">NEURAL INPUT REGISTER</span>
            </div>
            
            <div className="text-[10px] text-zinc-400 leading-relaxed mb-2">
              Press movement and action keybinds to stream telemetry and test skeletal animation clips.
            </div>

            {/* Simulated Live Diagnostic Metrics */}
            <div className="grid grid-cols-2 gap-2 text-[9px] mb-3 bg-zinc-950 p-2.5 rounded border border-zinc-900">
              <div>
                <span className="text-zinc-500">INPUT DEVICE:</span>
                <span className="text-emerald-400 block font-bold">KEYBOARD/MOUSE</span>
              </div>
              <div>
                <span className="text-zinc-500">RESPONSE LATENCY:</span>
                <span className="text-cyan-400 block font-bold">1.2ms (STABLE)</span>
              </div>
              <div>
                <span className="text-zinc-500">ACTIVE CLIP:</span>
                <span className="text-[#F27D26] block font-extrabold truncate">{testActionName || 'cst-ert-jog-fwd-a (LOOP)'}</span>
              </div>
              <div>
                <span className="text-zinc-500">KEY REGISTERED:</span>
                <span className="text-white block font-black">{testKeyPressed || 'NONE (IDLE)'}</span>
              </div>
            </div>

            {/* Interactive Visual Controller Buttons Map */}
            <div className="flex flex-col gap-1 text-[9px] text-zinc-400">
              <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Controller Keymap Diagnostic</span>
              
              <div className="flex gap-3 items-center justify-center py-1">
                {/* Visual D-Pad/WASD representation */}
                <div className="grid grid-cols-3 gap-1 w-24">
                  <div />
                  <div className={`h-7 rounded border font-bold flex items-center justify-center transition-all duration-75 ${
                    ['W', 'ARROWUP'].includes(testKeyPressed || '') 
                      ? 'bg-[#F27D26] text-black border-[#F27D26] scale-95 shadow-[0_0_10px_rgba(242,125,38,0.5)]' 
                      : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                  }`} title="Jump action">W</div>
                  <div />
                  <div className={`h-7 rounded border font-bold flex items-center justify-center transition-all duration-75 ${
                    ['A', 'ARROWLEFT'].includes(testKeyPressed || '') 
                      ? 'bg-[#F27D26] text-black border-[#F27D26] scale-95 shadow-[0_0_10px_rgba(242,125,38,0.5)]' 
                      : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                  }`} title="Lane Left action">A</div>
                  <div className={`h-7 rounded border font-bold flex items-center justify-center transition-all duration-75 ${
                    ['S', 'ARROWDOWN'].includes(testKeyPressed || '') 
                      ? 'bg-[#F27D26] text-black border-[#F27D26] scale-95 shadow-[0_0_10px_rgba(242,125,38,0.5)]' 
                      : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                  }`} title="Slide action">S</div>
                  <div className={`h-7 rounded border font-bold flex items-center justify-center transition-all duration-75 ${
                    ['D', 'ARROWRIGHT'].includes(testKeyPressed || '') 
                      ? 'bg-[#F27D26] text-black border-[#F27D26] scale-95 shadow-[0_0_10px_rgba(242,125,38,0.5)]' 
                      : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                  }`} title="Lane Right action">D</div>
                </div>

                <div className="flex flex-col gap-1 flex-1">
                  {/* Space bar */}
                  <div className={`h-6 rounded border font-mono font-bold flex items-center justify-center transition-all duration-75 ${
                    testKeyPressed === 'SPACE' 
                      ? 'bg-[#F27D26] text-black border-[#F27D26] scale-95 shadow-[0_0_10px_rgba(242,125,38,0.5)]' 
                      : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                  }`} title="Jump spacebar">SPACEBAR (JUMP)</div>
                  
                  {/* Action key combinations */}
                  <div className="grid grid-cols-2 gap-1">
                    <div className={`h-5 rounded border font-bold flex items-center justify-center transition-all duration-75 ${
                      ['Q', 'R'].includes(testKeyPressed || '') 
                        ? 'bg-[#F27D26] text-black border-[#F27D26] scale-95 shadow-[0_0_10px_rgba(242,125,38,0.5)]' 
                        : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                    }`} title="Pivot/Stagger scan key">Q / R</div>
                    <div className={`h-5 rounded border font-bold flex items-center justify-center transition-all duration-75 ${
                      ['F', 'E'].includes(testKeyPressed || '') 
                        ? 'bg-[#F27D26] text-black border-[#F27D26] scale-95 shadow-[0_0_10px_rgba(242,125,38,0.5)]' 
                        : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                    }`} title="Weapon key">F / E</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3D Action HUD / Mode Control Buttons */}
        <div className="absolute bottom-5 left-5 right-5 z-20 flex flex-col md:flex-row gap-3 justify-between items-center pointer-events-auto">
          {/* Active animation selection */}
          <div className="bg-black/80 border border-zinc-800/80 p-2 rounded flex gap-1.5 backdrop-blur-md">
            <button
              onClick={() => {
                setAnimationMode('IDLE');
                playUISfx('click');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded text-[10px] font-bold font-mono uppercase tracking-wider transition ${
                animationMode === 'IDLE' 
                  ? 'bg-[#F27D26] text-black border-[#F27D26]' 
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850'
              }`}
            >
              <Compass size={11} />
              Idle Stance
            </button>
            <button
              onClick={() => {
                setAnimationMode('JOGGING');
                playUISfx('click');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded text-[10px] font-bold font-mono uppercase tracking-wider transition ${
                animationMode === 'JOGGING' 
                  ? 'bg-[#F27D26] text-black border-[#F27D26]' 
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850'
              }`}
            >
              <RefreshCw size={11} className={animationMode === 'JOGGING' ? 'animate-spin' : ''} />
              Jog Test Cycle
            </button>
          </div>

          {/* Model detection feedback */}
          <div className="px-3 py-2 bg-black/80 border border-zinc-800/80 rounded flex items-center gap-2 backdrop-blur-md">
            <Eye size={12} className="text-[#F27D26] animate-pulse" />
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              Asset Source: <span className="text-white font-bold font-mono">{animationMode === 'IDLE' ? '/public/idle.glb' : '/public/jog-fwd.glb'}</span>
            </span>
          </div>
        </div>

        {/* Technical crosshair and decorations */}
        <div className="absolute inset-x-12 top-12 bottom-24 border border-cyan-500/10 pointer-events-none flex items-center justify-center">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#F27D26]/40" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#F27D26]/40" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#F27D26]/40" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#F27D26]/40" />
        </div>
      </div>

      {/* Daily Mission Completion Overlay Popup */}
      <AnimatePresence>
        {completedNotification?.show && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/85 flex items-center justify-center p-6 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-zinc-950 border border-emerald-500/30 p-6 rounded-lg text-center shadow-[0_0_50px_rgba(16,185,129,0.15)] relative overflow-hidden"
            >
              {/* Decorative scanline and glows */}
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-pulse" />
              
              <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center animate-bounce">
                <Sparkles className="text-emerald-400 w-8 h-8" />
              </div>

              <h2 className="text-lg font-bold tracking-widest font-mono text-emerald-400 uppercase mb-1">
                CHALLENGE MET
              </h2>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-4">
                TACTICAL_MISSION_COMPLETED
              </p>

              <div className="bg-zinc-900/60 border border-zinc-850 p-4 rounded mb-5 text-left space-y-2.5">
                <div>
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider block font-bold">Challenge Objective</span>
                  <span className="text-xs font-mono text-zinc-300">{completedNotification.description}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-zinc-800/80">
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider block font-bold">Your Performance</span>
                    <span className="text-xs font-mono font-bold text-emerald-400 uppercase">
                      {completedNotification.valueAchieved} {completedNotification.metricLabel}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider block font-bold">Unlocked Reward</span>
                    <span 
                      className="text-xs font-mono font-bold tracking-wide uppercase px-2 py-0.5 rounded border border-current bg-current/5"
                      style={{ color: completedNotification.rewardColor }}
                    >
                      {completedNotification.rewardName}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-zinc-400 mb-6 font-mono leading-relaxed">
                The new cybernetic visor tint has been loaded into your active tactical loadout. Select it on your pilot helmet.
              </p>

              <button
                onClick={() => {
                  playUISfx('click');
                  setCompletedNotification(null);
                }}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-[#10B981] hover:from-emerald-500 hover:to-emerald-600 border border-emerald-500 text-white font-bold font-mono text-xs uppercase tracking-wider rounded transition cursor-pointer shadow-md hover:shadow-[0_0_15px_rgba(16,185,129,0.35)]"
              >
                Sync Loadout and Dismiss
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
