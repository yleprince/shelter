import Phaser from 'phaser';
import { ENEMY_CONTACT_DAMAGE } from '../config';
import { DEPTH, TEXTURES } from '../data/textures';
import type { Point } from '../systems/MapGrid';
import { PathFollower } from '../systems/PathFollower';
import type { WaveStats } from '../systems/WaveManager';

const HP_BAR_WIDTH = 24;
const HP_BAR_HEIGHT = 4;
const HP_BAR_OFFSET_Y = 18;

export class Enemy {
  readonly damage = ENEMY_CONTACT_DAMAGE;
  readonly maxHp: number;
  private hp: number;
  private readonly speed: number;
  private readonly follower: PathFollower;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly hpBar: Phaser.GameObjects.Graphics;
  private destroyed = false;

  constructor(scene: Phaser.Scene, waypoints: readonly Point[], stats: WaveStats) {
    this.maxHp = stats.enemyHp;
    this.hp = stats.enemyHp;
    this.speed = stats.enemySpeed;
    this.follower = new PathFollower(waypoints);
    this.sprite = scene.add.image(this.x, this.y, TEXTURES.enemy).setDepth(DEPTH.enemy);
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
    this.render();
  }

  // Returns true if this hit killed the enemy.
  takeDamage(amount: number): boolean {
    if (!this.isAlive) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.render();
    return this.hp === 0;
  }

  destroy(): void {
    this.destroyed = true;
    this.sprite.destroy();
    this.hpBar.destroy();
  }

  private render(): void {
    this.sprite.setPosition(this.x, this.y);
    this.hpBar.clear();
    const left = this.x - HP_BAR_WIDTH / 2;
    const top = this.y - HP_BAR_OFFSET_Y;
    this.hpBar.fillStyle(0x000000, 0.6).fillRect(left, top, HP_BAR_WIDTH, HP_BAR_HEIGHT);
    this.hpBar
      .fillStyle(0xd94c3d)
      .fillRect(left, top, HP_BAR_WIDTH * (this.hp / this.maxHp), HP_BAR_HEIGHT);
  }
}
