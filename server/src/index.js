import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabase } from './db/database.js';
import { createApp } from './app.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.resolve(here, '..', '..', 'data', 'fitness.db');
const port = Number(process.env.PORT || 3001);

const db = createDatabase(dbPath);
const app = createApp({ db });

app.listen(port, () => {
  console.log(`Fitness & Tracking API running at http://localhost:${port}`);
});
