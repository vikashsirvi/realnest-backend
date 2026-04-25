const asyncHandler = require('express-async-handler')
const bcrypt = require('bcryptjs')
const fs = require('fs')
const crypto = require('crypto')
const Razorpay = require('razorpay')
const User = require('../models/User')
const Property = require('../models/Property')
const Booking = require('../models/Booking')
const Payment = require('../models/Payment')
const Conversation = require('../models/Conversation')
const Testimonial = require('../models/Testimonial')
const { sendSuccess } = require('../utils/responseHandler')
const {
  sendEmail,
  tourBookedUserEmail,
  tourBookedBrokerEmail,
  bookingCancelledEmail,
} = require('../utils/sendEmail')

const uploadAvatarToCloudinary = (filePath) => {
  return new Promise((resolve, reject) => {
    const cloudinary = require('cloudinary').v2
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })
    cloudinary.v2.uploader.upload(
      filePath,
      { folder: 'realnest/users' },
      (error, result) => {
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
        } catch (e) {
          console.error('Temp file delete error:', e.message)
        }
        if (error) reject(error)
        else resolve(result.secure_url)
      }
    )
  })
}

const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  })
}

const getUserDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id
  const user = await User.findById(userId).select(
    'city savedProperties'
  )

  const [
    savedCount,
    bookingsCount,
    paymentsCount,
    conversationsCount,
    upcomingTour,
  ] = await Promise.all([
    User.findById(userId).then(
      (u) => u.savedProperties?.length || 0
    ),
    Booking.countDocuments({ user: userId }),
    Payment.countDocuments({ user: userId }),
    Conversation.countDocuments({ participants: userId }),
    Booking.findOne({
      user: userId,
      status: 'confirmed',
      tourDate: { $gte: new Date() },
    })
      .sort({ tourDate: 1 })
      .populate('property', 'title city images price purpose')
      .populate('broker', 'name avatar phone'),
  ])

  const recommendedQuery = {
    status: 'approved',
    isAvailable: true,
  }

  if (user.city) {
    recommendedQuery.city = { $regex: user.city, $options: 'i' }
  }

  const recommendedProperties = await Property.find(recommendedQuery)
    .sort({ viewCount: -1, createdAt: -1 })
    .limit(6)
    .populate('broker', 'name avatar city rating')
    .select(
      'title type purpose price city area images bedrooms bathrooms size broker isFeatured viewCount createdAt'
    )

  sendSuccess(res, 200, 'Dashboard data fetched successfully', {
    savedCount,
    bookingsCount,
    paymentsCount,
    conversationsCount,
    upcomingTour,
    recommendedProperties,
  })
})

const getUserPendingCounts = asyncHandler(async (req, res) => {
  const userId = req.user._id

  const [unreadMessages, upcomingTours] = await Promise.all([
    Conversation.countDocuments({
      participants: userId,
      $expr: {
        $gt: [
          { $ifNull: [`$unreadCount.${userId}`, 0] },
          0,
        ],
      },
    }),
    Booking.countDocuments({
      user: userId,
      status: 'confirmed',
      tourDate: { $gte: new Date() },
    }),
  ])

  sendSuccess(res, 200, 'Pending counts fetched', {
    unreadMessages,
    upcomingTours,
  })
})

