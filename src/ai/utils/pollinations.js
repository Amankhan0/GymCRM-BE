// Builds a Pollinations.ai image URL. Pollinations generates the image on-access (when the URL
// is loaded), so we just return a URL — no server bandwidth, and it's completely free. When the
// user upgrades to a paid provider (Fal.ai) we swap this one function out.

const ASPECT = {
  '1:1': [1024, 1024],
  '16:9': [1280, 720],
  '9:16': [720, 1280],
};

// Style presets are appended to the prompt to steer the model.
const STYLE_SUFFIX = {
  none: '',
  cinematic: ', cinematic lighting, dramatic, film still, 8k',
  photorealistic: ', photorealistic, ultra detailed, sharp focus, 8k',
  anime: ', anime style, vibrant, studio ghibli inspired',
  '3d': ', 3d render, octane render, soft lighting',
  'digital-art': ', digital art, trending on artstation, highly detailed',
};

function buildImageUrl(prompt, opts = {}) {
  const { aspectRatio = '1:1', style = 'none', quality = 'standard', model = 'flux', seed } = opts;
  const { IMAGE_MODELS } = require('../config/models');
  const polliModel = IMAGE_MODELS[model]?.pollinations || 'flux';
  const [width, height] = ASPECT[aspectRatio] || ASPECT['1:1'];
  const enhanced = `${prompt}${STYLE_SUFFIX[style] || ''}`;
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    model: polliModel,
    nologo: 'true',
    enhance: quality === 'hd' ? 'true' : 'false',
    seed: String(seed ?? Math.floor(Math.random() * 1_000_000)),
  });
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(enhanced)}?${params.toString()}`;
}

module.exports = { buildImageUrl, ASPECT, STYLE_SUFFIX };
