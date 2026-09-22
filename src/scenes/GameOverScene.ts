import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import type { ScoreBreakdown } from '../systems/ScoreManager';

export interface GameOverData {
  breakdown: ScoreBreakdown;
  wave: number;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create({ breakdown, wave }: GameOverData): void {
    const cx = GAME_WIDTH / 2;
    const style = { fontFamily: 'monospace', color: '#e0d6b8' };

    this.add.text(cx, 150, 'THE SHELTER HAS FALLEN', { ...style, fontSize: '40px', color: '#d94c3d' }).setOrigin(0.5);
    this.add
      .text(
        cx,
        300,
        [
          `Reached wave     ${wave}`,
          '',
          `Survived ${breakdown.survivalSeconds}s`.padEnd(22) + `+${breakdown.survivalPoints}`,
          `Kills ${breakdown.kills}`.padEnd(22) + `+${breakdown.killPoints}`,
          `Scrap saved ${breakdown.currencyRemaining}`.padEnd(22) + `+${breakdown.currencyPoints}`,
        ].join('\n'),
        { ...style, fontSize: '20px' },
      )
      .setOrigin(0.5);
    this.add.text(cx, 420, `SCORE ${breakdown.total}`, { ...style, fontSize: '36px', color: '#ffd166' }).setOrigin(0.5);
    this.add.text(cx, 520, 'Click or press SPACE to try again', { ...style, fontSize: '18px' }).setOrigin(0.5);

    const restart = () => this.scene.start('GameScene');
    this.input.once(Phaser.Input.Events.POINTER_DOWN, restart);
    this.input.keyboard?.once('keydown-SPACE', restart);
  }
}