const getBrowseProperties = asyncHandler(async (req, res) => {
  const {
    search = '',
    purpose = '',
    type = '',
    city = '',
    minPrice = '',
    maxPrice = '',
    bedrooms = '',
    furnishing = '',
    sort = '-createdAt',
    page = 1,
    limit = 12,
  } = req.query

  const query = { status: 'approved', isAvailable: true }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { city: { $regex: search, $options: 'i' } },
      { area: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ]
  }

  if (purpose) query.purpose = purpose

  if (type) {
    const typeArray = type.split(',').map((t) => t.trim())
    if (typeArray.length > 0) query.type = { $in: typeArray }
  }

  if (city) query.city = { $regex: city, $options: 'i' }

  if (minPrice || maxPrice) {
    query.price = {}
    if (minPrice) query.price.$gte = parseInt(minPrice)
    if (maxPrice) query.price.$lte = parseInt(maxPrice)
  }

  if (bedrooms && bedrooms !== '') {
    if (bedrooms === '5+') {
      query.bedrooms = { $gte: 5 }
    } else {
      query.bedrooms = parseInt(bedrooms)
    }
  }

  if (furnishing) query.furnishing = furnishing

  const validSortOptions = {
    '-createdAt': { createdAt: -1 },
    createdAt: { createdAt: 1 },
    price: { price: 1 },
    '-price': { price: -1 },
    '-viewCount': { viewCount: -1 },
  }

  const sortOption = validSortOptions[sort] || { createdAt: -1 }
  const skip = (parseInt(page) - 1) * parseInt(limit)
  const total = await Property.countDocuments(query)

  const properties = await Property.find(query)
    .sort(sortOption)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('broker', 'name avatar city rating totalListings')
    .select(
      'title type purpose price city area images bedrooms bathrooms size furnishing broker isFeatured viewCount createdAt priceUnit'
    )

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

const getPropertyDetail = asyncHandler(async (req, res) => {
  const property = await Property.findOne({
    _id: req.params.id,
    status: 'approved',
    isAvailable: true,
  }).populate(
    'broker',
    'name avatar city rating totalListings totalReviews phone experience specialization bio'
  )

  if (!property) {
    res.status(404)
    throw new Error('Property not found')
  }

  await Property.findByIdAndUpdate(req.params.id, {
    $inc: { viewCount: 1 },
  })

  const user = await User.findById(req.user._id).select(
    'recentlyViewed'
  )
  const recentlyViewed = user.recentlyViewed || []
  const filtered = recentlyViewed.filter(
    (id) => id.toString() !== req.params.id
  )
  filtered.unshift(req.params.id)
  await User.findByIdAndUpdate(req.user._id, {
    recentlyViewed: filtered.slice(0, 10),
  })

  const similarProperties = await Property.find({
    _id: { $ne: req.params.id },
    city: property.city,
    purpose: property.purpose,
    status: 'approved',
    isAvailable: true,
  })
    .limit(3)
    .populate('broker', 'name avatar rating')
    .select(
      'title type purpose price city area images bedrooms bathrooms size broker isFeatured viewCount createdAt'
    )

  const propertyObj = property.toObject()
  propertyObj.similarProperties = similarProperties

  sendSuccess(
    res,
    200,
    'Property details fetched successfully',
    propertyObj
  )
})

const saveProperty = asyncHandler(async (req, res) => {
  const userId = req.user._id
  const propertyId = req.params.id

  const property = await Property.findById(propertyId)
  if (!property) {
    res.status(404)
    throw new Error('Property not found')
  }

  const user = await User.findById(userId).select('savedProperties')
  const alreadySaved = user.savedProperties.some(
    (id) => id.toString() === propertyId
  )

  if (alreadySaved) {
    sendSuccess(res, 200, 'Property already saved', { propertyId })
    return
  }

  await User.findByIdAndUpdate(userId, {
    $addToSet: { savedProperties: propertyId },
  })

  sendSuccess(res, 200, 'Property saved successfully', { propertyId })
})

const unsaveProperty = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $pull: { savedProperties: req.params.id },
  })
  sendSuccess(res, 200, 'Property removed from saved', {
    propertyId: req.params.id,
  })
})

const getSavedProperties = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate({
      path: 'savedProperties',
      match: { status: 'approved', isAvailable: true },
      populate: {
        path: 'broker',
        select: 'name avatar city rating',
      },
      select:
        'title type purpose price city area images bedrooms bathrooms size furnishing broker isFeatured viewCount createdAt',
    })
    .select('savedProperties')

  sendSuccess(
    res,
    200,
    'Saved properties fetched',
    user.savedProperties || []
  )
})

