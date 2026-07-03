import React from 'react';
import { PlayerState, GameState } from '../types';
import { Shield, Zap, Heart, Trophy, ZapOff, Play, Pause, ChevronRight, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ProximityLogPanel from './ProximityLogPanel';

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

  return (
    <div className="absolute inset-0 pointer-events-none z-10 font-mono select-none flex flex-col justify-between p-6">
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
        {/* Left Side: Score & Multiplier */}
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
