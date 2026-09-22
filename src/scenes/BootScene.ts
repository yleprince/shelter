import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {}

  create(): void {
    this.scene.start('GameScene');
  }
}
