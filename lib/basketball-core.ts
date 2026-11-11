/**
 * XBA Basketball Core Simulation
 * Translated from original simulation core to TypeScript
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type ManeuverType = 
  // Offensive
  'crossover' | 'doubleCrossover' | 'betweenLegs' | 'behindBack' | 'spinDribble' | 
  'hesitation' | 'inAndOut' | 'stutterStep' | 'retreatDribble' | 'stepBack' | 
  'changeOfPace' | 'explosiveFirstStep' | 'jabStep' | 'shotFake' | 'passFake' | 
  'ripThrough' | 'forwardPivot' | 'reversePivot' | 'jumpStop' | 'euroStep' | 
  'proHop' | 'reverseLayup' | 'fingerRoll' | 'floater' | 'runner' | 
  'pullUpJumper' | 'fadeawayJumper' | 'sideStepThree' | 'catchAndShoot' | 'turnaroundJumper' | 
  'spinMoveShot' | 'upAndUnder' | 'dropStep' | 'pickAndRoll' | 'giveAndGo' |
  // Defensive
  'defensiveStance' | 'lateralSlide' | 'sprintRecovery' | 'backpedal' | 'closeout' | 
  'shotContest' | 'timedJumpContest' | 'stealAttempt' | 'interception' | 'ballDeflection' | 
  'cutOffDrive' | 'forceSideline' | 'denyPass' | 'helpDefense' | 'recoverAssignment' | 
  'switchAssignment' | 'fightThroughScreen' | 'goOverScreen' | 'goUnderScreen' | 'hedgeAndRecover' | 
  'dropCoverage' | 'doubleTeam' | 'sidelineTrap' | 'fullCourtPress' | 'halfCourtPress' | 
  'zoneDefense' | 'boxOut' | 'chaseDownBlock' | 'drawCharge' | 'verticalRimProtection';

export interface ShotResult {
  timingScore: number;
  quality: number;
  makeProbability: number;
  made: boolean;
}

export const BasketballCore = (() => {
  const GRAVITY = 9.81 * 10; 

  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

  const distance3D = (a: Vec3, b: Vec3) => Math.hypot(
    b.x - a.x,
    b.y - a.y,
    b.z - a.z
  );

  // Maneuver System
  function executeManeuver(player: any, type: ManeuverType, context: any) {
    // 1. Stamina Check
    const cost = 5; // Base cost
    if (player.stamina < cost) return false;
    player.stamina -= cost;

    // 2. Contextual Logic based on player state, proximity, ball handling, etc.
    // Example: Crossover logic
    if (type === 'crossover') {
       // Check for defender proximity to determine effectiveness
       // ... logic ...
    }

    // 3. Apply physics/state changes
    // ... move application ...
    
    return true;
  }

  // ... [calculateShot, launchBall, stepBall, calculateContest kept as is]
  // ... (omitted for brevity, but they stay)

  function calculateShot({
    releaseTiming = 0.5,
    shootingRating = 75,
    distance = 5,
    defenderPressure = 0,
    stamina = 100,
    shotType = "jumpShot"
  }: {
    releaseTiming?: number;
    shootingRating?: number;
    distance?: number;
    defenderPressure?: number;
    stamina?: number;
    shotType?: string;
  }): ShotResult {
    // ... [Existing calculateShot implementation]
    const timingError = Math.abs(releaseTiming - 0.5) * 2;
    const timingScore = 1 - clamp(timingError, 0, 1);
    const ratingScore = clamp(shootingRating / 99, 0, 1);
    const distancePenalty = clamp(distance / 15, 0, 0.7);
    const pressurePenalty = clamp(defenderPressure, 0, 1) * 0.35;
    const fatiguePenalty = (1 - clamp(stamina / 100, 0, 1)) * 0.18;

    const typeBonus: Record<string, number> = {
      jumpShot: 0,
      layup: 0.08,
      freeThrow: 0.12,
      threePointer: -0.08
    };
    const bonus = typeBonus[shotType] ?? 0;

    const quality = clamp(
      0.25 * timingScore +
      0.65 * ratingScore +
      bonus -
      distancePenalty -
      pressurePenalty -
      fatiguePenalty +
      0.18,
      0,
      1
    );

    const makeProbability = clamp(
      0.08 + quality * 0.78,
      0.02,
      0.95
    );

    return {
      timingScore,
      quality,
      makeProbability,
      made: Math.random() < makeProbability
    };
  }

  function launchBall({
    start,
    target,
    flightTime = 0.9,
    arcBoost = 1.0
  }: {
    start: Vec3;
    target: Vec3;
    flightTime?: number;
    arcBoost?: number;
  }) {
    const t = Math.max(0.1, flightTime);

    // Ground movement (x, y)
    const vx = (target.x - start.x) / t;
    const vy = (target.y - start.y) / t;

    // Vertical movement (z) - Core y mapped to Game z
    const vz = (target.z - start.z + 0.5 * GRAVITY * t * t) / t + arcBoost;

    return {
      position: { ...start },
      velocity: { x: vx, y: vy, z: vz },
      flightTime: t
    };
  }

  function stepBall(ball: { position: Vec3, velocity: Vec3 }, deltaTime: number) {
    const dt = clamp(deltaTime, 0, 0.05);

    // Gravity acts on Z
    ball.velocity.z -= GRAVITY * dt;

    ball.position.x += ball.velocity.x * dt;
    ball.position.y += ball.velocity.y * dt;
    ball.position.z += ball.velocity.z * dt;

    // Floor collision
    if (ball.position.z < 0) {
      ball.position.z = 0;
      ball.velocity.z *= -0.55;
      ball.velocity.x *= 0.82;
      ball.velocity.y *= 0.82;

      if (Math.abs(ball.velocity.z) < 1.0) {
        ball.velocity.z = 0;
      }
    }

    return ball;
  }

  function calculateContest({
    shooterPosition,
    defenderPosition,
    defenderHeight = 1.9,
    contestStrength = 75
  }: {
    shooterPosition: Vec3;
    defenderPosition: Vec3;
    defenderHeight?: number;
    contestStrength?: number;
  }) {
    const separation = distance3D(shooterPosition, defenderPosition);
    const proximity = 1 - clamp(separation / 100, 0, 1); // Scaled distance
    const strength = clamp(contestStrength / 99, 0, 1);
    const heightFactor = clamp(defenderHeight / 2.4, 0, 1);

    return clamp(proximity * strength * heightFactor, 0, 1);
  }

  return {
    calculateShot,
    launchBall,
    stepBall,
    calculateContest,
    executeManeuver
  };
})();
