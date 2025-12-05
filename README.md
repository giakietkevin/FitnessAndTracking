# Fitness and Tracking Website - Microservices Architecture

## Cấu trúc dự án

Dự án được xây dựng theo kiến trúc microservices với các thành phần chính:

### 1. API Gateway (`/gateway`)
- Điểm vào duy nhất cho tất cả các request từ client
- Định tuyến request đến các microservices tương ứng
- Xử lý authentication, rate limiting, logging

### 2. Microservices (`/services`)

#### User Service (`/services/user-service`)
- Quản lý người dùng (đăng ký, đăng nhập, profile)
- Authentication & Authorization
- JWT token management

#### Fitness Service (`/services/fitness-service`)
- Quản lý workouts (bài tập)
- Quản lý exercises (động tác)
- Tạo và chỉnh sửa chương trình tập luyện

#### Tracking Service (`/services/tracking-service`)
- Theo dõi tiến độ tập luyện
- Quản lý metrics (cân nặng, số đo, v.v.)
- Báo cáo và thống kê

#### Notification Service (`/services/notification-service`)
- Gửi thông báo cho người dùng
- Real-time notifications (Socket.io)
- Email/SMS notifications

### 3. Shared Common (`/shared/common`)
- Code dùng chung giữa các services
- Logger, error handling, validation, constants

### 4. Database (`/database`)
- Database configurations
- Migrations

## Cài đặt và chạy

### Yêu cầu
- Node.js 18+
- Docker & Docker Compose (cho production)
- MongoDB (hoặc sử dụng Docker)

### Development

1. Cài đặt dependencies cho từng service:
```bash
cd gateway && npm install
cd ../services/user-service && npm install
cd ../services/fitness-service && npm install
cd ../services/tracking-service && npm install
cd ../services/notification-service && npm install
```

2. Copy file `.env.example` thành `.env` và cấu hình:
```bash
cp gateway/.env.example gateway/.env
cp services/user-service/.env.example services/user-service/.env
# ... tương tự cho các services khác
```

3. Chạy từng service:
```bash
# Terminal 1
cd gateway && npm run dev

# Terminal 2
cd services/user-service && npm run dev

# Terminal 3
cd services/fitness-service && npm run dev

# Terminal 4
cd services/tracking-service && npm run dev

# Terminal 5
cd services/notification-service && npm run dev
```

### Production với Docker

```bash
docker-compose up -d
```

## Ports

- API Gateway: `3000`
- User Service: `3001`
- Fitness Service: `3002`
- Tracking Service: `3003`
- Notification Service: `3004`

## Cấu trúc thư mục

```
FitnessAndTracking_Website/
├── gateway/                 # API Gateway
│   ├── src/
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
├── services/               # Microservices
│   ├── user-service/
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   └── middleware/
│   │   ├── index.js
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── fitness-service/
│   ├── tracking-service/
│   └── notification-service/
├── shared/                 # Shared code
│   └── common/
├── database/              # Database configs
├── docker-compose.yml
└── README.md
```

## Next Steps

1. Implement logic cho từng service
2. Setup database models và schemas
3. Implement authentication middleware
4. Setup API Gateway routing
5. Add unit tests và integration tests
6. Setup CI/CD pipeline