const bookTour = asyncHandler(async (req, res) => {
  const userId = req.user._id
  const { propertyId, brokerId, tourDate, tourTime, notes } = req.body

  if (!propertyId || !brokerId || !tourDate) {
    res.status(400)
    throw new Error('Property, broker, and tour date are required')
  }

  const property = await Property.findById(propertyId)
  if (!property) {
    res.status(404)
    throw new Error('Property not found')
  }

  const existingBooking = await Booking.findOne({
    user: userId,
    property: propertyId,
    status: { $in: ['pending', 'confirmed'] },
  })

  if (existingBooking) {
    res.status(400)
    throw new Error(
      'You already have an active booking for this property'
    )
  }

  const booking = await Booking.create({
    property: propertyId,
    user: userId,
    broker: brokerId,
    tourDate: new Date(tourDate),
    tourTime: tourTime || '10:00 AM',
    notes: notes || '',
    status: 'pending',
  })

  const populatedBooking = await Booking.findById(booking._id)
    .populate('property', 'title city images price purpose')
    .populate('broker', 'name email phone avatar')
    .populate('user', 'name email phone')

  try {
    await sendEmail({
      to: populatedBooking.user.email,
      subject: 'Tour Booking Submitted - RealNest',
      html: tourBookedUserEmail({
        userName: populatedBooking.user.name,
        propertyTitle: populatedBooking.property.title,
        propertyCity: populatedBooking.property.city,
        tourDate: populatedBooking.tourDate,
        tourTime: populatedBooking.tourTime,
        brokerName: populatedBooking.broker.name,
      }),
    })
  } catch (e) {
    console.error('User booking email failed:', e.message)
  }

  try {
    await sendEmail({
      to: populatedBooking.broker.email,
      subject: 'New Tour Request Received - RealNest',
      html: tourBookedBrokerEmail({
        brokerName: populatedBooking.broker.name,
        userName: populatedBooking.user.name,
        userPhone: populatedBooking.user.phone,
        userEmail: populatedBooking.user.email,
        propertyTitle: populatedBooking.property.title,
        tourDate: populatedBooking.tourDate,
        tourTime: populatedBooking.tourTime,
        notes: populatedBooking.notes,
      }),
    })
  } catch (e) {
    console.error('Broker booking email failed:', e.message)
  }

  sendSuccess(
    res,
    201,
    'Tour booking submitted. Awaiting broker confirmation.',
    populatedBooking
  )
})

