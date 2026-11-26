export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(400, 'VALIDATION_ERROR', message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Không tìm thấy dữ liệu yêu cầu.') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(message) {
    super(409, 'CONFLICT', message);
  }
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message
      }
    });
  }

  console.error(err);
  const detail = process.env.NODE_ENV === 'production' ? '' : ` (${err?.message || 'Unknown error'})`;
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: `Lỗi hệ thống nội bộ${detail}.`
    }
  });
}
