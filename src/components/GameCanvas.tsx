/**
 * GENESIS VERSE — GAME CANVAS
 * Babylon.js Endless Runner · CST-ERT Character Controller
 * Commander Antonio Scott · Simpro Titans Studio LLC
 * MOAI Bridge · Claude SSOT Authority
 *
 * Clean production copy — Phase 15 Integration
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  PointLight,
  Color3,
  StandardMaterial,
  CreateCylinder,
  CreateSphere,
  CreateBox,
  TransformNode,
  DynamicTexture,
  Mesh,
} from '@babylonjs/core';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF';
import '@babylonjs/inspector';

import {
  GameState,
  Lane,
  ObstacleType,
  ObstacleData,
  PlayerState,
  WeaponType,
  CollectibleData,
  ProximityLog,
} from '../types';
import { SentinelRegistry } from '../utils/sentinel';
import { AbyssumBGM } from '../utils/abyssumMusic';

// ── CONSTANTS ────────────────────────────────────────────────────────────────

const PRIMARY_GLB  = '/jog-fwd-variants.glb';
const FALLBACK_GLB = '/jog-fwd-variants.glb';

const LANE_WIDTH   = 2.0;
const TRACK_LENGTH = 160.0;
const JUMP_DURATION  = 0.8;
const SLIDE_DURATION = 0.7;
const BURST_DURATION = 3.5;
const ATTACK_COOLDOWN = 0.35;
const SCAN_DURATION_MAX  = 5.0;
const SCAN_COOLDOWN_MAX  = 18.0;

// ── DEPTH PALETTES ────────────────────────────────────────────────────────────

const PALETTES = [
  { threshold:    0, top: '#050a1e', bottom: '#1f0426' },
  { threshold:  400, top: '#0a0518', bottom: '#ff007f' },
  { threshold: 1000, top: '#020d1a', bottom: '#00ffff' },
  { threshold: 1800, top: '#051405', bottom: '#39ff14' },
  { threshold: 3000, top: '#1a0000', bottom: '#ff2a00' },
  { threshold: 5000, top: '#080808', bottom: '#ffd700' },
];

const SECTORS = [
  { name: 'NEON_DOCK',         label: 'SECTOR I: NEON DOCK',         threshold:    0, color: '#00ffff', accent: '#ff00ff', desc: 'Sub-surface harbor.',          rainColor: '#00ffff' },
  { name: 'SYNTHWAVE_RIDGE',   label: 'SECTOR II: SYNTHWAVE RIDGE',  threshold:  400, color: '#ff007f', accent: '#ffae00', desc: 'Retro-future pink canyons.',    rainColor: '#ff007f' },
  { name: 'AQUAMARINE_TRENCH', label: 'SECTOR III: AQUA TRENCH',     threshold: 1000, color: '#00ffe7', accent: '#0022ff', desc: 'Sub-oceanic trench.',           rainColor: '#00ffcc' },
  { name: 'MATRIX_GRID',       label: 'SECTOR IV: MATRIX GRID',      threshold: 1800, color: '#39ff14', accent: '#005500', desc: 'Toxic-green code walls.',       rainColor: '#39ff14' },
  { name: 'VOLCANIC_CORE',     label: 'SECTOR V: VOLCANIC CORE',     threshold: 3000, color: '#ff2a00', accent: '#ff7f00', desc: 'Molten magma core.',            rainColor: '#ff5500' },
  { name: 'COSMIC_SINGULARITY',label: 'SECTOR VI: SINGULARITY',      threshold: 5000, color: '#ffd700', accent: '#4b0082', desc: 'Golden cyber void rift.',       rainColor: '#ffd700' },
];

// ── TYPES ─────────────────────────────────────────────────────────────────────

interface GameCanvasProps {
  gameState: GameState;
  selectedGear: {
    visorColor: string;
    armorColor: string;
    chestColor: string;
    hasShield: boolean;
    hasJetpack: boolean;
    weaponType: WeaponType;
  };
  onStatsUpdate: (stats: PlayerState) => void;
  onGameOver: () => void;
}

type AnimState = 'IDLE' | 'RUNNING' | 'JUMPING' | 'SLIDING' | 'STAGGER' | 'DEAD';

interface LoadedAnims {
  idle?:         any;
  running?:      any;
  jumping?:      any;
  jumpStart?:    any;
  jumpApex?:     any;
  jumpPreland?:  any;
  jumpRecovery?: any;
  sliding?:      any;
  stagger?:      any;
  dead?:         any;
  jogLeft?:      any;
  jogRight?:     any;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

const triggerVibration = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch (_) {}
  }
};

const hexToRgb = (hex: string) => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r
    ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) }
    : { r: 0, g: 0, b: 0 };
};

const rgbToHex = (r: number, g: number, b: number) =>
  '#' + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b))
    .toString(16).slice(1);

const interpolatePalette = (dist: number) => {
  let lo = PALETTES[0];
  let hi = PALETTES[PALETTES.length - 1];
  for (let i = 0; i < PALETTES.length - 1; i++) {
    if (dist >= PALETTES[i].threshold && dist < PALETTES[i + 1].threshold) {
      lo = PALETTES[i]; hi = PALETTES[i + 1]; break;
    }
  }
  const range = hi.threshold - lo.threshold;
  const t = range === 0 ? 0 : Math.min(1, Math.max(0, (dist - lo.threshold) / range));
  const lerp = (a: number, b: number) => a + (b - a) * t;
  const lt = hexToRgb(lo.top),  ht = hexToRgb(hi.top);
  const lb = hexToRgb(lo.bottom), hb = hexToRgb(hi.bottom);
  return {
    top:    rgbToHex(lerp(lt.r, ht.r), lerp(lt.g, ht.g), lerp(lt.b, ht.b)),
    bottom: rgbToHex(lerp(lb.r, hb.r), lerp(lb.g, hb.g), lerp(lb.b, hb.b)),
  };
};

const getCurrentSector = (dist: number) => {
  let current = SECTORS[0];
  let next    = SECTORS[SECTORS.length - 1];
  for (let i = 0; i < SECTORS.length; i++) {
    if (dist >= SECTORS[i].threshold) {
      current = SECTORS[i];
      next    = SECTORS[i + 1] ?? SECTORS[i];
    }
  }
  return { current, next };
};

// ── AUDIO ─────────────────────────────────────────────────────────────────────

type SFXType =
  | 'jump' | 'slide' | 'collect' | 'damage' | 'speed_boost'
  | 'slam'  | 'plasma_slash' | 'ion_shoot' | 'no_ammo' | 'scan_sweep';

const playSFX = (type: SFXType, muted: boolean) => {
  if (muted) return;
  try {
    const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx  = new Ctx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const configs: Record<SFXType, () => void> = {
      jump: () => {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start(); osc.stop(ctx.currentTime + 0.15);
      },
      slide: () => {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(); osc.stop(ctx.currentTime + 0.2);
      },
      collect: () => {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.start(); osc.stop(ctx.currentTime + 0.18);
      },
      damage: () => {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start(); osc.stop(ctx.currentTime + 0.35);
      },
      speed_boost: () => {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(); osc.stop(ctx.currentTime + 0.5);
      },
      plasma_slash: () => {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(450, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.14, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(); osc.stop(ctx.currentTime + 0.3);
      },
      ion_shoot: () => {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(950, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.start(); osc.stop(ctx.currentTime + 0.18);
      },
      no_ammo: () => {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start(); osc.stop(ctx.currentTime + 0.12);
      },
      slam: () => {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(); osc.stop(ctx.currentTime + 0.3);
      },
      scan_sweep: () => {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.45);
        osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.9);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.9);
        osc.start(); osc.stop(ctx.currentTime + 0.9);
      },
    };

    configs[type]?.();
  } catch (_) {}
};

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export default function GameCanvas({
  gameState,
  selectedGear,
  onStatsUpdate,
  onGameOver,
}: GameCanvasProps) {
  const canvasRef       = useRef<HTMLCanvasElement | null>(null);
  const sceneRef        = useRef<Scene | null>(null);
  const characterRef    = useRef<any>(null);
  const isMutedRef      = useRef(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [isBurstActive, setIsBurstActive] = useState(false);

  // ── INSPECTOR TOGGLE ────────────────────────────────────────────────────────
  const toggleInspector = () => {
    if (!sceneRef.current) return;
    const next = !inspectorOpen;
    setInspectorOpen(next);
    next
      ? sceneRef.current.debugLayer.show({ overlay: true })
      : sceneRef.current.debugLayer.hide();
  };

  // ── MAIN EFFECT ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current || gameState !== GameState.PLAYING) return;

    // Trigger dynamic crossfade to high-tempo action track
    AbyssumBGM.crossfadeTo('action', 1.5);

    // ── ENGINE SETUP ──────────────────────────────────────────────────────────
    const quality   = localStorage.getItem('cyber_runner_graphics_quality') ?? 'balanced';
    const antialias = quality !== 'low';
    const engine    = new Engine(canvasRef.current, antialias);
    engine.setHardwareScalingLevel(
      quality === 'low' ? 1.5 : quality === 'high' ? 0.8 : 1.0
    );

    const scene = new Scene(engine);
    sceneRef.current = scene;
    scene.clearColor = new Color3(0.015, 0.02, 0.035).toColor4(1);

    // ── CAMERA ────────────────────────────────────────────────────────────────
    const camera = new ArcRotateCamera(
      'cam', -Math.PI / 2, Math.PI / 2.3, 5.5,
      new Vector3(0, 1.2, 0), scene
    );
    camera.lowerRadiusLimit  = 4.5;
    camera.upperRadiusLimit  = 8.5;
    camera.lowerBetaLimit    = 1.0;
    camera.upperBetaLimit    = 1.5;
    const baseFov = camera.fov;

    // ── LIGHTS ────────────────────────────────────────────────────────────────
    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
    hemi.intensity    = 0.55;
    hemi.groundColor  = new Color3(0.05, 0.08, 0.15);

    const fillLight = new PointLight('fill', new Vector3(-2.5, 1.5, -2), scene);
    fillLight.intensity = 0.65;
    fillLight.diffuse   = Color3.FromHexString(selectedGear.chestColor);

    const keyLight = new PointLight('key', new Vector3(2.5, 3.0, 2.0), scene);
    keyLight.intensity = 0.7;
    keyLight.diffuse   = Color3.FromHexString(selectedGear.visorColor);

    // ── SKYBOX ────────────────────────────────────────────────────────────────
    const skybox = CreateSphere('skybox', { diameter: 350, segments: 24 }, scene);
    skybox.infiniteDistance = true;
    skybox.isPickable       = false;
    const skyboxMat = new StandardMaterial('skyboxMat', scene);
    skyboxMat.disableLighting   = true;
    skyboxMat.backFaceCulling   = false;
    skyboxMat.disableDepthWrite = true;
    const skyTex = new DynamicTexture('skyTex', { width: 512, height: 256 }, scene, false);
    skyboxMat.emissiveTexture = skyTex;
    skybox.material = skyboxMat;

    let sectorFlash     = 0;
    let lastSectorName  = 'NEON_DOCK';
    let lastSkyDist     = 0;

    const updateSkybox = (dist: number) => {
      const { top, bottom } = interpolatePalette(dist);
      const ctx = skyTex.getContext();
      if (!ctx) return;

      const grad = ctx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0,   top);
      grad.addColorStop(0.5, bottom);
      grad.addColorStop(1,   top);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = bottom + '15';
      ctx.lineWidth   = 1;
      for (let y = 16; y < 256; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }
      for (let x = 0;  x < 512; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke(); }

      ctx.fillStyle = bottom + '65';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`DEPTH: ${Math.floor(dist)}M`, 15, 30);

      skyTex.update();
      scene.clearColor = Color3.FromHexString(top).toColor4(1);
      hemi.groundColor = Color3.FromHexString(bottom).scale(0.35);
      hemi.diffuse     = Color3.FromHexString(top).scale(0.8);
      skyboxMat.emissiveColor = sectorFlash > 0.01
        ? new Color3(1 + sectorFlash * 1.5, 1 + sectorFlash * 1.5, 1 + sectorFlash * 1.5)
        : new Color3(1, 1, 1);
    };
    updateSkybox(0);

    // ── MATERIALS (shared) ────────────────────────────────────────────────────
    const metalBodyMat  = new StandardMaterial('metalBody', scene);
    metalBodyMat.diffuseColor  = Color3.FromHexString(selectedGear.armorColor);
    metalBodyMat.specularColor = new Color3(0.6, 0.6, 0.8);

    const neonVisorMat = new StandardMaterial('neonVisor', scene);
    neonVisorMat.emissiveColor = Color3.FromHexString(selectedGear.visorColor);

    const chestMat = new StandardMaterial('chest', scene);
    chestMat.emissiveColor = Color3.FromHexString(selectedGear.chestColor);

    const metalDullMat = new StandardMaterial('metalDull', scene);
    metalDullMat.diffuseColor = new Color3(0.2, 0.2, 0.22);

    const borderMat = new StandardMaterial('border', scene);
    borderMat.emissiveColor = new Color3(0.95, 0.49, 0.15);

    const scanMat = new StandardMaterial('scan', scene);
    scanMat.diffuseColor     = new Color3(1, 0.15, 0.15);
    scanMat.emissiveColor    = new Color3(1, 0.15, 0.15);
    scanMat.wireframe        = true;
    scanMat.disableDepthWrite = true;
    scanMat.depthFunction    = Engine.ALWAYS;
    scanMat.backFaceCulling  = false;

    // ── TRACK ─────────────────────────────────────────────────────────────────
    const trackMat = new StandardMaterial('track', scene);
    trackMat.diffuseColor  = new Color3(0.03, 0.04, 0.07);
    trackMat.emissiveColor = new Color3(0.01, 0.015, 0.025);

    const mkTrack = (x: number) => {
      const t = CreateBox('track', { width: LANE_WIDTH, height: 0.1, depth: TRACK_LENGTH }, scene);
      t.position.set(x, -0.05, TRACK_LENGTH / 2 - 10);
      t.material = trackMat;
      return t;
    };
    mkTrack(-LANE_WIDTH); mkTrack(0); mkTrack(LANE_WIDTH);

    const mkBorder = (x: number) => {
      const b = CreateBox('border', { width: 0.08, height: 0.15, depth: TRACK_LENGTH }, scene);
      b.position.set(x, 0.02, TRACK_LENGTH / 2 - 10);
      b.material = borderMat;
    };
    mkBorder(-LANE_WIDTH * 1.5); mkBorder(LANE_WIDTH * 1.5);

    // ── RAIN ──────────────────────────────────────────────────────────────────
    const rainCount = quality === 'low' ? 45 : quality === 'high' ? 260 : 140;
    const rainMat   = new StandardMaterial('rain', scene);
    rainMat.diffuseColor  = new Color3(0, 1, 0.4);
    rainMat.emissiveColor = new Color3(0.1, 0.9, 0.35);
    rainMat.disableLighting = true;
    rainMat.alpha = 0.5;

    const rainDrops: { mesh: Mesh; speedY: number }[] = [];
    for (let i = 0; i < rainCount; i++) {
      const drop = CreateCylinder('rain', { height: 0.7, diameter: 0.02, tessellation: 4 }, scene);
      drop.material = rainMat;
      drop.position.set((Math.random() - 0.5) * 14, Math.random() * 8, Math.random() * 80 - 15);
      rainDrops.push({ mesh: drop, speedY: 11 + Math.random() * 5 });
    }

    // ── PROCEDURAL CHARACTER ──────────────────────────────────────────────────
    const charRoot = new TransformNode('charRoot', scene);
    charRoot.position.set(0, 0.08, 0);

    const coreBody   = CreateCylinder('body',   { height: 1.4, diameterTop: 0.48, diameterBottom: 0.35, tessellation: 48 }, scene);
    coreBody.position.y = 0.75; coreBody.material = metalBodyMat; coreBody.parent = charRoot;

    const headVisor  = CreateSphere('visor',   { diameter: 0.48, segments: 48 }, scene);
    headVisor.position.y = 1.6; headVisor.material = neonVisorMat; headVisor.parent = charRoot;

    const chestPlate = CreateBox('chestPlate', { width: 0.45, height: 0.45, depth: 0.25 }, scene);
    chestPlate.position.set(0, 0.9, 0.18); chestPlate.material = chestMat; chestPlate.parent = charRoot;

    const mkLimb = (name: string, x: number, y: number) => {
      const l = CreateCylinder(name, { height: 0.8, diameter: 0.18, tessellation: 36 }, scene);
      l.position.set(x, y, 0); l.material = metalDullMat; l.parent = charRoot;
      return l;
    };
    const armL = mkLimb('armL', -0.38, 0.95);
    const armR = mkLimb('armR',  0.38, 0.95);
    const legL = mkLimb('legL', -0.22, 0.35);
    const legR = mkLimb('legR',  0.22, 0.35);

    // Force field
    const shield = CreateSphere('shield', { diameter: 2.1, segments: 64 }, scene);
    shield.position.y = 0.9;
    const shieldMat = new StandardMaterial('shieldMat', scene);
    shieldMat.diffuseColor  = new Color3(0.1, 0.8, 1.0);
    shieldMat.emissiveColor = new Color3(0.15, 0.9, 1.0);
    shieldMat.alpha = 0.22;
    shield.material  = shieldMat;
    shield.parent    = charRoot;
    shield.isVisible = selectedGear.hasShield;

    // ── GLB LOADER ────────────────────────────────────────────────────────────
    let gltfLoaded    = false;
    let gltfRoot: any = null;
    let staggered     = false;
    const anims: LoadedAnims = {};
    let animState: AnimState = 'RUNNING';
    let currentActiveAnim: any = null;

    const findAnim = (groups: any[], keys: string[]) =>
      groups.find((g: any) => keys.some(k => g.name.toLowerCase().includes(k)));

    const playAnimGroup = (target: any, loop: boolean = true) => {
      if (!target) return;
      if (currentActiveAnim === target) return;

      const prev = currentActiveAnim;
      currentActiveAnim = target;

      if (prev && prev !== target) {
        let t = 0;
        target.play(loop);
        target.weight = 0.01;
        const obs = scene.onBeforeRenderObservable.add(() => {
          t += engine.getDeltaTime() / 1000;
          const r = Math.min(1.0, t / 0.12);
          prev.weight = 1.0 - r;
          target.weight = r;
          if (r >= 1.0) {
            prev.stop();
            scene.onBeforeRenderObservable.remove(obs);
          }
        });
      } else {
        target.play(loop);
        target.weight = 1.0;
      }
    };

    const playAnim = (next: AnimState) => {
      animState = next;
      if (next === 'DEAD') {
        playAnimGroup(anims.dead, false);
      } else if (next === 'STAGGER') {
        playAnimGroup(anims.stagger, false);
      } else if (next === 'SLIDING') {
        playAnimGroup(anims.sliding, true);
      } else if (next === 'RUNNING') {
        const diff = ps.targetLaneX - ps.xPosition;
        if (diff < -0.15) {
          playAnimGroup(anims.jogLeft || anims.running, true);
        } else if (diff > 0.15) {
          playAnimGroup(anims.jogRight || anims.running, true);
        } else {
          playAnimGroup(anims.running, true);
        }
      } else if (next === 'JUMPING') {
        const progress = jumpTime / JUMP_DURATION;
        let targetJump = anims.jumpStart;
        if (progress < 0.25) {
          targetJump = anims.jumpStart;
        } else if (progress < 0.60) {
          targetJump = anims.jumpApex;
        } else if (progress < 0.85) {
          targetJump = anims.jumpPreland;
        } else {
          targetJump = anims.jumpRecovery;
        }
        playAnimGroup(targetJump || anims.jumping, false);
      } else {
        playAnimGroup(anims.idle, true);
      }
    };

    const applyGearColors = (meshes: any[]) => {
      meshes.forEach((m: any) => {
        if (!m?.material) return;
        const mat  = m.material;
        const mn   = m.name.toLowerCase();
        const matn = mat.name.toLowerCase();
        const isVisor = ['visor','eye','glass','glow','light','emit','neon'].some(k => mn.includes(k) || matn.includes(k));
        const isChest = ['chest','reactor','core','heart'].some(k => mn.includes(k) || matn.includes(k));
        const isBody  = ['body','armor','suit','metal','skin','base','plate','chassis','torso'].some(k => mn.includes(k) || matn.includes(k));
        const col = isVisor ? selectedGear.visorColor : isChest ? selectedGear.chestColor : isBody ? selectedGear.armorColor : null;
        if (!col) return;
        if (mat.emissiveColor) mat.emissiveColor = Color3.FromHexString(col);
        if (mat.diffuseColor)  mat.diffuseColor  = Color3.FromHexString(col);
        if (mat.albedoColor)   mat.albedoColor   = Color3.FromHexString(col);
      });
    };

    const loadGLB = (url: string) => {
      if (characterRef.current) {
        characterRef.current.getChildMeshes().forEach((m: any) => m.dispose());
        characterRef.current.dispose();
        characterRef.current = null;
      }
      const slash = url.lastIndexOf('/');
      return SceneLoader.ImportMeshAsync(
        '', slash !== -1 ? url.slice(0, slash + 1) : '',
        slash !== -1 ? url.slice(slash + 1) : url,
        scene
      );
    };

    loadGLB(PRIMARY_GLB)
      .catch(() => loadGLB(FALLBACK_GLB))
      .then((result: any) => {
        const root = result.meshes[0];
        root.parent = charRoot;
        root.position = Vector3.Zero();
        characterRef.current = root;
        shield.parent = root;
        gltfRoot   = root;
        gltfLoaded = true;

        applyGearColors(result.meshes);

        // Dispose procedural meshes
        [coreBody, headVisor, chestPlate, armL, armR, legL, legR].forEach(m => m.dispose());

        const groups = result.animationGroups as any[];
        groups.forEach((g: any) => { g.stop(); g.weight = 0; });

        const JOG_ANIM = "cst-ert-jog-fwd-a";
        const IDLE_ANIM = "cst-ert-idle-a";
        const JUMP_START = "cst-ert-jump-start-a";
        const JUMP_APEX = "cst-ert-jump-apex-a";
        const JUMP_PRELAND = "cst-ert-jump-preland-a";
        const JUMP_RECOVERY = "cst-ert-jump-recovery-a";

        const SLIDING_ANIM = "cst-ert-jog-fwd-downhill-a";
        const STAGGER_ANIM = "cst-ert-jog-fwd-pivot-180-a";
        const DEAD_ANIM = "cst-ert-jog-fwd-stop-a";
        const JOG_LEFT_ANIM = "cst-ert-jog-fwd-circle-left-a";
        const JOG_RIGHT_ANIM = "cst-ert-jog-fwd-circle-right-a";

        anims.idle         = groups.find((g: any) => g.name === IDLE_ANIM);
        anims.running      = groups.find((g: any) => g.name === JOG_ANIM);
        anims.jumpStart    = groups.find((g: any) => g.name === JUMP_START);
        anims.jumpApex     = groups.find((g: any) => g.name === JUMP_APEX);
        anims.jumpPreland  = groups.find((g: any) => g.name === JUMP_PRELAND);
        anims.jumpRecovery = groups.find((g: any) => g.name === JUMP_RECOVERY);
        anims.sliding      = groups.find((g: any) => g.name === SLIDING_ANIM);
        anims.stagger      = groups.find((g: any) => g.name === STAGGER_ANIM);
        anims.dead         = groups.find((g: any) => g.name === DEAD_ANIM);
        anims.jogLeft      = groups.find((g: any) => g.name === JOG_LEFT_ANIM);
        anims.jogRight     = groups.find((g: any) => g.name === JOG_RIGHT_ANIM);
        anims.jumping      = anims.jumpStart;

        if (!anims.running && groups.length > 0) anims.running = groups[0];

        const start = anims.running ?? anims.idle;
        if (start) { start.play(true); start.weight = 1; }
        currentActiveAnim = start;
        animState = anims.running ? 'RUNNING' : 'IDLE';
      })
      .catch(() => { /* fallback to procedural */ });

    // ── OBSTACLE MATERIALS ────────────────────────────────────────────────────
    const obsMats: Record<ObstacleType, StandardMaterial> = {
      [ObstacleType.WALL]: (() => {
        const m = new StandardMaterial('wall', scene);
        m.diffuseColor = new Color3(0.8, 0.1, 0.1);
        m.emissiveColor = new Color3(0.4, 0.05, 0.05);
        return m;
      })(),
      [ObstacleType.SPIKE_ROCK]: (() => {
        const m = new StandardMaterial('spike', scene);
        m.diffuseColor = new Color3(0.4, 0.3, 0.3);
        m.emissiveColor = new Color3(0.2, 0.05, 0);
        return m;
      })(),
      [ObstacleType.DRONE]: (() => {
        const m = new StandardMaterial('drone', scene);
        m.diffuseColor = new Color3(0.1, 0.8, 0.8);
        m.emissiveColor = new Color3(0, 0.4, 0.4);
        return m;
      })(),
      [ObstacleType.LOW_BARRIER]: (() => {
        const m = new StandardMaterial('barrier', scene);
        m.diffuseColor = new Color3(0.8, 0.8, 0.1);
        m.emissiveColor = new Color3(0.4, 0.4, 0.05);
        return m;
      })(),
    };

    const coinMat = new StandardMaterial('coin', scene);
    coinMat.emissiveColor = new Color3(0.95, 0.65, 0);
    const energyMat = new StandardMaterial('energy', scene);
    energyMat.emissiveColor = new Color3(0.1, 0.95, 0.1);
    const burstMat = new StandardMaterial('burst', scene);
    burstMat.diffuseColor = new Color3(0.9, 0.1, 0.95);
    burstMat.emissiveColor = new Color3(0.75, 0.05, 0.9);
    const bladeMat = new StandardMaterial('blade', scene);
    bladeMat.diffuseColor = new Color3(1, 0.35, 0);
    bladeMat.emissiveColor = new Color3(0.95, 0.3, 0);
    const blasterMat = new StandardMaterial('blaster', scene);
    blasterMat.diffuseColor = new Color3(0, 0.85, 1);
    blasterMat.emissiveColor = new Color3(0, 0.75, 0.95);
    const shieldPUMat = new StandardMaterial('shieldPU', scene);
    shieldPUMat.diffuseColor = new Color3(0, 0.6, 1);
    shieldPUMat.emissiveColor = new Color3(0.1, 0.8, 1);

    // ── SPAWN HELPERS ─────────────────────────────────────────────────────────
    const activeObstacles:   { mesh: Mesh; data: ObstacleData }[]   = [];
    const activeCollectibles: { mesh: Mesh; data: CollectibleData }[] = [];

    const randLane = () => ([Lane.LEFT, Lane.CENTER, Lane.RIGHT] as Lane[])[Math.floor(Math.random() * 3)];

    const spawnObstacle = (z: number) => {
      const types = Object.values(ObstacleType) as ObstacleType[];
      const type  = types[Math.floor(Math.random() * types.length)];
      const lane  = randLane();
      let mesh: Mesh;
      if (type === ObstacleType.WALL) {
        mesh = CreateBox('wall', { width: LANE_WIDTH, height: 2.2, depth: 0.5 }, scene);
        mesh.position.set(lane * LANE_WIDTH, 1.1, z);
      } else if (type === ObstacleType.SPIKE_ROCK) {
        mesh = CreateCylinder('spike', { height: 1.2, diameterTop: 0, diameterBottom: 0.8, tessellation: 8 }, scene);
        mesh.position.set(lane * LANE_WIDTH, 0.6, z);
      } else if (type === ObstacleType.DRONE) {
        mesh = CreateSphere('drone', { diameter: 0.6, segments: 12 }, scene);
        mesh.position.set(lane * LANE_WIDTH, 1.6, z);
      } else {
        mesh = CreateBox('barrier', { width: LANE_WIDTH, height: 0.5, depth: 0.4 }, scene);
        mesh.position.set(lane * LANE_WIDTH, 0.25, z);
      }
      mesh.material = obsMats[type];
      activeObstacles.push({ mesh, data: { id: Math.random().toString(), type, lane, zPosition: z, hasBeenPassed: false } });
    };

    const spawnCollectible = (z: number) => {
      const r    = Math.random();
      const type = r < 0.44 ? 'COIN'
                 : r < 0.58 ? 'ENERGY_CELL'
                 : r < 0.70 ? 'SHIELD_POWERUP'
                 : r < 0.82 ? 'VELOCITY_BURST'
                 : r < 0.91 ? 'POWERUP_PLASMA_BLADE'
                 :             'POWERUP_ION_BLASTER';
      const lane = randLane();
      let mesh: Mesh;

      if (type === 'COIN') {
        mesh = CreateCylinder('coin', { height: 0.08, diameter: 0.4, tessellation: 12 }, scene);
        mesh.rotation.x = Math.PI / 2;
        mesh.position.set(lane * LANE_WIDTH, 0.6, z);
        mesh.material = coinMat;
      } else if (type === 'ENERGY_CELL') {
        mesh = CreateBox('energy', { width: 0.3, height: 0.4, depth: 0.3 }, scene);
        mesh.position.set(lane * LANE_WIDTH, 0.6, z);
        mesh.material = energyMat;
      } else if (type === 'SHIELD_POWERUP') {
        mesh = CreateSphere('shPU', { diameter: 0.35, segments: 12 }, scene);
        mesh.position.set(lane * LANE_WIDTH, 0.65, z);
        mesh.material = shieldPUMat;
        const ring = CreateCylinder('shRing', { height: 0.06, diameter: 0.6, tessellation: 6 }, scene);
        ring.parent = mesh; ring.rotation.x = Math.PI / 2; ring.material = shieldPUMat;
      } else if (type === 'VELOCITY_BURST') {
        mesh = CreateCylinder('burst', { height: 0.5, diameterTop: 0, diameterBottom: 0.35, tessellation: 6 }, scene);
        mesh.position.set(lane * LANE_WIDTH, 0.7, z);
        mesh.material = burstMat;
      } else if (type === 'POWERUP_PLASMA_BLADE') {
        mesh = CreateSphere('bladeBase', { diameter: 0.35, segments: 12 }, scene);
        mesh.position.set(lane * LANE_WIDTH, 0.65, z);
        mesh.material = bladeMat;
        const b1 = CreateBox('b1', { width: 0.12, height: 0.75, depth: 0.12 }, scene);
        b1.parent = mesh; b1.position.y =  0.22; b1.material = bladeMat;
        const b2 = CreateBox('b2', { width: 0.12, height: 0.75, depth: 0.12 }, scene);
        b2.parent = mesh; b2.position.y = -0.22; b2.material = bladeMat;
      } else {
        mesh = CreateSphere('blasterBase', { diameter: 0.35, segments: 12 }, scene);
        mesh.position.set(lane * LANE_WIDTH, 0.65, z);
        mesh.material = blasterMat;
        const bar1 = CreateCylinder('bar1', { height: 0.6, diameter: 0.1, tessellation: 8 }, scene);
        bar1.parent = mesh; bar1.position.x = -0.12; bar1.rotation.x = Math.PI / 2; bar1.material = blasterMat;
        const bar2 = CreateCylinder('bar2', { height: 0.6, diameter: 0.1, tessellation: 8 }, scene);
        bar2.parent = mesh; bar2.position.x =  0.12; bar2.rotation.x = Math.PI / 2; bar2.material = blasterMat;
      }

      activeCollectibles.push({
        mesh,
        data: { id: Math.random().toString(), type: type as any, lane, zPosition: z, hasBeenCollected: false },
      });
    };

    for (let i = 25; i < 150; i += 22) {
      if (Math.random() > 0.3) spawnObstacle(i);
      if (Math.random() > 0.4) spawnCollectible(i + 10);
    }

    // ── WEAPON MESH ───────────────────────────────────────────────────────────
    let weaponMesh: Mesh | null = null;

    const updateWeaponMesh = (type: WeaponType) => {
      weaponMesh?.dispose();
      weaponMesh = null;
      if (type === WeaponType.NONE) return;
      const parent = gltfLoaded && gltfRoot ? gltfRoot : charRoot;

      if (type === WeaponType.PLASMA_BLADE) {
        const c = CreateBox('bladeC', { size: 0.01 }, scene);
        c.parent = parent;
        c.position.set(0.4, 0.8, 0.2);
        c.rotation.set(0.3, 0.2, -0.2);
        const hilt = CreateCylinder('hilt', { height: 0.22, diameter: 0.06 }, scene);
        hilt.parent = c; hilt.rotation.x = Math.PI / 2;
        const hm = new StandardMaterial('hiltMat', scene);
        hm.diffuseColor = new Color3(0.2, 0.2, 0.25); hilt.material = hm;
        const b = CreateBox('bladeE', { width: 0.07, height: 1.0, depth: 0.03 }, scene);
        b.parent = c; b.position.z = 0.55; b.rotation.x = Math.PI / 2; b.material = bladeMat;
        weaponMesh = c;
      } else if (type === WeaponType.BLASTER) {
        const c = CreateBox('blasterC', { size: 0.01 }, scene);
        c.parent = parent; c.position.set(0.4, 0.8, 0.2); c.rotation.set(0.1, 0, 0);
        const body = CreateBox('blasterB', { width: 0.12, height: 0.16, depth: 0.35 }, scene);
        body.parent = c; body.position.z = 0.08;
        const bm = new StandardMaterial('blasterBodyMat', scene); bm.diffuseColor = new Color3(0.25, 0.25, 0.3); body.material = bm;
        const mk = (name: string, x: number) => {
          const bar = CreateCylinder(name, { height: 0.28, diameter: 0.04 }, scene);
          bar.parent = c; bar.position.set(x, 0.02, 0.32); bar.rotation.x = Math.PI / 2; bar.material = blasterMat;
        };
        mk('barL', -0.03); mk('barR', 0.03);
        weaponMesh = c;
      }
    };
    updateWeaponMesh(selectedGear.weaponType);

    // ── PLAYER STATE ──────────────────────────────────────────────────────────
    const ps: PlayerState = {
      distance: 0, speed: 15, health: 100, maxHealth: 100,
      energy: 100, maxEnergy: 100,
      shieldActive: selectedGear.hasShield,
      shieldRemaining: selectedGear.hasShield ? 100 : 0,
      score: 0, coins: 0, multiplier: 1,
      currentLane: Lane.CENTER, targetLaneX: 0, xPosition: 0,
      isJumping: false, isSliding: false,
      activeWeapon: selectedGear.weaponType,
      weaponCharges: selectedGear.weaponType !== WeaponType.NONE ? 5 : 0,
      bonusScore: 0, destroyCombo: 0, maxDestroyCombo: 0,
      enemyScanActive: false, enemyScanDurationRemaining: 0, enemyScanCooldownRemaining: 0,
      proximityLogs: [], sentinelStatus: 'SECURE', sentinelAnomalies: [],
      sentinelChecksPassedCount: 0, sentinelConstitutionVersion: 'v1.4-STYX',
    };

    let burstActiveLocal = false;
    let burstTimer       = 0;
    let scanActive       = false;
    let scanTimer        = 0;
    let scanCooldown     = 0;
    let jumpTime         = 0;
    let slideTime        = 0;
    let lastAttackTime   = 0;
    let gameTime         = 0;
    let prevStats: PlayerState | null = null;
    let simAnomalyType: string | null = null;

    const activeProjectiles: { mesh: Mesh; lane: Lane; speedZ: number; hitAny: boolean }[] = [];
    const activeSlashWaves:  { mesh: Mesh; speedZ: number; timeAlive: number; hitAny: boolean }[] = [];

    // Explosion helper
    const spawnExplosion = (pos: Vector3, color: Color3) => {
      const exp = CreateSphere('exp', { diameter: 0.5 }, scene);
      exp.position.copyFrom(pos);
      const em = new StandardMaterial('expMat', scene); em.emissiveColor = color; exp.material = em;
      let t = 0;
      const obs = scene.onBeforeRenderObservable.add(() => {
        t += engine.getDeltaTime() / 1000;
        exp.scaling.addInPlace(new Vector3(0.25, 0.25, 0.25));
        em.alpha = Math.max(0, 1 - t * 5);
        if (t >= 0.2) { exp.dispose(); scene.onBeforeRenderObservable.remove(obs); }
      });
    };

    const spawnShards = (pos: Vector3, mat: any) => {
      for (let j = 0; j < 8; j++) {
        const s = CreateBox('shard', { size: 0.15 }, scene);
        s.position.copyFrom(pos); s.material = mat;
        const v = new Vector3((Math.random() - 0.5) * 8, Math.random() * 5 + 2, Math.random() * 6 + 4);
        const obs = scene.onBeforeRenderObservable.add(() => {
          const fd = engine.getDeltaTime() / 1000;
          s.position.addInPlace(v.scale(fd)); v.y -= 9.81 * fd; s.rotation.x += 0.15;
          if (s.position.y < -0.5 || s.position.z < -10) { s.dispose(); scene.onBeforeRenderObservable.remove(obs); }
        });
      }
    };

    // ── WEAPONS FIRE ──────────────────────────────────────────────────────────
    const fireWeapon = () => {
      if (gameState !== GameState.PLAYING) return;
      if (!ps.activeWeapon || ps.activeWeapon === WeaponType.NONE) return;
      if (gameTime - lastAttackTime < ATTACK_COOLDOWN) return;
      if ((ps.weaponCharges ?? 0) <= 0) { playSFX('no_ammo', isMutedRef.current); return; }
      lastAttackTime = gameTime;
      ps.weaponCharges!--;

      if (ps.activeWeapon === WeaponType.PLASMA_BLADE) {
        playSFX('plasma_slash', isMutedRef.current);
        const wave = CreateCylinder('slash', { height: 0.05, diameter: 1.8, tessellation: 24 }, scene);
        wave.scaling.set(1, 0.05, 0.45);
        wave.position.set(ps.xPosition, charRoot.position.y + 0.4, 0.8);
        wave.rotation.set(0, 0, Math.PI / 4);
        const wm = new StandardMaterial('slashM', scene);
        wm.diffuseColor = new Color3(1, 0.3, 0); wm.emissiveColor = new Color3(1, 0.25, 0); wm.alpha = 0.85;
        wave.material = wm;
        activeSlashWaves.push({ mesh: wave, speedZ: 28, timeAlive: 0, hitAny: false });

      } else if (ps.activeWeapon === WeaponType.BLASTER) {
        playSFX('ion_shoot', isMutedRef.current);
        const proj = CreateCylinder('proj', { height: 0.6, diameter: 0.08, tessellation: 6 }, scene);
        proj.rotation.x = Math.PI / 2;
        proj.position.set(ps.xPosition, charRoot.position.y + 0.75, 0.7);
        const pm = new StandardMaterial('projM', scene);
        pm.diffuseColor = new Color3(0, 0.9, 1); pm.emissiveColor = new Color3(0, 0.85, 1); proj.material = pm;
        activeProjectiles.push({ mesh: proj, lane: ps.currentLane, speedZ: 65, hitAny: false });
      }
    };

    // ── SCAN ──────────────────────────────────────────────────────────────────
    const triggerScan = () => {
      if (gameState !== GameState.PLAYING || scanActive || scanCooldown > 0) return;
      if (ps.energy < 25) { playSFX('no_ammo', isMutedRef.current); return; }
      ps.energy -= 25; scanActive = true; scanTimer = SCAN_DURATION_MAX; scanCooldown = SCAN_COOLDOWN_MAX;
      playSFX('scan_sweep', isMutedRef.current); triggerVibration([100, 50, 100]);
    };

    // ── KEYBOARD ──────────────────────────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft'  || k === 'a') {
        if (ps.currentLane === Lane.CENTER) ps.currentLane = Lane.LEFT;
        else if (ps.currentLane === Lane.RIGHT) ps.currentLane = Lane.CENTER;
      } else if (k === 'arrowright' || k === 'd') {
        if (ps.currentLane === Lane.CENTER) ps.currentLane = Lane.RIGHT;
        else if (ps.currentLane === Lane.LEFT)  ps.currentLane = Lane.CENTER;
      } else if ((k === 'arrowup' || k === 'w' || k === ' ') && !ps.isJumping && !ps.isSliding) {
        ps.isJumping = true; jumpTime = 0;
        playSFX('jump', isMutedRef.current);
        if (k === ' ') e.preventDefault();
      } else if ((k === 'arrowdown' || k === 's') && !ps.isSliding && !ps.isJumping) {
        ps.isSliding = true; slideTime = 0;
        playSFX('slide', isMutedRef.current);
      } else if (k === 'f' || k === 'e') {
        fireWeapon();
      } else if (k === 'q' || k === 'r') {
        triggerScan();
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (gameState !== GameState.PLAYING) return;
      if ((e.target as HTMLElement).closest('button')) return;
      fireWeapon();
    };

    const onScanEvent  = () => triggerScan();
    const onAnomalyEvt = (e: Event) => {
      simAnomalyType = (e as CustomEvent).detail?.type ?? 'speed';
    };

    window.addEventListener('keydown',                    onKeyDown);
    window.addEventListener('pointerdown',                onPointerDown);
    window.addEventListener('cyber-runner-trigger-scan',  onScanEvent);
    window.addEventListener('cyber-runner-trigger-anomaly', onAnomalyEvt);

    // ── RENDER LOOP ───────────────────────────────────────────────────────────
    scene.onBeforeRenderObservable.add(() => {
      const dt   = engine.getDeltaTime() / 1000;
      gameTime  += dt;

      // ── SCAN UPDATE ─────────────────────────────────────────────────────────
      if (scanActive) {
        scanTimer  -= dt;
        ps.energy   = Math.max(0, ps.energy - dt * 5);
        ps.enemyScanActive = true;
        ps.enemyScanDurationRemaining = Math.max(0, scanTimer);
        if (scanTimer <= 0) { scanActive = false; ps.enemyScanActive = false; }
      } else {
        ps.enemyScanActive = false;
        ps.enemyScanDurationRemaining = 0;
      }
      if (scanCooldown > 0) { scanCooldown -= dt; ps.enemyScanCooldownRemaining = Math.max(0, scanCooldown); }
      else ps.enemyScanCooldownRemaining = 0;

      // ── SPEED ───────────────────────────────────────────────────────────────
      const df = ps.distance / 1000;
      const baseSpeed = 15 * Math.exp(df * 0.22);
      if (burstActiveLocal) {
        burstTimer -= dt;
        if (burstTimer <= 0) { burstActiveLocal = false; setIsBurstActive(false); }
        ps.speed = baseSpeed + 30;
      } else {
        ps.speed = baseSpeed;
      }

      // Camera FOV during burst
      camera.fov = burstActiveLocal
        ? baseFov + 0.18 + Math.sin(gameTime * 60) * 0.018
        : camera.fov + (baseFov - camera.fov) * 0.12;

      // ── RAIN ────────────────────────────────────────────────────────────────
      const rainAngle = Math.atan2(-ps.speed, -13.5);
      rainMat.alpha   = 0.3 + (ps.speed / 25) * 0.45;
      rainDrops.forEach(p => {
        p.mesh.position.y -= p.speedY * dt;
        p.mesh.position.z -= ps.speed  * dt;
        p.mesh.rotation.x  = rainAngle;
        p.mesh.scaling.y   = 1 + (ps.speed / 15) * 0.8;
        if (p.mesh.position.y < 0.05 || p.mesh.position.z < -10) {
          p.mesh.position.set((Math.random() - 0.5) * 14, Math.random() * 6 + 7, Math.random() * 50 + 25);
          p.speedY = 11 + Math.random() * 5;
        }
      });

      // ── DISTANCE & SCORE ────────────────────────────────────────────────────
      const fd = ps.speed * dt;
      ps.distance += fd;
      ps.score     = Math.floor(ps.distance * 1.5) + ps.coins * 50 + (ps.bonusScore ?? 0);

      // ── SECTOR TRANSITIONS ──────────────────────────────────────────────────
      if (sectorFlash > 0.01) sectorFlash = Math.max(0, sectorFlash - dt * 2.2);
      const { current: sec } = getCurrentSector(ps.distance);
      if (sec.name !== lastSectorName) {
        lastSectorName = sec.name;
        sectorFlash    = 1;
        playSFX('speed_boost', isMutedRef.current);
        triggerVibration([120, 80, 120, 80]);
        borderMat.emissiveColor = Color3.FromHexString(sec.color);
        rainMat.diffuseColor    = Color3.FromHexString(sec.rainColor);
        rainMat.emissiveColor   = Color3.FromHexString(sec.rainColor);
        window.dispatchEvent(new CustomEvent('cyber-runner-sector-swap', { detail: sec }));
      }

      if (Math.abs(ps.distance - lastSkyDist) >= 2 || sectorFlash > 0.01) {
        lastSkyDist = ps.distance;
        updateSkybox(ps.distance);
      }

      // ── LANE & JUMP & SLIDE ─────────────────────────────────────────────────
      ps.targetLaneX = ps.currentLane * LANE_WIDTH;
      ps.xPosition  += (ps.targetLaneX - ps.xPosition) * 0.15;

      let jumpY = 0;
      if (ps.isJumping) {
        jumpTime += dt;
        if (jumpTime >= JUMP_DURATION) { ps.isJumping = false; }
        else jumpY = Math.sin((jumpTime / JUMP_DURATION) * Math.PI) * 1.45;
      }

      if (ps.isSliding) {
        slideTime += dt;
        if (slideTime >= SLIDE_DURATION) {
          ps.isSliding = false;
          if (gltfLoaded && gltfRoot) { gltfRoot.scaling.y = 1; gltfRoot.position.y = 0; }
        } else if (gltfLoaded && gltfRoot) { gltfRoot.scaling.y = 0.55; gltfRoot.position.y = -0.3; }
      }

      charRoot.position.set(ps.xPosition, jumpY + 0.08, 0);

      // ── ANIMATION STATE MACHINE ──────────────────────────────────────────────
      if (gltfLoaded) {
        if (ps.health <= 0)   playAnim('DEAD');
        else if (staggered)   playAnim('STAGGER');
        else if (ps.isJumping) playAnim('JUMPING');
        else if (ps.isSliding) playAnim('SLIDING');
        else                   playAnim('RUNNING');
      } else {
        // Procedural limb animation fallback
        if (!ps.isJumping && !ps.isSliding) {
          const c = ps.distance * 0.45;
          armL.rotation.x =  Math.sin(c) * 0.85;
          armR.rotation.x = -Math.sin(c) * 0.85;
          legL.rotation.x = -Math.sin(c) * 0.85;
          legR.rotation.x =  Math.sin(c) * 0.85;
        }
      }

      // ── ENERGY & SHIELD ─────────────────────────────────────────────────────
      ps.energy = Math.max(0, ps.energy - dt * 2.5);
      if (ps.shieldActive) {
        ps.shieldRemaining = Math.max(0, (ps.shieldRemaining ?? 100) - dt * 1.5);
        shield.isVisible = true;
        (shield.material as StandardMaterial).alpha = 0.05 + 0.17 * (ps.shieldRemaining / 100);
        if (ps.shieldRemaining <= 0) { ps.shieldActive = false; shield.isVisible = false; }
      } else {
        shield.isVisible = false;
      }

      // ── PROJECTILES ─────────────────────────────────────────────────────────
      for (let i = activeProjectiles.length - 1; i >= 0; i--) {
        const proj = activeProjectiles[i];
        proj.mesh.position.z += proj.speedZ * dt;
        let hit = false;
        activeObstacles.forEach(obs => {
          if (obs.data.hasBeenPassed || hit) return;
          if (obs.data.lane === proj.lane && Math.abs(obs.mesh.position.z - proj.mesh.position.z) < 1.4) {
            obs.data.hasBeenPassed = true; hit = true; proj.hitAny = true;
            obs.mesh.scaling.set(0.01, 0.01, 0.01);
            playSFX('slam', isMutedRef.current); triggerVibration(30);
            const newCombo = (ps.destroyCombo ?? 0) + 1;
            ps.destroyCombo = newCombo;
            if (newCombo > (ps.maxDestroyCombo ?? 0)) ps.maxDestroyCombo = newCombo;
            ps.bonusScore = (ps.bonusScore ?? 0) + 150 * Math.min(10, 1 + Math.floor(newCombo / 3));
            spawnExplosion(obs.mesh.position, new Color3(0, 0.9, 1));
            spawnShards(obs.mesh.position, obs.mesh.material);
          }
        });
        if (hit || proj.mesh.position.z > 100) {
          if (!proj.hitAny) ps.destroyCombo = 0;
          proj.mesh.dispose(); activeProjectiles.splice(i, 1);
        }
      }

      // ── SLASH WAVES ──────────────────────────────────────────────────────────
      for (let i = activeSlashWaves.length - 1; i >= 0; i--) {
        const w = activeSlashWaves[i];
        w.timeAlive += dt;
        w.mesh.position.z += w.speedZ * dt;
        w.mesh.scaling.x  += dt * 4.5;
        w.mesh.scaling.z  += dt * 1.5;
        (w.mesh.material as StandardMaterial).alpha = Math.max(0, 0.85 - (w.timeAlive / 0.35) * 0.85);
        activeObstacles.forEach(obs => {
          if (obs.data.hasBeenPassed) return;
          if (Math.abs(obs.mesh.position.z - w.mesh.position.z) < 1.4 &&
              Math.abs(obs.mesh.position.x - w.mesh.position.x) < 2.5) {
            w.hitAny = true; obs.data.hasBeenPassed = true;
            obs.mesh.scaling.set(0.01, 0.01, 0.01);
            playSFX('slam', isMutedRef.current); triggerVibration(40);
            const newCombo = (ps.destroyCombo ?? 0) + 1;
            ps.destroyCombo = newCombo;
            if (newCombo > (ps.maxDestroyCombo ?? 0)) ps.maxDestroyCombo = newCombo;
            ps.bonusScore = (ps.bonusScore ?? 0) + 150 * Math.min(10, 1 + Math.floor(newCombo / 3));
            spawnShards(obs.mesh.position, obs.mesh.material);
          }
        });
        if (w.timeAlive >= 0.35) {
          if (!w.hitAny) ps.destroyCombo = 0;
          w.mesh.dispose(); activeSlashWaves.splice(i, 1);
        }
      }

      // ── MOVE OBSTACLES ───────────────────────────────────────────────────────
      activeObstacles.forEach(obs => {
        obs.mesh.position.z -= fd;
        obs.data.zPosition   = obs.mesh.position.z;

        // Near-miss proximity detection
        if (!obs.data.proximityChecked && obs.mesh.position.z <= 0.3) {
          obs.data.proximityChecked = true;
          if (!obs.data.hasBeenPassed) {
            const diff = Math.abs(obs.data.lane - ps.currentLane);
            if (diff <= 1) {
              const pts = diff === 0 ? 250 : 75;
              const newLog: ProximityLog = {
                id: Math.random().toString(36).slice(2),
                type: diff === 0 ? 'PERFECT_DODGE' : 'GRAZE',
                points: pts,
                obstacleType: obs.data.type,
                distance: diff === 0 ? 0.3 : 1.8,
                timestamp: Date.now()
              };
              ps.proximityLogs = [
                newLog,
                ...(ps.proximityLogs ?? []),
              ].slice(0, 5);
              ps.bonusScore = (ps.bonusScore ?? 0) + pts;
            }
          }
        }

        // Scan wireframe overlay
        if (scanActive && !(obs.mesh as any).origMat) {
          (obs.mesh as any).origMat = obs.mesh.material;
          obs.mesh.material = scanMat;
        } else if (!scanActive && (obs.mesh as any).origMat && obs.mesh.material === scanMat) {
          obs.mesh.material = (obs.mesh as any).origMat;
        }
      });

      // ── MOVE COLLECTIBLES ────────────────────────────────────────────────────
      activeCollectibles.forEach(col => {
        col.mesh.position.z -= fd;
        col.mesh.rotation.y += dt * 3;
        col.data.zPosition   = col.mesh.position.z;
      });

      // ── COLLISION: OBSTACLES ────────────────────────────────────────────────
      activeObstacles.forEach(obs => {
        if (obs.data.hasBeenPassed) return;
        if (obs.data.lane !== ps.currentLane) return;
        if (Math.abs(obs.mesh.position.z) >= 0.65) return;

        let hit = false;
        if (obs.data.type === ObstacleType.WALL        && !ps.isSliding) hit = true;
        if (obs.data.type === ObstacleType.DRONE       && !ps.isSliding) hit = true;
        if (obs.data.type === ObstacleType.LOW_BARRIER && !ps.isJumping) hit = true;
        if (obs.data.type === ObstacleType.SPIKE_ROCK  && !ps.isJumping) hit = true;
        if (!hit) return;

        obs.data.hasBeenPassed = true;

        if (burstActiveLocal) {
          playSFX('slam', isMutedRef.current); triggerVibration(60);
          const newCombo = (ps.destroyCombo ?? 0) + 1;
          ps.destroyCombo = newCombo;
          if (newCombo > (ps.maxDestroyCombo ?? 0)) ps.maxDestroyCombo = newCombo;
          ps.bonusScore = (ps.bonusScore ?? 0) + 250 * Math.min(10, 1 + Math.floor(newCombo / 3));
          obs.mesh.scaling.set(0.01, 0.01, 0.01);
          spawnShards(obs.mesh.position, obs.mesh.material);
        } else {
          playSFX('damage', isMutedRef.current);
          ps.destroyCombo = 0;
          if (ps.shieldActive) {
            ps.shieldRemaining = Math.max(0, (ps.shieldRemaining ?? 100) - 45);
            if (ps.shieldRemaining <= 0) { ps.shieldActive = false; shield.isVisible = false; }
          } else {
            triggerVibration([150, 80, 150]);
            ps.health = Math.max(0, ps.health - 25);
            staggered = true;
            let flashes = 0;
            const fi = setInterval(() => {
              if (gltfLoaded && characterRef.current) {
                characterRef.current.getChildMeshes().forEach((m: any) => {
                  m.visibility = flashes % 2 === 0 ? 0.35 : 1;
                });
              }
              flashes++;
              if (flashes >= 6) {
                clearInterval(fi); staggered = false;
                if (gltfLoaded && characterRef.current) {
                  characterRef.current.getChildMeshes().forEach((m: any) => { m.visibility = 1; });
                }
              }
            }, 80);
          }
          if (ps.health <= 0) onGameOver();
        }
      });

      // ── COLLISION: COLLECTIBLES ─────────────────────────────────────────────
      activeCollectibles.forEach(col => {
        if (col.data.hasBeenCollected) return;
        if (col.data.lane !== ps.currentLane) return;
        if (Math.abs(col.mesh.position.z) >= 0.8) return;
        col.data.hasBeenCollected = true;
        col.mesh.dispose();
        playSFX('collect', isMutedRef.current);

        if (col.data.type === 'COIN') {
          ps.coins++; ps.score += 50;
        } else if (col.data.type === 'ENERGY_CELL') {
          ps.energy = Math.min(ps.maxEnergy, ps.energy + 30);
        } else if (col.data.type === 'SHIELD_POWERUP') {
          ps.shieldActive = true; ps.shieldRemaining = 100;
          shield.isVisible = true;
          (shield.material as StandardMaterial).alpha = 0.22;
          ps.bonusScore = (ps.bonusScore ?? 0) + 150;
        } else if (col.data.type === 'VELOCITY_BURST') {
          burstActiveLocal = true; burstTimer = BURST_DURATION;
          setIsBurstActive(true);
          playSFX('speed_boost', isMutedRef.current);
          triggerVibration([80, 50, 80]);
          ps.multiplier = Math.min(10, ps.multiplier + 1);
        } else if (col.data.type === 'POWERUP_PLASMA_BLADE') {
          ps.activeWeapon  = WeaponType.PLASMA_BLADE;
          ps.weaponCharges = Math.min(10, (ps.weaponCharges ?? 0) + 5);
          updateWeaponMesh(WeaponType.PLASMA_BLADE);
          ps.bonusScore = (ps.bonusScore ?? 0) + 100;
        } else if (col.data.type === 'POWERUP_ION_BLASTER') {
          ps.activeWeapon  = WeaponType.BLASTER;
          ps.weaponCharges = Math.min(10, (ps.weaponCharges ?? 0) + 5);
          updateWeaponMesh(WeaponType.BLASTER);
          ps.bonusScore = (ps.bonusScore ?? 0) + 100;
        }
      });

      // ── CLEANUP ──────────────────────────────────────────────────────────────
      for (let i = activeObstacles.length - 1;   i >= 0; i--) { if (activeObstacles[i].mesh.position.z   < -5) { activeObstacles[i].mesh.dispose();   activeObstacles.splice(i, 1);   } }
      for (let i = activeCollectibles.length - 1; i >= 0; i--) { if (activeCollectibles[i].mesh.position.z < -5) { activeCollectibles[i].mesh.dispose(); activeCollectibles.splice(i, 1); } }

      // ── PROCEDURAL SPAWN ─────────────────────────────────────────────────────
      const spawnChance = dt * Math.min(4.5, 1.3 * Math.exp(df * 0.18));
      if (Math.random() < spawnChance) {
        const farZ = 100 + ps.speed * 2.2;
        if (Math.random() > 0.35) spawnObstacle(farZ);
        if (Math.random() > 0.3)  spawnCollectible(farZ + 12);
      }

      // ── SENTINEL ────────────────────────────────────────────────────────────
      if (simAnomalyType) {
        const map: Record<string, () => void> = {
          speed:      () => { ps.speed = 180; },
          'speed-warn': () => { ps.speed = 68; },
          health:     () => { ps.health = 500; },
          state:      () => { ps.isJumping = true; ps.isSliding = true; },
          warp:       () => { ps.distance += 450; },
          score:      () => { ps.score += 85000; },
          'score-warn': () => { ps.score += 12000; },
          'drift-warn': () => { ps.xPosition = 3.8; },
        };
        map[simAnomalyType]?.();
        simAnomalyType = null;
      }

      const validation = SentinelRegistry.validate(ps, prevStats ? { ...prevStats } : null, dt);
      ps.sentinelChecksPassedCount = SentinelRegistry.getChecksPassedCount();
      ps.sentinelWarnings  = validation.warnings ?? [];
      ps.sentinelLogs      = SentinelRegistry.getLogs();
      ps.sentinelStatus    = !validation.isValid ? 'ANOMALY_DETECTED' : (ps.sentinelAnomalies ?? []).length > 0 ? 'ANOMALY_DETECTED' : 'SECURE';
      if (!validation.isValid) {
        ps.sentinelAnomalies = Array.from(new Set([...(ps.sentinelAnomalies ?? []), ...validation.anomalies]));
      }

      prevStats = { ...ps };
      onStatsUpdate({ ...ps });
    });

    engine.runRenderLoop(() => scene.render());

    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);

    // ── CLEANUP ───────────────────────────────────────────────────────────────
    return () => {
      // Trigger dynamic crossfade back to exploration/lounge track
      AbyssumBGM.crossfadeTo('lounge', 1.5);

      window.removeEventListener('keydown',   onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize',    onResize);
      window.removeEventListener('cyber-runner-trigger-scan',    onScanEvent);
      window.removeEventListener('cyber-runner-trigger-anomaly', onAnomalyEvt);
      sceneRef.current = null;
      engine.dispose();
    };
  }, [gameState]);

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full overflow-hidden">
      <style>{`
        @keyframes speedStreak {
          0%   { transform: translateX(100vw); }
          100% { transform: translateX(-150vw); }
        }
        .speed-streak { animation-name: speedStreak; }
      `}</style>

      <svg className="absolute w-0 h-0 pointer-events-none" style={{ visibility: 'hidden' }}>
        <defs>
          <filter id="motion-blur-filter">
            <feGaussianBlur stdDeviation="16 0" />
          </filter>
        </defs>
      </svg>

      {/* Velocity burst overlay */}
      {isBurstActive && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden opacity-85">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(217,70,239,0.18)_100%)] animate-pulse" />
          <div className="absolute inset-0">
            {Array.from({ length: 28 }).map((_, i) => (
              <div
                key={i}
                className="absolute h-[1px] bg-gradient-to-r from-transparent via-fuchsia-400 to-transparent speed-streak"
                style={{
                  top:                    `${Math.random() * 100}%`,
                  left:                   `${Math.random() * 80}%`,
                  width:                  `${120 + Math.random() * 240}px`,
                  opacity:                0.3 + Math.random() * 0.5,
                  animationDuration:      `${0.15 + Math.random() * 0.25}s`,
                  animationDelay:         `${Math.random() * 0.4}s`,
                  animationIterationCount:'infinite',
                  animationTimingFunction:'linear',
                }}
              />
            ))}
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="w-full h-full block outline-none"
        style={isBurstActive ? { filter: 'url(#motion-blur-filter)' } : undefined}
      />

      <button
        onClick={toggleInspector}
        className="absolute top-4 right-4 z-20 px-3 py-1.5 bg-black/70 hover:bg-black/90 border border-[#F27D26]/40 hover:border-[#F27D26] rounded text-[10px] font-mono tracking-wider text-[#F27D26] uppercase select-none transition-all duration-150 flex items-center gap-1.5 cursor-pointer shadow-lg"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${inspectorOpen ? 'bg-green-500 animate-ping' : 'bg-[#F27D26]'}`} />
        {inspectorOpen ? 'CLOSE INSPECTOR' : 'DEBUG INSPECTOR'}
      </button>
    </div>
  );
}