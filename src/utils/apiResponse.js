// Standard API response shapes — keeps the client predictable.
const success = (res, data = null, message = 'Success', status = 200, meta) => {
  return res.status(status).json({ success: true, message, data, ...(meta && { meta }) });
};

const error = (res, message = 'Something went wrong', status = 500) => {
  return res.status(status).json({ success: false, message });
};

module.exports = { success, error };
