# HELLFRONT — The Hangar Seven Incident

*A game by Hunk de Poitiers.*

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

WASD move · mouse look · LMB fire · RMB scope (rifle) · E use · 1–5 weapons · Z previous weapon · G frag grenade · Q focus (slows the world, not you) · C crouch · V or double-tap Shift dash · E executes staggered monsters · Space jump · Shift sprint · B Siege shop · Esc pause · F3 debug overlay · F4 noclip.
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

## Combat systems

- **Style rank** (D → SSS): kills feed it, variety, airborne/bullet-time/explosive kills and executions feed it more; getting hit or idling drains it.
- **Executions**: monsters below ~22% health stagger and glow; press E up close for an instant kill that drops health and ammo.
- **Dash**: short burst with invulnerability frames.
- **Rocket launcher** (5): splash damage, found in chapters 4–5 and in Siege.

## Siege mode

Endless rounds in a walled arena. Each round spends a growing budget on monsters that pour out of eight gates; their health grows every round, and supplies respawn between rounds. Every fifth round the **Warhound** — a two-headed hellhound that pounces, double-bites and breathes fire — hunts alone, one more each time. Kills earn souls (multiplied by your style rank) to spend in the **Soul Market** between rounds (B): permanent power, vitality, focus and speed upgrades plus refills. From round 3 a round may carry a modifier (swift, blade-only, darkness, armored, glass, frenzy) that pays extra souls. Your best round is saved.

## Music

The soundtrack is original and synthesized live in Web Audio (src/audio/musicManager.ts): distorted power-chord guitars, palm mutes, synth drums, bass and an electronic lead in an industrial-metal style, with a dark ambient pad that crossfades in when nothing is hunting you.

## Cutscenes

Each chapter ends on a black cinematic card: the outro types itself out in sync with a narrator voice (ElevenLabs, src/assets/audio/narration/).

To use recorded music instead of the procedural score, drop hellfront_combat.mp3 / hellfront_calm.mp3 / siege_combat.mp3 / siege_calm.mp3 into src/assets/audio/music/.

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
