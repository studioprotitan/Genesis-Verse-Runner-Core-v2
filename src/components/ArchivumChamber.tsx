import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Cpu, Binary, Orbit, Activity, RefreshCw, Volume2, VolumeX, 
  Terminal, Server, Info, AlertTriangle, Zap, Play, Eye
} from 'lucide-react';

interface ArchivumChamberProps {
  onLoadCognitiveSyncPortal: () => void;
}

export default function ArchivumChamber({ onLoadCognitiveSyncPortal }: ArchivumChamberProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [chamberStatus, setChamberStatus] = useState('STANDBY');
  const [reactorPower, setReactorPower] = useState(88.4);

  // Web Audio Synth SFX helper
  const playSfx = (freq: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.08) => {
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
      console.warn('Audio failed:', e);
    }
  };

  const playChamberHum = () => {
    if (isMuted) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(55, ctx.currentTime); // Low bass A
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(110, ctx.currentTime); // Harmonic hum

      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

      osc1.start();
      osc1.stop(ctx.currentTime + 1.5);
      osc2.start();
      osc2.stop(ctx.currentTime + 1.5);
    } catch (e) {}
  };

  const handlePortalInitiation = () => {
    if (loadingPortal) return;
    setLoadingPortal(true);
    setChamberStatus('DISCHARGING');
    playSfx(150, 2.0, 'sawtooth', 0.06);

    // Dynamic charging audio sweep
    try {
      if (!isMuted) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 1.8);
        gain.gain.setValueAtTime(0.01, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 1.8);
        osc.start();
        osc.stop(ctx.currentTime + 1.8);
      }
    } catch (e) {}

    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          playSfx(1400, 0.5, 'sine', 0.1);
          setTimeout(() => {
            onLoadCognitiveSyncPortal();
          }, 400);
          return 100;
        }
        return prev + 5;
      });
    }, 90);
  };

  useEffect(() => {
    // Random hums and telemetry fluctuations
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        playSfx(110 + Math.random() * 200, 0.4, 'sine', 0.02);
      }
      setReactorPower(prev => {
        const diff = (Math.random() - 0.5) * 1.2;
        return parseFloat(Math.min(100, Math.max(70, prev + diff)).toFixed(1));
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isMuted]);

  return (
    <div className="relative w-full h-full bg-[#030914] text-white flex flex-col justify-between overflow-hidden p-4 select-none font-sans">
      
      {/* SCANLINE OVERLAY FILTER (matches the high-tech terminal scan lines) */}
      <div className="absolute inset-0 bg-scanlines pointer-events-none z-40 opacity-[0.07]" />
      
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.12)_0%,transparent_80%)] pointer-events-none z-0" />
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(6, 182, 212, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(6, 182, 212, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* HEADER SECTION (matches corner status lines of reference image) */}
      <header className="relative z-10 flex items-center justify-between font-mono border-b border-cyan-950/30 pb-3">
        <div className="flex flex-col items-start gap-1">
          <span className="text-cyan-400 text-xs tracking-[0.25em] font-bold uppercase animate-pulse">
            SEC.09 // RAD_STATION
          </span>
          <span className="text-[8px] text-zinc-500 uppercase tracking-widest">ARCHIVUM DATA TERMINAL</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 border border-cyan-950/40 px-2 py-0.5 rounded bg-cyan-950/10">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
            <span className="text-[8px] text-zinc-400 uppercase tracking-wider font-mono">NODE_HEALTH: SECURE</span>
          </div>

          <button 
            onClick={() => {
              setIsMuted(!isMuted);
              playSfx(880, 0.1, 'sine', 0.05);
            }} 
            className="p-1.5 border border-zinc-800 rounded bg-zinc-950/40 hover:bg-zinc-900/60 transition text-zinc-400 hover:text-cyan-400 cursor-pointer"
          >
            {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>

          <span className="text-cyan-400 text-xs tracking-[0.2em] font-bold uppercase hidden md:inline">
            VEO_PULSE // FPS.24
          </span>
        </div>
      </header>

      {/* CENTERPIECE: CAPSULE, GEAR, AND THE TALOS AUTOMATON */}
      <main className="flex-1 relative flex flex-col items-center justify-center py-4 z-10">
        
        {/* HUGE ROTATING GEAR RING (Behind mecha suit, matches reference image background) */}
        <div className="absolute w-[280px] h-[280px] sm:w-[480px] sm:h-[480px] rounded-full border border-cyan-500/10 flex items-center justify-center pointer-events-none z-0 select-none">
          <div 
            className="absolute inset-0 rounded-full border-4 border-dashed border-cyan-500/5 animate-[spin_120s_linear_infinite]"
            style={{
              boxShadow: '0 0 50px rgba(6,182,212,0.03)'
            }}
          />
          <div className="absolute w-[85%] h-[85%] rounded-full border border-cyan-500/10 animate-[spin_60s_linear_infinite_reverse]" />
          
          {/* Cybernetic geometric indicators */}
          <div className="absolute h-full w-[2px] bg-cyan-500/5" />
          <div className="absolute w-full h-[2px] bg-cyan-500/5" />
        </div>

        {/* CHAMBER CAPSULE CONTAINER */}
        <div className="relative w-72 h-[340px] sm:w-[320px] sm:h-[420px] flex items-center justify-center z-10">
          
          {/* Glowing Vertical Glass Frame (Matches the center tube exactly) */}
          <div className="absolute inset-y-0 w-[80%] border-x-2 border-t-2 border-cyan-500/20 rounded-t-[100px] bg-gradient-to-b from-cyan-950/20 via-cyan-950/5 to-cyan-950/40 shadow-[0_0_40px_rgba(6,182,212,0.1)] overflow-hidden">
            
            {/* Moving scan beams inside glass */}
            <div className="w-full h-[3px] bg-cyan-400/40 shadow-[0_0_10px_rgba(6,182,212,0.8)] absolute animate-[bounce_6s_infinite]" />
            <div className="absolute inset-0 bg-cyan-500/[0.02] pointer-events-none" />
          </div>

          {/* TALOS MECHA VECTOR ILLUSTRATION (matches the cool standing suit under glass) */}
          <div className="relative w-[85%] h-[90%] flex items-center justify-center select-none pointer-events-none">
            <svg 
              viewBox="0 0 300 400" 
              className="w-full h-full drop-shadow-[0_0_20px_rgba(6,182,212,0.3)] filter"
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Mecha suit head with visor and horns */}
              <path d="M135,110 L165,110 L162,90 L158,80 L150,75 L142,80 L138,90 Z" fill="#091428" stroke="rgba(6,182,212,0.8)" strokeWidth="1.5" />
              <path d="M132,85 L138,90 L135,98" stroke="rgba(6,182,212,0.7)" strokeWidth="1.5" />
              <path d="M168,85 L162,90 L165,98" stroke="rgba(6,182,212,0.7)" strokeWidth="1.5" />
              <circle cx="150" cy="95" r="3" fill="#22d3ee" className="animate-pulse" />

              {/* Massive neck stabilizer */}
              <rect x="142" y="110" width="16" height="10" fill="#1e293b" stroke="rgba(6,182,212,0.5)" strokeWidth="1" />

              {/* Shoulder pads / Pauldrons */}
              <path d="M95,130 L120,120 L132,135 L120,165 L95,155 Z" fill="#0b1329" stroke="rgba(6,182,212,0.7)" strokeWidth="1.5" />
              <path d="M205,130 L180,120 L168,135 L180,165 L205,155 Z" fill="#0b1329" stroke="rgba(6,182,212,0.7)" strokeWidth="1.5" />

              {/* Reactor center glow */}
              <circle cx="150" cy="155" r="12" stroke="rgba(6,182,212,0.4)" strokeWidth="1" />
              <circle cx="150" cy="155" r="6" fill="#22d3ee" className="animate-pulse" />
              
              {/* Torso plating with detailed panel segments */}
              <path d="M115,125 L185,125 L190,185 L170,225 L130,225 L110,185 Z" fill="#090d16" stroke="rgba(6,182,212,0.6)" strokeWidth="1.5" />
              <line x1="150" y1="125" x2="150" y2="185" stroke="rgba(6,182,212,0.4)" strokeWidth="1" />
              <line x1="120" y1="155" x2="180" y2="155" stroke="rgba(6,182,212,0.4)" strokeWidth="1" />

              {/* Arms */}
              <path d="M95,160 L80,215 L90,235 L105,180 Z" fill="#0a1224" stroke="rgba(6,182,212,0.5)" strokeWidth="1.2" />
              <path d="M205,160 L220,215 L210,235 L195,180 Z" fill="#0a1224" stroke="rgba(6,182,212,0.5)" strokeWidth="1.2" />
              <path d="M80,220 L75,275 L85,290 L92,240 Z" fill="#040814" stroke="rgba(6,182,212,0.6)" strokeWidth="1" />
              <path d="M220,220 L225,275 L215,290 L208,240 Z" fill="#040814" stroke="rgba(6,182,212,0.6)" strokeWidth="1" />

              {/* Pelvis and thigh segments */}
              <path d="M125,230 L175,230 L168,270 L132,270 Z" fill="#070a13" stroke="rgba(6,182,212,0.6)" strokeWidth="1.5" />
              
              {/* Legs */}
              <path d="M130,275 L120,355 L138,368 L146,310 Z" fill="#070a13" stroke="rgba(6,182,212,0.5)" strokeWidth="1.5" />
              <path d="M170,275 L180,355 L162,368 L154,310 Z" fill="#070a13" stroke="rgba(6,182,212,0.5)" strokeWidth="1.5" />

              {/* Label labels */}
              <text x="150" y="255" textAnchor="middle" fill="#22d3ee" fontSize="13" fontFamily="monospace" fontWeight="bold" letterSpacing="2">CST-ERT</text>
            </svg>
          </div>

          {/* ACTIVE CORE CHAMBER DETAILED LABEL AT BOTTOM */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-950/90 border border-cyan-500/30 px-3 py-1 rounded text-[10px] font-mono tracking-widest text-cyan-400">
            ARCHIVUM-01
          </div>

          {/* PRIMARY TRANSPARENT/SCI-FI GLASS ACTION BUTTON OVER MECHA CAPSULE */}
          <button 
            onClick={handlePortalInitiation}
            className="absolute inset-0 w-full h-full rounded-2xl cursor-pointer hover:bg-cyan-500/[0.04] transition-all flex flex-col items-center justify-center group focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            title="Click Capsule to Load Cognitive Sync Portal"
          >
            {/* Glowing Scanlines overlay appearing on hover */}
            <div className="absolute inset-10 border border-cyan-400/0 group-hover:border-cyan-400/30 rounded-xl transition-all duration-300 flex items-center justify-center">
              <div className="absolute inset-0 bg-cyan-950/0 group-hover:bg-cyan-950/20 rounded-xl transition-all duration-300" />
              
              {/* Interactive Hover prompt */}
              <AnimatePresence>
                {!loadingPortal && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-1 bg-zinc-950/90 border border-cyan-400/40 py-2.5 px-4 rounded shadow-[0_0_15px_rgba(6,182,212,0.4)] backdrop-blur-md"
                  >
                    <Play className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span className="text-[10px] font-mono tracking-widest font-bold text-cyan-300 uppercase">LOAD PORTAL</span>
                    <span className="text-[7px] text-zinc-500 font-mono tracking-wider">CLICK TO OVERRIDE</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </button>

          {/* CINEMATIC BOOTING SWIPE DURING INITIATION */}
          <AnimatePresence>
            {loadingPortal && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-zinc-950/95 rounded-2xl border-2 border-cyan-400 flex flex-col items-center justify-center p-4 backdrop-blur-lg z-30"
              >
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
                  <span className="text-xs font-mono font-bold tracking-widest text-cyan-300 uppercase">SYS_INITIALIZING_</span>
                </div>
                
                {/* Micro details */}
                <div className="w-full bg-zinc-900 h-2.5 rounded-sm overflow-hidden p-[1px] mb-2 border border-cyan-500/20">
                  <div className="h-full bg-cyan-500" style={{ width: `${loadingProgress}%` }} />
                </div>
                
                <span className="text-[8px] font-mono text-zinc-400 tracking-widest uppercase mb-1">
                  PROGRESS: {loadingProgress}%
                </span>
                <span className="text-[7px] font-mono text-cyan-500/70 animate-pulse uppercase">
                  ESTABLISHING CST-ERT NEURAL TRANS-LINK
                </span>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* ----------------- INTERACTIVE HOTSPOTS & FLOATING HUD LABELS ----------------- */}
        
        {/* Hotspot 1: Alchemical Runes (Left center) */}
        <div className="absolute left-4 top-[35%] md:left-24 z-20">
          <button 
            onClick={() => {
              playSfx(520, 0.2, 'triangle', 0.05);
              setActiveTab(activeTab === 'runes' ? null : 'runes');
            }}
            className="flex items-center gap-2 bg-zinc-950/80 border border-cyan-500/40 p-2 rounded hover:border-cyan-400 transition shadow-[0_0_10px_rgba(6,182,212,0.15)] group cursor-pointer"
          >
            <div className="relative">
              <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full block animate-pulse" />
              <span className="absolute inset-0 w-2.5 h-2.5 bg-cyan-300 rounded-full block animate-ping" />
            </div>
            <span className="text-[10px] font-mono text-cyan-400 group-hover:text-cyan-300 tracking-wider">
              Alchemical Runes_
            </span>
          </button>
        </div>

        {/* Hotspot 2: Orrery Gateway (Bottom Left) */}
        <div className="absolute left-2 bottom-[15%] md:left-28 z-20">
          <button 
            onClick={() => {
              playSfx(440, 0.2, 'triangle', 0.05);
              setActiveTab(activeTab === 'orrery' ? null : 'orrery');
            }}
            className="flex items-center gap-2 bg-zinc-950/80 border border-cyan-500/40 p-2 rounded hover:border-cyan-400 transition shadow-[0_0_10px_rgba(6,182,212,0.15)] group cursor-pointer"
          >
            <div className="relative">
              <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full block animate-pulse" />
              <span className="absolute inset-0 w-2.5 h-2.5 bg-cyan-300 rounded-full block animate-ping" />
            </div>
            <span className="text-[10px] font-mono text-cyan-400 group-hover:text-cyan-300 tracking-wider">
              Orrery Gateway R...
            </span>
          </button>
        </div>

        {/* Hotspot 3: Talos Automaton (Bottom Center-Left) */}
        <div className="absolute bottom-[4%] md:bottom-[8%] left-1/2 -translate-x-[110%] z-20">
          <button 
            onClick={() => {
              playSfx(650, 0.2, 'triangle', 0.05);
              setActiveTab(activeTab === 'talos' ? null : 'talos');
            }}
            className="flex items-center gap-2 bg-zinc-950/80 border border-cyan-500/40 p-2 rounded hover:border-cyan-400 transition shadow-[0_0_10px_rgba(6,182,212,0.15)] group cursor-pointer"
          >
            <div className="relative">
              <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full block animate-pulse" />
              <span className="absolute inset-0 w-2.5 h-2.5 bg-cyan-300 rounded-full block animate-ping" />
            </div>
            <span className="text-[10px] font-mono text-cyan-400 group-hover:text-cyan-300 tracking-wider">
              Talos Automaton...
            </span>
          </button>
        </div>

        {/* Hotspot 4: Fabrica Somatic (Bottom Right) */}
        <div className="absolute right-4 bottom-[15%] md:right-28 z-20">
          <button 
            onClick={() => {
              playSfx(780, 0.2, 'triangle', 0.05);
              setActiveTab(activeTab === 'somatic' ? null : 'somatic');
            }}
            className="flex items-center gap-2 bg-zinc-950/80 border border-cyan-500/40 p-2 rounded hover:border-cyan-400 transition shadow-[0_0_10px_rgba(6,182,212,0.15)] group cursor-pointer"
          >
            <div className="relative">
              <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full block animate-pulse" />
              <span className="absolute inset-0 w-2.5 h-2.5 bg-cyan-300 rounded-full block animate-ping" />
            </div>
            <span className="text-[10px] font-mono text-cyan-400 group-hover:text-cyan-300 tracking-wider">
              Fabrica Somatic...
            </span>
          </button>
        </div>

        {/* INTERACTIVE POPUP PANELS (Gives users extensive cyberpunk detail screens upon clicking hotspots) */}
        <AnimatePresence>
          {activeTab && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="absolute z-30 max-w-sm w-[90%] bg-zinc-950/95 border-2 border-cyan-500 p-5 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.5)] backdrop-blur-md"
            >
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5 mb-3">
                <span className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase flex items-center gap-2">
                  {activeTab === 'runes' && <Binary className="w-4 h-4" />}
                  {activeTab === 'orrery' && <Orbit className="w-4 h-4" />}
                  {activeTab === 'talos' && <Cpu className="w-4 h-4" />}
                  {activeTab === 'somatic' && <Activity className="w-4 h-4" />}
                  CHAMBER_MODULE::{activeTab.toUpperCase()}
                </span>
                <button 
                  onClick={() => {
                    playSfx(400, 0.1, 'sine', 0.05);
                    setActiveTab(null);
                  }}
                  className="text-zinc-500 hover:text-white font-mono text-xs cursor-pointer px-1.5 py-0.5 border border-zinc-800 rounded bg-zinc-900/40"
                >
                  [X] CLOSE
                </button>
              </div>

              {/* Popup Content conditional renderings */}
              {activeTab === 'runes' && (
                <div className="space-y-3 font-mono text-xs text-zinc-300 leading-relaxed">
                  <p>
                    Decrypting ancient alchemical algorithms that stabilize cognitive load under high cyber speeds.
                  </p>
                  <div className="p-2 border border-cyan-950/50 bg-cyan-950/10 rounded space-y-1 text-[10px]">
                    <div className="flex justify-between"><span>RUNIC_HASH:</span><span className="text-cyan-400 font-bold">0xAA493F2B</span></div>
                    <div className="flex justify-between"><span>DECRYPT_RATIO:</span><span className="text-cyan-400">92.44% SUCCESS</span></div>
                    <div className="flex justify-between"><span>CORRELATOR:</span><span className="text-cyan-400">CST-ERT LINKED</span></div>
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    * The ancient code maps the grid corridors to prevent pilot brain damage from cyber shocks.
                  </div>
                </div>
              )}

              {activeTab === 'orrery' && (
                <div className="space-y-3 font-mono text-xs text-zinc-300 leading-relaxed">
                  <p>
                    Star chart mapping and track coordinate projections. Translating vector spaces into run lanes.
                  </p>
                  <div className="p-2 border border-cyan-950/50 bg-cyan-950/10 rounded space-y-1 text-[10px]">
                    <div className="flex justify-between"><span>GATEWAY:</span><span className="text-cyan-400 font-bold">ORRERY_GATE_X9</span></div>
                    <div className="flex justify-between"><span>GRID_MAPPED:</span><span className="text-cyan-400">8 corridors</span></div>
                    <div className="flex justify-between"><span>SYNAPSE_BANDWIDTH:</span><span className="text-cyan-400">12 Gbps</span></div>
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    * Projections show standard hurdles (barriers, energy drones) are active in sector 09.
                  </div>
                </div>
              )}

              {activeTab === 'talos' && (
                <div className="space-y-3 font-mono text-xs text-zinc-300 leading-relaxed">
                  <p>
                    Talos Mecha armor diagnostics and loadout configuration inside Archivum capsule.
                  </p>
                  <div className="p-2 border border-cyan-950/50 bg-cyan-950/10 rounded space-y-1 text-[10px]">
                    <div className="flex justify-between"><span>SUIT_CLASS:</span><span className="text-cyan-400 font-bold">SENTINEL Mk.IV</span></div>
                    <div className="flex justify-between"><span>CORE_REACTOR:</span><span className="text-green-500">STABLE ({reactorPower}%)</span></div>
                    <div className="flex justify-between"><span>WEAPONS:</span><span className="text-cyan-400">Plasma Blade / Blaster</span></div>
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    * High performance armor shields active. Press LOAD PORTAL to link into suit helm.
                  </div>
                </div>
              )}

              {activeTab === 'somatic' && (
                <div className="space-y-3 font-mono text-xs text-zinc-300 leading-relaxed">
                  <p>
                    Fabrica Somatic bio-coupling metrics. Synchronizing bio-matter with nanomantic skeleton framework.
                  </p>
                  <div className="p-2 border border-cyan-950/50 bg-cyan-950/10 rounded space-y-1 text-[10px]">
                    <div className="flex justify-between"><span>SOMATIC_SYNC:</span><span className="text-cyan-400 font-bold">98.7% SYNC</span></div>
                    <div className="flex justify-between"><span>HEART_RATE:</span><span className="text-cyan-400">72 BPM</span></div>
                    <div className="flex justify-between"><span>OXYGEN_PRESSURE:</span><span className="text-cyan-400">101.3 kPa</span></div>
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    * Neurological pilot links are secure. All physical metrics stand in active parameters.
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* FOOTER METADATA (Matches industrial labels of reference image) */}
      <footer className="relative z-10 flex flex-col md:flex-row items-center justify-between border-t border-cyan-950/30 pt-4 font-mono text-[9px] text-zinc-500 gap-3">
        <div className="flex items-center gap-2">
          <Server className="w-3.5 h-3.5 text-cyan-500" />
          <span>REACTOR_TEMP: 34.2 °C</span>
          <span className="text-zinc-700">|</span>
          <span>POWER_CORE: {reactorPower}%</span>
        </div>

        <div className="text-center text-zinc-400 tracking-wider">
          COGNITIVE OVERLAY CONNECTED PORT: 3000 // ARCHIVUM DIRECT LINK
        </div>

        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-ping" />
          <span>SYS_STANDBY_WAITING_FOR_PILOT</span>
        </div>
      </footer>

    </div>
  );
}
