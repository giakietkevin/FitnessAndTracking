# Nhịp Khỏe — Fitness & Tracking Web App

Ứng dụng web theo dõi dinh dưỡng tự nhiên, tính calo & macro (Protein/Carbs/Fat), lập kế hoạch & nhật ký tập luyện (Gym/Cardio) và theo dõi biến thiên cân nặng cá nhân.

## Kiến trúc & Công nghệ

- **Backend (`server/`):** Node.js (ESM), Express 5, SQLite tích hợp (`node:sqlite` với WAL & Foreign Keys), JWT Auth (`jsonwebtoken`), `bcryptjs`. Chia theo Modular Monolith gồm 4 module: `identity`, `nutrition`, `workout`, `tracking`.
- **Frontend (`web/`):** React 19, Vite 6, Tailwind CSS v4 (không gian theo dõi tương tác tại `/app.html`) kết hợp trang giới thiệu theo bộ chuẩn `design-taste-frontend` tại `/`.
- **Tài liệu thiết kế:**
  - Intent: [docs/intent/fitness-tracking.md](docs/intent/fitness-tracking.md)
  - Spec & Capability Map: [spec/SPEC-v1.md](spec/SPEC-v1.md), [spec/capability-map.md](spec/capability-map.md)
  - Kế hoạch & Checklist: [tasks/plan.md](tasks/plan.md), [tasks/todo.md](tasks/todo.md)

## Yêu cầu môi trường

- **Node.js 22+** (khuyên dùng 24+, hỗ trợ `node:sqlite` sẵn không cần cài thêm database ngoài hay Docker).

## Cài đặt và chạy

1. Cài dependencies cho toàn bộ workspace:
   ```bash
   npm install
   ```

2. Chạy đồng thời Backend API (`http://localhost:3001`) và Frontend (`http://localhost:5173`):
   ```bash
   npm run dev
   ```
   - Trang giới thiệu: `http://localhost:5173/`
   - Ứng dụng theo dõi (Đăng ký / Onboarding / Dashboard): `http://localhost:5173/app.html`

3. Chạy kiểm thử Backend (`node:test`):
   ```bash
   npm test
   ```

4. Build bản production của Frontend (`web/dist/`):
   ```bash
   npm run build
   ```
