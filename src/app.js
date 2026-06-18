const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');

const { notFound, errorHandler } = require('./middleware/error.middleware');
const { protect } = require('./middleware/auth.middleware');
const { requireActiveSubscription } = require('./middleware/subscription.middleware');
const { globalLimiter } = require('./middleware/rateLimit.middleware');
const { checkBlock } = require('./middleware/progressiveBlock.middleware');

// Gym product routes — gym-only modules live under src/gym/
const gymAuthRoutes = require('./gym/routes/auth.routes');
const memberRoutes = require('./gym/routes/member.routes');
const trainerRoutes = require('./gym/routes/trainer.routes');
const attendanceRoutes = require('./gym/routes/attendance.routes');
const planRoutes = require('./gym/routes/plan.routes');
const paymentRoutes = require('./gym/routes/payment.routes');
const dashboardRoutes = require('./gym/routes/dashboard.routes');

// Shared / cross-product routes
const profileRoutes = require('./routes/profile.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const superadminRoutes = require('./routes/superadmin.routes');

// B2B product routes
const b2bRoutes = require('./b2b/routes');

// AI product routes (image/video generation SaaS)
const aiRoutes = require('./ai/routes');

const app = express();

// Render terminates TLS at the proxy. trust proxy=1 lets express-rate-limit see the real client IP
// instead of bucketing every request under the proxy IP.
app.set('trust proxy', 1);

// Helmet sets a battery of safe-default response headers (X-Content-Type-Options, HSTS, etc).
// CSP is disabled since this is an API server — the SPA hosts its own CSP on Vercel.
app.use(helmet({ contentSecurityPolicy: false }));

// CLIENT_URL may hold one OR several comma-separated origins (e.g. the gym SPA and the b2b SPA,
// which are deployed as separate Vercel projects but share this single backend). We allow any of
// them. Requests with no Origin header (curl, health checks, same-origin) are allowed through too.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin} is not an allowed origin`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Hard block check runs BEFORE the rate limiter — a banned IP/user shouldn't get to consume
// even a single token from the rate-limit bucket. checkBlock fails open if MongoDB is down.
app.use(checkBlock);

// Global per-IP cap — covers every endpoint, including ones with no route-level limit.
// When tripped, the handler records a strike via progressiveBlock to escalate repeat offenders.
app.use(globalLimiter);

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is running', time: new Date().toISOString() });
});

// Public + always-accessible routes (no subscription gate, so an expired user can still renew).
// Note: /api/auth is the GYM auth endpoint (kept for backwards compatibility with the gym client);
// B2B has its own auth at /api/b2b/auth.
app.use('/api/auth', gymAuthRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/superadmin', superadminRoutes);

// B2B product — all routes namespaced under /api/b2b. The product guard middleware on each
// route ensures gym users can't accidentally hit b2b endpoints (and vice versa).
app.use('/api/b2b', b2bRoutes);

// AI product — image/video generation. Namespaced under /api/ai. Credit-based (no subscription
// gate at the router level; gating happens per-controller).
app.use('/api/ai', aiRoutes);

// Data routes — protected AND gated by an active trial / subscription.
const dataGate = [protect, requireActiveSubscription];
app.use('/api/members', dataGate, memberRoutes);
app.use('/api/trainers', dataGate, trainerRoutes);
app.use('/api/attendance', dataGate, attendanceRoutes);
app.use('/api/plans', dataGate, planRoutes);
app.use('/api/payments', dataGate, paymentRoutes);
app.use('/api/dashboard', dataGate, dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
