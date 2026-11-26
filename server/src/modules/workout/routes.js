import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { NotFoundError, ValidationError } from '../../middleware/errorHandler.js';

const CATEGORIES = new Set(['strength', 'cardio', 'mobility']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_MET = { strength: 5.0, cardio: 7.5, mobility: 2.5 };

function normalizeText(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function mapExercise(row) {
  return {
    id: row.id,
    isCustom: row.user_id !== null,
    name: row.name,
    category: row.category,
    muscleGroup: row.muscle_group,
    metValue: row.met_value,
    defaultSets: row.default_sets,
    defaultReps: row.default_reps,
    defaultDurationMin: row.default_duration_min
  };
}

function mapPlanItem(row) {
  return {
    id: row.id,
    planId: row.plan_id,
    exerciseId: row.exercise_id,
    exerciseName: row.exercise_name,
    category: row.category,
    targetSets: row.target_sets,
    targetReps: row.target_reps,
    targetWeightKg: row.target_weight_kg,
    targetDurationMin: row.target_duration_min,
    sortOrder: row.sort_order
  };
}

function mapPlan(row, items) {
  let daysOfWeek = [];
  try {
    daysOfWeek = JSON.parse(row.days_of_week || '[]');
  } catch {
    daysOfWeek = [];
  }
  return {
    id: row.id,
    name: row.name,
    goal: row.goal,
    daysOfWeek,
    notes: row.notes,
    items,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapWorkoutLog(row) {
  return {
    id: row.id,
    planId: row.plan_id,
    exerciseId: row.exercise_id,
    date: row.date,
    title: row.title,
    category: row.category,
    sets: row.sets,
    reps: row.reps,
    weightKg: row.weight_kg,
    durationMin: row.duration_min,
    distanceKm: row.distance_km,
    caloriesBurned: row.calories_burned,
    notes: row.notes,
    createdAt: row.created_at
  };
}

function estimateCalories(db, userId, { exerciseId, category, durationMin }) {
  const profile = db.prepare('SELECT weight_kg FROM profiles WHERE user_id = ?').get(userId);
  const weightKg = profile?.weight_kg || 65;
  let met = DEFAULT_MET[category] || 5.0;
  if (exerciseId) {
    const ex = db.prepare('SELECT met_value FROM exercises WHERE id = ?').get(exerciseId);
    if (ex?.met_value) met = ex.met_value;
  }
  return Math.round(met * weightKg * (durationMin / 60));
}

export function createWorkoutRouter(db) {
  const router = Router();
  router.use(requireAuth);

  router.get('/exercises', (req, res) => {
    const q = normalizeText(req.query.q || '').trim();
    const type = String(req.query.type || '').trim().toLowerCase();

    let sql = 'SELECT * FROM exercises WHERE (user_id IS NULL OR user_id = ?)';
    const params = [req.user.id];
    if (type && CATEGORIES.has(type)) {
      sql += ' AND category = ?';
      params.push(type);
    }
    sql += ' ORDER BY CASE WHEN user_id IS NOT NULL THEN 0 ELSE 1 END, id ASC';

    let rows = db.prepare(sql).all(...params);
    if (q) {
      rows = rows.filter((r) => normalizeText(r.name).includes(q) || normalizeText(r.muscle_group).includes(q));
    }
    res.json({ exercises: rows.map(mapExercise) });
  });

  router.post('/exercises', (req, res, next) => {
    try {
      const name = String(req.body?.name || '').trim();
      const category = String(req.body?.category || 'strength');
      const muscleGroup = String(req.body?.muscleGroup || 'full_body').trim();
      const metValue = Number(req.body?.metValue ?? DEFAULT_MET[category] ?? 5.0);
      const defaultSets = Number(req.body?.defaultSets ?? 3);
      const defaultReps = Number(req.body?.defaultReps ?? 10);
      const defaultDurationMin = Number(req.body?.defaultDurationMin ?? 20);

      if (!name || name.length < 2) throw new ValidationError('Tên bài tập cần ít nhất 2 ký tự.');
      if (!CATEGORIES.has(category)) throw new ValidationError('Loại bài tập không hợp lệ.');

      const result = db.prepare(`
        INSERT INTO exercises (user_id, name, category, muscle_group, met_value, default_sets, default_reps, default_duration_min)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(req.user.id, name, category, muscleGroup, metValue, defaultSets, defaultReps, defaultDurationMin);

      const created = db.prepare('SELECT * FROM exercises WHERE id = ?').get(Number(result.lastInsertRowid));
      res.status(201).json({ exercise: mapExercise(created) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/workout-plans', (req, res) => {
    const plans = db.prepare('SELECT * FROM workout_plans WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
    const itemsStmt = db.prepare('SELECT * FROM workout_plan_items WHERE plan_id = ? ORDER BY sort_order ASC, id ASC');
    res.json({
      plans: plans.map((p) => mapPlan(p, itemsStmt.all(p.id).map(mapPlanItem)))
    });
  });

  router.post('/workout-plans', (req, res, next) => {
    try {
      const name = String(req.body?.name || '').trim();
      const goal = String(req.body?.goal || 'general').trim();
      const daysOfWeek = Array.isArray(req.body?.daysOfWeek) ? req.body.daysOfWeek.map(String) : [];
      const notes = String(req.body?.notes || '').trim();
      const items = Array.isArray(req.body?.items) ? req.body.items : [];

      if (!name || name.length < 2) {
        throw new ValidationError('Tên kế hoạch tập luyện cần ít nhất 2 ký tự.');
      }

      db.exec('BEGIN');
      let planId;
      try {
        const resPlan = db.prepare(`
          INSERT INTO workout_plans (user_id, name, goal, days_of_week, notes)
          VALUES (?, ?, ?, ?, ?)
        `).run(req.user.id, name, goal, JSON.stringify(daysOfWeek), notes);
        planId = Number(resPlan.lastInsertRowid);

        const insertItem = db.prepare(`
          INSERT INTO workout_plan_items (plan_id, exercise_id, exercise_name, category, target_sets, target_reps, target_weight_kg, target_duration_min, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        items.forEach((item, idx) => {
          const exId = item.exerciseId ? Number(item.exerciseId) : null;
          let exName = String(item.exerciseName || '').trim();
          let cat = String(item.category || 'strength');
          if (exId) {
            const ex = db.prepare('SELECT * FROM exercises WHERE id = ? AND (user_id IS NULL OR user_id = ?)').get(exId, req.user.id);
            if (!ex) throw new NotFoundError('Bài tập trong plan không tồn tại.');
            exName = exName || ex.name;
            cat = item.category || ex.category;
          }
          if (!exName) throw new ValidationError('Tên bài tập trong plan không được trống.');
          if (!CATEGORIES.has(cat)) throw new ValidationError('Loại bài tập không hợp lệ.');

          insertItem.run(
            planId,
            exId,
            exName,
            cat,
            item.targetSets !== undefined && item.targetSets !== null ? Number(item.targetSets) : null,
            item.targetReps !== undefined && item.targetReps !== null ? Number(item.targetReps) : null,
            item.targetWeightKg !== undefined && item.targetWeightKg !== null && item.targetWeightKg !== '' ? Number(item.targetWeightKg) : null,
            item.targetDurationMin !== undefined && item.targetDurationMin !== null ? Number(item.targetDurationMin) : null,
            idx
          );
        });

        db.exec('COMMIT');
      } catch (innerErr) {
        db.exec('ROLLBACK');
        throw innerErr;
      }

      const planRow = db.prepare('SELECT * FROM workout_plans WHERE id = ?').get(planId);
      const itemRows = db.prepare('SELECT * FROM workout_plan_items WHERE plan_id = ? ORDER BY sort_order ASC, id ASC').all(planId);
      res.status(201).json({ plan: mapPlan(planRow, itemRows.map(mapPlanItem)) });
    } catch (err) {
      next(err);
    }
  });

  router.put('/workout-plans/:id', (req, res, next) => {
    try {
      const planId = Number(req.params.id);
      const existing = db.prepare('SELECT * FROM workout_plans WHERE id = ? AND user_id = ?').get(planId, req.user.id);
      if (!existing) throw new NotFoundError('Không tìm thấy kế hoạch tập luyện.');

      const name = req.body?.name !== undefined ? String(req.body.name).trim() : existing.name;
      if (!name || name.length < 2) throw new ValidationError('Tên kế hoạch tập luyện cần ít nhất 2 ký tự.');
      const goal = req.body?.goal !== undefined ? String(req.body.goal).trim() : existing.goal;
      const daysOfWeek = Array.isArray(req.body?.daysOfWeek) ? JSON.stringify(req.body.daysOfWeek.map(String)) : existing.days_of_week;
      const notes = req.body?.notes !== undefined ? String(req.body.notes).trim() : existing.notes;

      db.exec('BEGIN');
      try {
        db.prepare(`
          UPDATE workout_plans
          SET name = ?, goal = ?, days_of_week = ?, notes = ?, updated_at = datetime('now')
          WHERE id = ? AND user_id = ?
        `).run(name, goal, daysOfWeek, notes, planId, req.user.id);

        if (Array.isArray(req.body?.items)) {
          db.prepare('DELETE FROM workout_plan_items WHERE plan_id = ?').run(planId);
          const insertItem = db.prepare(`
            INSERT INTO workout_plan_items (plan_id, exercise_id, exercise_name, category, target_sets, target_reps, target_weight_kg, target_duration_min, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          req.body.items.forEach((item, idx) => {
            const exId = item.exerciseId ? Number(item.exerciseId) : null;
            const exName = String(item.exerciseName || '').trim();
            const cat = String(item.category || 'strength');
            if (!exName) throw new ValidationError('Tên bài tập không được trống.');
            insertItem.run(
              planId,
              exId,
              exName,
              cat,
              item.targetSets ?? null,
              item.targetReps ?? null,
              item.targetWeightKg ?? null,
              item.targetDurationMin ?? null,
              idx
            );
          });
        }
        db.exec('COMMIT');
      } catch (innerErr) {
        db.exec('ROLLBACK');
        throw innerErr;
      }

      const planRow = db.prepare('SELECT * FROM workout_plans WHERE id = ?').get(planId);
      const itemRows = db.prepare('SELECT * FROM workout_plan_items WHERE plan_id = ? ORDER BY sort_order ASC, id ASC').all(planId);
      res.json({ plan: mapPlan(planRow, itemRows.map(mapPlanItem)) });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/workout-plans/:id', (req, res, next) => {
    try {
      const planId = Number(req.params.id);
      const del = db.prepare('DELETE FROM workout_plans WHERE id = ? AND user_id = ?').run(planId, req.user.id);
      if (del.changes === 0) throw new NotFoundError('Không tìm thấy kế hoạch tập luyện.');
      res.json({ deleted: true });
    } catch (err) {
      next(err);
    }
  });

  router.post('/workout-plans/:id/complete', (req, res, next) => {
    try {
      const planId = Number(req.params.id);
      const date = req.body?.date ? String(req.body.date) : todayIso();
      if (!DATE_RE.test(date)) throw new ValidationError('Định dạng ngày phải là YYYY-MM-DD.');

      const plan = db.prepare('SELECT * FROM workout_plans WHERE id = ? AND user_id = ?').get(planId, req.user.id);
      if (!plan) throw new NotFoundError('Không tìm thấy kế hoạch tập luyện.');

      const items = db.prepare('SELECT * FROM workout_plan_items WHERE plan_id = ? ORDER BY sort_order ASC, id ASC').all(planId);
      if (items.length === 0) throw new ValidationError('Kế hoạch chưa có bài tập nào để ghi nhận.');

      const inserted = [];
      const insertLog = db.prepare(`
        INSERT INTO workout_logs (user_id, plan_id, exercise_id, date, title, category, sets, reps, weight_kg, duration_min, distance_km, calories_burned, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
      `);

      db.exec('BEGIN');
      try {
        for (const item of items) {
          const durationMin = item.target_duration_min || (item.category === 'strength' ? (item.target_sets || 3) * 4 : 25);
          const calories = estimateCalories(db, req.user.id, {
            exerciseId: item.exercise_id,
            category: item.category,
            durationMin
          });
          const r = insertLog.run(
            req.user.id,
            planId,
            item.exercise_id,
            date,
            item.exercise_name,
            item.category,
            item.target_sets,
            item.target_reps,
            item.target_weight_kg,
            durationMin,
            calories,
            `Từ kế hoạch: ${plan.name}`
          );
          inserted.push(mapWorkoutLog(db.prepare('SELECT * FROM workout_logs WHERE id = ?').get(Number(r.lastInsertRowid))));
        }
        db.exec('COMMIT');
      } catch (innerErr) {
        db.exec('ROLLBACK');
        throw innerErr;
      }

      res.status(201).json({ logs: inserted });
    } catch (err) {
      next(err);
    }
  });

  router.get('/workout-logs', (req, res, next) => {
    try {
      const date = req.query.date ? String(req.query.date) : todayIso();
      if (!DATE_RE.test(date)) throw new ValidationError('Định dạng ngày phải là YYYY-MM-DD.');

      const rows = db.prepare('SELECT * FROM workout_logs WHERE user_id = ? AND date = ? ORDER BY id ASC').all(req.user.id, date);
      const logs = rows.map(mapWorkoutLog);
      const totalDurationMin = Math.round(logs.reduce((acc, l) => acc + l.durationMin, 0));
      const totalCaloriesBurned = Math.round(logs.reduce((acc, l) => acc + l.caloriesBurned, 0));

      res.json({
        date,
        logs,
        summary: {
          count: logs.length,
          totalDurationMin,
          totalCaloriesBurned
        }
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/workout-logs', (req, res, next) => {
    try {
      const date = req.body?.date ? String(req.body.date) : todayIso();
      if (!DATE_RE.test(date)) throw new ValidationError('Định dạng ngày phải là YYYY-MM-DD.');

      const exerciseId = req.body?.exerciseId ? Number(req.body.exerciseId) : null;
      const planId = req.body?.planId ? Number(req.body.planId) : null;
      let title = String(req.body?.title || '').trim();
      let category = String(req.body?.category || 'strength');

      if (exerciseId) {
        const ex = db.prepare('SELECT * FROM exercises WHERE id = ? AND (user_id IS NULL OR user_id = ?)').get(exerciseId, req.user.id);
        if (!ex) throw new NotFoundError('Không tìm thấy bài tập.');
        title = title || ex.name;
        category = req.body?.category || ex.category;
      }

      if (!title || title.length < 2) throw new ValidationError('Tên bài tập không được trống.');
      if (!CATEGORIES.has(category)) throw new ValidationError('Loại bài tập không hợp lệ.');

      const durationMin = Number(req.body?.durationMin ?? 20);
      if (!Number.isFinite(durationMin) || durationMin <= 0 || durationMin > 600) {
        throw new ValidationError('Thời lượng tập phải từ 1 đến 600 phút.');
      }

      const sets = req.body?.sets !== undefined && req.body.sets !== null && req.body.sets !== '' ? Number(req.body.sets) : null;
      const reps = req.body?.reps !== undefined && req.body.reps !== null && req.body.reps !== '' ? Number(req.body.reps) : null;
      const weightKg = req.body?.weightKg !== undefined && req.body.weightKg !== null && req.body.weightKg !== '' ? Number(req.body.weightKg) : null;
      const distanceKm = req.body?.distanceKm !== undefined && req.body.distanceKm !== null && req.body.distanceKm !== '' ? Number(req.body.distanceKm) : null;
      const notes = String(req.body?.notes || '').trim();

      const caloriesBurned = req.body?.caloriesBurned !== undefined && req.body.caloriesBurned !== null && req.body.caloriesBurned !== ''
        ? Math.max(0, Math.round(Number(req.body.caloriesBurned)))
        : estimateCalories(db, req.user.id, { exerciseId, category, durationMin });

      const result = db.prepare(`
        INSERT INTO workout_logs (user_id, plan_id, exercise_id, date, title, category, sets, reps, weight_kg, duration_min, distance_km, calories_burned, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(req.user.id, planId, exerciseId, date, title, category, sets, reps, weightKg, durationMin, distanceKm, caloriesBurned, notes);

      const created = db.prepare('SELECT * FROM workout_logs WHERE id = ?').get(Number(result.lastInsertRowid));
      res.status(201).json({ log: mapWorkoutLog(created) });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/workout-logs/:id', (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const del = db.prepare('DELETE FROM workout_logs WHERE id = ? AND user_id = ?').run(id, req.user.id);
      if (del.changes === 0) throw new NotFoundError('Không tìm thấy buổi tập.');
      res.json({ deleted: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
