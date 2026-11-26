import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from '../src/db/database.js';
import { createApp } from '../src/app.js';

describe('Foundation & Database Seed', () => {
  const db = createDatabase(':memory:');
  const app = createApp({ db, jwtSecret: 'test-secret' });
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  after(() => server.close());

  it('seeds default Vietnamese foods and exercises', () => {
    const foods = db.prepare('SELECT COUNT(*) AS cnt FROM foods WHERE user_id IS NULL').get();
    const exercises = db.prepare('SELECT COUNT(*) AS cnt FROM exercises WHERE user_id IS NULL').get();
    assert.ok(foods.cnt >= 20, 'Expected at least 20 seeded foods');
    assert.ok(exercises.cnt >= 15, 'Expected at least 15 seeded exercises');
  });

  it('returns 200 ok on GET /api/health', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
  });
});
