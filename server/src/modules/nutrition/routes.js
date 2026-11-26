import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { NotFoundError, ValidationError } from '../../middleware/errorHandler.js';

const MEAL_TYPES = new Set(['breakfast', 'lunch', 'dinner', 'snack']);
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
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));

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
      const name = String(req.body?.name || '').trim();
      const category = String(req.body?.category || 'general').trim();
      const servingLabel = String(req.body?.servingLabel || '1 phần').trim();
      const gramsPerServing = Number(req.body?.gramsPerServing ?? 100);
      const calories = Number(req.body?.calories);
      const proteinG = Number(req.body?.proteinG ?? 0);
      const carbsG = Number(req.body?.carbsG ?? 0);
      const fatG = Number(req.body?.fatG ?? 0);
      const isNatural = req.body?.isNatural === false ? 0 : 1;

      if (!name || name.length < 2) {
        throw new ValidationError('Tên món ăn cần ít nhất 2 ký tự.');
      }
      if (!Number.isFinite(calories) || calories < 0 || calories > 5000) {
        throw new ValidationError('Lượng calo không hợp lệ.');
      }
      if ([proteinG, carbsG, fatG, gramsPerServing].some((v) => !Number.isFinite(v) || v < 0)) {
        throw new ValidationError('Chỉ số dinh dưỡng không được âm.');
      }

      const result = db.prepare(`
        INSERT INTO foods (user_id, name, category, serving_label, grams_per_serving, calories, protein_g, carbs_g, fat_g, is_natural)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(req.user.id, name, category, servingLabel, gramsPerServing, calories, proteinG, carbsG, fatG, isNatural);

      const created = db.prepare('SELECT * FROM foods WHERE id = ?').get(Number(result.lastInsertRowid));
      res.status(201).json({ food: mapFood(created) });
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

  return router;
}
