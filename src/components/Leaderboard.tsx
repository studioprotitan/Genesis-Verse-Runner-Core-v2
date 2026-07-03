import React, { useState, useEffect } from 'react';
import { Trophy, RefreshCw, Star, Terminal, User, Send, ChevronRight } from 'lucide-react';

interface ScoreEntry {
  id: string;
  codename: string;
  score: number;
  distance: number;
  date: string;
}

interface LeaderboardProps {
  currentScore: number;
  currentDistance: number;
  currentMaxCombo?: number;
  onRestart: () => void;
  onExitLounge: () => void;
}

export default function Leaderboard({
  currentScore,
  currentDistance,
  currentMaxCombo = 0,
  onRestart,
  onExitLounge
}: LeaderboardProps) {
  const [codename, setCodename] = useState<string>('');
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [scores, setScores] = useState<ScoreEntry[]>([]);

  useEffect(() => {
    // Load local storage high scores
    const saved = localStorage.getItem('cyber_runner_scores');
    if (saved) {
      try {
        setScores(JSON.parse(saved));
      } catch (e) {
        setScores([]);
      }
    } else {
      // Default initial score lists
      const defaultScores: ScoreEntry[] = [
        { id: '1', codename: 'KAY_NEON', score: 12500, distance: 410, date: '2026-06-25' },
        { id: '2', codename: 'VALER_X', score: 8700, distance: 290, date: '2026-06-24' },
        { id: '3', codename: 'CORT_EX', score: 5600, distance: 180, date: '2026-06-23' }
      ];
      localStorage.setItem('cyber_runner_scores', JSON.stringify(defaultScores));
      setScores(defaultScores);
    }
  }, []);

  const handleSubmitScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codename.trim()) return;

    const newEntry: ScoreEntry = {
      id: Math.random().toString(),
      codename: codename.trim().toUpperCase(),
      score: currentScore,
      distance: currentDistance,
      date: new Date().toISOString().split('T')[0]
    };

    const updated = [...scores, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 8); // Keep top 8 scores

    localStorage.setItem('cyber_runner_scores', JSON.stringify(updated));
    setScores(updated);
    setHasSubmitted(true);
  };

  return (
    <div className="w-full max-w-lg bg-black/85 border border-zinc-800 rounded-lg p-6 backdrop-blur-md relative overflow-hidden flex flex-col gap-6">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#F27D26] to-transparent animate-pulse" />

      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
        <div className="p-2 bg-[#F27D26]/10 border border-[#F27D26]/30 rounded">
          <Terminal className="text-[#F27D26] w-6 h-6" />
        </div>
        <div>
          <h2 className="text-sm font-bold tracking-wider font-mono text-[#F27D26] uppercase">TACTICAL SUMMARY</h2>
          <p className="text-[10px] text-zinc-500 font-mono">PILOT_DEBRIEFING_LOG</p>
        </div>
      </div>

      {/* Score details */}
      <div className="grid grid-cols-3 gap-3 bg-zinc-900/40 p-3.5 border border-zinc-850 rounded">
        <div>
          <span className="text-[9px] text-zinc-500 uppercase tracking-wider block font-bold mb-1">Final Score</span>
          <span className="text-lg md:text-xl font-bold font-mono text-white text-glow-orange">{currentScore} pts</span>
        </div>
        <div>
          <span className="text-[9px] text-zinc-500 uppercase tracking-wider block font-bold mb-1">Distance</span>
          <span className="text-lg md:text-xl font-bold font-mono text-cyan-400 text-glow-cyan">{Math.floor(currentDistance)} m</span>
        </div>
        <div>
          <span className="text-[9px] text-zinc-500 uppercase tracking-wider block font-bold mb-1">Max Combo</span>
          <span className="text-lg md:text-xl font-bold font-mono text-orange-400 text-glow-orange">{currentMaxCombo}x</span>
        </div>
      </div>

      {/* Submit Codename Form */}
      {!hasSubmitted ? (
        <form onSubmit={handleSubmitScore} className="space-y-3">
          <label className="text-[10px] text-zinc-400 font-mono uppercase tracking-wide block font-bold">
            Register Pilot Codename in Local Database
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                maxLength={10}
                required
                value={codename}
                onChange={(e) => setCodename(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                placeholder="PILOT_CODENAME"
                className="w-full pl-9 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-[#F27D26] text-white placeholder-zinc-600 rounded text-xs font-mono tracking-wider outline-none uppercase transition"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-[#F27D26]/15 hover:bg-[#F27D26]/30 border border-[#F27D26]/50 hover:border-[#F27D26] text-[#F27D26] hover:text-white text-xs font-bold font-mono tracking-wide rounded uppercase transition duration-150 flex items-center gap-1.5 cursor-pointer"
            >
              <Send size={12} />
              Submit
            </button>
          </div>
        </form>
      ) : (
        <div className="text-xs font-mono text-emerald-400 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 p-3 rounded">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          PILOT CODENAME SUBMITTED SUCCESSFULLY_
        </div>
      )}

      {/* Leaderboard Entries */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono uppercase tracking-wider font-bold border-b border-zinc-800 pb-1.5">
          <Trophy size={11} className="text-[#F27D26]" />
          Top Pilot Standings (Local Storage)
        </div>
        
        <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
          {scores.map((item, idx) => (
            <div 
              key={item.id}
              className={`flex justify-between items-center px-3 py-2 border rounded font-mono text-xs ${
                item.score === currentScore && item.codename === codename.toUpperCase()
                  ? 'bg-[#F27D26]/10 border-[#F27D26] text-white font-bold'
                  : 'bg-zinc-950/40 border-zinc-900 text-zinc-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-bold text-zinc-600 min-w-[14px]">#{idx + 1}</span>
                <span className="tracking-wide">{item.codename}</span>
              </div>
              <div className="flex items-center gap-3">
                <span>{item.distance}m</span>
                <span className="text-[#F27D26] font-bold tracking-wider">{item.score}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action triggers */}
      <div className="flex gap-3 border-t border-zinc-800 pt-4 mt-2">
        <button
          onClick={onRestart}
          className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white font-bold font-mono text-xs uppercase tracking-wide rounded transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw size={13} />
          Deploy Again
        </button>
        <button
          onClick={onExitLounge}
          className="flex-1 py-2.5 bg-gradient-to-r from-orange-600 to-[#F27D26] hover:from-orange-500 hover:to-orange-600 border border-orange-500 text-white font-bold font-mono text-xs uppercase tracking-wide rounded shadow transition flex items-center justify-center gap-2 cursor-pointer"
        >
          Lounge Terminal
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
