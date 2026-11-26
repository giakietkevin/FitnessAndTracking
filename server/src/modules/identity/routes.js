import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '../../middleware/errorHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import { ACTIVITY_MULTIPLIERS, GOAL_CALORIE_OFFSET, calculateBodyMetrics } from './calculator.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatProfileResponse(user, profile) {
  const metrics = calculateBodyMetrics({
    gender: profile.gender,
    age: profile.age,
    heightCm: profile.height_cm,
    weightKg: profile.weight_kg,
    activityLevel: profile.activity_level,
    goalType: profile.goal_type
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role || 'user',
      createdAt: user.created_at
    },
    profile: {
      gender: profile.gender,
      age: profile.age,
      heightCm: profile.height_cm,
      weightKg: profile.weight_kg,
      activityLevel: profile.activity_level,
      goalType: profile.goal_type,
      targetWeightKg: profile.target_weight_kg,
      targetDate: profile.target_date,
      onboarded: Boolean(profile.onboarded),
      updatedAt: profile.updated_at
    },
    metrics
  };
}

function issueToken(user, jwtSecret) {
  return jwt.sign({ sub: String(user.id), email: user.email }, jwtSecret, { expiresIn: '7d' });
}

export function createIdentityRouter(db, jwtSecret) {
  const router = Router();

  router.post('/auth/register', (req, res, next) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      const displayName = String(req.body?.displayName || '').trim();

      if (!EMAIL_RE.test(email)) {
        throw new ValidationError('Email không đúng định dạng.');
      }
      if (password.length < 6) {
        throw new ValidationError('Mật khẩu cần ít nhất 6 ký tự.');
      }
      if (!displayName || displayName.length < 2) {
        throw new ValidationError('Tên hiển thị cần ít nhất 2 ký tự.');
      }

      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) {
        throw new ConflictError('Email này đã được đăng ký.');
      }

      const passwordHash = bcrypt.hashSync(password, 10);
      let userId;
      db.exec('BEGIN');
      try {
        const result = db.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)').run(email, passwordHash, displayName);
        userId = Number(result.lastInsertRowid);
        db.prepare('INSERT INTO profiles (user_id) VALUES (?)').run(userId);
        db.exec('COMMIT');
      } catch (txErr) {
        db.exec('ROLLBACK');
        throw txErr;
      }

      const user = db.prepare('SELECT id, email, display_name, role, created_at FROM users WHERE id = ?').get(userId);
      const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId);
      const token = issueToken(user, jwtSecret);

      res.status(201).json({
        token,
        ...formatProfileResponse(user, profile)
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/auth/login', (req, res, next) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');

      if (!email || !password) {
        throw new ValidationError('Vui lòng nhập đầy đủ email và mật khẩu.');
      }

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        throw new UnauthorizedError('Email hoặc mật khẩu không chính xác.');
      }

      const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(user.id);
      const token = issueToken(user, jwtSecret);

      res.json({
        token,
        ...formatProfileResponse(user, profile)
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/profile', requireAuth, (req, res, next) => {
    try {
      const user = db.prepare('SELECT id, email, display_name, role, created_at FROM users WHERE id = ?').get(req.user.id);
      if (!user) throw new NotFoundError('Không tìm thấy tài khoản.');
      const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.user.id);
      res.json(formatProfileResponse(user, profile));
    } catch (err) {
      next(err);
    }
  });

  router.put('/profile', requireAuth, (req, res, next) => {
    try {
      const currentUser = db.prepare('SELECT id, email, display_name, role, created_at FROM users WHERE id = ?').get(req.user.id);
      const currentProfile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.user.id);
      if (!currentUser || !currentProfile) throw new NotFoundError('Không tìm thấy hồ sơ.');

      const displayName = req.body?.displayName !== undefined ? String(req.body.displayName).trim() : currentUser.display_name;
      if (!displayName || displayName.length < 2) {
        throw new ValidationError('Tên hiển thị cần ít nhất 2 ký tự.');
      }

      const gender = req.body?.gender ?? currentProfile.gender;
      if (!['male', 'female', 'other'].includes(gender)) {
        throw new ValidationError('Giới tính không hợp lệ.');
      }

      const activityLevel = req.body?.activityLevel ?? currentProfile.activity_level;
      if (!ACTIVITY_MULTIPLIERS[activityLevel]) {
        throw new ValidationError('Mức độ vận động không hợp lệ.');
      }

      const goalType = req.body?.goalType ?? currentProfile.goal_type;
      if (GOAL_CALORIE_OFFSET[goalType] === undefined) {
        throw new ValidationError('Mục tiêu không hợp lệ.');
      }

      const age = req.body?.age ?? currentProfile.age;
      const heightCm = req.body?.heightCm ?? currentProfile.height_cm;
      const weightKg = req.body?.weightKg ?? currentProfile.weight_kg;
      const targetWeightKg = req.body?.targetWeightKg !== undefined
        ? (req.body.targetWeightKg === null || req.body.targetWeightKg === '' ? null : Number(req.body.targetWeightKg))
        : currentProfile.target_weight_kg;
      const targetDate = req.body?.targetDate !== undefined
        ? (req.body.targetDate ? String(req.body.targetDate).slice(0, 10) : null)
        : currentProfile.target_date;

      // Validates age, heightCm, weightKg
      calculateBodyMetrics({ gender, age, heightCm, weightKg, activityLevel, goalType });

      db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(displayName, req.user.id);
      db.prepare(`
        UPDATE profiles
        SET gender = ?, age = ?, height_cm = ?, weight_kg = ?,
            activity_level = ?, goal_type = ?, target_weight_kg = ?, target_date = ?,
            onboarded = 1, updated_at = datetime('now')
        WHERE user_id = ?
      `).run(
        gender,
        Number(age),
        Number(heightCm),
        Number(weightKg),
        activityLevel,
        goalType,
        targetWeightKg,
        targetDate,
        req.user.id
      );

      // Sync today's weight_logs entry so weight chart stays aligned
      const logDate = req.body?.date ? String(req.body.date).slice(0, 10) : todayIso();
      db.prepare(`
        INSERT INTO weight_logs (user_id, date, weight_kg, note)
        VALUES (?, ?, ?, 'Cập nhật từ hồ sơ')
        ON CONFLICT(user_id, date) DO UPDATE SET weight_kg = excluded.weight_kg
      `).run(req.user.id, logDate, Number(weightKg));

      const user = db.prepare('SELECT id, email, display_name, role, created_at FROM users WHERE id = ?').get(req.user.id);
      const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.user.id);
      res.json(formatProfileResponse(user, profile));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
