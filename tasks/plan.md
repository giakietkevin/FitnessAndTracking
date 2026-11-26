# Implementation Plan: Fitness & Tracking Web App (V1)

Source spec: [SPEC-v1.md](../spec/SPEC-v1.md)

## Overview
Chuyển đổi repo `d:\FitnessAndTracking` từ bộ khung 4 microservices stub rỗng sang một ứng dụng Modular Monolith (Express + `node:sqlite`) và Frontend React + Vite, phát triển theo các vertical slices có kiểm thử tự động ở backend và kiểm chứng trình duyệt ở frontend.

## Architecture Decisions
- **Dùng `node:sqlite` (`DatabaseSync`) tích hợp sẵn trong Node 24:** Không cần biên dịch native C++ (`better-sqlite3`) trên Windows, chạy ổn định ngay với WAL mode & foreign keys; viết lớp query SQL chuẩn để sau này chuyển sang PostgreSQL dễ dàng.
- **Modular Monolith trong `server/src/modules/`:** Chia rõ 4 module độc lập (`identity`, `nutrition`, `workout`, `tracking`) với DB schema & router riêng, tiêm `db` qua `createApp({ db })` để chạy integration test cực nhanh trên `:memory:`.
- **Frontend `web/` (React + Vite + Tailwind + `design-taste-frontend` assets):** Trang landing/overview tuân thủ nghiêm ngặt layout, typography, palette và finish gate của `design-taste-frontend`, nối liền với app workspace (Dashboard, Nutrition Log, Workout Plan & Log, Body Profile).

## Task List

### Phase 1: Cleanup & Foundation
- [ ] Task 1: Dọn khung microservices stub cũ & khởi tạo cấu trúc `server/` + `web/` + root scripts
- [ ] Task 2: Dựng lõi `server/` (SQLite schema migrations, error handler, JWT middleware, seed data thực phẩm VN & bài tập)

### Checkpoint: Foundation
- [ ] Backend khởi tạo DB in-memory và healthcheck pass test

### Phase 2: Backend Vertical Slices (`incremental-implementation`)
- [ ] Task 3: Module `identity` — Register, Login, Profile & công thức BMI/BMR/TDEE/Macro + tests
- [ ] Task 4: Module `nutrition` — Foods search/custom + Daily Food Logs CRUD & tổng hợp calo/macro + tests
- [ ] Task 5: Module `workout` — Exercises + Workout Plans CRUD + Daily Workout Logs & tính calo tiêu hao + tests
- [ ] Task 6: Module `tracking` — Weight Logs + Dashboard Analytics summary (Calo In/Out, chuỗi ngày) + tests

### Checkpoint: Backend Complete
- [ ] `npm test` pass 100% cho cả 4 module & cô lập dữ liệu user

### Phase 3: Frontend (`design-taste-frontend`) & Integration
- [ ] Task 7: Khởi tạo `web/` (React + Vite + Tailwind) và tích hợp hệ thống token/assets của `design-taste-frontend`
- [ ] Task 8: Xây Landing & Auth/Onboarding flow (đăng ký/đăng nhập, thiết lập chỉ số cơ thể ≤ 1 phút)
- [ ] Task 9: Xây Workspace app (Dashboard biểu đồ Calo In/Out & Cân nặng, Nutrition Log ≤ 3 click, Workout Planner & Logger)
- [ ] Task 10: Kiểm định toàn diện (`npm test`, `npm run build`, `design-taste-frontend` browser checks & end-to-end flow)

### Checkpoint: Complete
- [ ] Tất cả acceptance criteria & finish gate đạt chuẩn

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| `node:sqlite` trên Node 24 in warning `ExperimentalWarning` | Thấp | Chạy ổn định trong kiểm thử thực tế; dùng `--no-warnings` nếu cần log sạch |
| Xung đột giữa cấu trúc landing của `design-taste-frontend` và app dashboard tương tác | Trung bình | Tách rõ landing page `/` chuẩn `design-taste-frontend` (hoặc shell sạch tuân thủ token/contrast/responsive) và app `/app/*`, kiểm tra cả hai qua headless Chrome |
| Lỗi CORS / proxy khi chạy local 2 cổng (5173 & 3001) | Trung bình | Cấu hình Vite `server.proxy['/api']` trỏ sang `http://localhost:3001` |
