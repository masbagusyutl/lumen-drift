// The staged scenes behind ?shot=title|play|clear|over (with &seed=N).
// Each scene runs the real rules forward from a fresh world, steered by an
// autopilot, so a screenshot is a frame a real run passes through — and the
// same seed always stages the same frame. Three pilots: a collector that
// plays well (title backdrop and the play scene), a collector pushed until
// it clears the sector (the clear scene), and a reckless one that steers at
// the rocks until the hull is gone (the game-over scene).

import { FIELD, STEP } from './config.js';
import { EVENT_CLEAR, EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const TITLE_SECONDS = 6;
const PLAY_SECONDS = 16;
const CLEAR_LIMIT_SECONDS = 150;
const OVER_LIMIT_SECONDS = 240;

/** Steer toward a point, backing off from any rock that is close ahead. */
function steer(state, targetX, targetY, care) {
  let x = targetX - state.ship.x;
  let y = targetY - state.ship.y;
  const distance = Math.hypot(x, y) || 1;
  x /= distance;
  y /= distance;
  if (care) {
    for (const rock of state.asteroids) {
      const dx = state.ship.x - rock.x;
      const dy = state.ship.y - rock.y;
      const gap = Math.hypot(dx, dy) - rock.radius;
      if (gap < 120) {
        const weight = (120 - gap) / 120 * 1.8;
        x += (dx / (Math.hypot(dx, dy) || 1)) * weight;
        y += (dy / (Math.hypot(dx, dy) || 1)) * weight;
      }
    }
  }
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length, dash: false };
}

function nearestOrbControl(state) {
  let orb = null;
  let best = Infinity;
  for (const candidate of state.orbs) {
    const distance = Math.hypot(candidate.x - state.ship.x, candidate.y - state.ship.y);
    if (distance < best) { best = distance; orb = candidate; }
  }
  if (!orb) return { x: 0, y: 0, dash: false };
  return steer(state, orb.x, orb.y, true);
}

function recklessControl(state) {
  let rock = null;
  let best = Infinity;
  for (const candidate of state.asteroids) {
    const distance = Math.hypot(candidate.x - state.ship.x, candidate.y - state.ship.y);
    if (distance < best) { best = distance; rock = candidate; }
  }
  if (!rock) return steer(state, FIELD.width * 0.75, FIELD.height / 2, false);
  // Aim at where the rock is drifting to, and never dodge.
  return steer(state, rock.x + rock.vx * 0.4, rock.y + rock.vy * 0.4, false);
}

/**
 * The title and game-over screens blink their prompt (visible while
 * floor(time * 1.6) is even, as render.js draws it). A staged frame must not
 * be caught mid-blink with the prompt hidden, so step the world a little
 * further until the prompt is in its visible phase.
 */
function settleOnBlink(world, attract) {
  for (let i = 0; i < 1 / STEP; i += 1) {
    if (Math.floor(world.state.time * 1.6) % 2 === 0) return;
    world.step(STEP, { x: 0, y: 0, dash: false }, attract);
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the score the HUD should treat as the best.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;

  if (name === 'play') {
    for (let i = 0; i < PLAY_SECONDS / STEP; i += 1) {
      if (world.step(STEP, nearestOrbControl(state), false) & EVENT_OVER) break;
    }
    return { screen: SCREEN_PLAY, best: state.score };
  }

  if (name === 'clear') {
    for (let i = 0; i < CLEAR_LIMIT_SECONDS / STEP; i += 1) {
      const events = world.step(STEP, nearestOrbControl(state), false);
      if (events & EVENT_CLEAR) break;
      if (events & EVENT_OVER) break;
    }
    // A few more steps so the banner is up and the new sector is under way.
    for (let i = 0; i < 0.35 / STEP; i += 1) world.step(STEP, nearestOrbControl(state), false);
    return { screen: SCREEN_PLAY, best: state.score };
  }

  if (name === 'over') {
    // First fly like a real run for a while, so the results screen carries a
    // score worth showing; then turn reckless and steer at the rocks.
    for (let i = 0; i < 9 / STEP; i += 1) {
      if (world.step(STEP, nearestOrbControl(state), false) & EVENT_OVER) break;
    }
    if (!state.over) {
      for (let i = 0; i < OVER_LIMIT_SECONDS / STEP; i += 1) {
        if (world.step(STEP, recklessControl(state), false) & EVENT_OVER) break;
      }
    }
    for (let i = 0; i < 0.3 / STEP; i += 1) world.step(STEP, { x: 0, y: 0, dash: false }, false);
    settleOnBlink(world, false);
    return { screen: SCREEN_OVER, best: state.score };
  }

  // Title: the field drifts by itself behind the menu, no pilot, no stakes.
  for (let i = 0; i < TITLE_SECONDS / STEP; i += 1) {
    world.step(STEP, { x: 0, y: 0, dash: false }, true);
  }
  settleOnBlink(world, true);
  return { screen: SCREEN_TITLE, best: 0 };
}
