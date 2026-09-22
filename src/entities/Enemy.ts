import Phaser from 'phaser';
import type { EnemyKind } from '../data/enemyTiers';
import type { TileCoord } from '../data/maps';
import { DEPTH, ENEMY_TEXTURES } from '../data/textures';
import { armoredDamage, terrainSpeedMultiplier } from '../systems/EnemyTraits';
import type { Point, TileType } from '../systems/MapGrid';
import { TileFollower, type TileNavigator } from '../systems/TileFollower';
import type { EnemySpec } from '../systems/WaveComposer';

const HP_BAR_HEIGHT = 4;
const HP_BAR_GAP = 6;
const BURN_TINT = 0xff8c3a;
// Keeps the tint on a moment after leaving fire, so a quick crossing still shows.
const BURN_TINT_MS = 150;

export interface EnemyNavigator extends TileNavigator {
  worldToTile(point: Point): TileCoord;
  // undefined off-map, e.g. during the walk in from the edge.
  tileTypeAt(point: Point): TileType | undefined;
}

export class Enemy {
  readonly kind: EnemyKind;
  readonly damage: number;
  readonly reward: number;
  readonly maxHp: number;
  readonly splitsInto: readonly EnemySpec[];
  private hp: number;
  private readonly speed: number;
  private readonly armor: number;
  private readonly ignoresGravel: boolean;
  private readonly follower: TileFollower;
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
    this.armor = spec.armor ?? 0;
    this.ignoresGravel = spec.ignoresGravel ?? false;
    this.splitsInto = spec.splitsInto ?? [];
    this.follower = new TileFollower(start, target, nav);
    this.sprite = scene.add
      .image(this.x, this.y, ENEMY_TEXTURES[spec.kind])
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

  get isAlive(): boolean {
    return this.hp > 0 && !this.destroyed;
  }

  get reachedEnd(): boolean {
    return this.follower.reachedEnd;
  }

  update(deltaMs: number): void {
    this.burnTintMs = Math.max(0, this.burnTintMs - deltaMs);
    const terrain = terrainSpeedMultiplier(this.nav.tileTypeAt(this.follower), this.ignoresGravel);
    this.follower.advance((this.speed * terrain * deltaMs) / 1000);
  }

  advanceBy(distance: number): void {
    this.follower.advance(distance);
  }

  // Returns true if this hit killed the enemy.
  takeDamage(amount: number): boolean {
    if (!this.isAlive) return false;
    this.hp = Math.max(0, this.hp - armoredDamage(amount, this.armor));
    return this.hp === 0;
  }

  // Terrain damage: skips armor, which is meant for per-hit damage. Returns true if it killed.
  burn(amount: number): boolean {
    if (!this.isAlive || amount <= 0) return false;
    this.burnTintMs = BURN_TINT_MS;
    this.hp = Math.max(0, this.hp - amount);
    return this.hp === 0;
  }

  destroy(): void {
    this.destroyed = true;
    this.sprite.destroy();
    this.hpBar.destroy();
  }

  render(): void {
    this.sprite.setPosition(this.x, this.y);
    if (this.burnTintMs > 0) this.sprite.setTint(BURN_TINT);
    else this.sprite.clearTint();
    this.hpBar.clear();
    const width = this.sprite.displayWidth;
    const left = this.x - width / 2;
    const top = this.y - this.sprite.displayHeight / 2 - HP_BAR_GAP;
    this.hpBar.fillStyle(0x000000, 0.6).fillRect(left, top, width, HP_BAR_HEIGHT);
    this.hpBar.fillStyle(0xd94c3d).fillRect(left, top, width * (this.hp / this.maxHp), HP_BAR_HEIGHT);
  }
}
