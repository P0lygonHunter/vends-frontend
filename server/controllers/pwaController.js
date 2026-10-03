
const School = require('../models/School');
const { effectivePlanKey, planAllows } = require('../config/moduleAccess');

const DEFAULT_ICONS = [
  { src: '/pwa-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];

function baseManifest() {
  return {
    name: 'Vends EduCore',
    short_name: 'Vends',
    description: 'School ERP, fees, and V-Community for parents, teachers, and school admins.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#0f172a',
    theme_color: '#4f46e5',
    lang: 'en',
    icons: DEFAULT_ICONS,
  };
}

/** Public: default or school-branded manifest (Standard+ with brandLogo). */
exports.getManifest = async (req, res) => {
  try {
    const schoolId = req.params.schoolId;
    const m = baseManifest();
    if (!schoolId) {
      res.setHeader('Content-Type', 'application/manifest+json');
      return res.json(m);
    }
    const school = await School.findById(schoolId).select('schoolName plan brandLogo');
    if (!school) {
      res.setHeader('Content-Type', 'application/manifest+json');
      return res.json(m);
    }
    const plan = effectivePlanKey(school.plan);
    const canBrand = plan === 'standard' || plan === 'premium';
    if (canBrand && school.brandLogo && String(school.brandLogo).startsWith('data:image')) {
      const short = String(school.schoolName || 'School').slice(0, 12);
      m.name = school.schoolName || m.name;
      m.short_name = short;
      m.icons = [
        { src: school.brandLogo, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: school.brandLogo, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: school.brandLogo, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ];
    }
    res.setHeader('Content-Type', 'application/manifest+json');
    res.setHeader('Cache-Control', 'no-cache');
    return res.json(m);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** Auth school: upload/clear brand logo (Standard+). */
exports.updateBrandLogo = async (req, res) => {
  try {
    const school = await School.findById(req.schoolId);
    if (!school) return res.status(404).json({ error: 'School not found.' });
    if (!planAllows(school.plan, 'chat') && effectivePlanKey(school.plan) === 'starter') {
      // brand logo tied to Standard+ — use financial_basic or a dedicated key; use plan rank
    }
    const key = effectivePlanKey(school.plan);
    if (key !== 'standard' && key !== 'premium') {
      return res.status(403).json({
        error: 'Custom app icon requires Standard or Premium plan.',
        code: 'PLAN_REQUIRED',
      });
    }
    const { brandLogo } = req.body;
    if (brandLogo === null || brandLogo === '') {
      school.brandLogo = '';
      await school.save();
      return res.json({ message: 'App icon reset to Vends default.', brandLogo: '' });
    }
    if (!String(brandLogo).startsWith('data:image/')) {
      return res.status(400).json({ error: 'Logo must be an image (JPEG/PNG/WebP data URL).' });
    }
    // ~300KB data URL ceiling
    if (String(brandLogo).length > 400000) {
      return res.status(400).json({ error: 'Logo is too large. Use a square image under ~200KB.' });
    }
    school.brandLogo = String(brandLogo);
    await school.save();
    res.json({ message: 'App icon updated. Re-install or refresh the PWA to see it.', brandLogo: school.brandLogo ? 'set' : '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
