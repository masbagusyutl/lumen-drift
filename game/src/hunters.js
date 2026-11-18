// Hunter drones: the courier's pursuers. A hunter spawns at a field edge,
// locks onto the ship, and steers toward it with a limited turn rate —
// fast enough to be a threat, slow enough to turn that a sharp dash or a
// tight corner shakes it off. Speed and numbers climb with the sector.

import { FIELD, HUNTER } from './config.js';

/** Turn `angle` toward `target` by at most `maxStep` radians, the short way. */
function turnToward(angle, target, maxStep) {
  let diff = target - angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (diff > maxStep) return angle + maxStep;
  if (diff < -maxStep) return angle - maxStep;
  return target;
}

export function createHunter(random, sector) {
  // Hunters enter from a random edge, away from the ship's nose.
  const edge = random.int(0, 3);
  const margin = 30;
  let x = 0;
  let y = 0;
  if (edge === 0) { x = -margin; y = random.range(60, FIELD.height - 60); }
  if (edge === 1) { x = FIELD.width + margin; y = random.range(60, FIELD.height - 60); }
  if (edge === 2) { y = -margin; x = random.range(60, FIELD.width - 60); }
  if (edge === 3) { y = FIELD.height + margin; x = random.range(60, FIELD.width - 60); }
  return {
    x, y,
    vx: 0,
    vy: 0,
    angle: random.range(0, Math.PI * 2),
    radius: HUNTER.radius,
    // A little wobble keeps two hunters from flying in perfect formation.
    wobble: random.range(0, Math.PI * 2),
    wobbleSpeed: random.range(1.2, 2.2)
  };
}

/** One fixed step of pursuit: turn onto the ship, accelerate, cap speed. */
export function stepHunter(hunter, ship, dt, sector, time) {
  const desired = Math.atan2(ship.y - hunter.y, ship.x - hunter.x);
  // The wobble makes the approach weave instead of a dead-straight line.
  const weave = Math.sin(time * hunter.wobbleSpeed + hunter.wobble) * 0.35;
  hunter.angle = turnToward(hunter.angle, desired + weave, HUNTER.turnRate * dt);
  hunter.vx += Math.cos(hunter.angle) * HUNTER.accel * dt;
  hunter.vy += Math.sin(hunter.angle) * HUNTER.accel * dt;
  const maxSpeed = HUNTER.maxSpeed + (sector - 1) * HUNTER.speedPerSector;
  const speed = Math.hypot(hunter.vx, hunter.vy);
  if (speed > maxSpeed) {
    hunter.vx = (hunter.vx / speed) * maxSpeed;
    hunter.vy = (hunter.vy / speed) * maxSpeed;
  }
  hunter.x += hunter.vx * dt;
  hunter.y += hunter.vy * dt;
  // Hunters stay inside the field; they bounce softly off its edges.
  if (hunter.x < hunter.radius) { hunter.x = hunter.radius; hunter.vx = Math.abs(hunter.vx) * 0.6; }
  if (hunter.x > FIELD.width - hunter.radius) { hunter.x = FIELD.width - hunter.radius; hunter.vx = -Math.abs(hunter.vx) * 0.6; }
  if (hunter.y < hunter.radius) { hunter.y = hunter.radius; hunter.vy = Math.abs(hunter.vy) * 0.6; }
  if (hunter.y > FIELD.height - hunter.radius) { hunter.y = FIELD.height - hunter.radius; hunter.vy = -Math.abs(hunter.vy) * 0.6; }
}

/** How many hunters may be active at once in this sector. */
export function hunterCap(sector) {
  return Math.min(HUNTER.maxActive, 1 + sector);
}
