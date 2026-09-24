import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, KEY_SEQUENCE_TIMEOUT_MS } from '../config';
import { keyHint, LEADERBOARD_BINDINGS } from '../data/keybindings';
import { MAPS, type MapId } from '../data/maps';
import { fetchLeaderboard, fetchRecentGames } from '../net/scoreApi';
import { KeySequence, keyToken } from '../systems/KeySequence';
import { LEADERBOARD_HEADER, leaderboardLine, recentGameLine } from '../systems/Leaderboard';

export interface LeaderboardSceneData {
  // The paused scene underneath, resumed on close.
  returnTo: string;
  username: string | null;
  // Settles once a just-finished game is saved, so the board includes it.
  after?: Promise<unknown>;
}

const BOARDS: readonly { label: string; mapId: MapId | null }[] = [
  { label: 'All maps', mapId: null },
  ...MAPS.map((m) => ({ label: m.name, mapId: m.id })),
];
const TEXT_COLOR = '#e0d6b8';
const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: 'monospace', color: TEXT_COLOR };
const MUTED = '#9c9480';
const ACCENT = '#ffd166';
const TAB_GAP = 16;

// Drawn over the scene that opened it (map select or game over), which stays paused
// underneath: game over must not be restarted, or it would save the game twice.
export class LeaderboardScene extends Phaser.Scene {
  private board = 0;
  private tabs: Phaser.GameObjects.Text[] = [];
  private boardText!: Phaser.GameObjects.Text;
  private recentText!: Phaser.GameObjects.Text;
  private request = 0;
  private closed = false;
  private sceneData!: LeaderboardSceneData;
  private readonly keys = new KeySequence(LEADERBOARD_BINDINGS, KEY_SEQUENCE_TIMEOUT_MS);

  constructor() {
    super('LeaderboardScene');
  }

  create(data: LeaderboardSceneData): void {
    this.sceneData = data;
    this.board = 0;
    this.closed = false;
    this.keys.reset();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => (this.closed = true));

    // Interactive so clicks never reach the paused scene's objects underneath.
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x16140f).setOrigin(0).setInteractive();
    this.add.text(GAME_WIDTH / 2, 44, 'TOP SCORES', { ...TEXT_STYLE, fontSize: '32px', color: ACCENT }).setOrigin(0.5);
    this.createTabs();
    this.add.text(40, 124, LEADERBOARD_HEADER, { ...TEXT_STYLE, fontSize: '16px', color: MUTED });
    this.boardText = this.add.text(40, 148, '', { ...TEXT_STYLE, fontSize: '16px', lineSpacing: 4 });
    this.add.text(40, 400, data.username ? `Your last games · ${data.username}` : 'Your last games', {
      ...TEXT_STYLE,
      fontSize: '16px',
      color: MUTED,
    });
    this.recentText = this.add.text(40, 426, '', { ...TEXT_STYLE, fontSize: '14px', lineSpacing: 4 });
    this.add
      .text(GAME_WIDTH / 2, 608, `h/l or arrows to switch board · Back [${keyHint(LEADERBOARD_BINDINGS, 'close')}]`, {
        ...TEXT_STYLE,
        fontSize: '14px',
        color: MUTED,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.close());

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    void this.loadAll(data.after);
  }

  override update(_time: number, delta: number): void {
    this.keys.tick(delta);
  }

  private createTabs(): void {
    this.tabs = BOARDS.map((b, i) =>
      this.add
        .text(0, 88, b.label, { ...TEXT_STYLE, fontSize: '18px', padding: { x: 8, y: 3 } })
        .setOrigin(0, 0.5)
        .setInteractive({ useHandCursor: true })
        .on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.showBoard(i)),
    );
    const width = this.tabs.reduce((sum, t) => sum + t.width, 0) + TAB_GAP * (this.tabs.length - 1);
    let x = (GAME_WIDTH - width) / 2;
    for (const tab of this.tabs) {
      tab.setX(x);
      x += tab.width + TAB_GAP;
    }
    this.highlightTab();
  }

  private highlightTab(): void {
    this.tabs.forEach((tab, i) => {
      const active = i === this.board;
      tab.setColor(active ? '#1c1a16' : TEXT_COLOR).setBackgroundColor(active ? ACCENT : '#2b2720');
    });
  }

  private onKey(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey) return;
    const result = this.keys.press(keyToken(e.key, e.code, (key) => this.keys.isBound(key)), e.repeat);
    if (result.kind !== 'action') return;
    if (result.action === 'close') this.close();
    else if (result.action === 'prevBoard') this.showBoard((this.board + BOARDS.length - 1) % BOARDS.length);
    else if (result.action === 'nextBoard') this.showBoard((this.board + 1) % BOARDS.length);
  }

  private showBoard(index: number): void {
    if (index === this.board) return;
    this.board = index;
    this.highlightTab();
    void this.loadBoard();
  }

  private async loadAll(after: Promise<unknown> | undefined): Promise<void> {
    this.boardText.setText('Loading…');
    this.recentText.setText(this.sceneData.username ? 'Loading…' : 'Set a name on the map screen to keep your games.');
    await after;
    if (this.closed) return;
    void this.loadBoard();
    const { username } = this.sceneData;
    if (!username) return;
    const games = await fetchRecentGames(username);
    if (this.closed) return;
    if (games === null) this.recentText.setText('Leaderboard offline.');
    else if (games.length === 0) this.recentText.setText('No games yet.');
    else this.recentText.setText(games.map(recentGameLine));
  }

  private async loadBoard(): Promise<void> {
    // Switching boards quickly can land responses out of order; only the latest counts.
    const request = ++this.request;
    this.boardText.setText('Loading…');
    const entries = await fetchLeaderboard(BOARDS[this.board].mapId);
    if (this.closed || request !== this.request) return;
    if (entries === null) this.boardText.setText('Leaderboard offline.');
    else if (entries.length === 0) this.boardText.setText('No named games yet. Be the first!');
    else this.boardText.setText(entries.map((e) => leaderboardLine(e, this.sceneData.username)));
  }

  private close(): void {
    if (this.closed) return;
    this.scene.resume(this.sceneData.returnTo);
    this.scene.stop();
  }
}
