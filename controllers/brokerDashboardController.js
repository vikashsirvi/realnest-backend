const asyncHandler = require('express-async-handler')
const bcrypt = require('bcryptjs')
const fs = require('fs')
const User = require('../models/User')
const Property = require('../models/Property')
const Booking = require('../models/Booking')
const Payment = require('../models/Payment')
const Conversation = require('../models/Conversation')
const { sendSuccess } = require('../utils/responseHandler')
const {
  sendEmail,
  tourConfirmedEmail,
  tourCancelledEmail,
  tourCompletedEmail,
} = require('../utils/sendEmail')

const uploadSingleToCloudinary = (filePath, folder) => {
  return new Promise((resolve, reject) => {
    const cloudinary = require('cloudinary')
    cloudinary.v2.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })
    cloudinary.v2.uploader.upload(
      filePath,
      { folder },
      (error, result) => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
          }
        } catch (e) {
          console.error('Temp file delete error:', e.message)
        }
        if (error) {
          console.error('Cloudinary upload error:', JSON.stringify(error))
          reject(error)
        } else {
          resolve(result.secure_url)
        }
      }
    )
  })
}

const uploadImagesToCloudinary = async (files) => {
  const urls = []
  for (const file of files) {
    const url = await uploadSingleToCloudinary(
      file.path,
      'realnest/properties'
    )
    urls.push(url)
  }
  return urls
}

