const express = require('express');
const router = express.Router();
const { registerValidation, loginValidation } = require('../validators/userValidator');
const authController = require('../controllers/authController');

router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

module.exports = router;
