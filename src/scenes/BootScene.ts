import Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import { TEXTURES } from '../data/textures';

// Placeholder art is drawn procedurally so the game is playable without any asset files.
// Swapping in Kenney sprites later only means loading images under the same TEXTURES keys.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.makeGroundTile();
    this.makePathTile();
    this.makeTower();
    this.makeEnemy();
    this.makeProjectile();
    this.makeShelter();
    this.scene.start('GameScene');
  }

  private draw(key: string, width: number, height: number, paint: (g: Phaser.GameObjects.Graphics) => void): void {
    const g = this.make.graphics({}, false);
    paint(g);
    g.generateTexture(key, width, height);
    g.destroy();
  }

  private makeGroundTile(): void {
    const rng = new Phaser.Math.RandomDataGenerator(['ground']);
    this.draw(TEXTURES.ground, TILE_SIZE, TILE_SIZE, (g) => {
      g.fillStyle(0x4a4232).fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      g.fillStyle(0x3d3629);
      for (let i = 0; i < 6; i++) {
        g.fillRect(rng.between(0, TILE_SIZE - 3), rng.between(0, TILE_SIZE - 3), 3, 3);
      }
      g.lineStyle(1, 0x000000, 0.15).strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
    });
  }

  private makePathTile(): void {
    const rng = new Phaser.Math.RandomDataGenerator(['path']);
    this.draw(TEXTURES.path, TILE_SIZE, TILE_SIZE, (g) => {
      g.fillStyle(0x8c7a5b).fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      g.fillStyle(0x7a6a4e);
      for (let i = 0; i < 8; i++) {
        g.fillRect(rng.between(0, TILE_SIZE - 2), rng.between(0, TILE_SIZE - 2), 2, 2);
      }
    });
  }

  private makeTower(): void {
    const size = 32;
    this.draw(TEXTURES.towerBase, size, size, (g) => {
      g.fillStyle(0x2e2e2e).fillRoundedRect(0, 0, size, size, 6);
      g.fillStyle(0x5a5a52).fillRoundedRect(3, 3, size - 6, size - 6, 5);
      g.fillStyle(0x3a3a34).fillCircle(size / 2, size / 2, 9);
    });
    this.draw(TEXTURES.towerGun, size, size, (g) => {
      g.fillStyle(0x1f1f1f).fillRect(size / 2, size / 2 - 3, size / 2 - 1, 6);
      g.fillStyle(0xb5a36a).fillCircle(size / 2, size / 2, 6);
    });
  }

  private makeEnemy(): void {
    const size = 24;
    this.draw(TEXTURES.enemy, size, size, (g) => {
      g.fillStyle(0x1a1a1a).fillCircle(size / 2, size / 2, size / 2);
      g.fillStyle(0x7fa34a).fillCircle(size / 2, size / 2, size / 2 - 2);
      g.fillStyle(0xd94c3d).fillCircle(size / 2 - 4, size / 2 - 2, 2).fillCircle(size / 2 + 4, size / 2 - 2, 2);
    });
  }

  private makeProjectile(): void {
    this.draw(TEXTURES.projectile, 6, 6, (g) => {
      g.fillStyle(0xffd166).fillCircle(3, 3, 3);
    });
  }

  private makeShelter(): void {
    const size = TILE_SIZE;
    this.draw(TEXTURES.shelter, size, size, (g) => {
      g.fillStyle(0x222222).fillRect(0, 0, size, size);
      g.fillStyle(0x6b5b45).fillRect(2, 8, size - 4, size - 10);
      g.fillStyle(0x4d4032).fillTriangle(0, 10, size / 2, 0, size, 10);
      g.fillStyle(0x1a1a1a).fillRect(size / 2 - 6, size - 16, 12, 14);
      g.fillStyle(0xc9a227).fillRect(6, 14, 6, 6).fillRect(size - 12, 14, 6, 6);
    });
  }
}
