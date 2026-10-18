// Every sound in the game: files (variants), bus, mix and the ElevenLabs prompt used to generate it.
// Files are resolved from src/assets/audio/<bus folder>/. Missing files fall back to a procedural recipe.

export type Bus = 'sfx' | 'voice' | 'ui' | 'amb';

export type ProcRecipe =
  | 'pistol' | 'shotgun' | 'pump' | 'sawIdle' | 'swing' | 'squish' | 'click' | 'switch' | 'blip' | 'chime'
  | 'armor' | 'keycard' | 'weaponGet' | 'doorOpen' | 'doorClose' | 'denied' | 'hum' | 'thunk' | 'explosion'
  | 'cast' | 'fireLoop' | 'fireImpact' | 'stepMetal' | 'stepConcrete' | 'grunt' | 'death' | 'zAlert' | 'zPain'
  | 'zDeath' | 'rifle' | 'growl' | 'impAlert' | 'impPain' | 'impDeath' | 'claw' | 'snarl' | 'charge' | 'pinkyPain'
  | 'pinkyDeath' | 'bite' | 'bubbles' | 'drone' | 'industrial' | 'alarm' | 'hover' | 'uiClick' | 'uiBack' | 'sting'
  | 'teleport' | 'ricochet' | 'gib' | 'fleshHit' | 'radio' | 'secret';

export interface SoundDef {
  files: string[];
  bus: Bus;
  volume: number;
  pitchJitter?: number;
  volJitter?: number;
  loop?: boolean;
  refDistance?: number;
  proc: ProcRecipe;
  prompt: string;
  /** ElevenLabs duration hint in seconds. */
  duration?: number;
}

const v = (base: string, n: number, ext = 'mp3') => Array.from({ length: n }, (_, i) => `${base}_${i + 1}.${ext}`);

