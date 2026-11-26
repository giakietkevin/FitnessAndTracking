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

describe('Nutrition Module (Foods & Daily Food Logs)', () => {
  const db = createDatabase(':memory:');
  const app = createApp({ db, jwtSecret: 'test-secret' });
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  after(() => server.close());

  it('searches seeded foods, creates custom food, logs meals and isolates user data', async () => {
    const userA = await registerUser(baseUrl, 'a@example.com', 'User A');
    const userB = await registerUser(baseUrl, 'b@example.com', 'User B');

    const searchRes = await fetch(`${baseUrl}/api/foods?q=ức gà`, {
      headers: { Authorization: `Bearer ${userA.token}` }
    });
    assert.equal(searchRes.status, 200);
    const { foods } = await searchRes.json();
    assert.ok(foods.length >= 1);
    const chicken = foods[0];

    const customRes = await fetch(`${baseUrl}/api/foods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`
      },
      body: JSON.stringify({
        name: 'Sinh tố chuối yến mạch nhà làm',
        category: 'drink',
        servingLabel: '1 ly (350ml)',
        gramsPerServing: 350,
        calories: 320,
        proteinG: 14,
        carbsG: 50,
        fatG: 7
      })
    });
    assert.equal(customRes.status, 201);
    const { food: customFood } = await customRes.json();

    // User B should not see User A's custom food
    const bFoodsRes = await fetch(`${baseUrl}/api/foods?q=Sinh tố chuối`, {
      headers: { Authorization: `Bearer ${userB.token}` }
    });
    const bFoods = await bFoodsRes.json();
    assert.equal(bFoods.foods.length, 0);

    // Log 2 meals for User A on 2026-11-26
    const log1 = await fetch(`${baseUrl}/api/food-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`
      },
      body: JSON.stringify({
        date: '2026-11-26',
        mealType: 'lunch',
        foodId: chicken.id,
        servings: 1.5
      })
    });
    assert.equal(log1.status, 201);

    const log2 = await fetch(`${baseUrl}/api/food-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`
      },
      body: JSON.stringify({
        date: '2026-11-26',
        mealType: 'breakfast',
        foodId: customFood.id,
        servings: 1
      })
    });
    assert.equal(log2.status, 201);
    const { log: createdLog2 } = await log2.json();

    const dayRes = await fetch(`${baseUrl}/api/food-logs?date=2026-11-26`, {
      headers: { Authorization: `Bearer ${userA.token}` }
    });
    const dayBody = await dayRes.json();
    assert.equal(dayBody.logs.length, 2);
    // 165*1.5 = 248 (rounded) + 320 = 568
    assert.equal(dayBody.summary.calories, 568);
    assert.equal(dayBody.summary.byMeal.breakfast, 320);
    assert.equal(dayBody.summary.byMeal.lunch, 248);

    // User B cannot delete User A's log
    const bDel = await fetch(`${baseUrl}/api/food-logs/${createdLog2.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userB.token}` }
    });
    assert.equal(bDel.status, 404);
  });
});
