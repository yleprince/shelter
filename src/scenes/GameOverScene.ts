import Phaser from 'phaser';
import { GAME_OVER_INPUT_DELAY_MS, GAME_WIDTH, KEY_SEQUENCE_TIMEOUT_MS } from '../config';
import { GAME_OVER_BINDINGS, keyHint } from '../data/keybindings';
import type { MapDefinition } from '../data/maps';
import { submitGame } from '../net/scoreApi';
import { formatBestScore, isNewBest } from '../systems/BestScore';
import { KeySequence, keyToken } from '../systems/KeySequence';
import { saveResultLine } from '../systems/Leaderboard';
import type { ScoreBreakdown } from '../systems/ScoreManager';
import { readBestScore, writeBestScore } from '../ui/bestScoreCookie';
import { readUsername } from '../ui/usernameStorage';
import type { LeaderboardSceneData } from './LeaderboardScene';
import type { GameSceneData } from './MapSelectScene';

export interface GameOverData {
  breakdown: ScoreBreakdown;
  wave: number;
  map: MapDefinition;
  // Real time played, pauses included (the breakdown's survival time is simulated time).
  durationMs: number;
}

const BUTTON_GAP = 24;
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

  create({ breakdown, wave, map, durationMs }: GameOverData): void {
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
          `Ice kills ${breakdown.iceKills}`.padEnd(24) + `+${breakdown.iceKillPoints}`,
          `Scrap saved ${breakdown.currencyRemaining}`.padEnd(24) + `+${breakdown.currencyPoints}`,
          `Map multiplier`.padEnd(24) + `x${breakdown.mapMultiplier}`,
        ].join('\n'),
        { ...style, fontSize: '20px' },
      )
      .setOrigin(0.5);
    this.add.text(cx, 420, `SCORE ${breakdown.total}`, { ...style, fontSize: '36px', color: '#ffd166' }).setOrigin(0.5);
    const stored = readBestScore();
    if (isNewBest(breakdown.total, stored)) {
      writeBestScore({ score: breakdown.total, mapId: map.id, wave });
      this.add
        .text(cx, 462, 'NEW BEST!', {
          ...style,
          fontSize: '22px',
          color: '#1c1a16',
          backgroundColor: '#ffd166',
          padding: { x: 8, y: 2 },
        })
        .setOrigin(0.5);
    } else if (stored) {
      this.add.text(cx, 462, formatBestScore(stored), { ...style, fontSize: '18px', color: '#9c9480' }).setOrigin(0.5);
    }

    // Saved once, here: the leaderboard opens over this scene rather than restarting it.
    const username = readUsername();
    const saveStatus = this.add.text(cx, 496, 'Saving…', { ...style, fontSize: '16px', color: '#9c9480' }).setOrigin(0.5);
    const saving = submitGame({
      username,
      mapId: map.id,
      score: breakdown.total,
      wave,
      kills: breakdown.kills,
      survivalSeconds: breakdown.survivalSeconds,
      durationMs,
    }).then((result) => {
      if (saveStatus.active) saveStatus.setText(saveResultLine(result, username));
    });

    const retry = () => this.scene.start('GameScene', { mapId: map.id } satisfies GameSceneData);
    const changeMap = () => this.scene.start('MapSelectScene');
    const leaderboard = () => {
      this.scene.pause();
      this.scene.launch('LeaderboardScene', { returnTo: this.scene.key, username, after: saving } satisfies LeaderboardSceneData);
    };
    const buttons = [
      this.add
        .text(0, 552, `Retry [${keyHint(GAME_OVER_BINDINGS, 'retry')}]`, BUTTON_STYLE)
        .once(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, retry),
      this.add
        .text(0, 552, `Change map [${keyHint(GAME_OVER_BINDINGS, 'changeMap')}]`, BUTTON_STYLE)
        .once(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, changeMap),
      this.add
        .text(0, 552, `Top scores [${keyHint(GAME_OVER_BINDINGS, 'leaderboard')}]`, BUTTON_STYLE)
        .on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, leaderboard),
    ];
    let x = cx - (buttons.reduce((sum, b) => sum + b.width, 0) + BUTTON_GAP * (buttons.length - 1)) / 2;
    for (const button of buttons) {
      button.setOrigin(0, 0.5).setX(x).setInteractive({ useHandCursor: true });
      x += button.width + BUTTON_GAP;
    }

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
      else if (result.action === 'leaderboard') leaderboard();
    });
  }
}
