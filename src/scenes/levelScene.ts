import { Color3, Color4, FreeCamera, Scene, Vector3, type Engine } from '@babylonjs/core';
import { CELL, DIFFICULTY, ENEMIES, PLAYER, AMMO_MAX, FOCUS, GRENADE, FLAMER, type AmmoType, type Difficulty, type EnemyKind, type HitscanWeaponDef, type MeleeWeaponDef, type WeaponId } from '../core/config';
import type { Input } from '../core/input';
import { t } from '../core/i18n';
import { rand } from '../core/util';
import type { Settings } from '../core/settingsStore';
import type { SaveData, WorldSnapshot } from '../core/save';
import type { AudioManager, PlayOpts, SoundHandle } from '../audio/audioManager';
import type { SoundId } from '../audio/audioManifest';
import { buildLevel, sampleLightGrid, type BuiltLevel } from '../level/levelBuilder';
import { Door, Lift } from '../level/doors';
import { World, type RayHit } from '../level/world';
import { CellKind } from '../level/grid';
import { TriggerSystem } from '../level/triggers';
import { applyPickup, PICKUP_SCALE, type Pickup } from '../level/pickups';
import type { LevelData, PickupKind, ThingDef, TriggerAction } from '../level/types';
import { LightManager } from '../gfx/lightManager';
import { createRetroMaterial } from '../gfx/retroMaterial';
import { SpriteBatch } from '../gfx/spriteBatch';
import { buildSpriteAtlas, getSpriteTexture, SPRITES } from '../gfx/sprites';
import { Particles } from '../fx/particles';
import { Decals } from '../fx/bloodDecals';
import { Debris } from '../fx/debris';
import { ScreenShake } from '../fx/screenShake';
import { PostFX } from '../fx/postProcess';
import { NavField } from '../ai/navigation';
import { updateEnemy } from '../ai/enemyAI';
import { Player } from '../entities/player';
import type { Enemy } from '../entities/enemy';
import { Zombieman } from '../entities/zombieman';
import { Imp } from '../entities/imp';
import { Pinky } from '../entities/pinky';
import { Ironclad } from '../entities/ironclad';
import { Warden } from '../entities/warden';
import { Executioner } from '../entities/executioner';
import { BreachCore } from '../entities/breachCore';
import { Wraith } from '../entities/wraith';
import { Sovereign } from '../entities/sovereign';
import { Warhound } from '../entities/warhound';
import { SiegeController } from './siege';
import { Boltgunner, Hellflamer, SoulTerminator } from '../entities/heretics';
import { Sorcerer } from '../entities/sorcerer';
import { StyleMeter, type KillTag } from './style';
import { AbilityController } from './abilities';
import type { PlayerState } from '../entities/player';
import { Projectiles } from '../entities/projectile';
import { Grenades } from '../entities/grenade';
import { Rockets, type RocketOpts } from '../entities/rocket';
import { Barrel, type Prop } from '../entities/barrel';
import { WeaponSystem } from '../weapons/weaponSystem';
import type { UIManager } from '../ui/uiManager';
import type { LevelStats } from '../ui/levelComplete';
import type { DamageKind, GameCtx, HitOpts } from './context';

export interface LevelHooks {
  onDeath(): void;
  onComplete(stats: LevelStats): void;
  onCheckpoint(save: SaveData): void;
  voice(id: string): void;
  /** Siege: open the intermission shop. */
  openShop(): void;
  /** Pause and let the player equip one of these abilities. */
  chooseAbility(ids: string[]): void;
  /** Battle Test spawn / options menu. */
  openBattleMenu(): void;
}

function makeEnemy(kind: EnemyKind, x: number, z: number, angle: number, hpMul: number): Enemy {
  switch (kind) {
    case 'zombieman': return new Zombieman(x, z, angle, hpMul);
    case 'imp': return new Imp(x, z, angle, hpMul);
    case 'pinky': return new Pinky(x, z, angle, hpMul);
    case 'ironclad': return new Ironclad(x, z, angle, hpMul);
    case 'warden': return new Warden(x, z, angle, hpMul);
    case 'executioner': return new Executioner(x, z, angle, hpMul);
    case 'core': return new BreachCore(x, z, angle, hpMul);
    case 'wraith': return new Wraith(x, z, angle, hpMul);
    case 'sovereign': return new Sovereign(x, z, angle, hpMul);
    case 'warhound': return new Warhound(x, z, angle, hpMul);
    case 'boltgunner': return new Boltgunner(x, z, angle, hpMul);
    case 'hellflamer': return new Hellflamer(x, z, angle, hpMul);
    case 'terminator': return new SoulTerminator(x, z, angle, hpMul);
    case 'sorcerer': return new Sorcerer(x, z, angle, hpMul);
  }
}

const PICKUP_KINDS = new Set<string>(['healthSmall', 'healthLarge', 'armor', 'bulletClip', 'bulletBox', 'shells', 'shellBox', 'keyRed', 'keyBlue', 'keyYellow', 'shotgun', 'chainsword', 'sniper', 'rounds', 'grenades', 'launcher', 'rockets', 'bolter', 'bolts', 'flamer', 'fuel']);

export class LevelScene implements GameCtx {
  readonly scene: Scene;
  readonly camera: FreeCamera;
  readonly lights = new LightManager();
  readonly shake = new ScreenShake();
  readonly projectiles = new Projectiles();
  readonly grenades = new Grenades();
  readonly rockets = new Rockets();
  /** Tutorial / gallery / battle test: infinite ammo and an inspect panel. */
  get sandbox(): boolean {
    return this.data.id === 'tutorial' || this.data.id === 'gallery' || this.data.id === 'battle';
  }
  godMode = false;

  /** True while the focus ability slows the world. */
  focusOn = false;
  readonly ability: AbilityController = new AbilityController(this);
  focusDuration: number = FOCUS.duration;
  private grenadeCD = 0;
  private zoom = 0;
  private baseFov = 1.2;
  readonly enemies: Enemy[] = [];
  readonly barrels: Barrel[] = [];
  readonly pickups: Pickup[] = [];
  readonly props: Prop[] = [];
  readonly diff: (typeof DIFFICULTY)['normal'];
  built!: BuiltLevel;
  world!: World;
  player!: Player;
  weapons = new WeaponSystem();
  particles!: Particles;
  decals!: Decals;
  debris!: Debris;
  nav!: NavField;
  post!: PostFX;
  private batch!: SpriteBatch;
  private triggers!: TriggerSystem;
  private elapsed = 0;
  private kills = 0;
  private totalKills = 0;
  private items = 0;
  private totalItems = 0;
  private secrets = new Set<string>();
  private waves = new Set<string>();
  private wavesCleared = new Set<string>();
  private objective = '';
  private checkpoint = 'cp_start';
  private hurtSoundT = 0;
  private deathNotified = false;
  private completed = false;
  private telefogs: { pos: Vector3; t: number }[] = [];
  private loops: SoundHandle[] = [];
  private liftLoops = new Map<Lift, SoundHandle>();
  private tmpLight: [number, number, number] = [0, 0, 0];
  private initialPickups = 0;
  private lavaCells = new Set<number>();
  private summoned = new Set<Enemy>();
  boss: Enemy | null = null;
  siege: SiegeController | null = null;
  readonly style = new StyleMeter();
  private gloryPending = false;
  private dashFov = 0;
  private combatHold = 0;
  private bossShown = false;
  private hazards: { pos: Vector3; t: number; delay: number; radius: number; damage: number }[] = [];
  started = false;

  private constructor(
    private engine: Engine,
    readonly data: LevelData,
    readonly difficulty: Difficulty,
    readonly audio: AudioManager,
    readonly ui: UIManager,
    private settings: () => Settings,
    readonly hooks: LevelHooks,
  ) {
    this.diff = DIFFICULTY[difficulty];
    this.scene = new Scene(engine);
    this.scene.clearColor = new Color4(0.01, 0.008, 0.01, 1);
    this.scene.skipPointerMovePicking = true;
    this.scene.autoClear = true;
    this.camera = new FreeCamera('cam', new Vector3(0, 2, 0), this.scene);
    this.camera.inputs.clear();
    this.camera.minZ = 0.05;
    this.camera.maxZ = 220;
    this.camera.rotation.set(0, 0, 0);
  }

  get time(): number {
    return this.elapsed;
  }

  static async create(
    engine: Engine, data: LevelData, difficulty: Difficulty, audio: AudioManager, ui: UIManager,
    settings: () => Settings, hooks: LevelHooks, save: SaveData | null, progress: (p: number, label: string) => Promise<void>,
    carry: PlayerState | null = null,
  ): Promise<LevelScene> {
    const L = new LevelScene(engine, data, difficulty, audio, ui, settings, hooks);
    await progress(0.1, 'SPRITES');
    buildSpriteAtlas();
    await progress(0.3, 'GEOMETRY');
    L.built = buildLevel(data, L.scene, L.lights);
    await progress(0.6, 'ENTITIES');
    L.setupWorld();
    L.applyLoadout(carry);
    await progress(0.8, 'FX');
    L.setupFx();
    if (save) L.restore(save);
    await progress(0.95, 'READY');
    L.applySettings(settings());
    return L;
  }

  // ------------------------------------------------------------------ setup