const getBrokerStats = asyncHandler(async (req, res) => {
  const brokerId = req.user._id
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalListings,
    activeListings,
    pendingListings,
    rejectedListings,
    totalTours,
    completedTours,
    pendingTours,
    recentTours,
    recentListings,
  ] = await Promise.all([
    Property.countDocuments({ broker: brokerId }),
    Property.countDocuments({ broker: brokerId, status: 'approved', isAvailable: true }),
    Property.countDocuments({ broker: brokerId, status: 'pending' }),
    Property.countDocuments({ broker: brokerId, status: 'rejected' }),
    Booking.countDocuments({ broker: brokerId }),
    Booking.countDocuments({ broker: brokerId, status: 'completed' }),
    Booking.countDocuments({ broker: brokerId, status: 'pending' }),
    Booking.find({ broker: brokerId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('property', 'title city images')
      .populate('user', 'name phone'),
    Property.find({ broker: brokerId })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('title city type purpose price status images isFeatured viewCount createdAt'),
  ])

  const totalEarningsAgg = await Payment.aggregate([
    { $match: { broker: brokerId, status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])

  const thisMonthEarningsAgg = await Payment.aggregate([
    {
      $match: {
        broker: brokerId,
        status: 'completed',
        createdAt: { $gte: startOfMonth },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])

  const earningsChartAgg = await Payment.aggregate([
    { $match: { broker: brokerId, status: 'completed' } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        earnings: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    { $limit: 6 },
  ])

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]

  const earningsChart = earningsChartAgg.map((item) => ({
    month: monthNames[item._id.month - 1],
    earnings: item.earnings,
  }))

  sendSuccess(res, 200, 'Broker stats fetched successfully', {
    totalListings,
    activeListings,
    pendingListings,
    rejectedListings,
    totalTours,
    completedTours,
    pendingTours,
    totalEarnings: totalEarningsAgg[0]?.total || 0,
    thisMonthEarnings: thisMonthEarningsAgg[0]?.total || 0,
    earningsChart,
    recentTours,
    recentListings,
  })
})

const getBrokerPendingCounts = asyncHandler(async (req, res) => {
  const brokerId = req.user._id

  const [newTourRequests, pendingListings, unreadMessages] =
    await Promise.all([
      Booking.countDocuments({ broker: brokerId, status: 'pending' }),
      Property.countDocuments({ broker: brokerId, status: 'pending' }),
      Conversation.countDocuments({
        participants: brokerId,
        $expr: {
          $gt: [{ $ifNull: [`$unreadCount.${brokerId}`, 0] }, 0],
        },
      }),
    ])

  sendSuccess(res, 200, 'Pending counts fetched', {
    newTourRequests,
    pendingListings,
    unreadMessages,
  })
})

const getMyListings = asyncHandler(async (req, res) => {
  const brokerId = req.user._id
  const {
    search = '',
    status = '',
    purpose = '',
    page = 1,
    limit = 10,
  } = req.query

  const query = { broker: brokerId }

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
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))

  sendSuccess(res, 200, 'Listings fetched successfully', {
    properties,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      limit: parseInt(limit),
    },
  })
})

const getSingleListing = asyncHandler(async (req, res) => {
  const property = await Property.findOne({
    _id: req.params.id,
    broker: req.user._id,
  })

  if (!property) {
    res.status(404)
    throw new Error('Property not found or you do not have permission to view it')
  }

  sendSuccess(res, 200, 'Property fetched successfully', property)
})

const addProperty = asyncHandler(async (req, res) => {
  const {
    title, description, type, purpose, price, priceUnit,
    address, area, city, state, pincode, latitude, longitude,
    bedrooms, bathrooms, balconies, floors, size, propertyAge,
    furnishing, facing, parking, videoUrl, amenities,
    existingImages,
  } = req.body

  let imageUrls = []

  if (req.files && req.files.length > 0) {
    imageUrls = await uploadImagesToCloudinary(req.files)
  }

  if (existingImages) {
    const existing = Array.isArray(existingImages)
      ? existingImages
      : [existingImages]
    imageUrls = [...existing, ...imageUrls]
  }

  let parsedAmenities = []
  if (amenities) {
    try {
      parsedAmenities = typeof amenities === 'string'
        ? JSON.parse(amenities)
        : amenities
    } catch {
      parsedAmenities = []
    }
  }

  const property = await Property.create({
    title,
    description,
    type,
    purpose,
    price: parseFloat(price),
    priceUnit: priceUnit || 'total',
    address: address || '',
    area: area || '',
    city,
    state: state || '',
    pincode: pincode || '',
    latitude: latitude ? parseFloat(latitude) : null,
    longitude: longitude ? parseFloat(longitude) : null,
    bedrooms: parseInt(bedrooms) || 0,
    bathrooms: parseInt(bathrooms) || 0,
    balconies: parseInt(balconies) || 0,
    floors: parseInt(floors) || 1,
    size: size ? parseFloat(size) : null,
    propertyAge: propertyAge ? parseInt(propertyAge) : null,
    furnishing: furnishing || 'unfurnished',
    facing: facing || '',
    parking: parking === 'true' || parking === true,
    videoUrl: videoUrl || '',
    amenities: parsedAmenities,
    images: imageUrls,
    status: 'pending',
    isAvailable: false,
    broker: req.user._id,
  })

  sendSuccess(
    res,
    201,
    'Property submitted successfully. It is now under admin review.',
    property
  )
})

const editProperty = asyncHandler(async (req, res) => {
  const property = await Property.findOne({
    _id: req.params.id,
    broker: req.user._id,
  })

  if (!property) {
    res.status(404)
    throw new Error('Property not found or you do not have permission to edit it')
  }

  const {
    title, description, type, purpose, price, priceUnit,
    address, area, city, state, pincode, latitude, longitude,
    bedrooms, bathrooms, balconies, floors, size, propertyAge,
    furnishing, facing, parking, videoUrl, amenities,
    existingImages,
  } = req.body

  let imageUrls = []

  if (existingImages) {
    const existing = Array.isArray(existingImages)
      ? existingImages
      : [existingImages]
    imageUrls = [...existing]
  }

  if (req.files && req.files.length > 0) {
    const newUrls = await uploadImagesToCloudinary(req.files)
    imageUrls = [...imageUrls, ...newUrls]
  }

  if (imageUrls.length === 0) {
    imageUrls = property.images
  }

  let parsedAmenities = property.amenities
  if (amenities) {
    try {
      parsedAmenities = typeof amenities === 'string'
        ? JSON.parse(amenities)
        : amenities
    } catch {
      parsedAmenities = []
    }
  }

  property.title = title || property.title
  property.description = description || property.description
  property.type = type || property.type
  property.purpose = purpose || property.purpose
  property.price = price ? parseFloat(price) : property.price
  property.priceUnit = priceUnit || property.priceUnit
  property.address = address !== undefined ? address : property.address
  property.area = area !== undefined ? area : property.area
  property.city = city || property.city
  property.state = state !== undefined ? state : property.state
  property.pincode = pincode !== undefined ? pincode : property.pincode
  property.latitude = latitude ? parseFloat(latitude) : property.latitude
  property.longitude = longitude ? parseFloat(longitude) : property.longitude
  property.bedrooms = bedrooms !== undefined ? parseInt(bedrooms) : property.bedrooms
  property.bathrooms = bathrooms !== undefined ? parseInt(bathrooms) : property.bathrooms
  property.balconies = balconies !== undefined ? parseInt(balconies) : property.balconies
  property.floors = floors !== undefined ? parseInt(floors) : property.floors
  property.size = size ? parseFloat(size) : property.size
  property.propertyAge = propertyAge ? parseInt(propertyAge) : property.propertyAge
  property.furnishing = furnishing || property.furnishing
  property.facing = facing !== undefined ? facing : property.facing
  property.parking = parking !== undefined
    ? (parking === 'true' || parking === true)
    : property.parking
  property.videoUrl = videoUrl !== undefined ? videoUrl : property.videoUrl
  property.amenities = parsedAmenities
  property.images = imageUrls
  property.status = 'pending'
  property.isAvailable = false
  property.rejectionReason = ''

  await property.save()

  sendSuccess(
    res,
    200,
    'Property updated successfully. Resubmitted for admin review.',
    property
  )
})

const deleteProperty = asyncHandler(async (req, res) => {
  const property = await Property.findOne({
    _id: req.params.id,
    broker: req.user._id,
  })

  if (!property) {
    res.status(404)
    throw new Error('Property not found or you do not have permission to delete it')
  }

  if (property.images && property.images.length > 0) {
    const cloudinary = require('cloudinary').v2
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })
    const deletePromises = property.images.map(async (imageUrl) => {
      try {
        const parts = imageUrl.split('/')
        const filenameWithExt = parts[parts.length - 1]
        const filename = filenameWithExt.split('.')[0]
        const folder = parts[parts.length - 2]
        const publicId = `${folder}/${filename}`
        await cloudinary.uploader.destroy(publicId)
      } catch (err) {
        console.error('Failed to delete image:', err.message)
      }
    })
    await Promise.all(deletePromises)
  }

  await Property.findByIdAndDelete(req.params.id)

  await User.findByIdAndUpdate(req.user._id, {
    $inc: { totalListings: -1 },
  })

  sendSuccess(res, 200, 'Property deleted successfully')
})

