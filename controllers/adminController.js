const asyncHandler = require('express-async-handler')
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const Property = require('../models/Property')
const Booking = require('../models/Booking')
const Payment = require('../models/Payment')
const Contact = require('../models/Contact')
const Testimonial = require('../models/Testimonial')
const Newsletter = require('../models/Newsletter')
const { sendSuccess } = require('../utils/responseHandler')
const {
  sendEmail,
  brokerApprovedEmail,
  brokerRejectedEmail,
  propertyApprovedEmail,
  propertyRejectedEmail,
} = require('../utils/sendEmail')

const getDashboardStats = asyncHandler(async (req, res) => {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  const [
    totalUsers,
    totalBrokers,
    totalProperties,
    totalBookings,
    newUsersThisMonth,
    newUsersLastMonth,
    newBrokersThisMonth,
    newBrokersLastMonth,
    newPropertiesThisMonth,
    newPropertiesLastMonth,
    newBookingsThisMonth,
    newBookingsLastMonth,
    recentBookings,
    topBrokers,
    pendingBrokers,
    pendingProperties,
    newMessages,
  ] = await Promise.all([
    User.countDocuments({ role: 'user', isActive: true }),
    User.countDocuments({ role: 'broker', brokerStatus: 'approved', isActive: true }),
    Property.countDocuments({ status: 'approved', isAvailable: true }),
    Booking.countDocuments(),
    User.countDocuments({ role: 'user', createdAt: { $gte: startOfMonth } }),
    User.countDocuments({ role: 'user', createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
    User.countDocuments({ role: 'broker', createdAt: { $gte: startOfMonth } }),
    User.countDocuments({ role: 'broker', createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
    Property.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Property.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
    Booking.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Booking.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
    Booking.find().sort({ createdAt: -1 }).limit(5)
      .populate('property', 'title city')
      .populate('user', 'name')
      .populate('broker', 'name'),
    User.find({ role: 'broker', brokerStatus: 'approved' })
      .select('name city totalListings rating')
      .sort({ totalListings: -1, rating: -1 })
      .limit(5),
    User.countDocuments({ role: 'broker', brokerStatus: 'pending' }),
    Property.countDocuments({ status: 'pending' }),
    Contact.countDocuments({ status: 'new' }),
  ])

  const calcChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  const revenueAgg = await Payment.aggregate([
    { $match: { status: 'completed' } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        revenue: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    { $limit: 12 },
  ])

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const revenueChart = revenueAgg.map((item) => ({
    month: monthNames[item._id.month - 1],
    revenue: item.revenue,
  }))

  const propertyAgg = await Property.aggregate([
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          purpose: '$purpose',
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    { $limit: 24 },
  ])

  const propertyChartMap = {}
  propertyAgg.forEach((item) => {
    const key = `${monthNames[item._id.month - 1]}`
    if (!propertyChartMap[key]) {
      propertyChartMap[key] = { month: key, rent: 0, sale: 0 }
    }
    propertyChartMap[key][item._id.purpose] = item.count
  })
  const propertyChart = Object.values(propertyChartMap).slice(-12)

  const usersAgg = await User.aggregate([
    { $match: { role: 'user' } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        users: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    { $limit: 12 },
  ])

  const usersChart = usersAgg.map((item) => ({
    month: monthNames[item._id.month - 1],
    users: item.users,
  }))

  const totalRevenue = await Payment.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])

  const revenueThisMonth = await Payment.aggregate([
    { $match: { status: 'completed', createdAt: { $gte: startOfMonth } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])

  const revenueLastMonth = await Payment.aggregate([
    { $match: { status: 'completed', createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])

  const recentActivity = []

  const recentUsers = await User.find({ role: 'user' }).sort({ createdAt: -1 }).limit(3).select('name createdAt')
  recentUsers.forEach((u) => {
    recentActivity.push({
      type: 'user_registered',
      message: `${u.name} registered as a new user`,
      createdAt: u.createdAt,
    })
  })

  const recentBrokers = await User.find({ role: 'broker', brokerStatus: 'pending' }).sort({ createdAt: -1 }).limit(2).select('name createdAt')
  recentBrokers.forEach((b) => {
    recentActivity.push({
      type: 'broker_applied',
      message: `${b.name} applied as a broker`,
      createdAt: b.createdAt,
    })
  })

  const recentProps = await Property.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(2).select('title createdAt')
  recentProps.forEach((p) => {
    recentActivity.push({
      type: 'property_added',
      message: `New property "${p.title}" submitted for review`,
      createdAt: p.createdAt,
    })
  })

  recentActivity.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  sendSuccess(res, 200, 'Dashboard stats fetched successfully', {
    totalUsers,
    totalBrokers,
    totalProperties,
    totalBookings,
    totalRevenue: totalRevenue[0]?.total || 0,
    usersChange: calcChange(newUsersThisMonth, newUsersLastMonth),
    brokersChange: calcChange(newBrokersThisMonth, newBrokersLastMonth),
    propertiesChange: calcChange(newPropertiesThisMonth, newPropertiesLastMonth),
    bookingsChange: calcChange(newBookingsThisMonth, newBookingsLastMonth),
    revenueChange: calcChange(
      revenueThisMonth[0]?.total || 0,
      revenueLastMonth[0]?.total || 0
    ),
    revenueChart,
    propertyChart,
    usersChart,
    recentBookings,
    topBrokers,
    recentActivity,
    pendingBrokers,
    pendingProperties,
    newMessages,
  })
})

const getPendingCounts = asyncHandler(async (req, res) => {
  const [pendingBrokers, pendingProperties, newMessages] = await Promise.all([
    User.countDocuments({ role: 'broker', brokerStatus: 'pending' }),
    Property.countDocuments({ status: 'pending' }),
    Contact.countDocuments({ status: 'new' }),
  ])

  sendSuccess(res, 200, 'Pending counts fetched', {
    pendingBrokers,
    pendingProperties,
    newMessages,
  })
})

const getAdminUsers = asyncHandler(async (req, res) => {
  const {
    search = '',
    isActive = '',
    page = 1,
    limit = 10,
  } = req.query

  const query = { role: 'user' }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ]
  }

  if (isActive !== '') {
    query.isActive = isActive === 'true'
  }

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const total = await User.countDocuments(query)

  const users = await User.find(query)
    .select('-password -otp -otpExpire')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))

  sendSuccess(res, 200, 'Users fetched successfully', {
    users,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      limit: parseInt(limit),
    },
  })
})

const toggleUserStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive },
    { new: true }
  ).select('-password -otp -otpExpire')

  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  sendSuccess(
    res,
    200,
    `User ${isActive ? 'activated' : 'deactivated'} successfully`,
    user
  )
})

