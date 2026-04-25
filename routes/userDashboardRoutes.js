const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const {
  getUserDashboard,
  getUserPendingCounts,
  getBrowseProperties,
  getPropertyDetail,
  saveProperty,
  unsaveProperty,
  getSavedProperties,
  bookTour,
  getMyBookings,
  cancelBooking,
  startConversation,
  getUserConversations,
  getUserMessages,
  sendUserMessage,
  createRazorpayOrder,
  verifyRazorpayPayment,
  getMyPayments,
  getUserProfile,
  updateUserProfile,
  updateUserSettings,
  submitReview,
} = require('../controllers/userDashboardController')

const { protect, authorize } = require('../middleware/authMiddleware')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix =
      Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(
      null,
      file.fieldname +
        '-' +
        uniqueSuffix +
        path.extname(file.originalname)
    )
  },
})

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  )
  const mimetype = allowedTypes.test(file.mimetype)
  if (extname && mimetype) {
    cb(null, true)
  } else {
    cb(new Error('Only image files are allowed'))
  }
}

const uploadSingle = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
}).single('avatar')

router.use(protect)
router.use(authorize('user'))

router.get('/dashboard', getUserDashboard)
router.get('/pending-counts', getUserPendingCounts)

router.get('/properties', getBrowseProperties)
router.get('/properties/:id', getPropertyDetail)
router.post('/properties/:id/save', saveProperty)
router.delete('/properties/:id/save', unsaveProperty)
router.get('/saved-properties', getSavedProperties)

router.post('/bookings', bookTour)
router.get('/bookings', getMyBookings)
router.patch('/bookings/:id/cancel', cancelBooking)

router.post('/conversations', startConversation)
router.get('/conversations', getUserConversations)
router.get('/conversations/:id/messages', getUserMessages)
router.post('/conversations/:id/messages', sendUserMessage)

router.post('/payments/create-order', createRazorpayOrder)
router.post('/payments/verify', verifyRazorpayPayment)
router.get('/payments', getMyPayments)

router.get('/profile', getUserProfile)
router.put('/profile', uploadSingle, updateUserProfile)
router.put('/settings', updateUserSettings)

router.post('/reviews', submitReview)

module.exports = router