const getMyBookings = asyncHandler(async (req, res) => {
  const userId = req.user._id
  const { status = '', page = 1, limit = 10 } = req.query

  const query = { user: userId }
  if (status) query.status = status

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const total = await Booking.countDocuments(query)

  const bookings = await Booking.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('property', 'title city images price purpose address')
    .populate('broker', 'name avatar phone email city')

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

const cancelBooking = asyncHandler(async (req, res) => {
  const userId = req.user._id

  const booking = await Booking.findOne({
    _id: req.params.id,
    user: userId,
  })
    .populate('property', 'title city')
    .populate('broker', 'name email')
    .populate('user', 'name')

  if (!booking) {
    res.status(404)
    throw new Error('Booking not found')
  }

  if (booking.status !== 'pending') {
    res.status(400)
    throw new Error(
      `Cannot cancel a booking with status ${booking.status}`
    )
  }

  booking.status = 'cancelled'
  booking.cancelledAt = new Date()
  booking.cancellationReason = 'Cancelled by user'
  await booking.save()

  try {
    await sendEmail({
      to: booking.broker.email,
      subject: 'Tour Booking Cancelled - RealNest',
      html: bookingCancelledEmail({
        brokerName: booking.broker.name,
        userName: booking.user.name,
        propertyTitle: booking.property.title,
        tourDate: booking.tourDate,
      }),
    })
  } catch (e) {
    console.error('Booking cancellation email failed:', e.message)
  }

  sendSuccess(res, 200, 'Booking cancelled successfully', booking)
})

const startConversation = asyncHandler(async (req, res) => {
  const userId = req.user._id
  const { brokerId, propertyId } = req.body

  if (!brokerId) {
    res.status(400)
    throw new Error('Broker ID is required')
  }

  const broker = await User.findOne({
    _id: brokerId,
    role: 'broker',
    isActive: true,
  })

  if (!broker) {
    res.status(404)
    throw new Error('Broker not found')
  }

  const existingQuery = { participants: { $all: [userId, brokerId] } }
  if (propertyId) existingQuery.property = propertyId

  let conversation = await Conversation.findOne(existingQuery)
    .populate('participants', 'name avatar email phone role')
    .populate('property', 'title city images')

  if (conversation) {
    sendSuccess(res, 200, 'Conversation already exists', conversation)
    return
  }

  conversation = await Conversation.create({
    participants: [userId, brokerId],
    property: propertyId || null,
    messages: [],
    lastMessage: '',
    lastMessageAt: new Date(),
    unreadCount: new Map(),
    isActive: true,
  })

  const populated = await Conversation.findById(conversation._id)
    .populate('participants', 'name avatar email phone role')
    .populate('property', 'title city images')

  sendSuccess(res, 201, 'Conversation started successfully', populated)
})

const getUserConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id

  const conversations = await Conversation.find({
    participants: userId,
    isActive: true,
  })
    .sort({ lastMessageAt: -1 })
    .populate('participants', 'name avatar email phone role city')
    .populate('property', 'title city images price')
    .select('-messages')

  const conversationsWithUnread = conversations.map((conv) => ({
    ...conv.toObject(),
    unreadCount: conv.unreadCount?.get(userId.toString()) || 0,
  }))

  sendSuccess(
    res,
    200,
    'Conversations fetched successfully',
    conversationsWithUnread
  )
})

const getUserMessages = asyncHandler(async (req, res) => {
  const userId = req.user._id

  const conversation = await Conversation.findOne({
    _id: req.params.id,
    participants: userId,
  }).populate('messages.sender', 'name avatar role')

  if (!conversation) {
    res.status(404)
    throw new Error('Conversation not found')
  }

  conversation.unreadCount.set(userId.toString(), 0)
  await conversation.save()

  sendSuccess(
    res,
    200,
    'Messages fetched successfully',
    conversation.messages
  )
})

