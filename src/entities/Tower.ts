import Phaser from 'phaser';
import type { TileCoord } from '../data/maps';
import { DEPTH, TEXTURES, TOWER_GUN_TEXTURES } from '../data/textures';
import type { Economy } from '../systems/Economy';
import { TowerProgress } from '../systems/TowerProgress';
import type { Enemy } from './Enemy';

export type FireHandler = (tower: Tower, target: Enemy) => void;

// Small enough that a Lv8 base still fits its tile.
const BASE_SCALE_PER_LEVEL = 0.035;
const BASE_TINTS = [0xffffff, 0xd8e8ff, 0xb8f0c0, 0xffd89a, 0xff9a9a, 0x9ae0ff, 0xe0a8ff, 0xfff2a8];

export class Tower {
  readonly progress = new TowerProgress();
  private cooldownMs = 0;
  private readonly base: Phaser.GameObjects.Image;
  private readonly gun: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    readonly tile: TileCoord,
    readonly x: number,
    readonly y: number,
  ) {
    this.base = scene.add.image(x, y, TEXTURES.towerBase).setDepth(DEPTH.tower);
    this.gun = scene.add.image(x, y, TOWER_GUN_TEXTURES[0]).setDepth(DEPTH.tower);
  }

  get damage(): number {
    return this.progress.stats.damage;
  }

  get range(): number {
    return this.progress.stats.range;
  }

  upgrade(wave: number, economy: Economy): boolean {
    if (!this.progress.upgrade(wave, economy)) return false;
    this.refreshLook();
    return true;
  }

  maxUpgrade(wave: number, economy: Economy): boolean {
    if (!this.progress.maxUpgrade(wave, economy)) return false;
    this.refreshLook();
    return true;
  }

  update(deltaMs: number, enemies: readonly Enemy[], fire: FireHandler): void {
    this.cooldownMs = Math.max(0, this.cooldownMs - deltaMs);
    const target = this.findTarget(enemies);
    if (!target) return;
    this.gun.setRotation(Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y));
    if (this.cooldownMs > 0) return;
    this.cooldownMs = this.progress.stats.cooldownMs;
    fire(this, target);
  }

  destroy(): void {
    this.base.destroy();
    this.gun.destroy();
  }

  private refreshLook(): void {
    const levelIndex = this.progress.level - 1;
    this.gun.setTexture(TOWER_GUN_TEXTURES[levelIndex]);
    this.base.setScale(1 + levelIndex * BASE_SCALE_PER_LEVEL).setTint(BASE_TINTS[levelIndex]);
  }

  private findTarget(enemies: readonly Enemy[]): Enemy | undefined {
    let nearest: Enemy | undefined;
    let nearestDist = this.range;
    for (const enemy of enemies) {
      if (!enemy.isAlive) continue;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
      if (dist <= nearestDist) {
        nearest = enemy;
        nearestDist = dist;
      }
    }
    return nearest;
  }
}
