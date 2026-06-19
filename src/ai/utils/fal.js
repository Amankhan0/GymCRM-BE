// Fal.ai image generation — used ONLY for paid/subscribed users (premium quality). Free users
// never hit this, so the owner's Fal balance is only ever spent on paying customers.
// Requires FAL_KEY in env. If the key is missing or the account is out of balance, the caller
// falls back to free Pollinations so nothing breaks.
const { STYLE_SUFFIX } = require('./pollinations');
const { IMAGE_MODELS } = require('../config/models');

// Fal flux image_size presets.
const SIZE = {
  '1:1': 'square_hd',
  '16:9': 'landscape_16_9',
  '9:16': 'portrait_16_9',
};

async function generateFalImage(prompt, opts = {}) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error('FAL_KEY not configured');

  const { aspectRatio = '1:1', style = 'none', quality = 'standard', model = 'flux' } = opts;
  // Use the user-selected model; fall back to quality-based default (schnell=fast, dev=hd).
  const falModel = IMAGE_MODELS[model]?.fal || (quality === 'hd' ? 'fal-ai/flux/dev' : 'fal-ai/flux/schnell');
  const enhanced = `${prompt}${STYLE_SUFFIX[style] || ''}`;

  const resp = await fetch(`https://fal.run/${falModel}`, {
    method: 'POST',
    headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: enhanced,
      image_size: SIZE[aspectRatio] || 'square_hd',
      num_images: 1,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Fal error ${resp.status}: ${text.slice(0, 160)}`);
  }
  const data = await resp.json();
  const url = data?.images?.[0]?.url;
  if (!url) throw new Error('Fal returned no image');
  return url;
}

module.exports = { generateFalImage };
