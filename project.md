📄 Product Requirements Document (PRD): Fitness & Tracking Website1. Tổng quan dự án (Overview)Tên dự án: Fitness & Tracking Web AppMục tiêu: Xây dựng một nền tảng web toàn diện, dễ sử dụng giúp mọi đối tượng người dùng theo dõi chế độ dinh dưỡng tự nhiên và quản lý lịch trình tập luyện. Hệ thống cần hỗ trợ theo dõi các mục tiêu dài hạn (ví dụ: các chiến dịch độ dáng 5 tháng) với các cột mốc cụ thể.Đối tượng sử dụng: Tất cả mọi người (người mới bắt đầu, người tập gym phong trào, dân chạy bộ, hoặc người cần theo dõi calo chặt chẽ).2. Các luồng người dùng cốt lõi (User Flows)Onboarding: Đăng ký ➔ Nhập chỉ số cơ thể (Chiều cao, Cân nặng, Tuổi) ➔ Đặt mục tiêu (Mốc thời gian hoàn thành, ví dụ: Tháng 9/2026) ➔ Khởi tạo Dashboard.Daily Tracking: Đăng nhập ➔ Ghi nhận thực đơn các bữa ăn ➔ Ghi nhận bài tập trong ngày (Gym, chạy bộ, kháng lực) ➔ Xem tổng quan Calo In/Out.Progress Review: Vào mục Thống kê ➔ Xem biểu đồ thay đổi cân nặng ➔ Đánh giá mức độ bám sát kế hoạch.3. Yêu cầu tính năng chi tiết (Feature Requirements)3.1. Quản lý người dùng & Hồ sơ (User Profile)Đăng ký / Đăng nhập (Email, Password, OAuth).Quản lý chỉ số TDEE (Total Daily Energy Expenditure), BMI.Thiết lập và chỉnh sửa mục tiêu (Tăng cơ, Giảm mỡ, Duy trì cân nặng).3.2. Theo dõi Dinh dưỡng (Nutrition Tracking)Food Database (Cơ sở dữ liệu thực phẩm): Cho phép tìm kiếm hoặc tự thêm thủ công các món ăn (bao gồm macro: Protein, Fat, Carbs).Daily Log: Ghi chép bữa sáng, trưa, tối, ăn vặt. Ưu tiên theo dõi các thực phẩm dinh dưỡng tự nhiên (tự nấu, không qua chế biến sâu).Cảnh báo: Hiển thị thanh tiến độ Calo trong ngày. Cảnh báo nếu nạp quá mức hoặc thiếu hụt so với mục tiêu.3.3. Theo dõi Tập luyện (Exercise Tracking)Phân loại bài tập:Cardio: Chạy bộ (Ghi nhận quãng đường, thời gian, pace).Gym / Resistance: Kháng lực (Ghi nhận số Hiệp/Sets, Số lần/Reps, Mức tạ/Weights).Thư viện bài tập: Tích hợp sẵn danh sách các bài tập cơ bản hoặc cho phép tạo Custom Workout.3.4. Dashboard & Báo cáo (Analytics)Giao diện tổng quan hiển thị ngay khi đăng nhập.Biểu đồ đường (Line chart) theo dõi biến thiên cân nặng theo chu kỳ tuần/tháng.Biểu đồ cột (Bar chart) so sánh lượng Calo nạp vào và tiêu hao.4. Yêu cầu phi chức năng (Non-Functional Requirements)Hạng mụcChi tiếtHiệu năng (Performance)Tải trang Dashboard dưới 2 giây. Các thao tác ghi nhận (Log food/workout) phải mượt mà, phản hồi ngay lập tức (Optimistic UI).Giao diện (UI/UX)Hỗ trợ Responsive hoàn toàn (Mobile-first design) vì người dùng thường nhập dữ liệu bằng điện thoại khi ở phòng tập. Ưu tiên phong cách Minimalist (Tối giản).Bảo mật (Security)Hash password, bảo vệ các API endpoint bằng JWT, không lộ dữ liệu sức khỏe của người dùng A cho người dùng B.5. Đề xuất Kiến trúc Kỹ thuật (Technical Stack)Frontend: React, Tailwind CSS (cho giao diện linh hoạt, dễ tùy biến), kết hợp Framer Motion (cho các animation chuyển trang mượt mà).Backend: Node.js (Express/NestJS) hoặc C# .NET.Database: SQL Server hoặc PostgreSQL (Quản lý các bảng quan hệ chặt chẽ giữa User - Food - Workout - DailyLogs).6. Tiêu chí nghiệm thu (Acceptance Criteria)[ ] Người dùng mới có thể hoàn thành thiết lập profile trong vòng 1 phút.[ ] Có thể ghi nhận 1 bữa ăn hoặc 1 buổi tập chỉ với tối đa 3 cú click chuột.[ ] Biểu đồ thống kê tự động render lại (re-render) ngay khi dữ liệu mới được nhập vào hệ thống.

