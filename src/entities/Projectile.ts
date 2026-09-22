import Phaser from 'phaser';
import { PROJECTILE_HIT_RADIUS, PROJECTILE_SPEED } from '../config';
import { DEPTH, TEXTURES } from '../data/textures';
import type { Enemy } from './Enemy';

export type ProjectileState = 'flying' | 'hit' | 'expired';

export class Projectile {
  private readonly sprite: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly target: Enemy,
    readonly damage: number,
  ) {
    this.sprite = scene.add.image(x, y, TEXTURES.projectile).setDepth(DEPTH.projectile);
  }

  update(deltaMs: number): ProjectileState {
    // Homing: if the target already died, the shot fizzles instead of wandering the map.
    if (!this.target.isAlive) return 'expired';
    const dx = this.target.x - this.sprite.x;
    const dy = this.target.y - this.sprite.y;
    const dist = Math.hypot(dx, dy);
    const step = (PROJECTILE_SPEED * deltaMs) / 1000;
    if (dist <= Math.max(step, PROJECTILE_HIT_RADIUS)) return 'hit';
    this.sprite.x += (dx / dist) * step;
    this.sprite.y += (dy / dist) * step;
    return 'flying';
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
