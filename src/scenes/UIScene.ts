import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_SPEEDS, GAME_WIDTH, HUD_ROWS, STATUS_ROWS, TILE_SIZE } from '../config';
import { GAME_BINDINGS, keyHint, tileEditAction, type GameAction } from '../data/keybindings';
import type { TileCoord } from '../data/maps';
import { TILE_TYPE_ORDER, TILE_TYPES } from '../data/tileTypes';
import { TOWER_PLACE_COST } from '../data/towerLevels';
import type { Tower } from '../entities/Tower';
import type { TileType } from '../systems/MapGrid';
import { repairCost } from '../systems/ShelterHealth';
import { createHelpOverlay } from '../ui/HelpOverlay';
import { editBlockerText, tileTypeDescription, upgradeBlockerText } from '../ui/labels';
import type { GameScene } from './GameScene';

const HUD_HEIGHT = HUD_ROWS * TILE_SIZE;
const STATUS_HEIGHT = STATUS_ROWS * TILE_SIZE;
const STATUS_TOP = GAME_HEIGHT - STATUS_HEIGHT;
const LINE_1_Y = TILE_SIZE / 2;
const LINE_2_Y = TILE_SIZE * 1.5;
const PANEL_WIDTH = 260;
const TOWER_PANEL_HEIGHT = 202;
const TILE_OPTION_TOP = 36;
const TILE_OPTION_SPACING = 50;
const TILE_PANEL_HEIGHT = TILE_OPTION_TOP + TILE_TYPE_ORDER.length * TILE_OPTION_SPACING + 4;
const PANEL_MARGIN = 8;
const TOAST_MS = 4000;
const SPEED_ACTIONS: readonly GameAction[] = ['speed1', 'speed2', 'speed3', 'speed4'];

const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '16px',
  color: '#e0d6b8',
};
// The controls line holds nine buttons; at the panel's font and padding they overflow GAME_WIDTH.
const CONTROLS_STYLE: Phaser.Types.GameObjects.Text.TextStyle = { ...TEXT_STYLE, fontSize: '14px', padding: { x: 5, y: 4 } };
const CONTROLS_GAP = 6;
const BUTTON_BG = '#6b5b45';
const BUTTON_ACTIVE_BG = '#c9a227';
const BUTTON_DISABLED_BG = '#3a3a34';

// A browser-session flag, not localStorage: persistence is out of scope.
let controlsHintShown = false;

const hint = (action: GameAction) => `[${keyHint(GAME_BINDINGS, action)}]`;

interface TileOptionRow {
  type: TileType;
  button: Phaser.GameObjects.Text;
  reason: Phaser.GameObjects.Text;
}

