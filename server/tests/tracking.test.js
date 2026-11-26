import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from '../src/db/database.js';
import { createApp } from '../src/app.js';

describe('Tracking Module (Weights & Dashboard Analytics)', () => {
  const db = createDatabase(':memory:');
  const app = createApp({ db, jwtSecret: 'test-secret' });
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  after(() => server.close());

  it('aggregates nutrition, workout, and weight logs into dashboard summary', async () => {
    const reg = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'track@example.com', password: 'password123', displayName: 'Tracker' })
    });
    const { token } = await reg.json();

    await fetch(`${baseUrl}/api/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        gender: 'male',
        age: 26,
        heightCm: 175,
        weightKg: 70,
        activityLevel: 'moderate',
        goalType: 'maintain',
        date: '2026-11-25'
      })
    });

    // Log weight on 2026-11-26
    const wRes = await fetch(`${baseUrl}/api/tracking/weights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ date: '2026-11-26', weightKg: 69.5, note: 'Buổi sáng' })
    });
    assert.equal(wRes.status, 201);

    // Log food on 2026-11-26
    await fetch(`${baseUrl}/api/food-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        date: '2026-11-26',
        mealType: 'lunch',
        foodName: 'Cơm ức gà',
        calories: 550,
        proteinG: 42,
        carbsG: 60,
        fatG: 12,
        servings: 1
      })
    });

    // Log workout on 2026-11-26
    await fetch(`${baseUrl}/api/workout-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        date: '2026-11-26',
        title: 'Chạy bộ nhẹ',
        category: 'cardio',
        durationMin: 30,
        caloriesBurned: 260
      })
    });

    // Log water on 2026-11-26
    await fetch(`${baseUrl}/api/water-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ date: '2026-11-26', amountMl: 500 })
    });

    const dashRes = await fetch(`${baseUrl}/api/tracking/dashboard?date=2026-11-26&days=7`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(dashRes.status, 200);
    const dash = await dashRes.json();

    assert.equal(dash.today.caloriesIn, 550);
    assert.equal(dash.today.caloriesOut, 260);
    assert.equal(dash.today.netCalories, 290);
    assert.equal(dash.today.mealsCount, 1);
    assert.equal(dash.today.workoutsCount, 1);
    assert.equal(dash.today.waterMl, 500);
    assert.ok(dash.today.waterTargetMl >= 1500);
    assert.equal(dash.profileSummary.weightKg, 69.5);
    assert.equal(dash.streakDays, 1);
    assert.equal(dash.series.length, 7);
    assert.equal(dash.series[6].date, '2026-11-26');
    assert.equal(dash.series[6].weightKg, 69.5);

    // Export JSON & CSV
    const jsonExp = await fetch(`${baseUrl}/api/tracking/export?format=json`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(jsonExp.status, 200);
    const exportedJson = await jsonExp.json();
    assert.equal(exportedJson.foodLogs.length, 1);
    assert.equal(exportedJson.waterLogs.length, 1);

    const csvExp = await fetch(`${baseUrl}/api/tracking/export?format=csv`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(csvExp.status, 200);
    const csvText = await csvExp.text();
    assert.ok(csvText.includes('Cơm ức gà'));
    assert.ok(csvText.includes('500 ml'));
  });
});
