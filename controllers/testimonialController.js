const asyncHandler = require('express-async-handler')
const Testimonial = require('../models/Testimonial')
const { sendSuccess } = require('../utils/responseHandler')

const getTestimonials = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 6

  const testimonials = await Testimonial.find({
    isApproved: true,
  })
    .populate('user', 'name avatar city')
    .populate('broker', 'name')
    .sort({ isFeatured: -1, createdAt: -1 })
    .limit(limit)

  sendSuccess(res, 200, 'Testimonials fetched successfully', testimonials)
})

module.exports = { getTestimonials }