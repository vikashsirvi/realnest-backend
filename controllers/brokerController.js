const asyncHandler = require('express-async-handler')
const User = require('../models/User')
const { sendSuccess } = require('../utils/responseHandler')

const getFeaturedBrokers = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 4

  const brokers = await User.find({
    role: 'broker',
    brokerStatus: 'approved',
    isActive: true,
  })
    .select('name email avatar city rating totalReviews totalListings isVerified createdAt')
    .sort({ rating: -1, totalListings: -1 })
    .limit(limit)

  sendSuccess(res, 200, 'Featured brokers fetched successfully', brokers)
})

module.exports = { getFeaturedBrokers }