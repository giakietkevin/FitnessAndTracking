# Capability Map: Fitness & Tracking Web App (V1)

| Module ID | Responsibility | Depends On |
| :--- | :--- | :--- |
| `identity` | Đăng ký, đăng nhập (JWT), hồ sơ cơ thể (chiều cao, cân nặng, tuổi, giới tính, mức vận động), mục tiêu (giảm mỡ / giữ dáng / tăng cơ) và tính BMI/TDEE/calo mục tiêu | — |
| `nutrition` | Thư viện thực phẩm (seed món ăn Việt Nam & phổ biến + custom food), ghi nhận bữa ăn theo ngày (Sáng/Trưa/Tối/Phụ) và tổng hợp calo + macro (P/C/F) | `identity` |
| `workout` | Thư viện bài tập (Gym/Cardio), tạo & quản lý Workout Plan theo ngày/tuần, ghi nhận buổi tập thực tế và ước tính calo tiêu hao | `identity` |
| `tracking` | Ghi nhận lịch sử cân nặng & số đo, tổng hợp Dashboard (Calo In vs Out, tiến độ macro, chuỗi ngày bám sát mục tiêu, biểu đồ theo tuần/tháng) | `identity`, `nutrition`, `workout` |
| `web-ui` | Trang giới thiệu & điều hướng chuẩn `design-taste-frontend` + giao diện ứng dụng tương tác (Onboarding ≤ 1 phút, Daily Log ≤ 3 click, Workout Planner, Analytics) | `identity`, `nutrition`, `workout`, `tracking` |

**Build Order:** `identity` → `nutrition`, `workout` → `tracking` → `web-ui`
