import Phaser from 'phaser';
import {
  AURA_TICK_MS,
  GAME_WIDTH,
  GRID_COLS,
  GRID_ROWS,
  HUD_ROWS,
  KEY_SEQUENCE_TIMEOUT_MS,
  SIM_STEP_MS,
  SPLITTER_CHILD_SPACING_PX,
  STARTING_CURRENCY,
  STATUS_MESSAGE_MS,
  STATUS_ROWS,
  TILE_SIZE,
} from '../config';
import { GAME_BINDINGS, sequenceLabel, tileEditAction, type GameAction } from '../data/keybindings';
import { getMap, shelterTile, type MapDefinition, type TileCoord } from '../data/maps';
import { DEPTH, TEXTURES } from '../data/textures';
import { killScoreMultiplier, TILE_TYPE_ORDER, TILE_TYPES } from '../data/tileTypes';
import { TOWER_LEVELS, TOWER_PLACE_COST } from '../data/towerLevels';
import { Enemy, type EnemyNavigator } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { Shelter } from '../entities/Shelter';
import { Tower } from '../entities/Tower';
import { computeAuras } from '../systems/Auras';
import { Economy } from '../systems/Economy';
import { GameClock } from '../systems/GameClock';
import { KeySequence, keyToken } from '../systems/KeySequence';
import { MapGrid, sameTile, type TileType } from '../systems/MapGrid';
import { terrainDamage } from '../systems/EnemyTraits';
import { PathField } from '../systems/PathField';
import { ScoreManager } from '../systems/ScoreManager';
import {
  editBlocker,
  editCost,
  isTileTypeUnlocked,
  withEdit,
  type EditBlocker,
  type EditContext,
} from '../systems/TileEditor';
import { TileCursor } from '../systems/TileCursor';
import { themeForWave, type EnemySpec } from '../systems/WaveComposer';
import { WaveManager } from '../systems/WaveManager';
import {
  editBlockerText,
  enemyIntro,
  repairBlockerText,
  shelterUpgradeBlockerText,
  themeIntro,
  tileTypeDescription,
  upgradeBlockerText,
} from '../ui/labels';
import type { GameOverData } from './GameOverScene';
import type { GameSceneData } from './MapSelectScene';

const TILE_TEXTURES: Readonly<Record<TileType, string>> = {
  path: TEXTURES.path,
  gravel: TEXTURES.gravel,
  ground: TEXTURES.ground,
  water: TEXTURES.water,
  fire: TEXTURES.fire,
  ice: TEXTURES.ice,
};
const EDIT_ACTIONS: Partial<Record<GameAction, TileType>> = Object.fromEntries(
  TILE_TYPE_ORDER.map((type) => [tileEditAction(type), type]),
);
const MOVES: Partial<Record<GameAction, [number, number]>> = {
  moveLeft: [-1, 0],
  moveDown: [0, 1],
  moveUp: [0, -1],
  moveRight: [1, 0],
  moveLeftFar: [-5, 0],
  moveDownFar: [0, 5],
  moveUpFar: [0, -5],
  moveRightFar: [5, 0],
};
const SPEED_ACTIONS: readonly GameAction[] = ['speed1', 'speed2', 'speed3', 'speed4'];
// Only listen to actions that close things while the help is open.
const HELP_ACTIONS: readonly GameAction[] = ['help', 'cancel'];
const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'AltGraph']);
const CURSOR_BRACKET = 10;
const KILL_POPUP_RISE_PX = 24;
const KILL_POPUP_MS = 700;
// At x500 a wave can die on ice faster than popups fade; past this many, skip new ones.
const KILL_POPUP_MAX = 30;

export interface EditOption {
  type: TileType;
  cost: number;
  blocker: EditBlocker | null;
}

export class GameScene extends Phaser.Scene {
  economy!: Economy;
  score!: ScoreManager;
  waves!: WaveManager;
  clock!: GameClock;
  shelter!: Shelter;
  map!: MapDefinition;
  selectedTower: Tower | undefined;
  tileMenu: TileCoord | undefined;
  helpOpen = false;
  private readonly keys = new KeySequence(GAME_BINDINGS, KEY_SEQUENCE_TIMEOUT_MS);

