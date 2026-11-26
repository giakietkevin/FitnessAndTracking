import jwt from 'jsonwebtoken';
import { ForbiddenError, UnauthorizedError } from './errorHandler.js';

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return next(new UnauthorizedError());
  }
  const token = header.slice(7).trim();
  if (!token) {
    return next(new UnauthorizedError());
  }
  try {
    const payload = jwt.verify(token, req.app.locals.jwtSecret);
    req.user = { id: Number(payload.sub), email: payload.email };
    return next();
  } catch {
    return next(new UnauthorizedError());
  }
}

export function requireAdmin(req, _res, next) {
  if (!req.user?.id) {
    return next(new UnauthorizedError());
  }
  const row = req.app.locals.db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.id);
  if (!row || row.role !== 'admin') {
    return next(new ForbiddenError('Chỉ tài khoản Admin mới có quyền duyệt món ăn.'));
  }
  req.user.role = row.role;
  return next();
}
