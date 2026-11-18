// The blaster: the courier's answer to hunters and rocks. Bolts fly straight
// where the ship points, and every shot builds heat — hold the trigger too
// long and the gun overheats and locks until it cools. Heat is the whole
// ammo economy: there is nothing to pick up, only timing to manage.

import { BLASTER } from './config.js';

export function createBlaster() {
  return { heat: 0, cooldown: 0, overheated: 0 };
}

export function resetBlaster(blaster) {
  blaster.heat = 0;
  blaster.cooldown = 0;
  blaster.overheated = 0;
}

/** Try to fire one bolt from the ship's nose. Returns true when a bolt left. */
export function tryFire(blaster, ship, bolts) {
  if (blaster.cooldown > 0 || blaster.overheated > 0) return false;
  if (bolts.length >= 24) return false;
  bolts.push({
    x: ship.x + Math.cos(ship.angle) * 22,
    y: ship.y + Math.sin(ship.angle) * 22,
    vx: Math.cos(ship.angle) * BLASTER.speed + ship.vx * 0.35,
    vy: Math.sin(ship.angle) * BLASTER.speed + ship.vy * 0.35,
    life: BLASTER.life
  });
  blaster.cooldown = BLASTER.cooldown;
  blaster.heat += BLASTER.heatPerShot;
  if (blaster.heat >= BLASTER.overheatAt) {
    blaster.heat = BLASTER.overheatAt;
    blaster.overheated = BLASTER.overheatCooldown;
  }
  return true;
}

/** Cool the gun one step; an overheated gun sheds heat twice as fast. */
export function stepBlaster(blaster, dt) {
  blaster.cooldown = Math.max(0, blaster.cooldown - dt);
  if (blaster.overheated > 0) {
    blaster.overheated = Math.max(0, blaster.overheated - dt);
    blaster.heat = Math.max(0, blaster.heat - BLASTER.coolPerSecond * 2 * dt);
  } else {
    blaster.heat = Math.max(0, blaster.heat - BLASTER.coolPerSecond * dt);
  }
}

/** Advance every bolt; returns nothing — the world removes spent ones. */
export function stepBolts(bolts, dt) {
  for (const bolt of bolts) {
    bolt.x += bolt.vx * dt;
    bolt.y += bolt.vy * dt;
    bolt.life -= dt;
  }
}

/** 0..1, how hot the gun is — the HUD draws it as a heat bar. */
export function heatLevel(blaster) {
  return blaster.heat / BLASTER.overheatAt;
}
