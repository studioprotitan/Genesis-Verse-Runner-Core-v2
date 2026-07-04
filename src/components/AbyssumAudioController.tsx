import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, 
  Music, Sparkles, Sliders, Radio, ChevronDown, ChevronUp
} from 'lucide-react';
import { AbyssumBGM, ABYSSUM_TRACKS } from '../utils/abyssumMusic';

export default function AbyssumAudioController() {
  const [isPlaying, setIsPlaying] = useState(AbyssumBGM.getIsPlaying());
  const [currentTrackIndex, setCurrentTrackIndex] = useState(AbyssumBGM.getCurrentTrackIndex());
  const [volume, setVolume] = useState(AbyssumBGM.getVolume());
  const [isMuted, setIsMuted] = useState(AbyssumBGM.getIsMuted());
  const [showEq, setShowEq] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('abyssum_audio_collapsed');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  // Sync state changes from the BGM singleton
  useEffect(() => {
    const unsubscribe = AbyssumBGM.subscribe(() => {
      setIsPlaying(AbyssumBGM.getIsPlaying());
      setCurrentTrackIndex(AbyssumBGM.getCurrentTrackIndex());
      setVolume(AbyssumBGM.getVolume());
      setIsMuted(AbyssumBGM.getIsMuted());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Visualizer loop
  useEffect(() => {
    if (isCollapsed || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const bands = AbyssumBGM.getAnalyserData();
      
      // Clear with slight alpha to create motion blur trails
      ctx.fillStyle = 'rgba(10, 10, 12, 0.25)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const track = ABYSSUM_TRACKS[currentTrackIndex];
      const primaryColor = track?.color || '#F27D26';

      // Draw standard glowing digital grid reference line
      ctx.strokeStyle = 'rgba(63, 63, 70, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height - 4);
      ctx.lineTo(canvas.width, canvas.height - 4);
      ctx.stroke();

      const barWidth = (canvas.width / bands.length) - 2;
      for (let i = 0; i < bands.length; i++) {
        // If not playing, draw random micro-static hum
        let value = bands[i];
        if (!isPlaying) {
          value = Math.max(0.02, Math.sin(Date.now() * 0.002 + i) * 0.04 + 0.04);
        }

        const barHeight = Math.max(2, value * (canvas.height - 6));
        const x = i * (barWidth + 2);
        const y = canvas.height - barHeight - 2;

        // Apply visual neon gradient
        const gradient = ctx.createLinearGradient(0, y, 0, canvas.height);
        gradient.addColorStop(0, primaryColor);
        gradient.addColorStop(0.6, 'rgba(242, 125, 38, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);

        // Draw cute little floating peak dots for that extra analog detail
        if (value > 0.15) {
          ctx.fillStyle = primaryColor;
          ctx.fillRect(x, y - 2, barWidth, 1.5);
        }
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentTrackIndex, isCollapsed]);

  const activeTrack = ABYSSUM_TRACKS[currentTrackIndex];

  const toggleCollapsed = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    try {
      localStorage.setItem('abyssum_audio_collapsed', String(nextVal));
    } catch (e) {}
  };

  return (
    <div 
      id="abyssum-audio-controller" 
      className={`w-full bg-zinc-950/60 border border-zinc-850 rounded-lg relative overflow-hidden backdrop-blur-md flex flex-col transition-all duration-300 ${
        isCollapsed ? 'p-3 gap-0' : 'p-4 gap-3'
      }`}
    >
      {/* Dynamic scanline indicators */}
      <div 
        className="absolute top-0 left-0 h-[2px] w-full transition-colors duration-500"
        style={{ backgroundColor: activeTrack.color }}
      />
      <div className="absolute inset-0 bg-radial-gradient(from_center,rgba(0,0,0,0)_60%,rgba(0,0,0,0.4)_100%) pointer-events-none" />

      {/* Header section with status */}
      <div 
        className="flex justify-between items-center z-10 cursor-pointer select-none"
        onClick={toggleCollapsed}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Radio size={12} className="text-zinc-500 animate-pulse flex-shrink-0" />
          <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-zinc-400 flex-shrink-0">ABYSSUM BROADCAST CO.</span>
          {isCollapsed && (
            <span 
              className="text-[9px] font-mono max-w-[120px] truncate ml-2 opacity-85 font-semibold animate-pulse"
              style={{ color: activeTrack.color }}
            >
              - {activeTrack.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${isPlaying ? 'bg-emerald-500 animate-pulse shadow-[0_0_6px_#10B981]' : 'bg-zinc-700'}`} />
            <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">{isPlaying ? 'LIVE' : 'MUTED'}</span>
          </div>
          <button className="text-zinc-500 hover:text-zinc-300 transition focus:outline-none">
            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Track Info Banner */}
          <div className="bg-black/45 border border-zinc-900 rounded p-3 flex gap-3 relative overflow-hidden mt-1">
            {/* Animated tape icon or rotating music record */}
            <div className="flex-shrink-0 w-11 h-11 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center relative group">
              <Music 
                size={18} 
                className={`transition-colors duration-500 ${isPlaying ? 'animate-bounce' : 'text-zinc-600'}`}
                style={{ color: isPlaying ? activeTrack.color : undefined }}
              />
              {isPlaying && (
                <motion.div 
                  className="absolute inset-0 rounded-full border border-dashed opacity-30 animate-spin"
                  style={{ borderColor: activeTrack.color, animationDuration: '6s' }}
                />
              )}
            </div>

            {/* Text descriptions */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-1.5">
                <span 
                  className="text-[8px] font-mono uppercase font-black px-1.5 py-0.5 rounded border inline-block select-none tracking-widest leading-none"
                  style={{ color: activeTrack.color, borderColor: `${activeTrack.color}35`, backgroundColor: `${activeTrack.color}08` }}
                >
                  {activeTrack.genre}
                </span>
                <span className="text-[9px] font-mono text-zinc-500 font-bold tracking-wider">
                  {activeTrack.bpm} BPM
                </span>
              </div>
              <h3 className="text-xs font-black text-white font-mono tracking-wide truncate uppercase mt-1">
                {activeTrack.name}
              </h3>
            </div>
          </div>

          {/* Description slider text */}
          <p className="text-[10px] font-mono text-zinc-400 leading-normal pl-1">
            {activeTrack.desc}
          </p>

          {/* Real-Time Equalizer Canvas Visualizer */}
          <div className="relative w-full h-11 bg-zinc-950 border border-zinc-900 rounded overflow-hidden">
            <canvas 
              ref={canvasRef} 
              width={280} 
              height={44} 
              className="w-full h-full block"
              title="Dynamic sound frequency analyzer"
            />
            {/* Transparent ambient grid watermark */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none" />
          </div>

          {/* Audio Slider Controls */}
          <div className="flex items-center justify-between gap-3 bg-zinc-950/40 p-2 rounded border border-zinc-900">
            {/* Left: Interactive Volume Button */}
            <button
              onClick={() => AbyssumBGM.toggleMute()}
              className="p-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:text-white rounded text-zinc-400 transition cursor-pointer"
              title={isMuted ? "Unmute" : "Mute BGM"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX size={12} className="text-red-400 animate-pulse" />
              ) : (
                <Volume2 size={12} style={{ color: activeTrack.color }} />
              )}
            </button>

            {/* Center Slider Track */}
            <div className="flex-1 flex items-center gap-2">
              <Sliders size={10} className="text-zinc-600" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  AbyssumBGM.setVolume(val);
                  if (isMuted && val > 0) {
                    AbyssumBGM.toggleMute();
                  }
                }}
                className="w-full h-1 bg-zinc-900 hover:bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-[#F27D26] outline-none transition-all"
                style={{
                  background: `linear-gradient(to right, ${activeTrack.color} 0%, ${activeTrack.color} ${volume * 100}%, #18181b ${volume * 100}%, #18181b 100%)`
                }}
                title="Adjust background music levels"
              />
              <span className="text-[8px] font-mono text-zinc-500 font-bold w-6 text-right">
                {isMuted ? '0' : Math.round(volume * 100)}%
              </span>
            </div>
          </div>

          {/* Lower deck Buttons (Track selection and Play Pause) */}
          <div className="grid grid-cols-4 gap-2 mt-0.5">
            <button
              onClick={() => AbyssumBGM.prevTrack()}
              className="py-1.5 px-2 bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-white rounded flex items-center justify-center gap-1 transition text-[10px] font-bold font-mono uppercase cursor-pointer"
              title="Previous Track"
            >
              <SkipBack size={11} />
            </button>

            <button
              onClick={() => AbyssumBGM.togglePlay()}
              className="col-span-2 py-1.5 px-2 text-white border rounded flex items-center justify-center gap-1.5 transition text-[10px] font-black font-mono uppercase cursor-pointer"
              style={{ 
                borderColor: activeTrack.color,
                backgroundColor: isPlaying ? `${activeTrack.color}10` : `${activeTrack.color}25`
              }}
              title={isPlaying ? "Pause Broadcast" : "Resume Broadcast"}
            >
              {isPlaying ? (
                <>
                  <Pause size={10} fill="currentColor" />
                  <span>PAUSE BGM</span>
                </>
              ) : (
                <>
                  <Play size={10} fill="currentColor" />
                  <span className="animate-pulse">PLAY BGM</span>
                </>
              )}
            </button>

            <button
              onClick={() => AbyssumBGM.nextTrack()}
              className="py-1.5 px-2 bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-white rounded flex items-center justify-center gap-1 transition text-[10px] font-bold font-mono uppercase cursor-pointer"
              title="Next Track"
            >
              <SkipForward size={11} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
