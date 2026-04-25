const express = require('express')
const router = express.Router()
const passport = require('passport')
const multer = require('multer')
const path = require('path')

const {
  registerUser,
  registerBroker,
  loginUser,
  logoutUser,
  googleCallback,
  getCurrentUser,
  forgotPassword,
  verifyOtp,
  resetPassword,
} = require('../controllers/authController')

const { protect } = require('../middleware/authMiddleware')

const {
  validateRegisterUser,
  validateRegisterBroker,
  validateLogin,
  validateForgotPassword,
  validateVerifyOtp,
  validateResetPassword,
} = require('../middleware/validateMiddleware')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, 'broker-' + uniqueSuffix + path.extname(file.originalname))
  },
})

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
  const mimetype = allowedTypes.test(file.mimetype)
  if (extname && mimetype) {
    cb(null, true)
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, webp)'))
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
})

router.post('/register', validateRegisterUser, registerUser)

router.post(
  '/register/broker',
  upload.single('avatar'),
  validateRegisterBroker,
  registerBroker
)

router.post('/login', validateLogin, loginUser)

router.post('/logout', protect, logoutUser)

router.get('/me', protect, getCurrentUser)

router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
)

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=Google authentication failed`,
    session: false,
  }),
  googleCallback
)

router.post('/forgot-password', validateForgotPassword, forgotPassword)

router.post('/verify-otp', validateVerifyOtp, verifyOtp)

router.post('/reset-password', validateResetPassword, resetPassword)

module.exports = router