import { Router } from 'express';
import { requireAdmin, requireAuth } from '../../middleware/auth.js';
import { ConflictError, NotFoundError, ValidationError } from '../../middleware/errorHandler.js';

const CATEGORIES = new Set(['strength', 'cardio', 'mobility']);
const SUBMISSION_STATUSES = new Set(['pending', 'approved', 'rejected']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_MET = { strength: 5.0, cardio: 7.5, mobility: 2.5 };

const WORKOUT_TEMPLATES = [
  {
    id: 'beginner-home',
    name: 'Vận động tại nhà (Người mới / 12+)',
    goal: 'maintain',
    level: 'Cơ bản · Không cần tạ',
    daysOfWeek: ['Mon', 'Wed', 'Fri'],
    notes: 'Phù hợp học sinh, sinh viên hoặc người mới tập tại nhà 30 phút/buổi.',
    exercises: [
      { name: 'Hít đất (Push-ups)', targetSets: 3, targetReps: 12, targetDurationMin: 10 },
      { name: 'Plank', targetSets: 3, targetReps: 1, targetDurationMin: 8 },
      { name: 'Nhảy dây (Jump Rope)', targetSets: 1, targetReps: 1, targetDurationMin: 12 },
      { name: 'Giãn cơ & Mobility', targetSets: 1, targetReps: 1, targetDurationMin: 10 }
    ]
  },
  {
    id: 'fat-loss-burn',
    name: 'Đốt mỡ toàn thân & Cardio (4 buổi)',
    goal: 'cut',
    level: 'Trung bình · Gym / Sân tập',
    daysOfWeek: ['Mon', 'Tue', 'Thu', 'Sat'],
    notes: 'Kết hợp bài tập đa khớp giữ cơ và cardio Zone 2 đốt mỡ bền vững.',
    exercises: [
      { name: 'Barbell Squat', targetSets: 3, targetReps: 10, targetDurationMin: 15 },
      { name: 'Barbell / Dumbbell Row', targetSets: 3, targetReps: 10, targetDurationMin: 15 },
      { name: 'Plank', targetSets: 3, targetReps: 1, targetDurationMin: 8 },
      { name: 'Chạy bộ ngoài trời (Zone 2)', targetSets: 1, targetReps: 1, targetDurationMin: 25 }
    ]
  },
  {
    id: 'muscle-upper-lower',
    name: 'Tăng cơ nền tảng Gym (4 buổi)',
    goal: 'bulk',
    level: 'Nền tảng · Phòng Gym',
    daysOfWeek: ['Mon', 'Tue', 'Thu', 'Fri'],
    notes: 'Tập trung các nhóm cơ lớn giúp tăng sức mạnh và khối lượng cơ bắp.',
    exercises: [
      { name: 'Barbell Squat', targetSets: 4, targetReps: 8, targetDurationMin: 18 },
      { name: 'Romanian Deadlift', targetSets: 3, targetReps: 10, targetDurationMin: 16 },
      { name: 'Bench Press', targetSets: 4, targetReps: 8, targetDurationMin: 18 },
      { name: 'Pull-up / Lat Pulldown', targetSets: 4, targetReps: 10, targetDurationMin: 16 },
      { name: 'Overhead Shoulder Press', targetSets: 3, targetReps: 10, targetDurationMin: 14 }
    ]
  }
];

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

function mapExerciseSubmission(row) {
  return {
    id: row.id,
    userId: row.user_id,
    sourceExerciseId: row.source_exercise_id,
    name: row.name,
    category: row.category,
    muscleGroup: row.muscle_group,
    metValue: row.met_value,
    defaultSets: row.default_sets,
    defaultReps: row.default_reps,
    defaultDurationMin: row.default_duration_min,
    note: row.note || '',
    status: row.status,
    adminNote: row.admin_note || '',
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    ...(row.submitter_name !== undefined ? { submitterName: row.submitter_name } : {}),
    ...(row.submitter_email !== undefined ? { submitterEmail: row.submitter_email } : {})
  };
}

function validateExercisePayload(raw, fallback = {}) {
  const name = String(raw?.name ?? fallback.name ?? '').trim();
  const category = String(raw?.category ?? fallback.category ?? 'strength');
  const muscleGroup = String(raw?.muscleGroup ?? fallback.muscleGroup ?? 'full_body').trim() || 'full_body';
  const metValue = Number(raw?.metValue ?? fallback.metValue ?? DEFAULT_MET[category] ?? 5.0);
  const defaultSets = Math.round(Number(raw?.defaultSets ?? fallback.defaultSets ?? 3));
  const defaultReps = Math.round(Number(raw?.defaultReps ?? fallback.defaultReps ?? 10));
  const defaultDurationMin = Math.round(Number(raw?.defaultDurationMin ?? fallback.defaultDurationMin ?? 20));

  if (!name || name.length < 2) throw new ValidationError('Tên bài tập cần ít nhất 2 ký tự.');
  if (!CATEGORIES.has(category)) throw new ValidationError('Loại bài tập không hợp lệ.');
  if (!Number.isFinite(metValue) || metValue <= 0 || metValue > 25) {
    throw new ValidationError('Chỉ số MET phải từ 0.1 đến 25.');
  }

  return {
    name,
    category,
    muscleGroup,
    metValue: Number(metValue.toFixed(1)),
    defaultSets: Math.max(1, defaultSets),
    defaultReps: Math.max(1, defaultReps),
    defaultDurationMin: Math.max(1, defaultDurationMin)
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
      const payload = validateExercisePayload(req.body);
      const submitForPublic = Boolean(req.body?.submitForPublic);
      const submissionNote = String(req.body?.submissionNote || req.body?.note || '').trim().slice(0, 400);

      db.exec('BEGIN');
      let created;
      let submission = null;
      try {
        const result = db.prepare(`
          INSERT INTO exercises (user_id, name, category, muscle_group, met_value, default_sets, default_reps, default_duration_min)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          req.user.id,
          payload.name,
          payload.category,
          payload.muscleGroup,
          payload.metValue,
          payload.defaultSets,
          payload.defaultReps,
          payload.defaultDurationMin
        );
        created = db.prepare('SELECT * FROM exercises WHERE id = ?').get(Number(result.lastInsertRowid));

        if (submitForPublic) {
          const subRes = db.prepare(`
            INSERT INTO exercise_submissions (
              user_id, source_exercise_id, name, category, muscle_group, met_value,
              default_sets, default_reps, default_duration_min, note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            req.user.id,
            created.id,
            payload.name,
            payload.category,
            payload.muscleGroup,
            payload.metValue,
            payload.defaultSets,
            payload.defaultReps,
            payload.defaultDurationMin,
            submissionNote
          );
          submission = db.prepare('SELECT * FROM exercise_submissions WHERE id = ?').get(Number(subRes.lastInsertRowid));
        }
        db.exec('COMMIT');
      } catch (txErr) {
        db.exec('ROLLBACK');
        throw txErr;
      }

      res.status(201).json({
        exercise: mapExercise(created),
        submission: submission ? mapExerciseSubmission(submission) : null
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/exercise-submissions/mine', (req, res) => {
    const rows = db
      .prepare('SELECT * FROM exercise_submissions WHERE user_id = ? ORDER BY id DESC')
      .all(req.user.id);
    res.json({ submissions: rows.map(mapExerciseSubmission) });
  });

  router.post('/exercise-submissions', (req, res, next) => {
    try {
      const payload = validateExercisePayload(req.body);
      const note = String(req.body?.note || '').trim().slice(0, 400);
      const normName = normalizeText(payload.name);
      const pendingMine = db
        .prepare("SELECT name FROM exercise_submissions WHERE user_id = ? AND status = 'pending'")
        .all(req.user.id);
      if (pendingMine.some((r) => normalizeText(r.name) === normName)) {
        throw new ConflictError('Bạn đã gửi một đề xuất bài tập tương tự đang chờ duyệt.');
      }

      const subRes = db.prepare(`
        INSERT INTO exercise_submissions (
          user_id, name, category, muscle_group, met_value,
          default_sets, default_reps, default_duration_min, note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.user.id,
        payload.name,
        payload.category,
        payload.muscleGroup,
        payload.metValue,
        payload.defaultSets,
        payload.defaultReps,
        payload.defaultDurationMin,
        note
      );
      const created = db.prepare('SELECT * FROM exercise_submissions WHERE id = ?').get(Number(subRes.lastInsertRowid));
      res.status(201).json({ submission: mapExerciseSubmission(created) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/admin/exercise-submissions', requireAdmin, (req, res, next) => {
    try {
      const status = String(req.query.status || 'pending').trim().toLowerCase();
      let sql = `
        SELECT es.*, u.display_name AS submitter_name, u.email AS submitter_email
        FROM exercise_submissions es
        JOIN users u ON u.id = es.user_id
      `;
      const params = [];
      if (status && status !== 'all') {
        if (!SUBMISSION_STATUSES.has(status)) throw new ValidationError('Trạng thái lọc không hợp lệ.');
        sql += ' WHERE es.status = ?';
        params.push(status);
      }
      sql += " ORDER BY CASE WHEN es.status = 'pending' THEN 0 ELSE 1 END, es.id DESC";

      const rows = db.prepare(sql).all(...params);
      const countRows = db.prepare('SELECT status, COUNT(*) AS cnt FROM exercise_submissions GROUP BY status').all();
      const counts = { pending: 0, approved: 0, rejected: 0, all: 0 };
      for (const r of countRows) {
        if (counts[r.status] !== undefined) counts[r.status] = r.cnt;
        counts.all += r.cnt;
      }
      res.json({ submissions: rows.map(mapExerciseSubmission), counts });
    } catch (err) {
      next(err);
    }
  });

  router.post('/admin/exercise-submissions/:id/approve', requireAdmin, (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const existing = db.prepare('SELECT * FROM exercise_submissions WHERE id = ?').get(id);
      if (!existing) throw new NotFoundError('Không tìm thấy yêu cầu bài tập.');
      if (existing.status !== 'pending') throw new ConflictError('Yêu cầu này đã được xử lý trước đó.');

      const payload = validateExercisePayload(req.body, {
        name: existing.name,
        category: existing.category,
        muscleGroup: existing.muscle_group,
        metValue: existing.met_value,
        defaultSets: existing.default_sets,
        defaultReps: existing.default_reps,
        defaultDurationMin: existing.default_duration_min
      });
      const adminNote = String(req.body?.adminNote || '').trim().slice(0, 400);

      const normTarget = normalizeText(payload.name);
      const shared = db.prepare('SELECT id, name FROM exercises WHERE user_id IS NULL').all();
      if (shared.some((ex) => normalizeText(ex.name) === normTarget)) {
        throw new ConflictError(`Bài tập "${payload.name}" đã có trong thư viện chung.`);
      }

      db.exec('BEGIN');
      let updatedSub;
      let createdEx;
      try {
        const exRes = db.prepare(`
          INSERT INTO exercises (user_id, name, category, muscle_group, met_value, default_sets, default_reps, default_duration_min)
          VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          payload.name,
          payload.category,
          payload.muscleGroup,
          payload.metValue,
          payload.defaultSets,
          payload.defaultReps,
          payload.defaultDurationMin
        );

        db.prepare(`
          UPDATE exercise_submissions
          SET name = ?, category = ?, muscle_group = ?, met_value = ?,
              default_sets = ?, default_reps = ?, default_duration_min = ?,
              status = 'approved', admin_note = ?, reviewed_by = ?, reviewed_at = datetime('now')
          WHERE id = ?
        `).run(
          payload.name,
          payload.category,
          payload.muscleGroup,
          payload.metValue,
          payload.defaultSets,
          payload.defaultReps,
          payload.defaultDurationMin,
          adminNote,
          req.user.id,
          id
        );

        updatedSub = db.prepare(`
          SELECT es.*, u.display_name AS submitter_name, u.email AS submitter_email
          FROM exercise_submissions es
          JOIN users u ON u.id = es.user_id
          WHERE es.id = ?
        `).get(id);
        createdEx = db.prepare('SELECT * FROM exercises WHERE id = ?').get(Number(exRes.lastInsertRowid));
        db.exec('COMMIT');
      } catch (txErr) {
        db.exec('ROLLBACK');
        throw txErr;
      }

      res.json({ submission: mapExerciseSubmission(updatedSub), exercise: mapExercise(createdEx) });
    } catch (err) {
      next(err);
    }
  });

  router.post('/admin/exercise-submissions/:id/reject', requireAdmin, (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const existing = db.prepare('SELECT * FROM exercise_submissions WHERE id = ?').get(id);
      if (!existing) throw new NotFoundError('Không tìm thấy yêu cầu bài tập.');
      if (existing.status !== 'pending') throw new ConflictError('Yêu cầu này đã được xử lý trước đó.');

      const adminNote = String(req.body?.adminNote || '').trim().slice(0, 400);
      db.prepare(`
        UPDATE exercise_submissions
        SET status = 'rejected', admin_note = ?, reviewed_by = ?, reviewed_at = datetime('now')
        WHERE id = ?
      `).run(adminNote, req.user.id, id);

      const updatedSub = db.prepare(`
        SELECT es.*, u.display_name AS submitter_name, u.email AS submitter_email
        FROM exercise_submissions es
        JOIN users u ON u.id = es.user_id
        WHERE es.id = ?
      `).get(id);

      res.json({ submission: mapExerciseSubmission(updatedSub) });
    } catch (err) {
      next(err);
    }
  });

  router.put('/admin/exercises/:id', requireAdmin, (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const existing = db.prepare('SELECT * FROM exercises WHERE id = ? AND user_id IS NULL').get(id);
      if (!existing) throw new NotFoundError('Không tìm thấy bài tập trong thư viện chung.');

      const payload = validateExercisePayload(req.body, {
        name: existing.name,
        category: existing.category,
        muscleGroup: existing.muscle_group,
        metValue: existing.met_value,
        defaultSets: existing.default_sets,
        defaultReps: existing.default_reps,
        defaultDurationMin: existing.default_duration_min
      });

      const normName = normalizeText(payload.name);
      const others = db.prepare('SELECT id, name FROM exercises WHERE user_id IS NULL AND id != ?').all(id);
      if (others.some((ex) => normalizeText(ex.name) === normName)) {
        throw new ConflictError(`Bài tập "${payload.name}" đã tồn tại trong thư viện chung.`);
      }

      db.prepare(`
        UPDATE exercises
        SET name = ?, category = ?, muscle_group = ?, met_value = ?,
            default_sets = ?, default_reps = ?, default_duration_min = ?
        WHERE id = ? AND user_id IS NULL
      `).run(
        payload.name,
        payload.category,
        payload.muscleGroup,
        payload.metValue,
        payload.defaultSets,
        payload.defaultReps,
        payload.defaultDurationMin,
        id
      );

      const updated = db.prepare('SELECT * FROM exercises WHERE id = ?').get(id);
      res.json({ exercise: mapExercise(updated) });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/admin/exercises/:id', requireAdmin, (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const del = db.prepare('DELETE FROM exercises WHERE id = ? AND user_id IS NULL').run(id);
      if (del.changes === 0) throw new NotFoundError('Không tìm thấy bài tập trong thư viện chung.');
      res.json({ deleted: true });
    } catch (err) {
      next(err);
    }
  });

  router.get('/workout-plans/templates', (_req, res) => {
    res.json({ templates: WORKOUT_TEMPLATES });
  });

  router.post('/workout-plans/from-template', (req, res, next) => {
    try {
      const templateId = String(req.body?.templateId || '').trim();
      const tpl = WORKOUT_TEMPLATES.find((t) => t.id === templateId);
      if (!tpl) {
        throw new NotFoundError('Không tìm thấy lộ trình mẫu.');
      }

      db.exec('BEGIN');
      let planId;
      try {
        const resPlan = db.prepare(`
          INSERT INTO workout_plans (user_id, name, goal, days_of_week, notes)
          VALUES (?, ?, ?, ?, ?)
        `).run(req.user.id, tpl.name, tpl.goal, JSON.stringify(tpl.daysOfWeek), tpl.notes);
        planId = Number(resPlan.lastInsertRowid);

        const findEx = db.prepare('SELECT * FROM exercises WHERE user_id IS NULL AND name = ? LIMIT 1');
        const insertItem = db.prepare(`
          INSERT INTO workout_plan_items (plan_id, exercise_id, exercise_name, category, target_sets, target_reps, target_weight_kg, target_duration_min, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)
        `);

        tpl.exercises.forEach((item, idx) => {
          const ex = findEx.get(item.name);
          insertItem.run(
            planId,
            ex ? ex.id : null,
            ex ? ex.name : item.name,
            ex ? ex.category : 'strength',
            item.targetSets ?? null,
            item.targetReps ?? null,
            item.targetDurationMin ?? 20,
            idx
          );
        });
        db.exec('COMMIT');
      } catch (txErr) {
        db.exec('ROLLBACK');
        throw txErr;
      }

      const created = db.prepare('SELECT * FROM workout_plans WHERE id = ?').get(planId);
      const createdItems = db
        .prepare('SELECT * FROM workout_plan_items WHERE plan_id = ? ORDER BY sort_order ASC')
        .all(planId)
        .map(mapPlanItem);
      res.status(201).json({ plan: mapPlan(created, createdItems) });
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
