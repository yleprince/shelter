# Shelter

A small 2D tower defense game. Waves of raiders march down a single path toward your
shelter, getting bigger and tougher over time. Place turrets to hold them off — the
longer you survive, the more points you bank.

## Gameplay

- Enemies spawn in waves and follow a fixed path toward your shelter.
- Click a buildable tile near the path to place a turret (costs currency).
- Turrets auto-fire at the nearest enemy in range.
- Killing enemies earns currency; enemies that reach the shelter damage it.
- The game ends when the shelter's HP hits zero.
- Your final score combines how long you survived, how many enemies you killed, and
  how much currency you had saved up.

## Tech Stack

- [Phaser 3](https://phaser.io) for the game engine
- TypeScript
- [Vite](https://vitejs.dev) for the dev server and build
- Free CC0 sprites from [Kenney.nl](https://kenney.nl)

## Getting Started

```bash
npm install
npm run dev
```

Then open the printed local URL in your browser.

## Scripts

| Command            | Description                              |
|---------------------|-------------------------------------------|
| `npm run dev`        | Start the dev server with hot reload      |
| `npm run build`       | Type-check and build for production       |
| `npm run preview`      | Preview the production build locally       |
| `npm run typecheck`     | Run TypeScript checks without building     |

## Deployment

The production build in `dist/` is deployed to GitHub Pages.

```bash
npm run build
# publish dist/ to the gh-pages branch (or your CI of choice)
```

## Credits

- Art: [Kenney.nl](https://kenney.nl) asset packs (CC0)
- Built with [Phaser 3](https://phaser.io)

## License

TBD.
