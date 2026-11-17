// Lumen Drift's entry program (Node 22, standard library only).
//
// The game itself is the game/ folder beside this file: plain static files a
// desktop browser plays offline, no build step and no network. This program
// hands it in — it copies game/ and screenshots/ into the output directory
// and writes dossier.json there with the vendored make.fun library, exactly
// as the grader will rebuild it, so what is checked here is what is graded.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's own caps, restated so a local run refuses what the scorer
// would refuse instead of writing an entry that cannot be valid: at most 4
// screenshots of at most 256 KiB, at most 993 files and 48 MiB under game/,
// and no path under game/ longer than 1000 bytes.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function refuse(message: string): never {
  throw new Error(`lumen-drift: ${message}`);
}

const shotsDir = join(here, 'screenshots');
const shotNames = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((name) => !name.startsWith('.'))
  : [];
if (shotNames.length < 3 || shotNames.length > DOSSIER_CAPS.screenshots.max) {
  refuse(`screenshots/ holds ${shotNames.length} files; the gate wants 3 or 4`);
}
for (const name of shotNames) {
  const size = statSync(join(shotsDir, name)).size;
  if (size > DOSSIER_CAPS.screenshots.max_bytes) refuse(`screenshots/${name} is ${size} bytes; the cap is 262144`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

writeFileSync(join(out, 'dossier.json'), buildDossier(out, DOSSIER_CAPS));