const getAdminBrokers = asyncHandler(async (req, res) => {
  const {
    search = '',
    brokerStatus = '',
    page = 1,
    limit = 10,
  } = req.query

  const query = { role: 'broker' }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ]
  }

  if (brokerStatus) {
    query.brokerStatus = brokerStatus
  }

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const total = await User.countDocuments(query)

  const users = await User.find(query)
    .select('-password -otp -otpExpire')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))

  sendSuccess(res, 200, 'Brokers fetched successfully', {
    users,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      limit: parseInt(limit),
    },
  })
})

const getPendingBrokers = asyncHandler(async (req, res) => {
  const brokers = await User.find({
    role: 'broker',
    brokerStatus: 'pending',
  })
    .select('-password -otp -otpExpire')
    .sort({ createdAt: -1 })

  sendSuccess(res, 200, 'Pending brokers fetched successfully', brokers)
})

const approveBroker = asyncHandler(async (req, res) => {
  const broker = await User.findByIdAndUpdate(
    req.params.id,
    { brokerStatus: 'approved', isActive: true },
    { new: true }
  ).select('-password -otp -otpExpire')

  if (!broker) {
    res.status(404)
    throw new Error('Broker not found')
  }

  try {
    await sendEmail({
      to: broker.email,
      subject: 'Your Broker Application has been Approved - RealNest',
      html: brokerApprovedEmail({ name: broker.name }),
    })
  } catch (emailError) {
    console.error('Broker approval email failed:', emailError.message)
  }

  sendSuccess(res, 200, 'Broker approved successfully', broker)
})

