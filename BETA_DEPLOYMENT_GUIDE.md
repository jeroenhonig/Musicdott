# MusicDott 2.0 - Beta Deployment Guide

## 🚀 Quick Start

### Prerequisites
- PostgreSQL database configured
- Required environment variables set
- Node.js 20+ installed

### Environment Variables

#### Required
```bash
DATABASE_URL=<postgresql_connection_string>
SESSION_SECRET=<secure_random_string>
```

#### Optional (Fully Functional Features)
```bash
OPENAI_API_KEY=<your_openai_key>        # AI features (lesson summaries, practice plans)
STRIPE_SECRET_KEY=<your_stripe_key>      # Payment processing
VITE_STRIPE_PUBLIC_KEY=<stripe_public>   # Frontend payment integration
```

#### Optional (Email Notifications)
```bash
SMTP_HOST=<smtp_server>
SMTP_PORT=<port>
SMTP_USER=<username>
SMTP_PASS=<password>
SMTP_FROM=<from_address>
```

### Deployment Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   ```bash
   npm run db:push
   ```

3. **Start Production Server**
   ```bash
   NODE_ENV=production npm start
   ```

## 📊 Health Monitoring

### Health Check Endpoints
- `GET /health` - Basic health status
- `GET /api/health` - Detailed health with database status

### Expected Response
```json
{
  "status": "healthy",
  "database": "connected",
  "version": "2.0",
  "environment": "production"
}
```

## 🔒 Security Features

### Already Implemented
- ✅ Helmet security headers with CSP
- ✅ CORS configuration (production: musicdott.app)
- ✅ Rate limiting on API endpoints
- ✅ Input sanitization
- ✅ File upload security
- ✅ HTTPS redirect in production
- ✅ Secure session management

### Production Configuration
The app automatically applies stricter security in production when `NODE_ENV=production`:
- Content Security Policy enforced
- CORS restricted to approved domains
- Enhanced logging and monitoring

## 📈 Performance Optimizations

### Database
- ✅ Comprehensive indexing on all query paths
- ✅ Optimized N+1 query prevention
- ✅ Connection pooling configured
- ✅ Slow query logging (>1s)

### Application
- ✅ Graceful shutdown handling
- ✅ Error recovery and retry logic
- ✅ Response caching where applicable
- ✅ Asset compression

## 🔧 Monitoring & Logs

### Production Logging
- All API requests logged with duration
- Database errors tracked with retry attempts
- WebSocket connections monitored
- Billing operations audited

### Log Locations
- Application logs: `console.log` (captured by hosting platform)
- Database logs: Slow queries logged to console
- Error logs: Comprehensive error stack traces

## 🎯 Beta Launch Checklist

### Pre-Deployment
- [x] Code cleanup completed (old scripts archived)
- [x] Security headers configured
- [x] Database indexes optimized
- [x] Health checks implemented
- [x] Error handling comprehensive
- [x] Environment variables documented

### Deployment
- [ ] Set `NODE_ENV=production`
- [ ] Configure production DATABASE_URL
- [ ] Add SESSION_SECRET (secure random string)
- [ ] Optional: Configure STRIPE for payments
- [ ] Optional: Configure OPENAI for AI features
- [ ] Optional: Configure SMTP for emails

### Post-Deployment
- [ ] Verify /health endpoint responds
- [ ] Test login flow
- [ ] Check database connectivity
- [ ] Monitor error logs
- [ ] Verify WebSocket connections

## 🚨 Troubleshooting

### Common Issues

**SMTP Errors**: Not critical - app functions without email. Configure SMTP vars if email needed.

**Database Connection**: Check DATABASE_URL format and network access.

**Session Issues**: Ensure SESSION_SECRET is set and persistent.

**API Errors**: Check rate limiting if seeing 429 errors.

## 📱 PWA Features

The app is PWA-enabled with:
- Offline support via Service Worker
- Push notifications (when configured)
- Add to home screen capability
- Background sync for gamification

## 🔄 Graceful Shutdown

The app handles:
- SIGTERM / SIGINT signals
- Uncaught exceptions
- Unhandled promise rejections

Shutdown sequence:
1. Stop accepting new connections
2. Stop billing scheduler
3. Close WebSocket connections
4. Wait 5s for existing requests
5. Exit cleanly

## 📞 Support

For deployment issues:
- Check logs at /health endpoint
- Review environment variables
- Verify database connectivity
- Check security headers in browser DevTools
