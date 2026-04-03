const express = require('express');
const {
	login,
	changeTemporaryPassword,
	logout,
	getAuthenticatedUser,
	updateAuthenticatedUserProfile,
	changeAuthenticatedUserPassword,
	uploadAuthenticatedUserAvatar,
	createCandidateAccount
} = require('./authController');
const { requireAuth } = require('./authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

const router = express.Router();

router.post('/login', login);
router.post('/change-temporary-password', changeTemporaryPassword);
router.post('/logout', requireAuth, logout);
router.post('/create-candidate-account', createCandidateAccount);
router.get('/me', requireAuth, getAuthenticatedUser);
router.put('/me/profile', requireAuth, updateAuthenticatedUserProfile);
router.post('/me/change-password', requireAuth, changeAuthenticatedUserPassword);
router.post('/me/avatar', requireAuth, upload.single('avatar'), uploadAuthenticatedUserAvatar);

module.exports = router;
