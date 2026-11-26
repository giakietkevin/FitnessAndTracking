import { Router } from 'express';
import { requireAdmin, requireAuth } from '../../middleware/auth.js';
import { ConflictError, NotFoundError, ValidationError } from '../../middleware/errorHandler.js';

const MEAL_TYPES = new Set(['breakfast', 'lunch', 'dinner', 'snack']);
const SUBMISSION_STATUSES = new Set(['pending', 'approved', 'rejected']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

function mapFood(row) {
  return {
    id: row.id,
    isCustom: row.user_id !== null,
    name: row.name,
    category: row.category,
    servingLabel: row.serving_label,
    gramsPerServing: row.grams_per_serving,
    calories: row.calories,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    isNatural: Boolean(row.is_natural)
  };
}

function mapLog(row) {
  return {
    id: row.id,
    foodId: row.food_id,
    date: row.date,
    mealType: row.meal_type,
    foodName: row.food_name,
    servingLabel: row.serving_label,
    servings: row.servings,
    calories: row.calories,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    createdAt: row.created_at
  };
}

function mapSubmission(row) {
  return {
    id: row.id,
    userId: row.user_id,
    sourceFoodId: row.source_food_id,
    name: row.name,
    category: row.category,
    servingLabel: row.serving_label,
    gramsPerServing: row.grams_per_serving,
    calories: row.calories,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    isNatural: Boolean(row.is_natural),
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

function validateFoodPayload(raw, fallback = {}) {
  const name = String(raw?.name ?? fallback.name ?? '').trim();
  const category = String(raw?.category ?? fallback.category ?? 'general').trim() || 'general';
  const servingLabel = String(raw?.servingLabel ?? fallback.servingLabel ?? '1 phần').trim() || '1 phần';
  const gramsPerServing = Number(raw?.gramsPerServing ?? fallback.gramsPerServing ?? 100);
  const calories = Number(raw?.calories ?? fallback.calories);
  const proteinG = Number(raw?.proteinG ?? fallback.proteinG ?? 0);
  const carbsG = Number(raw?.carbsG ?? fallback.carbsG ?? 0);
  const fatG = Number(raw?.fatG ?? fallback.fatG ?? 0);
  const isNaturalRaw = raw?.isNatural !== undefined ? raw.isNatural : fallback.isNatural;
  const isNatural = isNaturalRaw === false || isNaturalRaw === 0 ? 0 : 1;

  if (!name || name.length < 2) {
    throw new ValidationError('Tên món ăn cần ít nhất 2 ký tự.');
  }
  if (!Number.isFinite(calories) || calories < 0 || calories > 5000) {
    throw new ValidationError('Lượng calo không hợp lệ.');
  }
  if ([proteinG, carbsG, fatG, gramsPerServing].some((v) => !Number.isFinite(v) || v < 0)) {
    throw new ValidationError('Chỉ số dinh dưỡng không được âm.');
  }

  return {
    name,
    category,
    servingLabel,
    gramsPerServing,
    calories: Math.round(calories),
    proteinG: Number(proteinG.toFixed(1)),
    carbsG: Number(carbsG.toFixed(1)),
    fatG: Number(fatG.toFixed(1)),
    isNatural
  };
}

function runInTransaction(db, fn) {
  db.exec('BEGIN');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore rollback errors if transaction was not active
    }
    throw err;
  }
}

export function computeWaterTargetMl(weightKg) {
  return Math.max(1500, Math.round((Number(weightKg) || 60) * 35));
}

function getUserWaterTarget(db, userId) {
  const row = db.prepare('SELECT weight_kg FROM profiles WHERE user_id = ?').get(userId);
  return computeWaterTargetMl(row?.weight_kg);
}

function hydrateCombo(db, comboRow) {
  const items = db
    .prepare('SELECT * FROM meal_combo_items WHERE combo_id = ? ORDER BY id ASC')
    .all(comboRow.id)
    .map((it) => ({
      id: it.id,
      foodId: it.food_id,
      foodName: it.food_name,
      servingLabel: it.serving_label,
      servings: it.servings,
      calories: it.calories,
      proteinG: it.protein_g,
      carbsG: it.carbs_g,
      fatG: it.fat_g
    }));

  const totals = summarizeFoodLogs(items.map((it) => ({ ...it, mealType: comboRow.default_meal_type })));
  return {
    id: comboRow.id,
    name: comboRow.name,
    defaultMealType: comboRow.default_meal_type,
    createdAt: comboRow.created_at,
    items,
    calories: totals.calories,
    proteinG: totals.proteinG,
    carbsG: totals.carbsG,
    fatG: totals.fatG
  };
}

export function summarizeFoodLogs(logs) {
  const byMeal = {
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    snack: 0
  };
  let calories = 0;
  let proteinG = 0;
  let carbsG = 0;
  let fatG = 0;

  for (const l of logs) {
    calories += l.calories;
    proteinG += l.proteinG;
    carbsG += l.carbsG;
    fatG += l.fatG;
    if (byMeal[l.mealType] !== undefined) {
      byMeal[l.mealType] = Math.round(byMeal[l.mealType] + l.calories);
    }
  }

  return {
    calories: Math.round(calories),
    proteinG: Number(proteinG.toFixed(1)),
    carbsG: Number(carbsG.toFixed(1)),
    fatG: Number(fatG.toFixed(1)),
    byMeal
  };
}

export function createNutritionRouter(db) {
  const router = Router();
  router.use(requireAuth);

  router.get('/foods', (req, res) => {
    const q = normalizeText(req.query.q || '').trim();
    const category = String(req.query.category || '').trim().toLowerCase();
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 120));

    let sql = 'SELECT * FROM foods WHERE (user_id IS NULL OR user_id = ?)';
    const params = [req.user.id];

    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }
    sql += ' ORDER BY CASE WHEN user_id IS NOT NULL THEN 0 ELSE 1 END, id ASC';

    let rows = db.prepare(sql).all(...params);
    if (q) {
      rows = rows.filter((r) => normalizeText(r.name).includes(q));
    }
    res.json({ foods: rows.slice(0, limit).map(mapFood) });
  });

  router.post('/foods', (req, res, next) => {
    try {
      const payload = validateFoodPayload(req.body);
      const submitForPublic = Boolean(req.body?.submitForPublic);
      const submissionNote = String(req.body?.submissionNote || req.body?.note || '').trim().slice(0, 400);

      const { created, submission } = runInTransaction(db, () => {
        const result = db.prepare(`
          INSERT INTO foods (user_id, name, category, serving_label, grams_per_serving, calories, protein_g, carbs_g, fat_g, is_natural)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          req.user.id,
          payload.name,
          payload.category,
          payload.servingLabel,
          payload.gramsPerServing,
          payload.calories,
          payload.proteinG,
          payload.carbsG,
          payload.fatG,
          payload.isNatural
        );

        const createdRow = db.prepare('SELECT * FROM foods WHERE id = ?').get(Number(result.lastInsertRowid));
        let createdSubmission = null;
        if (submitForPublic) {
          const subRes = db.prepare(`
            INSERT INTO food_submissions (
              user_id, source_food_id, name, category, serving_label, grams_per_serving,
              calories, protein_g, carbs_g, fat_g, is_natural, note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            req.user.id,
            createdRow.id,
            payload.name,
            payload.category,
            payload.servingLabel,
            payload.gramsPerServing,
            payload.calories,
            payload.proteinG,
            payload.carbsG,
            payload.fatG,
            payload.isNatural,
            submissionNote
          );
          createdSubmission = db
            .prepare('SELECT * FROM food_submissions WHERE id = ?')
            .get(Number(subRes.lastInsertRowid));
        }
        return { created: createdRow, submission: createdSubmission };
      });

      res.status(201).json({
        food: mapFood(created),
        submission: submission ? mapSubmission(submission) : null
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/food-submissions/mine', (req, res) => {
    const rows = db
      .prepare('SELECT * FROM food_submissions WHERE user_id = ? ORDER BY id DESC')
      .all(req.user.id);
    res.json({ submissions: rows.map(mapSubmission) });
  });

  router.post('/food-submissions', (req, res, next) => {
    try {
      const note = String(req.body?.note || '').trim().slice(0, 400);
      const sourceFoodId = req.body?.sourceFoodId ? Number(req.body.sourceFoodId) : null;
      let payload;

      if (sourceFoodId) {
        const owned = db
          .prepare('SELECT * FROM foods WHERE id = ? AND user_id = ?')
          .get(sourceFoodId, req.user.id);
        if (!owned) {
          throw new NotFoundError('Không tìm thấy món ăn tùy chỉnh của bạn để gửi duyệt.');
        }
        const existingPending = db
          .prepare("SELECT id FROM food_submissions WHERE user_id = ? AND source_food_id = ? AND status = 'pending'")
          .get(req.user.id, sourceFoodId);
        if (existingPending) {
          throw new ConflictError('Món ăn này đang có yêu cầu chờ Admin duyệt rồi.');
        }
        payload = validateFoodPayload(req.body, {
          name: owned.name,
          category: owned.category,
          servingLabel: owned.serving_label,
          gramsPerServing: owned.grams_per_serving,
          calories: owned.calories,
          proteinG: owned.protein_g,
          carbsG: owned.carbs_g,
          fatG: owned.fat_g,
          isNatural: owned.is_natural
        });
      } else {
        payload = validateFoodPayload(req.body);
        const normName = normalizeText(payload.name);
        const pendingMine = db
          .prepare("SELECT name FROM food_submissions WHERE user_id = ? AND status = 'pending'")
          .all(req.user.id);
        if (pendingMine.some((r) => normalizeText(r.name) === normName)) {
          throw new ConflictError('Bạn đã gửi một yêu cầu tương tự đang chờ duyệt.');
        }
      }

      const subRes = db.prepare(`
        INSERT INTO food_submissions (
          user_id, source_food_id, name, category, serving_label, grams_per_serving,
          calories, protein_g, carbs_g, fat_g, is_natural, note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.user.id,
        sourceFoodId,
        payload.name,
        payload.category,
        payload.servingLabel,
        payload.gramsPerServing,
        payload.calories,
        payload.proteinG,
        payload.carbsG,
        payload.fatG,
        payload.isNatural,
        note
      );

      const created = db
        .prepare('SELECT * FROM food_submissions WHERE id = ?')
        .get(Number(subRes.lastInsertRowid));
      res.status(201).json({ submission: mapSubmission(created) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/admin/food-submissions', requireAdmin, (req, res, next) => {
    try {
      const status = String(req.query.status || 'pending').trim().toLowerCase();
      let sql = `
        SELECT fs.*, u.display_name AS submitter_name, u.email AS submitter_email
        FROM food_submissions fs
        JOIN users u ON u.id = fs.user_id
      `;
      const params = [];
      if (status && status !== 'all') {
        if (!SUBMISSION_STATUSES.has(status)) {
          throw new ValidationError('Trạng thái lọc không hợp lệ.');
        }
        sql += ' WHERE fs.status = ?';
        params.push(status);
      }
      sql += ' ORDER BY CASE WHEN fs.status = \'pending\' THEN 0 ELSE 1 END, fs.id DESC';

      const rows = db.prepare(sql).all(...params);
      const countRows = db
        .prepare('SELECT status, COUNT(*) AS cnt FROM food_submissions GROUP BY status')
        .all();
      const counts = { pending: 0, approved: 0, rejected: 0, all: 0 };
      for (const row of countRows) {
        if (counts[row.status] !== undefined) {
          counts[row.status] = row.cnt;
        }
        counts.all += row.cnt;
      }

      res.json({
        submissions: rows.map(mapSubmission),
        counts
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/admin/food-submissions/:id/approve', requireAdmin, (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const existing = db.prepare('SELECT * FROM food_submissions WHERE id = ?').get(id);
      if (!existing) {
        throw new NotFoundError('Không tìm thấy yêu cầu thêm món ăn.');
      }
      if (existing.status !== 'pending') {
        throw new ConflictError('Yêu cầu này đã được xử lý trước đó.');
      }

      const payload = validateFoodPayload(req.body, {
        name: existing.name,
        category: existing.category,
        servingLabel: existing.serving_label,
        gramsPerServing: existing.grams_per_serving,
        calories: existing.calories,
        proteinG: existing.protein_g,
        carbsG: existing.carbs_g,
        fatG: existing.fat_g,
        isNatural: existing.is_natural
      });
      const adminNote = String(req.body?.adminNote || '').trim().slice(0, 400);

      const normTarget = normalizeText(payload.name);
      const sharedFoods = db.prepare('SELECT id, name FROM foods WHERE user_id IS NULL').all();
      if (sharedFoods.some((f) => normalizeText(f.name) === normTarget)) {
        throw new ConflictError(
          `Món "${payload.name}" đã có trong thư viện chung. Bạn có thể sửa tên cụ thể hơn hoặc từ chối yêu cầu trùng lặp.`
        );
      }

      const { updatedSub, createdFood } = runInTransaction(db, () => {
        const foodRes = db.prepare(`
          INSERT INTO foods (user_id, name, category, serving_label, grams_per_serving, calories, protein_g, carbs_g, fat_g, is_natural)
          VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          payload.name,
          payload.category,
          payload.servingLabel,
          payload.gramsPerServing,
          payload.calories,
          payload.proteinG,
          payload.carbsG,
          payload.fatG,
          payload.isNatural
        );

        db.prepare(`
          UPDATE food_submissions
          SET name = ?, category = ?, serving_label = ?, grams_per_serving = ?,
              calories = ?, protein_g = ?, carbs_g = ?, fat_g = ?, is_natural = ?,
              status = 'approved', admin_note = ?, reviewed_by = ?, reviewed_at = datetime('now')
          WHERE id = ?
        `).run(
          payload.name,
          payload.category,
          payload.servingLabel,
          payload.gramsPerServing,
          payload.calories,
          payload.proteinG,
          payload.carbsG,
          payload.fatG,
          payload.isNatural,
          adminNote,
          req.user.id,
          id
        );

        const subRow = db.prepare(`
          SELECT fs.*, u.display_name AS submitter_name, u.email AS submitter_email
          FROM food_submissions fs
          JOIN users u ON u.id = fs.user_id
          WHERE fs.id = ?
        `).get(id);
        const foodRow = db.prepare('SELECT * FROM foods WHERE id = ?').get(Number(foodRes.lastInsertRowid));
        return { updatedSub: subRow, createdFood: foodRow };
      });

      res.json({
        submission: mapSubmission(updatedSub),
        food: mapFood(createdFood)
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/admin/food-submissions/:id/reject', requireAdmin, (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const existing = db.prepare('SELECT * FROM food_submissions WHERE id = ?').get(id);
      if (!existing) {
        throw new NotFoundError('Không tìm thấy yêu cầu thêm món ăn.');
      }
      if (existing.status !== 'pending') {
        throw new ConflictError('Yêu cầu này đã được xử lý trước đó.');
      }

      const adminNote = String(req.body?.adminNote || '').trim().slice(0, 400);
      db.prepare(`
        UPDATE food_submissions
        SET status = 'rejected', admin_note = ?, reviewed_by = ?, reviewed_at = datetime('now')
        WHERE id = ?
      `).run(adminNote, req.user.id, id);

      const updatedSub = db.prepare(`
        SELECT fs.*, u.display_name AS submitter_name, u.email AS submitter_email
        FROM food_submissions fs
        JOIN users u ON u.id = fs.user_id
        WHERE fs.id = ?
      `).get(id);

      res.json({ submission: mapSubmission(updatedSub) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/admin/overview', requireAdmin, (_req, res) => {
    const usersCount = db.prepare('SELECT COUNT(*) AS cnt FROM users').get().cnt;
    const sharedFoodsCount = db.prepare('SELECT COUNT(*) AS cnt FROM foods WHERE user_id IS NULL').get().cnt;
    const sharedExercisesCount = db.prepare('SELECT COUNT(*) AS cnt FROM exercises WHERE user_id IS NULL').get().cnt;
    const pendingFoodSubmissions = db
      .prepare("SELECT COUNT(*) AS cnt FROM food_submissions WHERE status = 'pending'")
      .get().cnt;
    const pendingExerciseSubmissions = db
      .prepare("SELECT COUNT(*) AS cnt FROM exercise_submissions WHERE status = 'pending'")
      .get().cnt;

    const cutoff7 = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
    const foodLogsLast7Days = db
      .prepare('SELECT COUNT(*) AS cnt FROM food_logs WHERE date >= ?')
      .get(cutoff7).cnt;
    const workoutLogsLast7Days = db
      .prepare('SELECT COUNT(*) AS cnt FROM workout_logs WHERE date >= ?')
      .get(cutoff7).cnt;

    res.json({
      usersCount,
      sharedFoodsCount,
      sharedExercisesCount,
      pendingFoodSubmissions,
      pendingExerciseSubmissions,
      foodLogsLast7Days,
      workoutLogsLast7Days
    });
  });

  router.put('/admin/foods/:id', requireAdmin, (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const existing = db.prepare('SELECT * FROM foods WHERE id = ? AND user_id IS NULL').get(id);
      if (!existing) {
        throw new NotFoundError('Không tìm thấy món ăn trong thư viện chung.');
      }

      const payload = validateFoodPayload(req.body, {
        name: existing.name,
        category: existing.category,
        servingLabel: existing.serving_label,
        gramsPerServing: existing.grams_per_serving,
        calories: existing.calories,
        proteinG: existing.protein_g,
        carbsG: existing.carbs_g,
        fatG: existing.fat_g,
        isNatural: existing.is_natural
      });

      const normName = normalizeText(payload.name);
      const others = db.prepare('SELECT id, name FROM foods WHERE user_id IS NULL AND id != ?').all(id);
      if (others.some((f) => normalizeText(f.name) === normName)) {
        throw new ConflictError(`Món "${payload.name}" đã tồn tại trong thư viện chung.`);
      }

      db.prepare(`
        UPDATE foods
        SET name = ?, category = ?, serving_label = ?, grams_per_serving = ?,
            calories = ?, protein_g = ?, carbs_g = ?, fat_g = ?, is_natural = ?
        WHERE id = ? AND user_id IS NULL
      `).run(
        payload.name,
        payload.category,
        payload.servingLabel,
        payload.gramsPerServing,
        payload.calories,
        payload.proteinG,
        payload.carbsG,
        payload.fatG,
        payload.isNatural,
        id
      );

      const updated = db.prepare('SELECT * FROM foods WHERE id = ?').get(id);
      res.json({ food: mapFood(updated) });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/admin/foods/:id', requireAdmin, (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const del = db.prepare('DELETE FROM foods WHERE id = ? AND user_id IS NULL').run(id);
      if (del.changes === 0) {
        throw new NotFoundError('Không tìm thấy món ăn trong thư viện chung.');
      }
      res.json({ deleted: true });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/foods/:id', (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const resDel = db.prepare('DELETE FROM foods WHERE id = ? AND user_id = ?').run(id, req.user.id);
      if (resDel.changes === 0) {
        throw new NotFoundError('Không tìm thấy món ăn tùy chỉnh của bạn.');
      }
      res.json({ deleted: true });
    } catch (err) {
      next(err);
    }
  });

  router.get('/food-logs', (req, res, next) => {
    try {
      const date = req.query.date ? String(req.query.date) : todayIso();
      if (!DATE_RE.test(date)) {
        throw new ValidationError('Định dạng ngày phải là YYYY-MM-DD.');
      }

      const rows = db
        .prepare('SELECT * FROM food_logs WHERE user_id = ? AND date = ? ORDER BY id ASC')
        .all(req.user.id, date);
      const logs = rows.map(mapLog);
      res.json({
        date,
        logs,
        summary: summarizeFoodLogs(logs)
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/food-logs', (req, res, next) => {
    try {
      const date = req.body?.date ? String(req.body.date) : todayIso();
      const mealType = String(req.body?.mealType || 'lunch');
      const servings = Number(req.body?.servings ?? 1);

      if (!DATE_RE.test(date)) {
        throw new ValidationError('Định dạng ngày phải là YYYY-MM-DD.');
      }
      if (!MEAL_TYPES.has(mealType)) {
        throw new ValidationError('Loại bữa ăn không hợp lệ.');
      }
      if (!Number.isFinite(servings) || servings <= 0 || servings > 50) {
        throw new ValidationError('Khẩu phần phải lớn hơn 0.');
      }

      let foodId = null;
      let foodName;
      let servingLabel;
      let calories;
      let proteinG;
      let carbsG;
      let fatG;

      if (req.body?.foodId) {
        const food = db
          .prepare('SELECT * FROM foods WHERE id = ? AND (user_id IS NULL OR user_id = ?)')
          .get(Number(req.body.foodId), req.user.id);
        if (!food) {
          throw new NotFoundError('Không tìm thấy món ăn đã chọn.');
        }
        foodId = food.id;
        foodName = food.name;
        servingLabel = food.serving_label;
        calories = Math.round(food.calories * servings);
        proteinG = Number((food.protein_g * servings).toFixed(1));
        carbsG = Number((food.carbs_g * servings).toFixed(1));
        fatG = Number((food.fat_g * servings).toFixed(1));
      } else {
        foodName = String(req.body?.foodName || '').trim();
        servingLabel = String(req.body?.servingLabel || '1 phần').trim();
        const baseCal = Number(req.body?.calories);
        const baseP = Number(req.body?.proteinG ?? 0);
        const baseC = Number(req.body?.carbsG ?? 0);
        const baseF = Number(req.body?.fatG ?? 0);

        if (!foodName || !Number.isFinite(baseCal) || baseCal < 0) {
          throw new ValidationError('Vui lòng chọn món ăn hoặc nhập tên và calo hợp lệ.');
        }
        calories = Math.round(baseCal * servings);
        proteinG = Number((baseP * servings).toFixed(1));
        carbsG = Number((baseC * servings).toFixed(1));
        fatG = Number((baseF * servings).toFixed(1));
      }

      const result = db.prepare(`
        INSERT INTO food_logs (user_id, food_id, date, meal_type, food_name, serving_label, servings, calories, protein_g, carbs_g, fat_g)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(req.user.id, foodId, date, mealType, foodName, servingLabel, servings, calories, proteinG, carbsG, fatG);

      const created = db.prepare('SELECT * FROM food_logs WHERE id = ?').get(Number(result.lastInsertRowid));
      res.status(201).json({ log: mapLog(created) });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/food-logs/:id', (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const del = db.prepare('DELETE FROM food_logs WHERE id = ? AND user_id = ?').run(id, req.user.id);
      if (del.changes === 0) {
        throw new NotFoundError('Không tìm thấy nhật ký bữa ăn.');
      }
      res.json({ deleted: true });
    } catch (err) {
      next(err);
    }
  });

  router.post('/food-logs/copy-day', (req, res, next) => {
    try {
      const fromDate = String(req.body?.fromDate || '').slice(0, 10);
      const toDate = req.body?.toDate ? String(req.body.toDate).slice(0, 10) : todayIso();
      const mealType = req.body?.mealType ? String(req.body.mealType) : '';

      if (!DATE_RE.test(fromDate) || !DATE_RE.test(toDate)) {
        throw new ValidationError('Định dạng ngày phải là YYYY-MM-DD.');
      }
      if (fromDate === toDate) {
        throw new ValidationError('Ngày nguồn và ngày đích phải khác nhau.');
      }
      if (mealType && !MEAL_TYPES.has(mealType)) {
        throw new ValidationError('Loại bữa ăn không hợp lệ.');
      }

      let sql = 'SELECT * FROM food_logs WHERE user_id = ? AND date = ?';
      const params = [req.user.id, fromDate];
      if (mealType) {
        sql += ' AND meal_type = ?';
        params.push(mealType);
      }
      sql += ' ORDER BY id ASC';

      const sourceRows = db.prepare(sql).all(...params);
      if (sourceRows.length === 0) {
        throw new NotFoundError('Ngày nguồn chưa có món ăn nào để sao chép.');
      }

      const insertStmt = db.prepare(`
        INSERT INTO food_logs (user_id, food_id, date, meal_type, food_name, serving_label, servings, calories, protein_g, carbs_g, fat_g)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      runInTransaction(db, () => {
        for (const r of sourceRows) {
          insertStmt.run(
            req.user.id,
            r.food_id,
            toDate,
            r.meal_type,
            r.food_name,
            r.serving_label,
            r.servings,
            r.calories,
            r.protein_g,
            r.carbs_g,
            r.fat_g
          );
        }
      });

      res.status(201).json({ copiedCount: sourceRows.length, toDate });
    } catch (err) {
      next(err);
    }
  });

  router.get('/water-logs', (req, res, next) => {
    try {
      const date = req.query.date ? String(req.query.date).slice(0, 10) : todayIso();
      if (!DATE_RE.test(date)) {
        throw new ValidationError('Định dạng ngày phải là YYYY-MM-DD.');
      }
      const rows = db
        .prepare('SELECT id, date, amount_ml AS amountMl, created_at AS createdAt FROM water_logs WHERE user_id = ? AND date = ? ORDER BY id DESC')
        .all(req.user.id, date);
      const totalMl = rows.reduce((sum, r) => sum + r.amountMl, 0);
      res.json({
        date,
        logs: rows,
        totalMl,
        targetMl: getUserWaterTarget(db, req.user.id)
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/water-logs', (req, res, next) => {
    try {
      const date = req.body?.date ? String(req.body.date).slice(0, 10) : todayIso();
      const amountMl = Math.round(Number(req.body?.amountMl));
      if (!DATE_RE.test(date)) {
        throw new ValidationError('Định dạng ngày phải là YYYY-MM-DD.');
      }
      if (!Number.isFinite(amountMl) || amountMl < 50 || amountMl > 3000) {
        throw new ValidationError('Lượng nước mỗi lần nhập từ 50 ml đến 3000 ml.');
      }

      const result = db
        .prepare('INSERT INTO water_logs (user_id, date, amount_ml) VALUES (?, ?, ?)')
        .run(req.user.id, date, amountMl);
      const created = db
        .prepare('SELECT id, date, amount_ml AS amountMl, created_at AS createdAt FROM water_logs WHERE id = ?')
        .get(Number(result.lastInsertRowid));
      const sumRow = db
        .prepare('SELECT COALESCE(SUM(amount_ml), 0) AS totalMl FROM water_logs WHERE user_id = ? AND date = ?')
        .get(req.user.id, date);

      res.status(201).json({
        log: created,
        totalMl: sumRow.totalMl,
        targetMl: getUserWaterTarget(db, req.user.id)
      });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/water-logs/:id', (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const del = db.prepare('DELETE FROM water_logs WHERE id = ? AND user_id = ?').run(id, req.user.id);
      if (del.changes === 0) {
        throw new NotFoundError('Không tìm thấy bản ghi uống nước.');
      }
      res.json({ deleted: true });
    } catch (err) {
      next(err);
    }
  });

  router.get('/meal-combos', (req, res) => {
    const combos = db
      .prepare('SELECT * FROM meal_combos WHERE user_id = ? ORDER BY id DESC')
      .all(req.user.id);
    res.json({ combos: combos.map((c) => hydrateCombo(db, c)) });
  });

  router.post('/meal-combos', (req, res, next) => {
    try {
      const name = String(req.body?.name || '').trim();
      const defaultMealType = String(req.body?.defaultMealType || req.body?.sourceMealType || 'lunch');
      if (!name || name.length < 2) {
        throw new ValidationError('Tên combo cần ít nhất 2 ký tự.');
      }
      if (!MEAL_TYPES.has(defaultMealType)) {
        throw new ValidationError('Loại bữa ăn không hợp lệ.');
      }

      let sourceItems = Array.isArray(req.body?.items) ? req.body.items : null;
      if (!sourceItems && req.body?.sourceDate) {
        const sourceDate = String(req.body.sourceDate).slice(0, 10);
        const sourceMealType = req.body?.sourceMealType ? String(req.body.sourceMealType) : '';
        if (!DATE_RE.test(sourceDate)) {
          throw new ValidationError('Ngày nguồn không hợp lệ.');
        }
        let sql = 'SELECT * FROM food_logs WHERE user_id = ? AND date = ?';
        const params = [req.user.id, sourceDate];
        if (sourceMealType) {
          if (!MEAL_TYPES.has(sourceMealType)) throw new ValidationError('Bữa nguồn không hợp lệ.');
          sql += ' AND meal_type = ?';
          params.push(sourceMealType);
        }
        sql += ' ORDER BY id ASC';
        sourceItems = db.prepare(sql).all(...params).map((r) => ({
          foodId: r.food_id,
          foodName: r.food_name,
          servingLabel: r.serving_label,
          servings: r.servings,
          calories: r.calories,
          proteinG: r.protein_g,
          carbsG: r.carbs_g,
          fatG: r.fat_g
        }));
      }

      if (!sourceItems || sourceItems.length === 0) {
        throw new ValidationError('Combo cần có ít nhất 1 món ăn.');
      }

      const comboRow = runInTransaction(db, () => {
        const resCombo = db
          .prepare('INSERT INTO meal_combos (user_id, name, default_meal_type) VALUES (?, ?, ?)')
          .run(req.user.id, name, defaultMealType);
        const comboId = Number(resCombo.lastInsertRowid);
        const insItem = db.prepare(`
          INSERT INTO meal_combo_items (combo_id, food_id, food_name, serving_label, servings, calories, protein_g, carbs_g, fat_g)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const it of sourceItems) {
          insItem.run(
            comboId,
            it.foodId ?? null,
            String(it.foodName || 'Món ăn').trim(),
            String(it.servingLabel || '1 phần').trim(),
            Number(it.servings ?? 1),
            Math.round(Number(it.calories ?? 0)),
            Number(it.proteinG ?? 0),
            Number(it.carbsG ?? 0),
            Number(it.fatG ?? 0)
          );
        }
        return db.prepare('SELECT * FROM meal_combos WHERE id = ?').get(comboId);
      });

      res.status(201).json({ combo: hydrateCombo(db, comboRow) });
    } catch (err) {
      next(err);
    }
  });

  router.post('/meal-combos/:id/apply', (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const combo = db.prepare('SELECT * FROM meal_combos WHERE id = ? AND user_id = ?').get(id, req.user.id);
      if (!combo) {
        throw new NotFoundError('Không tìm thấy combo bữa ăn.');
      }

      const date = req.body?.date ? String(req.body.date).slice(0, 10) : todayIso();
      const mealType = String(req.body?.mealType || combo.default_meal_type);
      if (!DATE_RE.test(date)) {
        throw new ValidationError('Định dạng ngày phải là YYYY-MM-DD.');
      }
      if (!MEAL_TYPES.has(mealType)) {
        throw new ValidationError('Loại bữa ăn không hợp lệ.');
      }

      const items = db.prepare('SELECT * FROM meal_combo_items WHERE combo_id = ? ORDER BY id ASC').all(id);
      const insertStmt = db.prepare(`
        INSERT INTO food_logs (user_id, food_id, date, meal_type, food_name, serving_label, servings, calories, protein_g, carbs_g, fat_g)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      runInTransaction(db, () => {
        for (const it of items) {
          insertStmt.run(
            req.user.id,
            it.food_id,
            date,
            mealType,
            it.food_name,
            it.serving_label,
            it.servings,
            it.calories,
            it.protein_g,
            it.carbs_g,
            it.fat_g
          );
        }
      });

      res.status(201).json({ appliedCount: items.length, date, mealType });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/meal-combos/:id', (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const del = db.prepare('DELETE FROM meal_combos WHERE id = ? AND user_id = ?').run(id, req.user.id);
      if (del.changes === 0) {
        throw new NotFoundError('Không tìm thấy combo bữa ăn.');
      }
      res.json({ deleted: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
