import Phaser from 'phaser';
import { TOWER_DAMAGE, TOWER_FIRE_COOLDOWN_MS, TOWER_RANGE } from '../config';
import { DEPTH, TEXTURES } from '../data/textures';
import type { Enemy } from './Enemy';

export type FireHandler = (tower: Tower, target: Enemy) => void;

export class Tower {
  readonly damage = TOWER_DAMAGE;
  readonly range = TOWER_RANGE;
  private cooldownMs = 0;
  private readonly gun: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    readonly x: number,
    readonly y: number,
  ) {
    scene.add.image(x, y, TEXTURES.towerBase).setDepth(DEPTH.tower);
    this.gun = scene.add.image(x, y, TEXTURES.towerGun).setDepth(DEPTH.tower);
  }

  update(deltaMs: number, enemies: readonly Enemy[], fire: FireHandler): void {
    this.cooldownMs = Math.max(0, this.cooldownMs - deltaMs);
    const target = this.findTarget(enemies);
    if (!target) return;
    this.gun.setRotation(Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y));
    if (this.cooldownMs > 0) return;
    this.cooldownMs = TOWER_FIRE_COOLDOWN_MS;
    fire(this, target);
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
