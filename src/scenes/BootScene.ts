import Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import type { EnemyKind } from '../data/enemyTiers';
import { ENEMY_TEXTURES, TEXTURES, TOWER_GUN_TEXTURES } from '../data/textures';

interface EnemyLook {
  size: number;
  body: number;
  eyes: number;
}

// Size and colour both climb with the tier so the mix is readable at a glance.
const ENEMY_LOOKS: Record<EnemyKind, EnemyLook> = {
  T1: { size: 22, body: 0x7fa34a, eyes: 0xd94c3d },
  T2: { size: 24, body: 0xc9a227, eyes: 0x1a1a1a },
  T3: { size: 26, body: 0x8a5fb5, eyes: 0xffd166 },
  T4: { size: 26, body: 0x3f8fc9, eyes: 0xffffff },
  T5: { size: 30, body: 0xa33b2f, eyes: 0xffd166 },
  boss: { size: 40, body: 0x2a2a2a, eyes: 0xff3b2f },
};

interface GunLook {
  barrels: number;
  length: number;
  color: number;
}

const GUN_LOOKS: readonly GunLook[] = [
  { barrels: 1, length: 12, color: 0xb5a36a },
  { barrels: 1, length: 15, color: 0xc8d8f0 },
  { barrels: 2, length: 14, color: 0x8fd49a },
  { barrels: 2, length: 16, color: 0xffb347 },
  { barrels: 3, length: 16, color: 0xff6b5b },
];

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
    this.makeEnemies();
    this.makeProjectile();
    this.makeShelter();
    this.scene.start('MapSelectScene');
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
    GUN_LOOKS.forEach((look, i) => {
      this.draw(TOWER_GUN_TEXTURES[i], size, size, (g) => {
        const barrelWidth = 4;
        const spread = look.barrels * (barrelWidth + 1);
        g.fillStyle(0x1f1f1f);
        for (let b = 0; b < look.barrels; b++) {
          g.fillRect(size / 2, size / 2 - spread / 2 + b * (barrelWidth + 1), look.length, barrelWidth);
        }
        g.fillStyle(look.color).fillCircle(size / 2, size / 2, 6 + i * 0.5);
      });
    });
  }

  private makeEnemies(): void {
    for (const [kind, look] of Object.entries(ENEMY_LOOKS) as [EnemyKind, EnemyLook][]) {
      const { size } = look;
      const eyeOffset = size / 6;
      const eyeRadius = Math.max(2, size / 12);
      this.draw(ENEMY_TEXTURES[kind], size, size, (g) => {
        g.fillStyle(0x1a1a1a).fillCircle(size / 2, size / 2, size / 2);
        g.fillStyle(look.body).fillCircle(size / 2, size / 2, size / 2 - 2);
        g.fillStyle(look.eyes)
          .fillCircle(size / 2 - eyeOffset, size / 2 - 2, eyeRadius)
          .fillCircle(size / 2 + eyeOffset, size / 2 - 2, eyeRadius);
        if (kind === 'boss') {
          g.lineStyle(3, 0xff3b2f).strokeCircle(size / 2, size / 2, size / 2 - 2);
        }
      });
    }
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
