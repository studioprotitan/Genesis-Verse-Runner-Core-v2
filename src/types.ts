export enum GameState {
  CHAMBER = 'CHAMBER',
  LANDING = 'LANDING',
  LOUNGE = 'LOUNGE',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  RAIL_EXTRACTION = 'RAIL_EXTRACTION'
}

export enum Lane {
  LEFT = -1,
  CENTER = 0,
  RIGHT = 1
}

export enum ObstacleType {
  WALL = 'WALL',
  SPIKE_ROCK = 'SPIKE_ROCK',
  DRONE = 'DRONE',
  LOW_BARRIER = 'LOW_BARRIER'
}

export enum WeaponType {
  BLASTER = 'BLASTER',
  PLASMA_BLADE = 'PLASMA_BLADE',
  NONE = 'NONE'
}

export interface ProximityLog {
  id: string;
  type: 'GRAZE' | 'PERFECT_DODGE' | 'ELEVATION_EVASION' | 'SLIDE_EVASION';
  points: number;
  obstacleType: ObstacleType;
  distance: number;
  timestamp: number;
}

export interface ObstacleData {
  id: string;
  type: ObstacleType;
  lane: Lane;
  zPosition: number;
  hasBeenPassed: boolean;
  proximityChecked?: boolean;
}

export interface CollectibleData {
  id: string;
  type: 'COIN' | 'ENERGY_CELL' | 'SHIELD_POWERUP' | 'MAGNET_POWERUP' | 'VELOCITY_BURST' | 'POWERUP_PLASMA_BLADE' | 'POWERUP_ION_BLASTER';
  lane: Lane;
  zPosition: number;
  hasBeenCollected: boolean;
}

export interface PlayerState {
  distance: number;
  speed: number;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  shieldActive: boolean;
  shieldRemaining: number;
  score: number;
  coins: number;
  multiplier: number;
  currentLane: Lane;
  targetLaneX: number;
  xPosition: number;
  isJumping: boolean;
  isSliding: boolean;
  isBurstActive?: boolean;
  burstTimeRemaining?: number;
  activeWeapon?: WeaponType;
  weaponCharges?: number;
  bonusScore?: number;
  destroyCombo?: number;
  maxDestroyCombo?: number;
  obstaclesDestroyed?: number;
  enemyScanActive?: boolean;
  enemyScanDurationRemaining?: number;
  enemyScanCooldownRemaining?: number;
  proximityLogs?: ProximityLog[];
}
