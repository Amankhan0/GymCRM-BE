/**
 * Seeds dummy gym data for ONE gym account (multi-tenant safe).
 *
 * Run:  yarn seed                  -> seeds under cult@gmail.com (default)
 *       node src/seed.js <email>   -> seeds under that gym account
 *
 * SAFE: only wipes the *target owner's* gym entities (members/trainers/plans/
 * payments/attendance) and recreates them. Other gym accounts and ALL b2b data
 * are never touched. The target user is created if it doesn't exist.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const User = require('./models/User');
const Member = require('./gym/models/Member');
const Trainer = require('./gym/models/Trainer');
const MembershipPlan = require('./gym/models/MembershipPlan');
const Payment = require('./gym/models/Payment');
const Attendance = require('./gym/models/Attendance');

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const TARGET_EMAIL = (process.argv[2] || 'cult@gmail.com').toLowerCase();

(async () => {
  try {
    await connectDB();

    // Find the target gym account, or create it so the script is runnable on a fresh DB.
    let admin = await User.findOne({ email: TARGET_EMAIL, product: 'gym' });
    if (!admin) {
      console.log(`No gym user ${TARGET_EMAIL} — creating one...`);
      const trialEndsAt = addDays(new Date(), 7);
      admin = await User.create({
        name: 'Demo Admin',
        email: TARGET_EMAIL,
        password: 'admin123',
        role: 'admin',
        phone: '9999999999',
        gymName: 'Demo Gym',
        product: 'gym',
        trialEndsAt,
      });
      console.log(`Created ${TARGET_EMAIL} / admin123`);
    }
    const owner = admin._id;
    console.log(`Seeding data for: ${admin.email} (${admin.gymName})`);

    // Wipe only THIS owner's gym data so the script is idempotent and tenant-safe.
    console.log("Clearing this gym's existing data...");
    await Promise.all([
      Member.deleteMany({ owner }),
      Trainer.deleteMany({ owner }),
      MembershipPlan.deleteMany({ owner }),
      Payment.deleteMany({ owner }),
      Attendance.deleteMany({ owner }),
    ]);

    console.log('Creating membership plans...');
    const plans = await MembershipPlan.create([
      { owner, name: 'Monthly', description: 'Access to all equipment, 1 month', duration: 'monthly', durationInDays: 30, price: 1500, features: ['Gym access', 'Locker', '1 trainer session'] },
      { owner, name: 'Quarterly', description: '3-month membership with extra perks', duration: 'quarterly', durationInDays: 90, price: 4000, features: ['Gym access', 'Locker', '5 trainer sessions', 'Nutrition guide'] },
      { owner, name: 'Half-Yearly', description: '6-month membership', duration: 'half-yearly', durationInDays: 180, price: 7000, features: ['Gym access', 'Locker', '10 trainer sessions'] },
      { owner, name: 'Yearly', description: 'Best value, full year access', duration: 'yearly', durationInDays: 365, price: 12000, features: ['Unlimited gym access', 'Locker', 'Unlimited trainer sessions', 'Free merchandise'] },
    ]);

    console.log('Creating trainers...');
    const trainers = await Trainer.create([
      { owner, name: 'Coach Mike', email: 'mike@demogym.com', phone: '8888888881', specialization: 'Strength training', experience: 6, salary: 35000, bio: 'Former powerlifting champion. Loves heavy compound lifts.' },
      { owner, name: 'Coach Sarah', email: 'sarah@demogym.com', phone: '8888888882', gender: 'female', specialization: 'Yoga & flexibility', experience: 4, salary: 28000, bio: 'Certified yoga instructor and mobility coach.' },
      { owner, name: 'Coach Arjun', email: 'arjun@demogym.com', phone: '8888888883', specialization: 'CrossFit & HIIT', experience: 5, salary: 32000, bio: 'High-energy functional training specialist.' },
    ]);

    console.log('Creating members...');
    const today = new Date();
    const memberSpecs = [
      ['Rahul Sharma', 'rahul@example.com', '9000000001', 'male',   -45,  45, 1, 0, 'active'],
      ['Priya Singh',  'priya@example.com', '9000000002', 'female', -15,  15, 0, 1, 'active'],
      ['Amit Kumar',   'amit@example.com',  '9000000003', 'male',   -10,   5, 0, 0, 'active'],
      ['Sneha Patel',  'sneha@example.com', '9000000004', 'female', -200, -10, 0, null, 'expired'],
      ['Vikram Rao',   'vikram@example.com','9000000005', 'male',   -90,  90, 2, 2, 'active'],
      ['Neha Gupta',   'neha@example.com',  '9000000006', 'female', -5,    3, 0, 1, 'active'],
      ['Karan Mehta',  'karan@example.com', '9000000007', 'male',   -60, -2,  1, 0, 'expired'],
      ['Pooja Reddy',  'pooja@example.com', '9000000008', 'female', -20,  340, 3, 2, 'active'],
    ];
    const members = await Member.create(
      memberSpecs.map(([name, email, phone, gender, joinOff, expOff, planIdx, trainerIdx, status]) => ({
        owner, name, email, phone, gender,
        joinDate: addDays(today, joinOff),
        expiryDate: addDays(today, expOff),
        membershipPlan: plans[planIdx]?._id,
        trainer: trainerIdx == null ? undefined : trainers[trainerIdx]._id,
        status,
      }))
    );

    console.log('Creating payments...');
    await Payment.create(
      members
        .filter((m) => m.membershipPlan)
        .map((m, i) => ({
          owner,
          member: m._id,
          plan: m.membershipPlan,
          amount: plans.find((p) => String(p._id) === String(m.membershipPlan))?.price || 1500,
          paymentMethod: ['upi', 'cash', 'card', 'bank-transfer'][i % 4],
          status: 'paid',
          paymentDate: m.joinDate,
        }))
    );

    console.log('Creating attendance (last 7 days)...');
    const attendance = [];
    for (let d = 0; d < 7; d++) {
      // A rotating subset of active members "show up" each day.
      members
        .filter((m) => m.status === 'active')
        .filter((_, idx) => (idx + d) % 2 === 0)
        .forEach((m) => attendance.push({ owner, member: m._id, date: addDays(today, -d), status: 'present' }));
    }
    await Attendance.create(attendance);

    console.log('\n✅ Seed complete.');
    console.log(`   Gym:    ${admin.gymName}`);
    console.log(`   Login:  ${admin.email}  (password unchanged if user already existed; admin123 if just created)`);
    console.log(`   Data:   ${plans.length} plans, ${trainers.length} trainers, ${members.length} members, ${attendance.length} attendance rows`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
})();