const getTourRequests = asyncHandler(async (req, res) => {
  const brokerId = req.user._id
  const { status = '', page = 1, limit = 9 } = req.query

  const query = { broker: brokerId }
  if (status) query.status = status

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const total = await Booking.countDocuments(query)

  const bookings = await Booking.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('property', 'title city price purpose images')
    .populate('user', 'name email phone avatar')

  sendSuccess(res, 200, 'Tour requests fetched successfully', {
    bookings,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      limit: parseInt(limit),
    },
  })
})

const updateTourStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body

  const booking = await Booking.findOne({
    _id: req.params.id,
    broker: req.user._id,
  })
    .populate('user', 'name email')
    .populate('property', 'title city')
    .populate('broker', 'name phone')

  if (!booking) {
    res.status(404)
    throw new Error('Tour booking not found')
  }

  const validTransitions = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['completed', 'cancelled'],
  }

  if (
    !validTransitions[booking.status] ||
    !validTransitions[booking.status].includes(status)
  ) {
    res.status(400)
    throw new Error(
      `Cannot change status from ${booking.status} to ${status}`
    )
  }

  booking.status = status
  if (status === 'confirmed') booking.confirmedAt = new Date()
  if (status === 'cancelled') {
    booking.cancelledAt = new Date()
    booking.cancellationReason = note || ''
  }
  if (status === 'completed') booking.completedAt = new Date()

  await booking.save()

  try {
    if (status === 'confirmed') {
      await sendEmail({
        to: booking.user.email,
        subject: 'Your Tour Has Been Confirmed - RealNest',
        html: tourConfirmedEmail({
          userName: booking.user.name,
          propertyTitle: booking.property.title,
          tourDate: booking.tourDate,
          tourTime: booking.tourTime,
          brokerName: booking.broker.name,
          brokerPhone: booking.broker.phone,
        }),
      })
    } else if (status === 'cancelled') {
      await sendEmail({
        to: booking.user.email,
        subject: 'Tour Cancellation Notice - RealNest',
        html: tourCancelledEmail({
          userName: booking.user.name,
          propertyTitle: booking.property.title,
          tourDate: booking.tourDate,
          note: note || '',
        }),
      })
    } else if (status === 'completed') {
      await sendEmail({
        to: booking.user.email,
        subject: 'Tour Completed - Leave a Review - RealNest',
        html: tourCompletedEmail({
          userName: booking.user.name,
          propertyTitle: booking.property.title,
          brokerName: booking.broker.name,
        }),
      })
    }
  } catch (emailError) {
    console.error('Tour status email failed:', emailError.message)
  }

  sendSuccess(res, 200, `Tour ${status} successfully`, booking)
})

