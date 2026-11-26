# Statement of Intent: Fitness & Tracking Web App

- **Outcome:** Một web app theo dõi sức khỏe chạy thật end-to-end: tính TDEE/BMI theo mục tiêu, log bữa ăn tính calo & macro (Protein/Carbs/Fat), lập plan & log buổi tập (Gym/Cardio), và dashboard xem tiến độ cân nặng/calo.
- **User:** Cá nhân dùng hàng ngày ở local trước; dữ liệu tách theo tài khoản (JWT auth) với giao diện đơn giản, an toàn cho người dùng từ 12+ tuổi khi host public sau này.
- **Why now:** Dọn bỏ bộ khung 4 microservices stub cũ trong repo để dựng lại một ứng dụng gọn, chạy được thật ngay trên máy và dễ mở rộng dần.
- **Success:** Chạy app bằng lệnh đơn giản trên Windows (`npm run dev`), đăng ký & thiết lập hồ sơ trong ≤ 1 phút, log bữa ăn (từ danh sách thực phẩm VN cơ bản + tự thêm món) và buổi tập trong vài thao tác, xem biểu đồ calo in/out & cân nặng cập nhật tức thì; UI đạt chuẩn kiểm tra trình duyệt của `design-taste-frontend`, backend hoàn thiện từng vertical slice có test theo `incremental-implementation`.
- **Constraint:** Node.js + Express + SQLite cho local (dễ nâng lên PostgreSQL khi host server), không dùng Docker hay microservices phức tạp ở v1; giữ phạm vi gọn để dùng mượt ngay.
- **Out of scope (V1):** Đếm bước chân/đồng bộ đồng hồ thông minh, theo dõi giấc ngủ, nhắc nhở SMS/push real-time, quét mã vạch/nhận diện ảnh bằng AI, mạng xã hội/chat cộng đồng, thanh toán.
