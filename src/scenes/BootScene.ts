import Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import type { EnemyKind } from '../data/enemyTiers';
import { ENEMY_TEXTURES, TEXTURES, TOWER_GUN_TEXTURES } from '../data/textures';

type EnemyShape = 'round' | 'horned' | 'ringed' | 'boss' | 'elongated' | 'plated' | 'lobed';

interface EnemyLook {
  shape: EnemyShape;
  width: number;
  height: number;
  body: number;
  eyes: number;
}

const round = (size: number, body: number, eyes: number, shape: EnemyShape = 'round'): EnemyLook => ({
  shape,
  width: size,
  height: size,
  body,
  eyes,
});

// Tiers climb in size and colour so the mix is readable at a glance; specials get their
// own silhouette, not just a tint, since their traits change how to fight them.
const ENEMY_LOOKS: Record<EnemyKind, EnemyLook> = {
  T1: round(22, 0x7fa34a, 0xd94c3d),
  T2: round(24, 0xc9a227, 0x1a1a1a),
  T3: round(26, 0x8a5fb5, 0xffd166),
  T4: round(26, 0x3f8fc9, 0xffffff),
  T5: round(30, 0xa33b2f, 0xffd166),
  T6: round(31, 0x2f8a78, 0xffd166),
  T7: round(33, 0xb5642f, 0xffffff, 'horned'),
  T8: round(35, 0x5a2f8a, 0xff6b5b, 'ringed'),
  boss: round(40, 0x2a2a2a, 0xff3b2f, 'boss'),
  runner: { shape: 'elongated', width: 30, height: 14, body: 0xd4e157, eyes: 0x1a1a1a },
  armored: { shape: 'plated', width: 26, height: 26, body: 0x8a8f94, eyes: 0xff6b5b },
  splitter: { shape: 'lobed', width: 32, height: 22, body: 0xc75b8f, eyes: 0xffffff },
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
  { barrels: 3, length: 18, color: 0x9ae0ff },
  { barrels: 4, length: 18, color: 0xe0a8ff },
  { barrels: 4, length: 20, color: 0xfff2a8 },
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
    this.makeGravelTile();
    this.makeWaterTile();
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

  private makeGravelTile(): void {
    const rng = new Phaser.Math.RandomDataGenerator(['gravel']);
    this.draw(TEXTURES.gravel, TILE_SIZE, TILE_SIZE, (g) => {
      g.fillStyle(0x6e6a60).fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      for (let i = 0; i < 28; i++) {
        g.fillStyle(rng.pick([0x8f8a7e, 0x55524a, 0xa39e90]));
        g.fillCircle(rng.between(2, TILE_SIZE - 2), rng.between(2, TILE_SIZE - 2), rng.between(1, 3));
      }
    });
  }

  // Deep blue with pale ripples, so it can't be mistaken for grey gravel at a glance.
  private makeWaterTile(): void {
    const rng = new Phaser.Math.RandomDataGenerator(['water']);
    this.draw(TEXTURES.water, TILE_SIZE, TILE_SIZE, (g) => {
      g.fillStyle(0x1f4e79).fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      g.lineStyle(2, 0x8fc3e8, 0.8);
      for (let i = 0; i < 4; i++) {
        const x = rng.between(2, TILE_SIZE - 16);
        const y = 6 + i * 9 + rng.between(-1, 1);
        g.beginPath();
        g.arc(x + 4, y + 2, 4, Math.PI * 1.1, Math.PI * 1.9);
        g.arc(x + 11, y - 2, 4, Math.PI * 0.1, Math.PI * 0.9, true);
        g.strokePath();
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
      this.draw(ENEMY_TEXTURES[kind], look.width, look.height, (g) => paintEnemy(g, look));
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

function paintEnemy(g: Phaser.GameObjects.Graphics, look: EnemyLook): void {
  const { width: w, height: h } = look;
  const cx = w / 2;
  const cy = h / 2;
  const eyeRadius = Math.max(2, Math.min(w, h) / 12);
  let eyeY = cy - 2;
  let eyeOffset = w / 6;

  switch (look.shape) {
    case 'elongated':
      g.fillStyle(0x1a1a1a).fillEllipse(cx, cy, w, h);
      g.fillStyle(look.body).fillEllipse(cx, cy, w - 4, h - 4);
      eyeY = cy - 1;
      eyeOffset = w / 5;
      break;
    case 'plated':
      g.fillStyle(0x1a1a1a).fillRect(0, 0, w, h);
      g.fillStyle(look.body).fillRect(2, 2, w - 4, h - 4);
      g.lineStyle(2, 0x5a5e62).lineBetween(2, h / 2 + 3, w - 2, h / 2 + 3).lineBetween(cx, h / 2 + 3, cx, h - 2);
      g.fillStyle(0xd0d4d8).fillRect(4, 4, 2, 2).fillRect(w - 6, 4, 2, 2).fillRect(4, h - 6, 2, 2).fillRect(w - 6, h - 6, 2, 2);
      break;
    case 'lobed': {
      const r = h / 2;
      g.fillStyle(0x1a1a1a).fillCircle(r, cy, r).fillCircle(w - r, cy, r);
      g.fillStyle(look.body).fillCircle(r, cy, r - 2).fillCircle(w - r, cy, r - 2);
      g.lineStyle(1, 0x1a1a1a, 0.6).lineBetween(cx, 3, cx, h - 3);
      eyeOffset = w / 4;
      break;
    }
    default:
      g.fillStyle(0x1a1a1a).fillCircle(cx, cy, w / 2);
      g.fillStyle(look.body).fillCircle(cx, cy, w / 2 - 2);
  }

  g.fillStyle(look.eyes).fillCircle(cx - eyeOffset, eyeY, eyeRadius).fillCircle(cx + eyeOffset, eyeY, eyeRadius);

  if (look.shape === 'horned') {
    g.fillStyle(0xe0d6b8)
      .fillTriangle(cx - w / 4 - 3, 6, cx - w / 4 + 3, 6, cx - w / 4, 0)
      .fillTriangle(cx + w / 4 - 3, 6, cx + w / 4 + 3, 6, cx + w / 4, 0);
  } else if (look.shape === 'ringed') {
    g.lineStyle(2, 0xffd166).strokeCircle(cx, cy, w / 2 - 4);
  } else if (look.shape === 'boss') {
    g.lineStyle(3, 0xff3b2f).strokeCircle(cx, cy, w / 2 - 2);
  }
}
