# Task Checklist: Fitness & Tracking Web App (V1)

## Task 1: Cleanup legacy stubs & scaffold root workspace
- [x] Không còn thư mục stub microservices cũ
- [x] `package.json` gốc có scripts `dev`, `dev:server`, `dev:web`, `test`, `build`
- [x] `.gitignore` bỏ qua `node_modules/`, `*.db`, `*.sqlite*`, `.taste-skill/`, `shots/`, `dist/`

## Task 2: Server core, SQLite schema & seed data
- [x] `createDatabase(':memory:')` khởi tạo schema + seed 25 món ăn & 18 bài tập
- [x] `GET /api/health` trả về `200 { ok: true }`

## Checkpoint: Foundation
- [x] Server core khởi động được và test DB in-memory pass

## Task 3: Vertical slice `identity` (Auth + Profile + BMI/TDEE)
- [x] `POST /api/auth/register` & `POST /api/auth/login` hoạt động, mật khẩu hash bcryptjs, email trùng trả `409`
- [x] `GET /api/profile` & `PUT /api/profile` tính đúng BMI/BMR/TDEE/calo mục tiêu và tự thêm điểm cân nặng vào `weight_logs`

## Task 4: Vertical slice `nutrition` (Foods + Daily Food Logs)
- [x] Tìm kiếm món ăn tiếng Việt không dấu/có dấu phân biệt đúng món hệ thống và món riêng của từng user
- [x] Log bữa ăn lưu snapshot calo/macro theo `servings`, tổng hợp theo ngày chính xác; cô lập user

## Task 5: Vertical slice `workout` (Exercises + Plans + Workout Logs)
- [x] Tạo/cập nhật/xóa Workout Plan kèm danh sách bài tập + hoàn thành cả buổi 1 chạm
- [x] Log buổi tập tính `caloriesBurned` theo MET & cân nặng user, cô lập `user_id`

## Task 6: Vertical slice `tracking` (Weight History + Dashboard Summary)
- [x] Ghi nhận hoặc cập nhật cân nặng theo ngày (upsert theo `user_id` + `date`)
- [x] `GET /api/tracking/dashboard` trả đúng số liệu tổng hợp khớp dữ liệu từ `nutrition` và `workout`

## Checkpoint: Backend Complete
- [x] Toàn bộ 5 test suites (8/8 tests) backend pass 100%

## Task 7: Initialize `web/` & `design-taste-frontend` system
- [x] `web/` build sạch bằng `npm run build`
- [x] Trang landing chuẩn `design-taste-frontend` + bộ token `clay-pine` / `Instrument Sans`

## Task 8: Landing + Auth & 1-Minute Onboarding Flow
- [x] Đăng ký / đăng nhập và Onboarding thiết lập hồ sơ hoàn tất trong ≤ 1 phút
- [x] Token JWT lưu cục bộ và điều hướng vào Dashboard

## Task 9: Core App Workspace (Dashboard, Nutrition Log, Workout Planner & Logger)
- [x] Dashboard biểu đồ Calo In/Out & Cân nặng 7/14 ngày, Macro bars, cân nặng nhanh
- [x] Nhật ký dinh dưỡng log bữa ăn ≤ 3 chạm + tạo món tự nấu; Workout Planner & 1-click complete

## Task 10: Final Verification, Browser Checks & Gate
- [x] `npm test` (8/8 tests) và `npm run build` pass 100%, static serving `web/dist` trả 200 OK
- [x] `design-taste-frontend` finish gate (`gate.mjs`) đạt `GATE: PASS`
