import Phaser from 'phaser';
import { SHELTER_MAX_HP } from '../config';
import { DEPTH, TEXTURES } from '../data/textures';
import type { Economy } from '../systems/Economy';
import { ShelterHealth } from '../systems/ShelterHealth';

const HIT_FLASH_MS = 120;

export class Shelter {
  readonly health = new ShelterHealth(SHELTER_MAX_HP);
  private readonly sprite: Phaser.GameObjects.Image;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
  ) {
    this.sprite = scene.add.image(x, y, TEXTURES.shelter).setDepth(DEPTH.shelter);
  }

  get hp(): number {
    return this.health.hp;
  }

  get maxHp(): number {
    return this.health.maxHp;
  }

  get isDestroyed(): boolean {
    return this.health.isDestroyed;
  }

  takeDamage(amount: number): void {
    this.health.takeDamage(amount);
    this.flash(0xff6666);
  }

  tryRepair(wave: number, economy: Economy): boolean {
    if (!this.health.tryRepair(wave, economy)) return false;
    this.flash(0x88ff88);
    return true;
  }

  private flash(tint: number): void {
    this.sprite.setTint(tint);
    this.scene.time.delayedCall(HIT_FLASH_MS, () => this.sprite.clearTint());
  }
}