const sendUserMessage = asyncHandler(async (req, res) => {
  const userId = req.user._id
  const { text } = req.body

  if (!text || !text.trim()) {
    res.status(400)
    throw new Error('Message text is required')
  }

  const conversation = await Conversation.findOne({
    _id: req.params.id,
    participants: userId,
  })

  if (!conversation) {
    res.status(404)
    throw new Error('Conversation not found')
  }

  const newMessage = {
    sender: userId,
    text: text.trim(),
    readBy: [userId],
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  conversation.messages.push(newMessage)
  conversation.lastMessage = text.trim()
  conversation.lastMessageAt = new Date()

  const otherParticipant = conversation.participants.find(
    (p) => p.toString() !== userId.toString()
  )

  if (otherParticipant) {
    const currentUnread =
      conversation.unreadCount.get(otherParticipant.toString()) || 0
    conversation.unreadCount.set(
      otherParticipant.toString(),
      currentUnread + 1
    )
  }

  await conversation.save()

  const savedMessage =
    conversation.messages[conversation.messages.length - 1]

  sendSuccess(res, 201, 'Message sent successfully', {
    ...savedMessage.toObject(),
    conversationId: conversation._id,
  })
})

const createRazorpayOrder = asyncHandler(async (req, res) => {
  const {
    propertyId,
    planType,
    emiMonths,
    emiMonth,
    amount,
  } = req.body

  if (!propertyId || !amount) {
    res.status(400)
    throw new Error('Property ID and amount are required')
  }

  const property = await Property.findById(propertyId)
  if (!property) {
    res.status(404)
    throw new Error('Property not found')
  }

  if (planType === 'emi' && emiMonth && emiMonth > 1) {
    const previousPayments = await Payment.find({
      user: req.user._id,
      property: propertyId,
      type: 'emi',
      status: 'completed',
    })

    const paidCount = previousPayments.length

    if (paidCount < emiMonth - 1) {
      res.status(400)
      throw new Error(
        `Please pay installment ${paidCount + 1} first before paying installment ${emiMonth}`
      )
    }

    const alreadyPaid = previousPayments.find(
      (p) => p.emiMonth === parseInt(emiMonth)
    )

    if (alreadyPaid) {
      res.status(400)
      throw new Error(
        `Installment ${emiMonth} has already been paid`
      )
    }
  }

  const razorpay = getRazorpayInstance()
  const amountInPaise = Math.round(amount * 100)

  const razorpayOrder = await razorpay.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: `order_${Date.now()}`,
    notes: {
      propertyId: propertyId.toString(),
      userId: req.user._id.toString(),
      planType: planType || 'full',
      emiMonths: emiMonths ? emiMonths.toString() : '0',
      emiMonth: emiMonth ? emiMonth.toString() : '1',
    },
  })

  sendSuccess(res, 200, 'Razorpay order created successfully', {
    order: {
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      propertyId,
      planType: planType || 'full',
      emiMonths: emiMonths || null,
      emiMonth: emiMonth || 1,
    },
    plan: {
      type: planType || 'full',
      months: emiMonths || null,
      currentMonth: emiMonth || 1,
      label:
        planType === 'emi'
          ? `EMI Installment ${emiMonth || 1} of ${emiMonths}`
          : 'Full Payment',
    },
    property: {
      _id: property._id,
      title: property.title,
      city: property.city,
      price: property.price,
      images: property.images,
    },
  })
})
    

const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    propertyId,
    planType,
    emiMonths,
    emiMonth,
    amount,
  } = req.body

  if (
    !razorpay_order_id ||
    !razorpay_payment_id ||
    !razorpay_signature
  ) {
    res.status(400)
    throw new Error('Payment verification data is incomplete')
  }

  const body = razorpay_order_id + '|' + razorpay_payment_id

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest('hex')

  if (expectedSignature !== razorpay_signature) {
    res.status(400)
    throw new Error('Payment verification failed. Invalid signature.')
  }

  const property = await Property.findById(propertyId)
  if (!property) {
    res.status(404)
    throw new Error('Property not found')
  }

  const amountInRupees = Math.round(amount / 100)
  const currentEmiMonth = parseInt(emiMonth) || 1

  const payment = await Payment.create({
    user: req.user._id,
    property: propertyId,
    broker: property.broker,
    amount: amountInRupees,
    currency: 'INR',
    type: planType === 'emi' ? 'emi' : 'full',
    status: 'completed',
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature,
    emiPlan: emiMonths ? parseInt(emiMonths) : null,
    emiMonth: planType === 'emi' ? currentEmiMonth : null,
    totalEmiAmount:
      planType === 'emi' ? property.price : amountInRupees,
    paidAt: new Date(),
  })

  const populatedPayment = await Payment.findById(payment._id)
    .populate('property', 'title city images price')
    .populate('user', 'name email')
    .populate('broker', 'name')

  sendSuccess(
    res,
    200,
    'Payment verified and saved successfully',
    populatedPayment
  )
})
    