export class UIScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private statsText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private nextWaveButton!: Phaser.GameObjects.Text;
  private repairButton!: Phaser.GameObjects.Text;
  private shelterUpgradeButton!: Phaser.GameObjects.Text;
  private pauseButton!: Phaser.GameObjects.Text;
  private speedButtons: Phaser.GameObjects.Text[] = [];
  private statusLeft!: Phaser.GameObjects.Text;
  private statusRight!: Phaser.GameObjects.Text;
  private towerPanel!: Phaser.GameObjects.Container;
  private panelStats!: Phaser.GameObjects.Text;
  private upgradeButton!: Phaser.GameObjects.Text;
  private upgradeReason!: Phaser.GameObjects.Text;
  private maxUpgradeButton!: Phaser.GameObjects.Text;
  private sellButton!: Phaser.GameObjects.Text;
  private tilePanel!: Phaser.GameObjects.Container;
  private tilePanelTitle!: Phaser.GameObjects.Text;
  private tileOptions: TileOptionRow[] = [];
  private help!: Phaser.GameObjects.Container;

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.gameScene = this.scene.get('GameScene') as GameScene;

    // Interactive so clicks on the bars never fall through to the map below.
    this.add.rectangle(0, 0, GAME_WIDTH, HUD_HEIGHT, 0x111111, 0.85).setOrigin(0).setInteractive();
    this.statsText = this.add.text(12, LINE_1_Y, '', TEXT_STYLE).setOrigin(0, 0.5);
    const helpButton = this.makeButton(GAME_WIDTH - 12, LINE_1_Y, '? help', () => this.gameScene.toggleHelp()).setOrigin(1, 0.5);
    this.waveText = this.add.text(helpButton.x - helpButton.width - 16, LINE_1_Y, '', TEXT_STYLE).setOrigin(1, 0.5);

    // Fixed slots sized for each button's widest label, so nothing shifts as labels change.
    let x = 12;
    const place = (label: string, widestLabel: string, onClick: () => void): Phaser.GameObjects.Text => {
      const button = this.makeButton(x, LINE_2_Y, widestLabel, onClick, CONTROLS_STYLE).setOrigin(0, 0.5);
      x += button.width + CONTROLS_GAP;
      return button.setText(label);
    };
    this.speedButtons = GAME_SPEEDS.map((speed, i) => {
      const label = `x${speed} ${hint(SPEED_ACTIONS[i])}`;
      return place(label, label, () => this.gameScene.setSpeedLevel(i));
    });
    x += CONTROLS_GAP;
    this.pauseButton = place('', `Resume ${hint('pause')}`, () => this.gameScene.togglePause());
    this.repairButton = place('', `Repair +000 (0000) ${hint('repair')}`, () => this.gameScene.repairShelter());
    this.shelterUpgradeButton = place('', `Upg Lv0 (000) ${hint('upgradeShelter')}`, () => this.gameScene.upgradeShelter());
    this.nextWaveButton = this.makeButton(
      GAME_WIDTH - 12,
      LINE_2_Y,
      `Next wave ${hint('nextWave')}`,
      () => this.gameScene.nextWave(),
      CONTROLS_STYLE,
    ).setOrigin(1, 0.5);

    this.add.rectangle(0, STATUS_TOP, GAME_WIDTH, STATUS_HEIGHT, 0x111111, 0.9).setOrigin(0).setInteractive();
    const statusStyle = { ...TEXT_STYLE, fontSize: '14px' };
    this.statusLeft = this.add.text(12, STATUS_TOP + STATUS_HEIGHT / 2, '', statusStyle).setOrigin(0, 0.5);
    this.statusRight = this.add
      .text(GAME_WIDTH - 12, STATUS_TOP + STATUS_HEIGHT / 2, '', { ...statusStyle, color: '#9c9480' })
      .setOrigin(1, 0.5);

    this.createTowerPanel();
    this.createTilePanel();
    this.help = createHelpOverlay(this, 'Controls', GAME_BINDINGS, () => this.gameScene.toggleHelp()).setVisible(false);
    if (!controlsHintShown) this.showControlsHint();
  }

  override update(): void {
    const { economy, shelter, score, waves, clock } = this.gameScene;
    this.statsText.setText(
      `Scrap ${economy.balance}  (turret ${TOWER_PLACE_COST})   ` +
        `Shelter ${shelter.hp}/${shelter.maxHp} Lv${shelter.level}   ` +
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
    setText(this.pauseButton, `${clock.paused ? 'Resume' : 'Pause'} ${hint('pause')}`);
    setBackground(this.pauseButton, clock.paused ? BUTTON_ACTIVE_BG : BUTTON_BG);

    const blocker = shelter.health.repairBlocker(waves.wave, economy.balance);
    setText(
      this.repairButton,
      blocker === 'full' ? 'Shelter at full HP' : `Repair +${shelter.health.repairAmount} (${repairCost(waves.wave)}) ${hint('repair')}`,
    );
    setEnabled(this.repairButton, blocker === null);
    this.updateShelterUpgradeButton();

    setText(this.statusLeft, this.gameScene.statusLeft());
    setText(this.statusRight, this.gameScene.statusRight());

    this.updateTowerPanel(this.gameScene.selectedTower);
    this.updateTilePanel(this.gameScene.tileMenu);
    this.help.setVisible(this.gameScene.helpOpen);
  }

  private updateShelterUpgradeButton(): void {
    const { economy, shelter, waves } = this.gameScene;
    const next = shelter.health.nextLevel;
    const blocker = shelter.health.upgradeBlocker(waves.wave, economy.balance);
    let label = `Upg Lv${next?.level} (${next?.cost}) ${hint('upgradeShelter')}`;
    if (blocker === 'max-level') label = 'Shelter max level';
    else if (blocker === 'locked') label = `Lv${next?.level} at wave ${next?.unlockWave}`;
    setText(this.shelterUpgradeButton, label);
    setEnabled(this.shelterUpgradeButton, blocker === null);
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    style: Phaser.Types.GameObjects.Text.TextStyle = TEXT_STYLE,
  ): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, label, { padding: { x: 8, y: 4 }, ...style, backgroundColor: BUTTON_BG })
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, onClick);
  }

  private makePanelBackground(height: number): Phaser.GameObjects.Rectangle {
    return this.add
      .rectangle(0, 0, PANEL_WIDTH, height, 0x1c1a16, 0.95)
      .setOrigin(0)
      .setStrokeStyle(2, 0xffd166)
      .setInteractive();
  }

  private createTowerPanel(): void {
    const bg = this.makePanelBackground(TOWER_PANEL_HEIGHT);
    this.panelStats = this.add.text(12, 10, '', { ...TEXT_STYLE, fontSize: '14px', lineSpacing: 2 });
    this.upgradeButton = this.makeButton(12, 102, '', () => this.gameScene.upgradeSelected());
    this.upgradeReason = this.add.text(12, 102, '', { ...TEXT_STYLE, fontSize: '12px', color: '#d94c3d' }).setOrigin(0, 1);
    this.maxUpgradeButton = this.makeButton(12, 134, '', () => this.gameScene.maxUpgradeSelected());
    this.sellButton = this.makeButton(12, 166, '', () => this.gameScene.sellSelected());
    this.towerPanel = this.add
      .container(0, 0, [bg, this.panelStats, this.upgradeButton, this.upgradeReason, this.maxUpgradeButton, this.sellButton])
      .setVisible(false);
  }

  private updateTowerPanel(tower: Tower | undefined): void {
    this.towerPanel.setVisible(tower !== undefined);
    if (!tower) return;
    const { economy, waves } = this.gameScene;
    const { progress } = tower;
    const stats = progress.stats;
    setText(
      this.panelStats,
      [
        `Turret Lv${stats.level}`,
        `Damage ${stats.damage}   Range ${stats.range}`,
        `Fires every ${stats.cooldownMs} ms`,
        `Invested ${progress.totalInvested} scrap`,
      ].join('\n'),
    );

    const next = progress.nextLevel;
    const blocker = progress.upgradeBlocker(waves.wave, economy.balance);
    setText(this.upgradeButton, next ? `Upgrade → Lv${next.level} (${next.cost}) ${hint('upgrade')}` : 'Max level');
    setEnabled(this.upgradeButton, blocker === null);
    setText(this.upgradeReason, blocker && blocker !== 'max-level' ? upgradeBlockerText(blocker, next) : '');
    // Blocked exactly when Upgrade is, so the reason above covers both buttons.
    const plan = progress.upgradePlan(waves.wave, economy.balance);
    let maxLabel = `Max ${hint('upgradeMax')}`;
    if (!('blocker' in plan)) maxLabel = `Max → Lv${plan.targetLevel} (${plan.cost}) ${hint('upgradeMax')}`;
    else if (plan.blocker === 'max-level') maxLabel = 'Max level';
    setText(this.maxUpgradeButton, maxLabel);
    setEnabled(this.maxUpgradeButton, !('blocker' in plan));
    setText(this.sellButton, `Sell (+${progress.sellValue}) ${hint('sell')}`);
    this.placePanel(this.towerPanel, tower.tile, TOWER_PANEL_HEIGHT);
  }

  private createTilePanel(): void {
    const bg = this.makePanelBackground(TILE_PANEL_HEIGHT);
    this.tilePanelTitle = this.add.text(12, 10, '', { ...TEXT_STYLE, fontSize: '14px' });
    const children: Phaser.GameObjects.GameObject[] = [bg, this.tilePanelTitle];
    this.tileOptions = TILE_TYPE_ORDER.map((type, i) => {
      const y = TILE_OPTION_TOP + i * TILE_OPTION_SPACING;
      const button = this.makeButton(12, y, '', () => this.gameScene.editTileMenu(type))
        .on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => this.gameScene.previewEdit(type))
        .on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => this.gameScene.previewEdit(undefined));
      const reason = this.add.text(12, y + 28, '', { ...TEXT_STYLE, fontSize: '12px', color: '#d94c3d' });
      children.push(button, reason);
      return { type, button, reason };
    });
    this.tilePanel = this.add.container(0, 0, children).setVisible(false);
  }

  private updateTilePanel(tile: TileCoord | undefined): void {
    this.tilePanel.setVisible(tile !== undefined);
    if (!tile) return;
    const options = this.gameScene.editOptions(tile);
    setText(this.tilePanelTitle, `Tile ${tile.col},${tile.row} · ${this.gameScene.describeTile(tile)}`);
    for (const row of this.tileOptions) {
      const option = options.find((o) => o.type === row.type)!;
      setText(row.button, `${TILE_TYPES[row.type].name} (${option.cost}) ${hint(tileEditAction(row.type))}`);
      setEnabled(row.button, option.blocker === null);
      setText(row.reason, option.blocker ? editBlockerText(option.blocker, row.type) : tileTypeDescription(row.type));
      setColor(row.reason, option.blocker ? '#d94c3d' : '#9c9480');
    }
    this.placePanel(this.tilePanel, tile, TILE_PANEL_HEIGHT);
  }

  // Beside the tile, flipped to the left near the right edge and clamped between the bars.
  private placePanel(panel: Phaser.GameObjects.Container, tile: TileCoord, height: number): void {
    const cx = tile.col * TILE_SIZE + TILE_SIZE / 2;
    const cy = tile.row * TILE_SIZE + TILE_SIZE / 2;
    const rightX = cx + TILE_SIZE / 2 + PANEL_MARGIN;
    const x = rightX + PANEL_WIDTH <= GAME_WIDTH ? rightX : cx - TILE_SIZE / 2 - PANEL_MARGIN - PANEL_WIDTH;
    const y = Phaser.Math.Clamp(cy - height / 2, HUD_HEIGHT + PANEL_MARGIN, STATUS_TOP - height - PANEL_MARGIN);
    panel.setPosition(x, y);
  }

  private showControlsHint(): void {
    controlsHintShown = true;
    const toast = this.add
      .text(GAME_WIDTH / 2, HUD_HEIGHT + 24, 'Press ? for controls', {
        ...TEXT_STYLE,
        fontSize: '18px',
        color: '#ffd166',
        backgroundColor: '#1c1a16',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5, 0);
    this.tweens.add({ targets: toast, alpha: 0, delay: TOAST_MS, duration: 600, onComplete: () => toast.destroy() });
  }
}

// Text setters re-render the canvas even when nothing changed, and these run every frame.
function setText(text: Phaser.GameObjects.Text, value: string): void {
  if (text.text !== value) text.setText(value);
}

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