  private setupWorld(): void {
    const b = this.built;
    const doors = this.data.doors.map((d, i) => new Door(d, i, b.grid, this.scene, b.atlasMat, b.bakeLight));
    const lifts = this.data.lifts.map((l) => new Lift(l, b.grid, this.scene, b.atlasMat, b.bakeLight));
    this.world = new World(b.grid, doors, lifts, b.boxes);
    doors.forEach((d) => {
      d.onSound = (k) => {
        const [x, y, w, h] = d.def.rect;
        const c = new Vector3((x + w / 2) * CELL, d.floor + 1.5, (y + h / 2) * CELL);
        if (k === 'open') this.sound('door_open', c);
        else if (k === 'close') this.sound('door_close', c);
      };
    });
    lifts.forEach((l) => {
      l.onSound = (k) => {
        const [x, y, w, h] = l.def.rect;
        const c = new Vector3((x + w / 2) * CELL, l.y + 0.5, (y + h / 2) * CELL);
        if (k === 'start') {
          this.liftLoops.get(l)?.stop();
          this.liftLoops.set(l, this.sound('lift_hum', c, { loop: true }));
        } else {
          this.liftLoops.get(l)?.stop(0.1);
          this.sound('lift_stop', c);
        }
      };
    });
    this.nav = new NavField(this.world);
    this.player = new Player(this.world, {
      onStep: (metal, nuk) => {
        this.sound(metal ? 'step_metal' : 'step_concrete', null, { volume: 0.9 });
        if (nuk) this.particles.emit('splash', this.player.pos.add(new Vector3(0, 0.1, 0)), new Vector3(0, 1, 0), 6, 0.6);
      },
      onLand: (v) => {
        this.sound('step_metal', null, { volume: Math.min(1.5, v / 6), pitch: 0.8 });
        this.shake.add(Math.min(0.25, v / 40));
      },
      onNukage: () => {
        const ci = this.world.grid.cellAt(this.player.pos.x, this.player.pos.z);
        const lava = this.lavaCells.has(ci);
        this.damagePlayer(PLAYER.nukageDamage * (lava ? 2.2 : 1) * (this.difficulty === 'easy' ? 0.6 : 1), this.player.pos, 'blast');
        this.ui.hud.flash(lava ? 'red' : 'toxic', 0.5);
        if (lava) this.particles.emit('fire', this.player.pos.add(new Vector3(0, 0.2, 0)), new Vector3(0, 1, 0), 8, 0.6);
      },
      onJump: () => {},
      onParry: () => {
        this.sound('chainsword_swing', null, { pitch: 1.4, volume: 0.7 });
        this.ui.viewModel.parry();
      },
      onDash: () => {
        this.sound('fireball_fly', null, { pitch: 2.2, volume: 0.5 });
        this.dashFov = 1;
        this.particles.emit('dust', this.player.pos.add(new Vector3(0, 0.2, 0)), new Vector3(0, 1, 0), 8, 0.6);
      },
    });

    const skill = this.difficulty === 'easy' ? 'e' : this.difficulty === 'normal' ? 'n' : 'h';
    this.data.things.forEach((th, index) => {
      if (th.skill && !th.skill.includes(skill)) return;
      const x = th.x * CELL, z = th.y * CELL;
      if (th.kind === 'player') {
        this.player.spawn(x, z, th.angle ?? 0);
        return;
      }
      if (th.kind in ENEMIES) {
        this.spawnEnemy(th, index);
        return;
      }
      if (PICKUP_KINDS.has(th.kind)) {
        const pos = new Vector3(x, 0, z);
        pos.y = this.world.groundAt(x, z, 0.2, 10, 20);
        this.pickups.push({ kind: th.kind as PickupKind, pos, id: th.id, taken: false, counts: true, index: this.pickups.length, phase: Math.random() * 6 });
        return;
      }
      if (th.kind === 'barrel') {
        const pos = new Vector3(x, this.world.groundAt(x, z, 0.3, 10, 20), z);
        const bar = new Barrel(pos, this.barrels.length);
        this.barrels.push(bar);
        this.world.addCollider(bar.collider);
        return;
      }
      if (th.kind === 'lamp' || th.kind === 'techColumn') {
        const pos = new Vector3(x, this.world.groundAt(x, z, 0.3, 10, 20), z);
        const r = th.kind === 'lamp' ? 0.25 : 0.42;
        const col = { minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r, minY: pos.y, maxY: pos.y + 1.9 };
        this.world.addCollider(col);
        this.props.push({ kind: th.kind, pos, collider: col });
      }
    });
    for (const z of this.data.zones) if (z.lava) this.built.grid.eachRect(z.rect, (i) => this.lavaCells.add(i));
    if (this.data.fogColor) this.lights.fogColor.set(...this.data.fogColor);
    this.boss = this.enemies.find((e) => e.def.bossName) ?? null;
    if (this.data.id === 'siege') this.siege = new SiegeController(this);
    this.totalKills = this.enemies.length;
    this.initialPickups = this.pickups.length;
    this.totalItems = this.pickups.length;
    this.triggers = new TriggerSystem(this.data.triggers, this.built.grid, (a) => this.runAction(a));
  }

  private spawnEnemy(th: ThingDef, index: number): void {
    const x = th.x * CELL, z = th.y * CELL;
    const hpMul = this.diff.enemyHealth;
    const angle = th.angle ?? 0;
    const e = makeEnemy(th.kind as EnemyKind, x, z, angle, hpMul);
    e.spawnIndex = index;
    e.ambush = !!th.ambush;
    e.wave = th.wave;
    e.teleport = !!th.teleport;
    e.pos.y = this.world.groundAt(x, z, e.radius, 10, 20);
    e.spawn.y = e.pos.y;
    if (th.wave && !th.awake) e.setState('dormant');
    if (th.frozen) e.frozen = true;
    if (e instanceof Sovereign) e.onPhase2 = () => this.hooks.voice('v5_phase');
    this.enemies.push(e);
  }

  /** Starting weapons/ammo: carried over from the previous chapter, or the chapter's default loadout. */
  private applyLoadout(carry: PlayerState | null): void {
    const p = this.player;
    if (carry) {
      p.applyState({ ...carry, keys: [] });
      p.health = Math.max(p.health, 60);
      return;
    }
    const l = this.data.startLoadout;
    p.applyState({ health: l.health, armor: l.armor, ammo: { bullets: l.bullets, shells: l.shells, rounds: l.rounds ?? 0, rockets: l.rockets ?? 0, bolts: 0, fuel: 0, grenades: l.grenades ?? 0 }, weapons: [...l.weapons], keys: [] });
  }

  summon(kind: EnemyKind, x: number, z: number, opts: { hpMul?: number; tracked?: boolean } = {}): Enemy | null {
    const g = this.world.grid;
    // find open floor near the requested spot
    let px = x, pz = z;
    for (let tries = 0; tries < 12; tries++) {
      const ci = g.cellAt(px, pz);
      if (ci >= 0 && !g.isSolid(ci) && !this.lavaCells.has(ci) && g.kind[ci] !== CellKind.Nukage) break;
      if (tries === 11) return null;
      const a = Math.random() * Math.PI * 2;
      px = x + Math.sin(a) * (2 + tries * 0.6);
      pz = z + Math.cos(a) * (2 + tries * 0.6);
    }
    const e = makeEnemy(kind, px, pz, 0, opts.hpMul ?? this.diff.enemyHealth);
    e.pos.y = this.world.groundAt(px, pz, e.radius, 10, 20);
    e.spawn.y = e.pos.y;
    e.setState('alert');
    e.lastSeen = this.player.pos.clone();
    this.enemies.push(e);
    if (opts.tracked !== false) this.summoned.add(e);
    this.telefogs.push({ pos: e.pos.clone(), t: 0 });
    this.particles.emit('teleport', e.pos.add(new Vector3(0, 1, 0)), new Vector3(0, 1, 0), 30, 1);
    this.lights.addFx(e.pos.add(new Vector3(0, 1.2, 0)), new Color3(1, 0.3, 0.3), 2.2, 6, 0.6);
    this.sound('teleport', e.pos);
    return e;
  }

  private parrySuccess(src: Enemy | null, from: Vector3): void {
    const p = this.player;
    p.parryT = 0;
    p.parryCD = 0;
    p.invulnT = Math.max(p.invulnT, 0.35);
    const at = src ? src.eye : from;
    this.sound('impact_metal', at, { pitch: 0.55, volume: 1.4 });
    this.sound('chainsword_hit', at, { pitch: 1.3, volume: 0.7 });
    this.particles.emit('sparks', at, new Vector3(0, 1, 0), 30, 1.6);
    this.lights.addFx(at, new Color3(0.4, 0.7, 1), 3, 8, 0.25);
    this.ui.hud.flash('gold', 0.3);
    this.shake.add(0.35);
    this.style.kill('parry', []);
    this.style.feed.length = 0;
    this.ui.hud.styleBonus(t('style.tag.parry'));
    if (src && src.alive) {
      src.staggerT = Math.max(src.staggerT, src.def.bossName ? 1.2 : 1.6);
      src.setState('pain');
      this.gunStrikeTarget = src;
      this.gunStrikeT = 1.8;
    }
  }

  /** Counter after a parry: point-blank shot that hits like a truck. */
  private gunStrike(e: Enemy): void {
    const p = this.player;
    const dir = new Vector3(e.pos.x - p.pos.x, 0, e.pos.z - p.pos.z).normalize();
    p.yaw = Math.atan2(dir.x, dir.z);
    p.invulnT = Math.max(p.invulnT, 0.5);
    this.gunStrikeTarget = null;
    this.sound('shotgun_fire', null, { pitch: 0.6, volume: 1.4 });
    this.sound('barrel_explode', e.pos, { pitch: 1.4, volume: 0.6 });
    this.muzzleFlash(true);
    this.shake.add(0.7);
    this.particles.emit('blood', e.eye, dir, 30, 1);
    this.damageEnemy(e, e.def.bossName ? 220 : Math.max(220, e.hp + 1), dir, 'blast', e.eye);
  }

  /** Gallery: what the player is looking at (monster or weapon on display). */
  private inspectTarget(): { title: string; body: string } | null {
    const p = this.player;
    const f = p.forward;
    let best: { title: string; body: string } | null = null;
    let bestDot = 0.96;
    const consider = (pos: Vector3, key: string) => {
      const to = pos.subtract(p.eye);
      const d = to.length();
      if (d > 26 || d < 0.5) return;
      const dot = Vector3.Dot(to.scale(1 / d), f);
      if (dot < bestDot) return;
      bestDot = dot;
      best = { title: t(key), body: t(key + '.d') };
    };
    for (const e of this.enemies) if (e.frozen) consider(e.eye, 'enemy.' + e.kind);
    if (this.data.id === 'gallery') for (const k of this.pickups) if (!k.taken) consider(k.pos.add(new Vector3(0, 0.4, 0)), 'item.' + k.kind);
    return best;
  }

