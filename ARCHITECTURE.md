# Kiến trúc Microservices - Fitness and Tracking Website

## Tổng quan

Dự án sử dụng kiến trúc microservices để tách biệt các chức năng thành các service độc lập, có thể phát triển và triển khai riêng biệt.

## Sơ đồ kiến trúc

```
                    ┌─────────────┐
                    │   Client    │
                    │  (Web/Mobile)│
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ API Gateway │
                    │   (Port 3000)│
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐      ┌──────▼──────┐    ┌──────▼──────┐
   │  User   │      │   Fitness   │    │  Tracking   │
   │ Service │      │   Service   │    │   Service   │
   │(Port 3001)│    │  (Port 3002)│    │ (Port 3003) │
   └────┬────┘      └──────┬──────┘    └──────┬──────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────▼──────┐
                    │Notification │
                    │   Service   │
                    │ (Port 3004) │
                    └─────────────┘
```

## Các Microservices

### 1. API Gateway
**Chức năng:**
- Điểm vào duy nhất cho tất cả client requests
- Request routing đến các microservices
- Authentication & Authorization
- Rate limiting
- Request/Response logging
- Load balancing (trong tương lai)

**Công nghệ:**
- Express.js
- http-proxy-middleware

### 2. User Service
**Chức năng:**
- User registration & authentication
- User profile management
- JWT token generation & validation
- Password hashing & management

**Database:**
- MongoDB (fitness_users)

**Endpoints (dự kiến):**
- POST /api/users/register
- POST /api/users/login
- GET /api/users/profile
- PUT /api/users/profile
- DELETE /api/users/:id

### 3. Fitness Service
**Chức năng:**
- Quản lý workouts (bài tập)
- Quản lý exercises (động tác)
- Tạo chương trình tập luyện
- Phân loại workouts theo mục tiêu

**Database:**
- MongoDB (fitness_workouts)

**Endpoints (dự kiến):**
- GET /api/workouts
- POST /api/workouts
- GET /api/workouts/:id
- PUT /api/workouts/:id
- DELETE /api/workouts/:id
- GET /api/exercises
- POST /api/exercises

### 4. Tracking Service
**Chức năng:**
- Theo dõi tiến độ tập luyện
- Lưu trữ metrics (cân nặng, số đo, v.v.)
- Tạo báo cáo và thống kê
- Biểu đồ tiến độ

**Database:**
- MongoDB (fitness_tracking)

**Endpoints (dự kiến):**
- POST /api/progress
- GET /api/progress/:userId
- GET /api/metrics/:userId
- POST /api/metrics
- GET /api/reports/:userId

### 5. Notification Service
**Chức năng:**
- Gửi thông báo real-time
- Email notifications
- Push notifications
- Notification history

**Database:**
- MongoDB (fitness_notifications)

**Endpoints (dự kiến):**
- GET /api/notifications/:userId
- POST /api/notifications
- PUT /api/notifications/:id/read
- DELETE /api/notifications/:id

## Communication Patterns

### Synchronous Communication
- REST API qua HTTP/HTTPS
- API Gateway định tuyến requests

### Asynchronous Communication (tương lai)
- Message Queue (RabbitMQ/Kafka) cho event-driven communication
- Service-to-service events

## Database Strategy

Mỗi microservice có database riêng (Database per Service pattern):
- User Service → MongoDB (fitness_users)
- Fitness Service → MongoDB (fitness_workouts)
- Tracking Service → MongoDB (fitness_tracking)
- Notification Service → MongoDB (fitness_notifications)

**Lợi ích:**
- Độc lập về dữ liệu
- Có thể scale riêng biệt
- Dễ maintain và deploy

## Security

- JWT tokens cho authentication
- API Gateway xử lý authentication trước khi forward requests
- CORS configuration
- Rate limiting
- Input validation

## Deployment

### Development
- Chạy từng service riêng biệt với nodemon
- MongoDB local hoặc Docker

### Production
- Docker containers cho mỗi service
- Docker Compose để orchestrate
- Có thể deploy lên Kubernetes trong tương lai

## Monitoring & Logging (tương lai)

- Centralized logging (ELK stack)
- Health check endpoints
- Metrics collection (Prometheus)
- Distributed tracing

## Best Practices

1. **Service Independence**: Mỗi service có thể deploy độc lập
2. **API Versioning**: Sử dụng version trong API paths (/api/v1/...)
3. **Error Handling**: Consistent error response format
4. **Documentation**: API documentation cho mỗi service
5. **Testing**: Unit tests và integration tests cho mỗi service

