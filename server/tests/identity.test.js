import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from '../src/db/database.js';
import { createApp } from '../src/app.js';

describe('Identity Module (Auth, Profile, BMI/TDEE)', () => {
  const db = createDatabase(':memory:');
  const app = createApp({ db, jwtSecret: 'test-secret' });
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  let token = '';

  after(() => server.close());

  it('registers a new user and rejects duplicate email', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'minh@example.com', password: 'password123', displayName: 'Minh Nguyen' })
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.token);
    assert.equal(body.user.email, 'minh@example.com');
    assert.equal(body.profile.onboarded, false);
    token = body.token;

    const dup = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'minh@example.com', password: 'password123', displayName: 'Minh 2' })
    });
    assert.equal(dup.status, 409);
  });

  it('logs in with valid credentials and rejects bad password', async () => {
    const bad = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'minh@example.com', password: 'wrong' })
    });
    assert.equal(bad.status, 401);

    const good = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'minh@example.com', password: 'password123' })
    });
    assert.equal(good.status, 200);
    const body = await good.json();
    assert.ok(body.token);
  });

  it('requires auth for /api/profile and computes BMI/TDEE on update', async () => {
    const unauth = await fetch(`${baseUrl}/api/profile`);
    assert.equal(unauth.status, 401);

    const update = await fetch(`${baseUrl}/api/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        gender: 'male',
        age: 25,
        heightCm: 175,
        weightKg: 72,
        activityLevel: 'moderate',
        goalType: 'cut',
        targetWeightKg: 67
      })
    });
    assert.equal(update.status, 200);
    const body = await update.json();
    assert.equal(body.profile.onboarded, true);
    assert.equal(body.metrics.bmi, 23.5);
    // BMR = 10*72 + 6.25*175 - 5*25 + 5 = 720 + 1093.75 - 125 + 5 = 1693.75
    // TDEE = round(1693.75 * 1.55) = 2625; cut = 2625 - 400 = 2225
    assert.equal(body.metrics.tdee, 2625);
    assert.equal(body.metrics.targetCalories, 2225);
    assert.equal(body.metrics.macroTargets.proteinG, 144);

    // Also verifies weight_logs synced automatically
    const wCount = db.prepare('SELECT COUNT(*) AS cnt FROM weight_logs').get().cnt;
    assert.equal(wCount, 1);
  });
});
