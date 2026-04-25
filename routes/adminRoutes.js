const express = require('express')
const router = express.Router()
const {
  getDashboardStats,
  getPendingCounts,
  getAdminUsers,
  toggleUserStatus,
  getAdminBrokers,
  getPendingBrokers,
  approveBroker,
  rejectBroker,
  getAdminProperties,
  getPendingProperties,
  approveProperty,
  rejectProperty,
  toggleFeatureProperty,
  getAdminBookings,
  getAdminPayments,
  getAdminMessages,
  updateMessageStatus,
  getAdminTestimonials,
  updateTestimonial,
  getSubscribers,
  updateAdminProfile,
} = require('../controllers/adminController')

const { protect, authorize } = require('../middleware/authMiddleware')

router.use(protect)
router.use(authorize('admin'))

router.get('/stats', getDashboardStats)
router.get('/dashboard', getDashboardStats)
router.get('/pending-counts', getPendingCounts)

router.get('/users', getAdminUsers)
router.patch('/users/:id/status', toggleUserStatus)

router.get('/brokers', getAdminBrokers)
router.get('/brokers/pending', getPendingBrokers)
router.patch('/brokers/:id/approve', approveBroker)
router.patch('/brokers/:id/reject', rejectBroker)

router.get('/properties', getAdminProperties)
router.get('/properties/pending', getPendingProperties)
router.patch('/properties/:id/approve', approveProperty)
router.patch('/properties/:id/reject', rejectProperty)
router.patch('/properties/:id/feature', toggleFeatureProperty)

router.get('/bookings', getAdminBookings)

router.get('/payments', getAdminPayments)

router.get('/messages', getAdminMessages)
router.patch('/messages/:id/status', updateMessageStatus)

router.get('/testimonials', getAdminTestimonials)
router.patch('/testimonials/:id', updateTestimonial)

router.get('/subscribers', getSubscribers)

router.put('/profile', updateAdminProfile)

module.exports = router