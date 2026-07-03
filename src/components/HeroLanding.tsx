import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, ShieldAlert, Cpu, Terminal, Radio, Volume2, VolumeX, 
  Sparkles, AlertCircle, Database, ChevronRight, Upload, Sliders, 
  RefreshCw, CheckCircle, HelpCircle, HardDrive, Zap, Info, Eye
} from 'lucide-react';
import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  PointLight,
  Color3,
  StandardMaterial,
  CreateSphere,
  CreateBox,
  CreateCylinder,
  TransformNode,
  SceneLoader,
  Mesh
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

interface HeroLandingProps {
  onEnterLounge: () => void;
}

export default function HeroLanding({ onEnterLounge }: HeroLandingProps) {
  const [activeTab, setActiveTab] = useState<'HERO_VISUAL' | 'CHASSIS' | 'HMI_HEAD'>('HERO_VISUAL'); // Default starts on Hero Visual Concept
  const [isBooted, setIsBooted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionProgress, setConnectionProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  
  // Terminal logs state
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  // --- HMI HEAD NODE NEURAL SYNC STATES ---
  const [gltfModelUrl, setGltfModelUrl] = useState('');
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);
  const [modelLoadedSuccess, setModelLoadedSuccess] = useState(false);
  
  // Morph targets / skeletal controller states
  const [jawArticulation, setJawArticulation] = useState(0.0); // 0 to 1
  const [browElevation, setBrowElevation] = useState(0.0); // 0 to 1
  const [ocularCompression, setOcularCompression] = useState(0.0); // 0 to 1
  const [labialCornerPull, setLabialCornerPull] = useState(0.0); // 0 to 1
  const [cheekResonation, setCheekResonation] = useState(0.0); // 0 to 1
  const [neuralOverdrive, setNeuralOverdrive] = useState(false);
  const [neuralFrequency, setNeuralFrequency] = useState(2.5); // Hz

  // 3D HMI Head Canvas refs
  const hmiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hmiEngineRef = useRef<Engine | null>(null);
  const hmiSceneRef = useRef<Scene | null>(null);

  // References to Babylon.js nodes for face morph skeletal rigging
  const hmiNodesRef = useRef<{
    headRoot?: TransformNode;
    jawMesh?: Mesh;
    leftBrow?: Mesh;
    rightBrow?: Mesh;
    leftEye?: Mesh;
    rightEye?: Mesh;
    leftLip?: Mesh;
    rightLip?: Mesh;
    leftCheek?: Mesh;
    rightCheek?: Mesh;
    gltfHeadMesh?: any;
  }>({});

  // Tone synth helper
  const playBeep = (freq: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.08) => {
    if (isMuted) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio synthesis failed:', e);
    }
  };

  const playMorphSfx = () => {
    // Elegant micro click-synth for morph adjustment
    playBeep(1200 + Math.random() * 800, 0.04, 'sine', 0.02);
  };

  // Live Terminal logs generator
  const logTemplates = [
    'HMI_NODE: Neural synchronization frequency stabilizing...',
    'HMI_NODE: Decrypting Face Morph Rig Skeletons... SUCCESS',
    'SYS_CHECK: NEURAL_LINK_STABILIZER... ONLINE',
    'SYS_CHECK: REACTOR_RESERVE_CAPACITY... 100% (STABLE)',
    'NET_CHECK: PROTOCOL_CST_ERT_LINK... SECURE [WSS://SECURE-GATE]',
    'PILOT_SYNC: SYNAPTIC_VOLTAGE... 420mV [STABLE]',
    'LOAD_ASSETS: HMI Head Node skeleton maps loaded.',
    'WARNING: Cybernetic morph override active. Overdrive frequency standard.',
    'HMI_RIG: Lip-corner, Brow-elevate, Ocular-compress registers verified.'
  ];

  useEffect(() => {
    // Initial logs
    setTerminalLogs([
      '>> COGNITIVE SYNC PORTAL DETECTED...',
      '>> ESTABLISHING BIO-SYNAPSE DECRYPT CHANNELS...',
      '>> HMI HEAD NODE RIGGING CONTROLLERS... STANDBY',
      '>> ARCHIVUM OVERRIDE ACTIVE // WSS LINK STABLE',
    ]);

    const interval = setInterval(() => {
      const randomLog = logTemplates[Math.floor(Math.random() * logTemplates.length)];
      const timestamp = new Date().toLocaleTimeString();
      setTerminalLogs(prev => [...prev.slice(-30), `[${timestamp}] ${randomLog}`]);
      if (Math.random() > 0.7) {
        playBeep(2000, 0.03, 'sine', 0.01);
      }
    }, 2000);

    const bootTimer = setTimeout(() => {
      setIsBooted(true);
      setActiveTab('HERO_VISUAL'); // Set HERO_VISUAL as initial active focus!
      playBeep(900, 0.4, 'triangle', 0.05);
    }, 1200);

    return () => {
      clearInterval(interval);
      clearTimeout(bootTimer);
    };
  }, [isMuted]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  // --- BABYLON.JS HMI HEAD RIG INITIALIZATION ---
  useEffect(() => {
    if (!isBooted || activeTab !== 'HMI_HEAD' || !hmiCanvasRef.current) return;

    // Create Engine and Scene
    const engine = new Engine(hmiCanvasRef.current, true);
    hmiEngineRef.current = engine;

    const scene = new Scene(engine);
    scene.clearColor = new Color3(0.01, 0.03, 0.08).toColor4(1.0);
    hmiSceneRef.current = scene;

    // Camera focused on head
    const camera = new ArcRotateCamera(
      'hmiCamera',
      -Math.PI / 2,
      Math.PI / 2.2,
      6,
      new Vector3(0, 0, 0),
      scene
    );
    camera.attachControl(hmiCanvasRef.current, true);
    camera.lowerRadiusLimit = 3;
    camera.upperRadiusLimit = 12;

    // Lights
    const light1 = new HemisphericLight('hmiHemi', new Vector3(0, 1, 0), scene);
    light1.intensity = 0.65;
    light1.groundColor = new Color3(0.1, 0.15, 0.3);

    const redGlowLight = new PointLight('hmiRedPoint', new Vector3(-2, 1, -2), scene);
    redGlowLight.diffuse = new Color3(0.9, 0.1, 0.1);
    redGlowLight.intensity = 0.5;

    const cyanGlowLight = new PointLight('hmiCyanPoint', new Vector3(2, -1, 2), scene);
    cyanGlowLight.diffuse = new Color3(0.0, 0.8, 1.0);
    cyanGlowLight.intensity = 0.8;

    // Create Procedural articulated Cyber-Head model
    const headRoot = new TransformNode('headRoot', scene);
    hmiNodesRef.current.headRoot = headRoot;

    // Metallic head material
    const matMetal = new StandardMaterial('matMetal', scene);
    matMetal.diffuseColor = new Color3(0.15, 0.25, 0.4);
    matMetal.specularColor = new Color3(0.8, 1.0, 1.0);
    matMetal.emissiveColor = new Color3(0.02, 0.05, 0.15);

    // Cyan glowing element material
    const matCyanGlow = new StandardMaterial('matCyanGlow', scene);
    matCyanGlow.emissiveColor = new Color3(0.0, 0.9, 1.0);
    matCyanGlow.diffuseColor = new Color3(0.0, 0.4, 0.5);

    // Glowing eyeball material
    const matEyeGlow = new StandardMaterial('matEyeGlow', scene);
    matEyeGlow.emissiveColor = new Color3(1.0, 0.3, 0.0); // Orange visor flare
    matEyeGlow.diffuseColor = new Color3(0.8, 0.2, 0.0);

    // 1. Skull mesh (ovoid cylinder/sphere hybrid)
    const mainSkull = CreateSphere('mainSkull', { diameterX: 1.8, diameterY: 2.3, diameterZ: 1.8 }, scene);
    mainSkull.parent = headRoot;
    mainSkull.material = matMetal;

    // Cyber panel lines on skull
    const cyberBand = CreateCylinder('cyberBand', { height: 0.1, diameter: 1.9 }, scene);
    cyberBand.parent = headRoot;
    cyberBand.rotation.x = Math.PI / 2;
    cyberBand.material = matCyanGlow;

    // 2. Articulated Jaw (Joint rigged to parent headRoot)
    const jawMesh = CreateBox('jawMesh', { width: 1.2, height: 0.7, depth: 1.3 }, scene);
    jawMesh.parent = headRoot;
    // Pivot joint offset so it rotates around the TMJ (back-ear) joint
    jawMesh.position = new Vector3(0, -1.2, 0.2);
    jawMesh.material = matMetal;
    hmiNodesRef.current.jawMesh = jawMesh;

    // 3. Cyber brows (Left/Right box plates)
    const leftBrow = CreateBox('leftBrow', { width: 0.6, height: 0.15, depth: 0.4 }, scene);
    leftBrow.parent = headRoot;
    leftBrow.position = new Vector3(-0.45, 0.45, -0.85);
    leftBrow.rotation.z = -0.1;
    leftBrow.material = matCyanGlow;
    hmiNodesRef.current.leftBrow = leftBrow;

    const rightBrow = CreateBox('rightBrow', { width: 0.6, height: 0.15, depth: 0.4 }, scene);
    rightBrow.parent = headRoot;
    rightBrow.position = new Vector3(0.45, 0.45, -0.85);
    rightBrow.rotation.z = 0.1;
    rightBrow.material = matCyanGlow;
    hmiNodesRef.current.rightBrow = rightBrow;

    // 4. Glowing visor eyeball cylinders
    const leftEye = CreateSphere('leftEye', { diameterX: 0.35, diameterY: 0.15, diameterZ: 0.35 }, scene);
    leftEye.parent = headRoot;
    leftEye.position = new Vector3(-0.45, 0.15, -0.85);
    leftEye.material = matEyeGlow;
    hmiNodesRef.current.leftEye = leftEye;

    const rightEye = CreateSphere('rightEye', { diameterX: 0.35, diameterY: 0.15, diameterZ: 0.35 }, scene);
    rightEye.parent = headRoot;
    rightEye.position = new Vector3(0.45, 0.15, -0.85);
    rightEye.material = matEyeGlow;
    hmiNodesRef.current.rightEye = rightEye;

    // 5. Lip corner spheres (Custom somatic mesh markers for smile morph)
    const leftLip = CreateSphere('leftLip', { diameter: 0.12 }, scene);
    leftLip.parent = headRoot;
    leftLip.position = new Vector3(-0.35, -0.6, -0.85);
    leftLip.material = matCyanGlow;
    hmiNodesRef.current.leftLip = leftLip;

    const rightLip = CreateSphere('rightLip', { diameter: 0.12 }, scene);
    rightLip.parent = headRoot;
    rightLip.position = new Vector3(0.35, -0.6, -0.85);
    rightLip.material = matCyanGlow;
    hmiNodesRef.current.rightLip = rightLip;

    // Mouth backing plate
    const mouthMesh = CreateBox('mouthMesh', { width: 0.8, height: 0.15, depth: 0.1 }, scene);
    mouthMesh.parent = headRoot;
    mouthMesh.position = new Vector3(0, -0.6, -0.82);
    mouthMesh.material = matMetal;

    // 6. Cheek Resonation Cylinders (Puff elements)
    const leftCheek = CreateCylinder('leftCheek', { height: 0.2, diameter: 0.6 }, scene);
    leftCheek.parent = headRoot;
    leftCheek.position = new Vector3(-0.85, -0.2, -0.4);
    leftCheek.rotation.z = Math.PI / 2;
    leftCheek.material = matMetal;
    hmiNodesRef.current.leftCheek = leftCheek;

    const rightCheek = CreateCylinder('rightCheek', { height: 0.2, diameter: 0.6 }, scene);
    rightCheek.parent = headRoot;
    rightCheek.position = new Vector3(0.85, -0.2, -0.4);
    rightCheek.rotation.z = Math.PI / 2;
    rightCheek.material = matMetal;
    hmiNodesRef.current.rightCheek = rightCheek;

    // Start render loop
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
  }, [isBooted, activeTab]);

  // Apply slider positions to HMI rig joints
  useEffect(() => {
    const nodes = hmiNodesRef.current;
    if (!nodes.headRoot) return;

    // 1. Jaw opens downward and rotates slightly forward
    if (nodes.jawMesh) {
      nodes.jawMesh.position.y = -1.2 - jawArticulation * 0.35;
      nodes.jawMesh.rotation.x = jawArticulation * 0.25;
    }

    // 2. Brows raise upward
    if (nodes.leftBrow && nodes.rightBrow) {
      nodes.leftBrow.position.y = 0.45 + browElevation * 0.25;
      nodes.rightBrow.position.y = 0.45 + browElevation * 0.25;
    }

    // 3. Eyes compress (visor scale down horizontally/vertically)
    if (nodes.leftEye && nodes.rightEye) {
      nodes.leftEye.scaling.y = 1.0 - ocularCompression * 0.8;
      nodes.rightEye.scaling.y = 1.0 - ocularCompression * 0.8;
    }

    // 4. Labial pull (smile corners stretch outwards and slightly upwards)
    if (nodes.leftLip && nodes.rightLip) {
      nodes.leftLip.position.x = -0.35 - labialCornerPull * 0.2;
      nodes.leftLip.position.y = -0.6 + labialCornerPull * 0.15;
      
      nodes.rightLip.position.x = 0.35 + labialCornerPull * 0.2;
      nodes.rightLip.position.y = -0.6 + labialCornerPull * 0.15;
    }

    // 5. Cheek resonation expands lateral cheeks
    if (nodes.leftCheek && nodes.rightCheek) {
      nodes.leftCheek.scaling.y = 1.0 + cheekResonation * 0.45;
      nodes.rightCheek.scaling.y = 1.0 + cheekResonation * 0.45;
    }
  }, [jawArticulation, browElevation, ocularCompression, labialCornerPull, cheekResonation]);

  // Neural Overdrive automated oscillation loop
  useEffect(() => {
    if (!neuralOverdrive) return;

    let startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const wave = Math.sin(elapsed * neuralFrequency * 2 * Math.PI) * 0.5 + 0.5;
      const cosWave = Math.cos(elapsed * neuralFrequency * 1.5 * Math.PI) * 0.5 + 0.5;

      setJawArticulation(wave);
      setBrowElevation(cosWave);
      setOcularCompression(1.0 - wave);
      setLabialCornerPull(wave);
      setCheekResonation(cosWave);

      if (Math.random() > 0.8) {
        // High frequency synch tone
        playBeep(1500 + wave * 500, 0.02, 'sine', 0.015);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [neuralOverdrive, neuralFrequency]);

  // Load custom GLTF Model URLs in HMI head node
  const handleLoadCustomGltf = () => {
    if (!gltfModelUrl.trim() || !hmiSceneRef.current) return;
    setIsModelLoading(true);
    setModelLoadError(null);
    setModelLoadedSuccess(false);

    const scene = hmiSceneRef.current;
    
    // Play sci-fi downloading hum
    playBeep(220, 1.0, 'sawtooth', 0.06);

    // Dispose previous loaded mesh if any
    if (hmiNodesRef.current.gltfHeadMesh) {
      hmiNodesRef.current.gltfHeadMesh.dispose();
      hmiNodesRef.current.gltfHeadMesh = null;
    }

    SceneLoader.ImportMeshAsync('', '', gltfModelUrl, scene)
      .then((result) => {
        setIsModelLoading(false);
        setModelLoadedSuccess(true);
        playBeep(880, 0.5, 'sine', 0.05);

        const loadedRoot = result.meshes[0];
        hmiNodesRef.current.gltfHeadMesh = loadedRoot;

        // Position & Scale the loaded GLTF model elegantly to fit HMI focus
        loadedRoot.position = Vector3.Zero();
        loadedRoot.scaling = new Vector3(1.2, 1.2, 1.2);

        // Turn off procedural head components visibility if a gltf is loaded
        if (hmiNodesRef.current.headRoot) {
          hmiNodesRef.current.headRoot.setEnabled(false);
        }

        // Search for Morph Targets on loaded mesh
        let foundMorphsCount = 0;
        result.meshes.forEach((mesh: any) => {
          if (mesh.morphTargetManager) {
            foundMorphsCount += mesh.morphTargetManager.numTargets;
          }
        });

        const logMsg = `HMI_NODE: Loaded model with ${result.meshes.length} meshes and ${foundMorphsCount} morph targets successfully.`;
        setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${logMsg}`]);
      })
      .catch((err) => {
        setIsModelLoading(false);
        setModelLoadError('Failed to resolve or parse GLTF path. Reverting to core HMI procedural head rig.');
        playBeep(300, 0.5, 'sawtooth', 0.05);
        
        // Re-enable procedural rig
        if (hmiNodesRef.current.headRoot) {
          hmiNodesRef.current.headRoot.setEnabled(true);
        }
      });
  };

  const handleStartConnection = () => {
    if (isConnecting) return;
    setIsConnecting(true);
    setConnectionProgress(0);

    // Multi-tonal sound sweeps
    playBeep(330, 0.8, 'sawtooth', 0.04);
    setTimeout(() => playBeep(660, 0.8, 'sine', 0.05), 400);

    const interval = setInterval(() => {
      setConnectionProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          playBeep(1200, 0.6, 'sine', 0.08);
          setTimeout(() => {
            onEnterLounge();
          }, 300);
          return 100;
        }
        
        if (Math.random() > 0.4) {
          playBeep(400 + prev * 7, 0.04, 'triangle', 0.02);
        }
        
        return prev + Math.floor(Math.random() * 8) + 4;
      });
    }, 100);
  };

  return (
    <div className="relative w-full h-full bg-[#020612] text-white flex flex-col justify-between overflow-hidden p-3 md:p-6 select-none font-sans">
      
      {/* Immersive background from ChatGPT Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-25 pointer-events-none z-0 mix-blend-screen transition-all duration-700"
        style={{
          backgroundImage: "url('/chatgpt_hero.png')",
        }}
      />
      {/* Dark modern overlay gradients to ensure deep contrast and text legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#020612]/95 via-[#020612]/75 to-[#020612]/95 pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#020612_95%)] pointer-events-none z-0" />

      {/* Background Neon Grid & Particle sweeps */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.1)_0%,transparent_75%)] pointer-events-none z-0" />
      <div 
        className="absolute inset-0 opacity-5 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(6, 182, 212, 0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(6, 182, 212, 0.06) 1px, transparent 1px)
          `,
          backgroundSize: '25px 25px'
        }}
      />

      {/* HEADER SECTION */}
      <header className="relative z-10 flex items-center justify-between border-b border-cyan-950/40 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 border border-cyan-500/40 rounded flex items-center justify-center bg-cyan-950/20 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
            <Cpu className="text-cyan-400 w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xs font-bold tracking-widest font-mono text-cyan-400 uppercase flex items-center gap-2">
              COGNITIVE SYNC PORTAL <span className="text-[9px] bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded">HMI_NODE</span>
            </h1>
            <p className="text-[8px] text-zinc-500 font-mono tracking-widest uppercase">CST-ERT SYSTEMS INTEGRITY: NOMINAL</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setIsMuted(!isMuted);
              playBeep(600, 0.1, 'sine', 0.04);
            }} 
            className="p-1.5 border border-zinc-800 rounded bg-zinc-950/40 hover:bg-zinc-900/60 transition text-zinc-400 hover:text-cyan-400 cursor-pointer"
            title="Toggle SFX Synth"
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          
          <div className="hidden sm:flex flex-col items-end font-mono text-[8px] text-zinc-500">
            <span>RAD_STATION // SEC.09</span>
            <span className="text-cyan-400/80 animate-pulse">GRID_LINK_STANDBY</span>
          </div>
        </div>
      </header>

      {/* COMPOSITE DASHBOARD BODY */}
      <main className="relative flex-1 flex flex-col lg:flex-row items-center justify-between py-4 gap-4 z-10 min-h-0 overflow-hidden">
        
        {/* LEFT COLUMN: DIAGNOSTICS & LOG DETAILS */}
        <div className="w-full lg:w-[24%] flex flex-col justify-between space-y-4 self-stretch min-h-0">
          
          {/* Diagnostic overview status */}
          <div className="border border-zinc-900 bg-zinc-950/30 p-3 rounded-lg relative backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-6 h-[1px] bg-cyan-500" />
            <div className="absolute top-0 left-0 w-[1px] h-6 bg-cyan-500" />
            
            <h3 className="text-[9px] font-mono tracking-widest text-zinc-400 uppercase mb-2 border-b border-zinc-900 pb-1.5 flex items-center gap-1">
              <Zap size={11} className="text-cyan-400" /> HMI Synaptic Links
            </h3>

            <div className="space-y-2 text-[10px] font-mono text-zinc-300">
              <div className="flex justify-between border-b border-zinc-900/40 pb-1">
                <span className="text-zinc-500">RIG_SKELETONS</span>
                <span className="text-cyan-400">5 CONTROLLERS</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900/40 pb-1">
                <span className="text-zinc-500">MORPH_MATRIX</span>
                <span className="text-green-400">ACTIVE [3D]</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900/40 pb-1">
                <span className="text-zinc-500">GLTF_LOADER</span>
                <span className="text-cyan-400">HMI HEAD NODE</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-zinc-500">VOLTAGE_SYNC</span>
                <span className="text-cyan-400">420 mV</span>
              </div>
            </div>
          </div>

          {/* TELEMETRY RADAR DISPLAY */}
          <div className="border border-zinc-900 bg-zinc-950/30 p-3 rounded-lg relative backdrop-blur-sm flex-1 flex flex-col justify-center">
            <div className="relative w-32 h-32 mx-auto rounded-full border border-cyan-950/40 flex items-center justify-center bg-cyan-950/5">
              <div className="absolute inset-0 rounded-full bg-conic-sweep opacity-10 animate-[spin_8s_linear_infinite]" 
                style={{ backgroundImage: 'conic-gradient(from 0deg, transparent 50%, rgba(6,182,212,0.3) 100%)' }}
              />
              <div className="w-[80%] h-[80%] rounded-full border border-dashed border-cyan-500/20" />
              <div className="w-[50%] h-[50%] rounded-full border border-cyan-500/30 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
              </div>
              <span className="absolute bottom-2 text-[7px] text-cyan-400/60 font-mono tracking-widest">WSS_SYNCH</span>
            </div>
          </div>

        </div>

        {/* MIDDLE COLUMN: INTUITIVE 3D RENDER STAGE (CHASSIS VS HMI HEAD SELECTOR) */}
        <div className="flex-1 flex flex-col items-center self-stretch justify-between relative bg-zinc-950/20 border border-zinc-900/50 rounded-lg p-3 min-h-0">
          
          {/* HIGH-TECH SELECTION TABS AT TOP OF RENDER VIEW */}
          <div className="flex items-center gap-2 border-b border-zinc-900/60 pb-2 w-full justify-center z-20">
            <button 
              onClick={() => {
                setActiveTab('HERO_VISUAL');
                playBeep(450, 0.1, 'sine', 0.04);
              }}
              className={`px-3 py-1 font-mono text-[9px] tracking-widest uppercase border rounded transition cursor-pointer ${
                activeTab === 'HERO_VISUAL' 
                  ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                  : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              [ HERO VISUAL ]
            </button>
            <button 
              onClick={() => {
                setActiveTab('CHASSIS');
                playBeep(500, 0.1, 'sine', 0.04);
              }}
              className={`px-3 py-1 font-mono text-[9px] tracking-widest uppercase border rounded transition cursor-pointer ${
                activeTab === 'CHASSIS' 
                  ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                  : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              [ SENTINEL CHASSIS ]
            </button>
            <button 
              onClick={() => {
                setActiveTab('HMI_HEAD');
                playBeep(700, 0.1, 'sine', 0.04);
              }}
              className={`px-3 py-1 font-mono text-[9px] tracking-widest uppercase border rounded transition cursor-pointer ${
                activeTab === 'HMI_HEAD' 
                  ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                  : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              [ HMI HEAD NODE RIG ]
            </button>
          </div>

          {/* RENDER BODY CONTAINER */}
          <div className="flex-1 w-full relative min-h-[220px] flex items-center justify-center">
            
            {/* TAB 0: HERO VISUAL LANDING DISPLAY */}
            {activeTab === 'HERO_VISUAL' && (
              <div className="w-full h-full flex flex-col items-center justify-center p-2 relative overflow-hidden group">
                <div className="absolute inset-0 border border-cyan-500/20 rounded bg-cyan-950/5 pointer-events-none" />
                
                {/* Visual frame corners */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-500" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-500" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-500" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-500" />

                <img 
                  src="/chatgpt_hero.png" 
                  alt="Hero Landing Visual" 
                  className="max-h-[85%] max-w-full object-contain rounded border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition duration-500 group-hover:scale-[1.02]"
                  referrerPolicy="no-referrer"
                />

                {/* Cyber tech overlay info */}
                <div className="mt-2 text-center">
                  <span className="text-[9px] font-mono text-cyan-400 tracking-widest uppercase animate-pulse">
                    [ CST-ERT RUNNER HERO SPECIFICATION ]
                  </span>
                </div>
              </div>
            )}

            {/* TAB 1: SENTINEL CHASSIS SILHOUETTE */}
            {activeTab === 'CHASSIS' && (
              <div className="w-full h-full flex items-center justify-center">
                <svg viewBox="0 0 300 400" className="w-64 h-full drop-shadow-[0_0_15px_rgba(6,182,212,0.2)] filter pointer-events-none">
                  {/* Cybernetic skeleton chassis */}
                  <path d="M90,140 L110,135 L125,150 L115,180 L85,160 Z" fill="#0f172a" stroke="rgba(6,182,212,0.5)" strokeWidth="1.5" />
                  <path d="M210,140 L190,135 L175,150 L185,180 L215,160 Z" fill="#0f172a" stroke="rgba(6,182,212,0.5)" strokeWidth="1.5" />
                  <path d="M135,140 L165,140 L160,115 L140,115 Z" fill="#1e293b" stroke="rgba(6,182,212,0.4)" strokeWidth="1" />
                  <path d="M130,110 L170,110 L165,80 L150,70 L135,80 Z" fill="#020617" stroke="rgba(6,182,212,0.6)" strokeWidth="1.5" />
                  <circle cx="150" cy="95" r="9" stroke="rgba(6,182,212,0.5)" strokeWidth="1" />
                  <circle cx="150" cy="95" r="4.5" fill="#22d3ee" className="animate-pulse" />
                  <path d="M110,155 L190,155 L200,210 L175,250 L125,250 L100,210 Z" fill="#0b1329" stroke="rgba(6,182,212,0.5)" strokeWidth="1.5" />
                  <circle cx="150" cy="182" r="7" fill="#22d3ee" className="animate-pulse" />
                  
                  {/* CST-ERT disc */}
                  <text x="150" y="275" textAnchor="middle" fill="#22d3ee" fontSize="12" fontFamily="monospace" fontWeight="bold">CST-ERT LINKED</text>
                </svg>
              </div>
            )}

            {/* TAB 2: INTERACTIVE 3D HMI HEAD RIG */}
            {activeTab === 'HMI_HEAD' && (
              <div className="absolute inset-0 flex flex-col justify-between">
                
                {/* Custom GLTF Model Loader bar at top */}
                <div className="bg-zinc-950/80 border border-zinc-900 p-2 rounded flex gap-2 items-center z-20">
                  <Upload size={12} className="text-cyan-400" />
                  <input 
                    type="text" 
                    placeholder="Enter custom Head .gltf / .glb URL..." 
                    value={gltfModelUrl}
                    onChange={(e) => setGltfModelUrl(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 text-[9px] font-mono px-2 py-1 text-zinc-300 rounded focus:outline-none focus:border-cyan-500"
                  />
                  <button 
                    onClick={handleLoadCustomGltf}
                    disabled={isModelLoading}
                    className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-[9px] font-mono text-cyan-400 font-bold uppercase rounded cursor-pointer transition flex items-center gap-1"
                  >
                    {isModelLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Load Node'}
                  </button>
                </div>

                {/* The 3D Canvas element */}
                <div className="flex-1 w-full relative">
                  <canvas ref={hmiCanvasRef} className="w-full h-full rounded outline-none block" />
                  
                  {/* Floating status overlays inside render window */}
                  <div className="absolute bottom-2 left-2 pointer-events-none font-mono text-[8px] text-zinc-400 bg-zinc-950/70 p-1.5 rounded border border-zinc-900/50">
                    <div>MODEL: {modelLoadedSuccess ? 'CUSTOM GLTF LINKED' : 'PROCEDURAL SKELETON'}</div>
                    <div className="text-cyan-400 animate-pulse">SKELETON RIG STATUS: ONLINE</div>
                  </div>

                  <div className="absolute bottom-2 right-2 pointer-events-none font-mono text-[8px] text-zinc-400 bg-zinc-950/70 p-1.5 rounded border border-zinc-900/50 text-right">
                    <div>JAW: {Math.round(jawArticulation * 100)}%</div>
                    <div>BROW: {Math.round(browElevation * 100)}%</div>
                  </div>
                </div>

                {/* Preset selectors to test other URLs */}
                <div className="flex gap-1.5 justify-center py-1 bg-zinc-950/40 border-t border-zinc-900/60 z-20">
                  <span className="text-[8px] font-mono text-zinc-500 uppercase flex items-center">Presets:</span>
                  <button 
                    onClick={() => {
                      setGltfModelUrl('https://models.babylonjs.com/haunted_house/ghost.glb');
                      playBeep(500, 0.1);
                    }}
                    className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded text-[7px] font-mono text-zinc-400 hover:text-white"
                  >
                    Ghost Node
                  </button>
                  <button 
                    onClick={() => {
                      setGltfModelUrl('https://models.babylonjs.com/BoomBox.glb');
                      playBeep(500, 0.1);
                    }}
                    className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded text-[7px] font-mono text-zinc-400 hover:text-white"
                  >
                    Cyborg Visor Pres.
                  </button>
                  {modelLoadError && (
                    <span className="text-[7.5px] font-mono text-red-500 ml-1 truncate max-w-[120px]">{modelLoadError}</span>
                  )}
                </div>

              </div>
            )}

          </div>

          {/* LOWER SECTION OF CENTER: ARCHIVUM HUD CONTROL STATS */}
          <div className="border-t border-zinc-900/60 pt-2 w-full flex items-center justify-between text-[9px] font-mono text-zinc-500">
            <span>STATION: RAD_09</span>
            <span className="text-cyan-400/80 animate-pulse font-bold">BIO-TRANS_READY</span>
            <span>FREQ: 312.44 Hz</span>
          </div>

        </div>

        {/* RIGHT COLUMN: RIG CONTROLLER & SCROLLING LOGS */}
        <div className="w-full lg:w-[24%] flex flex-col justify-between space-y-4 self-stretch min-h-0">
          
          {/* PLAYER CONTROLLER FOR FACE MORPH RIG SKELETONS */}
          <div className="border border-zinc-900 bg-zinc-950/30 p-3 rounded-lg relative backdrop-blur-sm flex flex-col">
            <div className="absolute bottom-0 right-0 w-6 h-[1px] bg-cyan-500" />
            <div className="absolute bottom-0 right-0 w-[1px] h-6 bg-cyan-500" />
            
            <h3 className="text-[9px] font-mono tracking-widest text-zinc-400 uppercase mb-3 border-b border-zinc-900 pb-1.5 flex items-center gap-1">
              <Sliders size={11} className="text-cyan-400" /> Rig Skeletons Controller
            </h3>

            {/* Controller sliders */}
            <div className="space-y-3 flex-1">
              
              <div>
                <div className="flex justify-between text-[8px] font-mono text-zinc-400 mb-0.5">
                  <span>JAW ARTICULATION</span>
                  <span className="text-cyan-400">{Math.round(jawArticulation * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  value={jawArticulation}
                  disabled={neuralOverdrive}
                  onChange={(e) => {
                    setJawArticulation(parseFloat(e.target.value));
                    playMorphSfx();
                  }}
                  className="w-full accent-cyan-500 h-1 bg-zinc-900 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[8px] font-mono text-zinc-400 mb-0.5">
                  <span>BROW ELEVATION</span>
                  <span className="text-cyan-400">{Math.round(browElevation * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  value={browElevation}
                  disabled={neuralOverdrive}
                  onChange={(e) => {
                    setBrowElevation(parseFloat(e.target.value));
                    playMorphSfx();
                  }}
                  className="w-full accent-cyan-500 h-1 bg-zinc-900 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[8px] font-mono text-zinc-400 mb-0.5">
                  <span>OCULAR COMPRESSION</span>
                  <span className="text-cyan-400">{Math.round(ocularCompression * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  value={ocularCompression}
                  disabled={neuralOverdrive}
                  onChange={(e) => {
                    setOcularCompression(parseFloat(e.target.value));
                    playMorphSfx();
                  }}
                  className="w-full accent-cyan-500 h-1 bg-zinc-900 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[8px] font-mono text-zinc-400 mb-0.5">
                  <span>LABIAL CORNER PULL</span>
                  <span className="text-cyan-400">{Math.round(labialCornerPull * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  value={labialCornerPull}
                  disabled={neuralOverdrive}
                  onChange={(e) => {
                    setLabialCornerPull(parseFloat(e.target.value));
                    playMorphSfx();
                  }}
                  className="w-full accent-cyan-500 h-1 bg-zinc-900 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[8px] font-mono text-zinc-400 mb-0.5">
                  <span>CHEEK RESONATION</span>
                  <span className="text-cyan-400">{Math.round(cheekResonation * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  value={cheekResonation}
                  disabled={neuralOverdrive}
                  onChange={(e) => {
                    setCheekResonation(parseFloat(e.target.value));
                    playMorphSfx();
                  }}
                  className="w-full accent-cyan-500 h-1 bg-zinc-900 rounded-lg cursor-pointer"
                />
              </div>

              {/* AUTOMATION MODE (NEURAL OVERDRIVE) */}
              <div className="pt-2 border-t border-zinc-900/50 flex flex-col gap-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-zinc-400 hover:text-cyan-400 transition">
                  <input 
                    type="checkbox" 
                    checked={neuralOverdrive}
                    onChange={(e) => {
                      setNeuralOverdrive(e.target.checked);
                      playBeep(e.target.checked ? 880 : 440, 0.2);
                    }}
                    className="accent-cyan-500 rounded cursor-pointer"
                  />
                  <span className="text-[8px] font-mono tracking-widest uppercase">ENABLE NEURAL OVERDRIVE</span>
                </label>
                {neuralOverdrive && (
                  <div className="pl-5">
                    <div className="flex justify-between text-[7.5px] font-mono text-zinc-500 mb-0.5">
                      <span>OSCILLATION SPEED</span>
                      <span className="text-cyan-400">{neuralFrequency} Hz</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="8" 
                      step="0.2"
                      value={neuralFrequency}
                      onChange={(e) => setNeuralFrequency(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 h-0.5 bg-zinc-900 rounded cursor-pointer"
                    />
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* REALTIME DIAGNOSTIC SCROLLING LOGS */}
          <div className="border border-zinc-900 bg-zinc-950/30 p-3 rounded-lg relative backdrop-blur-sm flex flex-col h-[130px] min-h-0">
            <h3 className="text-[9px] font-mono tracking-widest text-zinc-400 uppercase mb-1.5 border-b border-zinc-900 pb-1.5 flex items-center gap-1">
              <Terminal size={11} className="text-cyan-400" /> System Log Output
            </h3>

            <div 
              ref={logContainerRef}
              className="flex-1 overflow-y-auto font-mono text-[7.5px] text-cyan-500/80 space-y-1.5 pr-1 custom-scrollbar"
            >
              {terminalLogs.map((log, index) => (
                <div key={index} className="leading-normal pl-1.5 border-l border-cyan-950">
                  {log}
                </div>
              ))}
            </div>
          </div>

        </div>

      </main>

      {/* FOOTER ACTION CONTROLS & LINK ESTABLISHMENT */}
      <footer className="relative z-10 flex flex-col items-center justify-center border-t border-cyan-950/40 pt-4 pb-1">
        <AnimatePresence mode="wait">
          {!isConnecting ? (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex flex-col items-center gap-2.5 w-full max-w-md text-center"
            >
              <div className="flex items-center gap-1.5 text-[8.5px] font-mono text-zinc-500 uppercase tracking-widest mb-0.5 animate-pulse">
                <AlertCircle size={9} className="text-cyan-400 animate-spin" /> 
                LINK STATUS: SKELETON SYNCED // PILOT OVERRIDE READY
              </div>

              {/* Glowing Holographic action button */}
              <button
                onClick={handleStartConnection}
                className="group relative w-full py-3 bg-cyan-950/40 hover:bg-cyan-950/80 border-2 border-cyan-500 text-cyan-400 hover:text-white font-bold font-mono text-[10px] uppercase tracking-widest rounded-lg transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_25px_rgba(6,182,212,0.35)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
                <Cpu className="w-4 h-4 group-hover:scale-110 transition duration-300 animate-pulse" />
                <span>Establish Trans-Neural Connection</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition duration-300" />
              </button>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md border border-cyan-800/40 bg-cyan-950/10 p-4 rounded-lg flex flex-col items-center"
            >
              <div className="flex items-center justify-between w-full font-mono text-[8.5px] text-cyan-400 uppercase tracking-wider mb-2">
                <span>SYNCHRONIZING SKELETONS WITH PILOT HELM...</span>
                <span>{connectionProgress}%</span>
              </div>
              
              <div className="w-full h-2.5 border border-cyan-500/40 rounded bg-cyan-950/30 overflow-hidden p-[1.5px]">
                <motion.div 
                  className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-sm shadow-[0_0_8px_rgba(6,182,212,0.7)]"
                  style={{ width: `${connectionProgress}%` }}
                />
              </div>

              <div className="flex justify-between w-full font-mono text-[7.5px] text-zinc-500 uppercase tracking-widest mt-1.5">
                <span>VOLTAGE: {420 + Math.floor(connectionProgress * 0.8)}mV</span>
                <span>STATE: {connectionProgress < 50 ? 'RIG_ALIGNMENT' : 'SKELETON_LOCK'}</span>
                <span>SYNC_STABLE</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </footer>
      
    </div>
  );
}
