// AI product — subscription tiers. There is NO free plan; generation requires either credits
// (granted by a plan) or an unlimited/admin account. New signups get a small welcome grant so
// they can try the generator once before subscribing.

const PLANS = {
  starter: { key: 'starter', name: 'Starter', price: 499, credits: 200, video: false, perks: ['200 image credits / month', 'Standard quality', 'All aspect ratios', 'Generation history'] },
  pro:     { key: 'pro',     name: 'Pro',     price: 999, credits: 600, video: true,  perks: ['600 credits / month', 'HD quality', 'Image + Video generation', 'Priority queue', 'Generation history'] },
  ultra:   { key: 'ultra',   name: 'Ultra',   price: 2499, credits: 2000, video: true, perks: ['2000 credits / month', 'Max quality', 'Image + Video generation', 'Fastest priority queue', 'Commercial license'] },
};

// Credit cost per generation.
const COSTS = { image: 1, video: 10 };

// Granted once on signup so a brand-new user can test the generator before paying.
const WELCOME_CREDITS = 10;

module.exports = { PLANS, COSTS, WELCOME_CREDITS };
