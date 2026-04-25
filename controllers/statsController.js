const asyncHandler = require('express-async-handler')
const User = require('../models/User')
const Property = require('../models/Property')
const { sendSuccess } = require('../utils/responseHandler')

const getPlatformStats = asyncHandler(async (req, res) => {
  const [
    totalProperties,
    totalBrokers,
    totalUsers,
    totalCities,
  ] = await Promise.all([
    Property.countDocuments({ status: 'approved', isAvailable: true }),
    User.countDocuments({ role: 'broker', brokerStatus: 'approved', isActive: true }),
    User.countDocuments({ role: 'user', isActive: true }),
    Property.distinct('city', { status: 'approved' }).then((c) => c.length),
  ])

  sendSuccess(res, 200, 'Platform stats fetched successfully', {
    totalProperties,
    totalBrokers,
    totalUsers,
    totalCities,
  })
})

module.exports = { getPlatformStats }