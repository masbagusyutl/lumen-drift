// Lumen Drift — every tuning number for the game in one module.
// The playfield is a fixed 1280x720 logical space; the renderer scales it to
// the window, so no rule below ever depends on the player's screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second at any refresh rate. */
export const STEP = 1 / 60;

export const SHIP = {
  radius: 14,
  thrust: 1650,          // px/s^2 while a direction is held
  drag: 1.9,             // velocity damping per second (space drift, not a stop)
  maxSpeed: 430,
  dashSpeed: 940,        // burst speed while dashing
  dashSeconds: 0.16,     // how long a dash lasts
  dashCooldown: 1.5,     // seconds before the next dash is ready
  invulnerableSeconds: 2 // grace after a hull hit, shown by the ship blinking
};

export const HULL = 3;

export const ORB = {
  radius: 11,
  points: 25,
  perSector: 8,          // collect this many to clear the sector
  pulseSeconds: 0.9      // glow pulse period, purely cosmetic
};

export const ASTEROID = {
  minRadius: 18,
  maxRadius: 46,
  minSpeed: 55,
  maxSpeed: 150,
  speedPerSector: 16,    // added to every drift speed each new sector
  spinMax: 1.4,          // rad/s, either way
  firstDelay: 0.8,       // seconds before the first rock of a run
  interval: 1.15,        // seconds between rocks at sector 1
  intervalPerSector: 0.09,
  minInterval: 0.42
};

export const SHIELD = {
  radius: 13,
  seconds: 6,            // how long one pickup protects the ship
  chance: 0.16,          // rolled each time an orb is collected
  maxActive: 1
};

export const COMBO = {
  windowSeconds: 2.6,    // collect another orb inside this to keep the chain
  maxMultiplier: 5
};

export const SECTOR = {
  bonus: 150,            // points for clearing a sector, times the sector number
  bannerSeconds: 2.4     // how long the sector-clear banner stays up
};

/** How many things can exist at once; every pool is allocated once, at boot. */
export const POOL = { asteroids: 42, orbs: 14, pickups: 2, particles: 260 };

export const PALETTE = {
  void: '#04060e',
  nebulaA: '#0d1b3e',
  nebulaB: '#1c0f38',
  star: '#cfe6ff',
  ship: '#59f7ff',
  shipCore: '#e8feff',
  flame: '#ffb347',
  orb: '#ffe45e',
  orbCore: '#fffbe8',
  asteroid: '#8d9bb5',
  asteroidEdge: '#c7d5ee',
  shield: '#6effa8',
  danger: '#ff5d73',
  text: '#eef7ff',
  muted: '#8fa8c8',
  panel: 'rgba(8, 16, 34, 0.78)',
  hudBar: '#1d3a5f'
};

export const FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lumen-drift.best';
