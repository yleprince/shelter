import Phaser from 'phaser';
import type { EnemyKind } from '../data/enemyTiers';
import type { TileCoord } from '../data/maps';
import type { HealAura, JamAura, ReviveTrait, WarAura } from '../data/specialEnemies';
import { DEPTH, ENEMY_TEXTURES, TEXTURES } from '../data/textures';
import type { AuraEnemy } from '../systems/Auras';
import { BurrowCycle } from '../systems/BurrowCycle';
import { armoredDamage, damageTaken, terrainSpeedMultiplier } from '../systems/EnemyTraits';
import type { Point, TileType } from '../systems/MapGrid';
import { SpawnerTimer } from '../systems/SpawnerTimer';
import { TileFollower, type TileNavigator } from '../systems/TileFollower';
import type { EnemySpec } from '../systems/WaveComposer';

const HP_BAR_HEIGHT = 4;
const HP_BAR_GAP = 6;
const BURN_TINT = 0xff8c3a;
// Keeps the tint on a moment after leaving fire, so a quick crossing still shows.
const BURN_TINT_MS = 150;
const EMBER_TINT = 0xff5a1f;
const EMBER_ALPHA = 0.45;
const AURA_COLORS = { heal: 0x7fd46b, jam: 0x9ae0ff, war: 0xff6b5b } as const;
const AURA_ALPHA = 0.18;

export interface EnemyNavigator extends TileNavigator {
  worldToTile(point: Point): TileCoord;
  // undefined off-map, e.g. during the walk in from the edge.
  tileTypeAt(point: Point): TileType | undefined;
}

