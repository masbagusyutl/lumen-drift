// The renderer: everything the player sees, drawn on one canvas in the
// 1280x720 logical field and scaled to the window. Neon on deep space —
// a parallax starfield and two nebula glows behind the action, a glowing
// ship with an engine trail, pulsing data-orbs, craggy asteroids, and a HUD
// that keeps score, combo, sector, hull and dash readiness always visible.

import { BLASTER, COMBO, DELIVERY, FIELD, HULL, HUNTER, ORB, PALETTE, SECTOR, SHIELD } from './config.js';
import { dashReadiness } from './ship.js';
import { heatLevel } from './blaster.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

// The starfield is fixed scenery: three depth layers with their own seeds,
// drawn offset by the ship's position so the field parallaxes as it flies.
const STAR_LAYERS = [0.12, 0.3, 0.6].map((depth, layer) => {
  const random = createRandom(4100 + layer * 977);
  const stars = [];
  for (let i = 0; i < 70; i += 1) {
    stars.push({
      x: random.range(0, FIELD.width),
      y: random.range(0, FIELD.height),
      size: random.range(0.7, 1.9) + depth * 1.4,
      twinkle: random.range(0, Math.PI * 2)
    });
  }
  return { depth, stars };
});

function drawBackdrop(ctx, state) {
  const gradient = ctx.createLinearGradient(0, 0, FIELD.width, FIELD.height);
  gradient.addColorStop(0, PALETTE.void);
  gradient.addColorStop(0.55, PALETTE.nebulaA);
  gradient.addColorStop(1, PALETTE.nebulaB);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  for (const layer of STAR_LAYERS) {
    const offsetX = -state.ship.x * layer.depth * 0.06;
    const offsetY = -state.ship.y * layer.depth * 0.06;
    ctx.fillStyle = PALETTE.star;
    for (const star of layer.stars) {
      const x = ((star.x + offsetX) % FIELD.width + FIELD.width) % FIELD.width;
      const y = ((star.y + offsetY) % FIELD.height + FIELD.height) % FIELD.height;
      ctx.globalAlpha = 0.35 + 0.3 * Math.sin(state.time * 1.7 + star.twinkle);
      ctx.fillRect(x, y, star.size, star.size);
    }
  }
  ctx.globalAlpha = 1;
}

