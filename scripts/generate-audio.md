# How the audio was produced

All sound effects and radio voice lines in `src/assets/audio/` were generated with **ElevenLabs**
through the ElevenLabs MCP connector (Claude Code session), then trimmed and loudness-normalized
locally with ffmpeg. The game never calls ElevenLabs at runtime — it only loads these static files.

- Every sound ID, its variants, mix settings and the **exact prompt** used live in
  [`src/audio/audioManifest.ts`](../src/audio/audioManifest.ts).
- Voice script (EN audio, EN/TR subtitles) lives in [`src/audio/subtitles.ts`](../src/audio/subtitles.ts).
- Any file that is missing falls back to a procedural Web Audio recipe
  ([`src/audio/proceduralSfx.ts`](../src/audio/proceduralSfx.ts)); missing voice lines fall back to
  filtered "radio chatter" while the subtitle still shows the line. The game always runs.

## Models and settings

| Asset type | Model | Settings |
|---|---|---|
| One-shot SFX (guns, monsters, pickups, doors, UI…) | `eleven_text_to_sound_v2` | prompt influence 0.3, 1–4 takes per prompt = variants |
| Loops (ambience, chainsword idle, lift hum, fireball) | `eleven_text_to_sound_v2` | `loop: true`, `duration_seconds` 3–12, prompt influence 0.4 |
| Radio voice lines | `eleven_v4` | voice **"Jerry B. – Military Commander"** (`TxWZERZ5Hc6h9dGxVmXa`), inline tags like `[tense]`, `[urgent]`, `[shouting]` |

The comms sound (band-pass, saturation, static bed, squelch clicks, SFX ducking) is applied live
in `audioManager.ts`, so the source voice files stay clean.

## Post-processing

[`scripts/fetch-audio.mjs`](fetch-audio.mjs) downloads generation results and runs ffmpeg:

- one-shots: trim leading/trailing silence, cap length (per sound), 80 ms fade-out, `loudnorm I=-15`
- loops: loudness-normalize only (keeps the seamless loop points)
- voice: trim silence, `loudnorm I=-16`
- output: 44.1 kHz, mono (stereo for ambience/stings), 128 kbps MP3

```bash
node scripts/fetch-audio.mjs jobs.json
```

`jobs.json` is a list of `{ "out": "sfx/name_1.mp3", "url": "<result url>", "max": 1.2, "loop": false, "voice": false }`.

## Regenerating a sound

1. Find the ID in `audioManifest.ts` and copy its `prompt`.
2. Generate N takes in ElevenLabs (UI, API or MCP) with the model/settings above.
3. Save them as `src/assets/audio/<folder>/<id>_<n>.mp3` (variant count must match `files`), or put
   the result URLs into a jobs file and run `fetch-audio.mjs`.
4. Reload the game — the audio manager picks files up automatically (Vite `import.meta.glob`).

If you prefer the REST API instead of MCP: put `ELEVENLABS_API_KEY` in `.env` (git-ignored, see
`.env.example`). Never import it from client code.

## Status

| Group | Status |
|---|---|
| Weapons, impacts, gore, pickups, doors, lift, barrels, fireballs, footsteps | generated (2–4 variants where listed) |
| Zombieman / Imp / Pinky vocals and attacks | generated |
| Ambience loops (hangar, industrial, nukage, alarm) | generated, 10–12 s seamless |
| UI (hover, click, back, level-complete sting, secret, radio click) | generated |
| Voice: 12 of 14 lines | generated |
| Voice: `v_control`, `v_complete` | done (regenerated after the free-tier hiccup cleared). |

## Campaign voice lines (Chapters 2–5)

All 33 campaign radio lines in `src/audio/voiceLinesCampaign.ts` were generated with the same voice (Jerry B. – Military Commander, `eleven_v4`), one take each, with inline delivery tags (e.g. `[urgent]`, `[grim, slow]`). Files: `src/assets/audio/voice/v2_*.mp3 … v5_*.mp3`.

Post-processing (ffmpeg): trim leading/trailing silence below -50 dB, `loudnorm=I=-16:TP=-1.5:LRA=9`, mono 44.1 kHz 128 kbps. The radio filter is applied at runtime. Any line whose file is missing falls back to procedural radio chatter with subtitles.
