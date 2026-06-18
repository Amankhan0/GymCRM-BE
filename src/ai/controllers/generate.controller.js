const User = require('../../models/User');
const Generation = require('../models/Generation');
const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const { buildImageUrl } = require('../utils/pollinations');
const { generateFalImage } = require('../utils/fal');
const { COSTS, PLANS } = require('../config/plans');

// Returns the up-to-date credit balance after a generation.
const balanceOf = (user) => (user.unlimited ? null : user.credits); // null == unlimited

// A "paid" user = unlimited/admin OR an active (non-expired) paid subscription. Paid users get
// premium Fal.ai generations; free users always get free Pollinations — so the owner's paid
// Fal balance is NEVER spent on free signup credits.
const isPaidUser = (u) =>
  u.unlimited ||
  (u.aiPlan && u.aiPlan !== 'none' && u.subscriptionEndsAt && new Date(u.subscriptionEndsAt) > new Date());

// Picks the image provider and returns { url, provider }. Paid → Fal (with graceful fallback to
// Pollinations if Fal is unconfigured / out of balance). Free → Pollinations.
async function resolveImage(prompt, options, user) {
  if (isPaidUser(user) && process.env.FAL_KEY) {
    try {
      const url = await generateFalImage(prompt, options);
      return { url, provider: 'fal' };
    } catch (err) {
      console.error('[ai] Fal image failed, falling back to Pollinations:', err.message);
    }
  }
  return { url: buildImageUrl(prompt, options), provider: 'pollinations' };
}

// POST /api/ai/generate/image
const generateImage = asyncHandler(async (req, res) => {
  const { prompt, aspectRatio, style, quality } = req.body;
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ success: false, message: 'Prompt is required' });
  }

  const user = req.user;
  const cost = COSTS.image;

  // Credit gate — admins/unlimited bypass. No credits => prompt the client to subscribe (402).
  if (!user.unlimited && user.credits < cost) {
    return res.status(402).json({
      success: false,
      message: 'Not enough credits. Upgrade your plan to keep generating.',
    });
  }

  const options = {
    aspectRatio: aspectRatio || '1:1',
    style: style || 'none',
    quality: quality || 'standard',
  };
  // Free → Pollinations (₹0), Paid → Fal.ai premium (falls back to Pollinations if Fal is down).
  const { url, provider } = await resolveImage(prompt.trim(), options, user);
  options.provider = provider;

  // Deduct credits (atomic-ish: we re-read on the doc we already have).
  let creditsUsed = 0;
  if (!user.unlimited) {
    user.credits -= cost;
    creditsUsed = cost;
    await user.save();
  }

  const generation = await Generation.create({
    owner: user._id,
    type: 'image',
    prompt: prompt.trim(),
    options,
    url,
    status: 'done',
    creditsUsed,
  });

  return success(res, { generation, credits: balanceOf(user) }, 'Image generated', 201);
});

// POST /api/ai/generate/video
// Video needs a paid provider (Fal.ai — Kling/Luma/etc). No free option exists yet, so this is
// wired but returns a friendly "coming soon" instead of charging credits. When the user funds a
// Fal.ai key we plug the real call in here.
const generateVideo = asyncHandler(async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ success: false, message: 'Prompt is required' });
  }

  // Plan check kept so the UX matches the final paid behaviour.
  const user = req.user;
  const planAllowsVideo = user.unlimited || PLANS[user.aiPlan]?.video;
  if (!planAllowsVideo) {
    return res.status(402).json({
      success: false,
      message: 'Video generation is available on the Pro & Ultra plans. Upgrade to unlock it.',
    });
  }

  return res.status(200).json({
    success: true,
    available: false,
    message:
      'Video generation is launching soon (powered by Fal.ai). Your plan already includes it — you will be notified at launch.',
  });
});

// GET /api/ai/generations — newest first, paginated.
const listGenerations = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(60, parseInt(req.query.limit, 10) || 24);
  const filter = { owner: req.user._id };
  if (req.query.type === 'image' || req.query.type === 'video') filter.type = req.query.type;

  const [items, total] = await Promise.all([
    Generation.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Generation.countDocuments(filter),
  ]);

  return success(res, { items, total, page, limit });
});

// DELETE /api/ai/generations/:id
const deleteGeneration = asyncHandler(async (req, res) => {
  const gen = await Generation.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!gen) return res.status(404).json({ success: false, message: 'Not found' });
  return success(res, null, 'Deleted');
});

module.exports = { generateImage, generateVideo, listGenerations, deleteGeneration };
