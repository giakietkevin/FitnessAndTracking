# Spec: Fitness & Tracking Web App — V1

Source Intent: [fitness-tracking.md](../docs/intent/fitness-tracking.md)  
Capability Map: [capability-map.md](./capability-map.md)

## 1. Objective
Xây dựng một ứng dụng web theo dõi sức khỏe toàn diện, gọn nhẹ và chạy được thật trên local (sẵn sàng host server cho nhiều người dùng từ 12+ tuổi sau này). Người dùng có thể thiết lập hồ sơ & mục tiêu để tính BMI/TDEE/calo khuyến nghị trong ≤ 1 phút, ghi nhận bữa ăn hàng ngày (tính calo & macro P/C/F với danh sách thực phẩm Việt Nam + món tự thêm), lập kế hoạch & log buổi tập (Gym/Cardio), và theo dõi tiến độ cân nặng + cán cân Calo In/Out qua dashboard trực quan.

## 2. Tech Stack
- **Runtime:** Node.js `v24+` (ESM)
- **Backend:** Express 5 (`express`), SQLite tích hợp (`node:sqlite` `DatabaseSync` với chế độ WAL & Foreign Keys), `bcryptjs` (hash mật khẩu), `jsonwebtoken` (JWT auth), `cors`, `helmet`
- **Frontend:** React 19 + Vite + Tailwind CSS v4 (app tương tác) kết hợp hệ thống thiết kế & kiểm định trình duyệt của `design-taste-frontend` (`public/assets/`, `starter.html` / landing route + checker/gate)
- **Testing:** `node:test` + `node:assert/strict` (Backend unit & HTTP integration tests qua Node native `fetch`); Vite build + `design-taste-frontend` headless Chrome consistency/layout/gate checks (Frontend)

## 3. Commands
```bash
# Cài dependencies (từ thư mục gốc)
npm install

# Chạy cả Backend API (port 3001) và Frontend Vite dev server (port 5173)
npm run dev

# Chạy riêng Backend / Frontend
npm run dev:server
npm run dev:web

# Chạy toàn bộ unit + integration tests backend
npm test

# Build frontend production bundle (kiểm tra biên dịch sạch)
npm run build
```

## 4. Project Structure
```text
d:\FitnessAndTracking\
├── docs/intent/                 # Statement of Intent đã chốt
├── spec/                        # Capability map & specification
├── tasks/                       # Kế hoạch triển khai & checklist tasks
├── server/                      # Modular Monolith Backend (Express + node:sqlite)
│   ├── src/
│   │   ├── app.js               # Express app factory (injectable DB cho test)
│   │   ├── index.js             # Entrypoint server (port 3001)
│   │   ├── db/
│   │   │   ├── database.js      # Kết nối SQLite, schema migrations, seed runner
│   │   │   └── seed.js          # Dữ liệu mẫu thực phẩm VN & bài tập cơ bản
│   │   ├── middleware/
│   │   │   ├── auth.js          # Verify JWT Bearer token
│   │   │   └── errorHandler.js  # Chuẩn hóa JSON error response
│   │   └── modules/
│   │       ├── identity/        # Auth, profile, BMI/TDEE/goal calculator
│   │       ├── nutrition/       # Foods CRUD, daily food logs, daily macros
│   │       ├── workout/         # Exercises, workout plans, workout logs
│   │       └── tracking/        # Weight logs, dashboard analytics summary
│   └── tests/                   # Unit & integration tests theo từng module
├── web/                         # React + Vite Frontend
│   ├── public/assets/           # Tài nguyên CSS/JS/motion/layout từ design-taste-frontend
│   ├── src/
│   │   ├── api/                 # Typed/clean HTTP client gọi /api/*
│   │   ├── components/          # UI components dùng chung
│   │   ├── pages/               # Landing, Auth/Onboarding, Dashboard, Nutrition, Workouts
│   │   └── App.jsx
│   └── index.html
└── package.json                 # Root workspace scripts (dev, test, build)
```

## 5. Code Style
Sử dụng ESM chuẩn (`import`/`export`), hàm nhỏ rõ trách nhiệm, early return khi validate input, trả HTTP status + cấu trúc lỗi thống nhất `{ error: { code, message } }`.

```javascript
export function calculateBodyMetrics({ gender, age, heightCm, weightKg, activityLevel, goalType }) {
  if (!heightCm || !weightKg || !age) {
    throw new ValidationError('Chiều cao, cân nặng và tuổi phải lớn hơn 0.');
  }
  const heightM = heightCm / 100;
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));
  const bmr =
    gender === 'female'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
      : 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  const tdee = Math.round(bmr * (ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.375));
  const targetCalories = Math.max(1200, tdee + (GOAL_CALORIE_OFFSET[goalType] ?? 0));
  return { bmi, bmr: Math.round(bmr), tdee, targetCalories };
}
```

