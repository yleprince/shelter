import Phaser from 'phaser';
import { GAME_WIDTH, GRID_COLS, GRID_ROWS, HUD_ROWS, KEY_SEQUENCE_TIMEOUT_MS, STATUS_ROWS, TILE_SIZE } from '../config';
import { MAP_SELECT_BINDINGS, type MapSelectAction } from '../data/keybindings';
import { MAPS, shelterTile, type MapDefinition } from '../data/maps';
import { formatBestScore } from '../systems/BestScore';
import { KeySequence, keyToken } from '../systems/KeySequence';
import { MapGrid } from '../systems/MapGrid';
import { readBestScore } from '../ui/bestScoreCookie';
import { createHelpOverlay } from '../ui/HelpOverlay';

export interface GameSceneData {
  mapId: MapDefinition['id'];
}

const CARD_WIDTH = 280;
const CARD_GAP = 30;
const PREVIEW_TILE = 10;
const PLAYABLE_ROWS = GRID_ROWS - HUD_ROWS - STATUS_ROWS;
const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: 'monospace', color: '#e0d6b8' };
const DIRECT_PICKS: Partial<Record<MapSelectAction, number>> = { map1: 0, map2: 1, map3: 2 };

export class MapSelectScene extends Phaser.Scene {
  private cards: Phaser.GameObjects.Rectangle[] = [];
  private highlighted = 0;
  private help!: Phaser.GameObjects.Container;
  private readonly keys = new KeySequence(MAP_SELECT_BINDINGS, KEY_SEQUENCE_TIMEOUT_MS);

  constructor() {
    super('MapSelectScene');
  }

  create(): void {
    this.cards = [];
    this.highlighted = 0;
    this.keys.reset();
    this.add.text(GAME_WIDTH / 2, 80, 'SHELTER', { ...TEXT_STYLE, fontSize: '48px', color: '#ffd166' }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 140, 'Choose a map', { ...TEXT_STYLE, fontSize: '20px' }).setOrigin(0.5);

    const totalWidth = MAPS.length * CARD_WIDTH + (MAPS.length - 1) * CARD_GAP;
    const left = (GAME_WIDTH - totalWidth) / 2;
    MAPS.forEach((map, i) => this.addCard(map, i, left + i * (CARD_WIDTH + CARD_GAP), 190));
    this.highlight(0);

    const best = readBestScore();
    if (best) {
      this.add.text(GAME_WIDTH / 2, 540, formatBestScore(best), { ...TEXT_STYLE, fontSize: '18px', color: '#ffd166' }).setOrigin(0.5);
    }
    this.add
      .text(GAME_WIDTH / 2, 580, 'Harder maps have shorter paths and a higher score multiplier', {
        ...TEXT_STYLE,
        fontSize: '14px',
        color: '#9c9480',
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, 608, 'h/l or arrows to choose · Enter to play · ? help', {
        ...TEXT_STYLE,
        fontSize: '14px',
        color: '#9c9480',
      })
      .setOrigin(0.5);

    this.help = createHelpOverlay(this, 'Map select controls', MAP_SELECT_BINDINGS, () => this.help.setVisible(false))
      .setDepth(10)
      .setVisible(false);
    this.input.keyboard?.addCapture('UP,DOWN,LEFT,RIGHT');
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKey(e));
  }

  private onKey(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey) return;
    const result = this.keys.press(keyToken(e.key, e.code, (key) => this.keys.isBound(key)), e.repeat);
    if (result.kind !== 'action') return;
    const action = result.action;
    if (action === 'help') return void this.help.setVisible(!this.help.visible);
    if (action === 'cancel') return void this.help.setVisible(false);
    if (this.help.visible) return;
    if (action === 'prevMap') return this.highlight((this.highlighted + MAPS.length - 1) % MAPS.length);
    if (action === 'nextMap') return this.highlight((this.highlighted + 1) % MAPS.length);
    if (action === 'startMap') return this.start(this.highlighted);
    const pick = DIRECT_PICKS[action];
    if (pick !== undefined) this.start(pick);
  }

  private highlight(index: number): void {
    this.highlighted = index;
    this.cards.forEach((card, i) => card.setStrokeStyle(i === index ? 3 : 2, i === index ? 0xffd166 : 0x6b5b45));
  }

  private start(index: number): void {
    this.scene.start('GameScene', { mapId: MAPS[index].id } satisfies GameSceneData);
  }

  private addCard(map: MapDefinition, index: number, x: number, y: number): void {
    const previewWidth = GRID_COLS * PREVIEW_TILE;
    const previewHeight = PLAYABLE_ROWS * PREVIEW_TILE;
    const cardHeight = previewHeight + 180;
    const bg = this.add
      .rectangle(x, y, CARD_WIDTH, cardHeight, 0x1c1a16)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });
    this.cards.push(bg);

    const cx = x + CARD_WIDTH / 2;
    this.add.text(cx, y + 24, `${index + 1}. ${map.name}`, { ...TEXT_STYLE, fontSize: '24px' }).setOrigin(0.5);
    this.add
      .text(cx, y + 56, `${map.difficulty}  ·  score x${map.scoreMultiplier}`, {
        ...TEXT_STYLE,
        fontSize: '16px',
        color: '#ffd166',
      })
      .setOrigin(0.5);
    this.drawPreview(map, cx - previewWidth / 2, y + 90);
    this.add
      .text(cx, y + cardHeight - 30, 'Play ▶', { ...TEXT_STYLE, fontSize: '18px', backgroundColor: '#6b5b45', padding: { x: 10, y: 4 } })
      .setOrigin(0.5);

    bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => this.highlight(index));
    bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.start(index));
  }

  private drawPreview(map: MapDefinition, left: number, top: number): void {
    const grid = new MapGrid(GRID_COLS, GRID_ROWS, TILE_SIZE, map.waypoints, HUD_ROWS, STATUS_ROWS);
    const g = this.add.graphics();
    g.fillStyle(0x4a4232).fillRect(left, top, GRID_COLS * PREVIEW_TILE, PLAYABLE_ROWS * PREVIEW_TILE);
    for (let row = HUD_ROWS; row <= grid.lastPlayableRow; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (!grid.isPath({ col, row })) continue;
        g.fillStyle(0x8c7a5b).fillRect(left + col * PREVIEW_TILE, top + (row - HUD_ROWS) * PREVIEW_TILE, PREVIEW_TILE, PREVIEW_TILE);
      }
    }
    const shelter = shelterTile(map);
    g.fillStyle(0xc9a227).fillRect(
      left + shelter.col * PREVIEW_TILE,
      top + (shelter.row - HUD_ROWS) * PREVIEW_TILE,
      PREVIEW_TILE,
      PREVIEW_TILE,
    );
  }
}
