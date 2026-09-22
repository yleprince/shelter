import Phaser from 'phaser';
import { SHELTER_MAX_HP } from '../config';
import { DEPTH, TEXTURES } from '../data/textures';

const HIT_FLASH_MS = 120;

export class Shelter {
  readonly maxHp = SHELTER_MAX_HP;
  private currentHp = SHELTER_MAX_HP;
  private readonly sprite: Phaser.GameObjects.Image;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
  ) {
    this.sprite = scene.add.image(x, y, TEXTURES.shelter).setDepth(DEPTH.shelter);
  }

  get hp(): number {
    return this.currentHp;
  }

  get isDestroyed(): boolean {
    return this.currentHp <= 0;
  }

  takeDamage(amount: number): void {
    this.currentHp = Math.max(0, this.currentHp - amount);
    this.sprite.setTint(0xff6666);
    this.scene.time.delayedCall(HIT_FLASH_MS, () => this.sprite.clearTint());
  }
}
