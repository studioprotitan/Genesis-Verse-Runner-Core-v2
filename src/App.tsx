import React, { useState, useEffect } from 'react';
import { GameState, PlayerState, WeaponType } from './types';
import HeroLanding from './components/HeroLanding';
import PreDeploymentLounge from './components/PreDeploymentLounge';
import ArchivumChamber from './components/ArchivumChamber';
import GameCanvas from './components/GameCanvas';
import GameHUD from './components/GameHUD';
import Leaderboard from './components/Leaderboard';
import ColdBrewRailExtraction from './components/ColdBrewRailExtraction';
import { Play, RotateCcw, Home, Skull, ShieldAlert, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.CHAMBER);
  const [playerStats, setPlayerStats] = useState<PlayerState | null>(null);
  const [savedHighScore, setSavedHighScore] = useState<number>(0);

  // Selected customize options
  const [selectedGear, setSelectedGear] = useState({
    visorColor: '#00FFFF',
    armorColor: '#3F3F46',
    chestColor: '#F27D26',
    hasShield: true,
    hasJetpack: false,
    weaponType: WeaponType.PLASMA_BLADE
  });

  // Load High Score on mount
  useEffect(() => {
    const scores = localStorage.getItem('cyber_runner_scores');
    if (scores) {
      try {
        const parsed = JSON.parse(scores);
        if (parsed && parsed.length > 0) {
          setSavedHighScore(parsed[0].score);
        }
      } catch (e) {
        // Safe check
      }
    }
  }, [gameState]);

  const handleStartGame = (gear: any) => {
    setSelectedGear(gear);
    setGameState(GameState.PLAYING);
  };

  const handleStatsUpdate = (stats: PlayerState) => {
    setPlayerStats(stats);
  };

  const handleGameOver = () => {
    setGameState(GameState.GAME_OVER);
  };

  const handlePauseToggle = () => {
    if (gameState === GameState.PLAYING) {
      setGameState(GameState.PAUSED);
    } else if (gameState === GameState.PAUSED) {
      setGameState(GameState.PLAYING);
    }
  };

  const handleRestart = () => {
    setGameState(GameState.PLAYING);
    setPlayerStats(null);
  };

  const handleExitToLounge = () => {
    if (playerStats) {
      localStorage.setItem('cyber_runner_last_run', JSON.stringify(playerStats));
    }
    setGameState(GameState.LOUNGE);
    setPlayerStats(null);
  };

  return (
    <div className="relative w-full h-screen bg-[#020617] text-white overflow-hidden cyber-grid font-sans select-none">
      {/* Background Ambience layer */}
      <div className="absolute inset-0 bg-radial-gradient(from_center,rgba(242,125,38,0.02)_0%,transparent_100%) pointer-events-none z-0" />

      {/* Render matching view based on state */}
      {gameState === GameState.CHAMBER ? (
        <ArchivumChamber onLoadCognitiveSyncPortal={() => setGameState(GameState.LANDING)} />
      ) : gameState === GameState.LANDING ? (
        <HeroLanding onEnterLounge={() => setGameState(GameState.LOUNGE)} />
      ) : gameState === GameState.LOUNGE ? (
        <PreDeploymentLounge 
          onStartGame={handleStartGame} 
          savedHighScore={savedHighScore}
          onDisconnect={() => setGameState(GameState.CHAMBER)}
          onStartRailExtraction={() => setGameState(GameState.RAIL_EXTRACTION)}
        />
      ) : gameState === GameState.RAIL_EXTRACTION ? (
        <ColdBrewRailExtraction 
          onExit={handleExitToLounge}
          savedHighScore={savedHighScore}
        />
      ) : (
        <div className="relative w-full h-full">
          {/* Active 3D Infinite Runner Canvas */}
          <GameCanvas
            gameState={gameState}
            selectedGear={selectedGear}
            onStatsUpdate={handleStatsUpdate}
            onGameOver={handleGameOver}
          />

          {/* HUD Overlay layer */}
          <GameHUD
            playerStats={playerStats}
            gameState={gameState}
            onPauseToggle={handlePauseToggle}
            onExitToLounge={handleExitToLounge}
          />

          {/* PAUSED Screen State Overlay */}
          <AnimatePresence>
            {gameState === GameState.PAUSED && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm z-30 pointer-events-auto"
              >
                <motion.div 
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.95 }}
                  className="w-full max-w-sm bg-zinc-950/90 border border-zinc-800 p-6 rounded-lg text-center shadow-2xl relative"
                >
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-cyan-500 animate-pulse" />
                  <Cpu className="text-cyan-400 w-12 h-12 mx-auto mb-4 animate-spin" />
                  <h2 className="text-sm font-bold tracking-widest font-mono text-cyan-400 uppercase mb-1">TACTICAL PAUSE</h2>
                  <p className="text-[10px] text-zinc-500 font-mono uppercase mb-6">MISSION_SEQUENCE_SUSPENDED</p>

                  <div className="space-y-3">
                    <button
                      onClick={handlePauseToggle}
                      className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 border border-cyan-400 text-white font-bold font-mono text-xs uppercase tracking-wider rounded transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <Play size={14} fill="currentColor" />
                      Resume Sequence
                    </button>
                    <button
                      onClick={handleRestart}
                      className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 text-zinc-300 hover:text-white font-bold font-mono text-xs uppercase tracking-wider rounded transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RotateCcw size={14} />
                      Restart Run
                    </button>
                    <button
                      onClick={handleExitToLounge}
                      className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-zinc-500 hover:text-zinc-300 font-bold font-mono text-xs uppercase tracking-wider rounded transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Home size={14} />
                      Abandond and Return
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* GAME_OVER Screen State Overlay */}
          <AnimatePresence>
            {gameState === GameState.GAME_OVER && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/90 flex items-center justify-center p-6 backdrop-blur-md z-30 pointer-events-auto"
              >
                <motion.div 
                  initial={{ scale: 0.95, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  className="flex flex-col items-center max-w-lg w-full"
                >
                  <Skull className="text-red-500 w-14 h-14 mb-4 animate-bounce" />
                  <h1 className="text-lg font-bold tracking-widest font-mono text-red-500 uppercase text-glow-orange mb-1">PILOT ELIMINATED</h1>
                  <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-6">REACTOR_CORE_CRITICAL_FAILURE</p>

                  <Leaderboard
                    currentScore={playerStats?.score || 0}
                    currentDistance={playerStats?.distance || 0}
                    currentMaxCombo={playerStats?.maxDestroyCombo || 0}
                    onRestart={handleRestart}
                    onExitLounge={handleExitToLounge}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