## 6. Module Contracts (V1)
- **`identity` (`/api/auth/*`, `/api/profile`)**
  - `POST /api/auth/register` `{ email, password, displayName }` → `201` `{ token, user }`
  - `POST /api/auth/login` `{ email, password }` → `200` `{ token, user }`
  - `GET /api/profile` (Auth) → trả thông tin hồ sơ, mục tiêu & `{ bmi, bmr, tdee, targetCalories, macroTargets }`
  - `PUT /api/profile` (Auth) `{ displayName, gender, age, heightCm, weightKg, activityLevel, goalType, targetWeightKg, targetDate }` → tính lại chỉ số, tự ghi nhận điểm cân nặng mới nếu cân nặng thay đổi, trả hồ sơ cập nhật.
- **`nutrition` (`/api/foods*`, `/api/food-logs*`)**
  - `GET /api/foods?q=&limit=` (Auth) → tìm món hệ thống + món custom của user
  - `POST /api/foods` (Auth) `{ name, servingLabel, gramsPerServing, calories, proteinG, carbsG, fatG }` → tạo món tùy chỉnh
  - `GET /api/food-logs?date=YYYY-MM-DD` (Auth) → danh sách log theo 4 bữa (`breakfast`, `lunch`, `dinner`, `snack`) + tổng `{ calories, proteinG, carbsG, fatG }`
  - `POST /api/food-logs` (Auth) `{ date, mealType, foodId, servings }` → lưu & trả log kèm snapshot calo/macro tại thời điểm log
  - `DELETE /api/food-logs/:id` (Auth) → chỉ xóa được log thuộc user hiện tại
- **`workout` (`/api/exercises*`, `/api/workout-plans*`, `/api/workout-logs*`)**
  - `GET /api/exercises?type=&q=` (Auth) → thư viện bài tập Gym/Cardio có sẵn + custom
  - `GET /api/workout-plans` & `POST /api/workout-plans` & `PUT /api/workout-plans/:id` & `DELETE /api/workout-plans/:id` (Auth) → lập lịch tập (tên plan, các ngày trong tuần, danh sách bài tập + sets/reps/duration/targetWeight)
  - `GET /api/workout-logs?date=YYYY-MM-DD` & `POST /api/workout-logs` & `DELETE /api/workout-logs/:id` (Auth) → log buổi tập (từ plan hoặc tự chọn bài), tự ước tính `caloriesBurned`
- **`tracking` (`/api/tracking/*`)**
  - `GET /api/tracking/weights?days=30` & `POST /api/tracking/weights` `{ date, weightKg, note }` (Auth)
  - `GET /api/tracking/dashboard?date=YYYY-MM-DD&days=7` (Auth) → tổng hợp trong ngày (`caloriesIn`, `caloriesOut`, `netCalories`, `targetCalories`, `macros`, `mealsCount`, `workoutsCount`) + chuỗi dữ liệu `days` ngày gần nhất cho biểu đồ Calo In/Out và Biến thiên cân nặng.

## 7. Testing Strategy
- Mỗi vertical slice backend đều có test tự động bằng `node:test` dùng SQLite in-memory (`:memory:`), kiểm tra đủ happy path, validation lỗi (400), auth boundary (401/403 — user A không xem/xóa được dữ liệu user B).
- Frontend kiểm tra `npm run build` sạch không lỗi, sau đó chạy bộ kiểm tra trình duyệt thực của `design-taste-frontend` (`consistency.mjs`, `layout/check.mjs`, `gate.mjs`) trên build/dev server để đảm bảo responsive 1440 & 390, không vỡ layout hay copy lỗi.

## 8. Boundaries
- **Always:** Chạy `npm test` sau mỗi vertical slice backend; cô lập dữ liệu theo `user_id` trên mọi query; hash password bằng bcryptjs; giữ SQL chuẩn tương thích dễ chuyển sang PostgreSQL sau này.
- **Ask first:** Thêm dịch vụ ngoài trả phí, đổi cổng mặc định (3001/5173) nếu xung đột, hoặc mở rộng sang tính năng V2.
- **Never:** Commit file `.env` hoặc secret key cứng cho production; bỏ qua test fail; xóa dữ liệu user ngoài phạm vi tài khoản sở hữu; sửa file kit gốc trong `~/.gemini/config/plugins/taste-skill`.

## 9. Success Criteria
1. Dọn sạch stub microservices cũ (`gateway/`, `services/`, `shared/`, `database/`, `docker-compose.yml`), repo gọn rõ `server/` + `web/`.
2. `npm test` chạy toàn bộ test suites backend (identity, nutrition, workout, tracking) pass 100%.
3. `npm run build` biên dịch `web/` thành công không lỗi.
4. Trình duyệt kiểm chứng luồng end-to-end: Đăng ký → Onboarding (BMI/TDEE) → Log bữa ăn → Tạo & Log workout → Xem Dashboard biểu đồ cập nhật, đạt kiểm tra `design-taste-frontend` trên desktop & mobile.

## 10. Out of Scope (Deferred to V2)
- Đồng bộ thiết bị đeo (Apple Watch, Garmin) / đếm bước chân tự động — cần native SDK/OAuth bên thứ ba.
- Theo dõi giấc ngủ, nhắc nhở Push/SMS real-time — tách thành notification worker khi host server.
- Quét mã vạch & nhận diện món ăn bằng AI camera — cần tích hợp API thị giác & dữ liệu barcode.
- Mạng xã hội / chia sẻ bạn bè / thanh toán — chỉ cần khi mở public nhiều người dùng.
