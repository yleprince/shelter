import Phaser from 'phaser';
import { GAME_WIDTH, HUD_ROWS, TILE_SIZE, TOWER_COST } from '../config';
import type { GameScene } from './GameScene';

const HUD_HEIGHT = HUD_ROWS * TILE_SIZE;
const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '16px',
  color: '#e0d6b8',
};

export class UIScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private statsText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private nextWaveButton!: Phaser.GameObjects.Text;

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.gameScene = this.scene.get('GameScene') as GameScene;

    this.add.rectangle(0, 0, GAME_WIDTH, HUD_HEIGHT, 0x111111, 0.85).setOrigin(0);
    this.statsText = this.add.text(12, HUD_HEIGHT / 2, '', TEXT_STYLE).setOrigin(0, 0.5);
    this.waveText = this.add.text(GAME_WIDTH - 160, HUD_HEIGHT / 2, '', TEXT_STYLE).setOrigin(1, 0.5);

    this.nextWaveButton = this.add
      .text(GAME_WIDTH - 12, HUD_HEIGHT / 2, 'Next wave ▶', {
        ...TEXT_STYLE,
        backgroundColor: '#6b5b45',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.gameScene.waves.skipBreather());
  }

  override update(): void {
    const { economy, shelter, score, waves } = this.gameScene;
    this.statsText.setText(
      `Scrap ${economy.balance}  (turret ${TOWER_COST})   ` +
        `Shelter ${shelter.hp}/${shelter.maxHp}   ` +
        `Kills ${score.kills}   Time ${formatTime(score.survivalSeconds)}`,
    );
    const inBreather = waves.phase === 'breather';
    this.waveText.setText(
      inBreather ? `Wave ${waves.wave + 1} in ${waves.breatherSecondsLeft}s` : `Wave ${waves.wave}`,
    );
    this.nextWaveButton.setVisible(inBreather);
  }
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
