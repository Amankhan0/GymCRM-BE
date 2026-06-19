// Selectable image models. Each maps to a real Fal.ai model (used for paid users) and a
// Pollinations model name (free fallback). When the owner funds Fal, each option produces a
// genuinely different result; on the free tier Pollinations currently serves one base model.
const IMAGE_MODELS = {
  flux:       { label: 'Flux',     fal: 'fal-ai/flux/dev',      pollinations: 'flux',  premium: false },
  turbo:      { label: 'Turbo',    fal: 'fal-ai/flux/schnell',  pollinations: 'turbo', premium: false },
  'flux-pro': { label: 'Flux Pro', fal: 'fal-ai/flux-pro/v1.1', pollinations: 'flux',  premium: true },
  sdxl:       { label: 'SDXL',     fal: 'fal-ai/fast-sdxl',     pollinations: 'flux',  premium: false },
};

const DEFAULT_MODEL = 'flux';

module.exports = { IMAGE_MODELS, DEFAULT_MODEL };
