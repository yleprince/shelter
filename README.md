# Shelter

A small 2D tower defense game. Waves of raiders march down a single path toward your
shelter, getting bigger and tougher over time. Place turrets to hold them off — the
longer you survive, the more points you bank.

## Gameplay

- Enemies spawn in waves and follow a fixed path toward your shelter.
- Click any free tile off the path to place a turret (costs 50 scrap). Hovering a
  tile shows whether you can build there and the turret's range.
- Turrets auto-fire at the nearest enemy in range.
- Each wave is preceded by a short countdown — click **Next wave** in the HUD to skip it.
- Killing enemies earns scrap; enemies that reach the shelter damage it.
- The game ends when the shelter's HP hits zero.
- Your final score combines how long you survived, how many enemies you killed, and
  how much scrap you had saved up. Click or press SPACE to play again.

## Tech Stack

- [Phaser 3](https://phaser.io) for the game engine
- TypeScript
- [Vite](https://vitejs.dev) for the dev server and build
- [Vitest](https://vitest.dev) for unit tests
- Placeholder art is generated in code for now; free CC0 sprites from
  [Kenney.nl](https://kenney.nl) are planned

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
| `npm test`              | Run the unit tests once                    |

## Deployment

The production build in `dist/` is deployed to GitHub Pages.

```bash
npm run build
# publish dist/ to the gh-pages branch (or your CI of choice)
```

## Balancing

All gameplay numbers (starting scrap, turret cost/damage/range, enemy stats, wave
scaling, score weights) live in `src/config.ts`.

## Credits

- Built with [Phaser 3](https://phaser.io)

## License

TBD.