---

## 7. Quy trình phát triển dự án — Các Phase (Development Roadmap)

### 📌 Phase 0: Khởi tạo dự án & Thiết lập môi trường (Project Setup) — ~1 tuần
**Mục tiêu:** Đặt nền móng kỹ thuật, đảm bảo team có thể bắt tay vào code ngay.

- [ ] Khởi tạo Repository (Git), thiết lập branching strategy (main / develop / feature branches).
- [ ] Khởi tạo project Frontend (React + Vite/CRA, Tailwind CSS, Framer Motion).
- [ ] Khởi tạo project Backend (Node.js Express hoặc NestJS, hoặc C# .NET).
- [ ] Thiết kế Database Schema (ERD) cho các bảng: `Users`, `BodyMetrics`, `Foods`, `DailyFoodLogs`, `Exercises`, `DailyWorkoutLogs`, `Goals`.
- [ ] Cài đặt Database (SQL Server / PostgreSQL), chạy migration khởi tạo.
- [ ] Thiết lập CI/CD cơ bản (build, lint, test tự động).
- [ ] Thiết lập cấu trúc thư mục, coding conventions, ESLint/Prettier.

**Deliverable:** Skeleton project chạy được (Hello World) ở cả Frontend & Backend, DB schema sẵn sàng.

---

### 📌 Phase 1: Quản lý Người dùng & Xác thực (Authentication & User Profile) — ~2 tuần
**Mục tiêu:** Người dùng có thể đăng ký, đăng nhập, và thiết lập hồ sơ cá nhân.

- [ ] **Backend:**
  - [ ] API Đăng ký (Register) — hash password (bcrypt), validate input.
  - [ ] API Đăng nhập (Login) — trả về JWT access token + refresh token.
  - [ ] API OAuth (Google/Facebook) — tùy chọn.
  - [ ] Middleware xác thực JWT cho các route bảo vệ.
  - [ ] API CRUD Hồ sơ người dùng (Chiều cao, Cân nặng, Tuổi, Giới tính).
  - [ ] Logic tính toán TDEE, BMI tự động dựa trên chỉ số cơ thể.

- [ ] **Frontend:**
  - [ ] Trang Đăng ký / Đăng nhập (Responsive, Mobile-first).
  - [ ] Form nhập chỉ số cơ thể (Onboarding flow).
  - [ ] Trang Hồ sơ cá nhân — hiển thị & chỉnh sửa thông tin, xem TDEE/BMI.
  - [ ] Quản lý state xác thực (Context/Redux), Protected Routes.

**Deliverable:** Flow hoàn chỉnh: Đăng ký → Onboarding → Xem Profile. JWT hoạt động.

---

### 📌 Phase 2: Thiết lập Mục tiêu (Goal Setting) — ~1 tuần
**Mục tiêu:** Người dùng đặt được mục tiêu cá nhân (Tăng cơ / Giảm mỡ / Duy trì) với mốc thời gian.

- [ ] **Backend:**
  - [ ] API CRUD Goals — loại mục tiêu, cân nặng mục tiêu, ngày bắt đầu, ngày kết thúc.
  - [ ] Logic tính lượng Calo khuyến nghị mỗi ngày dựa trên TDEE + mục tiêu.

- [ ] **Frontend:**
  - [ ] UI đặt mục tiêu (chọn loại, nhập số liệu, chọn mốc thời gian).
  - [ ] Hiển thị mục tiêu hiện tại trên Dashboard (tóm tắt).
  - [ ] Trang chỉnh sửa / cập nhật mục tiêu.

**Deliverable:** Người dùng hoàn thành thiết lập mục tiêu trong ≤ 1 phút (Acceptance Criteria #1).

---

### 📌 Phase 3: Theo dõi Dinh dưỡng (Nutrition Tracking) — ~3 tuần
**Mục tiêu:** Ghi nhận bữa ăn hàng ngày, theo dõi Calo & Macro.

- [ ] **Backend:**
  - [ ] Xây dựng Food Database — bảng `Foods` với các trường: tên, calo, protein, fat, carbs (mỗi 100g).
  - [ ] Seed data thực phẩm tự nhiên phổ biến (Việt Nam: cơm, trứng, ức gà, rau xanh, khoai lang, chuối...).
  - [ ] API tìm kiếm Food (search by name, pagination).
  - [ ] API thêm Food tùy chỉnh (Custom food).
  - [ ] API CRUD DailyFoodLog — ghi nhận bữa ăn (Sáng/Trưa/Tối/Ăn vặt), khối lượng, ngày.
  - [ ] API tổng hợp Calo & Macro theo ngày.

- [ ] **Frontend:**
  - [ ] Trang Nhật ký Dinh dưỡng (Daily Nutrition Log):
    - [ ] Giao diện chia theo bữa (Sáng, Trưa, Tối, Ăn vặt).
    - [ ] Nút "Thêm món" → Modal tìm kiếm / thêm Food → Nhập khối lượng → Lưu.
    - [ ] Optimistic UI: cập nhật UI ngay lập tức trước khi API phản hồi.
  - [ ] Thanh tiến độ Calo trong ngày (Progress bar so với mục tiêu).
  - [ ] Cảnh báo khi nạp quá mức hoặc thiếu hụt (visual alert).
  - [ ] Biểu đồ Macro breakdown (Donut/Pie chart: Protein / Fat / Carbs).

**Deliverable:** Ghi nhận 1 bữa ăn chỉ với ≤ 3 click (Acceptance Criteria #2). Thanh Calo real-time.

---

### 📌 Phase 4: Theo dõi Tập luyện (Exercise Tracking) — ~3 tuần
**Mục tiêu:** Ghi nhận buổi tập, phân loại Cardio vs Gym, tính Calo tiêu hao.

- [ ] **Backend:**
  - [ ] Xây dựng Exercise Database — bảng `Exercises` (tên, loại, nhóm cơ, calo tiêu hao ước tính).
  - [ ] Seed data bài tập phổ biến (Bench Press, Squat, Deadlift, Running, Plank...).
  - [ ] API tìm kiếm & lọc bài tập (theo loại, nhóm cơ).
  - [ ] API tạo Custom Workout (bài tập tùy chỉnh).
  - [ ] API CRUD DailyWorkoutLog:
    - [ ] Cardio: quãng đường (km), thời gian (phút), pace.
    - [ ] Gym/Resistance: sets, reps, weight (kg).
  - [ ] API tổng hợp Calo tiêu hao theo ngày.

- [ ] **Frontend:**
  - [ ] Trang Nhật ký Tập luyện (Daily Workout Log):
    - [ ] Nút "Thêm bài tập" → Modal tìm kiếm / chọn Exercise.
    - [ ] Form nhập liệu tùy theo loại (Cardio vs Gym).
    - [ ] Optimistic UI.
  - [ ] Thư viện bài tập (Exercise Library) — browse, search, filter.
  - [ ] Hiển thị tổng Calo tiêu hao trong ngày.

**Deliverable:** Ghi nhận 1 buổi tập chỉ với ≤ 3 click (Acceptance Criteria #2).

---

### 📌 Phase 5: Dashboard & Báo cáo Thống kê (Analytics & Dashboard) — ~2 tuần
**Mục tiêu:** Giao diện tổng quan & biểu đồ giúp người dùng đánh giá tiến trình.

- [ ] **Backend:**
  - [ ] API thống kê: lịch sử cân nặng theo tuần/tháng, tổng Calo In/Out theo tuần/tháng.
  - [ ] API tiến độ so với mục tiêu (% hoàn thành, dự đoán đạt mục tiêu).

- [ ] **Frontend:**
  - [ ] Trang Dashboard (trang chính sau đăng nhập):
    - [ ] Tóm tắt ngày hôm nay: Calo nạp / tiêu hao / còn lại, Macro.
    - [ ] Mục tiêu hiện tại & tiến độ.
    - [ ] Quick actions: Thêm bữa ăn, Thêm buổi tập.
  - [ ] Biểu đồ đường (Line chart) — biến thiên cân nặng theo tuần/tháng.
  - [ ] Biểu đồ cột (Bar chart) — so sánh Calo In vs Calo Out theo tuần/tháng.
  - [ ] Đảm bảo biểu đồ tự động re-render khi có dữ liệu mới (Acceptance Criteria #3).
  - [ ] Dashboard tải dưới 2 giây (Performance requirement).

**Deliverable:** Dashboard hoàn chỉnh với biểu đồ trực quan, real-time update.

---

### 📌 Phase 6: UI/UX Polish & Responsive (UI Refinement) — ~2 tuần
**Mục tiêu:** Hoàn thiện giao diện, đảm bảo trải nghiệm mượt mà trên mọi thiết bị.

- [ ] Rà soát & hoàn thiện Responsive trên Mobile / Tablet / Desktop.
- [ ] Tối ưu Mobile-first: bottom navigation, touch-friendly buttons, swipe gestures.
- [ ] Thêm animation chuyển trang (Framer Motion: page transitions, micro-interactions).
- [ ] Thiết kế hệ thống thông báo (Toast notifications cho các action thành công/thất bại).
- [ ] Dark Mode (tùy chọn).
- [ ] Loading skeleton / Shimmer effect cho các trang có dữ liệu.
- [ ] Kiểm tra Accessibility (a11y): contrast, focus states, screen reader.

**Deliverable:** Giao diện Minimalist, mượt mà, hoàn toàn Responsive.

---

### 📌 Phase 7: Testing & Bảo mật (Testing & Security Hardening) — ~2 tuần
**Mục tiêu:** Đảm bảo ứng dụng ổn định, bảo mật, sẵn sàng production.

- [ ] **Testing:**
  - [ ] Unit tests cho các service/logic Backend (Jest / xUnit).
  - [ ] Integration tests cho các API endpoint.
  - [ ] Component tests Frontend (React Testing Library).
  - [ ] End-to-End tests cho các flow chính (Cypress / Playwright).

- [ ] **Bảo mật:**
  - [ ] Audit bảo mật: kiểm tra SQL Injection, XSS, CSRF.
  - [ ] Rate limiting cho API Login.
  - [ ] Validate & sanitize mọi input từ client.
  - [ ] Đảm bảo data isolation: User A không truy cập được dữ liệu User B.
  - [ ] HTTPS enforcement.
  - [ ] Kiểm tra JWT expiration & refresh token flow.

**Deliverable:** Code coverage ≥ 80%. Không có lỗ hổng bảo mật nghiêm trọng.

---

### 📌 Phase 8: Deployment & Go-Live (Production Launch) — ~1 tuần
**Mục tiêu:** Triển khai ứng dụng lên môi trường production.

- [ ] Thiết lập môi trường Production (Cloud: Azure / AWS / Vercel + Railway / Docker).
- [ ] Cấu hình biến môi trường (Environment variables) cho production.
- [ ] Thiết lập Database production, chạy migration & seed data.
- [ ] Cấu hình domain & SSL certificate.
- [ ] Deploy Frontend (Vercel / Netlify / Azure Static Web Apps).
- [ ] Deploy Backend (Azure App Service / AWS EC2 / Railway / Docker).
- [ ] Smoke testing trên production.
- [ ] Monitoring & Logging cơ bản (Application Insights / Sentry).

**Deliverable:** Ứng dụng live, truy cập được qua domain chính thức, hoạt động ổn định.

---

### 📌 Phase 9: Theo dõi sau ra mắt & Cải tiến (Post-Launch & Iteration) — Liên tục
**Mục tiêu:** Thu thập feedback, sửa lỗi, phát triển tính năng mới.

- [ ] Thu thập feedback từ người dùng thực tế.
- [ ] Fix bugs phát sinh trên production.
- [ ] Tối ưu hiệu năng dựa trên dữ liệu thực (Lighthouse, Core Web Vitals).
- [ ] **Tính năng mở rộng tiềm năng:**
  - [ ] Tích hợp AI gợi ý thực đơn / bài tập dựa trên mục tiêu.
  - [ ] Social features: chia sẻ tiến trình, thử thách cùng bạn bè.
  - [ ] Tích hợp wearable devices (Apple Watch, Fitbit API).
  - [ ] Push notifications nhắc nhở ghi nhận bữa ăn / buổi tập.
  - [ ] PWA (Progressive Web App) — hỗ trợ offline & cài đặt lên màn hình chính.

**Deliverable:** Ứng dụng liên tục được cải thiện dựa trên dữ liệu & feedback thực tế.

---

### 📊 Tổng hợp Timeline ước tính

| Phase | Nội dung | Thời gian |
|-------|----------|-----------|
| Phase 0 | Khởi tạo dự án & Setup | ~1 tuần |
| Phase 1 | Authentication & User Profile | ~2 tuần |
| Phase 2 | Goal Setting | ~1 tuần |
| Phase 3 | Nutrition Tracking | ~3 tuần |
| Phase 4 | Exercise Tracking | ~3 tuần |
| Phase 5 | Dashboard & Analytics | ~2 tuần |
| Phase 6 | UI/UX Polish & Responsive | ~2 tuần |
| Phase 7 | Testing & Security | ~2 tuần |
| Phase 8 | Deployment & Go-Live | ~1 tuần |
| Phase 9 | Post-Launch & Iteration | Liên tục |
| **Tổng cộng** | **Từ Phase 0 → Phase 8** | **~17 tuần (~4 tháng)** |

> **Lưu ý:** Phase 3 và Phase 4 có thể chạy song song nếu có đủ nhân lực, giúp rút ngắn timeline xuống ~14 tuần (~3.5 tháng). Phase 6 & 7 cũng có thể overlap một phần.