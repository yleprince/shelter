import Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import type { EnemyKind } from '../data/enemyTiers';
import { ENEMY_TEXTURES, SHELTER_TEXTURES, TEXTURES, TOWER_GUN_TEXTURES } from '../data/textures';

type EnemyShape =
  | 'round'
  | 'horned'
  | 'ringed'
  | 'boss'
  | 'elongated'
  | 'plated'
  | 'lobed'
  | 'finned'
  | 'cross'
  | 'antenna'
  | 'drill'
  | 'pods'
  | 'tailed'
  | 'crowned'
  | 'winged';

interface EnemyLook {
  shape: EnemyShape;
  width: number;
  height: number;
  body: number;
  eyes: number;
  // Bosses get a red ring around the body on top of their own silhouette.
  bossRing?: boolean;
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
  runner: { shape: 'elongated', width: 30, height: 14, body: 0xd4e157, eyes: 0x1a1a1a },
  armored: { shape: 'plated', width: 26, height: 26, body: 0x8a8f94, eyes: 0xff6b5b },
  splitter: { shape: 'lobed', width: 32, height: 22, body: 0xc75b8f, eyes: 0xffffff },
  swimmer: { shape: 'finned', width: 32, height: 22, body: 0x3f8fe0, eyes: 0xffffff },
  healer: { shape: 'cross', width: 28, height: 28, body: 0xf2f2ea, eyes: 0x1a1a1a },
  jammer: { shape: 'antenna', width: 26, height: 36, body: 0x5e6b78, eyes: 0x9ae0ff },
  burrower: { shape: 'drill', width: 28, height: 36, body: 0x8a6a45, eyes: 0xffd166 },
  carrier: { shape: 'pods', width: 38, height: 32, body: 0x6b7a3a, eyes: 0xff6b5b },
  salamander: { shape: 'tailed', width: 40, height: 18, body: 0xd9432f, eyes: 0xffd166 },
  brute: round(40, 0x2a2a2a, 0xff3b2f, 'boss'),
  hiveQueen: { shape: 'crowned', width: 42, height: 50, body: 0x7a3fa3, eyes: 0xffd166, bossRing: true },
  juggernaut: { shape: 'plated', width: 44, height: 44, body: 0x4d5258, eyes: 0xff3b2f, bossRing: true },
  warlord: { shape: 'horned', width: 42, height: 42, body: 0x8a1f1f, eyes: 0xffd166, bossRing: true },
  leviathan: { shape: 'finned', width: 52, height: 38, body: 0x1f3f8a, eyes: 0x9ae0ff, bossRing: true },
  phoenix: { shape: 'winged', width: 56, height: 40, body: 0xf07a1a, eyes: 0xffd24a, bossRing: true },
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
    this.makeFireTile();
    this.makeIceTile();
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

  // Flame tongues on scorched ground: the warm colours set it apart from brown path.
  private makeFireTile(): void {
    const rng = new Phaser.Math.RandomDataGenerator(['fire']);
    this.draw(TEXTURES.fire, TILE_SIZE, TILE_SIZE, (g) => {
      g.fillStyle(0x2a1a14).fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      for (const [color, height] of [
        [0xc0321f, 1],
        [0xf07a1a, 0.7],
        [0xffd24a, 0.4],
      ] as const) {
        g.fillStyle(color);
        for (let i = 0; i < 4; i++) {
          const x = 4 + i * 9 + rng.between(-1, 1);
          const h = (TILE_SIZE - 10) * height * rng.realInRange(0.7, 1);
          g.fillTriangle(x - 4, TILE_SIZE - 3, x + 4, TILE_SIZE - 3, x + rng.between(-2, 2), TILE_SIZE - 3 - h);
        }
      }
    });
  }

