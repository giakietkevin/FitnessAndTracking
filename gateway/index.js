const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Service URLs
const SERVICES = {
  user: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  fitness: process.env.FITNESS_SERVICE_URL || 'http://localhost:3002',
  tracking: process.env.TRACKING_SERVICE_URL || 'http://localhost:3003',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004',
};

// Proxy middleware configuration
const createProxy = (target, pathRewrite = {}) => {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    onError: (err, req, res) => {
      console.error('Proxy error:', err.message);
      res.status(503).json({ 
        status: 'error', 
        message: 'Service temporarily unavailable' 
      });
    },
  });
};

// API Routes
app.use('/api/users', createProxy(SERVICES.user, { '^/api/users': '/api' }));
app.use('/api/auth', createProxy(SERVICES.user, { '^/api/auth': '/api/auth' }));
app.use('/api/fitness', createProxy(SERVICES.fitness, { '^/api/fitness': '/api' }));
app.use('/api/tracking', createProxy(SERVICES.tracking, { '^/api/tracking': '/api' }));
app.use('/api/notifications', createProxy(SERVICES.notification, { '^/api/notifications': '/api' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📁 Static files served from: ${path.join(__dirname, 'public')}`);
});

