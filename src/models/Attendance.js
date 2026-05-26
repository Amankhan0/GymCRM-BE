const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    date: { type: Date, default: Date.now },
    checkIn: { type: Date, default: Date.now },
    checkOut: { type: Date },
    status: { type: String, enum: ['present', 'absent'], default: 'present' },
    notes: { type: String },
  },
  { timestamps: true }
);

// One attendance entry per member per day
attendanceSchema.index({ member: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
