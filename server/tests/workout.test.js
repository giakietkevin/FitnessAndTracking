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

  it('supports user exercise submissions, admin approval, and shared exercise editing', async () => {
    const userA = await registerUser(baseUrl, 'exsub@example.com', 'Ex Submitter');
    const userB = await registerUser(baseUrl, 'exview@example.com', 'Ex Viewer');

    const admin = await (
      await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@nhipkhoe.local', password: 'admin123' })
      })
    ).json();

    const subRes = await fetch(`${baseUrl}/api/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        name: 'Nhảy dây HIIT tốc độ cao',
        category: 'cardio',
        muscleGroup: 'full_body',
        metValue: 11.0,
        defaultDurationMin: 15,
        submitForPublic: true,
        submissionNote: 'Bài cardio đốt mỡ nhanh'
      })
    });
    assert.equal(subRes.status, 201);
    const { submission } = await subRes.json();
    assert.equal(submission.status, 'pending');

    // Non-admin blocked
    const forbidden = await fetch(`${baseUrl}/api/admin/exercise-submissions`, {
      headers: { Authorization: `Bearer ${userB.token}` }
    });
    assert.equal(forbidden.status, 403);

    // Admin approves with adjusted MET
    const approveRes = await fetch(`${baseUrl}/api/admin/exercise-submissions/${submission.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({ metValue: 10.5, adminNote: 'Chuẩn hóa MET' })
    });
    assert.equal(approveRes.status, 200);
    const approveBody = await approveRes.json();
    assert.equal(approveBody.exercise.isCustom, false);
    assert.equal(approveBody.exercise.metValue, 10.5);

    // User B sees approved exercise
    const bSearch = await (
      await fetch(`${baseUrl}/api/exercises?q=Nhảy dây HIIT`, {
        headers: { Authorization: `Bearer ${userB.token}` }
      })
    ).json();
    assert.equal(bSearch.exercises.length, 1);

    // Admin updates shared exercise
    const updRes = await fetch(`${baseUrl}/api/admin/exercises/${approveBody.exercise.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({ defaultDurationMin: 20 })
    });
    assert.equal(updRes.status, 200);
    assert.equal((await updRes.json()).exercise.defaultDurationMin, 20);
  });

  it('lists starter workout templates and adopts a template into user plans', async () => {
    const user = await registerUser(baseUrl, 'tpl@example.com', 'Template User');

    const tplRes = await fetch(`${baseUrl}/api/workout-plans/templates`, {
      headers: { Authorization: `Bearer ${user.token}` }
    });
    assert.equal(tplRes.status, 200);
    const { templates } = await tplRes.json();
    assert.ok(templates.length >= 3);

    const adoptRes = await fetch(`${baseUrl}/api/workout-plans/from-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
      body: JSON.stringify({ templateId: templates[0].id })
    });
    assert.equal(adoptRes.status, 201);
    const { plan } = await adoptRes.json();
    assert.equal(plan.name, templates[0].name);
    assert.equal(plan.items.length, templates[0].exercises.length);
  });
});
