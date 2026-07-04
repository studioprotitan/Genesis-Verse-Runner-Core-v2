import { PlayerState, DiscrepancyLog } from '../types';

export interface Constitution {
  velocity: {
    maxSpeed: number;        // absolute speed ceiling (m/s)
    minSpeed: number;        // absolute speed floor (m/s)
    maxAcceleration: number;  // max velocity delta per second (m/s^2)
  };
  position: {
    validLanes: number[];    // LEFT=-1, CENTER=0, RIGHT=1
    maxLateralOffset: number; // max absolute xPosition allowed (m)
    maxDistanceDeltaPerSecond: number; // max physical progress forward per second (m/s)
  };
  resources: {
    maxHealth: number;
    maxEnergy: number;
    maxCoinsDeltaPerSecond: number; // prevent infinite coins hack
    maxScoreDeltaPerSecond: number; // prevent extreme score multiplication hack
    maxEnergyDeltaPerSecond: number; // limit energy recovery rate
  };
  stateRules: {
    disallowSimultaneousStates: string[][]; // e.g., cannot be jumping and sliding
  };
}

export const CONSTITUTION_STYX: Constitution = {
  velocity: {
    maxSpeed: 80.0,       // normal is ~15-25, burst is up to ~45-50
    minSpeed: 0.0,
    maxAcceleration: 150.0 // prevent extreme acceleration impulses
  },
  position: {
    validLanes: [-1, 0, 1],
    maxLateralOffset: 4.5, // 3 lanes, each ~1.5m wide
    maxDistanceDeltaPerSecond: 90.0
  },
  resources: {
    maxHealth: 100,
    maxEnergy: 100,
    maxCoinsDeltaPerSecond: 25,
    maxScoreDeltaPerSecond: 15000,
    maxEnergyDeltaPerSecond: 100
  },
  stateRules: {
    disallowSimultaneousStates: [
      ['isJumping', 'isSliding']
    ]
  }
};

export interface ValidationResult {
  isValid: boolean;
  anomalies: string[];
  warnings: string[];
}

class SentinelRegistryService {
  private constitution: Constitution = CONSTITUTION_STYX;
  private logs: DiscrepancyLog[] = [];
  private checksPassedCount = 0;

  public getConstitution(): Constitution {
    return this.constitution;
  }

  public updateConstitution(newConfig: Partial<Constitution>) {
    this.constitution = {
      ...this.constitution,
      ...newConfig
    };
    this.logSystemEvent('CONSTITUTION_RECONFIGURED', 'Constitutional schema reloaded under Operation: Styx Rising.');
  }

  public getLogs(): DiscrepancyLog[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    this.logSystemEvent('LOGS_CLEARED', 'Sentinel memory log registry cleared.');
  }

  public getChecksPassedCount(): number {
    return this.checksPassedCount;
  }

  private logSystemEvent(event: string, msg: string) {
    console.log(
      `%c[SENTINEL SYSTEM] %c${event}: %c${msg}`,
      'color: #06b6d4; font-weight: bold;',
      'color: #38bdf8; font-weight: bold;',
      'color: #94a3b8;'
    );
  }

  public logDiscrepancy(anomaly: string, category: DiscrepancyLog['category'], currentVal: any, expectedMax: any) {
    const id = `SENTINEL-DISC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const logItem: DiscrepancyLog = {
      id,
      timestamp: Date.now(),
      anomaly,
      category,
      currentVal,
      expectedMax
    };

    // Keep logs size capped
    this.logs = [logItem, ...this.logs].slice(0, 100);

    // Formatted security console alert
    console.warn(
      `%c[⚠️ SENTINEL INTERCEPTION] %c${category}_VIGILANCE_BREACH%c\nAnomaly: ${anomaly}\nValue: ${JSON.stringify(currentVal)} | Bound: ${JSON.stringify(expectedMax)}\nID: ${id}`,
      'color: #ef4444; font-weight: bold; font-size: 11px;',
      'background-color: #7f1d1d; color: #fca5a5; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
      'color: #f87171;'
    );
  }

  public logWarning(warning: string, category: DiscrepancyLog['category'], currentVal: any, expectedMax: any) {
    const id = `SENTINEL-WARN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Formatted boundary warning alert in browser console
    console.log(
      `%c[⚠️ SENTINEL WARNING] %c${category}_LIMIT_APPROACHING%c\nWarning: ${warning}\nValue: ${JSON.stringify(currentVal)} | Bound: ${JSON.stringify(expectedMax)}\nID: ${id}`,
      'color: #fbbf24; font-weight: bold; font-size: 11px;',
      'background-color: #78350f; color: #fef08a; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
      'color: #fde047;'
    );
  }

