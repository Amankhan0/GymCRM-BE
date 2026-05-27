const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { notFound, errorHandler } = require('./middleware/error.middleware');
const { protect } = require('./middleware/auth.middleware');
const { requireActiveSubscription } = require('./middleware/subscription.middleware');

const authRoutes = require('./routes/auth.routes');
const memberRoutes = require('./routes/member.routes');
const trainerRoutes = require('./routes/trainer.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const planRoutes = require('./routes/plan.routes');
const paymentRoutes = require('./routes/payment.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const profileRoutes = require('./routes/profile.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const superadminRoutes = require('./routes/superadmin.routes');

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is running', time: new Date().toISOString() });
});

// Public + always-accessible routes (no subscription gate, so an expired user can still renew).
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/superadmin', superadminRoutes);

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
