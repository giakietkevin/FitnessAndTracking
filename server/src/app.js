import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler.js';
import { createIdentityRouter } from './modules/identity/routes.js';
import { createNutritionRouter } from './modules/nutrition/routes.js';
import { createWorkoutRouter } from './modules/workout/routes.js';
import { createTrackingRouter } from './modules/tracking/routes.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultDistDir = path.resolve(here, '..', '..', 'web', 'dist');

export function createApp({
  db,
  jwtSecret = process.env.JWT_SECRET || 'dev-fitness-secret-change-in-prod',
  serveWeb = true
}) {
  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json());

  app.locals.db = db;
  app.locals.jwtSecret = jwtSecret;

  app.get('/api/health', (_req, res) => {
    const row = db.prepare('SELECT 1 AS ok').get();
    res.json({ ok: row?.ok === 1, timestamp: new Date().toISOString() });
  });

  app.use('/api', createIdentityRouter(db, jwtSecret));
  app.use('/api', createNutritionRouter(db));
  app.use('/api', createWorkoutRouter(db));
  app.use('/api', createTrackingRouter(db));

  if (serveWeb && fs.existsSync(defaultDistDir)) {
    app.use(express.static(defaultDistDir));
  }

  app.use(errorHandler);
  return app;
}