const rejectBroker = asyncHandler(async (req, res) => {
  const { reason } = req.body

  const broker = await User.findByIdAndUpdate(
    req.params.id,
    {
      brokerStatus: 'rejected',
      rejectionReason: reason || '',
      isActive: false,
    },
    { new: true }
  ).select('-password -otp -otpExpire')

  if (!broker) {
    res.status(404)
    throw new Error('Broker not found')
  }

  try {
    await sendEmail({
      to: broker.email,
      subject: 'Update on Your Broker Application - RealNest',
      html: brokerRejectedEmail({
        name: broker.name,
        reason: reason || '',
      }),
    })
  } catch (emailError) {
    console.error('Broker rejection email failed:', emailError.message)
  }

  sendSuccess(res, 200, 'Broker rejected successfully', broker)
})

const getAdminProperties = asyncHandler(async (req, res) => {
  const {
    search = '',
    status = '',
    purpose = '',
    page = 1,
    limit = 10,
  } = req.query

  const query = {}

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { city: { $regex: search, $options: 'i' } },
    ]
  }

  if (status) query.status = status
  if (purpose) query.purpose = purpose

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const total = await Property.countDocuments(query)

  const properties = await Property.find(query)
    .populate('broker', 'name avatar city email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))

  sendSuccess(res, 200, 'Properties fetched successfully', {
    properties,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      limit: parseInt(limit),
    },
  })
})

const getPendingProperties = asyncHandler(async (req, res) => {
  const properties = await Property.find({ status: 'pending' })
    .populate('broker', 'name avatar city email rating')
    .sort({ createdAt: -1 })

  sendSuccess(res, 200, 'Pending properties fetched successfully', properties)
})

const approveProperty = asyncHandler(async (req, res) => {
  const property = await Property.findByIdAndUpdate(
    req.params.id,
    { status: 'approved', isAvailable: true },
    { new: true }
  ).populate('broker', 'name email city')

  if (!property) {
    res.status(404)
    throw new Error('Property not found')
  }

  if (property.broker) {
    await User.findByIdAndUpdate(property.broker._id, {
      $inc: { totalListings: 1 },
    })

    try {
      await sendEmail({
        to: property.broker.email,
        subject: 'Your Property Listing has been Approved - RealNest',
        html: propertyApprovedEmail({
          brokerName: property.broker.name,
          propertyTitle: property.title,
          propertyCity: property.city,
        }),
      })
    } catch (emailError) {
      console.error('Property approval email failed:', emailError.message)
    }
  }

  sendSuccess(res, 200, 'Property approved successfully', property)
})

const rejectProperty = asyncHandler(async (req, res) => {
  const { reason } = req.body

  const property = await Property.findByIdAndUpdate(
    req.params.id,
    {
      status: 'rejected',
      rejectionReason: reason || '',
      isAvailable: false,
    },
    { new: true }
  ).populate('broker', 'name email')

  if (!property) {
    res.status(404)
    throw new Error('Property not found')
  }

  if (property.broker) {
    try {
      await sendEmail({
        to: property.broker.email,
        subject: 'Update on Your Property Listing - RealNest',
        html: propertyRejectedEmail({
          brokerName: property.broker.name,
          propertyTitle: property.title,
          reason: reason || '',
        }),
      })
    } catch (emailError) {
      console.error('Property rejection email failed:', emailError.message)
    }
  }

  sendSuccess(res, 200, 'Property rejected successfully', property)
})

const toggleFeatureProperty = asyncHandler(async (req, res) => {
  const { isFeatured } = req.body

  const property = await Property.findByIdAndUpdate(
    req.params.id,
    { isFeatured },
    { new: true }
  ).populate('broker', 'name')

  if (!property) {
    res.status(404)
    throw new Error('Property not found')
  }

  sendSuccess(
    res,
    200,
    `Property ${isFeatured ? 'featured' : 'unfeatured'} successfully`,
    property
  )
})

const getAdminBookings = asyncHandler(async (req, res) => {
  const {
    search = '',
    status = '',
    page = 1,
    limit = 10,
  } = req.query

  const query = {}
  if (status) query.status = status

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const total = await Booking.countDocuments(query)

  const bookings = await Booking.find(query)
    .populate('property', 'title city price purpose')
    .populate('user', 'name email phone')
    .populate('broker', 'name email phone')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))

  sendSuccess(res, 200, 'Bookings fetched successfully', {
    bookings,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      limit: parseInt(limit),
    },
  })
})

