
const express = require('express');
const router = express.Router();
const { getManifest, updateBrandLogo } = require('../controllers/pwaController');
const { requireSchoolAuth } = require('../middleware/auth');

router.get('/pwa/manifest', getManifest);
router.get('/pwa/manifest/:schoolId', getManifest);
router.patch('/pwa/brand-logo', requireSchoolAuth, updateBrandLogo);

module.exports = router;
