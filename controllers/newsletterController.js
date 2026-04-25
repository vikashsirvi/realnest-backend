const asyncHandler = require('express-async-handler')
const Newsletter = require('../models/Newsletter')
const {
  sendEmail,
  newsletterConfirmationEmail,
} = require('../utils/sendEmail')
const { sendSuccess } = require('../utils/responseHandler')

const subscribeNewsletter = asyncHandler(async (req, res) => {
  const { email } = req.body

  const existing = await Newsletter.findOne({ email })

  if (existing) {
    if (existing.isActive) {
      return sendSuccess(res, 200, 'You are already subscribed to our newsletter.')
    }
    existing.isActive = true
    existing.unsubscribedAt = null
    await existing.save()

    return sendSuccess(res, 200, 'Welcome back! You have been re-subscribed successfully.')
  }

  await Newsletter.create({ email })

  try {
    await sendEmail({
      to: email,
      subject: 'Welcome to RealNest Newsletter!',
      html: newsletterConfirmationEmail({ email }),
    })
  } catch (emailError) {
    console.error('Newsletter confirmation email failed:', emailError.message)
  }

  sendSuccess(res, 201, 'You have successfully subscribed to our newsletter!')
})

const unsubscribeNewsletter = asyncHandler(async (req, res) => {
  const { email } = req.body

  const subscriber = await Newsletter.findOne({ email })

  if (!subscriber) {
    res.status(404)
    throw new Error('Email not found in our subscriber list')
  }

  subscriber.isActive = false
  subscriber.unsubscribedAt = new Date()
  await subscriber.save()

  sendSuccess(res, 200, 'You have been unsubscribed successfully.')
})

module.exports = { subscribeNewsletter, unsubscribeNewsletter }