// Catches errors from asyncHandler and any thrown errors, returns a consistent JSON shape.
const notFound = (req, res, next) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);

  let message = err.message || 'Server error';

  // Mongoose bad ObjectId
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  // Mongoose duplicate key — 409 Conflict so the client can branch on it (e.g. inline error vs toast).
  if (err.code === 11000) {
    statusCode = 409;
    const fields = Object.keys(err.keyValue || err.keyPattern || {});
    if (fields.includes('utr')) {
      message = 'This UTR is already submitted — please double-check or wait for review.';
    } else if (fields.includes('email')) {
      message = 'This email is already registered.';
    } else {
      message = `Duplicate ${fields[0] || 'field'}`;
    }
  }

  // Mongoose validation
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