const getMyPayments = asyncHandler(async (req, res) => {
  const userId = req.user._id

  const payments = await Payment.find({ user: userId })
    .sort({ createdAt: -1 })
    .populate('property', 'title city images price purpose')
    .populate('broker', 'name avatar')

  const totalPaid = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0)

  const pendingEmiCount = payments.filter(
    (p) =>
      p.type === 'emi' &&
      p.status === 'completed' &&
      p.emiMonth < p.emiPlan
  ).length

  const propertiesCount = [
    ...new Set(payments.map((p) => p.property?._id?.toString())),
  ].length

  sendSuccess(res, 200, 'Payments fetched successfully', {
    payments,
    summary: {
      totalPaid,
      pendingEmiCount,
      propertiesCount,
    },
  })
})

const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    '-password -otp -otpExpire'
  )

  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  sendSuccess(res, 200, 'Profile fetched successfully', user)
})

const updateUserProfile = asyncHandler(async (req, res) => {
  const { name, phone, whatsapp, city, dateOfBirth } = req.body

  const user = await User.findById(req.user._id)

  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  if (req.file) {
    try {
      const url = await uploadAvatarToCloudinary(req.file.path)
      user.avatar = url
    } catch (cloudinaryError) {
      console.error('Avatar upload failed:', cloudinaryError.message)
    }
  }

  user.name = name || user.name
  user.phone = phone !== undefined ? phone : user.phone
  user.whatsapp = whatsapp !== undefined ? whatsapp : user.whatsapp
  user.city = city !== undefined ? city : user.city
  user.dateOfBirth =
    dateOfBirth !== undefined ? dateOfBirth : user.dateOfBirth

  await user.save()

  const updatedUser = await User.findById(user._id).select(
    '-password -otp -otpExpire'
  )

  sendSuccess(res, 200, 'Profile updated successfully', updatedUser)
})

const updateUserSettings = asyncHandler(async (req, res) => {
  const { type, currentPassword, newPassword, notifications } =
    req.body

  const user = await User.findById(req.user._id).select('+password')

  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  if (type === 'password') {
    if (!currentPassword || !newPassword) {
      res.status(400)
      throw new Error(
        'Current password and new password are required'
      )
    }
    const isMatch = await user.matchPassword(currentPassword)
    if (!isMatch) {
      res.status(400)
      throw new Error('Current password is incorrect')
    }
    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(newPassword, salt)
    await user.save()
    sendSuccess(res, 200, 'Password updated successfully')
    return
  }

  if (type === 'notifications') {
    user.notifications = notifications || {}
    await user.save()
    sendSuccess(
      res,
      200,
      'Notification preferences updated successfully'
    )
    return
  }

  if (type === 'delete') {
    await User.findByIdAndDelete(req.user._id)
    sendSuccess(res, 200, 'Account deleted successfully')
    return
  }

  res.status(400)
  throw new Error('Invalid settings type')
})

const submitReview = asyncHandler(async (req, res) => {
  const userId = req.user._id
  const { bookingId, rating, comment } = req.body

  if (!bookingId || !rating || !comment) {
    res.status(400)
    throw new Error('Booking ID, rating, and comment are required')
  }

  if (rating < 1 || rating > 5) {
    res.status(400)
    throw new Error('Rating must be between 1 and 5')
  }

  const booking = await Booking.findOne({
    _id: bookingId,
    user: userId,
  })
    .populate('property', 'title')
    .populate('broker', 'name')

  if (!booking) {
    res.status(404)
    throw new Error('Booking not found')
  }

  if (booking.status !== 'completed') {
    res.status(400)
    throw new Error('You can only review after a completed tour')
  }

  const existingReview = await Testimonial.findOne({
    booking: bookingId,
    user: userId,
  })

  if (existingReview) {
    res.status(400)
    throw new Error(
      'You have already submitted a review for this tour'
    )
  }

  const testimonial = await Testimonial.create({
    user: userId,
    broker: booking.broker._id,
    booking: bookingId,
    property: booking.property._id,
    rating: parseInt(rating),
    comment: comment.trim(),
    isApproved: false,
  })

  sendSuccess(
    res,
    201,
    'Review submitted. It will appear after admin approval.',
    testimonial
  )
})

module.exports = {
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
}