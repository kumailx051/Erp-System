const express = require('express');
const { requireAuth } = require('../../../core/auth/authMiddleware');
const upload = require('../../../core/middlewares/uploadMiddleware');
const {
  getCurrentOpenings,
  getPublicCurrentOpenings,
  createCurrentOpening,
  applyToCurrentOpening,
  getCandidates,
  getCandidateById,
  createCandidate,
  updateCandidateStage,
  checkEmailAvailability,
  getMyApplications,
  getMyApplicationById,
  setInterviewSlots,
  uploadOfferLetter,
  uploadOnboardingPackage,
  selectInterviewSlot,
  respondOffer,
  respondOnboarding
} = require('../controllers/recruitmentController');

const router = express.Router();

const handleApplyUpload = (req, res, next) => {
  upload.single('cv')(req, res, (error) => {
    if (!error) return next();
    return res.status(400).json({
      success: false,
      message: error.message || 'CV upload failed'
    });
  });
};

const handleOfferLetterUpload = (req, res, next) => {
  upload.single('offerLetter')(req, res, (error) => {
    if (!error) return next();
    return res.status(400).json({
      success: false,
      message: error.message || 'Offer letter upload failed'
    });
  });
};

const handleOnboardingUpload = (req, res, next) => {
  upload.single('onboardingPackage')(req, res, (error) => {
    if (!error) return next();
    return res.status(400).json({
      success: false,
      message: error.message || 'Onboarding package upload failed'
    });
  });
};

// Public route (no auth required) - for career page
router.get('/public/current-openings', getPublicCurrentOpenings);
router.post('/public/apply', handleApplyUpload, applyToCurrentOpening);
router.post('/public/check-email', checkEmailAvailability);

// Protected routes (auth required)
router.get('/current-openings', requireAuth, getCurrentOpenings);
router.post('/current-openings', requireAuth, createCurrentOpening);
router.get('/candidates', requireAuth, getCandidates);
router.get('/candidates/:id', requireAuth, getCandidateById);
router.post('/candidates', requireAuth, createCandidate);
router.patch('/candidates/:id/stage', requireAuth, updateCandidateStage);
router.post('/candidates/:id/interview-slots', requireAuth, setInterviewSlots);
router.post('/candidates/:id/offer-letter', requireAuth, handleOfferLetterUpload, uploadOfferLetter);
router.post('/candidates/:id/onboarding-package', requireAuth, handleOnboardingUpload, uploadOnboardingPackage);
router.get('/candidate/my-applications', requireAuth, getMyApplications);
router.get('/candidate/my-applications/:id', requireAuth, getMyApplicationById);
router.post('/candidate/my-applications/:id/select-slot', requireAuth, selectInterviewSlot);
router.post('/candidate/my-applications/:id/offer-response', requireAuth, respondOffer);
router.post('/candidate/my-applications/:id/onboarding-response', requireAuth, respondOnboarding);

module.exports = router;
