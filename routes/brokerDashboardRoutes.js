const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const {
  getBrokerStats,
  getBrokerPendingCounts,
  getMyListings,
  getSingleListing,
  addProperty,
  editProperty,
  deleteProperty,
  getTourRequests,
  updateTourStatus,
  getConversations,
  getMessages,
  sendMessage,
  getBrokerEarnings,
  getBrokerProfile,
  updateBrokerProfile,
  updateBrokerSettings,
} = require('../controllers/brokerDashboardController')

const { protect, authorize } = require('../middleware/authMiddleware')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(
      null,
      file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname)
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

const uploadMultiple = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
}).array('images', 15)

const uploadSingle = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
}).single('avatar')

router.use(protect)
router.use(authorize('broker'))

router.get('/stats', getBrokerStats)
router.get('/pending-counts', getBrokerPendingCounts)

router.get('/listings', getMyListings)
router.get('/listings/:id', getSingleListing)
router.post('/listings', uploadMultiple, addProperty)
router.put('/listings/:id', uploadMultiple, editProperty)
router.delete('/listings/:id', deleteProperty)

router.get('/tours', getTourRequests)
router.patch('/tours/:id/status', updateTourStatus)

router.get('/conversations', getConversations)
router.get('/conversations/:id/messages', getMessages)
router.post('/conversations/:id/messages', sendMessage)

router.get('/earnings', getBrokerEarnings)

router.get('/profile', getBrokerProfile)
router.put('/profile', uploadSingle, updateBrokerProfile)
router.put('/settings', updateBrokerSettings)

module.exports = router