export const SOUNDS = {
  // ---- weapons
  pistol_fire: { files: v('sfx/pistol_fire', 3), bus: 'sfx', volume: 0.75, pitchJitter: 0.06, volJitter: 0.1, proc: 'pistol', duration: 0.6,
    prompt: 'Single punchy 9mm pistol gunshot, close mic, sharp transient, short metallic tail in a concrete corridor, retro 90s shooter game sound' },
  shotgun_fire: { files: v('sfx/shotgun_fire', 3), bus: 'sfx', volume: 0.95, pitchJitter: 0.05, volJitter: 0.08, proc: 'shotgun', duration: 1.0,
    prompt: 'Massive 12 gauge pump shotgun blast, deep low-end boom, aggressive crack, short industrial room reverb, classic 90s FPS' },
  shotgun_pump: { files: v('sfx/shotgun_pump', 2), bus: 'sfx', volume: 0.6, pitchJitter: 0.04, proc: 'pump', duration: 0.6,
    prompt: 'Shotgun pump action rack, slide back and forward, crisp mechanical clack, no gunshot' },
  chainsword_idle: { files: ['sfx/chainsword_idle_1.mp3'], bus: 'sfx', volume: 0.35, loop: true, proc: 'sawIdle', duration: 3,
    prompt: 'Seamless loop of a heavy motorized chainsword idling, two-stroke engine putter with rattling chain teeth, gritty and mechanical' },
  chainsword_swing: { files: v('sfx/chainsword_swing', 3), bus: 'sfx', volume: 0.7, pitchJitter: 0.07, proc: 'swing', duration: 0.7,
    prompt: 'Chainsword revving up hard and swinging through the air, engine scream with whooshing chain' },
  chainsword_hit: { files: v('sfx/chainsword_hit', 3), bus: 'sfx', volume: 0.8, pitchJitter: 0.08, proc: 'squish', duration: 0.8,
    prompt: 'Chainsword grinding into monster flesh, wet tearing gore, buzzing chain teeth chewing meat, horror game' },
  weapon_empty: { files: ['sfx/weapon_empty_1.mp3'], bus: 'sfx', volume: 0.5, proc: 'click', duration: 0.3,
    prompt: 'Dry fire click of an empty gun, single small metallic trigger click' },
  weapon_switch: { files: v('sfx/weapon_switch', 2), bus: 'sfx', volume: 0.45, pitchJitter: 0.05, proc: 'switch', duration: 0.5,
    prompt: 'Weapon being raised and readied, cloth rustle and metallic gear clank, short' },
  // ---- pickups
  pickup_health: { files: v('sfx/pickup_health', 2), bus: 'sfx', volume: 0.6, proc: 'blip', duration: 0.6,
    prompt: 'Retro sci-fi health pickup sound, bright rising synth blip with a soft hiss of a medical injector' },
  pickup_armor: { files: ['sfx/pickup_armor_1.mp3'], bus: 'sfx', volume: 0.7, proc: 'armor', duration: 1.0,
    prompt: 'Heavy armor vest pickup, metal plates clanking together then a confident synth power-up chord' },
  pickup_ammo: { files: v('sfx/pickup_ammo', 2), bus: 'sfx', volume: 0.6, pitchJitter: 0.05, proc: 'thunk', duration: 0.5,
    prompt: 'Picking up a box of ammunition, bullets rattling in a metal box, short mechanical clunk' },
  pickup_key: { files: ['sfx/pickup_key_1.mp3'], bus: 'sfx', volume: 0.7, proc: 'keycard', duration: 1.0,
    prompt: 'Security keycard acquired, electronic double beep confirmation with a short shimmering synth tone' },
  pickup_weapon: { files: ['sfx/pickup_weapon_1.mp3'], bus: 'sfx', volume: 0.85, proc: 'weaponGet', duration: 1.2,
    prompt: 'New weapon acquired, heavy gun cocking and chambering a round, followed by a short triumphant metallic ring' },
  // ---- world
  door_open: { files: v('sfx/door_open', 2), bus: 'sfx', volume: 0.75, refDistance: 4, pitchJitter: 0.04, proc: 'doorOpen', duration: 1.2,
    prompt: 'Heavy sci-fi blast door sliding open, pneumatic hiss, grinding hydraulic motor, metal clunk, industrial military base' },
  door_close: { files: v('sfx/door_close', 2), bus: 'sfx', volume: 0.75, refDistance: 4, pitchJitter: 0.04, proc: 'doorClose', duration: 1.2,
    prompt: 'Heavy metal sci-fi door sliding shut, hydraulic motor whine ending in a loud resonant slam' },
  door_locked: { files: ['sfx/door_locked_1.mp3'], bus: 'sfx', volume: 0.65, proc: 'denied', duration: 0.7,
    prompt: 'Access denied buzzer of a security door, harsh low electronic double buzz' },
  lift_hum: { files: ['sfx/lift_hum_1.mp3'], bus: 'sfx', volume: 0.55, loop: true, refDistance: 4, proc: 'hum', duration: 3,
    prompt: 'Seamless loop of an industrial cargo elevator platform moving, deep electric motor hum with mechanical rattle' },
  lift_stop: { files: ['sfx/lift_stop_1.mp3'], bus: 'sfx', volume: 0.7, refDistance: 4, proc: 'thunk', duration: 0.8,
    prompt: 'Heavy metal elevator platform stopping with a loud clank and a short hydraulic hiss' },
  barrel_explode: { files: v('sfx/barrel_explode', 3), bus: 'sfx', volume: 1.0, refDistance: 6, pitchJitter: 0.08, proc: 'explosion', duration: 2.0,
    prompt: 'Explosive chemical barrel blowing up, huge low boom, metal shrapnel debris, fiery whoosh, in a large hangar' },
  teleport: { files: v('sfx/teleport', 2), bus: 'sfx', volume: 0.7, refDistance: 5, proc: 'teleport', duration: 1.2,
    prompt: 'Demonic teleport materialization, sharp electrical zap with a dark reverse whoosh and sizzling energy' },
  impact_metal: { files: v('sfx/impact_metal', 3), bus: 'sfx', volume: 0.35, refDistance: 3, pitchJitter: 0.15, proc: 'ricochet', duration: 0.5,
    prompt: 'Bullet impact on a metal wall with a short ricochet ping' },
  flesh_hit: { files: v('sfx/flesh_hit', 3), bus: 'sfx', volume: 0.55, refDistance: 3, pitchJitter: 0.12, proc: 'fleshHit', duration: 0.4,
    prompt: 'Bullet hitting flesh, short wet thud impact, gory' },
  gib: { files: v('sfx/gib', 2), bus: 'sfx', volume: 0.85, refDistance: 4, pitchJitter: 0.08, proc: 'gib', duration: 1.0,
    prompt: 'Body exploding into gore, wet splattering meat chunks and squelch, horror game' },
  // ---- fireball
  fireball_cast: { files: v('sfx/fireball_cast', 2), bus: 'sfx', volume: 0.75, refDistance: 4, pitchJitter: 0.06, proc: 'cast', duration: 0.8,
    prompt: 'Demon conjuring and hurling a fireball, sharp fiery ignition whoosh' },
  fireball_fly: { files: ['sfx/fireball_fly_1.mp3'], bus: 'sfx', volume: 0.4, loop: true, refDistance: 2.5, proc: 'fireLoop', duration: 2,
    prompt: 'Seamless loop of a small fireball flying, crackling roaring flame' },
  fireball_impact: { files: v('sfx/fireball_impact', 3), bus: 'sfx', volume: 0.75, refDistance: 4, pitchJitter: 0.08, proc: 'fireImpact', duration: 1.0,
    prompt: 'Fireball impact explosion, fiery burst and sizzle against a metal wall' },
  // ---- footsteps
  step_metal: { files: v('sfx/step_metal', 4), bus: 'sfx', volume: 0.32, pitchJitter: 0.08, volJitter: 0.2, proc: 'stepMetal', duration: 0.4,
    prompt: 'Single heavy combat boot footstep on a metal grating floor, short' },
  step_concrete: { files: v('sfx/step_concrete', 4), bus: 'sfx', volume: 0.3, pitchJitter: 0.08, volJitter: 0.2, proc: 'stepConcrete', duration: 0.4,
    prompt: 'Single heavy combat boot footstep on a concrete floor, short gritty' },
  // ---- player
  player_hurt: { files: v('sfx/player_hurt', 3), bus: 'sfx', volume: 0.8, pitchJitter: 0.05, proc: 'grunt', duration: 0.7,
    prompt: 'Male space marine pained grunt when hit, short, gritty, no words' },
  player_death: { files: ['sfx/player_death_1.mp3'], bus: 'sfx', volume: 0.9, proc: 'death', duration: 1.8,
    prompt: 'Male soldier death scream, agonized and abruptly cut short, no words' },
  // ---- zombieman
  zombie_alert: { files: v('sfx/zombie_alert', 2), bus: 'sfx', volume: 0.8, refDistance: 5, pitchJitter: 0.06, proc: 'zAlert', duration: 1.2,
    prompt: 'Possessed zombie soldier noticing its target, guttural distorted human growl with demonic undertone' },
  zombie_pain: { files: v('sfx/zombie_pain', 2), bus: 'sfx', volume: 0.7, refDistance: 4, pitchJitter: 0.08, proc: 'zPain', duration: 0.6,
    prompt: 'Zombie soldier short pained groan when shot, raspy undead' },
  zombie_death: { files: v('sfx/zombie_death', 2), bus: 'sfx', volume: 0.8, refDistance: 5, pitchJitter: 0.06, proc: 'zDeath', duration: 1.2,
    prompt: 'Zombie soldier death gurgle, choking undead groan collapsing' },
  zombie_fire: { files: v('sfx/zombie_fire', 2), bus: 'sfx', volume: 0.7, refDistance: 5, pitchJitter: 0.06, proc: 'rifle', duration: 0.7,
    prompt: 'Single assault rifle gunshot, mid distance, dry crack with echo in a metal corridor' },
  // ---- imp
  imp_growl: { files: v('sfx/imp_growl', 2), bus: 'sfx', volume: 0.55, refDistance: 4, pitchJitter: 0.08, proc: 'growl', duration: 1.2,
    prompt: 'Small demon creature idle growl, raspy hissing breathing, monster' },
  imp_alert: { files: v('sfx/imp_alert', 2), bus: 'sfx', volume: 0.85, refDistance: 5, pitchJitter: 0.06, proc: 'impAlert', duration: 1.2,
    prompt: 'Imp demon screech of alert, high raspy shriek with snarling, horror monster' },
  imp_pain: { files: v('sfx/imp_pain', 2), bus: 'sfx', volume: 0.7, refDistance: 4, pitchJitter: 0.08, proc: 'impPain', duration: 0.6,
    prompt: 'Demon creature short pain yelp, raspy hiss' },
  imp_death: { files: v('sfx/imp_death', 2), bus: 'sfx', volume: 0.85, refDistance: 5, pitchJitter: 0.06, proc: 'impDeath', duration: 1.4,
    prompt: 'Demon dying shriek fading into a wet gurgle, monster death' },
  imp_claw: { files: ['sfx/imp_claw_1.mp3'], bus: 'sfx', volume: 0.75, refDistance: 3, proc: 'claw', duration: 0.6,
    prompt: 'Monster claw slash swipe through the air and flesh, sharp whoosh with tearing' },
  // ---- pinky
  pinky_snarl: { files: v('sfx/pinky_snarl', 2), bus: 'sfx', volume: 0.8, refDistance: 5, pitchJitter: 0.06, proc: 'snarl', duration: 1.2,
    prompt: 'Large muscular demon beast snarl, deep throaty growl with drool and teeth gnashing' },
  pinky_charge: { files: ['sfx/pinky_charge_1.mp3'], bus: 'sfx', volume: 0.95, refDistance: 6, proc: 'charge', duration: 1.4,
    prompt: 'Huge demon bull roaring as it charges, ferocious bellow with heavy galloping stomps' },
  pinky_pain: { files: v('sfx/pinky_pain', 2), bus: 'sfx', volume: 0.8, refDistance: 5, pitchJitter: 0.06, proc: 'pinkyPain', duration: 0.7,
    prompt: 'Big demon beast pained grunt and squeal, short' },
  pinky_death: { files: v('sfx/pinky_death', 2), bus: 'sfx', volume: 0.95, refDistance: 6, pitchJitter: 0.05, proc: 'pinkyDeath', duration: 1.8,
    prompt: 'Large demon beast death roar collapsing heavily, guttural dying moan' },
  pinky_bite: { files: ['sfx/pinky_bite_1.mp3'], bus: 'sfx', volume: 0.85, refDistance: 3, proc: 'bite', duration: 0.5,
    prompt: 'Monster jaws snapping shut, heavy wet bite chomp with crunching teeth' },
  // ---- ambience
  amb_hangar: { files: ['amb/amb_hangar_1.mp3'], bus: 'amb', volume: 0.45, loop: true, proc: 'drone', duration: 10,
    prompt: 'Seamless loop, huge empty military hangar ambience, low ventilation hum, distant metal creaks, ominous' },
  amb_industrial: { files: ['amb/amb_industrial_1.mp3'], bus: 'amb', volume: 0.3, loop: true, proc: 'industrial', duration: 10,
    prompt: 'Seamless loop, distant industrial machinery ambience, rhythmic far-off pistons and clanks, dark sci-fi base' },
  amb_nukage: { files: ['amb/amb_nukage_1.mp3'], bus: 'amb', volume: 0.5, loop: true, refDistance: 5, proc: 'bubbles', duration: 8,
    prompt: 'Seamless loop, thick toxic radioactive sludge bubbling and gurgling in a vat, slow viscous bubbles' },
  amb_alarm: { files: ['amb/amb_alarm_1.mp3'], bus: 'amb', volume: 0.22, loop: true, proc: 'alarm', duration: 6,
    prompt: 'Seamless loop, distant military base alarm siren wailing, heard through walls, reverberant' },
  // ---- UI
  ui_hover: { files: ['ui/ui_hover_1.mp3'], bus: 'ui', volume: 0.35, pitchJitter: 0.04, proc: 'hover', duration: 0.3,
    prompt: 'Short low metallic UI tick for menu hover, industrial, subtle' },
  ui_click: { files: ['ui/ui_click_1.mp3'], bus: 'ui', volume: 0.55, proc: 'uiClick', duration: 0.4,
    prompt: 'Heavy metallic menu select click, like a shotgun safety switch, punchy' },
  ui_back: { files: ['ui/ui_back_1.mp3'], bus: 'ui', volume: 0.5, proc: 'uiBack', duration: 0.4,
    prompt: 'Menu back sound, low descending mechanical thunk' },
  level_complete: { files: ['ui/level_complete_1.mp3'], bus: 'ui', volume: 0.8, proc: 'sting', duration: 4,
    prompt: 'Short dark industrial victory sting, distorted metal guitar power chord with a heavy drum hit, ominous ending' },
  secret_found: { files: ['ui/secret_found_1.mp3'], bus: 'ui', volume: 0.6, proc: 'secret', duration: 1.5,
    prompt: 'Mysterious discovery chime, eerie synth arpeggio with a hellish reverb tail' },
  radio_click: { files: ['ui/radio_click_1.mp3'], bus: 'voice', volume: 0.5, proc: 'radio', duration: 0.4,
    prompt: 'Military radio push-to-talk squelch click with a short burst of static' },
} satisfies Record<string, SoundDef>;

export type SoundId = keyof typeof SOUNDS;

export const VOICE_DEF = {
  bus: 'voice' as Bus,
  voiceDescription: 'Gritty middle-aged male military commander on a radio channel: deep, gravelly, calm under pressure, American accent',
  stability: 0.45,
  similarity: 0.8,
  style: 0.35,
};
