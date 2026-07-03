import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Train, Shield, Zap, Terminal, Radio, Volume2, VolumeX, Sparkles, 
  AlertTriangle, RefreshCw, Play, Eye, Compass, HelpCircle, Heart, 
  Skull, Layers, Award, Crosshair, Activity, ChevronRight, ChevronLeft, 
  BookOpen, Info, Sliders, Database, LogOut
} from 'lucide-react';

interface ColdBrewRailExtractionProps {
  onExit: () => void;
  savedHighScore?: number;
}

// Cards in Deck
interface Card {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'legendary';
  bonus: string;
  icon: string;
  earn: string;
  desc: string;
}

const CARDS: Card[] = [
  {
    id: 'escort',
    name: 'Rail Escort Witch',
    rarity: 'rare',
    bonus: '+HULL REPAIR',
    icon: '🚂',
    earn: 'mission_start',
    desc: 'Frontline protector of the extraction train. Mystic rail wards reduce hull damage by 15% per segment.'
  },
  {
    id: 'engineer',
    name: 'Train Engineer',
    rarity: 'common',
    bonus: '+TURRET SYNC',
    icon: '🔧',
    earn: 'seg1_complete',
    desc: 'Keeps the forge engines running under fire. Syncs with all turret nodes — activates one offline turret automatically.'
  },
  {
    id: 'heavy',
    name: 'Rail Heavy Armor',
    rarity: 'rare',
    bonus: '+THREAT BLOCK',
    icon: '⚙️',
    earn: 'centipede_kill',
    desc: 'Deployable armor plating for the train exterior. Absorbs Centipede impact damage. Critical for rear-approach segments.'
  },
  {
    id: 'swampwitch',
    name: 'Swamp Rail Witch',
    rarity: 'legendary',
    bonus: '+RIFT SUPPRESS',
    icon: '🌿',
    earn: 'rift_rat_kill',
    desc: 'Rift-suppression specialist. Disables Rift Rat hover platform turrets within 40m. Only card effective against sky-diver units.'
  },
  {
    id: 'siren',
    name: 'Counter-Siren',
    rarity: 'legendary',
    bonus: '+AWARENESS OFF',
    icon: '🌊',
    earn: 'boss_phase1',
    desc: "Severs the Taur-Nefarian boss unit's tactical awareness. Reduces Boss Raid damage by 50% for one full phase."
  },
  {
    id: 'glitch',
    name: 'Glitch Witch',
    rarity: 'rare',
    bonus: '+SYSTEM BREACH',
    icon: '⚡',
    earn: 'turret_chain',
    desc: 'Remotely hacks Rift Rat weapons turrets and redirects fire back at invader formations. Requires 3 active turret nodes.'
  },
  {
    id: 'medic',
    name: 'CST Medic',
    rarity: 'common',
    bonus: '+HULL RESTORE',
    icon: '💊',
    earn: 'seg3_complete',
    desc: 'Field restoration specialist. Restores 25% hull integrity between segments. Critical during Boss Raid phases.'
  },
  {
    id: 'skydiver',
    name: 'Alchemy Sky-Diver',
    rarity: 'legendary',
    bonus: '+AIR ASSAULT',
    icon: '🪂',
    earn: 'invader_sky_kill',
    desc: 'Captured Rift Rat sky-diver unit, repurposed for CST-ERT operations. Alchemy-enhanced base-jump suit. Can intercept incoming repel cables mid-air.'
  },
  {
    id: 'commander',
    name: 'Mission Commander',
    rarity: 'legendary',
    bonus: '+ALL STATS +10',
    icon: '⭐',
    earn: 'boss_defeated',
    desc: "Commander Antonio's personal command card. Activating this during a Boss Raid phase ends it immediately. Once per run."
  },
  {
    id: 'orbital',
    name: 'Oracle Override',
    rarity: 'rare',
    bonus: '+INTEL SURGE',
    icon: '🔮',
    earn: 'seg5_complete',
    desc: 'Grants Oracle AVX full visibility of all remaining rail segments. Reveals enemy formation positions 2 segments ahead.'
  }
];

// Coven Roster Members
interface CovenMember {
  name: string;
  role: string;
  icon: string;
  hp: number;
  colorClass: string;
  badgeStyle: string;
}

const COVEN: CovenMember[] = [
  { name: 'Rail Escort Witch', role: 'Train Protector', icon: '🚂', hp: 100, colorClass: 'text-pink-400', badgeStyle: 'border-pink-500/30 bg-pink-500/5' },
  { name: 'Ashari Warlock', role: 'Battle Mystic', icon: '⚡', hp: 100, colorClass: 'text-purple-400', badgeStyle: 'border-purple-500/30 bg-purple-500/5' },
  { name: 'Siren Witch', role: 'Tide Caller', icon: '🌊', hp: 100, colorClass: 'text-blue-400', badgeStyle: 'border-blue-500/30 bg-blue-500/5' },
  { name: 'Glitch Witch', role: 'Systems Breacher', icon: '🔌', hp: 90, colorClass: 'text-emerald-400', badgeStyle: 'border-emerald-500/30 bg-emerald-500/5' },
  { name: 'CST Medic', role: 'Field Support', icon: '💊', hp: 100, colorClass: 'text-cyan-400', badgeStyle: 'border-cyan-500/30 bg-cyan-500/5' },
  { name: 'Rail Heavy Vanguard', role: 'Assault/Defense', icon: '⚙️', hp: 85, colorClass: 'text-rose-400', badgeStyle: 'border-rose-500/30 bg-rose-500/5' }
];

// Threat Intel Entries
interface ThreatEntry {
  id: string;
  type: 'centipede' | 'invader' | 'boss' | 'turret';
  name: string;
  desc: string;
  stat: string;
  colorClass: string;
}

const THREATS: ThreatEntry[] = [
  {
    id: 'centipede',
    type: 'centipede',
    name: 'Centipede Formation',
    desc: 'Segmented bio-mechanical enemy units — 12 to 24 segments per formation. Approach from the rear of the train. Each segment must be destroyed sequentially. Final segment carries an alchemy explosive charge.',
    stat: 'SEGMENTS: 12-24 | APPROACH: REAR | WEAKNESS: TURRET CHAIN FIRE | CARD DROP: Rail Heavy Armor',
    colorClass: 'border-emerald-500/40 text-emerald-400 bg-emerald-950/15'
  },
  {
    id: 'invader_platform',
    type: 'invader',
    name: 'Rift Rat Hover Platform',
    desc: 'High-tech flying rigs deployed by Bipedal Rift Rat units. 4-6 platforms per formation. Each carries weapons turrets and repelling cable systems. Formations attack in synchronized waves — classic flanking pattern.',
    stat: 'UNITS: 4-6 | PATTERN: WAVE SYNC | WEAKNESS: Swamp Rail Witch | CARD DROP: Alchemy Sky-Diver',
    colorClass: 'border-purple-500/40 text-purple-400 bg-purple-950/15'
  },
  {
    id: 'invader_skydiver',
    type: 'invader',
    name: 'Alchemy Sky-Diver Unit',
    desc: 'Elite Rift Rat operatives in alchemy-enhanced base-jumping and sky-diving suits. Deploy from hover platforms via repelling cables. Intercept train roof access. Some carry rift-grenade packs.',
    stat: 'DEPLOY: REPEL CABLES | SUIT: ALCHEMY-ENHANCED | WEAKNESS: Counter-Siren | CARD DROP: Alchemy Sky-Diver',
    colorClass: 'border-fuchsia-500/40 text-fuchsia-400 bg-fuchsia-950/15'
  },
  {
    id: 'boss_vanguard',
    type: 'boss',
    name: 'Taur-Nefarian Rail Vanguard',
    desc: 'Boss-class entity. Three-phase encounter at the Rail Bridge. Phase 1: Void sigil barrier. Phase 2: Rift Rat reinforcement call. Phase 3: Direct assault with full Taur-Nefarian battle rig.',
    stat: 'PHASES: 3 | LOCATION: RAIL BRIDGE | WEAKNESS: Commander Card | CARD DROP: Mission Commander',
    colorClass: 'border-red-500/40 text-red-400 bg-red-950/15 animate-pulse'
  },
  {
    id: 'turret_hijack',
    type: 'turret',
    name: 'Turret Node Hijack',
    desc: 'Rift Rat tech operatives attempt to hijack offline rail turret nodes and redirect fire at the extraction train. Six nodes along the rail corridor. Each offline node is a liability.',
    stat: 'NODES: 6 | HIJACK WINDOW: 90s | COUNTER: Glitch Witch | CHAIN BONUS: Glitch Witch Card',
    colorClass: 'border-cyan-500/40 text-cyan-400 bg-cyan-950/15'
  }
];

// Rail Turret Node States
interface Turret {
  id: number;
  label: string;
  loc: string;
  desc: string;
}

const TURRETS: Turret[] = [
  { id: 0, label: 'TUR-A1', loc: 'Engine Car', desc: 'Forward turret. Primary defense against frontal Rift Rat platforms.' },
  { id: 1, label: 'TUR-B2', loc: 'Passenger Car 1', desc: 'Starboard coverage. Anti-air for sky-diver intercept.' },
  { id: 2, label: 'TUR-C3', loc: 'Passenger Car 2', desc: 'Port coverage. Secondary anti-air.' },
  { id: 3, label: 'TUR-D4', loc: 'Cargo Car', desc: 'C-4 node. Requires manual activation. Glitch Witch recommended.' },
  { id: 4, label: 'TUR-E5', loc: 'Fuel Car', desc: 'Anti-armor turret. Critical for Centipede rear approach defense.' },
  { id: 5, label: 'TUR-F6', loc: 'Rear Guard', desc: 'Rear-facing turret. Final defense against Centipede breach.' }
];

// Story Choice Struct
interface Choice {
  key: string;
  icon: string;
  text: string;
  fx: string;
  fn: string;
  dir: '→' | '←';
}

// Story Segment Struct
interface Segment {
  num: string;
  title: string;
  tag: string;
  ep: string;
  encounters: string[];
  earn: string;
  narrativeLines: string[];
  oracleText: string;
  lbl: string;
  choices: Choice[];
}

