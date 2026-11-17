// The world: everything that drifts, collides and scores. The ship crosses a
// field of asteroids; data-orbs are the cargo. Collect a sector's orbs to
// clear it and jump to a faster one; every rock that reaches the ship costs
// hull, and at zero hull the run ends. Orbs collected in quick succession
// build a combo multiplier, and a shield pickup now and then forgives a hit.

import { ASTEROID, COMBO, FIELD, HULL, ORB, POOL, SECTOR, SHIELD } from './config.js';
import { createShip, resetShip, stepShip, tryDash } from './ship.js';

export const EVENT_ORB = 1;
export const EVENT_HIT = 2;
export const EVENT_OVER = 4;
export const EVENT_CLEAR = 8;
export const EVENT_SHIELD = 16;
export const EVENT_DASH = 32;

function makeAsteroidShape(random) {
  const points = [];
  const count = random.int(7, 10);
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const scale = random.range(0.72, 1.12);
    points.push({ angle, scale });
  }
  return points;
}

export function createWorld(random) {
  const state = {
    ship: createShip(),
    asteroids: [],
    orbs: [],
    pickups: [],
    particles: [],
    score: 0,
    combo: 0,
    bestCombo: 0,
    comboTimer: 0,
    hull: HULL,
    sector: 1,
    orbsCollected: 0,
    orbsSpawned: 0,
    time: 0,
    bannerTimer: 0,
    shake: 0,
    over: false,
    asteroidTimer: ASTEROID.firstDelay
  };

  function spawnAsteroid() {
    if (state.asteroids.length >= POOL.asteroids) return;
    const radius = random.range(ASTEROID.minRadius, ASTEROID.maxRadius);
    // Rocks enter from the right edge and drift left, with a vertical lean.
    const speed = random.range(ASTEROID.minSpeed, ASTEROID.maxSpeed)
      + (state.sector - 1) * ASTEROID.speedPerSector;
    state.asteroids.push({
      x: FIELD.width + radius + 4,
      y: random.range(radius, FIELD.height - radius),
      vx: -speed,
      vy: random.range(-38, 38),
      radius,
      angle: random.range(0, Math.PI * 2),
      spin: random.range(-ASTEROID.spinMax, ASTEROID.spinMax),
      shape: makeAsteroidShape(random)
    });
  }

  function spawnOrb() {
    if (state.orbs.length >= POOL.orbs) return;
    if (state.orbsSpawned >= ORB.perSector) return;
    // Keep orbs away from the edges and from the ship's nose, so a fresh orb
    // is a small trip, never a free pickup or an instant ambush.
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 8; tries += 1) {
      x = random.range(90, FIELD.width - 90);
      y = random.range(90, FIELD.height - 90);
      if (Math.hypot(x - state.ship.x, y - state.ship.y) > 170) break;
    }
    state.orbs.push({ x, y, phase: random.range(0, Math.PI * 2) });
    state.orbsSpawned += 1;
  }

  function spawnShield() {
    if (state.pickups.length >= SHIELD.maxActive) return;
    state.pickups.push({
      x: random.range(110, FIELD.width - 110),
      y: random.range(110, FIELD.height - 110),
      phase: random.range(0, Math.PI * 2)
    });
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      if (state.particles.length >= POOL.particles) return;
      const angle = random.range(0, Math.PI * 2);
      const velocity = random.range(speed * 0.25, speed);
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: random.range(0.3, 0.75),
        maxLife: 0.75,
        color,
        size: random.range(1.6, 3.6)
      });
    }
  }

  function collectOrb(orb) {
    state.combo = state.comboTimer > 0 ? Math.min(state.combo + 1, COMBO.maxMultiplier * 4) : 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.comboTimer = COMBO.windowSeconds;
    const multiplier = 1 + Math.floor((state.combo - 1) / 4);
    state.score += ORB.points * multiplier;
    state.orbsCollected += 1;
    burst(orb.x, orb.y, '#ffe45e', 12, 190);
    if (random.chance(SHIELD.chance)) spawnShield();
    if (state.orbsCollected >= ORB.perSector) return true;
    spawnOrb();
    return false;
  }

  function hitAsteroid(asteroid) {
    burst(state.ship.x, state.ship.y, '#ff5d73', 22, 260);
    burst(asteroid.x, asteroid.y, '#c7d5ee', 10, 170);
    state.shake = 0.45;
    state.combo = 0;
    state.comboTimer = 0;
    if (state.ship.shieldTime > 0) {
      state.ship.shieldTime = 0;
      state.ship.invulnerable = 1;
      return EVENT_HIT;
    }
    state.hull -= 1;
    state.ship.invulnerable = 2;
    if (state.hull <= 0) {
      state.over = true;
      burst(state.ship.x, state.ship.y, '#59f7ff', 42, 340);
      return EVENT_HIT | EVENT_OVER;
    }
    return EVENT_HIT;
  }

  function clearSector() {
    state.score += SECTOR.bonus * state.sector;
    state.sector += 1;
    state.orbsCollected = 0;
    state.orbsSpawned = 0;
    state.bannerTimer = SECTOR.bannerSeconds;
    burst(state.ship.x, state.ship.y, '#6effa8', 30, 280);
    for (let i = 0; i < 3; i += 1) spawnOrb();
  }

  function reset() {
    resetShip(state.ship);
    state.asteroids.length = 0;
    state.orbs.length = 0;
    state.pickups.length = 0;
    state.particles.length = 0;
    state.score = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.comboTimer = 0;
    state.hull = HULL;
    state.sector = 1;
    state.orbsCollected = 0;
    state.orbsSpawned = 0;
    state.time = 0;
    state.bannerTimer = 0;
    state.shake = 0;
    state.over = false;
    state.asteroidTimer = ASTEROID.firstDelay;
    for (let i = 0; i < 3; i += 1) spawnOrb();
  }

  /**
   * Advance one fixed step. `control` is {x, y, dash} — a thrust direction
   * and a dash request. `attract` runs the field without a pilot (the title
   * screen's backdrop): rocks and orbs drift, nothing collides or scores.
   * Returns the events that happened, as a bitmask.
   */
  function step(dt, control, attract = false) {
    let events = 0;
    state.time += dt;
    state.bannerTimer = Math.max(0, state.bannerTimer - dt);
    state.shake = Math.max(0, state.shake - dt);
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }

    if (!attract && control.dash && tryDash(state.ship, control)) events |= EVENT_DASH;
    stepShip(state.ship, dt, attract ? { x: 0, y: 0 } : control);

    state.asteroidTimer -= dt;
    if (state.asteroidTimer <= 0) {
      spawnAsteroid();
      const interval = Math.max(
        ASTEROID.minInterval,
        ASTEROID.interval - (state.sector - 1) * ASTEROID.intervalPerSector
      );
      state.asteroidTimer = interval * random.range(0.7, 1.3);
    }

    for (let i = state.asteroids.length - 1; i >= 0; i -= 1) {
      const rock = state.asteroids[i];
      rock.x += rock.vx * dt;
      rock.y += rock.vy * dt;
      rock.angle += rock.spin * dt;
      if (rock.y < rock.radius || rock.y > FIELD.height - rock.radius) rock.vy *= -1;
      if (rock.x < -rock.radius - 8) {
        state.asteroids.splice(i, 1);
        continue;
      }
      if (attract || state.over) continue;
      const distance = Math.hypot(rock.x - state.ship.x, rock.y - state.ship.y);
      if (distance < rock.radius * 0.82 + 14 && state.ship.invulnerable <= 0) {
        state.asteroids.splice(i, 1);
        events |= hitAsteroid(rock);
      }
    }

    if (!attract && !state.over) {
      for (let i = state.orbs.length - 1; i >= 0; i -= 1) {
        const orb = state.orbs[i];
        if (Math.hypot(orb.x - state.ship.x, orb.y - state.ship.y) < ORB.radius + 16) {
          state.orbs.splice(i, 1);
          events |= EVENT_ORB;
          if (collectOrb(orb)) {
            events |= EVENT_CLEAR;
            clearSector();
          }
        }
      }
      for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
        const pickup = state.pickups[i];
        if (Math.hypot(pickup.x - state.ship.x, pickup.y - state.ship.y) < SHIELD.radius + 16) {
          state.pickups.splice(i, 1);
          state.ship.shieldTime = SHIELD.seconds;
          burst(pickup.x, pickup.y, '#6effa8', 14, 200);
          events |= EVENT_SHIELD;
        }
      }
    }

    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const spark = state.particles[i];
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.life -= dt;
      if (spark.life <= 0) state.particles.splice(i, 1);
    }

    return events;
  }

  reset();
  return { state, step, reset };
}
