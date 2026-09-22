import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import type { MapDefinition } from '../data/maps';
import type { ScoreBreakdown } from '../systems/ScoreManager';
import type { GameSceneData } from './MapSelectScene';

export interface GameOverData {
  breakdown: ScoreBreakdown;
  wave: number;
  map: MapDefinition;
}

const BUTTON_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '20px',
  color: '#e0d6b8',
  backgroundColor: '#6b5b45',
  padding: { x: 12, y: 6 },
};

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create({ breakdown, wave, map }: GameOverData): void {
    const cx = GAME_WIDTH / 2;
    const style = { fontFamily: 'monospace', color: '#e0d6b8' };

    this.add.text(cx, 110, 'THE SHELTER HAS FALLEN', { ...style, fontSize: '40px', color: '#d94c3d' }).setOrigin(0.5);
    this.add
      .text(
        cx,
        290,
        [
          `${map.name} (${map.difficulty}), reached wave ${wave}`,
          '',
          `Survived ${breakdown.survivalSeconds}s`.padEnd(24) + `+${breakdown.survivalPoints}`,
          `Kills ${breakdown.kills}`.padEnd(24) + `+${breakdown.killPoints}`,
          `Scrap saved ${breakdown.currencyRemaining}`.padEnd(24) + `+${breakdown.currencyPoints}`,
          `Map multiplier`.padEnd(24) + `x${breakdown.mapMultiplier}`,
        ].join('\n'),
        { ...style, fontSize: '20px' },
      )
      .setOrigin(0.5);
    this.add.text(cx, 420, `SCORE ${breakdown.total}`, { ...style, fontSize: '36px', color: '#ffd166' }).setOrigin(0.5);

    const retry = () => this.scene.start('GameScene', { mapId: map.id } satisfies GameSceneData);
    const changeMap = () => this.scene.start('MapSelectScene');
    this.add
      .text(cx - 20, 520, 'Retry (SPACE)', BUTTON_STYLE)
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true })
      .once(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, retry);
    this.add
      .text(cx + 20, 520, 'Change map', BUTTON_STYLE)
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true })
      .once(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, changeMap);
    this.input.keyboard?.once('keydown-SPACE', retry);
  }
}
