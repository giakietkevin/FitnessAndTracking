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

  it('supports user food submission and admin approval/rejection workflow', async () => {
    const userA = await registerUser(baseUrl, 'submitter@example.com', 'Người gửi món');
    const userB = await registerUser(baseUrl, 'viewer@example.com', 'Người xem');

    // Non-admin cannot access admin food-submissions
    const forbiddenRes = await fetch(`${baseUrl}/api/admin/food-submissions`, {
      headers: { Authorization: `Bearer ${userA.token}` }
    });
    assert.equal(forbiddenRes.status, 403);

    // Log in as seeded default admin
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@nhipkhoe.local', password: 'admin123' })
    });
    assert.equal(adminLoginRes.status, 200);
    const adminAuth = await adminLoginRes.json();
    assert.equal(adminAuth.user.role, 'admin');

    // User A creates a custom food and submits for public catalog approval
    const createSubRes = await fetch(`${baseUrl}/api/foods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`
      },
      body: JSON.stringify({
        name: 'Bún riêu ốc sườn đặc biệt',
        category: 'meal',
        servingLabel: '1 tô',
        gramsPerServing: 520,
        calories: 460,
        proteinG: 26,
        carbsG: 54,
        fatG: 14,
        submitForPublic: true,
        submissionNote: 'Món ăn phổ biến bữa sáng miền Bắc'
      })
    });
    assert.equal(createSubRes.status, 201);
    const createdBody = await createSubRes.json();
    assert.ok(createdBody.submission);
    assert.equal(createdBody.submission.status, 'pending');

    // User B submits another dish that will be rejected
    const rejectSubRes = await fetch(`${baseUrl}/api/food-submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userB.token}`
      },
      body: JSON.stringify({
        name: 'Món thử nghiệm chưa rõ calo',
        category: 'meal',
        servingLabel: '1 phần',
        gramsPerServing: 100,
        calories: 10,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
        note: 'Thử nghiệm'
      })
    });
    assert.equal(rejectSubRes.status, 201);
    const { submission: toReject } = await rejectSubRes.json();

    // User B should not see User A's unapproved dish yet
    const beforeApproveSearch = await fetch(`${baseUrl}/api/foods?q=Bún riêu ốc`, {
      headers: { Authorization: `Bearer ${userB.token}` }
    });
    const beforeBody = await beforeApproveSearch.json();
    assert.equal(beforeBody.foods.length, 0);

    // Admin inspects pending queue
    const adminQueueRes = await fetch(`${baseUrl}/api/admin/food-submissions?status=pending`, {
      headers: { Authorization: `Bearer ${adminAuth.token}` }
    });
    assert.equal(adminQueueRes.status, 200);
    const queueBody = await adminQueueRes.json();
    assert.equal(queueBody.counts.pending, 2);

    // Admin approves User A's submission with slight calorie adjustment
    const approveRes = await fetch(
      `${baseUrl}/api/admin/food-submissions/${createdBody.submission.id}/approve`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAuth.token}`
        },
        body: JSON.stringify({
          calories: 475,
          adminNote: 'Đã chuẩn hóa calo theo khẩu phần 520g'
        })
      }
    );
    assert.equal(approveRes.status, 200);
    const approveBody = await approveRes.json();
    assert.equal(approveBody.submission.status, 'approved');
    assert.equal(approveBody.food.calories, 475);
    assert.equal(approveBody.food.isCustom, false);

    // Admin rejects User B's submission
    const rejectRes = await fetch(`${baseUrl}/api/admin/food-submissions/${toReject.id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAuth.token}`
      },
      body: JSON.stringify({
        adminNote: 'Thông số dinh dưỡng chưa chính xác'
      })
    });
    assert.equal(rejectRes.status, 200);
    const rejectedBody = await rejectRes.json();
    assert.equal(rejectedBody.submission.status, 'rejected');

    // Now User B sees the approved dish in shared catalog, but NOT the rejected one
    const afterApproveSearch = await fetch(`${baseUrl}/api/foods?q=Bún riêu ốc`, {
      headers: { Authorization: `Bearer ${userB.token}` }
    });
    const afterBody = await afterApproveSearch.json();
    assert.equal(afterBody.foods.length, 1);
    assert.equal(afterBody.foods[0].calories, 475);

    const rejectedSearch = await fetch(`${baseUrl}/api/foods?q=chưa rõ calo`, {
      headers: { Authorization: `Bearer ${userA.token}` }
    });
    const rejectedSearchBody = await rejectedSearch.json();
    assert.equal(rejectedSearchBody.foods.length, 0);

    // User A sees approved status in their submissions list
    const mineRes = await fetch(`${baseUrl}/api/food-submissions/mine`, {
      headers: { Authorization: `Bearer ${userA.token}` }
    });
    const mineBody = await mineRes.json();
    assert.equal(mineBody.submissions.length, 1);
    assert.equal(mineBody.submissions[0].status, 'approved');
  });

  it('tracks daily water, copies meals across dates, and saves/applies meal combos', async () => {
    const userA = await registerUser(baseUrl, 'combo@example.com', 'Combo User');
    const userB = await registerUser(baseUrl, 'combo-other@example.com', 'Other User');

    // Water tracking
    const addWater = await fetch(`${baseUrl}/api/water-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({ date: '2026-11-25', amountMl: 350 })
    });
    assert.equal(addWater.status, 201);
    const waterBody = await addWater.json();
    assert.equal(waterBody.totalMl, 350);
    assert.ok(waterBody.targetMl >= 1500);

    // Log 2 foods on 2026-11-25 breakfast
    await fetch(`${baseUrl}/api/food-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        date: '2026-11-25',
        mealType: 'breakfast',
        foodName: 'Phở bò tái chín',
        calories: 480,
        proteinG: 26,
        carbsG: 62,
        fatG: 12,
        servings: 1
      })
    });
    await fetch(`${baseUrl}/api/food-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        date: '2026-11-25',
        mealType: 'breakfast',
        foodName: 'Cà phê sữa đá',
        calories: 140,
        proteinG: 2,
        carbsG: 20,
        fatG: 5,
        servings: 1
      })
    });

    // Save 2026-11-25 breakfast as a combo
    const comboRes = await fetch(`${baseUrl}/api/meal-combos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        name: 'Combo Sáng Quen Thuộc',
        defaultMealType: 'breakfast',
        sourceDate: '2026-11-25',
        sourceMealType: 'breakfast'
      })
    });
    assert.equal(comboRes.status, 201);
    const { combo } = await comboRes.json();
    assert.equal(combo.items.length, 2);
    assert.equal(combo.calories, 620);

    // User B cannot apply User A's combo
    const bApply = await fetch(`${baseUrl}/api/meal-combos/${combo.id}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userB.token}` },
      body: JSON.stringify({ date: '2026-11-26' })
    });
    assert.equal(bApply.status, 404);

    // Apply combo to 2026-11-26
    const applyRes = await fetch(`${baseUrl}/api/meal-combos/${combo.id}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({ date: '2026-11-26' })
    });
    assert.equal(applyRes.status, 201);

    // Copy 2026-11-25 to 2026-11-27
    const copyRes = await fetch(`${baseUrl}/api/food-logs/copy-day`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({ fromDate: '2026-11-25', toDate: '2026-11-27' })
    });
    assert.equal(copyRes.status, 201);
    const copyBody = await copyRes.json();
    assert.equal(copyBody.copiedCount, 2);

    const day27 = await (
      await fetch(`${baseUrl}/api/food-logs?date=2026-11-27`, {
        headers: { Authorization: `Bearer ${userA.token}` }
      })
    ).json();
    assert.equal(day27.summary.calories, 620);
  });
});
