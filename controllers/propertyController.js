const asyncHandler = require('express-async-handler')
const Property = require('../models/Property')
const { sendSuccess, sendError } = require('../utils/responseHandler')

const getFeaturedProperties = asyncHandler(async (req, res) => {
  const filter = req.query.filter || 'all'
  const limit = parseInt(req.query.limit) || 6

  const query = { status: 'approved', isAvailable: true }

  if (filter === 'rent') query.purpose = 'rent'
  else if (filter === 'sale') query.purpose = 'sale'
  else if (filter === 'featured') query.isFeatured = true

  const properties = await Property.find(query)
    .populate('broker', 'name avatar city rating isVerified')
    .sort({ isFeatured: -1, createdAt: -1 })
    .limit(limit)

  sendSuccess(res, 200, 'Featured properties fetched successfully', properties)
})

const getCities = asyncHandler(async (req, res) => {
  const cities = await Property.aggregate([
    { $match: { status: 'approved', isAvailable: true } },
    {
      $group: {
        _id: '$city',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 12 },
    {
      $project: {
        _id: 0,
        name: '$_id',
        count: 1,
      },
    },
  ])

  sendSuccess(res, 200, 'Cities fetched successfully', cities)
})

const getCategories = asyncHandler(async (req, res) => {
  const categories = await Property.aggregate([
    { $match: { status: 'approved', isAvailable: true } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    {
      $project: {
        _id: 0,
        name: '$_id',
        count: 1,
      },
    },
  ])

  sendSuccess(res, 200, 'Categories fetched successfully', categories)
})

const searchProperties = asyncHandler(async (req, res) => {
  const {
    city,
    type,
    purpose,
    minPrice,
    maxPrice,
    bedrooms,
    page = 1,
    limit = 12,
  } = req.query

  const query = { status: 'approved', isAvailable: true }

  if (city) query.city = { $regex: city, $options: 'i' }
  if (type) query.type = type.toLowerCase()
  if (purpose) query.purpose = purpose.toLowerCase()
  if (bedrooms) query.bedrooms = parseInt(bedrooms)

  if (minPrice || maxPrice) {
    query.price = {}
    if (minPrice) query.price.$gte = parseInt(minPrice)
    if (maxPrice) query.price.$lte = parseInt(maxPrice)
  }

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const total = await Property.countDocuments(query)

  const properties = await Property.find(query)
    .populate('broker', 'name avatar city rating isVerified')
    .sort({ isFeatured: -1, createdAt: -1 })
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

module.exports = {
  getFeaturedProperties,
  getCities,
  getCategories,
  searchProperties,
}