const getAdminPayments = asyncHandler(async (req, res) => {
  const {
    search = '',
    status = '',
    page = 1,
    limit = 10,
  } = req.query

  const query = {}
  if (status) query.status = status

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const total = await Payment.countDocuments(query)

  const payments = await Payment.find(query)
    .populate('user', 'name email')
    .populate('property', 'title city price')
    .populate('broker', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))

  sendSuccess(res, 200, 'Payments fetched successfully', {
    payments,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      limit: parseInt(limit),
    },
  })
})

const getAdminMessages = asyncHandler(async (req, res) => {
  const {
    search = '',
    status = '',
    page = 1,
    limit = 10,
  } = req.query

  const query = {}

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ]
  }

  if (status) query.status = status

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const total = await Contact.countDocuments(query)

  const contacts = await Contact.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))

  sendSuccess(res, 200, 'Messages fetched successfully', {
    contacts,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      limit: parseInt(limit),
    },
  })
})

const updateMessageStatus = asyncHandler(async (req, res) => {
  const { status, adminNotes } = req.body

  const contact = await Contact.findByIdAndUpdate(
    req.params.id,
    { status, adminNotes },
    { new: true }
  )

  if (!contact) {
    res.status(404)
    throw new Error('Message not found')
  }

  sendSuccess(res, 200, 'Message status updated successfully', contact)
})

const getAdminTestimonials = asyncHandler(async (req, res) => {
  const {
    isApproved = '',
    page = 1,
    limit = 10,
  } = req.query

  const query = {}
  if (isApproved !== '') {
    query.isApproved = isApproved === 'true'
  }

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const total = await Testimonial.countDocuments(query)

  const testimonials = await Testimonial.find(query)
    .populate('user', 'name avatar city')
    .populate('broker', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))

  sendSuccess(res, 200, 'Testimonials fetched successfully', {
    testimonials,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      limit: parseInt(limit),
    },
  })
})

const updateTestimonial = asyncHandler(async (req, res) => {
  const { isApproved, isFeatured } = req.body

  const testimonial = await Testimonial.findByIdAndUpdate(
    req.params.id,
    { isApproved, isFeatured },
    { new: true }
  )
    .populate('user', 'name avatar')
    .populate('broker', 'name')

  if (!testimonial) {
    res.status(404)
    throw new Error('Testimonial not found')
  }

  if (isApproved && testimonial.broker) {
    const broker = testimonial.broker
    const allReviews = await Testimonial.find({
      broker: broker._id,
      isApproved: true,
    })
    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0)
    const avgRating = allReviews.length > 0
      ? Math.round((totalRating / allReviews.length) * 10) / 10
      : 0

    await User.findByIdAndUpdate(broker._id, {
      rating: avgRating,
      totalReviews: allReviews.length,
    })
  }

  sendSuccess(res, 200, 'Testimonial updated successfully', testimonial)
})

const getSubscribers = asyncHandler(async (req, res) => {
  const {
    search = '',
    page = 1,
    limit = 10,
  } = req.query

  const query = {}
  if (search) {
    query.email = { $regex: search, $options: 'i' }
  }

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const total = await Newsletter.countDocuments(query)

  const subscribers = await Newsletter.find(query)
    .sort({ subscribedAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))

  sendSuccess(res, 200, 'Subscribers fetched successfully', {
    subscribers,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      limit: parseInt(limit),
    },
  })
})

const updateAdminProfile = asyncHandler(async (req, res) => {
  const { name, email, phone, currentPassword, newPassword } = req.body

  const admin = await User.findById(req.user._id).select('+password')

  if (!admin) {
    res.status(404)
    throw new Error('Admin not found')
  }

  if (newPassword) {
    if (!currentPassword) {
      res.status(400)
      throw new Error('Current password is required to set a new password')
    }

    const isMatch = await admin.matchPassword(currentPassword)
    if (!isMatch) {
      res.status(400)
      throw new Error('Current password is incorrect')
    }

    const salt = await bcrypt.genSalt(10)
    admin.password = await bcrypt.hash(newPassword, salt)
  }

  admin.name = name || admin.name
  admin.email = email || admin.email
  admin.phone = phone || admin.phone

  await admin.save()

  sendSuccess(res, 200, 'Profile updated successfully', {
    _id: admin._id,
    name: admin.name,
    email: admin.email,
    phone: admin.phone,
    role: admin.role,
    avatar: admin.avatar,
  })
})

module.exports = {
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
}