# HELLFRONT — The Hangar Seven Incident

A PC browser FPS in the spirit of classic 90s shooters, built with **Babylon.js + Vite + strict TypeScript**.
Retro pixel textures and sprites (all generated procedurally in code, no third-party art) with modern lighting,
bloom and post-processing. Radio voice lines and sound effects were generated with ElevenLabs and ship as static files;
the game never calls ElevenLabs at runtime.

## Run

```bash
npm install
npm run dev
```

```bash
npm run build
```

`npm run build` runs `tsc --noEmit` and then `vite build` into `dist/`.

## Controls

WASD move · mouse look · LMB fire · RMB scope (rifle) · E use · 1/2/3/4 weapons · Z previous weapon · G frag grenade · Q focus (slows the world, not you) · Space jump · Shift sprint · Esc pause · F3 debug overlay · F4 noclip.
All bindings can be changed in Settings.

## Campaign

| # | Chapter | New threat |
|---|---------|------------|
| 1 | **Hangar Seven** | Zombiemen, Imps, Pinkies |
| 2 | **The Foundry** | **Ironclad** — armor plating shrugs off bullets/pellets (×0.3) but the chainsword tears through it (×2.6). Boss: **The Warden** (fireball fans, ground slam, summons imps, enrages at half health). |
| 3 | **The Breach** | **Executioner** — long, readable wind-ups: a glowing blade slam you can sidestep, and a charged fast hellbolt. Boss: **Breach Core** (immobile, summons defenders, shockwave when you get close). |
| 4 | **The Ashen Gate** | **Wraith** — fast skirmisher that blinks sideways when hit or aimed at, throws bone-shard fans. |
| 5 | **Throne of Ash** | Final boss: **The Sovereign** — hellbolt salvos, telegraphed ground eruptions, overhead slam, summons its court at 75/50/25%, faster second phase. |

Chapters can be started from **CHAPTERS** in the main menu; finishing a chapter carries your weapons, ammo and health into the next one.
Checkpoints save automatically (localStorage). Subtitles in English and Turkish.

## Layout

```
src/core      game state machine, input, settings, saves, i18n, story text, tuning (config.ts)
src/level     level data (level01–05.data.ts), builder, grid collision, doors/lifts, triggers
src/entities  player, enemies (one class per monster), projectiles, barrels
src/ai        enemy state machine + flow-field navigation
src/weapons   pistol, shotgun, chainsword
src/gfx       retro shader, light manager, procedural textures and sprite atlas
src/audio     Web Audio mixer, manifest, subtitles/voice script, procedural fallbacks
src/ui        DOM menus, HUD (boss bar, reactive face), loading/story cards
scripts       audio fetch/post-processing helper + generate-audio.md
```

Secrets: the ElevenLabs API key (if you use the script path) lives in `.env`, which is git-ignored. See `scripts/generate-audio.md`.