  // Pale cyan with white streaks: much lighter than water's deep blue.
  private makeIceTile(): void {
    const rng = new Phaser.Math.RandomDataGenerator(['ice']);
    this.draw(TEXTURES.ice, TILE_SIZE, TILE_SIZE, (g) => {
      g.fillStyle(0xa8e4ef).fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      g.fillStyle(0xd4f4fa);
      for (let i = 0; i < 5; i++) {
        g.fillRect(rng.between(0, TILE_SIZE - 8), rng.between(0, TILE_SIZE - 8), rng.between(4, 8), rng.between(4, 8));
      }
      g.lineStyle(2, 0xffffff, 0.9);
      for (let i = 0; i < 3; i++) {
        const x = rng.between(2, TILE_SIZE - 14);
        const y = rng.between(6, TILE_SIZE - 6);
        g.lineBetween(x, y + 4, x + 12, y - 4);
      }
      g.lineStyle(1, 0x6fb8c8, 0.6).strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
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
    // Faint on purpose: it can't be shot, so it shouldn't read as a target.
    const rng = new Phaser.Math.RandomDataGenerator(['mound']);
    this.draw(TEXTURES.burrowMound, 28, 14, (g) => {
      g.fillStyle(0x3d3629, 0.8).fillEllipse(14, 8, 28, 12);
      g.fillStyle(0x6b5b45, 0.8).fillEllipse(14, 7, 20, 8);
      g.fillStyle(0x8c7a5b);
      for (let i = 0; i < 5; i++) g.fillRect(rng.between(6, 20), rng.between(4, 9), 2, 2);
    });
  }

  private makeProjectile(): void {
    this.draw(TEXTURES.projectile, 6, 6, (g) => {
      g.fillStyle(0xffd166).fillCircle(3, 3, 3);
    });
  }

  // Each level adds one visible feature on top of the last and grows a little, so the
  // upgrade reads at a glance; Lv5 spills a few pixels over neighbouring tiles.
  private makeShelter(): void {
    SHELTER_TEXTURES.forEach((key, i) => {
      const size = TILE_SIZE + i * SHELTER_GROWTH_PER_LEVEL_PX;
      this.draw(key, size, size, (g) => paintShelter(g, size, i + 1));
    });
  }
}

const SHELTER_GROWTH_PER_LEVEL_PX = 3;

function paintShelter(g: Phaser.GameObjects.Graphics, size: number, level: number): void {
  const roofHeight = Math.round(size / 4);
  const roofColor = level >= 3 ? 0x7a7f84 : 0x4d4032;
  g.fillStyle(0x222222).fillRect(0, 0, size, size);
  g.fillStyle(0x6b5b45).fillRect(2, roofHeight - 2, size - 4, size - roofHeight);
  g.fillStyle(roofColor).fillTriangle(0, roofHeight, size / 2, 0, size, roofHeight);
  if (level >= 3) {
    g.fillStyle(0x3a3a34).fillRect(size * 0.7, 2, 5, roofHeight - 2);
    g.fillStyle(0xd0d4d8).fillRect(size / 2 - 1, roofHeight / 2, 2, 2);
  }
  if (level >= 4) {
    g.fillStyle(0x4a4a44).fillRect(0, roofHeight, 5, size - roofHeight).fillRect(size - 5, roofHeight, 5, size - roofHeight);
  }
  if (level >= 5) {
    g.fillStyle(0xd94c3d).fillCircle(size * 0.2, roofHeight - 3, 2).fillCircle(size * 0.8, roofHeight - 3, 2);
  }
  const windowColor = level >= 2 ? 0xffd166 : 0xc9a227;
  const windowY = roofHeight + 4;
  g.fillStyle(windowColor).fillRect(8, windowY, 6, 6).fillRect(size - 14, windowY, 6, 6);
  g.fillStyle(level >= 5 ? 0x5a5e62 : 0x1a1a1a).fillRect(size / 2 - 6, size - 16, 12, 14);
  if (level >= 2) {
    g.fillStyle(0xb8a67a);
    for (let x = 3; x + 7 <= size - 3; x += 8) {
      if (x + 7 < size / 2 - 6 || x > size / 2 + 6) g.fillEllipse(x + 3.5, size - 4, 8, 5);
    }
  }
}

function paintEnemy(g: Phaser.GameObjects.Graphics, look: EnemyLook): void {
  const { width: w, height: h } = look;
  const cx = w / 2;
  let bodyY = h / 2;
  let bodyR = Math.min(w, h) / 2;
  const eyeRadius = Math.max(2, Math.min(w, h) / 12);
  let eyeOffset = w / 6;
  const outline = 0x1a1a1a;
  const disc = (y: number, r: number) => {
    g.fillStyle(outline).fillCircle(cx, y, r);
    g.fillStyle(look.body).fillCircle(cx, y, r - 2);
  };
  const ellipse = (x: number, y: number, ew: number, eh: number) => {
    g.fillStyle(outline).fillEllipse(x, y, ew, eh);
    g.fillStyle(look.body).fillEllipse(x, y, ew - 4, eh - 4);
  };

  switch (look.shape) {
    case 'elongated':
      ellipse(cx, bodyY, w, h);
      eyeOffset = w / 5;
      break;
    case 'plated':
      g.fillStyle(outline).fillRect(0, 0, w, h);
      g.fillStyle(look.body).fillRect(2, 2, w - 4, h - 4);
      g.lineStyle(2, 0x5a5e62).lineBetween(2, h / 2 + 3, w - 2, h / 2 + 3).lineBetween(cx, h / 2 + 3, cx, h - 2);
      g.fillStyle(0xd0d4d8).fillRect(4, 4, 2, 2).fillRect(w - 6, 4, 2, 2).fillRect(4, h - 6, 2, 2).fillRect(w - 6, h - 6, 2, 2);
      break;
    case 'lobed': {
      const r = h / 2;
      g.fillStyle(outline).fillCircle(r, bodyY, r).fillCircle(w - r, bodyY, r);
      g.fillStyle(look.body).fillCircle(r, bodyY, r - 2).fillCircle(w - r, bodyY, r - 2);
      g.lineStyle(1, outline, 0.6).lineBetween(cx, 3, cx, h - 3);
      eyeOffset = w / 4;
      break;
    }
    // Streamlined body with a dorsal fin.
    case 'finned': {
      const finTop = 0;
      bodyY = h * 0.65;
      bodyR = (h * 0.6) / 2;
      g.fillStyle(outline).fillTriangle(cx - w * 0.22, bodyY, cx + w * 0.12, bodyY, cx - w * 0.08, finTop);
      g.fillStyle(0x9ad0ff).fillTriangle(cx - w * 0.18, bodyY - 1, cx + w * 0.08, bodyY - 1, cx - w * 0.08, finTop + 3);
      ellipse(cx, bodyY, w, h * 0.6);
      eyeOffset = w / 5;
      break;
    }
    // White body with a green cross.
    case 'cross': {
      disc(bodyY, bodyR);
      const arm = bodyR * 0.8;
      g.fillStyle(0x3fa34a).fillRect(cx - arm / 2, bodyY + 1, arm, 4).fillRect(cx - 2, bodyY + 3 - arm / 2, 4, arm);
      bodyY -= 4;
      break;
    }
    // Antenna with pulsing rings above a round body.
    case 'antenna': {
      bodyR = w / 2;
      bodyY = h - bodyR;
      g.lineStyle(2, 0xd0d4d8).lineBetween(cx, bodyY - bodyR, cx, 5);
      g.fillStyle(0x9ae0ff).fillCircle(cx, 5, 2.5);
      g.lineStyle(1, 0x9ae0ff, 0.9).strokeCircle(cx, 5, 5);
      disc(bodyY, bodyR);
      break;
    }
    // Drill nose on top of a round body.
    case 'drill': {
      bodyR = w / 2;
      bodyY = h - bodyR;
      const base = bodyY - bodyR + 6;
      g.fillStyle(outline).fillTriangle(cx - w * 0.32, base, cx + w * 0.32, base, cx, 0);
      g.fillStyle(0xb0b4b8).fillTriangle(cx - w * 0.26, base - 1, cx + w * 0.26, base - 1, cx, 3);
      g.lineStyle(1, 0x5a5e62).lineBetween(cx - 5, base - 4, cx + 5, base - 7).lineBetween(cx - 3, base - 9, cx + 3, base - 11);
      disc(bodyY, bodyR);
      break;
    }
    // Large body carrying pods on its back.
    case 'pods': {
      bodyY = h * 0.6;
      bodyR = (h * 0.8) / 2;
      for (const dx of [-w * 0.28, 0, w * 0.28]) {
        g.fillStyle(outline).fillCircle(cx + dx, 7, 6);
        g.fillStyle(0xa3b85a).fillCircle(cx + dx, 7, 4);
      }
      ellipse(cx, bodyY, w, h * 0.8);
      break;
    }
    // Long body with a tail.
    case 'tailed': {
      g.fillStyle(outline).fillTriangle(0, bodyY, w * 0.35, bodyY - h * 0.3, w * 0.35, bodyY + h * 0.3);
      g.fillStyle(look.body).fillTriangle(3, bodyY, w * 0.35, bodyY - h * 0.2, w * 0.35, bodyY + h * 0.2);
      ellipse(w * 0.6, bodyY, w * 0.8, h);
      g.fillStyle(0xffb347).fillCircle(w * 0.45, bodyY + 2, 1.5).fillCircle(w * 0.6, bodyY + 3, 1.5);
      bodyY -= 1;
      g.fillStyle(look.eyes).fillCircle(w * 0.8, bodyY - 2, eyeRadius).fillCircle(w * 0.66, bodyY - 2, eyeRadius);
      return;
    }
    // Round body under a crown.
    case 'crowned': {
      bodyR = w / 2;
      bodyY = h - bodyR;
      const base = bodyY - bodyR + 8;
      g.fillStyle(0xffd166);
      for (const dx of [-w * 0.25, 0, w * 0.25]) g.fillTriangle(cx + dx - 6, base, cx + dx + 6, base, cx + dx, 0);
      disc(bodyY, bodyR);
      break;
    }
    // Round body with spread wings.
    case 'winged': {
      bodyR = h / 2 - 2;
      g.fillStyle(0xffd24a).fillTriangle(cx - bodyR + 4, bodyY - 4, 0, 2, 6, bodyY + 10);
      g.fillTriangle(cx + bodyR - 4, bodyY - 4, w, 2, w - 6, bodyY + 10);
      g.fillStyle(0xc0321f).fillTriangle(cx - bodyR + 4, bodyY, 4, 8, 8, bodyY + 6);
      g.fillTriangle(cx + bodyR - 4, bodyY, w - 4, 8, w - 8, bodyY + 6);
      disc(bodyY, bodyR);
      eyeOffset = bodyR / 3;
      break;
    }
    default:
      disc(bodyY, bodyR);
  }

  if (look.bossRing && look.shape === 'finned') g.lineStyle(3, 0xff3b2f).strokeEllipse(cx, bodyY, w - 6, bodyR * 2 - 4);
  else if (look.bossRing) g.lineStyle(3, 0xff3b2f).strokeCircle(cx, bodyY, bodyR - 3);
  g.fillStyle(look.eyes)
    .fillCircle(cx - eyeOffset, bodyY - 2, eyeRadius)
    .fillCircle(cx + eyeOffset, bodyY - 2, eyeRadius);

  if (look.shape === 'horned') {
    g.fillStyle(0xe0d6b8)
      .fillTriangle(cx - w / 4 - 3, 6, cx - w / 4 + 3, 6, cx - w / 4, 0)
      .fillTriangle(cx + w / 4 - 3, 6, cx + w / 4 + 3, 6, cx + w / 4, 0);
  } else if (look.shape === 'ringed') {
    g.lineStyle(2, 0xffd166).strokeCircle(cx, bodyY, w / 2 - 4);
  } else if (look.shape === 'boss') {
    g.lineStyle(3, 0xff3b2f).strokeCircle(cx, bodyY, w / 2 - 2);
  }
}
