import Phaser from 'phaser';
import type { EnemyKind } from '../data/enemyTiers';
import { DEPTH, ENEMY_TEXTURES } from '../data/textures';
import type { Point } from '../systems/MapGrid';
import { PathFollower } from '../systems/PathFollower';
import type { EnemySpec } from '../systems/WaveComposer';

const HP_BAR_HEIGHT = 4;
const HP_BAR_GAP = 6;

export class Enemy {
  readonly kind: EnemyKind;
  readonly damage: number;
  readonly reward: number;
  readonly maxHp: number;
  private hp: number;
  private readonly speed: number;
  private readonly follower: PathFollower;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly hpBar: Phaser.GameObjects.Graphics;
  private destroyed = false;

  constructor(scene: Phaser.Scene, waypoints: readonly Point[], spec: EnemySpec) {
    this.kind = spec.kind;
    this.damage = spec.damage;
    this.reward = spec.reward;
    this.maxHp = spec.hp;
    this.hp = spec.hp;
    this.speed = spec.speed;
    this.follower = new PathFollower(waypoints);
    this.sprite = scene.add.image(this.x, this.y, ENEMY_TEXTURES[spec.kind]).setDepth(DEPTH.enemy);
    this.hpBar = scene.add.graphics().setDepth(DEPTH.enemy);
    this.render();
  }

  get x(): number {
    return this.follower.x;
  }

  get y(): number {
    return this.follower.y;
  }

  get isAlive(): boolean {
    return this.hp > 0 && !this.destroyed;
  }

  get reachedEnd(): boolean {
    return this.follower.reachedEnd;
  }

  update(deltaMs: number): void {
    this.follower.advance((this.speed * deltaMs) / 1000);
  }

  // Returns true if this hit killed the enemy.
  takeDamage(amount: number): boolean {
    if (!this.isAlive) return false;
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
    this.hpBar.clear();
    const width = this.sprite.width;
    const left = this.x - width / 2;
    const top = this.y - this.sprite.height / 2 - HP_BAR_GAP;
    this.hpBar.fillStyle(0x000000, 0.6).fillRect(left, top, width, HP_BAR_HEIGHT);
    this.hpBar.fillStyle(0xd94c3d).fillRect(left, top, width * (this.hp / this.maxHp), HP_BAR_HEIGHT);
  }
}
