import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from '../src/db/database.js';
import { createApp } from '../src/app.js';

async function registerUser(baseUrl, email, displayName) {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123', displayName })
  });
  return res.json();
}

describe('Workout Module (Exercises, Plans, Logs)', () => {
  const db = createDatabase(':memory:');
  const app = createApp({ db, jwtSecret: 'test-secret' });
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  after(() => server.close());

  it('creates a workout plan, logs workout from plan, estimates calories, and isolates users', async () => {
    const userA = await registerUser(baseUrl, 'wa@example.com', 'Workout A');
    const userB = await registerUser(baseUrl, 'wb@example.com', 'Workout B');

    await fetch(`${baseUrl}/api/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({ age: 24, heightCm: 174, weightKg: 70, gender: 'male', activityLevel: 'moderate', goalType: 'maintain' })
    });

    const exRes = await fetch(`${baseUrl}/api/exercises?q=chay bo`, {
      headers: { Authorization: `Bearer ${userA.token}` }
    });
    const { exercises } = await exRes.json();
    assert.ok(exercises.length >= 1);
    const runEx = exercises[0];

    const planRes = await fetch(`${baseUrl}/api/workout-plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        name: 'Upper + Cardio nhẹ',
        goal: 'cut',
        daysOfWeek: ['Mon', 'Wed', 'Fri'],
        items: [
          { exerciseId: runEx.id, targetDurationMin: 30 }
        ]
      })
    });
    assert.equal(planRes.status, 201);
    const { plan } = await planRes.json();
    assert.equal(plan.items.length, 1);

    // Complete plan for 2026-11-26
    const completeRes = await fetch(`${baseUrl}/api/workout-plans/${plan.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({ date: '2026-11-26' })
    });
    assert.equal(completeRes.status, 201);
    const completeBody = await completeRes.json();
    assert.equal(completeBody.logs.length, 1);
    // MET 8.5 * 70kg * 0.5h = 297.5 -> 298 kcal
    assert.equal(completeBody.logs[0].caloriesBurned, 298);

    // User B cannot see or complete User A's plan
    const bComplete = await fetch(`${baseUrl}/api/workout-plans/${plan.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userB.token}` },
      body: JSON.stringify({ date: '2026-11-26' })
    });
    assert.equal(bComplete.status, 404);
  });
});
