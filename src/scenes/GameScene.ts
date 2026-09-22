import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create(): void {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Shelter', { fontSize: '48px', color: '#e0d6b8' })
      .setOrigin(0.5);
    this.scene.launch('UIScene');
  }
}
