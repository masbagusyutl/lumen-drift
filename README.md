# lumen-drift

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/masbagusyutl/lumen-drift/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/masbagusyutl/lumen-drift/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Lumen Drift** is a neon courier run for the desktop browser. You pilot a courier ship through a drifting asteroid field: gather every data-orb in the sector to clear it and jump to a faster one, chain orbs to raise your combo multiplier, grab shield pickups, and dash out of trouble — three hull hits end the run. Hunter drones chase you down: blast them (and rocks) with the blaster — J or X — but mind the gun's heat, it locks when it overheats. Cargo parcels spawn in the field: grab one and deliver it to the beacon before its timer runs out for a +250 bonus. Keyboard (arrows / WASD, Space to dash, J or X to fire, P to pause), mouse and touch all fly the ship. Plain static files, no build step, no network: open `game/index.html` and play.

## Run it

```sh
node serve.ts          # serves game/ at http://localhost:8123
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # build the entry output + dossier.json
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=y7at578k&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
