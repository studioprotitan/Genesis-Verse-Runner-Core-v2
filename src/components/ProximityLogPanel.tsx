import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ProximityLog } from '../types';
import { Eye, Shield, Zap, ShieldAlert, ZapOff } from 'lucide-react';

interface ProximityLogPanelProps {
  logs: ProximityLog[];
}

export default function ProximityLogPanel({ logs = [] }: ProximityLogPanelProps) {
  return (
    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 pointer-events-auto items-start z-30 font-mono w-64 select-none">
      <div className="flex items-center gap-1.5 text-[9px] text-[#F27D26] tracking-widest font-black uppercase bg-[#F27D26]/10 border border-[#F27D26]/30 px-2 py-1 rounded shadow-[0_0_10px_rgba(242,125,38,0.15)] animate-pulse">
        <ShieldAlert size={11} className="text-[#F27D26]" />
        <span>PROXIMITY TELEMETRY FEED</span>
      </div>

      <div className="flex flex-col gap-2 w-full max-h-[280px] overflow-hidden">
        <AnimatePresence initial={false}>
          {logs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="text-[9px] text-zinc-500 italic uppercase tracking-wider pl-1 py-4"
            >
              System ready. Maintain close distance to obstacles for telemetry point multiplier...
            </motion.div>
          ) : (
            logs.map((log) => {
              const isEvasion = log.type === 'SLIDE_EVASION' || log.type === 'ELEVATION_EVASION';
              
              // Define styling parameters
              let badgeText = 'GRAZE';
              let badgeColorClass = 'text-amber-400 border-amber-500/30 bg-amber-950/20';
              let labelText = 'Lateral Close-Call';

              if (log.type === 'SLIDE_EVASION') {
                badgeText = 'SLIDE DODGE';
                badgeColorClass = 'text-cyan-400 border-cyan-500/30 bg-cyan-950/20';
                labelText = 'Perfect Slide Evasion';
              } else if (log.type === 'ELEVATION_EVASION') {
                badgeText = 'JUMP DODGE';
                badgeColorClass = 'text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-950/20';
                labelText = 'Elevation Evasion';
              } else if (log.type === 'PERFECT_DODGE') {
                badgeText = 'PERFECT DODGE';
                badgeColorClass = 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';
                labelText = 'Daring Reflex Dodge';
              }

              // Clean display obstacle names
              const obstacleName = String(log.obstacleType).replace('_', ' ').toUpperCase();

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -30, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.9, transition: { duration: 0.15 } }}
                  layout
                  className={`w-full p-2.5 rounded-lg border bg-black/85 backdrop-blur-md flex flex-col gap-1.5 shadow-lg relative overflow-hidden transition-all duration-300 ${
                    isEvasion
                      ? 'border-orange-500/50 shadow-[0_0_12px_rgba(242,125,38,0.15)]'
                      : 'border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  {/* Left warning indicator bar */}
                  <div className={`absolute top-0 left-0 bottom-0 w-[3px] ${
                    isEvasion ? 'bg-[#F27D26]' : 'bg-amber-500'
                  }`} />

                  {/* Top Header of Log Item */}
                  <div className="flex justify-between items-center gap-1 pl-1">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase truncate max-w-[120px]">
                      {obstacleName}
                    </span>
                    <span className="text-[9px] text-zinc-500 tracking-wider">
                      {(log.distance).toFixed(1)}m
                    </span>
                  </div>

                  {/* Body / Points / Badge */}
                  <div className="flex justify-between items-center pl-1">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black tracking-wide text-zinc-200">
                        {labelText}
                      </span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border inline-block mt-1 font-mono w-max ${badgeColorClass}`}>
                        {badgeText}
                      </span>
                    </div>

                    <div className="flex flex-col items-end">
                      <motion.span 
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.3 }}
                        className="text-xs font-black text-emerald-400 text-glow"
                      >
                        +{log.points}
                      </motion.span>
                      <span className="text-[7px] text-zinc-500 font-bold uppercase tracking-widest">
                        PTS REWARD
                      </span>
                    </div>
                  </div>

                  {/* Sci-fi scanner visual sweep in background */}
                  <motion.div
                    initial={{ left: '-100%' }}
                    animate={{ left: '100%' }}
                    transition={{ duration: 1, ease: 'easeInOut' }}
                    className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-[#F27D26]/5 to-transparent skew-x-12 pointer-events-none"
                  />
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
