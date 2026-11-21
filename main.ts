// Package Salt Relay for the make.fun browser-game grader.

import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
if (out === resolve(here) || ['game', 'screenshots'].some(name => out === join(here, name) || out.startsWith(join(here, name) + sep))) {
  throw new Error('Use a separate build output directory.');
}

mkdirSync(out, { recursive: true });
const captures = join(here, 'screenshots');
const names = readdirSync(captures).filter(name => !name.startsWith('.'));
if (names.length !== 4) throw new Error('Salt Relay requires exactly four game captures.');
for (const name of ['game', 'screenshots']) {
  const destination = join(out, name);
  rmSync(destination, { recursive: true, force: true });
  cpSync(join(here, name), destination, { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
