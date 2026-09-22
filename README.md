# Shelter

A small 2D tower defense game. Waves of raiders march down a single path toward your
shelter, getting bigger and tougher over time. Place turrets to hold them off — the
longer you survive, the more points you bank.

## Gameplay

- Pick one of three maps: **Crossroads** (easy, x1 score), **Serpent** (medium,
  x1.25) or **Gauntlet** (hard, x1.5). Harder maps have shorter paths.
- Enemies spawn in waves and follow a fixed path toward your shelter. New, tougher
  enemy tiers join as the waves go on, and every 10th wave brings a boss.
- Click any free tile off the path to place a turret (costs 50 scrap). Hovering a
  tile shows whether you can build there and the turret's range.
- Click a turret to upgrade it (up to Lv5; higher levels unlock at later waves) or
  sell it for 60% of the scrap you put in. Esc closes the panel.
- Turrets auto-fire at the nearest enemy in range.
- Each wave is preceded by a short countdown. Click **Next wave** in the HUD to skip it.
- Speed the game up with the **x1 / x2 / x10 / x50** buttons or keys 1–4.
- Killing enemies earns scrap; enemies that reach the shelter damage it. **Repair**
  restores 10 HP for a price that grows each wave.
- The game ends when the shelter's HP hits zero.
- Your final score combines how long you survived, how many enemies you killed and
  how much scrap you had saved up, times the map multiplier. Retry the same map
  (SPACE) or go back and pick another.

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

Gameplay constants (starting scrap, wave scaling, boss, repair, speeds, score
weights) live in `src/config.ts`. Turret levels, enemy tiers and maps are tables in
`src/data/`.

## Credits

- Built with [Phaser 3](https://phaser.io)

## License

TBD.