const SEGS: Segment[] = [
  {
    num: 'SEG 1 / 6',
    title: 'Boarding the Extraction Train',
    tag: 'PLATFORM ZERO — DEPARTURE',
    ep: '◈ EPISODE III — RAIL EXTRACTION — WAMAT DIV.',
    encounters: ['badge-wamat'],
    earn: 'engineer',
    narrativeLines: [
      "Platform Zero. The extraction train idles under the Swamp Ward's phosphorescent fog — a fourteen-car mystic forge locomotive officially registered as a WAMAT Division transport.",
      "Unofficially, it carries the most sensitive CST-ERT intelligence asset ever recovered from a Drowned Station.",
      "The Rail Escort Witch has already laid protective sigils on every car. The Glitch Witch is online with six turret node access codes.",
      "Oracle AVX confirms: Rift Rat hover platforms are assembling in Sector 7 — they know the train is moving.",
      'Command: "Extraction schedule is non-negotiable. You have six rail segments. Whatever hits you out there — you do not stop that train."'
    ],
    oracleText: "EP III: RAIL EXTRACTION ACTIVE\nTRAIN: PLATFORM ZERO\nHULL INTEGRITY: 100%\nRIFT RAT PLATFORMS: SECTOR 7\nWAMAT ORDER: MAINTAIN SCHEDULE_",
    lbl: '▸ PRE-DEPARTURE DIRECTIVE',
    choices: [
      { key: 'A', icon: '🔧', text: 'Activate first turret node — TUR-A1 online', fx: 'TURRET +1 / THREAT −10', fn: 's1Turret', dir: '→' },
      { key: 'B', icon: '⚡', text: 'Warlock scouts Rift Rat platform assembly', fx: 'INTEL +15 / THREAT −5', fn: 's1Scout', dir: '←' },
      { key: 'C', icon: '🚂', text: 'Immediate departure — surprise the formation', fx: 'TRAIN +20 / THREAT +10', fn: 's1Go', dir: '→' }
    ]
  },
  {
    num: 'SEG 2 / 6',
    title: 'Centipede Rear Assault',
    tag: 'RAIL CORRIDOR — CENTIPEDE ENCOUNTER',
    ep: '◈ EPISODE III — RAIL EXTRACTION — WAMAT DIV.',
    encounters: ['badge-centipede'],
    earn: 'heavy',
    narrativeLines: [
      "Segment 2. The train clears the Swamp Ward perimeter and hits open rail. Within thirty seconds, Oracle AVX screams a proximity alert: Centipede formation inbound — 18 segments — rear approach at speed.",
      "Bio-mechanical, alchemy-reinforced, each segment independently armored. The Rail Heavy Vanguard hits the rear platform.",
      "The final segment is carrying a shaped alchemy charge — if it reaches the fuel car, the train ends here.",
      "The Centipede's lead segment bores through the rear guard door. Rear turret TUR-F6 is offline. You have maybe twenty seconds to respond before it's in the cargo hold."
    ],
    oracleText: "CENTIPEDE: 18 SEGMENTS — REAR BREACH\nTUR-F6: OFFLINE — CRITICAL\nRAIL HEAVY: DEPLOYED REAR\nALCHEMY CHARGE: SEGMENT 18\nENGAGE OR LOSE FUEL CAR_",
    lbl: '▸ CENTIPEDE RESPONSE',
    choices: [
      { key: 'A', icon: '💥', text: 'Rail Heavy holds rear — coven destroys segment by segment', fx: 'HULL −15 / CENTIPEDE +8', fn: 's2Hold', dir: '←' },
      { key: 'B', icon: '🔧', text: 'Emergency activate TUR-F6 — chain fire on formation', fx: 'TURRET +1 / CENTIPEDE +12', fn: 's2TurretF', dir: '→' },
      { key: 'C', icon: '🌿', text: 'Swamp Rail Witch deploys rift-suppression behind train', fx: 'CENTIPEDE +10 / HULL −5', fn: 's2Suppress', dir: '←' }
    ]
  },
  {
    num: 'SEG 3 / 6',
    title: 'Rift Rat Invader Wave',
    tag: 'OPEN RAIL — RIFT RAT INVADER FORMATION',
    ep: '◈ EPISODE III — RAIL EXTRACTION — WAMAT DIV.',
    encounters: ['badge-invader'],
    earn: 'swampwitch',
    narrativeLines: [
      "Segment 3. The Centipede is dealt with — but the train roof is suddenly full of noise.",
      "Six Rift Rat hover platforms drop into formation above the train, weapons turrets hot. Classic Space Invader pattern — left-to-right sweep, advancing by row.",
      "From two of the platforms, alchemy sky-divers launch on repelling cables — enhanced base-jump suits trailing rift energy, dropping toward the passenger cars.",
      "Some carry rift-grenade packs. One carries what looks like a signal jammer.",
      'The Glitch Witch: "Six platforms, twelve turrets, four sky-divers. I can hack the turrets — but only if three of our nodes are active."'
    ],
    oracleText: "RIFT RAT PLATFORMS: 6 — INVADER PATTERN\nSKY-DIVERS: 4 — REPEL CABLES DEPLOYED\nGLITCH WITCH: HACK READY (NEED 3 NODES)\nSIGNAL JAMMER: INCOMING — ORACLE AT RISK\nCHOOSE YOUR COUNTER NOW_",
    lbl: '▸ INVADER COUNTER',
    choices: [
      { key: 'A', icon: '🔌', text: 'Glitch Witch hacks turrets — redirects invader fire', fx: 'INVADER +10 / HULL −10', fn: 's3Glitch', dir: '→' },
      { key: 'B', icon: '🌊', text: 'Siren Witch disrupts sky-diver descent with sonic pulse', fx: 'INVADER +8 / THREAT −15', fn: 's3Siren', dir: '←' },
      { key: 'C', icon: '🪂', text: 'Deploy captured sky-diver card — intercept cables mid-air', fx: 'INVADER +12 / HULL 0', fn: 's3SkyInt', dir: '→' }
    ]
  },
  {
    num: 'SEG 4 / 6',
    title: 'Turret Chain Activation',
    tag: 'RAIL CORRIDOR — TURRET NETWORK',
    ep: '◈ EPISODE III — RAIL EXTRACTION — WAMAT DIV.',
    encounters: ['badge-turret'],
    earn: 'glitch',
    narrativeLines: [
      "Segment 4. The invader wave is broken — but the Glitch Witch is reporting that Rift Rat tech operatives tried to hijack turret node C-4 during the chaos. It's still offline.",
      "Two more nodes are vulnerable. Six rail turret nodes protect the train. Right now, only two are active.",
      "A full turret chain — all six online — would make the final two segments almost unapproachable.",
      "The Glitch Witch can activate three nodes remotely — but doing so will alert the Boss entity waiting at the Rail Bridge.",
      'The Oracle: "Commander — the Rail Bridge is two segments out. Once the Boss unit sees the turrets light up, it will not wait."'
    ],
    oracleText: "TURRET NODES ACTIVE: 2 / 6\nC-4 NODE: HIJACK ATTEMPT — REPELLED\nGLITCH WITCH: CAN ACTIVATE 3 REMOTELY\nBOSS UNIT: RAIL BRIDGE — 2 SEGS OUT\nCHAIN ACTIVATION WILL ALERT BOSS_",
    lbl: '▸ TURRET NETWORK DECISION',
    choices: [
      { key: 'A', icon: '⚡', text: 'Full chain — activate all 6 nodes, alert the Boss', fx: 'TURRETS +4 / BOSS ALERT', fn: 's4Chain', dir: '→' },
      { key: 'B', icon: '🔧', text: 'Selective activation — 3 nodes, stealth maintained', fx: 'TURRETS +3 / THREAT −10', fn: 's4Select', dir: '←' },
      { key: 'C', icon: '🔌', text: 'Glitch Witch loops C-4 — feeds false signal to Boss', fx: 'TURRETS +3 / DECEPTION', fn: 's4Deceive', dir: '→' }
    ]
  },
  {
    num: 'SEG 5 / 6',
    title: 'Rail Bridge — Boss Raid',
    tag: 'RAIL BRIDGE — BOSS RAID ACTIVE',
    ep: '◈ EPISODE III — RAIL EXTRACTION — WAMAT DIV.',
    encounters: ['badge-boss'],
    earn: 'siren',
    narrativeLines: [
      "Segment 5. The Rail Bridge. The train emerges from the tunnel onto the exposed bridge span — and the Taur-Nefarian Rail Vanguard is waiting.",
      "Three meters of Taur-Nefarian battle rig, rift energy crackling from every joint, standing directly on the tracks.",
      "Phase 1: Void sigil barrier across the rails — the train cannot pass.",
      "The coven has 90 seconds to break the barrier before the Rift Rat platforms regroup and return for a second wave.",
      'Oracle AVX: "Three-phase encounter. Break the barrier. Survive the reinforcements. Then — we deal with the Vanguard itself. All turrets to bearing zero."'
    ],
    oracleText: "BOSS RAID: RAIL VANGUARD — PHASE 1\nVOID SIGIL BARRIER: ACTIVE\nRIFT RAT REINFORCE: 90s WINDOW\nTURRETS: BEARING ZERO\nPHASE 1 — BREAK THE BARRIER_",
    lbl: '▸ BOSS PHASE 1 — VOID BARRIER',
    choices: [
      { key: 'A', icon: '🔮', text: 'Oracle Override — dissolve the barrier remotely', fx: 'ORACLE −20 / BOSS P1', fn: 's5Oracle', dir: '←' },
      { key: 'B', icon: '⚡', text: 'Ashari Warlock + coven — mystic assault on barrier', fx: 'HULL −10 / BOSS P1', fn: 's5Assault', dir: '→' },
      { key: 'C', icon: '🌊', text: 'Counter-Siren severs Vanguard awareness — barrier collapses', fx: 'BOSS P1 / STEALTH', fn: 's5Counter', dir: '←' }
    ]
  },
  {
    num: 'SEG 6 / 6',
    title: 'Final Push — Extraction Complete',
    tag: 'FINAL SEGMENT — EXTRACTION TERMINUS',
    ep: '◈ EPISODE III — RAIL EXTRACTION — WAMAT DIV.',
    encounters: [],
    earn: 'commander',
    narrativeLines: [
      "Segment 6. Final Push. The Vanguard is dealt with. The Rail Bridge is behind you. The extraction terminus is two kilometers ahead — Astronomical Society Sector 9, deep in Alt DC.",
      "The train is battered. The coven is standing. The priority asset is secure in the cargo hold.",
      "WAMAT Command is broadcasting all-clear on the primary channel.",
      "One decision remains — how you bring this train home determines the final Card Captor reward and how the Astronomical Society rates this operation."
    ],
    oracleText: "FINAL SEGMENT: CLEAR\nEXTRACTION TERMINUS: 2KM\nASSET: SECURED\nWAMAT: ALL-CLEAR BROADCAST\nMISSION RATING: CALCULATING_",
    lbl: '▸ FINAL APPROACH',
    choices: [
      { key: 'A', icon: '✅', text: 'Full speed — standard extraction, book by the WAMAT code', fx: 'MISSION COMPLETE', fn: 'e3EndClean', dir: '←' },
      { key: 'B', icon: '⭐', text: 'Heroic entry — turret salute, coven formation on roof', fx: 'LEGENDARY RATING', fn: 'e3EndHeroic', dir: '→' },
      { key: 'C', icon: '📡', text: 'Silent approach — covert entry, intel preserved', fx: 'OMEGA CLASSIFICATION', fn: 'e3EndCovert', dir: '←' }
    ]
  }
];

interface Ending {
  title: string;
  hull: boolean;
  desc: string;
  cards: string[];
  ratingKey: string;
}

const ENDINGS: Record<string, Ending> = {
  e3EndClean: {
    title: '✅ Extraction Complete — WAMAT Approved',
    hull: true,
    desc: 'The train arrives on schedule. The asset is transferred. WAMAT Command logs the operation as a successful standard extraction. The Astronomical Society upgrades CST-ERT clearance to OMEGA-2.',
    cards: ['engineer', 'medic'],
    ratingKey: 'WAMAT STANDARD — OMEGA CLEARANCE MAINTAINED'
  },
  e3EndHeroic: {
    title: '⭐ Legendary Extraction — Coven Formation Entry',
    hull: true,
    desc: 'The train arrives with all six turrets firing a synchronized salute. The coven stands on the roof in full formation. WAMAT Command calls it the most dramatic extraction in Alt DC history. Card Captor bonus: Commander card unlocked.',
    cards: ['commander', 'orbital'],
    ratingKey: 'LEGENDARY — OMEGA-2 CLEARANCE GRANTED'
  },
  e3EndCovert: {
    title: '📡 Silent Approach — Omega Classification',
    hull: false,
    desc: 'The train enters the terminus under full silence protocol. No lights, no comms, no salute. The asset is transferred in darkness. The Astronomical Society classifies the entire operation at Omega level. The coven disappears back into the Swamp Wards.',
    cards: ['orbital', 'skydiver'],
    ratingKey: 'OMEGA CLASSIFIED — S.W.A.T. INTERNAL RECORD ONLY'
  }
};

