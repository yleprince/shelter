import Phaser from 'phaser';
import { PROJECTILE_HIT_RADIUS, PROJECTILE_SPEED } from '../config';
import { DEPTH, TEXTURES } from '../data/textures';
import type { Enemy } from './Enemy';

export type ProjectileState = 'flying' | 'hit' | 'expired';

export class Projectile {
  private readonly sprite: Phaser.GameObjects.Image;
  private x: number;
  private y: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly target: Enemy,
    readonly damage: number,
  ) {
    this.x = x;
    this.y = y;
    this.sprite = scene.add.image(x, y, TEXTURES.projectile).setDepth(DEPTH.projectile);
  }

  update(deltaMs: number): ProjectileState {
    // Homing: if the target already died, the shot fizzles instead of wandering the map.
    if (!this.target.isAlive) return 'expired';
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = (PROJECTILE_SPEED * deltaMs) / 1000;
    // A target that burrowed or went dormant mid-flight makes the shot miss.
    if (dist <= Math.max(step, PROJECTILE_HIT_RADIUS)) return this.target.targetable ? 'hit' : 'expired';
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    return 'flying';
  }

  render(): void {
    this.sprite.setPosition(this.x, this.y);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
