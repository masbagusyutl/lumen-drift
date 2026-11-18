// Orb delivery: the courier's real job. A cargo parcel spawns somewhere in
// the field; pick it up and a beacon drop zone lights up at the far side.
// Carry the parcel into the beacon before its timer runs out for a big
// bonus. Lose the timer and the parcel is gone — the next one spawns after
// a breather. One parcel at a time, never while the run is over.

import { DELIVERY, FIELD } from './config.js';

export function createDelivery() {
  return {
    parcel: null,      // {x, y, phase} while one waits to be picked up
    zone: null,        // {x, y} while a delivery is in progress
    carrying: false,
    timer: 0,          // seconds left to deliver, while carrying
    spawnTimer: DELIVERY.firstDelay
  };
}

export function resetDelivery(delivery) {
  delivery.parcel = null;
  delivery.zone = null;
  delivery.carrying = false;
  delivery.timer = 0;
  delivery.spawnTimer = DELIVERY.firstDelay;
}

/** Pick a parcel spot away from the ship, so the pickup is a trip. */
function spawnParcel(delivery, ship, random) {
  let x = FIELD.width / 2;
  let y = FIELD.height / 2;
  for (let tries = 0; tries < 8; tries += 1) {
    x = random.range(90, FIELD.width - 90);
    y = random.range(90, FIELD.height - 90);
    if (Math.hypot(x - ship.x, y - ship.y) > 200) break;
  }
  delivery.parcel = { x, y, phase: random.range(0, Math.PI * 2) };
}

/** The beacon opens on the far side of the field from where the parcel was. */
function spawnZone(delivery, ship, random) {
  // Prefer the half of the field opposite the ship, so a delivery crosses it.
  const left = ship.x > FIELD.width / 2;
  const x = random.range(left ? 90 : FIELD.width / 2 + 60, left ? FIELD.width / 2 - 60 : FIELD.width - 90);
  const y = random.range(90, FIELD.height - 90);
  delivery.zone = { x, y };
}

/**
 * Advance the delivery loop one step. Returns 'pickup', 'delivered',
 * 'lost', or '' — the world turns those into score, sound and announcements.
 */
export function stepDelivery(delivery, ship, random, dt) {
  if (delivery.carrying) {
    delivery.timer -= dt;
    if (delivery.timer <= 0) {
      delivery.carrying = false;
      delivery.zone = null;
      delivery.spawnTimer = DELIVERY.respawnDelay;
      return 'lost';
    }
    if (Math.hypot(delivery.zone.x - ship.x, delivery.zone.y - ship.y) < DELIVERY.zoneRadius) {
      delivery.carrying = false;
      delivery.zone = null;
      delivery.spawnTimer = DELIVERY.respawnDelay;
      return 'delivered';
    }
    return '';
  }
  if (delivery.parcel) {
    if (Math.hypot(delivery.parcel.x - ship.x, delivery.parcel.y - ship.y)
      < DELIVERY.parcelRadius + 16) {
      delivery.parcel = null;
      delivery.carrying = true;
      delivery.timer = DELIVERY.timeLimit;
      spawnZone(delivery, ship, random);
      return 'pickup';
    }
    return '';
  }
  delivery.spawnTimer -= dt;
  if (delivery.spawnTimer <= 0) spawnParcel(delivery, ship, random);
  return '';
}