const ROADMAP = [
  { ph: 'EP I', nm: 'Styx Station', s: '✅' },
  { ph: 'EP II', nm: 'Swamp Ward Station', s: '✅' },
  { ph: 'EP III', nm: 'Rail Extraction', s: '▶ ACTIVE' },
  { ph: '8.4', nm: 'UE5 Parkour Pak', s: '⏳' },
  { ph: '8.5', nm: 'Theatre E', s: '⏳' }
];

export default function ColdBrewRailExtraction({ onExit, savedHighScore = 0 }: ColdBrewRailExtractionProps) {
  // Game states matching HTML logic
  const [showIntro, setShowIntro] = useState(true);
  const [introProgress, setIntroProgress] = useState(0);
  const [currentSegIdx, setCurrentSegIdx] = useState(0);
  
  // HUD variables
  const [trainProgress, setTrainProgress] = useState(0);
  const [hullIntegrity, setHullIntegrity] = useState(100);
  const [threatLevel, setThreatLevel] = useState(0);
  const [cardsEarned, setCardsEarned] = useState(0);
  const [ownedCards, setOwnedCards] = useState<Set<string>>(new Set(['escort']));
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);

  // Turret active array corresponding to 6 nodes
  const [turretsActive, setTurretsActive] = useState<boolean[]>([false, false, false, false, false, false]);

  // Combat stats
  const [centipedeKills, setCentipedeKills] = useState(0);
  const [invaderKills, setInvaderKills] = useState(0);
  const [bossPhase, setBossPhase] = useState(0);
  const [bossDefeated, setBossDefeated] = useState(false);

  // Audio mute
  const [isMuted, setIsMuted] = useState(false);

  // Left & Right Panels
  const [leftPanel, setLeftPanel] = useState<'oracle' | 'coven' | 'threats' | 'wamat' | 'log' | null>(null);
  const [rightPanel, setRightPanel] = useState<'cards' | 'turrets' | 'invaders' | 'boss' | 'gallery' | null>(null);

  // Live Terminal Logs
  const [logs, setLogs] = useState<{ msg: string; fresh: boolean }[]>([]);

  // Typewriter Oracle Text state
  const [typedOracle, setTypedOracle] = useState<string>('');

  // Active Ending state
  const [activeEnding, setActiveEnding] = useState<Ending | null>(null);

  // Canvas context reference for running simulated visual feedback loop
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Synth SFX beep generator
  const playBeep = (freq: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.05) => {
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

  // Skip / Finish Intro simulation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showIntro) {
      timer = setInterval(() => {
        setIntroProgress(prev => {
          if (prev >= 100) {
            clearInterval(timer);
            setTimeout(() => {
              setShowIntro(false);
              playBeep(900, 0.4, 'triangle', 0.04);
              addLog('Episode III: Rail Extraction active. WAMAT Division orders received.', true);
              addLog('Oracle AVX: Turret nodes offline. Rift Rat platforms assembling.', true);
              setLeftPanel('oracle');
              setRightPanel('cards');
            }, 500);
            return 100;
          }
          return prev + 4;
        });
      }, 150);
    }
    return () => clearInterval(timer);
  }, [showIntro]);

  // Terminal logging helper
  const addLog = (msg: string, fresh: boolean) => {
    setLogs(prev => [{ msg, fresh }, ...prev.slice(0, 30)]);
  };

  // Oracle Typewriter simulation on segment index change
  useEffect(() => {
    if (showIntro) return;
    const s = SEGS[currentSegIdx];
    if (!s) return;

    let textToType = s.oracleText;
    let lines = textToType.split('\n');
    let lineIdx = 0;
    setTypedOracle('');

    const typingInterval = setInterval(() => {
      if (lineIdx >= lines.length) {
        clearInterval(typingInterval);
        return;
      }
      setTypedOracle(prev => prev + (lineIdx > 0 ? '\n' : '') + lines[lineIdx]);
      lineIdx++;
    }, 150);

    return () => clearInterval(typingInterval);
  }, [currentSegIdx, showIntro]);

  // Real-time Canvas combat overlay rendering loop
  useEffect(() => {
    if (showIntro || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let frame = 0;

    // Track particle arrays
    const particles: { x: number; y: number; vx: number; vy: number; color: string; r: number; alpha: number }[] = [];
    const lasers: { x: number; y: number; tx: number; ty: number; color: string; progress: number }[] = [];

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const renderLoop = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;

      // 1. Draw Rapid Scrolling Tracks
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, h - 30);
      ctx.lineTo(w, h - 30);
      ctx.stroke();

      // Track sleepers scrolling left
      const sleeperSpeed = 8;
      const sleeperSpacing = 40;
      const sleeperOffset = (frame * sleeperSpeed) % sleeperSpacing;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = -sleeperOffset; x < w; x += sleeperSpacing) {
        ctx.moveTo(x, h - 30);
        ctx.lineTo(x + 5, h - 20);
      }
      ctx.stroke();

      // 2. Render Side-Scrolling Cyber Train
      // Placement: horizontally centered slightly to the left, resting on tracks
      const trainY = h - 65;
      const trainX = w * 0.2;
      const trainWidth = w * 0.35;
      const trainHeight = 35;

      // Draw Engine Cabin (Front - right side)
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#c8a84a';
      ctx.lineWidth = 1.5;
      
      // Engine Base Car
      ctx.fillRect(trainX + trainWidth * 0.7, trainY, trainWidth * 0.3, trainHeight);
      ctx.strokeRect(trainX + trainWidth * 0.7, trainY, trainWidth * 0.3, trainHeight);
      
      // Cabin Window with cyan glow
      ctx.fillStyle = '#2affee';
      ctx.fillRect(trainX + trainWidth * 0.9, trainY + 5, 12, 10);
      
      // Carriages (left side of Engine)
      ctx.fillStyle = '#090d16';
      ctx.strokeStyle = '#1e2438';
      ctx.fillRect(trainX, trainY + 4, trainWidth * 0.32, trainHeight - 4);
      ctx.strokeRect(trainX, trainY + 4, trainWidth * 0.32, trainHeight - 4);

      ctx.fillRect(trainX + trainWidth * 0.35, trainY + 4, trainWidth * 0.32, trainHeight - 4);
      ctx.strokeRect(trainX + trainWidth * 0.35, trainY + 4, trainWidth * 0.32, trainHeight - 4);

      // Carriage couplings
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(trainX + trainWidth * 0.32, trainY + trainHeight - 10);
      ctx.lineTo(trainX + trainWidth * 0.35, trainY + trainHeight - 10);
      ctx.moveTo(trainX + trainWidth * 0.67, trainY + trainHeight - 10);
      ctx.lineTo(trainX + trainWidth * 0.7, trainY + trainHeight - 10);
      ctx.stroke();

      // Train wheels (spinning circles)
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#c8a84a';
      ctx.lineWidth = 1;
      const drawWheel = (wx: number, wy: number) => {
        ctx.beginPath();
        ctx.arc(wx, wy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Spinner line
        ctx.strokeStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(wx, wy);
        ctx.lineTo(wx + Math.cos(frame * 0.15) * 6, wy + Math.sin(frame * 0.15) * 6);
        ctx.stroke();
      };
      
      drawWheel(trainX + 15, trainY + trainHeight + 2);
      drawWheel(trainX + 35, trainY + trainHeight + 2);
      drawWheel(trainX + trainWidth * 0.35 + 15, trainY + trainHeight + 2);
      drawWheel(trainX + trainWidth * 0.35 + 35, trainY + trainHeight + 2);
      drawWheel(trainX + trainWidth * 0.7 + 15, trainY + trainHeight + 2);
      drawWheel(trainX + trainWidth * 0.7 + 35, trainY + trainHeight + 2);
      drawWheel(trainX + trainWidth * 0.7 + 55, trainY + trainHeight + 2);

      // Train aesthetic details: Cyber stripes glowing
      ctx.strokeStyle = '#ff4488';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(trainX + 10, trainY + 12);
      ctx.lineTo(trainX + trainWidth * 0.6, trainY + 12);
      ctx.stroke();

      // Hull health flashing warning if critical
      if (hullIntegrity <= 30 && frame % 20 < 10) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.fillRect(trainX, trainY, trainWidth, trainHeight);
      }

      // Add train exhaust sparks
      if (frame % 3 === 0) {
        particles.push({
          x: trainX + trainWidth * 0.82,
          y: trainY - 2,
          vx: -2 - Math.random() * 2,
          vy: -1 - Math.random() * 1.5,
          color: frame % 2 === 0 ? '#ff6600' : '#2affee',
          r: 1.5 + Math.random() * 2,
          alpha: 1
        });
      }

      // Render & Update Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.02;
        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 3. Render Active Laser Turrets
      const turretPositions = [
        { x: trainX + trainWidth * 0.8, y: trainY },       // Engine Car
        { x: trainX + trainWidth * 0.45, y: trainY + 4 },   // Passenger Car 1
        { x: trainX + trainWidth * 0.55, y: trainY + 4 },   // Passenger Car 2
        { x: trainX + trainWidth * 0.1, y: trainY + 4 },    // Cargo Car
        { x: trainX + trainWidth * 0.22, y: trainY + 4 },   // Fuel Car
        { x: trainX + 5, y: trainY + 4 }                    // Rear Guard
      ];

      turretsActive.forEach((active, index) => {
        const pos = turretPositions[index];
        ctx.fillStyle = '#475569';
        ctx.fillRect(pos.x - 4, pos.y - 4, 8, 4);

        if (active) {
          ctx.fillStyle = '#44ddff';
          ctx.beginPath();
          ctx.arc(pos.x, pos.y - 6, 3, 0, Math.PI * 2);
          ctx.fill();

          // Nozzle rotation pointing up-right or up-left
          const angle = index === 5 ? -Math.PI * 0.75 : -Math.PI * 0.25;
          ctx.strokeStyle = '#44ddff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y - 6);
          ctx.lineTo(pos.x + Math.cos(angle) * 8, pos.y - 6 + Math.sin(angle) * 8);
          ctx.stroke();

          // Shoot laser occasionally at active threats
          if (frame % 45 === index * 7) {
            let tx = pos.x + Math.cos(angle) * 150;
            let ty = pos.y - 6 + Math.sin(angle) * 150;
            
            // Adjust targeting based on segment threat
            if (currentSegIdx === 1) { // Centipede
              tx = pos.x - 120;
              ty = trainY + 15 + (Math.sin(frame * 0.1) * 8);
            } else if (currentSegIdx === 2) { // Invaders
              tx = pos.x + (index % 2 === 0 ? 80 : -80);
              ty = 30 + (Math.sin(frame * 0.05) * 10);
            } else if (currentSegIdx === 4) { // Boss Raid
              tx = w * 0.75;
              ty = trainY + 10;
            }

            lasers.push({
              x: pos.x,
              y: pos.y - 6,
              tx,
              ty,
              color: '#44ddff',
              progress: 0
            });
            // Little audio cue
            if (index === 0 && !isMuted) {
              playBeep(1800, 0.05, 'sine', 0.005);
            }
          }
        }
      });

      // Render & Update Lasers
      ctx.lineWidth = 1.5;
      for (let i = lasers.length - 1; i >= 0; i--) {
        const l = lasers[i];
        l.progress += 0.15;
        if (l.progress >= 1) {
          // Trigger impact sparks
          for (let s = 0; s < 5; s++) {
            particles.push({
              x: l.tx,
              y: l.ty,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              color: l.color,
              r: 1 + Math.random() * 2,
              alpha: 1
            });
          }
          lasers.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = l.color;
        ctx.beginPath();
        ctx.moveTo(l.x + (l.tx - l.x) * l.progress, l.y + (l.ty - l.y) * l.progress);
        ctx.lineTo(l.x + (l.tx - l.x) * Math.min(1, l.progress + 0.1), l.y + (l.ty - l.y) * Math.min(1, l.progress + 0.1));
        ctx.stroke();
      }

      // 4. Render Segment-Specific Threats
      if (currentSegIdx === 1) {
        // --- Segment 2: Centipede Rear Assault ---
        ctx.fillStyle = 'rgba(42, 255, 136, 0.8)';
        ctx.strokeStyle = '#2aff88';
        ctx.lineWidth = 1.5;

        // Draw multiple segments following train on left
        const centipedeLength = 8;
        const headX = trainX - 45 + Math.sin(frame * 0.1) * 8;
        const headY = trainY + 15 + Math.cos(frame * 0.1) * 4;

        // Draw head
        ctx.beginPath();
        ctx.arc(headX, headY, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Glowing orange eyes on centipede head
        ctx.fillStyle = '#ff4422';
        ctx.beginPath();
        ctx.arc(headX + 4, headY - 3, 2, 0, Math.PI * 2);
        ctx.arc(headX + 4, headY + 3, 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw body segments
        ctx.fillStyle = 'rgba(10, 30, 20, 0.9)';
        ctx.strokeStyle = 'rgba(42, 255, 136, 0.6)';
        for (let b = 1; b <= centipedeLength; b++) {
          const segX = headX - b * 14;
          const segY = headY + Math.sin(frame * 0.1 + b * 0.5) * 6;
          ctx.beginPath();
          ctx.arc(segX, segY, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Centipede spike legs
          ctx.strokeStyle = '#2aff88';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(segX, segY + 6);
          ctx.lineTo(segX - 3, segY + 12);
          ctx.moveTo(segX, segY - 6);
          ctx.lineTo(segX - 3, segY - 12);
          ctx.stroke();
        }

      } else if (currentSegIdx === 2) {
        // --- Segment 3: Rift Rat Invaders (Hover Platforms) ---
        const platformCount = 4;
        const spacingX = w * 0.12;

        for (let p = 0; p < platformCount; p++) {
          const platX = trainX + p * spacingX + Math.sin(frame * 0.04 + p) * 15;
          const platY = 35 + Math.cos(frame * 0.06 + p) * 6;

          // Draw platform body (sleek octagon or box)
          ctx.fillStyle = '#0f172a';
          ctx.strokeStyle = '#8a2aff';
          ctx.lineWidth = 1.5;
          ctx.fillRect(platX - 16, platY - 6, 32, 12);
          ctx.strokeRect(platX - 16, platY - 6, 32, 12);

          // Quad rotors
          ctx.strokeStyle = '#b8c0cc';
          ctx.lineWidth = 1;
          const drawRotor = (rx: number, ry: number) => {
            ctx.beginPath();
            ctx.arc(rx, ry, 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(rx - Math.cos(frame * 0.3) * 5, ry - Math.sin(frame * 0.3) * 5);
            ctx.lineTo(rx + Math.cos(frame * 0.3) * 5, ry + Math.sin(frame * 0.3) * 5);
            ctx.stroke();
          };
          drawRotor(platX - 20, platY - 6);
          drawRotor(platX + 20, platY - 6);

          // Glowing purple cockpit
          ctx.fillStyle = '#bb88ff';
          ctx.beginPath();
          ctx.arc(platX, platY, 3, 0, Math.PI * 2);
          ctx.fill();

          // Drop a sky-diver on repel cable occasionally
          ctx.strokeStyle = 'rgba(138, 42, 255, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(platX, platY + 6);
          ctx.lineTo(platX, platY + 60);
          ctx.stroke();

          // Sky-diver hanging
          ctx.fillStyle = '#ff4422';
          ctx.beginPath();
          ctx.arc(platX, platY + 60, 3, 0, Math.PI * 2);
          ctx.fill();
        }

      } else if (currentSegIdx === 4) {
        // --- Segment 5: Boss Raid (Taur-Nefarian Rail Vanguard) ---
        const bossX = w * 0.72;
        const bossY = trainY - 20;

        // Draw Void Forcefield Hex Shield Wall in front of train
        const shieldX = w * 0.62;
        ctx.strokeStyle = '#ff2244';
        ctx.fillStyle = 'rgba(255, 34, 68, 0.05)';
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        ctx.moveTo(shieldX, trainY - 45);
        ctx.lineTo(shieldX + 15, trainY - 20);
        ctx.lineTo(shieldX + 15, trainY + 10);
        ctx.lineTo(shieldX, trainY + 35);
        ctx.lineTo(shieldX - 15, trainY + 10);
        ctx.lineTo(shieldX - 15, trainY - 20);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw Boss Mecha (Taur-Nefarian Rail Vanguard)
        ctx.fillStyle = '#1e1b4b';
        ctx.strokeStyle = '#ff2244';
        ctx.lineWidth = 2;
        
        // Torso/Body
        ctx.fillRect(bossX - 15, bossY, 30, 45);
        ctx.strokeRect(bossX - 15, bossY, 30, 45);

        // Head with glowing red horns
        ctx.fillStyle = '#0f0c24';
        ctx.beginPath();
        ctx.arc(bossX, bossY - 12, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Horns
        ctx.strokeStyle = '#ff2244';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bossX - 4, bossY - 18);
        ctx.lineTo(bossX - 10, bossY - 25);
        ctx.moveTo(bossX + 4, bossY - 18);
        ctx.lineTo(bossX + 10, bossY - 25);
        ctx.stroke();

        // Heavy shield left arm
        ctx.fillStyle = '#312e81';
        ctx.fillRect(bossX - 25, bossY + 8, 8, 25);
        ctx.strokeRect(bossX - 25, bossY + 8, 8, 25);

        // Heavy weapon right arm charging crimson blast
        ctx.fillStyle = '#312e81';
        ctx.fillRect(bossX + 17, bossY + 8, 8, 20);
        ctx.strokeRect(bossX + 17, bossY + 8, 8, 20);

        // Red orb spark charging
        ctx.fillStyle = '#ff2244';
        ctx.shadowColor = '#ff2244';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(bossX + 21, bossY + 28, 4 + Math.sin(frame * 0.1) * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // Reset

      } else if (currentSegIdx === 5) {
        // --- Segment 6 / Ending: Sector 9 Horizon approaching ---
        const cityX = w * 0.75;
        ctx.fillStyle = '#080c14';
        ctx.strokeStyle = '#2affee';
        ctx.lineWidth = 1;

        // Draw futuristic towers on horizon
        ctx.fillRect(cityX - 20, h - 120, 15, 90);
        ctx.strokeRect(cityX - 20, h - 120, 15, 90);

        ctx.fillRect(cityX, h - 150, 22, 120);
        ctx.strokeRect(cityX, h - 150, 22, 120);

        ctx.fillRect(cityX + 28, h - 90, 12, 60);
        ctx.strokeRect(cityX + 28, h - 90, 12, 60);

        // Dome outline
        ctx.strokeStyle = 'rgba(42, 255, 238, 0.35)';
        ctx.beginPath();
        ctx.arc(cityX + 10, h - 30, 45, Math.PI, 0);
        ctx.stroke();

        // City lights blinking
        ctx.fillStyle = '#2affee';
        for (let l = 0; l < 5; l++) {
          if (frame % 30 < 15) {
            ctx.fillRect(cityX - 15, h - 110 + l * 15, 2, 2);
            ctx.fillRect(cityX + 5, h - 140 + l * 15, 2, 2);
            ctx.fillRect(cityX + 12, h - 130 + l * 15, 2, 2);
          }
        }
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [currentSegIdx, showIntro, turretsActive, hullIntegrity]);

  // Choice handlers representing Segment logics
  const advanceSegment = (logMsg: string, nextCardId?: string) => {
    addLog(logMsg, true);
    if (nextCardId && !ownedCards.has(nextCardId)) {
      setPendingCardId(nextCardId);
    } else {
      const nextIdx = currentSegIdx + 1;
      if (nextIdx < SEGS.length) {
        setCurrentSegIdx(nextIdx);
      }
    }
  };

  const handleClaimCard = () => {
    if (!pendingCardId) return;
    setOwnedCards(prev => {
      const n = new Set(prev);
      n.add(pendingCardId);
      return n;
    });
    setCardsEarned(prev => prev + 1);
    addLog(`CARD CLAIMED: ${CARDS.find(c => c.id === pendingCardId)?.name}`, true);
    setPendingCardId(null);
    
    // Automatically advance segment index after card is claimed
    const nextIdx = currentSegIdx + 1;
    if (nextIdx < SEGS.length) {
      setCurrentSegIdx(nextIdx);
    }
  };

  const handleCloseCard = () => {
    setPendingCardId(null);
    const nextIdx = currentSegIdx + 1;
    if (nextIdx < SEGS.length) {
      setCurrentSegIdx(nextIdx);
    }
  };

  // Choice Handler Methods
  // --- SEGMENT 1 ---
  const s1Turret = () => {
    setTurretsActive(prev => {
      const t = [...prev];
      t[0] = true;
      return t;
    });
    setThreatLevel(prev => Math.max(0, prev - 10));
    advanceSegment('TUR-A1: ONLINE. Forward defense active. Threat level −10.', 'engineer');
  };

  const s1Scout = () => {
    setThreatLevel(prev => Math.max(0, prev - 5));
    setTrainProgress(prev => prev + 10);
    advanceSegment('WARLOCK RECON: Rift Rat platform positions mapped. Intel advantage. Threat −5.', 'engineer');
  };

  const s1Go = () => {
    setTrainProgress(prev => prev + 20);
    setThreatLevel(prev => prev + 10);
    advanceSegment('IMMEDIATE DEPARTURE: Train moving forward at acceleration. Threat +10.', 'engineer');
  };

  // --- SEGMENT 2 ---
  const s2Hold = () => {
    setHullIntegrity(prev => Math.max(0, prev - 15));
    setCentipedeKills(prev => prev + 8);
    setTrainProgress(prev => prev + 15);
    advanceSegment('REAR HOLD: Rail Heavy armor Vanguard absorbs 8 segments. Hull damage −15%.', 'heavy');
  };

  const s2TurretF = () => {
    setTurretsActive(prev => {
      const t = [...prev];
      t[5] = true;
      return t;
    });
    setCentipedeKills(prev => prev + 12);
    setTrainProgress(prev => prev + 20);
    advanceSegment('TUR-F6 ONLINE: Rear-facing turret chain fire. 12 segments destroyed.', 'heavy');
  };

  const s2Suppress = () => {
    setCentipedeKills(prev => prev + 10);
    setHullIntegrity(prev => Math.max(0, prev - 5));
    setTrainProgress(prev => prev + 15);
    advanceSegment('RIFT SUPPRESSION: Centipede slowed. 10 segments shattered. Hull damage −5%.', 'heavy');
  };

  // --- SEGMENT 3 ---
  const s3Glitch = () => {
    setInvaderKills(prev => prev + 10);
    setHullIntegrity(prev => Math.max(0, prev - 10));
    setTrainProgress(prev => prev + 20);
    advanceSegment('GLITCH WITCH HACK: 10 platforms weapons rerouted to fire back. Hull −10.', 'swampwitch');
  };

  const s3Siren = () => {
    setInvaderKills(prev => prev + 8);
    setThreatLevel(prev => Math.max(0, prev - 15));
    setTrainProgress(prev => prev + 20);
    advanceSegment('SIREN SONIC PULSE: Intercepted 4 sky-diver descents. Threat level −15.', 'swampwitch');
  };

  const s3SkyInt = () => {
    setInvaderKills(prev => prev + 12);
    setTrainProgress(prev => prev + 20);
    advanceSegment('SKY-DIVER INTERCEPT: Counter-dive severing 4 cables cleanly in mid-air.', 'swampwitch');
  };

  // --- SEGMENT 4 ---
  const s4Chain = () => {
    setTurretsActive([true, true, true, true, true, true]);
    setThreatLevel(prev => prev + 20);
    setTrainProgress(prev => prev + 20);
    advanceSegment('FULL TURRET CHAIN: All 6 nodes initialized. Defense secure. Boss alerted. Threat +20.', 'glitch');
  };

  const s4Select = () => {
    setTurretsActive(prev => {
      const t = [...prev];
      t[1] = true; t[2] = true; t[3] = true;
      return t;
    });
    setThreatLevel(prev => Math.max(0, prev - 10));
    setTrainProgress(prev => prev + 15);
    advanceSegment('SELECTIVE ACTIVATION: 3 nodes online. Stealth preserved. Threat −10.', 'glitch');
  };

  const s4Deceive = () => {
    setTurretsActive(prev => {
      const t = [...prev];
      t[1] = true; t[2] = true; t[3] = true;
      return t;
    });
    setTrainProgress(prev => prev + 20);
    advanceSegment('C-4 NODE LOOP: Deceptive decoy network active. Boss completely unaware.', 'glitch');
  };

  // --- SEGMENT 5 ---
  const s5Oracle = () => {
    setBossPhase(1);
    setTrainProgress(prev => prev + 20);
    advanceSegment('ORACLE OVERRIDE: Void sigil barrier dissolved remotely. Phase 1 cleared.', 'siren');
  };

  const s5Assault = () => {
    setBossPhase(1);
    setHullIntegrity(prev => Math.max(0, prev - 10));
    setTrainProgress(prev => prev + 20);
    advanceSegment('COVEN ASSAULT: Heavy tactical blast breaks barrier. Phase 1 cleared. Hull −10.', 'siren');
  };

  const s5Counter = () => {
    setBossPhase(1);
    setThreatLevel(prev => Math.max(0, prev - 20));
    setTrainProgress(prev => prev + 20);
    advanceSegment('COUNTER-SIREN: Tactical awareness severed. Phase 1 cleared cleanly.', 'siren');
  };

  // --- ENDINGS TRIGGER (SEGMENT 6) ---
  const handleEnding = (key: string) => {
    const ending = ENDINGS[key];
    if (!ending) return;
    
    // Add missing ending cards to collection
    ending.cards.forEach(cardId => {
      if (!ownedCards.has(cardId)) {
        setOwnedCards(prev => {
          const n = new Set(prev);
          n.add(cardId);
          return n;
        });
        setCardsEarned(prev => prev + 1);
      }
    });

    setTrainProgress(100);
    setActiveEnding(ending);
    addLog(`EPISODE III CONCLUDED — ${ending.title}`, true);
  };

  const handleRestart = () => {
    setShowIntro(true);
    setIntroProgress(0);
    setCurrentSegIdx(0);
    setTrainProgress(0);
    setHullIntegrity(100);
    setThreatLevel(0);
    setCardsEarned(1);
    setOwnedCards(new Set(['escort']));
    setPendingCardId(null);
    setTurretsActive([false, false, false, false, false, false]);
    setCentipedeKills(0);
    setInvaderKills(0);
    setBossPhase(0);
    setBossDefeated(false);
    setLogs([]);
    setActiveEnding(null);
  };

  const activeSegment = SEGS[currentSegIdx];

  const handleChoiceClick = (fnName: string) => {
    playBeep(600, 0.1, 'sine', 0.03);
    
    if (fnName === 's1Turret') s1Turret();
    else if (fnName === 's1Scout') s1Scout();
    else if (fnName === 's1Go') s1Go();
    else if (fnName === 's2Hold') s2Hold();
    else if (fnName === 's2TurretF') s2TurretF();
    else if (fnName === 's2Suppress') s2Suppress();
    else if (fnName === 's3Glitch') s3Glitch();
    else if (fnName === 's3Siren') s3Siren();
    else if (fnName === 's3SkyInt') s3SkyInt();
    else if (fnName === 's4Chain') s4Chain();
    else if (fnName === 's4Select') s4Select();
    else if (fnName === 's4Deceive') s4Deceive();
    else if (fnName === 's5Oracle') s5Oracle();
    else if (fnName === 's5Assault') s5Assault();
    else if (fnName === 's5Counter') s5Counter();
    else if (fnName === 'e3EndClean') handleEnding('e3EndClean');
    else if (fnName === 'e3EndHeroic') handleEnding('e3EndHeroic');
    else if (fnName === 'e3EndCovert') handleEnding('e3EndCovert');
  };

  return (
    <div className="relative w-full h-full bg-[#04050a] text-[#b8c0cc] flex flex-col font-sans select-none overflow-hidden z-25">
      
      {/* SCANLINE FILTER OVERLAY */}
      <div className="absolute inset-0 bg-scanlines pointer-events-none z-40 opacity-[0.04]" />

      {/* INTRO OVERLAY */}
      <AnimatePresence>
        {showIntro && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[#04050a] flex flex-col items-center justify-center gap-4 p-6"
          >
            <span className="text-[10px] text-zinc-500 font-mono tracking-[0.38em] uppercase animate-pulse">
              ◈ CST-ERT DEPT — ASTRONOMICAL SOCIETY ◈
            </span>
            <span className="text-[10px] text-orange-500 font-mono tracking-widest uppercase text-center max-w-md leading-relaxed">
              WAMAT DIVISION — ALT DC RAIL OPERATIONS — OMEGA CLEARANCE
            </span>
            
            <h1 className="text-xl sm:text-3xl font-bold font-serif text-[#f0cc6a] text-center tracking-wide leading-tight uppercase drop-shadow-[0_0_15px_rgba(200,168,74,0.4)] mt-2">
              Cold Brew<br />
              <span className="text-sm tracking-widest font-mono text-zinc-400">Mystics of Mayhem</span>
            </h1>
            <span className="text-xs font-serif text-[#ff88bb] tracking-widest uppercase">
              Episode III — Rail Extraction
            </span>

            <div className="w-48 h-1 bg-zinc-900 overflow-hidden rounded-full mt-4 border border-zinc-850">
              <motion.div 
                className="h-full bg-gradient-to-r from-pink-500 to-[#f0cc6a]"
                initial={{ width: '0%' }}
                animate={{ width: `${introProgress}%` }}
              />
            </div>

            <span className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest mt-1">
              Commander Antonio // Train Escort Protocols Active
            </span>

            {/* Quick skip button */}
            <button 
              onClick={() => setIntroProgress(100)}
              className="px-3 py-1 border border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 rounded text-[9px] font-mono text-zinc-400 uppercase tracking-widest mt-6 transition cursor-pointer"
            >
              Skip Loading
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CARD CAPTOR REWARD MODAL */}
      <AnimatePresence>
        {pendingCardId && (
          <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-sm w-full bg-[#080c14] border-2 border-[#c8a84a] rounded-lg shadow-[0_0_30px_rgba(200,168,74,0.3)] overflow-hidden flex flex-col"
            >
              <div className="p-3 bg-[#c8a84a]/10 border-b border-[#c8a84a]/30 font-mono text-[10px] font-bold text-[#f0cc6a] tracking-widest uppercase">
                ◈ CARD CAPTOR — NEW CARD ACQUIRED
              </div>

              {/* Card visual showcase */}
              <div className="w-full aspect-[4/3] bg-zinc-900 flex flex-col items-center justify-center relative p-4">
                <div className="absolute inset-0 bg-gradient-to-t from-[#080c14] via-transparent to-transparent z-10" />
                
                {/* Visual Placeholder card layout */}
                <div className="w-28 h-36 border border-[#c8a84a]/50 rounded bg-[#0c1020] flex flex-col justify-between p-2 shadow-xl z-20">
                  <div className="text-right text-[8px] font-mono text-[#f0cc6a] uppercase tracking-widest">
                    {CARDS.find(c => c.id === pendingCardId)?.rarity}
                  </div>
                  <div className="text-center text-3xl my-2">
                    {CARDS.find(c => c.id === pendingCardId)?.icon}
                  </div>
                  <div>
                    <div className="text-[9px] font-bold font-mono text-zinc-200 truncate uppercase">
                      {CARDS.find(c => c.id === pendingCardId)?.name}
                    </div>
                    <div className="text-[8px] font-mono text-emerald-400 font-bold mt-0.5">
                      {CARDS.find(c => c.id === pendingCardId)?.bonus}
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-3 left-4 right-4 text-center z-20">
                  <h2 className="font-serif text-sm font-bold text-[#f0cc6a] tracking-wide uppercase">
                    {CARDS.find(c => c.id === pendingCardId)?.name}
                  </h2>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2 mb-4">
                  <div className="text-[10px] font-mono text-emerald-400 tracking-wider">
                    BONUS: {CARDS.find(c => c.id === pendingCardId)?.bonus} &nbsp;|&nbsp; RARITY: {CARDS.find(c => c.id === pendingCardId)?.rarity.toUpperCase()}
                  </div>
                  <p className="text-xs text-zinc-400 font-mono leading-relaxed">
                    {CARDS.find(c => c.id === pendingCardId)?.desc}
                  </p>
                </div>

                <div className="flex gap-2 border-t border-zinc-850 pt-3">
                  <button 
                    onClick={handleClaimCard}
                    className="flex-1 py-2 bg-[#c8a84a] hover:bg-[#f0cc6a] text-black font-bold font-mono text-xs uppercase tracking-widest rounded transition cursor-pointer"
                  >
                    Claim Card
                  </button>
                  <button 
                    onClick={handleCloseCard}
                    className="px-3 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white font-mono text-xs uppercase rounded transition cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ENDING OVERLAY */}
      <AnimatePresence>
        {activeEnding && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-[#04050a]/98 z-50 flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="max-w-md w-full bg-[#080c14] border border-[#c8a84a] rounded-lg p-6 flex flex-col items-center gap-4 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-pink-500 via-[#c8a84a] to-cyan-500" />
              
              <Award className="text-[#f0cc6a] w-12 h-12 animate-bounce" />
              
              <h1 className="font-serif text-lg sm:text-xl font-bold text-[#f0cc6a] uppercase tracking-wide">
                {activeEnding.title}
              </h1>

              <div className="p-2 border border-orange-500/30 bg-orange-500/5 font-mono text-[9px] text-[#ff9944] tracking-widest uppercase">
                {activeEnding.ratingKey}
              </div>

              <p className="text-xs leading-relaxed text-zinc-400 font-mono text-justify bg-zinc-950/50 p-4 rounded border border-zinc-900">
                {activeEnding.desc}
              </p>

              <div className="w-full space-y-2 border-t border-zinc-850 pt-4">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
                  Final Deck Expansion:
                </span>
                <div className="flex flex-wrap gap-2 justify-center">
                  {activeEnding.cards.map(id => {
                    const c = CARDS.find(x => x.id === id);
                    return c ? (
                      <span key={id} className="px-2.5 py-1 bg-zinc-950 border border-zinc-850 rounded text-[10px] font-mono text-zinc-300">
                        {c.icon} {c.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>

              <div className="flex gap-2.5 w-full border-t border-zinc-850 pt-4 mt-2">
                <button 
                  onClick={handleRestart}
                  className="flex-1 py-2.5 bg-gradient-to-r from-orange-600 to-[#F27D26] text-white font-bold font-mono text-xs uppercase tracking-widest rounded shadow-md hover:shadow-orange-500/20 transition cursor-pointer"
                >
                  Restart Episode III
                </button>
                <button 
                  onClick={onExit}
                  className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white font-mono text-xs uppercase rounded transition cursor-pointer"
                >
                  Exit to Lounge
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP BAR */}
      <header className="relative flex items-center justify-between px-4 h-11 bg-black/95 border-b border-[#141828] z-20">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono tracking-[0.2em] text-zinc-500 uppercase">
            CST-ERT ◈ WAMAT DIV.
          </span>
          <div className="w-[1px] h-4 bg-[#141828]" />
          <h1 className="font-serif text-xs sm:text-sm font-bold text-[#f0cc6a] tracking-wider uppercase">
            Cold Brew: Mystics of Mayhem — Episode III
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block px-2.5 py-0.5 border border-orange-500/30 bg-orange-500/5 text-orange-400 font-mono text-[9px] tracking-wider rounded">
            WAMAT ALT DC
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse shadow-[0_0_6px_#ff4488]" />
            <span className="font-mono text-[9px] text-pink-500 uppercase tracking-widest font-bold">
              {hullIntegrity <= 25 ? '⚠ HULL CRITICAL' : threatLevel >= 75 ? '⚠ THREAT MAX' : 'RAIL ESCORT LIVE'}
            </span>
          </div>

          <button 
            onClick={onExit}
            className="p-1 border border-zinc-800 rounded hover:border-zinc-700 text-zinc-500 hover:text-white transition cursor-pointer"
            title="Exit Simulator"
          >
            <LogOut size={13} />
          </button>
        </div>
      </header>

      {/* MIDDLE CONTAINER: GRID LAYOUT FOR SIDE-PANELS & VIEWPORT */}
      <div className="flex-1 flex relative min-h-0">
        
        {/* LEFT NAV BAR (ICONS FOR PANEL SELECTION) */}
        <nav className="w-11 bg-black/90 border-r border-[#141828] py-3 flex flex-col items-center gap-2.5 z-20">
          {/* Micro Mini HUD */}
          <div className="flex flex-col gap-2.5 w-full px-1.5 pb-2.5 border-b border-zinc-900">
            <div className="flex flex-col items-center gap-0.5" title={`Train Progress: ${trainProgress}%`}>
              <span className="text-[7px] font-mono text-zinc-500">TRN</span>
              <div className="w-6 h-1 bg-zinc-900 rounded overflow-hidden">
                <div className="h-full bg-pink-500" style={{ width: `${trainProgress}%` }} />
              </div>
            </div>
            <div className="flex flex-col items-center gap-0.5" title={`Hull Integrity: ${hullIntegrity}%`}>
              <span className="text-[7px] font-mono text-zinc-500">HUL</span>
              <div className="w-6 h-1 bg-zinc-900 rounded overflow-hidden">
                <div className={`h-full ${hullIntegrity <= 30 ? 'bg-red-500 animate-pulse' : 'bg-emerald-400'}`} style={{ width: `${hullIntegrity}%` }} />
              </div>
            </div>
            <div className="flex flex-col items-center gap-0.5" title={`Threat Level: ${threatLevel}%`}>
              <span className="text-[7px] font-mono text-zinc-500">THR</span>
              <div className="w-6 h-1 bg-zinc-900 rounded overflow-hidden">
                <div className="h-full bg-rose-500" style={{ width: `${threatLevel}%` }} />
              </div>
            </div>
          </div>

          <button 
            onClick={() => setLeftPanel(leftPanel === 'oracle' ? null : 'oracle')}
            className={`w-7 h-7 flex items-center justify-center border rounded transition cursor-pointer relative group ${leftPanel === 'oracle' ? 'border-[#f0cc6a] text-[#f0cc6a] bg-[#c8a84a]/5' : 'border-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
          >
            <Activity size={13} />
            <span className="absolute left-9 bg-black/90 text-zinc-400 border border-zinc-850 px-2 py-1 rounded text-[8px] font-mono uppercase tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none">
              Oracle Intel
            </span>
          </button>

          <button 
            onClick={() => setLeftPanel(leftPanel === 'coven' ? null : 'coven')}
            className={`w-7 h-7 flex items-center justify-center border rounded transition cursor-pointer relative group ${leftPanel === 'coven' ? 'border-[#f0cc6a] text-[#f0cc6a] bg-[#c8a84a]/5' : 'border-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
          >
            <Compass size={13} />
            <span className="absolute left-9 bg-black/90 text-zinc-400 border border-zinc-850 px-2 py-1 rounded text-[8px] font-mono uppercase tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none">
              Coven Roster
            </span>
          </button>

          <button 
            onClick={() => setLeftPanel(leftPanel === 'threats' ? null : 'threats')}
            className={`w-7 h-7 flex items-center justify-center border rounded transition cursor-pointer relative group ${leftPanel === 'threats' ? 'border-[#f0cc6a] text-[#f0cc6a] bg-[#c8a84a]/5' : 'border-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
          >
            <AlertTriangle size={13} />
            <span className="absolute left-9 bg-black/90 text-zinc-400 border border-zinc-850 px-2 py-1 rounded text-[8px] font-mono uppercase tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none">
              Threat intel
            </span>
          </button>

          <div className="w-5 h-[1px] bg-zinc-900 my-1" />

          <button 
            onClick={() => setLeftPanel(leftPanel === 'wamat' ? null : 'wamat')}
            className={`w-7 h-7 flex items-center justify-center border rounded transition cursor-pointer relative group ${leftPanel === 'wamat' ? 'border-[#f0cc6a] text-[#f0cc6a] bg-[#c8a84a]/5' : 'border-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
          >
            <Layers size={13} />
            <span className="absolute left-9 bg-black/90 text-zinc-400 border border-zinc-850 px-2 py-1 rounded text-[8px] font-mono uppercase tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none">
              WAMAT Orders
            </span>
          </button>

          <button 
            onClick={() => setLeftPanel(leftPanel === 'log' ? null : 'log')}
            className={`w-7 h-7 flex items-center justify-center border rounded transition cursor-pointer relative group ${leftPanel === 'log' ? 'border-[#f0cc6a] text-[#f0cc6a] bg-[#c8a84a]/5' : 'border-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
          >
            <Terminal size={13} />
            <span className="absolute left-9 bg-black/90 text-zinc-400 border border-zinc-850 px-2 py-1 rounded text-[8px] font-mono uppercase tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none">
              Mission Log
            </span>
          </button>
        </nav>

        {/* SLIDING LEFT PANEL */}
        <AnimatePresence>
          {leftPanel && (
            <motion.div 
              initial={{ x: -250, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -250, opacity: 0 }}
              className="absolute left-11 top-0 bottom-0 w-80 bg-black/98 border-r border-[#141828] z-30 flex flex-col p-4 overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-4">
                <span className="text-xs font-mono font-bold tracking-widest text-[#f0cc6a] uppercase">
                  {leftPanel === 'oracle' && 'ORACLE INTEL NODE'}
                  {leftPanel === 'coven' && 'COVEN ROSTER'}
                  {leftPanel === 'threats' && 'TACTICAL THREAT INFO'}
                  {leftPanel === 'wamat' && 'WAMAT DIRECTIVE'}
                  {leftPanel === 'log' && 'COMMUNICATION FEED'}
                </span>
                <button 
                  onClick={() => setLeftPanel(null)}
                  className="p-0.5 border border-zinc-800 rounded bg-zinc-950 text-zinc-500 hover:text-zinc-300 text-[10px] px-1.5 font-mono cursor-pointer"
                >
                  [X] Close
                </button>
              </div>

              {/* Conditional Panel Contents */}
              {leftPanel === 'oracle' && (
                <div className="space-y-4 font-mono">
                  <div className="flex items-center gap-2 bg-[#2affee]/5 p-2 rounded border border-[#2affee]/10">
                    <Activity className="text-[#2affee] w-4 h-4" />
                    <div>
                      <h4 className="text-xs text-[#2affee] font-bold">Oracle AVX Neural Link</h4>
                      <span className="text-[7.5px] text-zinc-500 tracking-wider">SECURE GRID TRANSMISSION</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 border border-zinc-900 bg-zinc-950/40">
                      <span className="text-[8px] text-zinc-500">TRAIN PROGRESS</span>
                      <div className="text-sm font-bold text-pink-400">{trainProgress}%</div>
                      <div className="w-full bg-zinc-900 h-1 rounded mt-1.5">
                        <div className="bg-pink-500 h-full" style={{ width: `${trainProgress}%` }} />
                      </div>
                    </div>
                    <div className="p-2 border border-zinc-900 bg-zinc-950/40">
                      <span className="text-[8px] text-zinc-500">HULL INTEGRITY</span>
                      <div className={`text-sm font-bold ${hullIntegrity <= 30 ? 'text-red-400' : 'text-emerald-400'}`}>{hullIntegrity}%</div>
                      <div className="w-full bg-zinc-900 h-1 rounded mt-1.5">
                        <div className={`h-full ${hullIntegrity <= 30 ? 'bg-red-500' : 'bg-emerald-400'}`} style={{ width: `${hullIntegrity}%` }} />
                      </div>
                    </div>
                    <div className="p-2 border border-zinc-900 bg-zinc-950/40">
                      <span className="text-[8px] text-zinc-500">THREAT FEED</span>
                      <div className="text-sm font-bold text-rose-500">{threatLevel}%</div>
                      <div className="w-full bg-zinc-900 h-1 rounded mt-1.5">
                        <div className="bg-rose-500 h-full" style={{ width: `${threatLevel}%` }} />
                      </div>
                    </div>
                    <div className="p-2 border border-zinc-900 bg-zinc-950/40">
                      <span className="text-[8px] text-zinc-500">CARDS EXPANSION</span>
                      <div className="text-sm font-bold text-[#f0cc6a]">{cardsEarned}/{CARDS.length}</div>
                      <div className="w-full bg-zinc-900 h-1 rounded mt-1.5">
                        <div className="bg-[#f0cc6a] h-full" style={{ width: `${(cardsEarned/CARDS.length)*100}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-[8.5px] text-zinc-500 border-t border-zinc-900 pt-3">
                    <div>TURRETS COMPLETED: {turretsActive.filter(Boolean).length}/6 ACTIVE</div>
                    <div>ACTIVE BOSS MATRIX: {bossPhase > 0 ? `PHASE ${bossPhase}` : 'STANDBY'}</div>
                    <div>COVEN COHERENCY STATUS: 100% NOMINAL</div>
                  </div>
                </div>
              )}

              {leftPanel === 'coven' && (
                <div className="space-y-2">
                  {COVEN.map(m => (
                    <div key={m.name} className="flex items-center gap-3 p-2 bg-[#0c1020]/40 border border-zinc-900 rounded">
                      <div className="w-7 h-7 bg-zinc-900 rounded-full border border-zinc-800 flex items-center justify-center text-xs">
                        {m.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className={`text-xs font-bold font-mono ${m.colorClass}`}>{m.name}</h4>
                        <span className="text-[8px] text-zinc-500 font-mono tracking-widest uppercase">{m.role}</span>
                      </div>
                      <span className="text-xs font-mono text-zinc-400">{m.hp}%</span>
                    </div>
                  ))}
                </div>
              )}

              {leftPanel === 'threats' && (
                <div className="space-y-3">
                  {THREATS.map(t => (
                    <div key={t.id} className={`p-2 border-l-2 rounded bg-zinc-950 ${t.colorClass}`}>
                      <h4 className="text-xs font-bold font-mono">{t.name}</h4>
                      <p className="text-[9px] text-zinc-400 font-mono mt-1 leading-relaxed">{t.desc}</p>
                      <span className="text-[7.5px] text-zinc-500 font-mono block mt-2 tracking-wider">{t.stat}</span>
                    </div>
                  ))}
                </div>
              )}

              {leftPanel === 'wamat' && (
                <div className="space-y-3 font-mono text-[9px] text-zinc-400">
                  <div className="p-2 border border-orange-500/20 bg-orange-500/5 rounded">
                    <h4 className="text-xs font-bold text-orange-400 mb-1">WAMAT ALT DC BRANCH</h4>
                    <p className="leading-relaxed">Washington Area Mystic Assault Team. Alternate DC sector operations are under direct OMEGA directive. Maintain high-load cargo assets at all costs.</p>
                  </div>

                  <div className="space-y-1 bg-zinc-950 p-2 border border-zinc-900">
                    <div className="flex justify-between border-b border-zinc-900 pb-1">
                      <span>COMMANDER:</span><span className="text-orange-400">Antonio</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-900 pb-1">
                      <span>TACTICAL ASSET:</span><span className="text-white">Cold Brew Coven</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-900 pb-1">
                      <span>DESTINATION:</span><span className="text-cyan-400">Sector 9 Terminus</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CLEARANCE:</span><span className="text-pink-400 font-bold">OMEGA</span>
                    </div>
                  </div>

                  <div className="p-2 border border-zinc-900 bg-zinc-950/20">
                    <span className="text-[8px] font-bold text-zinc-500">COMMAND RULESET:</span>
                    <p className="mt-1 leading-relaxed">Train hull integrity must remain above 40%. Direct combat with any and all flanking interceptors is mandatory.</p>
                  </div>
                </div>
              )}

              {leftPanel === 'log' && (
                <div className="flex-1 flex flex-col justify-between min-h-0">
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {logs.length === 0 ? (
                      <span className="text-[10px] font-mono text-zinc-600 italic">No direct transmission packets received...</span>
                    ) : (
                      logs.map((log, index) => (
                        <div key={index} className={`font-mono text-[9px] pl-2 border-l ${log.fresh ? 'border-[#f0cc6a] text-zinc-200' : 'border-zinc-900 text-zinc-500'} leading-relaxed`}>
                          ▸ {log.msg}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CENTER VIEWPORT (IMMERSIVE COMBAT OVERLAY STAGE) */}
        <div className="flex-1 flex flex-col relative bg-[#080c14] min-h-0">
          
          {/* THE 2D SIMULATION CANVAS STAGE */}
          <div className="flex-1 w-full relative min-h-[160px] overflow-hidden">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block outline-none pointer-events-auto" />
            
            {/* Visual gradient filter on canvas boundary */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-transparent to-black/25 pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

            {/* Segment status overlays in stage corner */}
            <div className="absolute top-3 left-4 bg-black/75 border border-zinc-900 px-3 py-1.5 rounded font-mono text-[9px] tracking-widest text-[#2affee] flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#2affee] rounded-full animate-pulse" />
              <span>{activeSegment?.tag}</span>
            </div>

            <div className="absolute top-3 right-4 bg-black/75 border border-zinc-900 px-3 py-1.5 rounded font-mono text-[9px] tracking-widest text-zinc-400">
              {activeSegment?.num}
            </div>

            {/* Dynamic lore overlay badge based on segment */}
            <div className="absolute bottom-12 left-4 max-w-sm bg-black/80 border border-zinc-900 p-2.5 rounded backdrop-blur-md">
              <span className="text-[8px] font-mono text-pink-500 uppercase tracking-widest">
                WAMAT Alt DC Tactical Feed:
              </span>
              <h4 className="font-serif text-xs font-bold text-zinc-200 tracking-wide mt-0.5">
                {activeSegment?.title}
              </h4>
            </div>
          </div>

          {/* LOWER RAIL THREAT FEED TICKER */}
          <div className="h-7 border-y border-[#141828] bg-black flex items-center overflow-hidden shrink-0">
            <div className="px-3 border-r border-[#141828] font-mono text-[8.5px] tracking-widest text-pink-500 flex items-center gap-1 shrink-0">
              <Radio size={11} className="animate-pulse" />
              RAIL THREAT FEED
            </div>
            <div className="flex-1 overflow-hidden relative">
              <div className="flex items-center gap-12 whitespace-nowrap animate-ticker font-mono text-[9px] text-zinc-500 uppercase tracking-wider pl-4">
                <span className="text-red-400">RIFT RAT HOVER PLATFORMS: 4 DETECTED — SECTOR 7</span>
                <span className="text-amber-400">CENTIPEDE FORMATION: SEGMENT 12 — REAR APPROACH</span>
                <span>TURRET NODE C-4: OFFLINE — MANUAL ACTIVATION REQUIRED</span>
                <span className="text-red-400">BOSS ENTITY: TAUR-NUPHARI VANGUARD — RAIL BRIDGE</span>
                <span>ALCHEMY SKY-DIVER: 2 UNITS — REPEL CABLES DEPLOYED</span>
                <span className="text-amber-400">CARD CAPTOR OPPORTUNITY: RAIL WARLOCK — SEGMENT 4</span>
                <span>WAMAT DIV. COMMAND: MAINTAIN EXTRACTION SCHEDULE</span>
                <span className="text-red-400">RIFT RAT INVADERS: WEAPONS TURRETS HOT — ROOFTOP</span>
              </div>
            </div>
          </div>

          {/* LOWER NARRATIVE & DECISION ZONE */}
          <div className="grid grid-cols-1 md:grid-cols-2 flex-1 min-h-0 bg-black/40">
            {/* Story Dialogue */}
            <div className="p-4 sm:p-5 border-r border-[#141828] overflow-y-auto flex flex-col justify-between">
              <div className="space-y-3.5 text-xs text-zinc-300 font-mono leading-relaxed max-w-prose">
                {activeSegment?.narrativeLines.map((line, idx) => (
                  <p key={idx}>{line}</p>
                ))}
              </div>

              {/* Glowing Oracle Console Prompt */}
              <div className="mt-4 p-2.5 border border-[#2affee]/20 bg-[#2affee]/5 font-mono text-[9px] text-[#2affee] leading-normal rounded shadow-[inset_0_0_10px_rgba(42,255,238,0.05)] whitespace-pre-line relative">
                {typedOracle}
                <span className="inline-block w-1.5 h-3.5 bg-[#2affee] ml-0.5 animate-pulse align-middle" />
              </div>
            </div>

            {/* Decisions Container */}
            <div className="p-4 sm:p-5 flex flex-col justify-center gap-3">
              <span className="text-[8.5px] font-mono tracking-widest text-zinc-500 uppercase block mb-1">
                ▸ SELECT TACTICAL RESPONSE
              </span>

              {activeSegment?.choices.map(choice => (
                <button
                  key={choice.key}
                  onClick={() => handleChoiceClick(choice.fn)}
                  className="w-full text-left border border-zinc-900 bg-zinc-950/40 hover:border-[#c8a84a]/50 hover:bg-[#c8a84a]/5 p-2.5 rounded transition duration-200 cursor-pointer flex items-center group relative overflow-hidden"
                >
                  <div className="w-8 h-8 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded text-xs text-[#c8a84a] group-hover:bg-[#c8a84a]/10 group-hover:text-[#f0cc6a] group-hover:border-[#c8a84a]/30 transition shrink-0 mr-3">
                    {choice.key}
                  </div>
                  <div className="flex-1 pr-4">
                    <h4 className="text-xs font-bold font-mono text-zinc-200 group-hover:text-[#f0cc6a] transition flex items-center gap-1.5">
                      <span>{choice.icon}</span>
                      <span>{choice.text}</span>
                    </h4>
                    <span className="text-[8px] text-zinc-500 font-mono tracking-wide mt-0.5 block group-hover:text-zinc-400">
                      {choice.fx}
                    </span>
                  </div>
                  <div className="text-zinc-600 group-hover:text-[#c8a84a] transition shrink-0">
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition duration-150" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* BOTTOM PROGRESS ROADMAP */}
          <div className="h-10 border-t border-[#141828] bg-black/95 px-5 flex items-center gap-4 overflow-x-auto shrink-0 scrollbar-none">
            {ROADMAP.map(r => (
              <div key={r.ph} className="flex items-center gap-2 px-3 py-1 bg-zinc-950 border border-zinc-900 rounded shrink-0">
                <span className="text-[9px] font-mono text-[#c8a84a]/60">{r.ph}</span>
                <span className={`text-[10px] font-mono font-semibold ${r.nm === 'Rail Extraction' ? 'text-pink-400' : 'text-zinc-400'}`}>
                  {r.nm}
                </span>
                <span className="text-[9px] font-mono text-zinc-500">{r.s}</span>
              </div>
            ))}
          </div>

        </div>

        {/* RIGHT NAV BAR (ICONS FOR PANEL SELECTION) */}
        <nav className="w-11 bg-black/90 border-l border-[#141828] py-3 flex flex-col items-center gap-2.5 z-20">
          <button 
            onClick={() => setRightPanel(rightPanel === 'cards' ? null : 'cards')}
            className={`w-7 h-7 flex items-center justify-center border rounded transition cursor-pointer relative group ${rightPanel === 'cards' ? 'border-[#f0cc6a] text-[#f0cc6a] bg-[#c8a84a]/5' : 'border-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
          >
            <Award size={13} />
            <span className="absolute right-9 bg-black/90 text-zinc-400 border border-zinc-850 px-2 py-1 rounded text-[8px] font-mono uppercase tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none">
              Card Captor Deck
            </span>
          </button>

          <button 
            onClick={() => setRightPanel(rightPanel === 'turrets' ? null : 'turrets')}
            className={`w-7 h-7 flex items-center justify-center border rounded transition cursor-pointer relative group ${rightPanel === 'turrets' ? 'border-[#f0cc6a] text-[#f0cc6a] bg-[#c8a84a]/5' : 'border-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
          >
            <Crosshair size={13} />
            <span className="absolute right-9 bg-black/90 text-zinc-400 border border-zinc-850 px-2 py-1 rounded text-[8px] font-mono uppercase tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none">
              Rail Turrets
            </span>
          </button>

          <button 
            onClick={() => setRightPanel(rightPanel === 'invaders' ? null : 'invaders')}
            className={`w-7 h-7 flex items-center justify-center border rounded transition cursor-pointer relative group ${rightPanel === 'invaders' ? 'border-[#f0cc6a] text-[#f0cc6a] bg-[#c8a84a]/5' : 'border-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
          >
            <Radio size={13} />
            <span className="absolute right-9 bg-black/90 text-zinc-400 border border-zinc-850 px-2 py-1 rounded text-[8px] font-mono uppercase tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none">
              Rift Rat Intel
            </span>
          </button>

          <div className="w-5 h-[1px] bg-zinc-900 my-1" />

          <button 
            onClick={() => setRightPanel(rightPanel === 'boss' ? null : 'boss')}
            className={`w-7 h-7 flex items-center justify-center border rounded transition cursor-pointer relative group ${rightPanel === 'boss' ? 'border-[#f0cc6a] text-[#f0cc6a] bg-[#c8a84a]/5' : 'border-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
          >
            <Skull size={13} />
            <span className="absolute right-9 bg-black/90 text-zinc-400 border border-zinc-850 px-2 py-1 rounded text-[8px] font-mono uppercase tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none">
              Boss Raid Log
            </span>
          </button>

          <button 
            onClick={() => setRightPanel(rightPanel === 'gallery' ? null : 'gallery')}
            className={`w-7 h-7 flex items-center justify-center border rounded transition cursor-pointer relative group ${rightPanel === 'gallery' ? 'border-[#f0cc6a] text-[#f0cc6a] bg-[#c8a84a]/5' : 'border-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
          >
            <Eye size={13} />
            <span className="absolute right-9 bg-black/90 text-zinc-400 border border-zinc-850 px-2 py-1 rounded text-[8px] font-mono uppercase tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none">
              Mission Gallery
            </span>
          </button>
        </nav>

        {/* SLIDING RIGHT PANEL */}
        <AnimatePresence>
          {rightPanel && (
            <motion.div 
              initial={{ x: 250, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 250, opacity: 0 }}
              className="absolute right-11 top-0 bottom-0 w-80 bg-black/98 border-l border-[#141828] z-30 flex flex-col p-4 overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-4">
                <span className="text-xs font-mono font-bold tracking-widest text-[#f0cc6a] uppercase">
                  {rightPanel === 'cards' && 'CARD CAPTOR DECK'}
                  {rightPanel === 'turrets' && 'RAIL TURRETS STATUS'}
                  {rightPanel === 'invaders' && 'RIFT RAT SPEC SHEET'}
                  {rightPanel === 'boss' && 'BOSS RAID PROFILE'}
                  {rightPanel === 'gallery' && 'MISSION GALLERY'}
                </span>
                <button 
                  onClick={() => setRightPanel(null)}
                  className="p-0.5 border border-zinc-800 rounded bg-zinc-950 text-zinc-500 hover:text-zinc-300 text-[10px] px-1.5 font-mono cursor-pointer"
                >
                  [X] Close
                </button>
              </div>

              {/* Conditional Panel Contents */}
              {rightPanel === 'cards' && (
                <div className="space-y-4">
                  <div className="text-[10px] font-mono text-zinc-500 tracking-wider">
                    OWNED: {ownedCards.size}/{CARDS.length} &nbsp;|&nbsp; CAPTURE CARDS TO EXPAND OPTIONS
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {CARDS.map(c => {
                      const owned = ownedCards.has(c.id);
                      return (
                        <div 
                          key={c.id} 
                          className={`aspect-[3/4] rounded relative overflow-hidden flex flex-col justify-end p-2 border transition ${owned ? 'border-[#c8a84a]/50 bg-[#0c1020]/40' : 'border-zinc-900 bg-zinc-950/20 opacity-35'}`}
                          title={c.desc}
                        >
                          <div className={`absolute top-1 right-1.5 text-[7px] font-mono font-bold px-1 rounded border ${c.rarity === 'legendary' ? 'text-[#f0cc6a] border-[#c8a84a]/50' : c.rarity === 'rare' ? 'text-cyan-400 border-cyan-800/40' : 'text-zinc-400 border-zinc-800'}`}>
                            {c.rarity[0].toUpperCase()}
                          </div>
                          
                          <div className="text-2xl text-center mb-4">
                            {owned ? c.icon : '🔒'}
                          </div>

                          <div className="z-10">
                            <h5 className="text-[9px] font-bold font-mono text-zinc-200 truncate uppercase">
                              {c.name}
                            </h5>
                            <span className="text-[7.5px] font-mono text-emerald-400 block truncate">
                              {owned ? c.bonus : 'LOCKED'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {rightPanel === 'turrets' && (
                <div className="space-y-3 font-mono">
                  <div className="p-2 border border-[#44ddff]/20 bg-[#44ddff]/5 rounded">
                    <h4 className="text-xs font-bold text-[#44ddff] mb-1">Defense Grid Integrity</h4>
                    <div className="w-full h-1 bg-zinc-900 rounded overflow-hidden mt-1.5">
                      <div className="h-full bg-[#44ddff]" style={{ width: `${(turretsActive.filter(Boolean).length/6)*100}%` }} />
                    </div>
                  </div>

                  {TURRETS.map((t, index) => {
                    const active = turretsActive[index];
                    return (
                      <div key={t.id} className={`p-2 border rounded ${active ? 'border-[#44ddff]/35 bg-[#44ddff]/5 border-l-2 border-l-[#44ddff]' : 'border-zinc-900 bg-zinc-950/30'}`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-[10px] font-bold ${active ? 'text-[#88eeff]' : 'text-zinc-500'}`}>
                            {t.label} — {t.loc}
                          </span>
                          <span className={`text-[8px] border px-1 rounded ${active ? 'text-emerald-400 border-emerald-500/20' : 'text-red-400 border-red-500/20'}`}>
                            {active ? 'ONLINE' : 'OFFLINE'}
                          </span>
                        </div>
                        <p className="text-[9px] text-zinc-400 leading-relaxed">{t.desc}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {rightPanel === 'invaders' && (
                <div className="space-y-3">
                  <div className="p-2 border-l-2 border-purple-500 bg-purple-500/5 rounded">
                    <h4 className="text-xs font-mono font-bold text-purple-400">Rift Rat Hover Platform</h4>
                    <p className="text-[9px] font-mono text-zinc-400 mt-1 leading-relaxed">
                      Assault platform squads deploying rapid flanking passes. Equipped with defensive shield emitters and double rift lasers.
                    </p>
                  </div>
                  <div className="p-2 border-l-2 border-fuchsia-500 bg-fuchsia-500/5 rounded">
                    <h4 className="text-xs font-mono font-bold text-fuchsia-400">Alchemy Sky-Diver</h4>
                    <p className="text-[9px] font-mono text-zinc-400 mt-1 leading-relaxed">
                      Boarding squads dropping on heavy magnetic lines. Able to deploy rapid shields and disrupt turret tracking systems.
                    </p>
                  </div>
                  <div className="p-2 border-l-2 border-emerald-500 bg-emerald-500/5 rounded">
                    <h4 className="text-xs font-mono font-bold text-emerald-400">Rear Centipede Unit</h4>
                    <p className="text-[9px] font-mono text-zinc-400 mt-1 leading-relaxed">
                      Gigantic segmented mechanoids attaching to rear guard. Must be systematically blasted to prevent full fuel line explosion.
                    </p>
                  </div>
                </div>
              )}

              {rightPanel === 'boss' && (
                <div className="space-y-3 font-mono">
                  <div className="p-2.5 border-l-2 border-red-500 bg-red-500/5 rounded">
                    <h4 className="text-xs font-bold text-red-400">Taur-Nefarian Vanguard</h4>
                    <p className="text-[9px] text-zinc-400 mt-1 leading-relaxed">
                      Three-meter armored tactical mecha with twin Void Core reactors. Deploys heavy rift energy shielding and constructs void barriers directly across the tracks.
                    </p>
                  </div>

                  <div className="space-y-2 text-[9px] text-zinc-400">
                    <div className="flex justify-between border-b border-zinc-900 pb-1">
                      <span>PHASE 1: BARRIER</span>
                      <span className={bossPhase >= 1 ? 'text-emerald-400' : 'text-zinc-600'}>
                        {bossPhase >= 1 ? 'RESOLVED' : 'PENDING'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-900 pb-1">
                      <span>PHASE 2: REINFORCEMENTS</span>
                      <span className={bossPhase >= 2 ? 'text-emerald-400' : 'text-zinc-600'}>
                        {bossPhase >= 2 ? 'RESOLVED' : 'PENDING'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>PHASE 3: MECHA ASSAULT</span>
                      <span className={bossPhase >= 3 ? 'text-emerald-400' : 'text-zinc-600'}>
                        {bossPhase >= 3 ? 'RESOLVED' : 'PENDING'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {rightPanel === 'gallery' && (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Train Escort', desc: 'Witch Defense' },
                    { label: 'Rail Heavy', desc: 'Armor Shield' },
                    { label: 'Train Engineer', desc: 'Forge Speed' },
                    { label: 'Swamp Witch', desc: 'Rift Lock' },
                    { label: 'Glitch Witch', desc: 'Turret Hack' },
                    { label: 'Medic', desc: 'Hull Restore' }
                  ].map(item => (
                    <div key={item.label} className="p-2.5 bg-[#0c1020]/20 border border-zinc-900 rounded text-center">
                      <div className="w-8 h-8 mx-auto bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center mb-1 text-base">
                        ⚙️
                      </div>
                      <h5 className="text-[9px] font-bold font-mono text-zinc-200 truncate">{item.label}</h5>
                      <span className="text-[7.5px] font-mono text-zinc-500 block truncate">{item.desc}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* FOOTER METADATA HUD */}
      <footer className="relative flex flex-col sm:flex-row items-center justify-between px-4 py-2 border-t border-[#141828] bg-black text-[9px] font-mono text-zinc-500 z-10 gap-2 shrink-0">
        <div className="flex items-center gap-3">
          <Train className="w-3.5 h-3.5 text-[#f0cc6a]" />
          <span>REACTOR_TEMP: 38.6 °C</span>
          <span className="text-[#141828]">|</span>
          <span>POWER_DRIVE: 100% NOMINAL</span>
          <span className="text-[#141828]">|</span>
          <span>HIGH SCORE: {savedHighScore} pts</span>
        </div>

        <div className="text-zinc-400 uppercase tracking-wider text-center">
          CST-ERT TRANSMISSION PORT: 3000 // ASTRONOMICAL EXTRACTOR
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setIsMuted(!isMuted);
              playBeep(600, 0.1, 'sine', 0.03);
            }}
            className="p-1 border border-zinc-900 hover:border-zinc-800 rounded bg-zinc-950 transition cursor-pointer text-zinc-500 hover:text-zinc-300"
            title="Toggle Synthesizer Audio"
          >
            {isMuted ? <VolumeX size={11} /> : <Volume2 size={11} />}
          </button>
          <span className="w-1.5 h-1.5 bg-[#2affee] rounded-full animate-ping" />
          <span>SYS_COHERENT_LINK</span>
        </div>
      </footer>

    </div>
  );
}