  private grid!: MapGrid;
  private field!: PathField;
  private cursor!: TileCursor;
  private nav!: EnemyNavigator;
  private shelterAt!: TileCoord;
  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private projectiles: Projectile[] = [];
  private tileImages: Phaser.GameObjects.Image[] = [];
  private cursorGfx!: Phaser.GameObjects.Graphics;
  private selection!: Phaser.GameObjects.Graphics;
  private routeGfx!: Phaser.GameObjects.Graphics;
  private pauseOverlay!: Phaser.GameObjects.Container;
  private previewRoute: TileCoord[] | undefined;
  private pausedBeforeHelp = false;
  private message = '';
  private messageMs = 0;
  private isOver = false;
  private killPopups = 0;
  private auraMs = 0;
  private introWave = 0;
  // Kinds and themes already introduced this game: the intro line shows once each.
  private readonly introduced = new Set<string>();

  constructor() {
    super('GameScene');
  }

  init({ mapId }: GameSceneData): void {
    this.map = getMap(mapId);
    this.economy = new Economy(STARTING_CURRENCY);
    this.score = new ScoreManager();
    this.waves = new WaveManager();
    this.clock = new GameClock();
    this.grid = new MapGrid(GRID_COLS, GRID_ROWS, TILE_SIZE, this.map.waypoints, HUD_ROWS, STATUS_ROWS);
    this.shelterAt = shelterTile(this.map);
    this.grid.occupy(this.shelterAt);
    this.field = new PathField(GRID_COLS, GRID_ROWS, (t) => this.grid.tileType(t), this.shelterAt);
    this.cursor = new TileCursor(
      { cols: GRID_COLS, firstRow: this.grid.firstPlayableRow, lastRow: this.grid.lastPlayableRow },
      this.shelterAt,
    );
    this.nav = {
      tileToWorld: (t) => this.grid.tileToWorld(t),
      worldToTile: (p) => this.grid.worldToTile(p),
      next: (t) => this.field.next(t),
      isGoal: (t) => sameTile(t, this.shelterAt),
      tileTypeAt: (p) => {
        const tile = this.grid.worldToTile(p);
        return this.grid.isInBounds(tile) ? this.grid.tileType(tile) : undefined;
      },
    };
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.tileImages = [];
    this.killPopups = 0;
    this.auraMs = 0;
    this.introWave = 0;
    this.introduced.clear();
    this.selectedTower = undefined;
    this.tileMenu = undefined;
    this.previewRoute = undefined;
    this.helpOpen = false;
    this.message = '';
    this.messageMs = 0;
    this.keys.reset();
    this.isOver = false;
  }

