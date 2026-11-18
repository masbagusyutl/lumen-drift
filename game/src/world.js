// The world: everything that drifts, collides and scores. The ship crosses a
// field of asteroids; data-orbs are the cargo. Collect a sector's orbs to
// clear it and jump to a faster one; every rock that reaches the ship costs
// hull, and at zero hull the run ends. Orbs collected in quick succession
// build a combo multiplier, and a shield pickup now and then forgives a hit.

import { ASTEROID, BLASTER, COMBO, DELIVERY, FIELD, HULL, HUNTER, ORB, POOL, SECTOR, SHIELD } from './config.js';
import { createShip, resetShip, stepShip, tryDash } from './ship.js';
import { createHunter, hunterCap, stepHunter } from './hunters.js';
import { createBlaster, resetBlaster, stepBlaster, stepBolts, tryFire } from './blaster.js';
import { createDelivery, resetDelivery, stepDelivery } from './delivery.js';

export const EVENT_ORB = 1;
export const EVENT_HIT = 2;
export const EVENT_OVER = 4;
export const EVENT_CLEAR = 8;
export const EVENT_SHIELD = 16;
export const EVENT_DASH = 32;
export const EVENT_SHOT = 64;
export const EVENT_KILL = 128;
export const EVENT_PICKUP = 256;
export const EVENT_DELIVERED = 512;
export const EVENT_LOST = 1024;

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
    hunters: [],
    bolts: [],
    blaster: createBlaster(),
    delivery: createDelivery(),
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
    huntersDown: 0,
    deliveriesMade: 0,
    time: 0,
    bannerTimer: 0,
    shake: 0,
    over: false,
    asteroidTimer: ASTEROID.firstDelay,
    hunterTimer: HUNTER.firstDelay
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

  function spawnHunter() {
    if (state.hunters.length >= hunterCap(state.sector)) return;
    if (state.hunters.length >= POOL.hunters) return;
    state.hunters.push(createHunter(random, state.sector));
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

  /** A threat — a rock or a hunter — reached the ship: sparks, shake, hull. */
  function hitByThreat(x, y) {
    burst(state.ship.x, state.ship.y, '#ff5d73', 22, 260);
    burst(x, y, '#c7d5ee', 10, 170);
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

  function hitAsteroid(asteroid) {
    return hitByThreat(asteroid.x, asteroid.y);
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
    state.hunters.length = 0;
    state.bolts.length = 0;
    resetBlaster(state.blaster);
    resetDelivery(state.delivery);
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
    state.huntersDown = 0;
    state.deliveriesMade = 0;
    state.time = 0;
    state.bannerTimer = 0;
    state.shake = 0;
    state.over = false;
    state.asteroidTimer = ASTEROID.firstDelay;
    state.hunterTimer = HUNTER.firstDelay;
    for (let i = 0; i < 3; i += 1) spawnOrb();
  }

  /**
   * Advance one fixed step. `control` is {x, y, dash, fire} — a thrust
   * direction, a dash request and a held trigger. `attract` runs the field
   * without a pilot (the title screen's backdrop): rocks and orbs drift,
   * nothing collides or scores.
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
    stepBlaster(state.blaster, dt);
    if (!attract && !state.over && control.fire && tryFire(state.blaster, state.ship, state.bolts)) {
      events |= EVENT_SHOT;
    }

    if (!attract) {
      state.hunterTimer -= dt;
      if (state.hunterTimer <= 0) {
        spawnHunter();
        const interval = Math.max(
          HUNTER.minInterval,
          HUNTER.interval - (state.sector - 1) * HUNTER.intervalPerSector
        );
        state.hunterTimer = interval * random.range(0.8, 1.2);
      }
    }

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

    // Hunters chase the ship; a hunter that reaches it explodes on the hull.
    for (let i = state.hunters.length - 1; i >= 0; i -= 1) {
      const hunter = state.hunters[i];
      if (!attract) stepHunter(hunter, state.ship, dt, state.sector, state.time);
      if (attract || state.over) continue;
      if (Math.hypot(hunter.x - state.ship.x, hunter.y - state.ship.y) < hunter.radius * 0.85 + 14
        && state.ship.invulnerable <= 0) {
        state.hunters.splice(i, 1);
        events |= hitByThreat(hunter.x, hunter.y);
      }
    }

    // Bolts fly, then meet hunters and rocks. A kill pays points and sparks.
    stepBolts(state.bolts, dt);
    for (let i = state.bolts.length - 1; i >= 0; i -= 1) {
      const bolt = state.bolts[i];
      let spent = bolt.life <= 0
        || bolt.x < -20 || bolt.x > FIELD.width + 20
        || bolt.y < -20 || bolt.y > FIELD.height + 20;
      if (!spent && !attract && !state.over) {
        for (let j = state.hunters.length - 1; j >= 0; j -= 1) {
          const hunter = state.hunters[j];
          if (Math.hypot(hunter.x - bolt.x, hunter.y - bolt.y) < hunter.radius + BLASTER.radius) {
            burst(hunter.x, hunter.y, '#ff4d6d', 18, 240);
            burst(hunter.x, hunter.y, '#ffd166', 8, 160);
            state.hunters.splice(j, 1);
            state.score += HUNTER.score;
            state.huntersDown += 1;
            events |= EVENT_KILL;
            spent = true;
            break;
          }
        }
      }
      if (!spent && !attract && !state.over) {
        for (let j = state.asteroids.length - 1; j >= 0; j -= 1) {
          const rock = state.asteroids[j];
          if (Math.hypot(rock.x - bolt.x, rock.y - bolt.y) < rock.radius * 0.9 + BLASTER.radius) {
            burst(rock.x, rock.y, '#c7d5ee', 14, 200);
            state.asteroids.splice(j, 1);
            state.score += 15;
            events |= EVENT_KILL;
            spent = true;
            break;
          }
        }
      }
      if (spent) state.bolts.splice(i, 1);
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
      const delivery = stepDelivery(state.delivery, state.ship, random, dt);
      if (delivery === 'pickup') {
        burst(state.ship.x, state.ship.y, '#ff9f43', 14, 200);
        events |= EVENT_PICKUP;
      } else if (delivery === 'delivered') {
        state.score += DELIVERY.bonus;
        state.deliveriesMade += 1;
        burst(state.ship.x, state.ship.y, '#8affc1', 26, 280);
        events |= EVENT_DELIVERED;
      } else if (delivery === 'lost') {
        events |= EVENT_LOST;
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
