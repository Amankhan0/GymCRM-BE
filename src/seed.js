/**
 * Seeds the database with a starter set of data for ONE gym (the seed admin user).
 * Run with:  yarn seed   (inside /server)
 * WARNING: This will WIPE existing collections.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const User = require('./models/User');
const Member = require('./models/Member');
const Trainer = require('./models/Trainer');
const MembershipPlan = require('./models/MembershipPlan');
const Payment = require('./models/Payment');
const Attendance = require('./models/Attendance');

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

(async () => {
  try {
    await connectDB();
    console.log('Clearing collections...');
    await Promise.all([
      User.deleteMany({}),
      Member.deleteMany({}),
      Trainer.deleteMany({}),
      MembershipPlan.deleteMany({}),
      Payment.deleteMany({}),
      Attendance.deleteMany({}),
    ]);

    console.log('Creating admin user (gym owner)...');
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@gym.com',
      password: 'admin123',
      role: 'admin',
      phone: '9999999999',
      gymName: 'Iron Paradise',
    });

    // Everything below is owned by the seed admin so it scopes correctly.
    const owner = admin._id;

    console.log('Creating membership plans...');
    const plans = await MembershipPlan.create([
      {
        owner,
        name: 'Monthly',
        description: 'Access to all equipment, 1 month',
        duration: 'monthly',
        durationInDays: 30,
        price: 1500,
        features: ['Gym access', 'Locker', '1 trainer session'],
      },
      {
        owner,
        name: 'Quarterly',
        description: '3-month membership with extra perks',
        duration: 'quarterly',
        durationInDays: 90,
        price: 4000,
        features: ['Gym access', 'Locker', '5 trainer sessions', 'Nutrition guide'],
      },
      {
        owner,
        name: 'Yearly',
        description: 'Best value, full year access',
        duration: 'yearly',
        durationInDays: 365,
        price: 12000,
        features: ['Unlimited gym access', 'Locker', 'Unlimited trainer sessions', 'Free merchandise'],
      },
    ]);

    console.log('Creating trainers...');
    const trainers = await Trainer.create([
      {
        owner,
        name: 'Coach Mike',
        email: 'mike@gym.com',
        phone: '8888888888',
        specialization: 'Strength training',
        experience: 6,
        salary: 35000,
        bio: 'Former powerlifting champion. Loves heavy compound lifts.',
      },
      {
        owner,
        name: 'Coach Sarah',
        email: 'sarah@gym.com',
        phone: '7777777777',
        gender: 'female',
        specialization: 'Yoga & flexibility',
        experience: 4,
        salary: 28000,
        bio: 'Certified yoga instructor and mobility coach.',
      },
    ]);

    console.log('Creating members...');
    const today = new Date();
    const members = await Member.create([
      {
        owner,
        name: 'Rahul Sharma',
        email: 'rahul@example.com',
        phone: '9000000001',
        gender: 'male',
        joinDate: addDays(today, -45),
        expiryDate: addDays(today, 45),
        membershipPlan: plans[1]._id,
        trainer: trainers[0]._id,
        status: 'active',
      },
      {
        owner,
        name: 'Priya Singh',
        email: 'priya@example.com',
        phone: '9000000002',
        gender: 'female',
        joinDate: addDays(today, -15),
        expiryDate: addDays(today, 15),
        membershipPlan: plans[0]._id,
        trainer: trainers[1]._id,
        status: 'active',
      },
      {
        owner,
        name: 'Amit Kumar',
        email: 'amit@example.com',
        phone: '9000000003',
        gender: 'male',
        joinDate: addDays(today, -10),
        expiryDate: addDays(today, 5),
        membershipPlan: plans[0]._id,
        trainer: trainers[0]._id,
        status: 'active',
      },
      {
        owner,
        name: 'Sneha Patel',
        email: 'sneha@example.com',
        phone: '9000000004',
        gender: 'female',
        joinDate: addDays(today, -200),
        expiryDate: addDays(today, -10),
        membershipPlan: plans[0]._id,
        status: 'expired',
      },
    ]);

    console.log('Creating payments...');
    await Payment.create([
      {
        owner,
        member: members[0]._id,
        plan: plans[1]._id,
        amount: plans[1].price,
        paymentMethod: 'upi',
        status: 'paid',
        paymentDate: addDays(today, -45),
      },
      {
        owner,
        member: members[1]._id,
        plan: plans[0]._id,
        amount: plans[0].price,
        paymentMethod: 'cash',
        status: 'paid',
        paymentDate: addDays(today, -15),
      },
      {
        owner,
        member: members[2]._id,
        plan: plans[0]._id,
        amount: plans[0].price,
        paymentMethod: 'card',
        status: 'paid',
        paymentDate: addDays(today, -10),
      },
    ]);

    console.log('Creating attendance...');
    await Attendance.create([
      { owner, member: members[0]._id, date: today, status: 'present' },
      { owner, member: members[1]._id, date: today, status: 'present' },
      { owner, member: members[0]._id, date: addDays(today, -1), status: 'present' },
      { owner, member: members[2]._id, date: addDays(today, -1), status: 'present' },
      { owner, member: members[1]._id, date: addDays(today, -2), status: 'present' },
    ]);

    console.log('\nSeed complete.');
    console.log('Login:  admin@gym.com  /  admin123  (gym: Iron Paradise)');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
})();