  /** Battle Test: spawn a monster in front of the player. */
  spawnInFront(kind: EnemyKind): void {
    const p = this.player;
    const f = new Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw));
    this.summon(kind, p.pos.x + f.x * 12, p.pos.z + f.z * 12, { tracked: false });
  }

  killAll(): void {
    for (const e of this.enemies) if (e.alive && !e.frozen) this.damageEnemy(e, 99999, new Vector3(0, 1, 0), 'blast');
  }

  /** A staggered monster close in front of the player, if any. */
  private gloryTarget(): Enemy | null {
    const p = this.player;
    if (p.dead) return null;
    const f = p.forward;
    let best: Enemy | null = null;
    let bd = 3.8;
    for (const e of this.enemies) {
      if (!e.alive || e.staggerT <= 0 || !e.staggered) continue;
      const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z;
      const d = Math.hypot(dx, dz) - e.radius;
      if (d > bd) continue;
      if ((dx * f.x + dz * f.z) / Math.max(0.01, Math.hypot(dx, dz)) < 0.45) continue;
      best = e;
      bd = d;
    }
    return best;
  }

  private gloryKill(e: Enemy): void {
    const p = this.player;
    const dir = new Vector3(e.pos.x - p.pos.x, 0, e.pos.z - p.pos.z).normalize();
    // lunge in
    const stand = e.pos.subtract(dir.scale(e.radius + p.radius + 0.25));
    if (this.world.los(p.eye, new Vector3(stand.x, p.eye.y, stand.z))) {
      p.pos.x = stand.x;
      p.pos.z = stand.z;
    }
    p.yaw = Math.atan2(dir.x, dir.z);
    p.invulnT = 0.7;
    this.sound('chainsword_hit', e.pos, { pitch: 0.8, volume: 1.2 });
    this.sound('gib', e.pos);
    this.shake.add(0.6);
    this.ui.hud.flash('gold', 0.25);
    this.gloryPending = true;
    this.ability.onExecute();
    this.damageEnemy(e, e.hp + 9999, dir, 'saw', e.eye);
    this.gloryPending = false;
    // the reward: health plus ammo for what you are holding
    this.spawnDrop('healthSmall', e.pos);
    this.spawnDrop('healthSmall', e.pos.add(new Vector3(0.4, 0, 0.3)));
    const ammo = this.weapons.ammoType;
    const map: Record<string, PickupKind> = { bullets: 'bulletClip', shells: 'shells', rounds: 'rounds', grenades: 'grenades', rockets: 'rockets', bolts: 'bolts', fuel: 'fuel' };
    this.spawnDrop(ammo ? map[ammo] ?? 'shells' : 'shells', e.pos.add(new Vector3(-0.4, 0, 0.3)));
  }

  /** Siege: every original pickup comes back between rounds. */
  refreshPickups(): void {
    for (const k of this.pickups) if (k.index < this.initialPickups && k.taken) k.taken = false;
  }

  /** Siege: drop long-dead corpses so the arena stays readable and fast. */
  clearDead(): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.state === 'dead' && e.deathT > 3) this.enemies.splice(i, 1);
    }
  }

  taunt(id: string): void {
    this.hooks.voice(id);
  }

  pushPlayer(v: Vector3): void {
    this.player.vel.addInPlace(v);
  }

  hazard(pos: Vector3, delay: number, radius: number, damage: number): void {
    const p = pos.clone();
    p.y = this.world.groundAt(p.x, p.z, 0.3, 10, 20);
    this.hazards.push({ pos: p, t: 0, delay, radius, damage });
    this.sound('fireball_cast', p, { pitch: 0.5, volume: 0.7 });
  }

  private updateHazards(dt: number): void {
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.t += dt;
      if (Math.random() < dt * 30) this.particles.emit('fire', h.pos.add(new Vector3((Math.random() - 0.5) * h.radius, 0.1, (Math.random() - 0.5) * h.radius)), new Vector3(0, 1, 0), 1, 0.3, 0.6);
      if (h.t < h.delay) continue;
      this.hazards.splice(i, 1);
      this.particles.emit('fire', h.pos.add(new Vector3(0, 0.4, 0)), new Vector3(0, 1, 0), 34, h.radius * 0.6, 1.4);
      this.particles.emit('sparks', h.pos.add(new Vector3(0, 0.4, 0)), new Vector3(0, 1, 0), 16, 1.2);
      this.lights.addFx(h.pos.add(new Vector3(0, 1, 0)), new Color3(1, 0.45, 0.15), 3.5, h.radius * 3, 0.4);
      this.sound('barrel_explode', h.pos, { pitch: 0.8, volume: 0.8 });
      const p = this.player;
      if (Math.hypot(p.pos.x - h.pos.x, p.pos.z - h.pos.z) < h.radius + p.radius && p.pos.y < h.pos.y + 1.5) {
        this.damagePlayer(h.damage, h.pos, 'blast');
        p.vel.y = Math.max(p.vel.y, 5);
      }
    }
  }

  private setupFx(): void {
    const tex = getSpriteTexture(this.scene);
    const mat = createRetroMaterial('spriteMat', this.scene, tex, 'sprite');
    this.lights.register(mat);
    this.batch = new SpriteBatch('sprites', this.scene, mat, 900);
    this.particles = new Particles(this.scene);
    this.decals = new Decals(this.scene);
    this.lights.register(this.decals.mat);
    this.debris = new Debris(this.world);
    this.debris.onLand = (p, bloody) => {
      if (bloody && Math.random() < 0.7) this.decals.add(Math.random() < 0.5 ? 'blood' : 'bloodB', p.add(new Vector3(0, 0.005, 0)), new Vector3(0, 1, 0), rand(0.5, 1.0), this.lightAt(p.x, p.z));
    };
    this.post = new PostFX(this.scene, this.camera, this.settings());
    // dust motes in the hangar light shafts
    const du = this.data.dust;
    if (du) this.particles.dust(new Vector3(du[0] * CELL, 0.5, du[1] * CELL), new Vector3((du[0] + du[2]) * CELL, 9, (du[1] + du[3]) * CELL));
  }

  applySettings(s: Settings): void {
    this.post?.apply(s);
    this.lights.bands = s.retroLight ? 9 : 0;
    this.updateFov(s.fov);
  }

  private updateFov(hfovDeg: number): void {
    const aspect = this.engine.getRenderWidth() / Math.max(1, this.engine.getRenderHeight());
    const h = (hfovDeg * Math.PI) / 180;
    this.baseFov = 2 * Math.atan(Math.tan(h / 2) / Math.max(aspect, 0.5));
    this.camera.fov = this.baseFov * (1 - 0.72 * this.zoom);
  }

  /** Starts ambience + start triggers (after the loading screen is dismissed). */
  begin(fromSave: boolean): void {
    if (this.started) return;
    this.started = true;
    const amb = this.data.ambience;
    this.loops.push(this.sound('amb_hangar', null, { loop: true, pitch: this.data.chapter > 1 ? 0.8 : 1 }));
    this.loops.push(this.sound('amb_industrial', null, { loop: true, pitch: this.data.chapter === 3 ? 0.7 : 1 }));
    if (amb.alarm) this.loops.push(this.sound('amb_alarm', null, { loop: true }));
    if (amb.nukage) this.loops.push(this.sound('amb_nukage', new Vector3(amb.nukage[0] * CELL, 0, amb.nukage[1] * CELL), { loop: true, refDistance: 8, pitch: this.data.chapter > 1 ? 0.6 : 1 }));
    this.weapons.reset(this.player.weapons.has('shotgun') && this.player.ammo.shells > 0 ? 'shotgun' : 'pistol');
    this.weapons.weapon.select(this);
    this.audio.music.play(this.data.music ?? 'hellfront');
    this.audio.music.setIntensity('calm');
    if (!fromSave) this.triggers.start();
    else if (this.objective) this.ui.hud.objective(t(this.objective));
    this.siege?.start();
    this.syncHud();
  }

  // ------------------------------------------------------------------ GameCtx

  sound(id: SoundId, pos?: Vector3 | null, opts: PlayOpts = {}): SoundHandle {
    if (pos && this.focusOn) opts = { ...opts, pitch: (opts.pitch ?? 1) * 0.62 };
    if (pos) {
      const occluded = !this.world.los(this.player.eye, pos.add(new Vector3(0, 0.6, 0)));
      return this.audio.play(id, { ...opts, pos, occluded });
    }
    return this.audio.play(id, opts);
  }

  lightAt(x: number, z: number): [number, number, number] {
    const o = sampleLightGrid(this.built.grid, this.built.lightGrid, x, z, [0, 0, 0]);
    return o;
  }

  canSeePlayer(from: Vector3): boolean {
    return !this.playerHidden && this.world.los(from, this.player.eye);
  }

  /** A parriable attack is winding up near the player. */
  private parryWarning(): boolean {
    const p = this.player;
    return this.enemies.some((e) => e.alive && e.parryTell > 0 && Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) < 7);
  }

  /** Enemy whose attack was just parried; E performs a Gun Strike on it. */
  private gunStrikeTarget: Enemy | null = null;
  private gunStrikeT = 0;
  /** Extra filter hook (abilities): return true to absorb a hit. */
  hitFilter: ((amount: number, from: Vector3, kind: DamageKind, opts: HitOpts) => boolean) | null = null;
  playerHidden = false;

  damagePlayer(amount: number, from: Vector3, kind: DamageKind, opts: HitOpts = {}): void {
    const p = this.player;
    if (p.dead || p.noclip || this.completed || p.invulnT > 0) return;
    if (opts.parriable && !opts.unblockable && p.parryT > 0) {
      this.parrySuccess(opts.source ?? null, from);
      return;
    }
    if (this.godMode) return;
    // cloaked: monsters cannot hurt you (environmental burns still do)
    if (this.playerHidden && !(kind === 'blast' && !opts.source && from === p.pos)) return;
    if (this.hitFilter?.(amount, from, kind, opts)) return;
    if (this.ability.id === 'aegis' && this.ability.active && kind !== 'melee' && !opts.unblockable) {
      const to = new Vector3(from.x - p.pos.x, 0, from.z - p.pos.z).normalize();
      const f = p.forward;
      if (to.x * f.x + to.z * f.z > Math.cos(1.3)) {
        this.particles.emit('sparks', p.eye.add(new Vector3(f.x, 0, f.z).scale(0.8)), to, 8, 0.8);
        this.sound('impact_metal', null, { pitch: 1.4, volume: 0.5 });
        return;
      }
    }
    amount = Math.round(amount * (this.siege?.playerDamageMul() ?? 1));
    if (amount <= 0) return;
    this.style.hurt(amount);
    if (opts.piercing) {
      // armor-piercing hell-flame: shreds armor twice as fast and still burns flesh
      const had = p.armor > 0;
      p.armor = Math.max(0, p.armor - amount * 2);
      p.health -= Math.round(amount * (had ? 0.5 : 1));
    } else {
      const absorbed = Math.min(p.armor, Math.floor(amount / 3));
      p.armor -= absorbed;
      p.health -= amount - absorbed;
    }
    const to = new Vector3(from.x - p.pos.x, 0, from.z - p.pos.z);
    const ang = Math.atan2(to.x, to.z) - p.yaw;
    const rel = Math.atan2(Math.sin(ang), Math.cos(ang));
    if (kind !== 'blast' || to.lengthSquared() > 0.01) this.ui.hud.damageFrom(rel, amount);
    this.ui.hud.face.damage(Math.abs(rel) < 0.5 ? 0 : rel > 0 ? 1 : -1, amount);
    this.ui.hud.flash('red', Math.min(0.85, 0.25 + amount / 40));
    this.post.hurt(Math.min(1, amount / 25));
    this.shake.add(Math.min(0.5, amount / 50));
    if (p.health <= 0) {
      p.health = 0;
      p.dead = true;
      p.deathTime = 0;
      this.sound('player_death');
      this.audio.stopVoice();
      return;
    }
    if (this.hurtSoundT <= 0) {
      this.sound('player_hurt');
      this.hurtSoundT = 0.35;
    }
  }

  damageEnemy(e: Enemy, amount: number, dir: Vector3, kind: DamageKind, hitPos?: Vector3): void {
    if (!e.alive) return;
    const at = hitPos ?? e.eye;
    const d = dir.normalizeToNew();
    this.particles.emit('blood', at, d.scale(-0.3).add(new Vector3(0, 0.6, 0)), Math.min(26, 6 + amount), 0.6);
    if (this.siege && kind !== 'fireball' && kind !== 'melee') amount *= this.siege.enemyDamageMul(kind);
    e.damage(amount, d, kind, this);
    if (e.alive && !e.staggered && !e.def.bossName && e.hp <= e.maxHp * 0.22 && kind !== 'fireball') {
      e.staggered = true;
      e.staggerT = 2.8;
      e.setState('pain');
      this.sound(e.sounds.pain, e.pos, { pitch: (e.sounds.pitch ?? 1) * 0.8 });
    }
    if (!e.alive) {
      if (!this.summoned.has(e)) this.kills++;
      if (kind !== 'fireball' && kind !== 'melee') {
        const tags: KillTag[] = [];
        if (this.gloryPending) tags.push('glory');
        if (!this.player.onGround) tags.push('air');
        if (this.focusOn) tags.push('focus');
        if (kind === 'blast') tags.push('explosive');
        if (kind === 'saw' && !this.gloryPending) tags.push('melee');
        if (kind === 'bullet' && Vector3.Distance(e.pos, this.player.pos) > 30) tags.push('longshot');
        const before = this.style.rankIndex;
        this.style.kill(kind === 'blast' ? 'explosive' : this.weapons.current, tags);
        while (this.style.feed.length) this.ui.hud.styleBonus(t(this.style.feed.shift()!));
        if (this.style.rankIndex > before && this.style.rankIndex >= 3) this.sound('pickup_key', null, { pitch: 0.7 + this.style.rankIndex * 0.08, volume: 0.6 });
        this.siege?.onKill(e, this.style.rank.mul);
      }
      if (this.siege && Math.random() < 0.22) {
        const drops: PickupKind[] = ['shells', 'rounds', 'bulletClip', 'healthSmall', 'grenades', 'healthSmall'];
        this.spawnDrop(drops[Math.floor(Math.random() * drops.length)], e.pos);
      }
      if (this.summoned.has(e) && Math.random() < 0.7) {
        const drops: PickupKind[] = ['shells', 'rounds', 'bulletClip', 'healthSmall', 'grenades', 'shells', 'rounds'];
        this.spawnDrop(drops[Math.floor(Math.random() * drops.length)], e.pos);
      }
      if (e.def.bossName) {
        this.shake.add(1);
        this.lights.addFx(e.eye, new Color3(1, 0.5, 0.2), 6, 22, 1.2);
        this.particles.emit('fire', e.eye, new Vector3(0, 1, 0), 60, 2.5, 1.5);
        this.sound('barrel_explode', e.pos, { pitch: 0.5, volume: 1.4 });
        // the boss's minions collapse with it
        for (const m of this.summoned) if (m.alive) this.damageEnemy(m, 9999, new Vector3(0, 1, 0), 'blast');
      }
      const playerCaused = kind === 'bullet' || kind === 'pellet' || kind === 'saw' || kind === 'blast';
      if (playerCaused) this.playerHit({ kill: true });
      if (e.kind === 'zombieman') this.spawnDrop('bulletClip', e.pos);
      if (e.kind === 'boltgunner') this.spawnDrop(this.player.weapons.has('bolter') ? 'bolts' : 'bolter', e.pos);
      if (e.kind === 'hellflamer') this.spawnDrop(this.player.weapons.has('flamer') ? 'fuel' : 'flamer', e.pos);
      if (e.kind === 'terminator') {
        this.spawnDrop('bolts', e.pos);
        this.spawnDrop('fuel', e.pos.add(new Vector3(0.5, 0, 0.3)));
      }
      if (e.gibbed) this.gibBurst(e);
      else {
        const p = e.pos.add(new Vector3((Math.random() - 0.5) * 0.4, 0.004, (Math.random() - 0.5) * 0.4));
        setTimeout(() => this.decals.add('pool', p, new Vector3(0, 1, 0), e.kind === 'pinky' ? 2.0 : 1.4, this.lightAt(p.x, p.z)), 500);
      }
    } else if (kind === 'bullet' || kind === 'pellet' || kind === 'saw') this.playerHit({ kill: false });
  }

  private gibBurst(e: Enemy): void {
    const c = e.pos.add(new Vector3(0, e.height * 0.55, 0));
    this.particles.emit('gore', c, new Vector3(0, 1, 0), 60, 1);
    for (let k = 0; k < 8; k++) {
      const v = new Vector3((Math.random() - 0.5) * 7, 3 + Math.random() * 5, (Math.random() - 0.5) * 7);
      this.debris.spawn(`chunk${k % 4}`, c, v, 25, 1.2, true);
    }
  }

  radiusDamage(center: Vector3, radius: number, damage: number, source: unknown): void {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = Vector3.Distance(center, e.pos.add(new Vector3(0, e.height * 0.5, 0)));
      if (d > radius + e.radius) continue;
      if (!this.world.los(center, e.eye)) continue;
      this.damageEnemy(e, damage * Math.max(0.1, 1 - d / (radius + e.radius)), e.pos.subtract(center), 'blast');
    }
    const p = this.player;
    const dp = Vector3.Distance(center, p.pos.add(new Vector3(0, 0.9, 0)));
    if (dp < radius + p.radius && this.world.los(center, p.eye)) {
      this.damagePlayer(damage * 0.6 * Math.max(0.1, 1 - dp / (radius + p.radius)), center, 'blast');
      const push = p.pos.subtract(center);
      push.y = 0;
      p.vel.addInPlace(push.normalize().scale(6 * (1 - dp / (radius + p.radius))));
    }
    for (const b of this.barrels) {
      if (b === source || b.exploded) continue;
      const d = Vector3.Distance(center, b.pos);
      if (d < radius) b.damage(damage, true);
    }
  }

  private rayEnemies(o: Vector3, d: Vector3, maxT: number): { t: number; entity: Enemy } | null {
    let best: { t: number; entity: Enemy } | null = null;
    for (const e of this.enemies) {
      if (!e.solid) continue;
      const tt = rayCylinder(o, d, e.pos.x, e.pos.z, e.radius * 0.9, e.pos.y, e.pos.y + e.height, best ? best.t : maxT);
      if (tt !== null) best = { t: tt, entity: e };
    }
    return best;
  }

  private impact(h: RayHit, dir: Vector3, light = true): void {
    if (h.kind === 'none' || h.kind === 'entity') return;
    if (h.kind === 'floor' && this.built.grid.kind[h.cell] === CellKind.Nukage) {
      this.particles.emit('splash', h.point, new Vector3(0, 1, 0), 6, 0.5);
      return;
    }
    const n = h.normal;
    this.particles.emit('sparks', h.point.add(n.scale(0.05)), n.add(dir.scale(-0.3)), 6, 0.5);
    this.particles.emit('smoke', h.point.add(n.scale(0.1)), n, 1, 0.2, 0.25);
    this.decals.add('hole', h.point, n, 0.22, this.lightAt(h.point.x - n.x * 0.1, h.point.z - n.z * 0.1));
    if (light) this.lights.addFx(h.point.add(n.scale(0.2)), new Color3(1, 0.7, 0.35), 0.8, 3, 0.05);
    if (Math.random() < 0.3) this.sound('impact_metal', h.point);
  }

  hitscan(origin: Vector3, dir: Vector3, range: number, damage: number, owner: Enemy | null, kind: DamageKind): void {
    const p = this.player;
    const h = this.world.raycast(origin, dir, range, (o, d, maxT) => {
      const tt = rayCylinder(o, d, p.pos.x, p.pos.z, p.radius, p.pos.y, p.pos.y + p.height, maxT);
      return tt !== null && !p.dead ? { t: tt, entity: p } : null;
    });
    if (h.kind === 'entity') {
      this.damagePlayer(damage, owner ? owner.pos : origin, kind);
      return;
    }
    if (h.collider?.owner instanceof Barrel) h.collider.owner.damage(damage, false);
    this.impact(h, dir, false);
  }

  playerShot(def: HitscanWeaponDef): void {
    const p = this.player;
    const eye = p.eye;
    const f = this.aimDir();
    const right = new Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
    const up = Vector3.Cross(f, right).normalize();
    const acc = new Map<Enemy, { dmg: number; pos: Vector3 }>();
    for (let i = 0; i < def.pellets; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * def.spread;
      const d = f.add(right.scale(Math.cos(a) * r)).add(up.scale(Math.sin(a) * r * 0.6)).normalize();
      const h = this.world.raycast(eye, d, def.range, (o, dd, maxT) => this.rayEnemies(o, dd, maxT));
      if (h.kind === 'entity') {
        const e = h.entity as Enemy;
        const cur = acc.get(e) ?? { dmg: 0, pos: h.point };
        cur.dmg += rand(def.damageMin, def.damageMax);
        acc.set(e, cur);
        this.particles.emit('blood', h.point, d.scale(-1).add(new Vector3(0, 0.5, 0)), 5, 0.5);
        continue;
      }
      if (h.collider?.owner instanceof Barrel) h.collider.owner.damage(rand(def.damageMin, def.damageMax), false);
      this.impact(h, d, i === 0);
    }
    for (const [e, v] of acc) {
      this.damageEnemy(e, v.dmg, e.pos.subtract(p.pos), def.pellets > 1 ? 'pellet' : 'bullet', v.pos);
      this.sound('flesh_hit', v.pos, { volume: 0.8 });
      // wall splatter behind the target
      const behind = this.world.raycast(v.pos, f, 3);
      if (behind.kind === 'wall' && Math.random() < 0.6) this.decals.add('bloodB', behind.point, behind.normal, rand(0.5, 0.9), this.lightAt(behind.point.x - behind.normal.x * 0.1, behind.point.z - behind.normal.z * 0.1));
    }
  }

  playerMelee(def: MeleeWeaponDef): 'enemy' | 'wall' | 'none' {
    const p = this.player;
    const f = new Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw));
    let best: Enemy | null = null;
    let bd = Infinity;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const to = new Vector3(e.pos.x - p.pos.x, 0, e.pos.z - p.pos.z);
      const d = to.length() - e.radius;
      if (d > def.range) continue;
      const ang = Math.acos(Math.max(-1, Math.min(1, Vector3.Dot(to.normalize(), f))));
      if (ang > def.arc / 2 && d > 0.3) continue;
      if (Math.abs(e.pos.y - p.pos.y) > 1.6) continue;
      if (!this.world.los(p.eye, e.eye)) continue;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    if (best) {
      const mul = best.kind === 'pinky' ? def.pinkyMul : 1;
      const at = new Vector3(best.pos.x, p.eyeY - 0.3, best.pos.z).add(f.scale(-best.radius * 0.8));
      this.damageEnemy(best, rand(def.damageMin, def.damageMax) * mul, f, 'saw', at);
      this.particles.emit(best.kind === 'pinky' ? 'gore' : 'blood', at, f.scale(-1).add(new Vector3(0, 0.8, 0)), best.kind === 'pinky' ? 22 : 10, 0.7);
      if (best.kind === 'pinky' && Math.random() < 0.35) this.debris.spawn(`chunk${Math.floor(Math.random() * 3)}`, at, new Vector3((Math.random() - 0.5) * 4, 3, (Math.random() - 0.5) * 4), 20, 1, true);
      if (Math.random() < 0.25) this.decals.add('blood', new Vector3(best.pos.x + (Math.random() - 0.5), best.pos.y + 0.005, best.pos.z + (Math.random() - 0.5)), new Vector3(0, 1, 0), rand(0.5, 0.9), this.lightAt(best.pos.x, best.pos.z));
      // lunge: the blade pulls you in
      if (bd > 0.4) {
        p.vel.x += f.x * def.lunge;
        p.vel.z += f.z * def.lunge;
      }
      return 'enemy';
    }
    for (const b of this.barrels) {
      if (b.exploded) continue;
      if (Vector3.Distance(b.pos, p.pos) < def.range + 0.5) {
        b.damage(def.damageMax, false);
        return 'wall';
      }
    }
    const h = this.world.raycast(p.eye, this.aimDir(), 1.7);
    if (h.kind !== 'none') {
      this.particles.emit('sparks', h.point, h.normal, 8, 0.6);
      return 'wall';
    }
    return 'none';
  }

  playerFlame(): void {
    const p = this.player;
    const f = p.forward;
    const eye = p.eye;
    // visuals: a spray of green fire puffs along the cone
    for (let i = 0; i < 3; i++) {
      const d = new Vector3(f.x + (Math.random() - 0.5) * 0.5, f.y + (Math.random() - 0.5) * 0.25, f.z + (Math.random() - 0.5) * 0.5).normalize();
      this.particles.emit('fire', eye.add(f.scale(0.9)).add(new Vector3(0, -0.25, 0)), d.scale(9 + Math.random() * 4), 2, 0.25, 1.2);
    }
    if (Math.random() < 0.3) this.lights.addFx(eye.add(f.scale(3)), new Color3(0.3, 1, 0.6), 2, 9, 0.12);
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const to = e.eye.subtract(eye);
      const dist = to.length();
      if (dist > FLAMER.range + e.radius) continue;
      if (Vector3.Dot(to.scale(1 / dist), f) < Math.cos(FLAMER.cone)) continue;
      if (!this.world.los(eye, e.eye)) continue;
      this.damageEnemy(e, FLAMER.damage, to, 'flame', e.eye);
    }
  }

  fireRocket(opts?: RocketOpts): void {
    this.rockets.fire(this, opts);
  }

  laserOn = false;
  laserPoint: Vector3 | null = null;
  private playerBeamFx: { from: Vector3; to: Vector3; t: number } | null = null;

  private updateLaser(): void {
    if (!this.laserOn || this.weapons.current !== 'launcher' || this.player.dead) {
      this.laserPoint = null;
      return;
    }
    const h = this.world.raycast(this.player.eye, this.aimDir(), 160, (o, d, maxT) => this.rayEnemies(o, d, maxT));
    this.laserPoint = h.kind === 'none' ? this.player.eye.add(this.aimDir().scale(160)) : h.point.clone();
  }

  playerSpin(radius: number, damage: number): number {
    const p = this.player;
    let n = 0;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z;
      if (Math.hypot(dx, dz) - e.radius > radius) continue;
      if (Math.abs(e.pos.y - p.pos.y) > 1.8) continue;
      if (!this.world.los(p.eye, e.eye)) continue;
      const dir = new Vector3(dx, 0, dz);
      const at = e.pos.add(new Vector3(0, e.height * 0.5, 0));
      this.damageEnemy(e, damage * (e.kind === 'pinky' ? 1.5 : 1), dir, 'saw', at);
      this.particles.emit('blood', at, dir.normalize().add(new Vector3(0, 0.8, 0)), 8, 0.7);
      n++;
    }
    // sparks off nearby walls while the blade sweeps
    const a = Math.random() * Math.PI * 2;
    const h = this.world.raycast(p.eye.add(new Vector3(0, -0.4, 0)), new Vector3(Math.sin(a), 0, Math.cos(a)), radius * 0.7);
    if (h.kind === 'wall') this.particles.emit('sparks', h.point, h.normal, 6, 0.5);
    return n;
  }

  playerBeam(damage: number): void {
    const p = this.player;
    const eye = p.eye;
    const f = this.aimDir();
    const wall = this.world.raycast(eye, f, 150);
    const maxT = wall.kind === 'none' ? 150 : Vector3.Distance(eye, wall.point);
    for (const e of this.enemies) {
      if (!e.solid) continue;
      const tt = rayCylinder(eye, f, e.pos.x, e.pos.z, e.radius * 1.15, e.pos.y, e.pos.y + e.height, maxT);
      if (tt === null) continue;
      const at = eye.add(f.scale(tt));
      this.damageEnemy(e, damage, f, 'bullet', at);
      this.particles.emit('gore', at, f.scale(-1).add(new Vector3(0, 0.6, 0)), 14, 0.8);
    }
    if (wall.collider?.owner instanceof Barrel) wall.collider.owner.damage(damage, false);
    if (wall.kind !== 'none') {
      this.impact(wall, f, true);
      this.particles.emit('sparks', wall.point, wall.normal, 20, 1.2);
    }
    const right = new Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
    const from = eye.add(f.scale(0.9)).add(right.scale(0.15)).add(new Vector3(0, -0.22, 0));
    this.playerBeamFx = { from, to: eye.add(f.scale(maxT)), t: 0.3 };
    this.lights.addFx(eye.add(f.scale(Math.min(6, maxT * 0.5))), new Color3(0.4, 0.6, 1), 4, 14, 0.25);
  }

  muzzleFlash(big: boolean): void {
    const p = this.player;
    this.lights.addFx(p.eye.add(p.forward.scale(0.7)), new Color3(1, 0.78, 0.45), big ? 3.6 : 2.4, big ? 12 : 8, big ? 0.09 : 0.06);
  }

  noise(pos: Vector3, cells: number): void {
    if (this.playerHidden) return; // gunfire does not give a cloaked marine away
    const fromPlayer = Vector3.DistanceSquared(pos, this.player.pos) < 4;
    if (!fromPlayer) return;
    for (const e of this.enemies) {
      if (e.state !== 'idle' || e.ambush) continue;
      if (this.nav.cellsTo(e.pos.x, e.pos.z) <= cells) {
        e.lastSeen = this.player.pos.clone();
        e.alertNow(this);
      }
    }
  }

  spawnDrop(kind: PickupKind, pos: Vector3): void {
    const p = pos.clone();
    p.y = this.world.groundAt(p.x, p.z, 0.2, p.y + 0.5, 1);
    this.pickups.push({ kind, pos: p, taken: false, counts: false, index: this.pickups.length, phase: 0 });
  }

  playerHit(f: { kill: boolean }): void {
    this.ui.hud.hitMarker(f.kill);
  }

  private aimDir(): Vector3 {
    const p = this.player;
    const pitch = p.pitch - p.recoil + this.shake.pitch;
    const cp = Math.cos(pitch);
    return new Vector3(Math.sin(p.yaw) * cp, -Math.sin(pitch), Math.cos(p.yaw) * cp);
  }

  // ------------------------------------------------------------------ scripting

  private runAction(a: TriggerAction): void {
    switch (a.do) {
      case 'voice':
        this.hooks.voice(a.id);
        break;
      case 'objective':
        this.objective = a.key;
        this.ui.hud.objective(t(a.key));
        break;
      case 'wave':
        this.activateWave(a.id);
        break;
      case 'openDoor':
        this.doorById(a.id)?.forceOpen();
        break;
      case 'closeDoor': {
        const d = this.doorById(a.id);
        if (d) {
          d.forceClose();
          if (a.lock) d.locked = true;
        }
        break;
      }
      case 'unlockDoor': {
        const d = this.doorById(a.id);
        if (d) d.locked = false;
        break;
      }
      case 'checkpoint':
        this.saveCheckpoint(a.id);
        break;
      case 'message':
        this.ui.hud.message(t(a.key));
        break;
      case 'exit':
        this.complete();
        break;
      case 'ability':
        this.ability.equip(a.id as never);
        this.ui.hud.message(t('ability.unlocked', { name: t('ability.' + a.id) }));
        break;
      case 'chooseAbility':
        this.hooks.chooseAbility([]);
        break;
    }
  }

  private doorById(id: string): Door | undefined {
    return this.world.doors.find((d) => d.def.id === id);
  }

  private activateWave(id: string): void {
    if (this.waves.has(id)) return;
    this.waves.add(id);
    for (const e of this.enemies) {
      if (e.wave !== id || e.state !== 'dormant') continue;
      e.setState('alert');
      e.lastSeen = this.player.pos.clone();
      if (e.teleport) {
        this.telefogs.push({ pos: e.pos.clone(), t: 0 });
        this.particles.emit('teleport', e.pos.add(new Vector3(0, 1, 0)), new Vector3(0, 1, 0), 30, 1);
        this.lights.addFx(e.pos.add(new Vector3(0, 1.2, 0)), new Color3(0.4, 1, 0.55), 2.2, 6, 0.6);
        this.sound('teleport', e.pos);
      }
    }
  }

  private saveCheckpoint(id: string): void {
    const first = id !== this.checkpoint || this.elapsed < 1;
    this.checkpoint = id;
    this.hooks.onCheckpoint(this.snapshot());
    if (first && id !== 'cp_start') this.ui.hud.message(t('msg.checkpoint'));
  }

  snapshot(): SaveData {
    const w: WorldSnapshot = {
      enemies: this.enemies.map((e) => (e.state === 'dormant' ? 'dormant' : e.alive ? 'alive' : 'dead')),
      pickupsTaken: this.pickups.filter((p) => p.taken && p.index < this.initialPickups).map((p) => p.index),
      barrelsExploded: this.barrels.filter((b) => b.exploded).map((b) => b.index),
      triggers: [...this.triggers.fired],
      waves: [...this.waves],
      doorsOpen: this.world.doors.filter((d) => d.state === 'open' && (d.def.type === 'secret' || d.def.type === 'closet' || d.def.type === 'locked')).map((d) => d.def.id),
      doorsUnlocked: this.world.doors.filter((d) => d.def.type === 'locked' && !d.locked).map((d) => d.def.id),
      lifts: this.world.lifts.map((l) => l.target),
      secrets: [...this.secrets],
      kills: this.kills,
      items: this.items,
      time: this.elapsed,
      objective: this.objective,
    };
    return {
      version: 1, level: this.data.id, difficulty: this.difficulty, checkpoint: this.checkpoint,
      player: this.player.state, world: w, savedAt: Date.now(),
    };
  }

  private restore(s: SaveData): void {
    const w = s.world;
    this.player.applyState(s.player);
    this.player.health = Math.max(this.player.health, 50);
    const cp = this.data.checkpoints.find((c) => c.id === s.checkpoint) ?? this.data.checkpoints[0];
    this.checkpoint = cp.id;
    this.player.spawn(cp.x * CELL, cp.y * CELL, cp.angle);
    this.enemies.forEach((e, i) => {
      const st = w.enemies[i];
      if (st === 'dead') {
        e.setState('dead');
        e.deathT = 10;
      } else if (st === 'alive') {
        if (e.state === 'dormant') e.setState('idle');
      }
    });
    for (const i of w.pickupsTaken) if (this.pickups[i]) this.pickups[i].taken = true;
    for (const i of w.barrelsExploded) {
      const b = this.barrels[i];
      if (b) {
        b.exploded = true;
        this.world.removeCollider(b.collider);
      }
    }
    this.triggers.restore(w.triggers);
    w.waves.forEach((id) => this.waves.add(id));
    for (const d of this.world.doors) {
      if (w.doorsOpen.includes(d.def.id)) {
        d.open = 1;
        d.state = 'open';
        d.update(0);
      }
      if (w.doorsUnlocked.includes(d.def.id)) d.locked = false;
    }
    this.world.lifts.forEach((l, i) => {
      const target = w.lifts[i];
      if (target !== undefined && target !== l.def.low) {
        l.target = target;
        l.y = target;
        l.moving = true;
        l.update(0);
      }
    });
    w.secrets.forEach((id) => this.secrets.add(id));
    this.kills = w.kills;
    this.items = w.items;
    this.elapsed = w.time;
    this.objective = w.objective;
    for (const id of this.waves) if (this.enemies.filter((e) => e.wave === id).every((e) => !e.alive)) this.wavesCleared.add(id);
    // a clean checkpoint snapshot (now at the checkpoint position)
    this.player.pos.y = this.world.groundAt(this.player.pos.x, this.player.pos.z, this.player.radius, 50, 100);
  }

  private complete(): void {
    if (this.completed) return;
    this.completed = true;
    if (this.data.completeVoice) this.hooks.voice(this.data.completeVoice);
    this.sound('level_complete');
    this.hooks.onComplete({
      kills: this.kills, totalKills: this.totalKills, items: this.items, totalItems: this.totalItems,
      secrets: this.secrets.size, totalSecrets: this.data.secrets.length, time: this.elapsed, par: this.data.parTime,
    });
  }

  // ------------------------------------------------------------------ frame

  private tryUse(): void {
    if (this.gunStrikeTarget && this.gunStrikeT > 0 && this.gunStrikeTarget.alive) {
      this.gunStrike(this.gunStrikeTarget);
      return;
    }
    const glory = this.gloryTarget();
    if (glory) {
      this.gloryKill(glory);
      return;
    }
    const p = this.player;
    const g = this.built.grid;
    const here = g.cellAt(p.pos.x, p.pos.z);
    const lift = this.world.liftAt(here);
    if (lift && g.kind[here] === CellKind.Lift) {
      lift.activate();
      return;
    }
    const d = new Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw));
    const h = this.world.raycast(new Vector3(p.pos.x, p.pos.y + 1.0, p.pos.z), d, PLAYER.useRange + 0.4);
    let door: Door | null = null;
    if (h.kind === 'door') door = this.world.doors.find((dd) => dd.slab === h.collider) ?? null;
    if (!door) {
      // probe the cell in front (doors that are partially open etc.)
      const c = g.cellAt(p.pos.x + d.x * 1.4, p.pos.z + d.z * 1.4);
      door = this.world.doorAt(c) ?? this.world.doorAt(g.cellAt(p.pos.x + d.x * 2.6, p.pos.z + d.z * 2.6));
      const l2 = this.world.liftAt(c) ?? (h.kind === 'wall' ? this.world.liftAt(h.cell) : null);
      if (!door && l2) {
        l2.activate();
        return;
      }
    }
    if (!door) return;
    const r = door.use(p.keys, true);
    if (r === 'needRed' || r === 'needBlue' || r === 'needYellow' || r === 'locked') {
      this.sound('door_locked');
      this.ui.hud.message(t(r === 'locked' ? 'msg.locked' : 'msg.' + r));
    }
  }

  update(dt: number, input: Input): void {
    if (!this.started) return;
    this.elapsed += dt;
    this.hurtSoundT -= dt;
    const p = this.player;
    const s = this.settings();

    if (input.codePressed('F3')) this.ui.debug.toggle();
    if (input.codePressed('F4')) {
      p.noclip = !p.noclip;
      this.ui.hud.message(p.noclip ? 'NOCLIP ON' : 'NOCLIP OFF');
    }
    if (!p.dead && input.pressed('use')) this.tryUse();
    if (!p.dead && this.siege?.shopOpen && input.pressed('shop')) this.hooks.openShop();

    // Q: the equipped ability (focus slows the world, the marine keeps full speed)
    this.ability.update(dt, input);
    const wdt = dt * this.ability.worldScale;

    // G: frag grenade
    this.grenadeCD -= dt;
    if (!p.dead && input.pressed('grenade') && this.grenadeCD <= 0) {
      if (p.ammo.grenades > 0) {
        p.ammo.grenades--;
        this.grenades.throw(this);
        this.grenadeCD = GRENADE.cooldown;
      } else this.ui.hud.message(t('msg.noGrenades'));
    }

    // sniper scope (hold RMB)
    const scoped = !p.dead && this.weapons.current === 'sniper' && input.rightDown;
    this.zoom += ((scoped ? 1 : 0) - this.zoom) * Math.min(1, dt * 14);
    this.camera.fov = this.baseFov * (1 - 0.72 * this.zoom);
    this.ui.hud.setScope(this.zoom > 0.6);
    if (this.zoom > 0.3) {
      input.mouseDX *= 0.35;
      input.mouseDY *= 0.35;
    }

    p.update(dt, input, s);
    this.weapons.update(dt, input, this);
    this.updateLaser();
    if (this.playerBeamFx && (this.playerBeamFx.t -= dt) <= 0) this.playerBeamFx = null;

    // doors: blocked when anything stands in the doorway
    for (const d of this.world.doors) {
      d.obstructed = false;
      const s2 = d.slab;
      const test = (x: number, z: number, r: number) => x + r > s2.minX && x - r < s2.maxX && z + r > s2.minZ && z - r < s2.maxZ;
      if (test(p.pos.x, p.pos.z, p.radius)) d.obstructed = true;
      else for (const e of this.enemies) if (e.solid && test(e.pos.x, e.pos.z, e.radius)) {
        d.obstructed = true;
        break;
      }
      d.update(dt);
    }
    for (const l of this.world.lifts) l.update(dt);

    this.nav.update(dt, p.pos.x, p.pos.z);
    for (const e of this.enemies) updateEnemy(e, wdt, this);
    this.separate();
    this.projectiles.update(wdt, this);
    this.grenades.update(wdt, this);
    this.rockets.update(wdt, this);
    for (const b of this.barrels) b.update(wdt, this);
    this.updatePickups();
    this.triggers.update(dt, p.pos.x, p.pos.z);
    this.checkSecrets();
    this.checkWaves();
    this.updateBoss();
    this.updateHazards(wdt);
    this.updateMusic(dt);
    this.siege?.update(dt, wdt);
    for (const tf of this.telefogs) tf.t += wdt;
    this.telefogs = this.telefogs.filter((tf) => tf.t < 0.5);

    this.debris.update(wdt);
    this.shake.update(dt);
    this.style.update(dt);
    const sr = this.style.rank;
    this.ui.hud.setStyle(sr.letter, t(sr.key), this.style.progress, this.style.points > 1, this.style.rankIndex);
    if (this.sandbox) {
      for (const k of Object.keys(p.ammo) as AmmoType[]) p.ammo[k] = AMMO_MAX[k];
      this.ui.hud.inspect(this.inspectTarget());
    }
    if (this.data.id === 'battle' && !p.dead && input.pressed('shop')) this.hooks.openBattleMenu();
    this.gunStrikeT -= dt;
    if (this.gunStrikeT <= 0) this.gunStrikeTarget = null;
    this.ui.hud.prompt(this.ability.slamReady ? t('jump.prompt') : this.gunStrikeTarget ? t('gunstrike.prompt') : this.gloryTarget() ? t('glory.prompt') : this.parryWarning() ? t('parry.prompt') : null);
    this.dashFov = Math.max(0, this.dashFov - dt * 5);
    this.camera.fov = this.baseFov * (1 - 0.72 * this.zoom) * (1 + 0.08 * this.dashFov);

    // camera
    const eye = p.eye;
    this.camera.position.copyFrom(eye);
    // sanitize: any NaN from a degenerate push/normalize must never reach the camera
    if (!Number.isFinite(p.yaw)) p.yaw = 0;
    if (!Number.isFinite(p.pitch)) p.pitch = 0;
    if (!Number.isFinite(p.roll) || (!p.dead && Math.abs(p.roll) > 0.05)) p.roll = 0;
    if (!Number.isFinite(p.recoil)) p.recoil = 0;
    if (!Number.isFinite(p.vel.x) || !Number.isFinite(p.vel.y) || !Number.isFinite(p.vel.z)) p.vel.set(0, 0, 0);
    this.camera.rotation.x = p.pitch - p.recoil + this.shake.pitch;
    this.camera.rotation.y = p.yaw + this.shake.yaw;
    this.camera.rotation.z = (p.dead ? p.roll : 0) + this.shake.roll;
    this.lights.update(dt, eye);
    this.decals.flush();
    const fwd = p.forward;
    this.audio.setListener(eye, fwd);

    this.drawSprites();
    this.syncHud();
    const light = this.lightAt(p.pos.x, p.pos.z);
    const bright = 0.45 + (light[0] + light[1] + light[2]) / 3 * 0.9;
    this.weapons.draw(this.ui.viewModel, this, bright);
    this.ui.hud.face.firing(dt, this.weapons.holdTime > 0);
    this.ui.hud.face.update(dt, p.health, p.dead);
    this.ui.hud.update(dt);
    this.post.update(dt, p.health < 25 && !p.dead ? (25 - p.health) / 25 : 0);
    this.ui.debug.update(dt, () => this.debugLines());

    if (p.dead && !this.deathNotified && p.deathTime > 1.6) {
      this.deathNotified = true;
      this.hooks.onDeath();
    }
  }

  /** Keeps idle frames rendering (pause / death screen backgrounds). */
  idle(dt: number): void {
    this.lights.update(dt, this.camera.position);
    if (this.player.dead) {
      this.player.deathTime += dt;
      this.camera.position.copyFrom(this.player.eye);
      for (const e of this.enemies) updateEnemy(e, dt, this);
      this.drawSprites();
    }
  }

  private separate(): void {
    const p = this.player;
    const es = this.enemies;
    for (let i = 0; i < es.length; i++) {
      const a = es[i];
      if (!a.solid) continue;
      // player vs enemy
      const dx = p.pos.x - a.pos.x, dz = p.pos.z - a.pos.z;
      const md = p.radius + a.radius;
      const d2 = dx * dx + dz * dz;
      if (d2 < md * md && !p.dead && !p.noclip && Math.abs(p.pos.y - a.pos.y) < 1.5) {
        const d = Math.sqrt(d2) || 0.01;
        const push = (md - d) / d;
        p.pos.x += dx * push * 0.7;
        p.pos.z += dz * push * 0.7;
        a.pos.x -= dx * push * 0.3;
        a.pos.z -= dz * push * 0.3;
        this.world.resolve(p, PLAYER.stepHeight);
      }
      for (let j = i + 1; j < es.length; j++) {
        const b = es[j];
        if (!b.solid) continue;
        const ex = b.pos.x - a.pos.x, ez = b.pos.z - a.pos.z;
        const mr = a.radius + b.radius;
        const e2 = ex * ex + ez * ez;
        if (e2 < mr * mr && e2 > 1e-6) {
          const d = Math.sqrt(e2);
          const push = ((mr - d) / d) * 0.5;
          a.pos.x -= ex * push;
          a.pos.z -= ez * push;
          b.pos.x += ex * push;
          b.pos.z += ez * push;
        }
      }
      this.world.resolve(a, 0.62);
    }
  }

  private updatePickups(): void {
    const p = this.player;
    if (p.dead) return;
    for (const k of this.pickups) {
      if (k.taken) continue;
      const dx = k.pos.x - p.pos.x, dz = k.pos.z - p.pos.z;
      if (dx * dx + dz * dz > 1.25 * 1.25 || Math.abs(k.pos.y - p.pos.y) > 1.3) continue;
      const r = applyPickup(k.kind, p, this.diff.ammo);
      if (!r) continue;
      k.taken = true;
      if (k.counts) this.items++;
      this.sound(r.sound);
      this.ui.hud.message(t(r.msg));
      this.ui.hud.flash('gold', 0.35);
      if (r.weapon) {
        this.ui.hud.face.pickupWeapon();
        this.weapons.request(r.weapon as WeaponId, this);
      }
      if (k.id) this.triggers.pickup(k.id);
    }
  }

  private checkSecrets(): void {
    const g = this.built.grid;
    const ci = g.cellAt(this.player.pos.x, this.player.pos.z);
    if (ci < 0) return;
    const cx = ci % g.w, cy = Math.floor(ci / g.w);
    for (const s of this.data.secrets) {
      if (this.secrets.has(s.id) || !g.inRect(s.rect, cx, cy)) continue;
      this.secrets.add(s.id);
      this.ui.hud.message(t('msg.secret'));
      this.ui.hud.flash('gold', 0.5);
      this.sound('secret_found');
      this.hooks.voice('v_secret');
    }
  }

  private updateBoss(): void {
    if (this.siege) this.boss = this.enemies.find((e) => e.def.bossName && (e.alive || e.deathT < 1.5)) ?? null;
    const b = this.boss;
    const show = !!b && b.state !== 'dormant' && b.state !== 'idle' && (b.alive || b.deathT < 1.5);
    if (show && b) this.ui.hud.setBoss(b.def.bossName!, b.hp / b.maxHp);
    else if (this.bossShown) this.ui.hud.setBoss(null, 0);
    this.bossShown = show;
  }

  /** Calm pad while exploring, the full band once something is hunting you. */
  private updateMusic(dt: number): void {
    if (this.siege) return; // siege drives its own intensity
    const p = this.player;
    const hunting = !p.dead && this.enemies.some((e) => (e.state === 'chase' || e.state === 'attack') && Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) < 45);
    if (hunting) this.combatHold = 5;
    else this.combatHold -= dt;
    this.audio.music.setIntensity(this.completed || p.dead ? 'calm' : this.combatHold > 0 ? 'combat' : 'calm');
  }

  private checkWaves(): void {
    for (const id of this.waves) {
      if (this.wavesCleared.has(id)) continue;
      const members = this.enemies.filter((e) => e.wave === id);
      if (members.every((e) => !e.alive && e.state !== 'dormant')) {
        this.wavesCleared.add(id);
        this.triggers.waveCleared(id);
      }
    }
  }

  private drawSprites(): void {
    const cam = this.camera;
    const m = cam.getWorldMatrix();
    const right = Vector3.TransformNormal(new Vector3(1, 0, 0), m);
    const up = Vector3.TransformNormal(new Vector3(0, 1, 0), m);
    const fwd = Vector3.TransformNormal(new Vector3(0, 0, 1), m);
    const b = this.batch;
    b.begin(right, up, fwd);
    const L = (x: number, z: number, boost = 0): [number, number, number] => {
      const l = sampleLightGrid(this.built.grid, this.built.lightGrid, x, z, this.tmpLight);
      return [l[0] + boost, l[1] + boost, l[2] + boost];
    };
    for (const e of this.enemies) {
      if (e.state === 'dormant') continue;
      const f = SPRITES[e.frame()];
      if (!f) continue;
      let l = L(e.pos.x, e.pos.z);
      if (e.painFlash > 0) l = [l[0] * 1.8 + 0.5, l[1] * 1.4 + 0.25, l[2] * 1.4 + 0.25];
      if (e.parryTell > 0 && e.alive) {
        const k = 0.6 + 0.4 * Math.sin(this.elapsed * 30);
        l = [l[0] * 0.6 + 0.2, l[1] * 0.8 + 0.5 * k, l[2] + 1.2 * k];
      } else if (e.dangerTell > 0 && e.alive) {
        const k = 0.6 + 0.4 * Math.sin(this.elapsed * 30);
        l = [l[0] + 1.3 * k, l[1] * 0.5, l[2] * 0.5];
      } else if (e.staggerT > 0 && e.alive) {
        const k = 0.5 + 0.5 * Math.sin(this.elapsed * 14);
        l = [l[0] + 0.9 * k + 0.3, l[1] + 0.45 * k + 0.1, l[2] * 0.6];
      }
      let flip = false;
      if (e.moving) flip = Math.sin(e.yaw) * right.x + Math.cos(e.yaw) * right.z < -0.2;
      b.add(f, e.pos.x, e.pos.y, e.pos.z, l, { flip, depthBias: e.state === 'dead' ? 0.05 : 0.15 });
    }
    for (const k of this.pickups) {
      if (k.taken) continue;
      const f = SPRITES[k.kind];
      if (!f) continue;
      k.phase += 0.016;
      const bob = Math.sin(this.elapsed * 3 + k.phase) * 0.06 + 0.06;
      b.add(f, k.pos.x, k.pos.y + bob, k.pos.z, L(k.pos.x, k.pos.z, 0.12), { scale: PICKUP_SCALE[k.kind] ?? 1 });
    }
    for (const bar of this.barrels) if (!bar.exploded) b.add(SPRITES.barrel, bar.pos.x, bar.pos.y, bar.pos.z, L(bar.pos.x, bar.pos.z));
    for (const pr of this.props) {
      const f = SPRITES[pr.kind];
      if (f) b.add(f, pr.pos.x, pr.pos.y, pr.pos.z, L(pr.pos.x, pr.pos.z), { scale: pr.kind === 'lamp' ? 1 : 1 });
    }
    for (const tf of this.telefogs) {
      const fr = SPRITES[`telefog${Math.min(3, Math.floor(tf.t / 0.12))}`];
      b.add(fr, tf.pos.x, tf.pos.y, tf.pos.z, [1, 1, 1], { depthBias: 0.4 });
    }
    for (const e of this.enemies) {
      if (!(e instanceof Sorcerer) || !e.alive) continue;
      if (e.shieldHp > 0 || e.isBound) {
        const k = Math.floor(this.elapsed * 8) % 2;
        b.add(SPRITES['shield' + k], e.pos.x, e.pos.y + e.height * 0.5, e.pos.z, e.isBound ? [1.4, 0.4, 0.4] : [1, 1, 1], { full: true, scale: 1.25, depthBias: 0.3 });
      }
      const fx = e.beamFx;
      if (fx) {
        const seg = fx.to.subtract(fx.from);
        const len = seg.length();
        const n = Math.min(120, Math.ceil(len / (fx.red ? 0.9 : 0.45)));
        for (let i = 0; i <= n; i++) {
          const q = fx.from.add(seg.scale(i / n));
          b.add(SPRITES[fx.red ? 'beamRed' : 'beam'], q.x, q.y, q.z, [1, 1, 1], { full: true, scale: fx.red ? 0.6 : 1.4, depthBias: 0.2 });
        }
      }
    }
    for (const h of this.hazards) {
      const k = Math.min(2, Math.floor((h.t / h.delay) * 3));
      b.add(SPRITES['erupt' + k], h.pos.x, h.pos.y + 0.25, h.pos.z, [1, 1, 1], { full: true, scale: h.radius * 0.9, depthBias: 0.3 });
    }
    if (this.laserPoint) {
      const lp = this.laserPoint;
      b.add(SPRITES.beamRed, lp.x, lp.y, lp.z, [1.8, 1.8, 1.8], { full: true, scale: 0.7, depthBias: 0.4 });
      const p = this.player;
      const right = new Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
      const from = p.eye.add(p.forward.scale(0.8)).add(right.scale(0.2)).add(new Vector3(0, -0.2, 0));
      const seg = lp.subtract(from);
      const n = Math.min(110, Math.ceil(seg.length() / 0.7));
      for (let i = 1; i < n; i++) {
        const q = from.add(seg.scale(i / n));
        b.add(SPRITES.beamRed, q.x, q.y, q.z, [1.3, 1.3, 1.3], { full: true, scale: 0.12, depthBias: 0.2 });
      }
    }
    if (this.playerBeamFx) {
      const fx = this.playerBeamFx;
      const seg = fx.to.subtract(fx.from);
      const n = Math.min(160, Math.ceil(seg.length() / 0.5));
      const w = 0.4 + fx.t * 2.4;
      for (let i = 0; i <= n; i++) {
        const q = fx.from.add(seg.scale(i / n));
        b.add(SPRITES.beam, q.x, q.y, q.z, [1, 1, 1], { full: true, scale: w, depthBias: 0.2 });
      }
    }
    this.projectiles.draw(b);
    this.grenades.draw(b, this);
    this.ability.draw(b);
    this.rockets.draw(b);
    this.debris.draw(b, (x, z) => L(x, z));
    b.end();
  }

  syncHud(): void {
    const p = this.player;
    const hud = this.ui.hud;
    hud.setHealth(p.health);
    hud.setArmor(p.armor);
    const at = this.weapons.ammoType;
    hud.setAmmo(at ? p.ammo[at] : null);
    const used = new Set<AmmoType>(['grenades']);
    for (const w of p.weapons) {
      const a = this.weapons.weapons[w].ammo;
      if (a) used.add(a);
    }
    hud.setReserves(p.ammo, AMMO_MAX, at, used);
    hud.setArms(p.weapons, this.weapons.current);
    hud.setKeys(p.keys);
  }

  private debugLines(): string[] {
    const p = this.player;
    const g = this.built.grid;
    const ci = g.cellAt(p.pos.x, p.pos.z);
    const alive = this.enemies.filter((e) => e.alive).length;
    return [
      `FPS ${this.engine.getFps().toFixed(0)}  scale ${this.engine.getHardwareScalingLevel()}`,
      `pos ${p.pos.x.toFixed(2)} ${p.pos.y.toFixed(2)} ${p.pos.z.toFixed(2)}  cell ${ci % g.w},${Math.floor(ci / g.w)}`,
      `yaw ${((p.yaw * 180) / Math.PI).toFixed(0)}°  pitch ${((p.pitch * 180) / Math.PI).toFixed(0)}°  ground ${p.onGround}`,
      `enemies ${alive}/${this.enemies.length}  kills ${this.kills}/${this.totalKills}`,
      `items ${this.items}/${this.totalItems}  secrets ${this.secrets.size}/${this.data.secrets.length}`,
      `sprites ${this.batch.size}  meshes ${this.scene.getActiveMeshes().length}  fxLights ${this.lights.fxCount}`,
      `noclip ${p.noclip ? 'ON' : 'off'}  waves ${[...this.waves].join(',') || '-'}`,
      `audio files ${this.audio.stats.files} proc ${this.audio.stats.procedural} voice ${this.audio.stats.voiceFiles}`,
    ];
  }

  stopAudio(): void {
    this.loops.forEach((l) => l.stop(0.3));
    this.loops = [];
    this.liftLoops.forEach((l) => l.stop(0.1));
    this.projectiles.clear();
    this.rockets.clear();
    this.laserOn = false;
    this.weapons.weapon.deselect(this);
    this.audio.stopWorldSounds();
  }

  /** Clears any leftover roll / shake (e.g. after a pause or a menu). */
  resetCamera(): void {
    this.player.roll = 0;
    this.player.recoil = 0;
    this.shake.reset();
    this.camera.rotation.z = 0;
  }

  dispose(): void {
    this.stopAudio();
    this.post?.dispose();
    this.particles?.dispose();
    this.scene.dispose();
  }

  render(): void {
    this.scene.render();
  }

  // ------------------------------------------------------------------ debug hooks
  debugTeleport(cx: number, cy: number): void {
    this.player.pos.set(cx * CELL, 0, cy * CELL);
    this.player.pos.y = this.world.groundAt(this.player.pos.x, this.player.pos.z, this.player.radius, 50, 100);
  }

  debugGiveAll(): void {
    const p = this.player;
    p.weapons = new Set(['pistol', 'shotgun', 'chainsword', 'sniper', 'launcher', 'bolter', 'flamer']);
    p.ammo = { bullets: 200, shells: 50, rounds: 30, rockets: 20, bolts: 180, fuel: 200, grenades: 8 };
    p.keys = new Set(['red', 'blue']);
    p.health = 100;
    p.armor = 200;
  }
}

/** Ray vs. vertical cylinder (side surface only). Returns t or null. */
function rayCylinder(o: Vector3, d: Vector3, cx: number, cz: number, r: number, y0: number, y1: number, maxT: number): number | null {
  const ox = o.x - cx, oz = o.z - cz;
  const a = d.x * d.x + d.z * d.z;
  if (a < 1e-9) return null;
  const b = 2 * (ox * d.x + oz * d.z);
  const c = ox * ox + oz * oz - r * r;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  let tt = (-b - sq) / (2 * a);
  if (tt < 0) tt = c < 0 ? 0 : (-b + sq) / (2 * a);
  if (tt < 0 || tt > maxT) return null;
  const y = o.y + d.y * tt;
  if (y < y0 || y > y1) return null;
  return tt;
}