export class Enemy implements AuraEnemy {
  readonly kind: EnemyKind;
  readonly damage: number;
  readonly reward: number;
  readonly maxHp: number;
  readonly boss: boolean;
  readonly fireproof: boolean;
  readonly splitsInto: readonly EnemySpec[];
  readonly healAura?: HealAura;
  readonly jamAura?: JamAura;
  readonly warAura?: WarAura;
  // Set by the aura tick: the war aura this enemy stands in, if any.
  warBuff: WarAura | undefined;
  private hp: number;
  private readonly speed: number;
  private readonly armor: number;
  private readonly slowImmune: readonly TileType[];
  private readonly burrow?: BurrowCycle;
  private readonly spawner?: { timer: SpawnerTimer; children: readonly EnemySpec[] };
  private pendingSpawns: EnemySpec[] = [];
  private revive?: ReviveTrait;
  private dormantMs = 0;
  private readonly follower: TileFollower;
  private readonly texture: string;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly hpBar: Phaser.GameObjects.Graphics;
  private destroyed = false;
  private burnTintMs = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly nav: EnemyNavigator,
    spec: EnemySpec,
    start: Point,
    target: TileCoord,
  ) {
    this.kind = spec.kind;
    this.damage = spec.damage;
    this.reward = spec.reward;
    this.maxHp = spec.hp;
    this.hp = spec.hp;
    this.speed = spec.speed;
    this.boss = spec.boss ?? false;
    this.armor = spec.armor ?? 0;
    this.slowImmune = spec.slowImmune ?? [];
    this.fireproof = spec.fireproof ?? false;
    this.splitsInto = spec.splitsInto ?? [];
    this.healAura = spec.healAura;
    this.jamAura = spec.jamAura;
    this.warAura = spec.warAura;
    this.revive = spec.revive;
    if (spec.burrow) this.burrow = new BurrowCycle(spec.burrow);
    if (spec.spawner) {
      this.spawner = { timer: new SpawnerTimer(spec.spawner.everyMs, spec.spawner.maxTimes), children: spec.spawner.children };
    }
    this.follower = new TileFollower(start, target, nav);
    this.texture = ENEMY_TEXTURES[spec.kind];
    this.sprite = scene.add
      .image(this.x, this.y, this.texture)
      .setDepth(DEPTH.enemy)
      .setScale(spec.scale ?? 1);
    this.hpBar = scene.add.graphics().setDepth(DEPTH.enemy);
    this.render();
  }

  get x(): number {
    return this.follower.x;
  }

  get y(): number {
    return this.follower.y;
  }

  get target(): TileCoord {
    return this.follower.target;
  }

  // The tile it stands on and the one it walks toward: edits must keep both walkable.
  get tiles(): TileCoord[] {
    return [this.nav.worldToTile(this.follower), this.follower.target];
  }

  // A dormant (reviving) enemy still counts as alive, so the wave isn't called cleared.
  get isAlive(): boolean {
    return !this.destroyed && (this.hp > 0 || this.dormant);
  }

  get dormant(): boolean {
    return this.dormantMs > 0;
  }

  get underground(): boolean {
    return this.burrow?.underground ?? false;
  }

  // Towers only aim at, and projectiles only hit, enemies they can reach.
  get targetable(): boolean {
    return this.isAlive && !this.dormant && !this.underground;
  }

  get reachedEnd(): boolean {
    return this.follower.reachedEnd;
  }

  update(deltaMs: number): void {
    this.burnTintMs = Math.max(0, this.burnTintMs - deltaMs);
    if (this.dormant) {
      this.dormantMs = Math.max(0, this.dormantMs - deltaMs);
      if (!this.dormant) this.rise();
      return;
    }
    this.burrow?.update(deltaMs);
    if (this.spawner) {
      const times = this.spawner.timer.update(deltaMs);
      for (let i = 0; i < times; i++) this.pendingSpawns.push(...this.spawner.children.map((child) => ({ ...child })));
    }
    const terrain = terrainSpeedMultiplier(this.nav.tileTypeAt(this.follower), this.slowImmune);
    const buff = this.warBuff?.speedMultiplier ?? 1;
    this.follower.advance((this.speed * terrain * buff * deltaMs) / 1000);
  }

  // Minions dropped since the last call; they start where this enemy stands.
  takeSpawns(): EnemySpec[] {
    const spawns = this.pendingSpawns;
    this.pendingSpawns = [];
    return spawns;
  }

  advanceBy(distance: number): void {
    this.follower.advance(distance);
  }

  heal(ratioOfMaxHp: number): void {
    if (this.hp <= 0) return;
    this.hp = Math.min(this.maxHp, this.hp + this.maxHp * ratioOfMaxHp);
  }

  // Returns true if this hit killed the enemy.
  takeDamage(amount: number): boolean {
    if (!this.targetable) return false;
    return this.lose(armoredDamage(amount, this.armor));
  }

  // Terrain damage: skips armor, which is meant for per-hit damage, and reaches burrowed
  // enemies. Returns true if it killed.
  burn(amount: number): boolean {
    if (!this.isAlive || this.dormant || amount <= 0) return false;
    this.burnTintMs = BURN_TINT_MS;
    return this.lose(amount);
  }

  destroy(): void {
    this.destroyed = true;
    this.sprite.destroy();
    this.hpBar.destroy();
  }

  render(): void {
    this.sprite.setPosition(this.x, this.y);
    const texture = this.underground ? TEXTURES.burrowMound : this.texture;
    if (this.sprite.texture.key !== texture) this.sprite.setTexture(texture);
    this.sprite.setAlpha(this.dormant ? EMBER_ALPHA : 1);
    if (this.dormant) this.sprite.setTint(EMBER_TINT);
    else if (this.burnTintMs > 0) this.sprite.setTint(BURN_TINT);
    else this.sprite.clearTint();

    const g = this.hpBar.clear();
    if (this.dormant) return;
    this.drawAura(this.healAura?.radius, AURA_COLORS.heal);
    this.drawAura(this.jamAura?.radius, AURA_COLORS.jam);
    this.drawAura(this.warAura?.radius, AURA_COLORS.war);
    if (this.underground) return;
    const width = this.sprite.displayWidth;
    const left = this.x - width / 2;
    const top = this.y - this.sprite.displayHeight / 2 - HP_BAR_GAP;
    g.fillStyle(0x000000, 0.6).fillRect(left, top, width, HP_BAR_HEIGHT);
    g.fillStyle(0xd94c3d).fillRect(left, top, width * (this.hp / this.maxHp), HP_BAR_HEIGHT);
  }

  private drawAura(radius: number | undefined, color: number): void {
    if (!radius) return;
    this.hpBar.fillStyle(color, AURA_ALPHA * 0.4).fillCircle(this.x, this.y, radius);
    this.hpBar.lineStyle(1, color, AURA_ALPHA * 2).strokeCircle(this.x, this.y, radius);
  }

  private rise(): void {
    this.hp = Math.max(1, Math.round(this.maxHp * this.revive!.hpRatio));
    this.revive = undefined;
  }

  // A reviving enemy goes dormant instead of dying: the kill only counts on its final death.
  private lose(amount: number): boolean {
    this.hp = Math.max(0, this.hp - damageTaken(amount, this.warBuff?.damageTakenMultiplier ?? 1));
    if (this.hp > 0) return false;
    if (this.revive) {
      this.dormantMs = this.revive.delayMs;
      this.warBuff = undefined;
      return false;
    }
    return true;
  }
}
