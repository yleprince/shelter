import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createApp } from './app.ts';
import { DEFAULT_DB_PATH, DEFAULT_PORT } from './config.ts';
import { GameStore } from './GameStore.ts';

const port = Number(process.env.PORT ?? DEFAULT_PORT);
const dbPath = process.env.DB_PATH ?? DEFAULT_DB_PATH;

mkdirSync(dirname(dbPath), { recursive: true });
const store = new GameStore(dbPath);
const server = createApp(store).listen(port, () => console.log(`Shelter API on :${port}, database ${dbPath}`));

// docker stop sends SIGTERM: finish in-flight requests and close SQLite cleanly.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    server.close(() => store.close());
    server.closeIdleConnections();
  });
}