function drawOrbs(ctx, state) {
  for (const orb of state.orbs) {
    const pulse = 1 + 0.16 * Math.sin(state.time * (Math.PI * 2 / ORB.pulseSeconds) + orb.phase);
    const radius = ORB.radius * pulse;
    ctx.save();
    ctx.shadowColor = PALETTE.orb;
    ctx.shadowBlur = 18;
    ctx.fillStyle = PALETTE.orb;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.orbCore;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawPickups(ctx, state) {
  for (const pickup of state.pickups) {
    const bob = Math.sin(state.time * 2.4 + pickup.phase) * 4;
    ctx.save();
    ctx.strokeStyle = PALETTE.shield;
    ctx.lineWidth = 3;
    ctx.shadowColor = PALETTE.shield;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y + bob, SHIELD.radius + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.shield;
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y + bob, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawDelivery(ctx, state) {
  const delivery = state.delivery;
  if (delivery.parcel) {
    const parcel = delivery.parcel;
    const pulse = 1 + 0.2 * Math.sin(state.time * 3 + parcel.phase);
    ctx.save();
    ctx.translate(parcel.x, parcel.y);
    ctx.shadowColor = PALETTE.parcel;
    ctx.shadowBlur = 20;
    ctx.fillStyle = PALETTE.parcel;
    ctx.fillRect(-9 * pulse, -9 * pulse, 18 * pulse, 18 * pulse);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff3e0';
    ctx.fillRect(-3, -3, 6, 6);
    ctx.strokeStyle = PALETTE.parcel;
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(state.time * 3 + parcel.phase);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, DELIVERY.parcelRadius + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (delivery.zone) {
    const zone = delivery.zone;
    ctx.save();
    // Beacon pillar, so the drop zone reads from across the field.
    const beam = ctx.createLinearGradient(zone.x, 0, zone.x, zone.y);
    beam.addColorStop(0, 'rgba(138, 255, 193, 0)');
    beam.addColorStop(1, 'rgba(138, 255, 193, 0.22)');
    ctx.fillStyle = beam;
    ctx.fillRect(zone.x - 14, 0, 28, zone.y);
    ctx.strokeStyle = PALETTE.delivery;
    ctx.shadowColor = PALETTE.delivery;
    ctx.shadowBlur = 16;
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.lineDashOffset = -state.time * 30;
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, DELIVERY.zoneRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.delivery;
    ctx.font = '800 17px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DROP', zone.x, zone.y - DELIVERY.zoneRadius - 10);
    ctx.restore();
  }
  if (delivery.carrying) {
    // A dotted guide from the ship to the beacon, with the parcel riding along.
    ctx.save();
    ctx.strokeStyle = PALETTE.delivery;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 10]);
    ctx.beginPath();
    ctx.moveTo(state.ship.x, state.ship.y);
    ctx.lineTo(delivery.zone.x, delivery.zone.y);
    ctx.stroke();
    ctx.restore();
  }
}

function drawHunters(ctx, state) {
  for (const hunter of state.hunters) {
    ctx.save();
    ctx.translate(hunter.x, hunter.y);
    ctx.rotate(hunter.angle);
    ctx.shadowColor = PALETTE.hunter;
    ctx.shadowBlur = 14;
    ctx.fillStyle = PALETTE.hunter;
    // A dart with swept wings: it reads as a pursuer, not another rock.
    ctx.beginPath();
    ctx.moveTo(17, 0);
    ctx.lineTo(-10, 10);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, -10);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.hunterEye;
    ctx.beginPath();
    ctx.arc(6, 0, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawBolts(ctx, state) {
  ctx.save();
  ctx.strokeStyle = PALETTE.bolt;
  ctx.shadowColor = PALETTE.bolt;
  ctx.shadowBlur = 10;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  for (const bolt of state.bolts) {
    ctx.beginPath();
    ctx.moveTo(bolt.x - bolt.vx * 0.022, bolt.y - bolt.vy * 0.022);
    ctx.lineTo(bolt.x, bolt.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawAsteroids(ctx, state) {
  for (const rock of state.asteroids) {
    ctx.save();
    ctx.translate(rock.x, rock.y);
    ctx.rotate(rock.angle);
    ctx.beginPath();
    rock.shape.forEach((point, index) => {
      const x = Math.cos(point.angle) * rock.radius * point.scale;
      const y = Math.sin(point.angle) * rock.radius * point.scale;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = PALETTE.asteroid;
    ctx.fill();
    ctx.strokeStyle = PALETTE.asteroidEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

function drawShip(ctx, state) {
  const ship = state.ship;
  if (state.over) return;
  // Blinking while invulnerable tells the player the grace is running.
  if (ship.invulnerable > 0 && Math.floor(state.time * 14) % 2 === 0 && ship.shieldTime <= 0) return;

  ctx.save();
  if (ship.trail.length > 1) {
    ctx.beginPath();
    ship.trail.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.strokeStyle = PALETTE.ship;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);

  const thrusting = Math.hypot(ship.vx, ship.vy) > 60;
  if (thrusting) {
    const flame = ship.dashTime > 0 ? 34 : 20 + Math.sin(state.time * 31) * 4;
    ctx.fillStyle = PALETTE.flame;
    ctx.beginPath();
    ctx.moveTo(-13, 5);
    ctx.lineTo(-13 - flame, 0);
    ctx.lineTo(-13, -5);
    ctx.closePath();
    ctx.fill();
  }

  ctx.shadowColor = PALETTE.ship;
  ctx.shadowBlur = 16;
  ctx.fillStyle = PALETTE.ship;
  ctx.beginPath();
  ctx.moveTo(19, 0);
  ctx.lineTo(-13, 11);
  ctx.lineTo(-7, 0);
  ctx.lineTo(-13, -11);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.shipCore;
  ctx.beginPath();
  ctx.arc(4, 0, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (ship.shieldTime > 0) {
    ctx.save();
    ctx.strokeStyle = PALETTE.shield;
    ctx.globalAlpha = 0.65 + 0.25 * Math.sin(state.time * 6);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, 27, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawParticles(ctx, state) {
  for (const spark of state.particles) {
    ctx.globalAlpha = Math.max(0, spark.life / spark.maxLife);
    ctx.fillStyle = spark.color;
    ctx.fillRect(spark.x - spark.size / 2, spark.y - spark.size / 2, spark.size, spark.size);
  }
  ctx.globalAlpha = 1;
}

function heart(ctx, x, y, size, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.bezierCurveTo(-13, -3, -7, -13, 0, -6);
  ctx.bezierCurveTo(7, -13, 13, -3, 0, 8);
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = PALETTE.danger;
    ctx.shadowColor = PALETTE.danger;
    ctx.shadowBlur = 10;
    ctx.fill();
  } else {
    ctx.strokeStyle = PALETTE.muted;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

function drawHud(ctx, state, best) {
  ctx.save();
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, FIELD.width, 64);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '700 30px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(String(state.score).padStart(6, '0'), 22, 42);

  ctx.font = '600 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(`BEST ${Math.max(best, state.score)}`, 196, 40);

  const multiplier = 1 + Math.floor(Math.max(0, state.combo - 1) / 4);
  if (state.combo > 1) {
    ctx.fillStyle = PALETTE.orb;
    ctx.font = '700 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`COMBO x${multiplier}`, 330, 41);
    ctx.fillStyle = PALETTE.hudBar;
    ctx.fillRect(330, 48, 110, 5);
    ctx.fillStyle = PALETTE.orb;
    ctx.fillRect(330, 48, 110 * Math.max(0, state.comboTimer / COMBO.windowSeconds), 5);
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = '700 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`SECTOR ${state.sector}`, FIELD.width / 2, 40);
  ctx.fillStyle = PALETTE.hudBar;
  ctx.fillRect(FIELD.width / 2 - 70, 46, 140, 5);
  ctx.fillStyle = PALETTE.shield;
  ctx.fillRect(FIELD.width / 2 - 70, 46, 140 * (state.orbsCollected / ORB.perSector), 5);
  ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(`ORBS ${state.orbsCollected} / ${ORB.perSector}`, FIELD.width / 2, 63);

  for (let i = 0; i < HULL; i += 1) heart(ctx, FIELD.width - 196 + i * 38, 30, 26, i < state.hull);

  ctx.textAlign = 'right';
  ctx.font = '600 14px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('DASH', FIELD.width - 22, 34);
  ctx.fillStyle = PALETTE.hudBar;
  ctx.fillRect(FIELD.width - 108, 44, 86, 6);
  ctx.fillStyle = PALETTE.ship;
  ctx.fillRect(FIELD.width - 108, 44, 86 * dashReadiness(state.ship), 6);

  // Blaster heat, under the dash bar: full means the gun is locked.
  const heat = heatLevel(state.blaster);
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(state.blaster.overheated > 0 ? 'OVERHEAT' : 'HEAT', FIELD.width - 22, 64);
  ctx.fillStyle = PALETTE.hudBar;
  ctx.fillRect(FIELD.width - 108, 70, 86, 6);
  ctx.fillStyle = heat > 0.85 || state.blaster.overheated > 0 ? PALETTE.danger : PALETTE.bolt;
  ctx.fillRect(FIELD.width - 108, 70, 86 * heat, 6);

  // Delivery status: a waiting parcel, or the timer on the one aboard.
  const delivery = state.delivery;
  ctx.textAlign = 'center';
  if (delivery.carrying) {
    const seconds = Math.max(0, delivery.timer);
    ctx.font = '700 17px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = seconds < 4 ? PALETTE.danger : PALETTE.delivery;
    ctx.fillText(`DELIVER ${seconds.toFixed(1)}s`, FIELD.width / 2, 96);
    ctx.fillStyle = PALETTE.hudBar;
    ctx.fillRect(FIELD.width / 2 - 70, 102, 140, 5);
    ctx.fillStyle = seconds < 4 ? PALETTE.danger : PALETTE.delivery;
    ctx.fillRect(FIELD.width / 2 - 70, 102, 140 * (seconds / DELIVERY.timeLimit), 5);
  } else if (delivery.parcel) {
    ctx.font = '600 15px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = PALETTE.parcel;
    ctx.fillText('CARGO WAITING — GRAB IT', FIELD.width / 2, 96);
  }
  ctx.restore();
}

function centredText(ctx, text, y, font, color) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(text, FIELD.width / 2, y);
}

function drawBanner(ctx, state) {
  if (state.bannerTimer <= 0) return;
  ctx.save();
  ctx.fillStyle = 'rgba(4, 10, 22, 0.55)';
  ctx.fillRect(0, FIELD.height / 2 - 78, FIELD.width, 156);
  centredText(ctx, `SECTOR ${state.sector - 1} CLEAR`, FIELD.height / 2 - 8,
    '800 54px "Segoe UI", system-ui, sans-serif', PALETTE.shield);
  centredText(ctx, `Bonus +${SECTOR.bonus * (state.sector - 1)} — sector ${state.sector} is faster. Hold on.`,
    FIELD.height / 2 + 38, '600 21px "Segoe UI", system-ui, sans-serif', PALETTE.text);
  ctx.restore();
}

function drawTitle(ctx, state, best) {
  centredText(ctx, 'LUMEN DRIFT', 206, '800 92px "Segoe UI", system-ui, sans-serif', PALETTE.ship);
  centredText(ctx, 'a neon courier run — under fire', 250, '600 26px "Segoe UI", system-ui, sans-serif', PALETTE.orb);
  centredText(ctx, 'Pilot the courier ship. Gather every data-orb in the sector to clear it.', 322,
    '500 22px "Segoe UI", system-ui, sans-serif', PALETTE.text);
  centredText(ctx, 'Hunter drones chase you — blast them with J or X, and mind the gun’s heat.', 354,
    '500 22px "Segoe UI", system-ui, sans-serif', PALETTE.text);
  centredText(ctx, 'Grab cargo parcels and deliver them to the beacon before the timer runs out.', 386,
    '500 22px "Segoe UI", system-ui, sans-serif', PALETTE.text);
  centredText(ctx, 'Asteroids cost hull — three hits end the run. Chain orbs fast to raise your combo.', 418,
    '500 22px "Segoe UI", system-ui, sans-serif', PALETTE.text);
  centredText(ctx, 'FLY  Arrow keys / WASD / drag      DASH  Space      FIRE  J or X      PAUSE  P', 478,
    '700 21px "Segoe UI", system-ui, sans-serif', PALETTE.shield);
  if (best > 0) {
    centredText(ctx, `BEST ${best}`, 528, '700 22px "Segoe UI", system-ui, sans-serif', PALETTE.muted);
  }
  const blink = Math.floor(state.time * 1.6) % 2 === 0;
  if (blink) {
    centredText(ctx, 'PRESS SPACE OR CLICK TO LAUNCH', 592,
      '800 27px "Segoe UI", system-ui, sans-serif', PALETTE.text);
  }
}

function drawOver(ctx, state, best) {
  ctx.save();
  ctx.fillStyle = 'rgba(4, 6, 14, 0.62)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  centredText(ctx, 'SHIP LOST', 238, '800 76px "Segoe UI", system-ui, sans-serif', PALETTE.danger);
  centredText(ctx, `The field keeps your cargo, courier.`, 292,
    '600 23px "Segoe UI", system-ui, sans-serif', PALETTE.text);
  centredText(ctx, `SCORE ${state.score}`, 372, '800 44px "Segoe UI", system-ui, sans-serif', PALETTE.text);
  centredText(ctx, `BEST ${Math.max(best, state.score)}  ·  SECTOR ${state.sector}  ·  BEST COMBO x${1 + Math.floor(Math.max(0, state.bestCombo - 1) / 4)}`,
    416, '600 21px "Segoe UI", system-ui, sans-serif', PALETTE.muted);
  centredText(ctx, `HUNTERS DOWN ${state.huntersDown}  ·  DELIVERIES ${state.deliveriesMade}`,
    448, '600 21px "Segoe UI", system-ui, sans-serif', PALETTE.muted);
  const blink = Math.floor(state.time * 1.6) % 2 === 0;
  if (blink) {
    centredText(ctx, 'PRESS SPACE OR CLICK TO FLY AGAIN', 486,
      '800 25px "Segoe UI", system-ui, sans-serif', PALETTE.ship);
  }
  ctx.restore();
}

function drawPaused(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(4, 6, 14, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  centredText(ctx, 'PAUSED', FIELD.height / 2, '800 58px "Segoe UI", system-ui, sans-serif', PALETTE.text);
  centredText(ctx, 'Press P or Space to resume', FIELD.height / 2 + 46,
    '600 21px "Segoe UI", system-ui, sans-serif', PALETTE.muted);
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fitCanvas() {
    const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
    canvas.width = Math.round(FIELD.width * scale * (window.devicePixelRatio || 1));
    canvas.height = Math.round(FIELD.height * scale * (window.devicePixelRatio || 1));
    canvas.style.width = `${Math.round(FIELD.width * scale)}px`;
    canvas.style.height = `${Math.round(FIELD.height * scale)}px`;
  }
  fitCanvas();
  window.addEventListener('resize', fitCanvas);

  return {
    draw(state, screen, best) {
      ctx.setTransform(canvas.width / FIELD.width, 0, 0, canvas.width / FIELD.width, 0, 0);
      ctx.save();
      if (state.shake > 0) {
        const amount = state.shake * 14;
        ctx.translate((Math.random() - 0.5) * amount, (Math.random() - 0.5) * amount);
      }
      drawBackdrop(ctx, state);
      drawDelivery(ctx, state);
      drawOrbs(ctx, state);
      drawPickups(ctx, state);
      drawHunters(ctx, state);
      drawAsteroids(ctx, state);
      drawBolts(ctx, state);
      drawParticles(ctx, state);
      drawShip(ctx, state);
      ctx.restore();
      drawHud(ctx, state, best);
      if (screen === SCREEN_TITLE) drawTitle(ctx, state, best);
      else if (screen === SCREEN_OVER) drawOver(ctx, state, best);
      else if (screen === SCREEN_PAUSED) drawPaused(ctx);
      else drawBanner(ctx, state);
    }
  };
}
