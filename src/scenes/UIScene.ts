import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_SPEEDS, GAME_WIDTH, HUD_ROWS, SHELTER_REPAIR_AMOUNT, TILE_SIZE } from '../config';
import { TOWER_PLACE_COST } from '../data/towerLevels';
import type { Tower } from '../entities/Tower';
import { repairCost } from '../systems/ShelterHealth';
import type { GameScene } from './GameScene';

const HUD_HEIGHT = HUD_ROWS * TILE_SIZE;
const LINE_1_Y = TILE_SIZE / 2;
const LINE_2_Y = TILE_SIZE * 1.5;
const PANEL_WIDTH = 230;
const PANEL_HEIGHT = 170;
const PANEL_MARGIN = 8;
const SPEED_KEYS = ['ONE', 'TWO', 'THREE', 'FOUR'];

const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '16px',
  color: '#e0d6b8',
};
const BUTTON_BG = '#6b5b45';
const BUTTON_ACTIVE_BG = '#c9a227';
const BUTTON_DISABLED_BG = '#3a3a34';

export class UIScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private statsText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private nextWaveButton!: Phaser.GameObjects.Text;
  private repairButton!: Phaser.GameObjects.Text;
  private speedButtons: Phaser.GameObjects.Text[] = [];
  private panel!: Phaser.GameObjects.Container;
  private panelStats!: Phaser.GameObjects.Text;
  private upgradeButton!: Phaser.GameObjects.Text;
  private upgradeReason!: Phaser.GameObjects.Text;
  private sellButton!: Phaser.GameObjects.Text;

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.gameScene = this.scene.get('GameScene') as GameScene;

    // Interactive so clicks on the bar never fall through to the map below.
    this.add.rectangle(0, 0, GAME_WIDTH, HUD_HEIGHT, 0x111111, 0.85).setOrigin(0).setInteractive();
    this.statsText = this.add.text(12, LINE_1_Y, '', TEXT_STYLE).setOrigin(0, 0.5);
    this.waveText = this.add.text(GAME_WIDTH - 12, LINE_1_Y, '', TEXT_STYLE).setOrigin(1, 0.5);

    this.add.text(12, LINE_2_Y, 'Speed', TEXT_STYLE).setOrigin(0, 0.5);
    let x = 72;
    this.speedButtons = GAME_SPEEDS.map((speed, i) => {
      const button = this.makeButton(x, LINE_2_Y, `x${speed}`, () => this.gameScene.clock.setSpeedLevel(i));
      button.setOrigin(0, 0.5);
      x += button.width + 6;
      this.input.keyboard?.on(`keydown-${SPEED_KEYS[i]}`, () => this.gameScene.clock.setSpeedLevel(i));
      return button;
    });

    this.repairButton = this.makeButton(x + 24, LINE_2_Y, '', () => this.gameScene.repairShelter()).setOrigin(0, 0.5);
    this.nextWaveButton = this.makeButton(GAME_WIDTH - 12, LINE_2_Y, 'Next wave ▶', () =>
      this.gameScene.waves.skipBreather(),
    ).setOrigin(1, 0.5);

    this.createTowerPanel();
  }

  override update(): void {
    const { economy, shelter, score, waves, clock } = this.gameScene;
    this.statsText.setText(
      `Scrap ${economy.balance}  (turret ${TOWER_PLACE_COST})   ` +
        `Shelter ${shelter.hp}/${shelter.maxHp}   ` +
        `Kills ${score.kills}   Time ${formatTime(score.survivalSeconds)}`,
    );

    const inBreather = waves.phase === 'breather';
    const nextLabel = waves.nextWaveIsBoss ? 'BOSS wave' : `Wave ${waves.wave + 1}`;
    this.waveText.setText(inBreather ? `${nextLabel} in ${waves.breatherSecondsLeft}s` : `Wave ${waves.wave}`);
    setColor(this.waveText, inBreather && waves.nextWaveIsBoss ? '#ff6b5b' : '#e0d6b8');
    this.nextWaveButton.setVisible(inBreather);

    this.speedButtons.forEach((button, i) =>
      setBackground(button, i === clock.speedLevel ? BUTTON_ACTIVE_BG : BUTTON_BG),
    );

    const blocker = shelter.health.repairBlocker(waves.wave, economy.balance);
    this.repairButton.setText(
      blocker === 'full' ? 'Shelter at full HP' : `Repair +${SHELTER_REPAIR_AMOUNT} HP (${repairCost(waves.wave)})`,
    );
    setEnabled(this.repairButton, blocker === null);

    this.updateTowerPanel(this.gameScene.selectedTower);
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, label, { ...TEXT_STYLE, backgroundColor: BUTTON_BG, padding: { x: 8, y: 4 } })
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, onClick);
  }

  private createTowerPanel(): void {
    const bg = this.add
      .rectangle(0, 0, PANEL_WIDTH, PANEL_HEIGHT, 0x1c1a16, 0.95)
      .setOrigin(0)
      .setStrokeStyle(2, 0xffd166)
      .setInteractive();
    this.panelStats = this.add.text(12, 10, '', { ...TEXT_STYLE, fontSize: '14px', lineSpacing: 2 });
    this.upgradeButton = this.makeButton(12, 102, '', () => this.gameScene.upgradeSelected());
    this.upgradeReason = this.add.text(12, 102, '', { ...TEXT_STYLE, fontSize: '12px', color: '#d94c3d' }).setOrigin(0, 1);
    this.sellButton = this.makeButton(12, 134, '', () => this.gameScene.sellSelected());
    this.panel = this.add
      .container(0, 0, [bg, this.panelStats, this.upgradeButton, this.upgradeReason, this.sellButton])
      .setVisible(false);
  }

  private updateTowerPanel(tower: Tower | undefined): void {
    this.panel.setVisible(tower !== undefined);
    if (!tower) return;
    const { economy, waves } = this.gameScene;
    const { progress } = tower;
    const stats = progress.stats;
    this.panelStats.setText(
      [
        `Turret Lv${stats.level}`,
        `Damage ${stats.damage}   Range ${stats.range}`,
        `Fires every ${stats.cooldownMs} ms`,
        `Invested ${progress.totalInvested} scrap`,
      ].join('\n'),
    );

    const next = progress.nextLevel;
    const blocker = progress.upgradeBlocker(waves.wave, economy.balance);
    this.upgradeButton.setText(next ? `Upgrade → Lv${next.level} (${next.cost})` : 'Max level');
    setEnabled(this.upgradeButton, blocker === null);
    this.upgradeReason.setText(
      blocker === 'locked' && next
        ? `Unlocks at wave ${next.unlockWave}`
        : blocker === 'too-expensive'
          ? 'Not enough scrap'
          : '',
    );
    this.sellButton.setText(`Sell (+${progress.sellValue})`);

    // Beside the tower, flipped to the left near the right edge and clamped below the HUD.
    const rightX = tower.x + TILE_SIZE / 2 + PANEL_MARGIN;
    const x = rightX + PANEL_WIDTH <= GAME_WIDTH ? rightX : tower.x - TILE_SIZE / 2 - PANEL_MARGIN - PANEL_WIDTH;
    const y = Phaser.Math.Clamp(tower.y - PANEL_HEIGHT / 2, HUD_HEIGHT + PANEL_MARGIN, GAME_HEIGHT - PANEL_HEIGHT - PANEL_MARGIN);
    this.panel.setPosition(x, y);
  }
}

// Text style setters re-render the canvas even when nothing changed, and these run every frame.
function setBackground(text: Phaser.GameObjects.Text, color: string): void {
  if (text.style.backgroundColor !== color) text.setBackgroundColor(color);
}

function setColor(text: Phaser.GameObjects.Text, color: string): void {
  if (text.style.color !== color) text.setColor(color);
}

function setEnabled(button: Phaser.GameObjects.Text, enabled: boolean): void {
  setBackground(button, enabled ? BUTTON_BG : BUTTON_DISABLED_BG);
  button.setAlpha(enabled ? 1 : 0.6);
  if (button.input) button.input.cursor = enabled ? 'pointer' : 'default';
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
