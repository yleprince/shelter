import Phaser from 'phaser';
import { GAME_OVER_INPUT_DELAY_MS, GAME_WIDTH, KEY_SEQUENCE_TIMEOUT_MS } from '../config';
import { GAME_OVER_BINDINGS, keyHint } from '../data/keybindings';
import type { MapDefinition } from '../data/maps';
import { KeySequence, keyToken } from '../systems/KeySequence';
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
      .text(cx - 20, 520, `Retry [${keyHint(GAME_OVER_BINDINGS, 'retry')}]`, BUTTON_STYLE)
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true })
      .once(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, retry);
    this.add
      .text(cx + 20, 520, `Change map [${keyHint(GAME_OVER_BINDINGS, 'changeMap')}]`, BUTTON_STYLE)
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true })
      .once(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, changeMap);

    const keys = new KeySequence(GAME_OVER_BINDINGS, KEY_SEQUENCE_TIMEOUT_MS);
    // Space also pauses in game: a press meant for the game must not skip the score.
    let ready = false;
    this.time.delayedCall(GAME_OVER_INPUT_DELAY_MS, () => (ready = true));
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (!ready || e.repeat) return;
      const result = keys.press(keyToken(e.key, e.code, (key) => keys.isBound(key)));
      if (result.kind !== 'action') return;
      if (result.action === 'retry') retry();
      else if (result.action === 'changeMap') changeMap();
    });
  }
}
