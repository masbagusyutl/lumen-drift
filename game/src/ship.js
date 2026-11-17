// The courier ship: position, velocity, facing, dash and its engine trail.
// Movement is thrust-and-drift — hold a direction to accelerate, let go and
// the ship glides — with a short dash burst on a cooldown for escaping rocks.

import { FIELD, SHIP } from './config.js';

export function createShip() {
  return {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    dashTime: 0,
    dashCooldown: 0,
    invulnerable: 0,
    shieldTime: 0,
    trail: [] // recent positions, oldest first, drawn as a fading ribbon
  };
}

export function resetShip(ship) {
  ship.x = FIELD.width / 2;
  ship.y = FIELD.height / 2;
  ship.vx = 0;
  ship.vy = 0;
  ship.angle = -Math.PI / 2;
  ship.dashTime = 0;
  ship.dashCooldown = 0;
  ship.invulnerable = 0;
  ship.shieldTime = 0;
  ship.trail.length = 0;
}

/** Try to start a dash; returns true when it fired (the world plays the sound). */
export function tryDash(ship, move) {
  if (ship.dashCooldown > 0 || ship.dashTime > 0) return false;
  let dx = move.x;
  let dy = move.y;
  if (dx === 0 && dy === 0) {
    dx = Math.cos(ship.angle);
    dy = Math.sin(ship.angle);
  }
  const length = Math.hypot(dx, dy) || 1;
  ship.vx = (dx / length) * SHIP.dashSpeed;
  ship.vy = (dy / length) * SHIP.dashSpeed;
  ship.dashTime = SHIP.dashSeconds;
  ship.dashCooldown = SHIP.dashCooldown;
  return true;
}

/** Advance the ship one fixed step under the given thrust direction. */
export function stepShip(ship, dt, move) {
  ship.vx += move.x * SHIP.thrust * dt;
  ship.vy += move.y * SHIP.thrust * dt;

  const damping = Math.max(0, 1 - SHIP.drag * dt);
  ship.vx *= damping;
  ship.vy *= damping;

  const speed = Math.hypot(ship.vx, ship.vy);
  const cap = ship.dashTime > 0 ? SHIP.dashSpeed : SHIP.maxSpeed;
  if (speed > cap) {
    ship.vx = (ship.vx / speed) * cap;
    ship.vy = (ship.vy / speed) * cap;
  }

  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;

  // The field is a soft box: the ship bounces gently off its edges.
  if (ship.x < SHIP.radius) { ship.x = SHIP.radius; ship.vx = Math.abs(ship.vx) * 0.5; }
  if (ship.x > FIELD.width - SHIP.radius) { ship.x = FIELD.width - SHIP.radius; ship.vx = -Math.abs(ship.vx) * 0.5; }
  if (ship.y < SHIP.radius) { ship.y = SHIP.radius; ship.vy = Math.abs(ship.vy) * 0.5; }
  if (ship.y > FIELD.height - SHIP.radius) { ship.y = FIELD.height - SHIP.radius; ship.vy = -Math.abs(ship.vy) * 0.5; }

  if (speed > 24) ship.angle = Math.atan2(ship.vy, ship.vx);

  ship.dashTime = Math.max(0, ship.dashTime - dt);
  ship.dashCooldown = Math.max(0, ship.dashCooldown - dt);
  ship.invulnerable = Math.max(0, ship.invulnerable - dt);
  ship.shieldTime = Math.max(0, ship.shieldTime - dt);

  ship.trail.push({ x: ship.x, y: ship.y });
  if (ship.trail.length > 22) ship.trail.shift();
}

/** 0..1, how ready the dash is — the HUD draws it as a small bar. */
export function dashReadiness(ship) {
  return 1 - ship.dashCooldown / SHIP.dashCooldown;
}
