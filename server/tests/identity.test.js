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

  it('applies teen calorie safety guidance for ages 12-17 and supports password change + rate limit', async () => {
    const teenReg = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teen@example.com', password: 'password123', displayName: 'Gia Bảo' })
    });
    assert.equal(teenReg.status, 201);
    const teenData = await teenReg.json();

    const teenProfile = await fetch(`${baseUrl}/api/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teenData.token}`
      },
      body: JSON.stringify({
        gender: 'female',
        age: 14,
        heightCm: 155,
        weightKg: 48,
        activityLevel: 'light',
        goalType: 'cut'
      })
    });
    assert.equal(teenProfile.status, 200);
    const teenBody = await teenProfile.json();
    assert.equal(teenBody.metrics.isTeen, true);
    assert.ok(teenBody.metrics.targetCalories >= 1400);
    assert.ok(teenBody.metrics.teenGuidance.includes('12–17'));

    // Wrong current password rejected
    const badChange = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teenData.token}`
      },
      body: JSON.stringify({ currentPassword: 'wrong-password', newPassword: 'newpassword123' })
    });
    assert.equal(badChange.status, 401);

    // Valid password change succeeds and works for login
    const goodChange = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teenData.token}`
      },
      body: JSON.stringify({ currentPassword: 'password123', newPassword: 'newpassword123' })
    });
    assert.equal(goodChange.status, 200);

    const relogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teen@example.com', password: 'newpassword123' })
    });
    assert.equal(relogin.status, 200);

    // Trigger rate limit after repeated register attempts on an isolated test app
    const rlApp = createApp({ db: createDatabase(':memory:'), jwtSecret: 'rl-secret' });
    const rlServer = rlApp.listen(0);
    const rlUrl = `http://127.0.0.1:${rlServer.address().port}`;
    try {
      let lastStatus = 200;
      for (let i = 0; i < 11; i++) {
        const r = await fetch(`${rlUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'bad-email', password: '123', displayName: 'A' })
        });
        lastStatus = r.status;
      }
      assert.equal(lastStatus, 429);
    } finally {
      rlServer.close();
    }
  });
});
