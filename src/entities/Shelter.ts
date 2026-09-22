import Phaser from 'phaser';
import { DEPTH, SHELTER_TEXTURES } from '../data/textures';
import type { Economy } from '../systems/Economy';
import { ShelterHealth } from '../systems/ShelterHealth';

const HIT_FLASH_MS = 120;
const REPAIR_TINT = 0x88ff88;

export class Shelter {
  readonly health = new ShelterHealth();
  private readonly sprite: Phaser.GameObjects.Image;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
  ) {
    this.sprite = scene.add.image(x, y, SHELTER_TEXTURES[0]).setDepth(DEPTH.shelter);
  }

  get hp(): number {
    return this.health.hp;
  }

  get maxHp(): number {
    return this.health.maxHp;
  }

  get level(): number {
    return this.health.level;
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
    this.flash(REPAIR_TINT);
    return true;
  }

  tryUpgrade(wave: number, economy: Economy): boolean {
    if (!this.health.tryUpgrade(wave, economy)) return false;
    this.onUpgraded();
    return true;
  }

  maxUpgrade(wave: number, economy: Economy): boolean {
    if (!this.health.maxUpgrade(wave, economy)) return false;
    this.onUpgraded();
    return true;
  }

  private onUpgraded(): void {
    this.sprite.setTexture(SHELTER_TEXTURES[this.level - 1]);
    this.flash(REPAIR_TINT);
  }

  private flash(tint: number): void {
    this.sprite.setTint(tint);
    this.scene.time.delayedCall(HIT_FLASH_MS, () => this.sprite.clearTint());
  }
}