  public validate(
    current: PlayerState,
    previous: PlayerState | null,
    dt: number
  ): ValidationResult {
    const anomalies: string[] = [];
    const warnings: string[] = [];
    const c = this.constitution;

    this.checksPassedCount++;

    // 1. VELOCITY CONSTRAINTS
    if (current.speed > c.velocity.maxSpeed) {
      const msg = `VELOCITY_THRESHOLD_BREACH: Velocity measured at ${current.speed.toFixed(1)} m/s (Limit: ${c.velocity.maxSpeed} m/s)`;
      anomalies.push(msg);
      this.logDiscrepancy(msg, 'VELOCITY', current.speed, c.velocity.maxSpeed);
    } else if (current.speed > c.velocity.maxSpeed * 0.7) {
      const msg = `VELOCITY_LIMIT_APPROACHING: Velocity measured at ${current.speed.toFixed(1)} m/s is nearing the warning threshold of ${(c.velocity.maxSpeed * 0.7).toFixed(1)} m/s`;
      warnings.push(msg);
      this.logWarning(msg, 'VELOCITY', current.speed, c.velocity.maxSpeed * 0.7);
    }

    if (current.speed < c.velocity.minSpeed) {
      const msg = `VELOCITY_UNDER_FLOW: Speed dropped below floor ${current.speed.toFixed(1)} m/s`;
      anomalies.push(msg);
      this.logDiscrepancy(msg, 'VELOCITY', current.speed, c.velocity.minSpeed);
    }

    if (previous && dt > 0) {
      const acc = Math.abs(current.speed - previous.speed) / dt;
      if (acc > c.velocity.maxAcceleration) {
        const msg = `ACCELERATION_SPIKE_DETECTED: Acceleration delta of ${acc.toFixed(1)} m/s² exceeds limit ${c.velocity.maxAcceleration} m/s²`;
        anomalies.push(msg);
        this.logDiscrepancy(msg, 'VELOCITY', acc, c.velocity.maxAcceleration);
      } else if (acc > c.velocity.maxAcceleration * 0.7) {
        const msg = `ACCELERATION_SPIKE_WARNING: Acceleration of ${acc.toFixed(1)} m/s² is approaching constraint boundary`;
        warnings.push(msg);
        this.logWarning(msg, 'VELOCITY', acc, c.velocity.maxAcceleration * 0.7);
      }
    }

    // 2. POSITION CONSTRAINTS
    if (!c.position.validLanes.includes(current.currentLane)) {
      const msg = `INVALID_LANE_INDEX: Runner shifted into non-existent lane matrix coordinate ${current.currentLane}`;
      anomalies.push(msg);
      this.logDiscrepancy(msg, 'POSITION', current.currentLane, c.position.validLanes);
    }

    if (Math.abs(current.xPosition) > c.position.maxLateralOffset) {
      const msg = `LATERAL_DRIFT_EXCESSIVE: Horizontal coordinate offset of ${current.xPosition.toFixed(2)}m exceeds limits`;
      anomalies.push(msg);
      this.logDiscrepancy(msg, 'POSITION', current.xPosition, c.position.maxLateralOffset);
    } else if (Math.abs(current.xPosition) > c.position.maxLateralOffset * 0.7) {
      const msg = `LATERAL_DRIFT_WARNING: Horizontal offset of ${Math.abs(current.xPosition).toFixed(2)}m is nearing containment limit of ${c.position.maxLateralOffset}m`;
      warnings.push(msg);
      this.logWarning(msg, 'POSITION', current.xPosition, c.position.maxLateralOffset * 0.7);
    }

    if (previous && dt > 0) {
      const distanceDelta = current.distance - previous.distance;
      const rate = distanceDelta / dt;
      if (distanceDelta < 0) {
        const msg = `NEGATIVE_DISTANCE_TRAVEL_REVERSED: Distance count decremented from ${previous.distance.toFixed(1)} to ${current.distance.toFixed(1)}`;
        anomalies.push(msg);
        this.logDiscrepancy(msg, 'POSITION', distanceDelta, 0);
      } else if (rate > c.position.maxDistanceDeltaPerSecond) {
        const msg = `COORDINATE_WARPING_TELEPORTATION: Travelled ${distanceDelta.toFixed(1)}m in ${dt.toFixed(3)}s (Speed: ${rate.toFixed(1)} m/s)`;
        anomalies.push(msg);
        this.logDiscrepancy(msg, 'POSITION', rate, c.position.maxDistanceDeltaPerSecond);
      } else if (rate > c.position.maxDistanceDeltaPerSecond * 0.7) {
        const msg = `COORDINATE_DISPLACEMENT_WARNING: Travel velocity of ${rate.toFixed(1)} m/s is nearing containment limits`;
        warnings.push(msg);
        this.logWarning(msg, 'POSITION', rate, c.position.maxDistanceDeltaPerSecond * 0.7);
      }
    }

    // 3. RESOURCE CONSTRAINTS
    if (current.health > c.resources.maxHealth) {
      const msg = `HEALTH_INTEGRITY_BREACH: Vital integrity count of ${current.health} exceeds structural ceiling ${c.resources.maxHealth}`;
      anomalies.push(msg);
      this.logDiscrepancy(msg, 'RESOURCE', current.health, c.resources.maxHealth);
    }

    if (current.energy > c.resources.maxEnergy) {
      const msg = `ENERGY_CEILING_VIOLATION: Overcharged fuel core energy index ${current.energy.toFixed(1)} (Limit: ${c.resources.maxEnergy})`;
      anomalies.push(msg);
      this.logDiscrepancy(msg, 'RESOURCE', current.energy, c.resources.maxEnergy);
    }

    if (previous && dt > 0) {
      const coinDelta = current.coins - previous.coins;
      const coinRate = coinDelta / dt;
      if (coinDelta > 0 && coinRate > c.resources.maxCoinsDeltaPerSecond) {
        const msg = `COIN_ACCUMULATION_RATE_FRAUD: Acquired ${coinDelta} credits in ${dt.toFixed(3)}s (Rate: ${coinRate.toFixed(1)}/s)`;
        anomalies.push(msg);
        this.logDiscrepancy(msg, 'RESOURCE', coinRate, c.resources.maxCoinsDeltaPerSecond);
      } else if (coinDelta > 0 && coinRate > c.resources.maxCoinsDeltaPerSecond * 0.7) {
        const msg = `CREDIT_RATE_WARNING: Credit gain rate at ${coinRate.toFixed(1)}/s is approaching system limit`;
        warnings.push(msg);
        this.logWarning(msg, 'RESOURCE', coinRate, c.resources.maxCoinsDeltaPerSecond * 0.7);
      }

      const scoreDelta = current.score - previous.score;
      const scoreRate = scoreDelta / dt;
      if (scoreDelta > 0 && scoreRate > c.resources.maxScoreDeltaPerSecond) {
        const msg = `SCORE_ACCUMULATION_FRAUD: Injected ${scoreDelta} score points in ${dt.toFixed(3)}s (Rate: ${scoreRate.toFixed(1)}/s)`;
        anomalies.push(msg);
        this.logDiscrepancy(msg, 'RESOURCE', scoreRate, c.resources.maxScoreDeltaPerSecond);
      } else if (scoreDelta > 0 && scoreRate > c.resources.maxScoreDeltaPerSecond * 0.7) {
        const msg = `SCORE_ACCUMULATION_WARNING: Score delta rate at ${scoreRate.toFixed(1)}/s is approaching ceiling`;
        warnings.push(msg);
        this.logWarning(msg, 'RESOURCE', scoreRate, c.resources.maxScoreDeltaPerSecond * 0.7);
      }

      const energyDelta = current.energy - previous.energy;
      const energyRate = energyDelta / dt;
      if (energyDelta > 0 && energyRate > c.resources.maxEnergyDeltaPerSecond) {
        const msg = `ENERGY_RECHARGING_ANOMALY: Restored ${energyDelta.toFixed(1)} energy units in ${dt.toFixed(3)}s (Rate: ${energyRate.toFixed(1)}/s)`;
        anomalies.push(msg);
        this.logDiscrepancy(msg, 'RESOURCE', energyRate, c.resources.maxEnergyDeltaPerSecond);
      } else if (energyDelta > 0 && energyRate > c.resources.maxEnergyDeltaPerSecond * 0.7) {
        const msg = `ENERGY_RECHARGE_WARNING: Energy recharge rate at ${energyRate.toFixed(1)}/s is approaching limit`;
        warnings.push(msg);
        this.logWarning(msg, 'RESOURCE', energyRate, c.resources.maxEnergyDeltaPerSecond * 0.7);
      }
    }

    // 4. STATE RULES
    c.stateRules.disallowSimultaneousStates.forEach(([stateA, stateB]) => {
      const valA = (current as any)[stateA];
      const valB = (current as any)[stateB];
      if (valA && valB) {
        const msg = `MUTUAL_STATE_EXCLUSIVITY_VIOLATION: simultaneous flags found for overlapping statuses [${stateA}] and [${stateB}]`;
        anomalies.push(msg);
        this.logDiscrepancy(msg, 'STATE', [stateA, stateB], 'EXCLUSIVE');
      }
    });

    return {
      isValid: anomalies.length === 0,
      anomalies,
      warnings
    };
  }
}

export const SentinelRegistry = new SentinelRegistryService();
