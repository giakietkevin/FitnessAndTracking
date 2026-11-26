import jwt from 'jsonwebtoken';
import { UnauthorizedError } from './errorHandler.js';

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
