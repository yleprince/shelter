import Phaser from 'phaser';
import { GAME_WIDTH, GRID_COLS, GRID_ROWS, HUD_ROWS, KEY_SEQUENCE_TIMEOUT_MS, STATUS_ROWS, TILE_SIZE } from '../config';
import { keyHint, MAP_SELECT_BINDINGS, type MapSelectAction } from '../data/keybindings';
import { MAPS, shelterTile, type MapDefinition } from '../data/maps';
import { formatBestScore } from '../systems/BestScore';
import { KeySequence, keyToken } from '../systems/KeySequence';
import { MapGrid } from '../systems/MapGrid';
import { normalizeUsername, USERNAME_MAX_LENGTH } from '../../shared/username';
import { readBestScore } from '../ui/bestScoreCookie';
import { createHelpOverlay } from '../ui/HelpOverlay';
import { readUsername, writeUsername } from '../ui/usernameStorage';
import type { LeaderboardSceneData } from './LeaderboardScene';

export interface GameSceneData {
  mapId: MapDefinition['id'];
}

const CARD_WIDTH = 280;
const CARD_GAP = 30;
const PREVIEW_TILE = 10;
const PLAYABLE_ROWS = GRID_ROWS - HUD_ROWS - STATUS_ROWS;
const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: 'monospace', color: '#e0d6b8' };
const DIRECT_PICKS: Partial<Record<MapSelectAction, number>> = { map1: 0, map2: 1, map3: 2 };
const NAME_INPUT_STYLE = [
  'width: 190px',
  'padding: 4px 8px',
  'font: 16px monospace',
  'color: #e0d6b8',
  'background: #1c1a16',
  'border: 1px solid #6b5b45',
  'outline: none',
].join(';');
const NAME_HINT = `Letters, digits, space . _ - · up to ${USERNAME_MAX_LENGTH}`;

export class MapSelectScene extends Phaser.Scene {
  private cards: Phaser.GameObjects.Rectangle[] = [];
  private highlighted = 0;
  private help!: Phaser.GameObjects.Container;
  private nameInput!: HTMLInputElement;
  private nameStatus!: Phaser.GameObjects.Text;
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

    this.createNameField();
    this.add
      .text(GAME_WIDTH - 20, 24, `Top scores [${keyHint(MAP_SELECT_BINDINGS, 'leaderboard')}]`, {
        ...TEXT_STYLE,
        fontSize: '16px',
        backgroundColor: '#6b5b45',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.openLeaderboard());

    this.help = createHelpOverlay(this, 'Map select controls', MAP_SELECT_BINDINGS, () => this.help.setVisible(false))
      .setDepth(10)
      .setVisible(false);
    this.input.keyboard?.addCapture('UP,DOWN,LEFT,RIGHT');
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    // Phaser prevents the default of canvas clicks, which would otherwise blur the field.
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => this.nameInput.blur());
  }

  private createNameField(): void {
    this.add.text(20, 24, 'Name', { ...TEXT_STYLE, fontSize: '16px' }).setOrigin(0, 0.5);
    const field = this.add.dom(72, 24, 'input', NAME_INPUT_STYLE).setOrigin(0, 0.5);
    this.nameInput = field.node as HTMLInputElement;
    this.nameInput.maxLength = USERNAME_MAX_LENGTH;
    this.nameInput.placeholder = `anonymous [${keyHint(MAP_SELECT_BINDINGS, 'editName')}]`;
    this.nameInput.spellcheck = false;
    this.nameInput.value = readUsername() ?? '';
    this.nameStatus = this.add
      .text(field.x + field.width + 12, 24, '', { ...TEXT_STYLE, fontSize: '12px', color: '#9c9480' })
      .setOrigin(0, 0.5);
    // The DOM layer sits above the canvas, so it would show through the leaderboard overlay.
    // Scene events outlive a restart, unlike the objects they'd touch.
    const hide = () => field.setVisible(false);
    const show = () => field.setVisible(true);
    this.events.on(Phaser.Scenes.Events.PAUSE, hide);
    this.events.on(Phaser.Scenes.Events.RESUME, show);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.PAUSE, hide);
      this.events.off(Phaser.Scenes.Events.RESUME, show);
    });

    // The arrow keys are captured for the map cards; the field needs them back to edit.
    this.nameInput.addEventListener('focus', () => {
      this.input.keyboard?.disableGlobalCapture();
      this.nameStatus.setColor('#9c9480').setText(NAME_HINT);
    });
    this.nameInput.addEventListener('blur', () => {
      this.input.keyboard?.enableGlobalCapture();
      this.saveName();
    });
  }

  private saveName(): void {
    const raw = this.nameInput.value;
    const name = normalizeUsername(raw);
    if (name === null && raw.trim() !== '') {
      this.nameInput.value = readUsername() ?? '';
      this.nameStatus.setColor('#d94c3d').setText(`Name not saved · ${NAME_HINT}`);
      return;
    }
    this.nameInput.value = name ?? '';
    writeUsername(name);
    this.nameStatus.setText(name === null ? 'Playing anonymously · off the leaderboard' : '');
  }

  // Keys typed into the name field belong to it, except Enter (save) and Escape (undo).
  private onNameKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') this.nameInput.value = readUsername() ?? '';
    if (e.key === 'Enter' || e.key === 'Escape') this.nameInput.blur();
  }

  private openLeaderboard(): void {
    this.nameInput.blur();
    this.scene.pause();
    this.scene.launch('LeaderboardScene', { returnTo: this.scene.key, username: readUsername() } satisfies LeaderboardSceneData);
  }

  private onKey(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey) return;
    if (e.target === this.nameInput) return this.onNameKey(e);
    const result = this.keys.press(keyToken(e.key, e.code, (key) => this.keys.isBound(key)), e.repeat);
    if (result.kind !== 'action') return;
    const action = result.action;
    if (action === 'help') return void this.help.setVisible(!this.help.visible);
    if (action === 'cancel') return void this.help.setVisible(false);
    if (this.help.visible) return;
    // Phaser handles keys a frame late, so the n itself is never typed into the field.
    if (action === 'editName') return this.nameInput.focus();
    if (action === 'leaderboard') return this.openLeaderboard();
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
    this.nameInput.blur();
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
