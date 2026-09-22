import Phaser from 'phaser';
import {
  ENEMY_KILL_REWARD,
  ENEMY_KILL_REWARD_PER_WAVE,
  GRID_COLS,
  GRID_ROWS,
  HUD_ROWS,
  STARTING_CURRENCY,
  TILE_SIZE,
  TOWER_COST,
  TOWER_RANGE,
} from '../config';
import { PATH_WAYPOINTS, SHELTER_TILE } from '../data/path';
import { DEPTH, TEXTURES } from '../data/textures';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { Shelter } from '../entities/Shelter';
import { Tower } from '../entities/Tower';
import { Economy } from '../systems/Economy';
import { MapGrid, type Point } from '../systems/MapGrid';
import { ScoreManager } from '../systems/ScoreManager';
import { WaveManager } from '../systems/WaveManager';
import type { GameOverData } from './GameOverScene';

export class GameScene extends Phaser.Scene {
  economy!: Economy;
  score!: ScoreManager;
  waves!: WaveManager;
  shelter!: Shelter;

  private grid!: MapGrid;
  private waypoints!: Point[];
  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private projectiles: Projectile[] = [];
  private hover!: Phaser.GameObjects.Graphics;
  private isOver = false;

  constructor() {
    super('GameScene');
  }

  init(): void {
    this.economy = new Economy(STARTING_CURRENCY);
    this.score = new ScoreManager();
    this.waves = new WaveManager();
    this.grid = new MapGrid(GRID_COLS, GRID_ROWS, TILE_SIZE, PATH_WAYPOINTS, HUD_ROWS);
    this.grid.occupy(SHELTER_TILE);
    this.waypoints = this.grid.worldWaypoints();
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.isOver = false;
  }

  create(): void {
    this.drawMap();
    const shelterPos = this.grid.tileToWorld(SHELTER_TILE);
    this.shelter = new Shelter(this, shelterPos.x, shelterPos.y);
    this.hover = this.add.graphics().setDepth(DEPTH.hover);

    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => this.updateHover(p));
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => this.tryPlaceTower(p));
    this.input.on(Phaser.Input.Events.GAME_OUT, () => this.hover.clear());

    this.scene.launch('UIScene');
  }

  override update(_time: number, delta: number): void {
    if (this.isOver) return;

    this.score.tick(delta);

    const toSpawn = this.waves.update(delta, this.enemies.length);
    for (let i = 0; i < toSpawn; i++) {
      this.enemies.push(new Enemy(this, this.waypoints, this.waves.currentStats));
    }

    for (const enemy of this.enemies) {
      enemy.update(delta);
      if (enemy.reachedEnd && enemy.isAlive) {
        this.shelter.takeDamage(enemy.damage);
        enemy.destroy();
      }
    }

    for (const tower of this.towers) {
      tower.update(delta, this.enemies, (t, target) => {
        this.projectiles.push(new Projectile(this, t.x, t.y, target, t.damage));
      });
    }

    this.projectiles = this.projectiles.filter((projectile) => {
      const state = projectile.update(delta);
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
    this.economy.earn(ENEMY_KILL_REWARD + this.waves.wave * ENEMY_KILL_REWARD_PER_WAVE);
  }

  private endGame(): void {
    this.isOver = true;
    const data: GameOverData = {
      breakdown: this.score.computeFinal(this.economy.balance),
      wave: this.waves.wave,
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

  private updateHover(pointer: Phaser.Input.Pointer): void {
    this.hover.clear();
    if (this.isOver) return;
    const tile = this.grid.worldToTile({ x: pointer.worldX, y: pointer.worldY });
    if (!this.grid.isInBounds(tile) || tile.row < HUD_ROWS) return;
    const valid = this.grid.isBuildable(tile) && this.economy.canAfford(TOWER_COST);
    const color = valid ? 0x7fd46b : 0xd94c3d;
    const { x, y } = this.grid.tileToWorld(tile);
    this.hover.fillStyle(color, 0.35).fillRect(x - TILE_SIZE / 2, y - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
    if (this.grid.isBuildable(tile)) {
      this.hover.lineStyle(1, color, 0.6).strokeCircle(x, y, TOWER_RANGE);
    }
  }

  private tryPlaceTower(pointer: Phaser.Input.Pointer): void {
    if (this.isOver) return;
    const tile = this.grid.worldToTile({ x: pointer.worldX, y: pointer.worldY });
    if (!this.grid.isBuildable(tile) || !this.economy.spend(TOWER_COST)) return;
    this.grid.occupy(tile);
    const { x, y } = this.grid.tileToWorld(tile);
    this.towers.push(new Tower(this, x, y));
    this.updateHover(pointer);
  }
}
