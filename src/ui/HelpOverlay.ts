import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { bindingLabel, type BindingGroup, type KeyBinding } from '../data/keybindings';

const PANEL_WIDTH = 780;
const PANEL_PADDING = 28;
const LINE_HEIGHT = 18;
const GROUP_GAP = 12;
const KEY_COLUMN = 10;
const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '14px',
  color: '#e0d6b8',
  lineSpacing: LINE_HEIGHT - 14,
};

interface Group {
  name: BindingGroup;
  bindings: KeyBinding[];
}

// Built from the binding table itself, so the help can never list a key that doesn't work.
export function createHelpOverlay(
  scene: Phaser.Scene,
  title: string,
  bindings: readonly KeyBinding[],
  onClose: () => void,
): Phaser.GameObjects.Container {
  const groups = groupBindings(bindings);
  const split = bestSplit(groups);
  const columns = [groups.slice(0, split), groups.slice(split)].filter((c) => c.length > 0);
  const contentHeight = Math.max(...columns.map(columnHeight));
  const panelHeight = contentHeight + PANEL_PADDING * 2 + 60;
  const left = (GAME_WIDTH - PANEL_WIDTH) / 2;
  const top = (GAME_HEIGHT - panelHeight) / 2;

  const dim = scene.add
    .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
    .setOrigin(0)
    .setInteractive()
    .on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, onClose);
  const panel = scene.add
    .rectangle(left, top, PANEL_WIDTH, panelHeight, 0x1c1a16, 0.97)
    .setOrigin(0)
    .setStrokeStyle(2, 0xffd166);
  const children: Phaser.GameObjects.GameObject[] = [dim, panel];
  children.push(
    scene.add
      .text(GAME_WIDTH / 2, top + PANEL_PADDING, title, { ...TEXT_STYLE, fontSize: '20px', color: '#ffd166' })
      .setOrigin(0.5, 0),
  );

  const columnWidth = (PANEL_WIDTH - PANEL_PADDING * 2) / 2;
  columns.forEach((column, i) => {
    let y = top + PANEL_PADDING + 44;
    const x = left + PANEL_PADDING + i * columnWidth;
    for (const group of column) {
      children.push(scene.add.text(x, y, group.name.toUpperCase(), { ...TEXT_STYLE, color: '#ffd166' }));
      const lines = group.bindings.map((b) => bindingLabel(b).padEnd(KEY_COLUMN) + b.description);
      children.push(scene.add.text(x, y + LINE_HEIGHT, lines.join('\n'), TEXT_STYLE));
      y += groupHeight(group) + GROUP_GAP;
    }
  });

  children.push(
    scene.add
      .text(GAME_WIDTH / 2, top + panelHeight - PANEL_PADDING, '? or Esc to close', { ...TEXT_STYLE, color: '#9c9480' })
      .setOrigin(0.5, 1),
  );
  return scene.add.container(0, 0, children);
}

function groupBindings(bindings: readonly KeyBinding[]): Group[] {
  const groups: Group[] = [];
  for (const binding of bindings) {
    let group = groups.find((g) => g.name === binding.group);
    if (!group) groups.push((group = { name: binding.group, bindings: [] }));
    group.bindings.push(binding);
  }
  return groups;
}

function groupHeight(group: Group): number {
  return (group.bindings.length + 1) * LINE_HEIGHT;
}

function columnHeight(column: readonly Group[]): number {
  return column.reduce((sum, g) => sum + groupHeight(g) + GROUP_GAP, 0);
}

// Where to cut the groups into two columns so the taller one is as short as possible.
function bestSplit(groups: readonly Group[]): number {
  let best = groups.length;
  let bestHeight = columnHeight(groups);
  for (let k = 1; k < groups.length; k++) {
    const height = Math.max(columnHeight(groups.slice(0, k)), columnHeight(groups.slice(k)));
    if (height < bestHeight) {
      best = k;
      bestHeight = height;
    }
  }
  return best;
}
