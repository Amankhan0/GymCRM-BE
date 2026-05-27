// Subscription tiers for using the GymCRM panel itself.
// Pricing structure: each longer tier is cheaper per month.
const SUBSCRIPTION_PLANS = {
  monthly:      { key: 'monthly',      label: 'Monthly',      durationDays: 30,  amount: 999 },
  quarterly:    { key: 'quarterly',    label: 'Quarterly',    durationDays: 90,  amount: 2499 },
  'half-yearly':{ key: 'half-yearly',  label: 'Half-Yearly',  durationDays: 180, amount: 4499 },
  yearly:       { key: 'yearly',       label: 'Yearly',       durationDays: 365, amount: 7999 },
};

const PLAN_LIST = Object.values(SUBSCRIPTION_PLANS);

module.exports = { SUBSCRIPTION_PLANS, PLAN_LIST };