const getConversations = asyncHandler(async (req, res) => {
  const brokerId = req.user._id

  const conversations = await Conversation.find({
    participants: brokerId,
    isActive: true,
  })
    .sort({ lastMessageAt: -1 })
    .populate('participants', 'name avatar email phone role')
    .populate('property', 'title city images price')
    .select('-messages')

  const conversationsWithUnread = conversations.map((conv) => ({
    ...conv.toObject(),
    unreadCount: conv.unreadCount?.get(brokerId.toString()) || 0,
  }))

  sendSuccess(res, 200, 'Conversations fetched successfully', conversationsWithUnread)
})

const getMessages = asyncHandler(async (req, res) => {
  const brokerId = req.user._id

  const conversation = await Conversation.findOne({
    _id: req.params.id,
    participants: brokerId,
  }).populate('messages.sender', 'name avatar role')

  if (!conversation) {
    res.status(404)
    throw new Error('Conversation not found')
  }

  conversation.unreadCount.set(brokerId.toString(), 0)
  await conversation.save()

  sendSuccess(res, 200, 'Messages fetched successfully', conversation.messages)
})

const sendMessage = asyncHandler(async (req, res) => {
  const brokerId = req.user._id
  const { text } = req.body

  if (!text || !text.trim()) {
    res.status(400)
    throw new Error('Message text is required')
  }

  const conversation = await Conversation.findOne({
    _id: req.params.id,
    participants: brokerId,
  })

  if (!conversation) {
    res.status(404)
    throw new Error('Conversation not found')
  }

  const newMessage = {
    sender: brokerId,
    text: text.trim(),
    readBy: [brokerId],
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  conversation.messages.push(newMessage)
  conversation.lastMessage = text.trim()
  conversation.lastMessageAt = new Date()

  const otherParticipant = conversation.participants.find(
    (p) => p.toString() !== brokerId.toString()
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

const getBrokerEarnings = asyncHandler(async (req, res) => {
  const brokerId = req.user._id
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  const [
    totalEarningsAgg,
    thisMonthAgg,
    lastMonthAgg,
    pendingAgg,
    payments,
    earningsChartAgg,
  ] = await Promise.all([
    Payment.aggregate([
      { $match: { broker: brokerId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      {
        $match: {
          broker: brokerId,
          status: 'completed',
          createdAt: { $gte: startOfMonth },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      {
        $match: {
          broker: brokerId,
          status: 'completed',
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { broker: brokerId, status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.find({ broker: brokerId })
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
      .populate('property', 'title city price'),
    Payment.aggregate([
      { $match: { broker: brokerId, status: 'completed' } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          earnings: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 },
    ]),
  ])

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]

  const earningsChart = earningsChartAgg.map((item) => ({
    month: monthNames[item._id.month - 1],
    earnings: item.earnings,
  }))

  const COMMISSION_RATE = 5

  sendSuccess(res, 200, 'Earnings fetched successfully', {
    totalEarnings: totalEarningsAgg[0]?.total || 0,
    thisMonthEarnings: thisMonthAgg[0]?.total || 0,
    lastMonthEarnings: lastMonthAgg[0]?.total || 0,
    pendingEarnings: pendingAgg[0]?.total || 0,
    commissionRate: COMMISSION_RATE,
    earningsChart,
    payments: payments.map((p) => ({
      ...p.toObject(),
      commission: (p.amount * COMMISSION_RATE) / 100,
    })),
  })
})

const getBrokerProfile = asyncHandler(async (req, res) => {
  const broker = await User.findById(req.user._id).select(
    '-password -otp -otpExpire'
  )

  if (!broker) {
    res.status(404)
    throw new Error('Broker not found')
  }

  sendSuccess(res, 200, 'Profile fetched successfully', broker)
})

const updateBrokerProfile = asyncHandler(async (req, res) => {
  const {
    name, phone, whatsapp, city, areas, experience,
    specialization, bio, languages, reraNumber,
    linkedin, instagram, facebook,
  } = req.body

  const broker = await User.findById(req.user._id)

  if (!broker) {
    res.status(404)
    throw new Error('Broker not found')
  }

  if (req.file) {
    try {
      const url = await uploadSingleToCloudinary(
        req.file.path,
        'realnest/brokers'
      )
      broker.avatar = url
    } catch (cloudinaryError) {
      console.error('Avatar upload failed:', cloudinaryError.message)
    }
  }

  broker.name = name || broker.name
  broker.phone = phone !== undefined ? phone : broker.phone
  broker.city = city !== undefined ? city : broker.city
  broker.bio = bio !== undefined ? bio : broker.bio
  broker.experience = experience !== undefined ? experience : broker.experience
  broker.specialization = specialization !== undefined ? specialization : broker.specialization
  broker.whatsapp = whatsapp !== undefined ? whatsapp : broker.whatsapp || ''
  broker.areas = areas !== undefined ? areas : broker.areas || ''
  broker.languages = languages !== undefined ? languages : broker.languages || ''
  broker.reraNumber = reraNumber !== undefined ? reraNumber : broker.reraNumber || ''
  broker.linkedin = linkedin !== undefined ? linkedin : broker.linkedin || ''
  broker.instagram = instagram !== undefined ? instagram : broker.instagram || ''
  broker.facebook = facebook !== undefined ? facebook : broker.facebook || ''

  await broker.save()

  const updatedBroker = await User.findById(broker._id).select(
    '-password -otp -otpExpire'
  )

  sendSuccess(res, 200, 'Profile updated successfully', updatedBroker)
})

const updateBrokerSettings = asyncHandler(async (req, res) => {
  const { type, currentPassword, newPassword, notifications } = req.body

  const broker = await User.findById(req.user._id).select('+password')

  if (!broker) {
    res.status(404)
    throw new Error('Broker not found')
  }

  if (type === 'password') {
    if (!currentPassword || !newPassword) {
      res.status(400)
      throw new Error('Current password and new password are required')
    }
    const isMatch = await broker.matchPassword(currentPassword)
    if (!isMatch) {
      res.status(400)
      throw new Error('Current password is incorrect')
    }
    const salt = await bcrypt.genSalt(10)
    broker.password = await bcrypt.hash(newPassword, salt)
    await broker.save()
    sendSuccess(res, 200, 'Password updated successfully')
    return
  }

  if (type === 'notifications') {
    broker.notifications = notifications || {}
    await broker.save()
    sendSuccess(res, 200, 'Notification preferences updated successfully')
    return
  }

  if (type === 'deactivate') {
    broker.isActive = false
    await broker.save()
    sendSuccess(res, 200, 'Account deactivated successfully')
    return
  }

  res.status(400)
  throw new Error('Invalid settings type')
})

module.exports = {
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
}