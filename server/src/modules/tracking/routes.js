import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { NotFoundError, ValidationError } from '../../middleware/errorHandler.js';
import { calculateBodyMetrics } from '../identity/calculator.js';
import { computeWaterTargetMl } from '../nutrition/routes.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(isoDate, offset) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function mapWeight(row) {
  return {
    id: row.id,
    date: row.date,
    weightKg: row.weight_kg,
    note: row.note,
    createdAt: row.created_at
  };
}

export function createTrackingRouter(db) {
  const router = Router();
  router.use(requireAuth);

  router.get('/tracking/weights', (req, res) => {
    const days = Math.min(365, Math.max(7, Number(req.query.days) || 30));
    const cutoff = addDays(todayIso(), -days);
    const rows = db
      .prepare('SELECT * FROM weight_logs WHERE user_id = ? AND date >= ? ORDER BY date ASC')
      .all(req.user.id, cutoff);
    res.json({ weights: rows.map(mapWeight) });
  });

  router.post('/tracking/weights', (req, res, next) => {
    try {
      const date = req.body?.date ? String(req.body.date).slice(0, 10) : todayIso();
      const weightKg = Number(req.body?.weightKg);
      const note = String(req.body?.note || '').trim();

      if (!DATE_RE.test(date)) {
        throw new ValidationError('Định dạng ngày phải là YYYY-MM-DD.');
      }
      if (!Number.isFinite(weightKg) || weightKg < 25 || weightKg > 300) {
        throw new ValidationError('Cân nặng hợp lệ phải từ 25 kg đến 300 kg.');
      }

      db.prepare(`
        INSERT INTO weight_logs (user_id, date, weight_kg, note)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, date) DO UPDATE SET weight_kg = excluded.weight_kg, note = excluded.note
      `).run(req.user.id, date, weightKg, note);

      const latest = db
        .prepare('SELECT date, weight_kg FROM weight_logs WHERE user_id = ? ORDER BY date DESC LIMIT 1')
        .get(req.user.id);
      if (latest) {
        db.prepare("UPDATE profiles SET weight_kg = ?, updated_at = datetime('now') WHERE user_id = ?")
          .run(latest.weight_kg, req.user.id);
      }

      const row = db.prepare('SELECT * FROM weight_logs WHERE user_id = ? AND date = ?').get(req.user.id, date);
      res.status(201).json({ weight: mapWeight(row) });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/tracking/weights/:id', (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const del = db.prepare('DELETE FROM weight_logs WHERE id = ? AND user_id = ?').run(id, req.user.id);
      if (del.changes === 0) throw new NotFoundError('Không tìm thấy bản ghi cân nặng.');
      res.json({ deleted: true });
    } catch (err) {
      next(err);
    }
  });

  router.get('/tracking/dashboard', (req, res, next) => {
    try {
      const date = req.query.date ? String(req.query.date) : todayIso();
      if (!DATE_RE.test(date)) {
        throw new ValidationError('Định dạng ngày phải là YYYY-MM-DD.');
      }
      const days = Math.min(30, Math.max(3, Number(req.query.days) || 7));
      const startDate = addDays(date, -(days - 1));

      const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.user.id);
      if (!profile) throw new NotFoundError('Không tìm thấy hồ sơ.');

      const metrics = calculateBodyMetrics({
        gender: profile.gender,
        age: profile.age,
        heightCm: profile.height_cm,
        weightKg: profile.weight_kg,
        activityLevel: profile.activity_level,
        goalType: profile.goal_type
      });

      const foodToday = db.prepare(`
        SELECT
          COALESCE(SUM(calories), 0) AS calories,
          COALESCE(SUM(protein_g), 0) AS proteinG,
          COALESCE(SUM(carbs_g), 0) AS carbsG,
          COALESCE(SUM(fat_g), 0) AS fatG,
          COUNT(*) AS count
        FROM food_logs
        WHERE user_id = ? AND date = ?
      `).get(req.user.id, date);

      const workoutToday = db.prepare(`
        SELECT
          COALESCE(SUM(calories_burned), 0) AS caloriesBurned,
          COALESCE(SUM(duration_min), 0) AS durationMin,
          COUNT(*) AS count
        FROM workout_logs
        WHERE user_id = ? AND date = ?
      `).get(req.user.id, date);

      const waterToday = db
        .prepare('SELECT COALESCE(SUM(amount_ml), 0) AS totalMl FROM water_logs WHERE user_id = ? AND date = ?')
        .get(req.user.id, date);
      const waterTargetMl = computeWaterTargetMl(profile.weight_kg);

      const caloriesIn = Math.round(foodToday.calories);
      const caloriesOut = Math.round(workoutToday.caloriesBurned);
      const netCalories = caloriesIn - caloriesOut;
      const remainingCalories = metrics.targetCalories - netCalories;

      let status = 'on_track';
      if (caloriesIn === 0 && caloriesOut === 0) {
        status = 'empty';
      } else if (netCalories > metrics.targetCalories + 150) {
        status = 'over';
      } else if (netCalories < metrics.targetCalories - 450) {
        status = 'under';
      }

      const foodSeriesRows = db.prepare(`
        SELECT date, COALESCE(SUM(calories), 0) AS calories
        FROM food_logs
        WHERE user_id = ? AND date BETWEEN ? AND ?
        GROUP BY date
      `).all(req.user.id, startDate, date);

      const workoutSeriesRows = db.prepare(`
        SELECT date, COALESCE(SUM(calories_burned), 0) AS caloriesBurned
        FROM workout_logs
        WHERE user_id = ? AND date BETWEEN ? AND ?
        GROUP BY date
      `).all(req.user.id, startDate, date);

      const weightSeriesRows = db.prepare(`
        SELECT date, weight_kg
        FROM weight_logs
        WHERE user_id = ? AND date BETWEEN ? AND ?
        ORDER BY date ASC
      `).all(req.user.id, startDate, date);

      const foodByDate = new Map(foodSeriesRows.map((r) => [r.date, Math.round(r.calories)]));
      const workoutByDate = new Map(workoutSeriesRows.map((r) => [r.date, Math.round(r.caloriesBurned)]));
      const weightByDate = new Map(weightSeriesRows.map((r) => [r.date, r.weight_kg]));

      const series = [];
      for (let i = 0; i < days; i++) {
        const d = addDays(startDate, i);
        series.push({
          date: d,
          caloriesIn: foodByDate.get(d) || 0,
          caloriesOut: workoutByDate.get(d) || 0,
          weightKg: weightByDate.get(d) ?? null
        });
      }

      // Compute active streak up to `date`
      const activeDates = new Set(
        db.prepare(`
          SELECT date FROM food_logs WHERE user_id = ? AND date <= ?
          UNION
          SELECT date FROM workout_logs WHERE user_id = ? AND date <= ?
        `).all(req.user.id, date, req.user.id, date).map((r) => r.date)
      );

      let streakDays = 0;
      for (let i = 0; i < 60; i++) {
        const check = addDays(date, -i);
        if (activeDates.has(check)) {
          streakDays += 1;
        } else {
          break;
        }
      }

      res.json({
        date,
        today: {
          caloriesIn,
          caloriesOut,
          netCalories,
          targetCalories: metrics.targetCalories,
          remainingCalories,
          status,
          macros: {
            proteinG: Number(foodToday.proteinG.toFixed(1)),
            carbsG: Number(foodToday.carbsG.toFixed(1)),
            fatG: Number(foodToday.fatG.toFixed(1)),
            targets: metrics.macroTargets
          },
          mealsCount: foodToday.count,
          workoutsCount: workoutToday.count,
          workoutMinutes: Math.round(workoutToday.durationMin),
          waterMl: waterToday.totalMl,
          waterTargetMl
        },
        profileSummary: {
          weightKg: profile.weight_kg,
          targetWeightKg: profile.target_weight_kg,
          goalType: profile.goal_type,
          bmi: metrics.bmi,
          bmiCategory: metrics.bmiCategory,
          tdee: metrics.tdee
        },
        streakDays,
        series
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/tracking/export', (req, res, next) => {
    try {
      const format = String(req.query.format || 'json').trim().toLowerCase();
      if (!['json', 'csv'].includes(format)) {
        throw new ValidationError('Định dạng xuất hỗ trợ json hoặc csv.');
      }

      const user = db.prepare('SELECT id, email, display_name, created_at FROM users WHERE id = ?').get(req.user.id);
      const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.user.id);
      const foodLogs = db.prepare('SELECT * FROM food_logs WHERE user_id = ? ORDER BY date DESC, id DESC').all(req.user.id);
      const workoutLogs = db.prepare('SELECT * FROM workout_logs WHERE user_id = ? ORDER BY date DESC, id DESC').all(req.user.id);
      const weightLogs = db.prepare('SELECT * FROM weight_logs WHERE user_id = ? ORDER BY date DESC').all(req.user.id);
      const waterLogs = db.prepare('SELECT * FROM water_logs WHERE user_id = ? ORDER BY date DESC, id DESC').all(req.user.id);

      const dateTag = todayIso();
      if (format === 'csv') {
        const escapeCsv = (v) => {
          const s = String(v ?? '');
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const rows = [['type', 'date', 'title', 'category', 'quantity', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'note']];
        for (const f of foodLogs) {
          rows.push(['food', f.date, f.food_name, f.meal_type, `${f.servings} x ${f.serving_label}`, f.calories, f.protein_g, f.carbs_g, f.fat_g, '']);
        }
        for (const w of workoutLogs) {
          rows.push(['workout', w.date, w.title, w.category, `${w.duration_min} min`, -w.calories_burned, '', '', '', w.notes]);
        }
        for (const wt of weightLogs) {
          rows.push(['weight', wt.date, 'Cân nặng', 'body', `${wt.weight_kg} kg`, '', '', '', '', wt.note]);
        }
        for (const dr of waterLogs) {
          rows.push(['water', dr.date, 'Nước uống', 'hydration', `${dr.amount_ml} ml`, '', '', '', '', '']);
        }
        const csv = '\uFEFF' + rows.map((r) => r.map(escapeCsv).join(',')).join('\n');
        res.set('Content-Type', 'text/csv; charset=utf-8');
        res.set('Content-Disposition', `attachment; filename="nhip-khoe-export-${dateTag}.csv"`);
        return res.send(csv);
      }

      const payload = {
        exportedAt: new Date().toISOString(),
        user,
        profile,
        foodLogs,
        workoutLogs,
        weightLogs,
        waterLogs
      };
      res.set('Content-Type', 'application/json; charset=utf-8');
      res.set('Content-Disposition', `attachment; filename="nhip-khoe-export-${dateTag}.json"`);
      return res.send(JSON.stringify(payload, null, 2));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