  create(): void {
    this.drawMap();
    const shelterPos = this.grid.tileToWorld(this.shelterAt);
    this.shelter = new Shelter(this, shelterPos.x, shelterPos.y);
    this.selection = this.add.graphics().setDepth(DEPTH.hover);
    this.routeGfx = this.add.graphics().setDepth(DEPTH.route);
    this.cursorGfx = this.add.graphics().setDepth(DEPTH.cursor);
    this.pauseOverlay = this.createPauseOverlay();

    this.input.mouse?.disableContextMenu();
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => this.onPointerMove(p));
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => this.onPointerDown(p));
    // Keep Space and the arrows from scrolling the page around the canvas.
    this.input.keyboard?.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKey(e));

    this.scene.launch('UIScene');
  }

  override update(_time: number, delta: number): void {
    if (this.isOver) return;
    // Key timeouts and messages run on real time: they must keep working while paused.
    this.keys.tick(delta);
    this.messageMs = Math.max(0, this.messageMs - delta);

    const steps = this.clock.advance(delta);
    // A speed drop discards the frame's remaining steps: at x500 they'd be seconds of
    // unwatched game time, enough for the rest of a leak to reach the shelter.
    for (let i = 0; i < steps && !this.isOver; i++) {
      if (this.step(SIM_STEP_MS)) break;
    }
    if (this.isOver) return;
    for (const enemy of this.enemies) enemy.render();
    for (const projectile of this.projectiles) projectile.render();
    this.drawCursor();
    this.drawRoute();
    this.pauseOverlay.setVisible(this.clock.paused && !this.helpOpen);
  }

  get paused(): boolean {
    return this.clock.paused;
  }

  get cursorTile(): TileCoord {
    return this.cursor.tile;
  }

  togglePause(): void {
    if (!this.helpOpen) this.clock.togglePause();
  }

  setSpeedLevel(index: number): void {
    this.clock.setSpeedLevel(index);
  }

  toggleHelp(): void {
    if (this.helpOpen) {
      this.helpOpen = false;
      this.clock.setPaused(this.pausedBeforeHelp);
      return;
    }
    this.helpOpen = true;
    this.pausedBeforeHelp = this.clock.paused;
    this.clock.setPaused(true);
    this.keys.reset();
  }

  nextWave(): void {
    if (this.waves.phase === 'breather') this.waves.skipBreather();
    else this.say('A wave is already under way');
  }

  repairShelter(): void {
    const blocker = this.shelter.health.repairBlocker(this.waves.wave, this.economy.balance);
    if (blocker) this.say(repairBlockerText(blocker));
    else this.shelter.tryRepair(this.waves.wave, this.economy);
  }

  upgradeShelter(): void {
    const blocker = this.shelter.health.upgradeBlocker(this.waves.wave, this.economy.balance);
    if (blocker) return this.say(shelterUpgradeBlockerText(blocker, this.shelter.health.nextLevel));
    const { level } = this.shelter;
    const cost = this.shelter.health.upgradeCost();
    this.shelter.tryUpgrade(this.waves.wave, this.economy);
    this.say(`Shelter Lv${level} → Lv${this.shelter.level} (−${cost})`);
  }

  upgradeSelected(): void {
    if (this.selectedTower) this.upgradeTower(this.selectedTower);
  }

  maxUpgradeSelected(): void {
    if (this.selectedTower) this.maxUpgradeTower(this.selectedTower);
  }

  sellSelected(): void {
    if (this.selectedTower) this.sellTower(this.selectedTower);
  }

  editOptions(tile: TileCoord): EditOption[] {
    return TILE_TYPE_ORDER.map((type) => ({
      type,
      cost: editCost(type, this.waves.wave),
      blocker: editBlocker(tile, type, this.editContext()),
    }));
  }

  editTileMenu(type: TileType): void {
    if (this.tileMenu && this.editTile(this.tileMenu, type)) this.closeTileMenu();
  }

  closeTileMenu(): void {
    this.tileMenu = undefined;
    this.previewEdit(undefined);
  }

  // Which edit the tile panel's route preview shows; undefined shows the current route.
  previewEdit(type: TileType | undefined): void {
    this.previewRoute = undefined;
    const tile = this.tileMenu;
    if (!tile || !type || editBlocker(tile, type, this.editContext())) return;
    const preview = new PathField(GRID_COLS, GRID_ROWS, withEdit(this.grid, tile, type), this.shelterAt);
    this.previewRoute = preview.route(this.grid.entry);
  }

  statusLeft(): string {
    const pending = this.keys.pending;
    if (pending.length > 0) return this.pendingHint(pending);
    if (this.messageMs > 0) return this.message;
    return this.clock.paused ? '-- PAUSED --' : '';
  }

  statusRight(): string {
    const tile = this.cursor.tile;
    return `${this.describeTile(tile)}   ${tile.col},${tile.row}`;
  }

  describeTile(tile: TileCoord): string {
    if (sameTile(tile, this.shelterAt)) return `Shelter Lv${this.shelter.level} · ${this.shelter.hp}/${this.shelter.maxHp}`;
    const tower = this.towerAt(tile);
    if (tower) return `Tower Lv${tower.progress.level} · sells for ${tower.progress.sellValue}`;
    const entry = sameTile(tile, this.grid.entry) ? ' · entry' : '';
    return `${tileTypeDescription(this.grid.tileType(tile), this.waves.wave)}${entry}`;
  }

  private say(text: string): void {
    this.message = text;
    this.messageMs = STATUS_MESSAGE_MS;
  }

  private pendingHint(pending: readonly string[]): string {
    const options = GAME_BINDINGS.flatMap((binding) =>
      binding.sequences
        .filter((s) => s.length > pending.length && pending.every((key, i) => s[i] === key))
        .map((s) => {
          const rest = sequenceLabel(s.slice(pending.length));
          const type = EDIT_ACTIONS[binding.action];
          if (!type) return `${rest} ${binding.description.toLowerCase()}`;
          const wave = this.waves.wave;
          const price = isTileTypeUnlocked(type, wave) ? editCost(type, wave) : `(wave ${TILE_TYPES[type].unlockWave})`;
          return `${rest} ${type} ${price}`;
        }),
    );
    return `${sequenceLabel(pending)}…  ${options.join(' · ')}`;
  }

  private onKey(e: KeyboardEvent): void {
    if (this.isOver || e.ctrlKey || e.metaKey || MODIFIER_KEYS.has(e.key)) return;
    const token = keyToken(e.key, e.code, (key) => this.keys.isBound(key));
    const result = this.keys.press(token, e.repeat);
    if (result.kind !== 'action') return;
    if (this.helpOpen && !HELP_ACTIONS.includes(result.action)) return;
    this.dispatch(result.action);
  }

  private dispatch(action: GameAction): void {
    const move = MOVES[action];
    if (move) return this.cursor.move(move[0], move[1]);
    const editType = EDIT_ACTIONS[action];
    if (editType) {
      this.editTile(this.cursor.tile, editType);
      return;
    }
    const speed = SPEED_ACTIONS.indexOf(action);
    if (speed >= 0) return this.clock.setSpeedLevel(speed);

    const tile = this.cursor.tile;
    const tower = this.towerAt(tile);
    const towerTiles = () => this.towers.map((t) => t.tile);
    switch (action) {
      case 'rowStart':
        return this.cursor.rowStart();
      case 'rowEnd':
        return this.cursor.rowEnd();
      case 'top':
        return this.cursor.top();
      case 'bottom':
        return this.cursor.bottom();
      case 'nextTower':
        return this.cursor.nextTower(towerTiles());
      case 'prevTower':
        return this.cursor.prevTower(towerTiles());
      case 'toShelter':
        return this.cursor.set(this.shelterAt);
      case 'context':
        if (tower) return this.selectTower(tower === this.selectedTower ? undefined : tower);
        return this.placeTower(tile);
      case 'place':
        return this.placeTower(tile);
      case 'upgrade':
        if (tower) return this.upgradeTower(tower);
        if (sameTile(tile, this.shelterAt)) return this.upgradeShelter();
        return this.say('No tower here');
      case 'upgradeMax':
        if (tower) return this.maxUpgradeTower(tower);
        if (sameTile(tile, this.shelterAt)) return this.maxUpgradeShelter();
        return this.say('No tower here');
      case 'sell':
        if (tower) return this.sellTower(tower);
        return this.say('No tower here');
      case 'pause':
        return this.togglePause();
      case 'repair':
        return this.repairShelter();
      case 'upgradeShelter':
        return this.upgradeShelter();
      case 'nextWave':
        return this.nextWave();
      case 'help':
        return this.toggleHelp();
      case 'cancel':
        if (this.helpOpen) return this.toggleHelp();
        if (this.tileMenu) return this.closeTileMenu();
        return this.selectTower(undefined);
    }
  }

  // Returns whether the step dropped the speed to x1.
  private step(deltaMs: number): boolean {
    this.score.tick(deltaMs);
    let droppedSpeed = false;

    const intros: string[] = [];
    const spawned = this.waves.update(deltaMs, this.enemies.length);
    if (this.waves.wave !== this.introWave) {
      this.introWave = this.waves.wave;
      this.introduce(themeForWave(this.introWave).id, themeIntro(themeForWave(this.introWave)), intros);
    }
    for (const spec of spawned) {
      this.introduce(spec.kind, enemyIntro(spec.kind), intros);
      this.enemies.push(new Enemy(this, this.nav, spec, this.grid.tileToWorld(this.grid.leadIn), this.grid.entry));
    }
    if (intros.length > 0) this.say(intros.join('   '));

    this.auraMs += deltaMs;
    if (this.auraMs >= AURA_TICK_MS) {
      this.applyAuras(this.auraMs);
      this.auraMs = 0;
    }

    // Children (splitter burned to death, spawner minions) are pushed onto this list; they
    // start next step.
    for (const enemy of [...this.enemies]) {
      enemy.update(deltaMs);
      this.spawnChildren(enemy, enemy.takeSpawns());
      if (enemy.reachedEnd && enemy.isAlive) {
        this.shelter.takeDamage(enemy.damage);
        enemy.destroy();
        if (this.clock.dropToBaseSpeed()) droppedSpeed = true;
      } else if (enemy.burn(terrainDamage(this.nav.tileTypeAt(enemy), this.waves.wave, deltaMs, enemy.fireproof))) {
        this.onEnemyKilled(enemy);
      }
    }

    for (const tower of this.towers) {
      tower.update(deltaMs, this.enemies, (t, target) => {
        this.projectiles.push(new Projectile(this, t.x, t.y, target, t.damage));
      });
    }

    this.projectiles = this.projectiles.filter((projectile) => {
      const state = projectile.update(deltaMs);
      if (state === 'flying') return true;
      if (state === 'hit' && projectile.target.takeDamage(projectile.damage)) {
        this.onEnemyKilled(projectile.target);
      }
      projectile.destroy();
      return false;
    });

    this.enemies = this.enemies.filter((enemy) => enemy.isAlive);

    if (this.shelter.isDestroyed) this.endGame();
    if (droppedSpeed) this.say(`Shelter hit · speed back to x${this.clock.speed}`);
    return droppedSpeed;
  }

  private onEnemyKilled(enemy: Enemy): void {
    enemy.destroy();
    const multiplier = killScoreMultiplier(this.nav.tileTypeAt({ x: enemy.x, y: enemy.y }));
    this.score.addKill(multiplier > 1);
    if (multiplier > 1) this.showKillPopup(enemy.x, enemy.y, multiplier);
    this.economy.earn(enemy.reward);
    this.spawnChildren(enemy, enemy.splitsInto);
  }

  // Children spawn outside the wave queue; WaveManager still waits for them because it
  // counts every live enemy before calling the wave cleared.
  private spawnChildren(parent: Enemy, specs: readonly EnemySpec[]): void {
    specs.forEach((spec, i) => {
      const child = new Enemy(this, this.nav, spec, { x: parent.x, y: parent.y }, parent.target);
      child.advanceBy(i * SPLITTER_CHILD_SPACING_PX);
      this.enemies.push(child);
    });
  }

  private applyAuras(elapsedMs: number): void {
    const active = this.enemies.filter((e) => e.isAlive && !e.dormant);
    const effects = computeAuras(active, this.towers);
    active.forEach((enemy, i) => {
      enemy.warBuff = effects.war[i];
      const heal = effects.healRatioPerSec[i];
      if (heal > 0) enemy.heal((heal * elapsedMs) / 1000);
    });
    this.towers.forEach((tower, i) => tower.setCooldownMultiplier(effects.cooldownMultiplier[i]));
  }

  private introduce(key: string, text: string | undefined, intros: string[]): void {
    if (!text || this.introduced.has(key)) return;
    this.introduced.add(key);
    intros.push(text);
  }

  private showKillPopup(x: number, y: number, multiplier: number): void {
    if (this.killPopups >= KILL_POPUP_MAX) return;
    this.killPopups++;
    const popup = this.add
      .text(x, y, `×${multiplier}`, { fontFamily: 'monospace', fontSize: '14px', color: '#bff4ff', stroke: '#0b2a33', strokeThickness: 3 })
      .setOrigin(0.5)
      .setDepth(DEPTH.projectile);
    this.tweens.add({
      targets: popup,
      y: y - KILL_POPUP_RISE_PX,
      alpha: 0,
      duration: KILL_POPUP_MS,
      onComplete: () => {
        popup.destroy();
        this.killPopups--;
      },
    });
  }

  private endGame(): void {
    this.isOver = true;
    const data: GameOverData = {
      breakdown: this.score.computeFinal(this.economy.balance, this.map.scoreMultiplier),
      wave: this.waves.wave,
      map: this.map,
    };
    this.scene.stop('UIScene');
    this.scene.start('GameOverScene', data);
  }

  private drawMap(): void {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tile = { col, row };
        const { x, y } = this.grid.tileToWorld(tile);
        const texture = TILE_TEXTURES[this.grid.tileType(tile)];
        this.tileImages.push(this.add.image(x, y, texture).setDepth(DEPTH.ground));
      }
    }
  }

  private createPauseOverlay(): Phaser.GameObjects.Container {
    const top = HUD_ROWS * TILE_SIZE;
    const height = (this.grid.lastPlayableRow + 1) * TILE_SIZE - top;
    const dim = this.add.rectangle(0, top, GAME_WIDTH, height, 0x000000, 0.35).setOrigin(0);
    const label = this.add
      .text(GAME_WIDTH / 2, top + height / 2, 'PAUSED · Space to resume', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#ffd166',
        backgroundColor: '#1c1a16cc',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5);
    return this.add.container(0, 0, [dim, label]).setDepth(DEPTH.overlay).setVisible(false);
  }

  private towerAt(tile: TileCoord): Tower | undefined {
    return this.towers.find((t) => sameTile(t.tile, tile));
  }

  private selectTower(tower: Tower | undefined): void {
    this.selectedTower = tower;
    if (tower) this.closeTileMenu();
    this.drawSelection();
  }

  private drawSelection(): void {
    this.selection.clear();
    const tower = this.selectedTower;
    if (!tower) return;
    this.selection.lineStyle(2, 0xffd166, 0.9).strokeRect(tower.x - TILE_SIZE / 2, tower.y - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
    this.selection.lineStyle(1, 0xffd166, 0.6).strokeCircle(tower.x, tower.y, tower.range);
  }

  // Green/red validity and the range preview, plus corner brackets that mark the cursor
  // itself, so the keyboard position is visible even where there's nothing to build.
  private drawCursor(): void {
    const g = this.cursorGfx.clear();
    const tile = this.cursor.tile;
    const { x, y } = this.grid.tileToWorld(tile);
    const half = TILE_SIZE / 2;
    const panelOpen = this.selectedTower !== undefined || this.tileMenu !== undefined;
    const tower = this.towerAt(tile);

    if (!panelOpen && tower) {
      g.lineStyle(1, 0xffd166, 0.5).strokeCircle(x, y, tower.range);
    } else if (!panelOpen && this.grid.tileType(tile) === 'ground' && !sameTile(tile, this.shelterAt)) {
      const buildable = this.grid.isBuildable(tile);
      const color = buildable && this.economy.canAfford(TOWER_PLACE_COST) ? 0x7fd46b : 0xd94c3d;
      g.fillStyle(color, 0.3).fillRect(x - half, y - half, TILE_SIZE, TILE_SIZE);
      if (buildable) g.lineStyle(1, color, 0.6).strokeCircle(x, y, TOWER_LEVELS[0].range);
    }

    g.lineStyle(3, 0xffffff, 0.95);
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      const cx = x + sx * half;
      const cy = y + sy * half;
      g.lineBetween(cx, cy, cx - sx * CURSOR_BRACKET, cy).lineBetween(cx, cy, cx, cy - sy * CURSOR_BRACKET);
    }
  }

  // Shown while editing tiles (r pending or the tile panel open): the route enemies take
  // now, or the one they'd take after the edit being considered in the panel.
  private drawRoute(): void {
    const g = this.routeGfx.clear();
    const editing = this.keys.pending[0] === 'r' || this.tileMenu !== undefined;
    if (!editing) return;
    const route = this.previewRoute ?? this.field.route(this.grid.entry);
    const color = this.previewRoute ? 0x7fd4ff : 0xffd166;
    const points = route.map((t) => this.grid.tileToWorld(t));
    g.lineStyle(3, color, 0.45);
    g.strokePoints(points, false);
    g.fillStyle(color, 0.6);
    for (const p of points) g.fillCircle(p.x, p.y, 3);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    const tile = this.grid.worldToTile({ x: pointer.worldX, y: pointer.worldY });
    if (this.cursor.contains(tile)) this.cursor.set(tile);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.isOver || this.helpOpen) return;
    const tile = this.grid.worldToTile({ x: pointer.worldX, y: pointer.worldY });
    if (!this.cursor.contains(tile)) return;
    this.cursor.set(tile);

    if (pointer.rightButtonDown()) {
      this.selectTower(undefined);
      this.tileMenu = tile;
      this.previewEdit(undefined);
      return;
    }
    if (this.tileMenu) return this.closeTileMenu();

    const tower = this.towerAt(tile);
    if (tower) return this.selectTower(tower === this.selectedTower ? undefined : tower);
    // With a panel open a click elsewhere only closes it.
    if (this.selectedTower) return this.selectTower(undefined);
    this.placeTower(tile);
  }

  private placeTower(tile: TileCoord): void {
    if (!this.grid.isBuildable(tile)) return this.say("Can't build here");
    if (!this.economy.spend(TOWER_PLACE_COST)) return this.say('Not enough scrap');
    this.grid.occupy(tile);
    const { x, y } = this.grid.tileToWorld(tile);
    this.towers.push(new Tower(this, tile, x, y));
  }

  private upgradeTower(tower: Tower): void {
    const blocker = tower.progress.upgradeBlocker(this.waves.wave, this.economy.balance);
    if (blocker) return this.say(upgradeBlockerText(blocker, tower.progress.nextLevel));
    tower.upgrade(this.waves.wave, this.economy);
    if (tower === this.selectedTower) this.drawSelection();
  }

  private maxUpgradeTower(tower: Tower): void {
    const plan = tower.progress.upgradePlan(this.waves.wave, this.economy.balance);
    if ('blocker' in plan) return this.say(upgradeBlockerText(plan.blocker, tower.progress.nextLevel));
    const from = tower.progress.level;
    tower.maxUpgrade(this.waves.wave, this.economy);
    this.say(`Tower Lv${from} → Lv${plan.targetLevel} (−${plan.cost})`);
    if (tower === this.selectedTower) this.drawSelection();
  }

  private maxUpgradeShelter(): void {
    const plan = this.shelter.health.upgradePlan(this.waves.wave, this.economy.balance);
    if ('blocker' in plan) return this.say(shelterUpgradeBlockerText(plan.blocker, this.shelter.health.nextLevel));
    const from = this.shelter.level;
    this.shelter.maxUpgrade(this.waves.wave, this.economy);
    this.say(`Shelter Lv${from} → Lv${plan.targetLevel} (−${plan.cost})`);
  }

  private sellTower(tower: Tower): void {
    this.economy.earn(tower.progress.sellValue);
    this.grid.release(tower.tile);
    this.towers = this.towers.filter((t) => t !== tower);
    tower.destroy();
    if (tower === this.selectedTower) this.selectTower(undefined);
  }

  private editContext(): EditContext {
    return {
      grid: this.grid,
      shelter: this.shelterAt,
      enemyTiles: this.enemies.flatMap((e) => e.tiles),
      wave: this.waves.wave,
      balance: this.economy.balance,
    };
  }

  private editTile(tile: TileCoord, type: TileType): boolean {
    const blocker = editBlocker(tile, type, this.editContext());
    if (blocker) {
      this.say(editBlockerText(blocker, type));
      return false;
    }
    if (!this.economy.spend(editCost(type, this.waves.wave))) return false;
    this.grid.setTileType(tile, type);
    this.field.recompute();
    this.tileImages[tile.row * GRID_COLS + tile.col].setTexture(TILE_TEXTURES[type]);
    return true;
  }
}
