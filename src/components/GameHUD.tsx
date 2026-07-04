import React from 'react';
import { PlayerState, GameState } from '../types';
import { Shield, Zap, Heart, Trophy, ZapOff, Play, Pause, ChevronRight, Eye, Terminal, Trash2, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ProximityLogPanel from './ProximityLogPanel';
import { SentinelRegistry } from '../utils/sentinel';

interface GameHUDProps {
  playerStats: PlayerState | null;
  gameState: GameState;
  onPauseToggle: () => void;
  onExitToLounge: () => void;
}

export default function GameHUD({
  playerStats,
  gameState,
  onPauseToggle,
  onExitToLounge
}: GameHUDProps) {
  const [activeToasts, setActiveToasts] = React.useState<Array<{ id: string; distance: number; label: string }>>([]);
  const [activeSectorToast, setActiveSectorToast] = React.useState<{
    name: string;
    label: string;
    color: string;
    desc: string;
    threshold: number;
  } | null>(null);

  React.useEffect(() => {
    const handleSectorSwap = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setActiveSectorToast(customEvent.detail);
        
        // Auto dismiss after 4.5 seconds
        setTimeout(() => {
          setActiveSectorToast(current => 
            current?.name === customEvent.detail.name ? null : current
          );
        }, 4500);
      }
    };

    window.addEventListener('cyber-runner-sector-swap', handleSectorSwap);
    return () => {
      window.removeEventListener('cyber-runner-sector-swap', handleSectorSwap);
    };
  }, []);

  const reachedMilestonesRef = React.useRef<Set<number>>(new Set());

  const distance = playerStats ? Math.floor(playerStats.distance) : 0;

  React.useEffect(() => {
    if (distance < 5) {
      reachedMilestonesRef.current.clear();
      return;
    }

    const MILESTONES = [100, 250, 500, 750, 1000, 1500, 2000, 3000, 4000, 5000, 7500, 10000];
    MILESTONES.forEach(milestone => {
      if (distance >= milestone && !reachedMilestonesRef.current.has(milestone)) {
        reachedMilestonesRef.current.add(milestone);
        
        // Trigger toast alert!
        const id = Math.random().toString();
        const newToast = {
          id,
          distance: milestone,
          label: `${milestone}m Milestone Reached`
        };
        
        setActiveToasts(prev => [...prev, newToast]);
        
        // Play futuristic double-chime synth SFX
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'sine';
          osc2.type = 'triangle';
          
          const now = ctx.currentTime;
          
          osc1.frequency.setValueAtTime(300, now);
          osc1.frequency.exponentialRampToValueAtTime(600, now + 0.12);
          osc1.frequency.setValueAtTime(880, now + 0.12);
          osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.4);

          osc2.frequency.setValueAtTime(150, now);
          osc2.frequency.exponentialRampToValueAtTime(300, now + 0.12);
          osc2.frequency.setValueAtTime(440, now + 0.12);
          osc2.frequency.exponentialRampToValueAtTime(600, now + 0.4);

          gain.gain.setValueAtTime(0.08, now);
          gain.gain.linearRampToValueAtTime(0.08, now + 0.12);
          gain.gain.linearRampToValueAtTime(0.001, now + 0.4);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start();
          osc2.start();
          osc1.stop(now + 0.4);
          osc2.stop(now + 0.4);
        } catch (e) {
          // Fail-safe for user gesture browser blocks
        }

        // Trigger vibration pattern: short, pause, long
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate([80, 40, 120]);
          } catch (e) {
            // Fail-safe
          }
        }

        // Remove toast automatically after 4 seconds
        setTimeout(() => {
          setActiveToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
      }
    });
  }, [distance]);

  if (!playerStats) return null;

  const healthPercentage = (playerStats.health / playerStats.maxHealth) * 100;
  const energyPercentage = (playerStats.energy / playerStats.maxEnergy) * 100;

  // Sector Definitions and Progress Calculations
  const SECTOR_THRESHOLDS = [
    { name: 'NEON_DOCK', label: 'NEON DOCK', threshold: 0, color: '#00ffff' },
    { name: 'SYNTHWAVE_RIDGE', label: 'SYNTHWAVE RIDGE', threshold: 400, color: '#ff007f' },
    { name: 'AQUAMARINE_TRENCH', label: 'AQUA TRENCH', threshold: 1000, color: '#00ffe7' },
    { name: 'MATRIX_GRID', label: 'MATRIX GRID', threshold: 1800, color: '#39ff14' },
    { name: 'VOLCANIC_CORE', label: 'VOLCANIC CORE', threshold: 3000, color: '#ff2a00' },
    { name: 'COSMIC_SINGULARITY', label: 'SINGULARITY', threshold: 5000, color: '#ffd700' }
  ];

  const currentDist = playerStats.distance;
  let currentSec = SECTOR_THRESHOLDS[0];
  let nextSec = SECTOR_THRESHOLDS[SECTOR_THRESHOLDS.length - 1];
  for (let i = 0; i < SECTOR_THRESHOLDS.length; i++) {
    if (currentDist >= SECTOR_THRESHOLDS[i].threshold) {
      currentSec = SECTOR_THRESHOLDS[i];
      nextSec = SECTOR_THRESHOLDS[i + 1] || SECTOR_THRESHOLDS[i];
    }
  }
  const currentPrevThreshold = currentSec.threshold;
  const currentNextThreshold = nextSec.threshold;
  const currentRange = currentNextThreshold - currentPrevThreshold;
  const progressPercent = currentRange > 0 
    ? Math.min(100, Math.max(0, ((currentDist - currentPrevThreshold) / currentRange) * 100)) 
    : 100;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 font-mono select-none flex flex-col justify-between p-6">
      {/* Central Sector Swap Banner Announcement */}
      <AnimatePresence>
        {activeSectorToast && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-1/3 left-0 right-0 z-40 pointer-events-none flex flex-col items-center justify-center py-6 border-y border-opacity-30 bg-black/90 backdrop-blur-md overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.95)]"
            style={{ borderColor: activeSectorToast.color }}
          >
            {/* Pulsing glow background bar */}
            <div 
              className="absolute inset-0 opacity-10 animate-pulse"
              style={{ backgroundColor: activeSectorToast.color }}
            />

            {/* Futuristic brackets accent line */}
            <div className="text-[10px] uppercase tracking-[0.3em] font-bold mb-1 font-mono flex items-center gap-2 animate-pulse" style={{ color: activeSectorToast.color }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeSectorToast.color }} />
              SECTOR RE-CALIBRATION DETECTED
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeSectorToast.color }} />
            </div>

            <motion.h2 
              initial={{ letterSpacing: '0.1em', opacity: 0 }}
              animate={{ letterSpacing: '0.3em', opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-2xl md:text-3xl font-black text-white text-center font-mono uppercase text-shadow"
              style={{ textShadow: `0 0 15px ${activeSectorToast.color}` }}
            >
              {activeSectorToast.label}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-[9px] text-zinc-400 mt-2 max-w-md text-center tracking-wider font-mono uppercase"
            >
              {activeSectorToast.desc}
            </motion.p>

            <div className="absolute top-0 bottom-0 left-6 w-1 border-l border-opacity-50 flex items-center" style={{ borderColor: activeSectorToast.color }}>
              <div className="h-1/2 w-full animate-bounce" style={{ backgroundColor: activeSectorToast.color }} />
            </div>
            <div className="absolute top-0 bottom-0 right-6 w-1 border-r border-opacity-50 flex items-center justify-end" style={{ borderColor: activeSectorToast.color }}>
              <div className="h-1/2 w-full animate-bounce" style={{ backgroundColor: activeSectorToast.color }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen scanning override grid/vignette overlay when Enemy Scan is active */}
      <AnimatePresence>
        {playerStats.enemyScanActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-0 border-[6px] border-red-600/30 overflow-hidden"
          >
            {/* Pulsing Scan Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(239,68,68,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(239,68,68,0.07)_1px,transparent_1px)] bg-[size:30px_30px] animate-pulse" />
            
            {/* Moving red laser scanning line */}
            <motion.div 
              initial={{ top: "-10%" }}
              animate={{ top: "110%" }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
              className="absolute left-0 right-0 h-[2px] bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.85)]"
            />
            
            {/* Cyberpunk Vignette */}
            <div className="absolute inset-0 bg-radial-vignette bg-gradient-to-t from-red-950/20 via-transparent to-red-950/20" />
            
            {/* Static sensor feedback watermark */}
            <div className="absolute top-28 right-6 text-[10px] text-red-500/60 flex flex-col gap-1 text-right tracking-widest font-mono select-none">
              <span className="animate-pulse">● SENSORY OVERRIDE ACTIVE</span>
              <span>TERRAIN DENSITY: ANALYSIS RUNNING</span>
              <span>COGNITIVE DEPTH: LEVEL 4</span>
              <span>FEED RATE: 144Hz</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sentinel High Priority Threat/Vigilance Alert Banner */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center w-full max-w-lg px-4">
        <AnimatePresence>
          {playerStats.sentinelStatus === 'ANOMALY_DETECTED' && playerStats.sentinelAnomalies && playerStats.sentinelAnomalies.length > 0 && (
            <motion.div
              initial={{ y: -100, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -100, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 12, stiffness: 150 }}
              className="w-full bg-red-950/95 border-2 border-red-500 p-4 rounded shadow-[0_0_35px_rgba(239,68,68,0.5)] backdrop-blur-md relative overflow-hidden pointer-events-auto flex flex-col gap-1.5 text-center animate-pulse"
            >
              {/* Corner tech accents */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-red-400" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-red-400" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-red-400" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-red-400" />
              
              <div className="text-xs font-black text-red-400 tracking-widest uppercase font-mono flex items-center justify-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                ⚠️ SENTINEL INTERCEPT: CRITICAL STATE BREACH ⚠️
              </div>
              <div className="text-[10px] text-zinc-300 font-mono">
                System telemetry exceeded Operation: Styx Rising parameters. Safety protocols triggered.
              </div>
              <div className="mt-1 bg-red-900/20 border border-red-500/30 p-1.5 rounded text-left flex flex-col gap-1">
                {playerStats.sentinelAnomalies.map((anomaly, idx) => (
                  <div key={idx} className="text-[9px] font-mono text-red-200 leading-tight">
                    ⚡ {anomaly}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Warning state banner: Approaching boundary */}
          {playerStats.sentinelStatus !== 'ANOMALY_DETECTED' && playerStats.sentinelWarnings && playerStats.sentinelWarnings.length > 0 && (
            <motion.div
              initial={{ y: -100, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -100, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 12, stiffness: 150 }}
              className="w-full bg-amber-950/95 border-2 border-amber-500 p-4 rounded shadow-[0_0_35px_rgba(245,158,11,0.5)] backdrop-blur-md relative overflow-hidden pointer-events-auto flex flex-col gap-1.5 text-center"
            >
              {/* Corner tech accents */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-amber-400" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-amber-400" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-amber-400" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-amber-400" />
              
              <div className="text-xs font-black text-amber-400 tracking-widest uppercase font-mono flex items-center justify-center gap-2 animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                ⚠️ VIGILANCE WARNING: BOUNDARY LIMITS NEARING ⚠️
              </div>
              <div className="text-[10px] text-zinc-300 font-mono">
                System state is approaching structural limit boundaries. Destabilization imminent.
              </div>
              <div className="mt-1 bg-amber-900/20 border border-amber-500/30 p-1.5 rounded text-left flex flex-col gap-1">
                {playerStats.sentinelWarnings.map((warning, idx) => (
                  <div key={idx} className="text-[9px] font-mono text-amber-200 leading-tight">
                    ⚠ {warning}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toast Notification Container */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col gap-2 items-center w-full max-w-sm px-4">
        <AnimatePresence>
          {activeToasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ y: -80, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -30, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 15, stiffness: 120 }}
              className="w-full bg-zinc-950/95 border border-[#F27D26] p-3.5 rounded shadow-[0_0_25px_rgba(242,125,38,0.3)] backdrop-blur-md relative overflow-hidden pointer-events-auto"
            >
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#F27D26]" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#F27D26]" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#F27D26]" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#F27D26]" />
              
              <div className="absolute top-0 left-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#F27D26] to-transparent w-full animate-pulse" />

              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-[#F27D26] shrink-0">
                  <Trophy size={14} className="animate-bounce" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] font-bold text-orange-400 uppercase tracking-widest font-mono animate-pulse">
                    ★ MILESTONE REACHED ★
                  </div>
                  <div className="text-sm font-black font-mono text-white flex items-center gap-1.5 mt-0.5 tracking-wider">
                    <span className="text-white text-glow-orange">{toast.distance} METERS</span>
                    <span className="text-zinc-500 text-[10px] font-normal">CLASSIFIED</span>
                  </div>
                  <div className="text-[8px] text-zinc-500 font-mono mt-1 uppercase tracking-wide">
                    PILOT METRICS STABILIZED • SYSTEM ENHANCED
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {/* Top Bar: Stats */}
      <div className="flex justify-between items-start w-full">
        {/* Left Column: Stats & Sentinel */}
        <div className="flex flex-col gap-2.5">
          {/* Score, Multiplier & Combos */}
          <div className="flex gap-4 pointer-events-auto">
            <div className="bg-black/75 border border-zinc-800 p-3 rounded backdrop-blur-md min-w-[120px]">
              <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">
                <Trophy size={11} className="text-[#F27D26]" />
                Score
              </div>
              <div className="text-xl font-bold tracking-wider text-white text-glow-orange font-mono">
                {String(playerStats.score).padStart(6, '0')}
              </div>
            </div>

            <div className="bg-black/75 border border-zinc-800 p-3 rounded backdrop-blur-md min-w-[90px]">
              <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">
                Multiplier
              </div>
              <div className="text-xl font-bold tracking-wider text-cyan-400 text-glow-cyan font-mono">
                x{playerStats.multiplier}
              </div>
            </div>

            {playerStats.destroyCombo !== undefined && playerStats.destroyCombo > 0 && (
              <div className="bg-black/85 border border-orange-500/60 p-3 rounded backdrop-blur-md min-w-[120px] animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.25)] flex flex-col justify-between">
                <div className="text-orange-400 text-[10px] uppercase font-bold tracking-wider mb-0.5 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping inline-block" />
                  Destruction Combo
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold tracking-wider text-orange-500 text-glow-orange font-mono">
                    x{Math.min(10, 1 + Math.floor(playerStats.destroyCombo / 3))}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    ({playerStats.destroyCombo} hits)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Cosmic Sector Location Monitor */}
          <div className="bg-black/85 p-3 rounded backdrop-blur-md w-72 pointer-events-auto flex flex-col gap-2 relative overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.8)] border border-zinc-800">
            {/* Ambient sector glowing header line */}
            <div 
              className="absolute top-0 left-0 h-[1.5px] w-full"
              style={{ backgroundColor: currentSec.color, boxShadow: `0 0 8px ${currentSec.color}` }}
            />
            
            <div className="flex justify-between items-center border-b border-zinc-850 pb-1.5">
              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                <Compass className="w-3.5 h-3.5 animate-spin" style={{ color: currentSec.color, animationDuration: '6s' }} />
                Cosmic Position
              </div>
              <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-zinc-300">
                Active Sector
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between">
                <span 
                  className="text-[11px] font-bold uppercase tracking-wider transition-all duration-300"
                  style={{ color: currentSec.color, textShadow: `0 0 8px ${currentSec.color}40` }}
                >
                  {currentSec.label}
                </span>
              </div>
              
              <div className="flex justify-between items-center text-[8px] text-zinc-500 font-mono mt-1">
                <span>SECTOR RANGE: {currentPrevThreshold}m – {currentNextThreshold}m</span>
                <span className="font-bold text-zinc-400">{Math.floor(progressPercent)}%</span>
              </div>

              {/* Segmented Progress bar */}
              <div className="flex gap-1 h-1.5 mt-1">
                {Array.from({ length: 10 }).map((_, idx) => {
                  const isFilled = progressPercent >= (idx + 1) * 10;
                  return (
                    <div
                      key={idx}
                      className="flex-1 rounded-sm transition-all duration-300"
                      style={{
                        backgroundColor: isFilled ? currentSec.color : '#18181b',
                        boxShadow: isFilled ? `0 0 6px ${currentSec.color}` : 'none',
                        opacity: isFilled ? 0.95 : 0.2
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sentinel Real-time Run Integrity Monitor */}
          <div className={`bg-black/85 p-3 rounded backdrop-blur-md w-72 pointer-events-auto flex flex-col gap-2 relative overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.8)] border transition-all duration-300 ${
            playerStats.sentinelStatus === 'ANOMALY_DETECTED' 
              ? 'border-red-600/85 shadow-[0_0_15px_rgba(239,68,68,0.25)]' 
              : (playerStats.sentinelWarnings && playerStats.sentinelWarnings.length > 0)
                ? 'border-amber-500/85 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                : 'border-zinc-800'
          }`}>
            {/* Top scanning animation line */}
            <div className={`absolute top-0 left-0 h-[1.5px] w-full bg-gradient-to-r ${
              playerStats.sentinelStatus === 'ANOMALY_DETECTED' 
                ? 'from-transparent via-red-500 to-transparent' 
                : (playerStats.sentinelWarnings && playerStats.sentinelWarnings.length > 0)
                  ? 'from-transparent via-amber-500 to-transparent animate-pulse'
                  : 'from-transparent via-cyan-500 to-transparent animate-pulse'
            }`} />
            
            <div className="flex justify-between items-center border-b border-zinc-850 pb-1.5">
              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                <span className={`w-2 h-2 rounded-full ${
                  playerStats.sentinelStatus === 'ANOMALY_DETECTED' 
                    ? 'bg-red-500 animate-ping' 
                    : (playerStats.sentinelWarnings && playerStats.sentinelWarnings.length > 0)
                      ? 'bg-amber-500 animate-bounce'
                      : 'bg-cyan-500 animate-pulse'
                }`} />
                Sentinel Core
              </div>
              <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${
                playerStats.sentinelStatus === 'ANOMALY_DETECTED' 
                  ? 'bg-red-950/40 border border-red-800 text-red-400' 
                  : (playerStats.sentinelWarnings && playerStats.sentinelWarnings.length > 0)
                    ? 'bg-amber-950/40 border border-amber-800 text-amber-400'
                    : 'bg-cyan-950/40 border border-cyan-800 text-cyan-400'
              }`}>
                {playerStats.sentinelStatus === 'ANOMALY_DETECTED' 
                  ? 'ANOMALY_DETECTED' 
                  : (playerStats.sentinelWarnings && playerStats.sentinelWarnings.length > 0)
                    ? 'LIMIT_WARNING'
                    : 'SECURE'
                }
              </span>
            </div>

            {/* Constitution Schema Version Indicator */}
            <div className="flex justify-between text-[8px] text-zinc-500 font-mono">
              <span>CONSTITUTION:</span>
              <span className="text-zinc-400 font-bold">{playerStats.sentinelConstitutionVersion || 'v1.4-STYX'}</span>
            </div>

            <div className="flex justify-between text-[8px] text-zinc-500 font-mono">
              <span>INTEGRITY VERIFIED:</span>
              <span className={
                playerStats.sentinelStatus === 'ANOMALY_DETECTED' 
                  ? 'text-red-400 font-extrabold' 
                  : (playerStats.sentinelWarnings && playerStats.sentinelWarnings.length > 0)
                    ? 'text-amber-400 font-extrabold animate-pulse'
                    : 'text-emerald-400 font-extrabold'
              }>
                {playerStats.sentinelStatus === 'ANOMALY_DETECTED' 
                  ? 'COMPROMISED' 
                  : (playerStats.sentinelWarnings && playerStats.sentinelWarnings.length > 0)
                    ? 'LIMIT_WARN'
                    : '100% SECURE'
                }
              </span>
            </div>

            <div className="flex justify-between text-[8px] text-zinc-500 font-mono">
              <span>CHECKS RAN:</span>
              <span className="text-zinc-400 font-bold">{playerStats.sentinelChecksPassedCount || 0}</span>
            </div>

            {/* Anomalies List */}
            {playerStats.sentinelAnomalies && playerStats.sentinelAnomalies.length > 0 && (
              <div className="border border-red-900/40 bg-red-950/15 p-1.5 rounded flex flex-col gap-1 max-h-24 overflow-y-auto">
                <div className="text-[8px] font-black text-red-500 tracking-wider">ANOMALIES INTERCEPTED:</div>
                {playerStats.sentinelAnomalies.map((anomaly, idx) => (
                  <div key={idx} className="text-[7.5px] font-mono text-red-300 leading-tight">
                    • {anomaly}
                  </div>
                ))}
              </div>
            )}

            {/* Warnings List */}
            {playerStats.sentinelWarnings && playerStats.sentinelWarnings.length > 0 && (
              <div className="border border-amber-900/40 bg-amber-950/15 p-1.5 rounded flex flex-col gap-1 max-h-24 overflow-y-auto mt-1">
                <div className="text-[8px] font-black text-amber-500 tracking-wider">BOUNDARY LIMITS NEARING:</div>
                {playerStats.sentinelWarnings.map((warning, idx) => (
                  <div key={idx} className="text-[7.5px] font-mono text-amber-300 leading-tight">
                    ⚠ {warning}
                  </div>
                ))}
              </div>
            )}

            {/* Default Guarantees if clean */}
            {(!playerStats.sentinelAnomalies || playerStats.sentinelAnomalies.length === 0) && 
             (!playerStats.sentinelWarnings || playerStats.sentinelWarnings.length === 0) && (
              <div className="border border-cyan-950/40 bg-cyan-950/5 p-1.5 rounded flex flex-col gap-0.5">
                <div className="text-[8px] font-black text-cyan-500 tracking-wider">ACTIVE SSOT GUARANTEES:</div>
                <div className="text-[7px] text-zinc-500 font-mono flex items-center gap-1">
                  <span className="text-cyan-500 font-bold">✓</span> VELOCITY_BOUND_OK (Exp Distance factor)
                </div>
                <div className="text-[7px] text-zinc-500 font-mono flex items-center gap-1">
                  <span className="text-cyan-500 font-bold">✓</span> HEALTH_ENERGY_CEILING (Hard Cap &lt;= 100)
                </div>
                <div className="text-[7px] text-zinc-500 font-mono flex items-center gap-1">
                  <span className="text-cyan-500 font-bold">✓</span> STATE_EXCLUSIVITY (No concurrent Jump/Slide)
                </div>
                <div className="text-[7px] text-zinc-500 font-mono flex items-center gap-1">
                  <span className="text-cyan-500 font-bold">✓</span> COORD_DISCONTINUITY_MITIGATION (No Warp)
                </div>
              </div>
            )}

            {/* Interactivity: Simulated Hack / Cheat injection buttons */}
            <div className="border-t border-zinc-850 pt-1.5 flex flex-col gap-1">
              <div className="text-[8px] font-mono text-zinc-500 font-bold uppercase tracking-wider">Simulate Integrity Telemetry</div>
              <div className="grid grid-cols-2 gap-1">
                {/* Warnings Section */}
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('cyber-runner-trigger-anomaly', { detail: { type: 'speed-warn' } }))}
                  className="py-1 px-1.5 bg-zinc-950 border border-zinc-850 hover:border-amber-500/80 hover:bg-amber-950/10 text-zinc-400 hover:text-amber-400 font-mono text-[7px] uppercase rounded transition cursor-pointer"
                >
                  ⚠ Speed Warn
                </button>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('cyber-runner-trigger-anomaly', { detail: { type: 'drift-warn' } }))}
                  className="py-1 px-1.5 bg-zinc-950 border border-zinc-850 hover:border-amber-500/80 hover:bg-amber-950/10 text-zinc-400 hover:text-amber-400 font-mono text-[7px] uppercase rounded transition cursor-pointer"
                >
                  ⚠ Drift Warn
                </button>

                {/* Breaches Section */}
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('cyber-runner-trigger-anomaly', { detail: { type: 'speed' } }))}
                  className="py-1 px-1.5 bg-zinc-950 border border-zinc-850 hover:border-red-500/80 hover:bg-red-950/10 text-zinc-400 hover:text-red-400 font-mono text-[7px] uppercase rounded transition cursor-pointer col-span-2"
                >
                  💥 Breached Speed Anomaly
                </button>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('cyber-runner-trigger-anomaly', { detail: { type: 'state' } }))}
                  className="py-1 px-1.5 bg-zinc-950 border border-zinc-850 hover:border-red-500/80 hover:bg-red-950/10 text-zinc-400 hover:text-red-400 font-mono text-[7px] uppercase rounded transition cursor-pointer"
                >
                  💥 Overlap State
                </button>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('cyber-runner-trigger-anomaly', { detail: { type: 'warp' } }))}
                  className="py-1 px-1.5 bg-zinc-950 border border-zinc-850 hover:border-red-500/80 hover:bg-red-950/10 text-zinc-400 hover:text-red-400 font-mono text-[7px] uppercase rounded transition cursor-pointer"
                >
                  💥 Teleport Warp
                </button>
              </div>
            </div>
          </div>

          {/* Tactical Log Panel */}
          <div className="bg-black/85 p-3 rounded backdrop-blur-md w-72 pointer-events-auto flex flex-col gap-2 relative overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.8)] border border-zinc-800">
            {/* Top scanning animation line */}
            <div className="absolute top-0 left-0 h-[1.5px] w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-pulse" />
            
            <div className="flex justify-between items-center border-b border-zinc-850 pb-1.5">
              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                <Terminal size={11} className="text-cyan-500 animate-pulse" />
                Tactical Log
              </div>
              {playerStats?.sentinelLogs && playerStats.sentinelLogs.length > 0 && (
                <button
                  onClick={() => {
                    SentinelRegistry.clearLogs();
                  }}
                  className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-400 hover:border-red-900/50 hover:bg-red-950/10 transition cursor-pointer flex items-center gap-1"
                >
                  <Trash2 size={9} />
                  CLEAR
                </button>
              )}
            </div>

            {/* Scrollable logs */}
            <div className="flex flex-col gap-1.5 max-h-[170px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
              {playerStats?.sentinelLogs && playerStats.sentinelLogs.length > 0 ? (
                playerStats.sentinelLogs.map((log) => {
                  const categoryColors = {
                    VELOCITY: 'border-orange-900/40 bg-orange-950/10 text-orange-400',
                    POSITION: 'border-sky-900/40 bg-sky-950/10 text-sky-400',
                    RESOURCE: 'border-emerald-900/40 bg-emerald-950/10 text-emerald-400',
                    STATE: 'border-rose-900/40 bg-rose-950/10 text-rose-400'
                  };
                  
                  const formatTime = (ts: number) => {
                    const d = new Date(ts);
                    return d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  };

                  return (
                    <div 
                      key={log.id} 
                      className={`p-1.5 rounded border text-[7.5px] font-mono leading-tight flex flex-col gap-0.5 relative overflow-hidden ${categoryColors[log.category] || 'border-zinc-800 bg-zinc-950/50 text-zinc-400'}`}
                    >
                      {/* Left accent color bar */}
                      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-current opacity-80" />
                      
                      <div className="flex justify-between items-center pl-1">
                        <span className="font-bold tracking-wider">{log.category} BREACH</span>
                        <span className="text-[7px] opacity-60">{formatTime(log.timestamp)}</span>
                      </div>
                      
                      <div className="text-zinc-300 pl-1">
                        {log.anomaly}
                      </div>

                      <div className="text-zinc-500 pl-1 text-[7px] mt-0.5 flex justify-between">
                        <span>VAL: <strong className="text-zinc-300">{JSON.stringify(log.currentVal)}</strong></span>
                        <span>LIMIT: <strong className="text-zinc-300">{JSON.stringify(log.expectedMax)}</strong></span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center text-zinc-500 font-mono gap-1">
                  <div className="text-[8px] text-emerald-400 font-black animate-pulse flex items-center gap-1 uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    SYSTEM STABILIZED
                  </div>
                  <div className="text-[7px] text-zinc-600 uppercase tracking-wide leading-normal">
                    Sentinel Registry operating within normal constitutional ranges.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Quick System Controls */}
        <div className="flex gap-3 pointer-events-auto">
          <button
            onClick={onPauseToggle}
            className="px-4 py-2 bg-black/75 border border-zinc-800 hover:border-zinc-700 hover:bg-black text-zinc-300 hover:text-white rounded font-bold font-mono text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
          >
            {gameState === GameState.PAUSED ? (
              <>
                <Play size={10} fill="currentColor" />
                Resume
              </>
            ) : (
              <>
                <Pause size={10} fill="currentColor" />
                Pause
              </>
            )}
          </button>
        </div>
      </div>

      {/* Center Notification: Active Status (e.g. Shield, Velocity Burst) */}
      <div className="flex flex-col items-center justify-center gap-2">
        {playerStats.enemyScanActive && (
          <div className="bg-red-500/20 border border-red-500 px-4 py-2 rounded flex flex-col items-center gap-1 animate-pulse backdrop-blur-sm shadow-[0_0_20px_rgba(239,68,68,0.35)] pointer-events-auto">
            <div className="flex items-center gap-2">
              <Eye size={14} className="text-red-400 animate-pulse" />
              <span className="text-xs text-red-300 font-bold uppercase tracking-widest font-mono text-glow-red">ENEMY WIREFRAME SCAN ACTIVE</span>
            </div>
            {playerStats.enemyScanDurationRemaining !== undefined && (
              <div className="text-[9px] text-red-400 font-bold tracking-wider font-mono">
                COGNITIVE LINK TIME: {Math.max(0, playerStats.enemyScanDurationRemaining).toFixed(1)}s
              </div>
            )}
          </div>
        )}

        {playerStats.isBurstActive && (
          <div className="bg-fuchsia-500/20 border border-fuchsia-500 px-4 py-2 rounded flex flex-col items-center gap-1 animate-pulse backdrop-blur-sm shadow-[0_0_20px_rgba(217,70,239,0.35)] pointer-events-auto">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-fuchsia-400 animate-bounce" />
              <span className="text-xs text-fuchsia-300 font-bold uppercase tracking-widest font-mono text-glow-fuchsia">VELOCITY BURST ACTIVE</span>
            </div>
            {playerStats.burstTimeRemaining !== undefined && (
              <div className="text-[9px] text-fuchsia-400 font-bold tracking-wider font-mono">
                OVERLOAD DURATION: {Math.max(0, playerStats.burstTimeRemaining).toFixed(1)}s
              </div>
            )}
          </div>
        )}

        {playerStats.shieldActive && !playerStats.isBurstActive && (
          <div className="bg-cyan-500/10 border border-cyan-400 px-3 py-1.5 rounded flex items-center gap-2 animate-pulse backdrop-blur-sm shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <Shield size={12} className="text-cyan-400" />
            <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider">FORCE SHIELD ACTIVE</span>
          </div>
        )}

        {playerStats.activeWeapon && playerStats.activeWeapon !== 'NONE' && (
          <div className={`px-4 py-2 rounded flex flex-col items-center gap-1 backdrop-blur-sm pointer-events-auto border animate-pulse ${
            playerStats.activeWeapon === 'PLASMA_BLADE'
              ? 'bg-orange-500/10 border-orange-500/80 shadow-[0_0_15px_rgba(249,115,22,0.25)]'
              : 'bg-cyan-500/10 border-cyan-500/80 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
          }`}>
            <div className="flex items-center gap-2">
              {playerStats.activeWeapon === 'PLASMA_BLADE' ? (
                <span className="text-orange-400 font-bold text-xs font-mono uppercase tracking-widest text-glow-orange flex items-center gap-1">🔥 PLASMA BLADE ACTIVE</span>
              ) : (
                <span className="text-cyan-400 font-bold text-xs font-mono uppercase tracking-widest text-glow-cyan flex items-center gap-1">⚡ ION BLASTER ACTIVE</span>
              )}
            </div>
            
            {/* Display charges / pips */}
            <div className="flex gap-1 items-center mt-0.5">
              <span className="text-[9px] text-zinc-500 font-bold uppercase mr-1 tracking-wider">CHARGES:</span>
              {Array.from({ length: 10 }).map((_, idx) => {
                const chargeVal = playerStats.weaponCharges || 0;
                const isLit = idx < chargeVal;
                return (
                  <div
                    key={idx}
                    className={`w-2 h-1.5 rounded-sm transition-all duration-300 ${
                      isLit
                        ? playerStats.activeWeapon === 'PLASMA_BLADE'
                          ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]'
                          : 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                        : 'bg-zinc-800'
                    }`}
                  />
                );
              })}
              <span className={`text-[10px] font-bold ml-1.5 ${
                playerStats.activeWeapon === 'PLASMA_BLADE' ? 'text-orange-400' : 'text-cyan-400'
              }`}>
                {playerStats.weaponCharges} / 10
              </span>
            </div>
            <div className="text-[8px] text-zinc-400 font-semibold tracking-wider font-mono mt-0.5">
              PRESS <span className="text-white px-1 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-bold">[F]</span>, <span className="text-white px-1 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-bold">[E]</span> OR <span className="text-white px-1 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-bold">CLICK</span> TO UNLEASH!
            </div>
          </div>
        )}
      </div>

      {playerStats && (
        <ProximityLogPanel logs={playerStats.proximityLogs || []} />
      )}

      {/* Floating Tactical Abilities Panel (Right-Center) */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 pointer-events-auto items-end z-30">
        <div className="text-[9px] text-zinc-500 tracking-wider font-bold mb-1 mr-1 uppercase">Tactical Skills</div>
        
        {/* Enemy Scan Ability Card */}
        <button
          onClick={() => {
            if (gameState === GameState.PLAYING) {
              window.dispatchEvent(new CustomEvent('cyber-runner-trigger-scan'));
            }
          }}
          disabled={
            gameState !== GameState.PLAYING || 
            playerStats.enemyScanActive || 
            (playerStats.enemyScanCooldownRemaining || 0) > 0 || 
            playerStats.energy < 25
          }
          className={`group flex items-center gap-3.5 bg-black/85 p-3 rounded-lg border backdrop-blur-md relative overflow-hidden transition-all duration-300 min-w-[200px] text-left cursor-pointer ${
            playerStats.enemyScanActive
              ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.35)]'
              : (playerStats.enemyScanCooldownRemaining || 0) > 0
                ? 'border-zinc-850 opacity-60'
                : playerStats.energy < 25
                  ? 'border-zinc-850 opacity-50 cursor-not-allowed'
                  : 'border-red-800/40 hover:border-red-500/80 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]'
          }`}
        >
          {/* Progress bar / Cooldown indicator mask */}
          {(playerStats.enemyScanCooldownRemaining || 0) > 0 && (
            <div 
              className="absolute bottom-0 left-0 h-1 bg-red-600/50 transition-all duration-100" 
              style={{ width: `${(playerStats.enemyScanCooldownRemaining! / 18.0) * 100}%` }}
            />
          )}

          {/* Icon */}
          <div className={`w-10 h-10 rounded flex items-center justify-center border transition-all duration-300 relative overflow-hidden ${
            playerStats.enemyScanActive
              ? 'bg-red-500/15 border-red-500 text-red-400'
              : (playerStats.enemyScanCooldownRemaining || 0) > 0
                ? 'bg-zinc-900 border-zinc-800 text-zinc-600'
                : playerStats.energy < 25
                  ? 'bg-zinc-900/50 border-zinc-850 text-zinc-600'
                  : 'bg-red-950/20 border-red-900/60 group-hover:border-red-500/60 text-red-500 group-hover:text-red-400'
          }`}>
            <Eye size={18} className={playerStats.enemyScanActive ? 'animate-pulse' : ''} />
            
            {/* Cool retro loading indicator inside the icon box */}
            {playerStats.enemyScanActive && (
              <div className="absolute inset-0 border border-red-500/80 animate-ping rounded" />
            )}
          </div>

          {/* Details */}
          <div className="flex-1">
            <div className="flex justify-between items-baseline">
              <span className={`text-[10px] font-black tracking-widest ${
                playerStats.enemyScanActive
                  ? 'text-red-400 text-glow-red animate-pulse'
                  : 'text-zinc-400'
              }`}>
                ENEMY SCAN
              </span>
              <span className="text-[9px] text-zinc-500 font-bold bg-zinc-900 border border-zinc-800 px-1 rounded">Q / R</span>
            </div>
            
            {/* Status Line */}
            <div className="text-[10px] font-bold mt-1">
              {playerStats.enemyScanActive ? (
                <span className="text-red-500 tracking-wide font-black">SCANNING: {playerStats.enemyScanDurationRemaining?.toFixed(1)}s</span>
              ) : (playerStats.enemyScanCooldownRemaining || 0) > 0 ? (
                <span className="text-zinc-500">COOLDOWN: {playerStats.enemyScanCooldownRemaining?.toFixed(1)}s</span>
              ) : playerStats.energy < 25 ? (
                <span className="text-zinc-600 uppercase text-[9px] tracking-tight">ENERGY INSUFFICIENT</span>
              ) : (
                <span className="text-zinc-400 group-hover:text-red-400 font-normal transition-colors">READY (-25% NRGY)</span>
              )}
            </div>
          </div>
        </button>
      </div>

      {/* Bottom Bar: Health, Energy & Speed */}
      <div className="w-full grid grid-cols-1 md:grid-cols-4 gap-4 items-end pointer-events-auto">
        {/* Vital Health monitor */}
        <div className="bg-black/75 border border-zinc-800 p-3 rounded backdrop-blur-md">
          <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
            <div className="flex items-center gap-1.5">
              <Heart size={11} className="text-red-500" />
              PILOT VITALITY
            </div>
            <span className="text-white">{playerStats.health} / {playerStats.maxHealth}</span>
          </div>
          <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
            <div 
              className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-300"
              style={{ width: `${healthPercentage}%` }}
            />
          </div>
        </div>

        {/* Reactor energy cells monitor */}
        <div className="bg-black/75 border border-zinc-800 p-3 rounded backdrop-blur-md">
          <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
            <div className="flex items-center gap-1.5">
              <Zap size={11} className="text-emerald-500 animate-pulse" />
              CORE CELLS
            </div>
            <span className="text-white">{Math.round(playerStats.energy)}%</span>
          </div>
          <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
            <div 
              className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-300"
              style={{ width: `${energyPercentage}%` }}
            />
          </div>
        </div>

        {/* Force Shield monitor */}
        <div className={`bg-black/75 border p-3 rounded backdrop-blur-md transition-all duration-300 ${
          playerStats.shieldActive
            ? (playerStats.shieldRemaining || 0) < 30
              ? 'border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.25)] animate-pulse'
              : 'border-cyan-500/60 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
            : 'border-zinc-850'
        }`}>
          <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
            <div className="flex items-center gap-1.5">
              <Shield size={11} className={
                playerStats.shieldActive
                  ? (playerStats.shieldRemaining || 0) < 30
                    ? 'text-red-500 animate-bounce'
                    : 'text-cyan-400'
                  : 'text-zinc-600'
              } />
              SHIELD ENERGY
            </div>
            <span className={`font-mono text-[11px] font-bold ${
              playerStats.shieldActive
                ? (playerStats.shieldRemaining || 0) < 30
                  ? 'text-red-400 text-glow-red animate-pulse'
                  : 'text-cyan-400 text-glow-cyan'
                : 'text-zinc-600'
            }`}>
              {playerStats.shieldActive ? `${Math.round(playerStats.shieldRemaining || 0)}%` : 'OFFLINE'}
            </span>
          </div>
          
          <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900 relative">
            {playerStats.shieldActive ? (
              <div 
                className={`h-full transition-all duration-300 bg-gradient-to-r ${
                  (playerStats.shieldRemaining || 0) < 30
                    ? 'from-red-600 to-amber-500'
                    : 'from-cyan-600 to-cyan-400'
                }`}
                style={{ width: `${playerStats.shieldRemaining || 0}%` }}
              />
            ) : (
              <div className="h-full w-full bg-zinc-900/50 flex items-center justify-center">
                <div className="w-full h-[1px] bg-zinc-800" />
              </div>
            )}
          </div>

          {/* Warning banner / Info banner */}
          {playerStats.shieldActive && (playerStats.shieldRemaining || 0) < 30 ? (
            <div className="text-[8px] text-red-400 font-extrabold uppercase tracking-widest mt-1 text-center animate-pulse">
              ⚠️ WARNING: CHARGE CRITICAL
            </div>
          ) : !playerStats.shieldActive ? (
            <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider mt-1 text-center">
              ACQUIRE COBALT POWERUP
            </div>
          ) : (
            <div className="text-[8px] text-cyan-500/80 font-bold uppercase tracking-wider mt-1 text-center">
              FORCE SHIELD ACTIVE
            </div>
          )}
        </div>

        {/* Distance / speed log metrics */}
        <div className="bg-black/75 border border-zinc-800 p-3 rounded backdrop-blur-md flex justify-between items-center">
          <div>
            <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">
              Distance Ran
            </div>
            <div className="text-lg font-bold text-white">
              {Math.floor(playerStats.distance)}m
            </div>
          </div>
          <div className="text-right border-l border-zinc-800 pl-4">
            <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">
              Velocity
            </div>
            <div className="text-lg font-bold text-[#F27D26] text-glow-orange">
              {Math.round(playerStats.speed * 3.6)} km/h
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
