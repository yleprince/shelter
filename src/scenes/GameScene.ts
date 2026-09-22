import Phaser from 'phaser';
import { GRID_COLS, GRID_ROWS, HUD_ROWS, SIM_STEP_MS, STARTING_CURRENCY, TILE_SIZE } from '../config';
import { getMap, shelterTile, type MapDefinition, type TileCoord } from '../data/maps';
import { DEPTH, TEXTURES } from '../data/textures';
import { TOWER_LEVELS, TOWER_PLACE_COST } from '../data/towerLevels';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { Shelter } from '../entities/Shelter';
import { Tower } from '../entities/Tower';
import { Economy } from '../systems/Economy';
import { GameClock } from '../systems/GameClock';
import { MapGrid, type Point } from '../systems/MapGrid';
import { ScoreManager } from '../systems/ScoreManager';
import { WaveManager } from '../systems/WaveManager';
import type { GameOverData } from './GameOverScene';
import type { GameSceneData } from './MapSelectScene';

export class GameScene extends Phaser.Scene {
  economy!: Economy;
  score!: ScoreManager;
  waves!: WaveManager;
  clock!: GameClock;
  shelter!: Shelter;
  map!: MapDefinition;
  selectedTower: Tower | undefined;

  private grid!: MapGrid;
  private waypoints!: Point[];
  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private projectiles: Projectile[] = [];
  private hover!: Phaser.GameObjects.Graphics;
  private selection!: Phaser.GameObjects.Graphics;
  private isOver = false;

  constructor() {
    super('GameScene');
  }

  init({ mapId }: GameSceneData): void {
    this.map = getMap(mapId);
    this.economy = new Economy(STARTING_CURRENCY);
    this.score = new ScoreManager();
    this.waves = new WaveManager();
    this.clock = new GameClock();
    this.grid = new MapGrid(GRID_COLS, GRID_ROWS, TILE_SIZE, this.map.waypoints, HUD_ROWS);
    this.grid.occupy(shelterTile(this.map));
    this.waypoints = this.grid.worldWaypoints();
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.selectedTower = undefined;
    this.isOver = false;
  }

  create(): void {
    this.drawMap();
    const shelterPos = this.grid.tileToWorld(shelterTile(this.map));
    this.shelter = new Shelter(this, shelterPos.x, shelterPos.y);
    this.hover = this.add.graphics().setDepth(DEPTH.hover);
    this.selection = this.add.graphics().setDepth(DEPTH.hover);

    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => this.updateHover(p));
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => this.onTileClick(p));
    this.input.on(Phaser.Input.Events.GAME_OUT, () => this.hover.clear());
    this.input.keyboard?.on('keydown-ESC', () => this.selectTower(undefined));

    this.scene.launch('UIScene');
  }

  override update(_time: number, delta: number): void {
    if (this.isOver) return;
    const steps = this.clock.advance(delta);
    for (let i = 0; i < steps && !this.isOver; i++) this.step(SIM_STEP_MS);
    if (this.isOver) return;
    for (const enemy of this.enemies) enemy.render();
    for (const projectile of this.projectiles) projectile.render();
  }

  upgradeSelected(): void {
    const tower = this.selectedTower;
    if (tower?.upgrade(this.waves.wave, this.economy)) this.drawSelection();
  }

  sellSelected(): void {
    const tower = this.selectedTower;
    if (!tower) return;
    this.economy.earn(tower.progress.sellValue);
    this.grid.release(tower.tile);
    this.towers = this.towers.filter((t) => t !== tower);
    tower.destroy();
    this.selectTower(undefined);
  }

  repairShelter(): void {
    this.shelter.tryRepair(this.waves.wave, this.economy);
  }

  private step(deltaMs: number): void {
    this.score.tick(deltaMs);

    for (const spec of this.waves.update(deltaMs, this.enemies.length)) {
      this.enemies.push(new Enemy(this, this.waypoints, spec));
    }

    for (const enemy of this.enemies) {
      enemy.update(deltaMs);
      if (enemy.reachedEnd && enemy.isAlive) {
        this.shelter.takeDamage(enemy.damage);
        enemy.destroy();
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
  }

  private onEnemyKilled(enemy: Enemy): void {
    enemy.destroy();
    this.score.addKill();
    this.economy.earn(enemy.reward);
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
        const texture = this.grid.isPath(tile) ? TEXTURES.path : TEXTURES.ground;
        this.add.image(x, y, texture).setDepth(DEPTH.ground);
      }
    }
  }

  private towerAt(tile: TileCoord): Tower | undefined {
    return this.towers.find((t) => t.tile.col === tile.col && t.tile.row === tile.row);
  }

  private selectTower(tower: Tower | undefined): void {
    this.selectedTower = tower;
    this.hover.clear();
    this.drawSelection();
  }

  private drawSelection(): void {
    this.selection.clear();
    const tower = this.selectedTower;
    if (!tower) return;
    this.selection.lineStyle(2, 0xffd166, 0.9).strokeRect(tower.x - TILE_SIZE / 2, tower.y - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
    this.selection.lineStyle(1, 0xffd166, 0.6).strokeCircle(tower.x, tower.y, tower.range);
  }

  private updateHover(pointer: Phaser.Input.Pointer): void {
    this.hover.clear();
    // With the tower panel open a click only closes it, so a placement preview would lie.
    if (this.isOver || this.selectedTower) return;
    const tile = this.grid.worldToTile({ x: pointer.worldX, y: pointer.worldY });
    if (!this.grid.isInBounds(tile) || tile.row < HUD_ROWS) return;
    const { x, y } = this.grid.tileToWorld(tile);
    if (this.towerAt(tile)) {
      this.hover.lineStyle(2, 0xffd166, 0.6).strokeRect(x - TILE_SIZE / 2, y - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
      return;
    }
    const valid = this.grid.isBuildable(tile) && this.economy.canAfford(TOWER_PLACE_COST);
    const color = valid ? 0x7fd46b : 0xd94c3d;
    this.hover.fillStyle(color, 0.35).fillRect(x - TILE_SIZE / 2, y - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
    if (this.grid.isBuildable(tile)) {
      this.hover.lineStyle(1, color, 0.6).strokeCircle(x, y, TOWER_LEVELS[0].range);
    }
  }

  private onTileClick(pointer: Phaser.Input.Pointer): void {
    if (this.isOver) return;
    const tile = this.grid.worldToTile({ x: pointer.worldX, y: pointer.worldY });
    const tower = this.towerAt(tile);
    if (tower) {
      this.selectTower(tower === this.selectedTower ? undefined : tower);
      return;
    }
    if (this.selectedTower) {
      this.selectTower(undefined);
      this.updateHover(pointer);
      return;
    }
    this.tryPlaceTower(tile);
    this.updateHover(pointer);
  }

  private tryPlaceTower(tile: TileCoord): void {
    if (!this.grid.isBuildable(tile) || !this.economy.spend(TOWER_PLACE_COST)) return;
    this.grid.occupy(tile);
    const { x, y } = this.grid.tileToWorld(tile);
    this.towers.push(new Tower(this, tile, x, y));
  }
}
